(function () {
  var LEVELS = ['easy', 'medium', 'hard'];
  var LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
  var STORAGE_PREFIX = 'iain-sudoku:';

  function localDate() {
    if (window.ID_LOCAL_DATE) return window.ID_LOCAL_DATE();
    var now = new Date();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    return now.getFullYear() + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
  }

  function client() {
    var url = window.ID_SUPABASE_URL || '';
    var key = window.ID_SUPABASE_ANON_KEY || '';
    if (!url || !key || url.indexOf('YOUR_') === 0 || key.indexOf('YOUR_') === 0) return null;
    if (!window.supabase || !window.supabase.createClient) return null;
    return window.supabase.createClient(url, key);
  }

  function emptyEntries() {
    return new Array(81).fill('0').join('');
  }

  function loadState(date) {
    try {
      var data = JSON.parse(localStorage.getItem(STORAGE_PREFIX + date) || '');
      if (!data || typeof data !== 'object') return { level: '', boards: {} };
      if (!data.boards || typeof data.boards !== 'object') data.boards = {};
      return data;
    } catch (e) {
      return { level: '', boards: {} };
    }
  }

  function boardFor(state, level, puzzle) {
    var saved = state.boards[level];
    var entries = saved && saved.id === puzzle.id && typeof saved.entries === 'string' && saved.entries.length === 81
      ? saved.entries
      : puzzle.givens;
    var chars = entries.split('');
    var i;
    for (i = 0; i < 81; i += 1) {
      if (puzzle.givens.charAt(i) !== '0') chars[i] = puzzle.givens.charAt(i);
      else if (!/^[1-9]$/.test(chars[i])) chars[i] = '0';
    }
    var same = saved && saved.id === puzzle.id;
    var hand = cleanNotes(same ? (saved.manual || saved.notes) : null, chars.join(''), puzzle.givens);
    return {
      id: puzzle.id,
      entries: chars.join(''),
      notes: cleanNotes(same ? saved.notes : null, chars.join(''), puzzle.givens),
      manual: hand,
      checked: same && typeof saved.checked === 'string' && saved.checked.length === 81 ? saved.checked : '',
      done: !!(same && saved.done)
    };
  }

  function blankNotes() {
    var notes = [];
    var i;
    for (i = 0; i < 81; i += 1) notes.push('');
    return notes;
  }

  function cleanNotes(raw, entries, givens) {
    var notes = blankNotes();
    var source = Array.isArray(raw) ? raw : [];
    var i;
    for (i = 0; i < 81; i += 1) {
      if (givens.charAt(i) !== '0') continue;
      var seen = {};
      String(source[i] || '').replace(/[^1-9]/g, '').split('').forEach(function (mark) {
        seen[mark] = true;
      });
      notes[i] = Object.keys(seen).sort().join('');
    }
    return notes;
  }

  function conflicts(entries) {
    var bad = {};
    function mark(indexes) {
      var seen = {};
      indexes.forEach(function (index) {
        var digit = entries.charAt(index);
        if (digit === '0') return;
        if (!seen[digit]) seen[digit] = [];
        seen[digit].push(index);
      });
      Object.keys(seen).forEach(function (digit) {
        if (seen[digit].length < 2) return;
        seen[digit].forEach(function (index) { bad[index] = true; });
      });
    }
    var row;
    var col;
    var box;
    for (row = 0; row < 9; row += 1) {
      var across = [];
      for (col = 0; col < 9; col += 1) across.push(row * 9 + col);
      mark(across);
    }
    for (col = 0; col < 9; col += 1) {
      var down = [];
      for (row = 0; row < 9; row += 1) down.push(row * 9 + col);
      mark(down);
    }
    for (box = 0; box < 9; box += 1) {
      var cells = [];
      for (row = 0; row < 3; row += 1) {
        for (col = 0; col < 3; col += 1) {
          cells.push((Math.floor(box / 3) * 3 + row) * 9 + ((box % 3) * 3 + col));
        }
      }
      mark(cells);
    }
    return bad;
  }

  function mount(root, sb, date) {
    var state = loadState(date);
    var puzzles = {};
    var level = '';
    var savedLevel = LEVELS.indexOf(state.level) >= 0 ? state.level : '';
    var selected = 0;
    var focusCell = false;
    var checking = false;
    var pencilOn = false;
    var autoOn = state.autoPencil === true;
    var request = 0;

    var levels = document.createElement('div');
    levels.className = 'sudoku-levels';
    var grid = document.createElement('div');
    grid.className = 'sudoku-grid';
    grid.setAttribute('role', 'grid');
    grid.setAttribute('aria-label', 'Sudoku');
    var pad = document.createElement('div');
    pad.className = 'sudoku-pad';
    var tools = document.createElement('div');
    tools.className = 'sudoku-tools';
    var pencil = document.createElement('button');
    pencil.type = 'button';
    pencil.className = 'sudoku-level sudoku-pencil';
    pencil.textContent = 'Pencil';
    var auto = document.createElement('button');
    auto.type = 'button';
    auto.className = 'sudoku-level sudoku-auto';
    auto.textContent = 'Auto pencil';
    var feedback = document.createElement('p');
    feedback.className = 'sudoku-feedback';
    feedback.setAttribute('role', 'status');
    var check = document.createElement('button');
    check.type = 'button';
    check.className = 'btn-primary';
    check.textContent = 'Check';

    function puzzle() { return puzzles[level]; }
    function board() {
      var current = boardFor(state, level, puzzle());
      state.boards[level] = current;
      if (autoOn) fillAuto(current);
      return current;
    }
    function persist() {
      state.level = level;
      state.autoPencil = autoOn;
      localStorage.setItem(STORAGE_PREFIX + date, JSON.stringify(state));
    }

    function fillAuto(current) {
      var entries = current.entries;
      var givens = puzzle().givens;
      if (!current.notes) current.notes = blankNotes();
      var i;
      var n;
      for (i = 0; i < 81; i += 1) {
        if (givens.charAt(i) !== '0' || entries.charAt(i) !== '0') {
          current.notes[i] = '';
          continue;
        }
        var marks = '';
        for (n = 1; n <= 9; n += 1) {
          if (!taken(entries, i, String(n))) marks += String(n);
        }
        current.notes[i] = marks;
      }
    }

    function taken(entries, index, digit) {
      var row = Math.floor(index / 9);
      var col = index % 9;
      var r;
      var c;
      for (c = 0; c < 9; c += 1) if (entries.charAt(row * 9 + c) === digit) return true;
      for (r = 0; r < 9; r += 1) if (entries.charAt(r * 9 + col) === digit) return true;
      var boxRow = Math.floor(row / 3) * 3;
      var boxCol = Math.floor(col / 3) * 3;
      for (r = boxRow; r < boxRow + 3; r += 1) {
        for (c = boxCol; c < boxCol + 3; c += 1) {
          if (entries.charAt(r * 9 + c) === digit) return true;
        }
      }
      return false;
    }

    function place(digit, asPencil) {
      var current = board();
      if (current.done || selected < 0 || puzzle().givens.charAt(selected) !== '0') return;
      if (!current.notes) current.notes = blankNotes();
      if (!current.manual) current.manual = blankNotes();
      var usePencil = !autoOn && (asPencil || pencilOn);
      if (usePencil && digit !== '0') {
        if (current.entries.charAt(selected) !== '0') return;
        var marks = current.notes[selected] || '';
        current.notes[selected] = marks.indexOf(digit) >= 0
          ? marks.replace(digit, '')
          : (marks + digit).split('').sort().join('');
        current.manual[selected] = current.notes[selected];
      } else if (digit === '0') {
        if (current.entries.charAt(selected) !== '0') {
          var cleared = current.entries.split('');
          cleared[selected] = '0';
          current.entries = cleared.join('');
        } else {
          current.notes[selected] = '';
          current.manual[selected] = '';
        }
      } else {
        var chars = current.entries.split('');
        chars[selected] = digit;
        current.entries = chars.join('');
      }
      if (autoOn) fillAuto(current);
      current.checked = '';
      current.done = false;
      persist();
      focusCell = true;
      render();
    }

    function move(rowStep, colStep) {
      if (selected < 0) selected = 0;
      var row = Math.max(0, Math.min(8, Math.floor(selected / 9) + rowStep));
      var col = Math.max(0, Math.min(8, (selected % 9) + colStep));
      selected = row * 9 + col;
      focusCell = true;
      render();
    }

    LEVELS.forEach(function (name) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'sudoku-level';
      button.textContent = LABELS[name];
      button.addEventListener('click', function () { choose(name); });
      levels.appendChild(button);
    });

    async function choose(name) {
      if (level === name && Object.prototype.hasOwnProperty.call(puzzles, name)) return;
      level = name;
      pencilOn = false;
      feedback.textContent = '';
      feedback.className = 'sudoku-feedback';
      if (!Object.prototype.hasOwnProperty.call(puzzles, name)) {
        var ticket = ++request;
        render();
        var drawn = await drawLevel(sb, name);
        if (ticket !== request) {
          if (!drawn.error) puzzles[name] = drawn.puzzle;
          if (!drawn.error && drawn.puzzle && window.ID_PLAY) window.ID_PLAY('sudoku');
          return;
        }
        if (drawn.error) {
          feedback.textContent = 'Sudoku could not be loaded.';
          feedback.className = 'sudoku-feedback is-wrong';
          render();
          return;
        }
        puzzles[name] = drawn.puzzle;
        if (drawn.puzzle && window.ID_PLAY) window.ID_PLAY('sudoku');
      }
      if (puzzles[name]) {
        selected = puzzles[name].givens.indexOf('0');
        if (selected < 0) selected = 0;
        focusCell = true;
      }
      render();
    }

    for (var digit = 1; digit <= 9; digit += 1) {
      (function (value) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'sudoku-key';
        button.textContent = String(value);
        button.setAttribute('aria-label', 'Enter ' + value);
        button.addEventListener('click', function () { place(String(value), false); });
        pad.appendChild(button);
      })(digit);
    }
    pencil.addEventListener('click', function () {
      if (autoOn) return;
      pencilOn = !pencilOn;
      focusCell = true;
      render();
    });
    tools.appendChild(pencil);
    auto.addEventListener('click', function () {
      if (!puzzle()) return;
      if (!autoOn) {
        var current = board();
        current.manual = current.notes.slice();
        autoOn = true;
        pencilOn = false;
        fillAuto(current);
      } else {
        autoOn = false;
        var restored = board();
        restored.notes = restored.manual.slice();
      }
      persist();
      focusCell = true;
      render();
    });
    tools.appendChild(auto);
    var clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'sudoku-key is-clear';
    clear.textContent = 'Clear';
    clear.addEventListener('click', function () { place('0', false); });
    pad.appendChild(clear);

    grid.addEventListener('keydown', function (event) {
      var key = event.key;
      if (key >= '1' && key <= '9') {
        place(key, event.shiftKey);
        event.preventDefault();
      } else if (key === 'Backspace' || key === 'Delete' || key === '0') {
        place('0', event.shiftKey || pencilOn);
        event.preventDefault();
      } else if (key === 'ArrowLeft') {
        move(0, -1);
        event.preventDefault();
      } else if (key === 'ArrowRight') {
        move(0, 1);
        event.preventDefault();
      } else if (key === 'ArrowUp') {
        move(-1, 0);
        event.preventDefault();
      } else if (key === 'ArrowDown') {
        move(1, 0);
        event.preventDefault();
      }
    });

    check.addEventListener('click', async function () {
      var current = board();
      if (current.done || checking) return;
      var givenNow = puzzle().givens;
      var hasEntry = false;
      var n;
      for (n = 0; n < 81; n += 1) {
        if (givenNow.charAt(n) === '0' && current.entries.charAt(n) !== '0') hasEntry = true;
      }
      if (!hasEntry) return;
      checking = true;
      check.disabled = true;
      feedback.textContent = 'Checking…';
      feedback.className = 'sudoku-feedback';
      var sb = client();
      var result = { error: true };
      if (sb) {
        result = await window.ID_RPC(sb, 'check_sudoku_today', { level: level, entries: current.entries });
        if (missingFn(result.error)) result = await window.ID_RPC(sb, 'check_sudoku_today', { entries: current.entries });
      }
      checking = false;
      var data = result.data || {};
      if (result.error || data.ok !== true || data.valid === false) {
        feedback.textContent = 'That grid could not be checked.';
        feedback.className = 'sudoku-feedback is-wrong';
        render();
        return;
      }
      var progress = typeof data.marks === 'string' && data.marks.length === 81 ? data.marks : '';
      current.checked = progress;
      var finished = false;
      if (data.correct === true) {
        current.done = true;
        finished = true;
        persist();
        feedback.textContent = 'That’s today’s Sudoku.';
        feedback.className = 'sudoku-feedback is-right';
      } else if (progress.indexOf('W') >= 0) {
        feedback.textContent = 'Those highlighted numbers don’t fit.';
        feedback.className = 'sudoku-feedback is-wrong';
        persist();
      } else if (progress.indexOf('C') >= 0) {
        feedback.textContent = 'Those are in the right place.';
        feedback.className = 'sudoku-feedback is-right';
        persist();
      } else {
        feedback.textContent = 'That grid could not be checked.';
        feedback.className = 'sudoku-feedback is-wrong';
      }
      render();
      if (finished && window.puzzleCelebrate) window.puzzleCelebrate(grid);
    });

    function render() {
      Array.prototype.forEach.call(levels.children, function (button) {
        var on = button.textContent === LABELS[level];
        button.classList.toggle('is-on', on);
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
      });

      var active = level && puzzles[level];
      grid.hidden = !active;
      if (!active) {
        pad.hidden = true;
        tools.hidden = true;
        check.hidden = true;
        if (level) {
          state.level = level;
          localStorage.setItem(STORAGE_PREFIX + date, JSON.stringify(state));
        }
        return;
      }

      var current = board();
      var given = puzzle().givens;
      var bad = conflicts(current.entries);
      persist();

      grid.innerHTML = '';
      var selectedRow = Math.floor(selected / 9);
      var selectedCol = selected % 9;
      var selectedDigit = selected >= 0 ? current.entries.charAt(selected) : '0';
      var i;
      for (i = 0; i < 81; i += 1) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'sudoku-cell';
        button.setAttribute('role', 'gridcell');
        var row = Math.floor(i / 9);
        var col = i % 9;
        var digit = current.entries.charAt(i);
        var isGiven = given.charAt(i) !== '0';
        if (isGiven) button.classList.add('is-given');
        var mark = current.checked ? current.checked.charAt(i) : '';
        if (mark === 'W') button.classList.add('is-wrong');
        else if (mark === 'C' && !isGiven) button.classList.add('is-correct');
        else if (bad[i]) button.classList.add('is-conflict');
        if (i === selected) button.classList.add('is-selected');
        else if (selected >= 0 && (row === selectedRow || col === selectedCol || (Math.floor(row / 3) === Math.floor(selectedRow / 3) && Math.floor(col / 3) === Math.floor(selectedCol / 3)))) {
          button.classList.add('is-peer');
        }
        if (selectedDigit !== '0' && digit === selectedDigit) button.classList.add('is-same');
        var marks = (current.notes && current.notes[i]) || '';
        if (digit !== '0') button.textContent = digit;
        else if (marks) button.appendChild(noteGrid(marks, selectedDigit));
        var label = 'Row ' + (row + 1) + ', column ' + (col + 1);
        if (digit !== '0') label += ', ' + digit;
        else if (marks) label += ', notes ' + marks.split('').join(', ');
        else label += ', empty';
        if (mark === 'W') label += ', incorrect';
        else if (mark === 'C' && !isGiven) label += ', correct';
        button.setAttribute('aria-label', label);
        button.tabIndex = i === selected ? 0 : -1;
        button.disabled = current.done;
        (function (index) {
          button.addEventListener('click', function () {
            selected = index;
            focusCell = true;
            render();
          });
        })(i);
        grid.appendChild(button);
      }

      pad.hidden = current.done;
      tools.hidden = current.done;
      check.hidden = current.done;
      var started = false;
      var cell;
      for (cell = 0; cell < 81; cell += 1) {
        if (given.charAt(cell) === '0' && current.entries.charAt(cell) !== '0') started = true;
      }
      check.disabled = checking || !started;
      pencil.disabled = autoOn || current.done;
      pencil.classList.toggle('is-on', pencilOn && !autoOn);
      pencil.setAttribute('aria-pressed', pencilOn && !autoOn ? 'true' : 'false');
      auto.classList.toggle('is-on', autoOn);
      auto.setAttribute('aria-pressed', autoOn ? 'true' : 'false');
      var selectedMarks = selected >= 0 && current.notes ? (current.notes[selected] || '') : '';
      Array.prototype.forEach.call(pad.children, function (button) {
        var value = button.textContent;
        var locked = current.done || selected < 0 || given.charAt(selected) !== '0';
        button.disabled = locked;
        if (button === clear) {
          button.classList.remove('is-on');
          button.setAttribute('aria-label', 'Clear');
          return;
        }
        button.classList.toggle('is-on', pencilOn && selectedMarks.indexOf(value) >= 0);
        button.setAttribute('aria-label', (pencilOn ? 'Pencil ' : 'Enter ') + value);
      });

      if (current.done) {
        feedback.textContent = 'That’s today’s Sudoku.';
        feedback.className = 'sudoku-feedback is-right';
      }

      if (focusCell && selected >= 0 && grid.children[selected]) {
        grid.children[selected].focus();
        focusCell = false;
      }
    }

    root.innerHTML = '';
    root.appendChild(levels);
    root.appendChild(grid);
    root.appendChild(feedback);
    root.appendChild(pad);
    root.appendChild(tools);
    root.appendChild(check);
    render();
    if (savedLevel) choose(savedLevel);
  }

  async function boot() {
    var root = document.getElementById('sudoku-root');
    if (!root) return;
    var date = localDate(new Date());
    var dateEl = document.getElementById('sudoku-date');
    if (dateEl) dateEl.textContent = date;

    var sb = client();
    if (!sb) return;

    mount(root, sb, date);
  }

  function noteGrid(marks, hit) {
    var wrap = document.createElement('span');
    wrap.className = 'sudoku-notes';
    var n;
    for (n = 1; n <= 9; n += 1) {
      var slot = document.createElement('span');
      slot.className = 'sudoku-note';
      if (marks.indexOf(String(n)) >= 0) {
        slot.textContent = String(n);
        if (String(n) === hit) slot.classList.add('is-hit');
      }
      wrap.appendChild(slot);
    }
    return wrap;
  }

  function puzzleFrom(data) {
    if (!data || data.ok !== true || typeof data.givens !== 'string' || data.givens.length !== 81) return null;
    return { id: String(data.id || ''), givens: data.givens };
  }

  function missingFn(error) {
    return !!(error && /could not find the function/i.test(error.message || ''));
  }

  var legacyDraw = null;

  async function drawLevel(sb, level) {
    var result = await window.ID_RPC(sb, 'draw_sudoku_today', { level: level });
    if (!missingFn(result.error)) {
      if (result.error) return { error: true, puzzle: null };
      return { error: false, puzzle: puzzleFrom(result.data) };
    }
    if (legacyDraw) return legacyDraw;
    var single = await window.ID_RPC(sb, 'draw_sudoku_today');
    if (single.error) return { error: true, puzzle: null };
    legacyDraw = { error: false, puzzle: puzzleFrom(single.data) };
    return legacyDraw;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
