(function () {
  var LEVELS = ['easy', 'medium', 'hard'];
  var LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
  var STORAGE_PREFIX = 'iain-sudoku:';

  function melbourneDate(date) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Australia/Melbourne',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date || new Date());
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
    return {
      id: puzzle.id,
      entries: chars.join(''),
      notes: cleanNotes(saved && saved.id === puzzle.id ? saved.notes : null, chars.join(''), puzzle.givens),
      done: !!(saved && saved.id === puzzle.id && saved.done)
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
      if (givens.charAt(i) !== '0' || entries.charAt(i) !== '0') continue;
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

  function mount(root, puzzles, date) {
    var state = loadState(date);
    var level = puzzles[state.level] ? state.level : LEVELS.filter(function (name) { return puzzles[name]; })[0];
    var selected = puzzles[level].givens.indexOf('0');
    if (selected < 0) selected = 0;
    var focusCell = false;
    var checking = false;
    var pencilOn = false;

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
    var feedback = document.createElement('p');
    feedback.className = 'sudoku-feedback';
    feedback.setAttribute('role', 'status');
    var check = document.createElement('button');
    check.type = 'button';
    check.className = 'btn-primary';
    check.textContent = 'Check';

    function puzzle() { return puzzles[level]; }
    function board() {
      state.boards[level] = boardFor(state, level, puzzle());
      return state.boards[level];
    }
    function persist() {
      state.level = level;
      localStorage.setItem(STORAGE_PREFIX + date, JSON.stringify(state));
    }

    function place(digit, asPencil) {
      var current = board();
      if (current.done || selected < 0 || puzzle().givens.charAt(selected) !== '0') return;
      if (!current.notes) current.notes = blankNotes();
      var usePencil = asPencil || pencilOn;
      if (usePencil && digit !== '0') {
        if (current.entries.charAt(selected) !== '0') return;
        var marks = current.notes[selected] || '';
        current.notes[selected] = marks.indexOf(digit) >= 0
          ? marks.replace(digit, '')
          : (marks + digit).split('').sort().join('');
      } else if (digit === '0') {
        if (usePencil || current.entries.charAt(selected) === '0') current.notes[selected] = '';
        if (!usePencil) {
          var cleared = current.entries.split('');
          cleared[selected] = '0';
          current.entries = cleared.join('');
        }
      } else {
        var chars = current.entries.split('');
        chars[selected] = digit;
        current.entries = chars.join('');
        current.notes[selected] = '';
        clearSeenNotes(current, selected, digit);
      }
      current.done = false;
      persist();
      focusCell = true;
      render();
    }

    function clearSeenNotes(current, index, digit) {
      var row = Math.floor(index / 9);
      var col = index % 9;
      var boxRow = Math.floor(row / 3) * 3;
      var boxCol = Math.floor(col / 3) * 3;
      var i;
      for (i = 0; i < 81; i += 1) {
        var r = Math.floor(i / 9);
        var c = i % 9;
        var sameBox = r >= boxRow && r < boxRow + 3 && c >= boxCol && c < boxCol + 3;
        if ((r === row || c === col || sameBox) && current.notes[i]) {
          current.notes[i] = current.notes[i].replace(digit, '');
        }
      }
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
      if (!puzzles[name]) return;
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'sudoku-level';
      button.textContent = LABELS[name];
      button.addEventListener('click', function () {
        if (level === name) return;
        level = name;
        selected = puzzles[level].givens.indexOf('0');
        if (selected < 0) selected = 0;
        feedback.textContent = '';
        feedback.className = 'sudoku-feedback';
        render();
      });
      levels.appendChild(button);
    });

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
      pencilOn = !pencilOn;
      focusCell = true;
      render();
    });
    tools.appendChild(pencil);
    var erase = document.createElement('button');
    erase.type = 'button';
    erase.className = 'sudoku-key';
    erase.textContent = 'Erase';
    erase.addEventListener('click', function () { place('0', pencilOn); });
    tools.appendChild(erase);

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
      if (current.done || checking || current.entries.indexOf('0') !== -1) return;
      checking = true;
      check.disabled = true;
      feedback.textContent = 'Checking…';
      feedback.className = 'sudoku-feedback';
      var sb = client();
      var result = { error: true };
      if (sb) {
        result = puzzle().leveled === false
          ? await sb.rpc('check_sudoku_today', { entries: current.entries })
          : await sb.rpc('check_sudoku_today', { level: level, entries: current.entries });
      }
      checking = false;
      var data = result.data || {};
      if (result.error || data.ok !== true || data.valid === false) {
        feedback.textContent = 'That grid could not be checked.';
        feedback.className = 'sudoku-feedback is-wrong';
        render();
        return;
      }
      if (data.correct === true) {
        current.done = true;
        persist();
        feedback.textContent = 'That’s today’s Sudoku.';
        feedback.className = 'sudoku-feedback is-right';
      } else {
        feedback.textContent = 'Not quite.';
        feedback.className = 'sudoku-feedback is-wrong';
      }
      render();
    });

    function render() {
      var current = board();
      var given = puzzle().givens;
      var bad = conflicts(current.entries);
      var full = current.entries.indexOf('0') === -1;
      persist();

      Array.prototype.forEach.call(levels.children, function (button) {
        var on = button.textContent === LABELS[level];
        button.classList.toggle('is-on', on);
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
      });

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
        if (bad[i]) button.classList.add('is-conflict');
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
      check.disabled = checking || !full;
      pencil.classList.toggle('is-on', pencilOn);
      pencil.setAttribute('aria-pressed', pencilOn ? 'true' : 'false');
      var selectedMarks = selected >= 0 && current.notes ? (current.notes[selected] || '') : '';
      Array.prototype.forEach.call(pad.children, function (button) {
        var value = button.textContent;
        button.disabled = current.done || selected < 0 || given.charAt(selected) !== '0';
        button.classList.toggle('is-on', pencilOn && selectedMarks.indexOf(value) >= 0);
        button.setAttribute('aria-label', (pencilOn ? 'Pencil ' : 'Enter ') + value);
      });
      erase.disabled = current.done || selected < 0 || given.charAt(selected) !== '0';

      if (current.done) {
        feedback.textContent = 'That’s today’s Sudoku.';
        feedback.className = 'sudoku-feedback is-right';
      }

      if (focusCell && selected >= 0 && grid.children[selected]) {
        grid.children[selected].focus();
        focusCell = false;
      }
    }

    var available = LEVELS.filter(function (name) { return puzzles[name]; });
    if (available.length === 1 && puzzles[available[0]].leveled === false) levels.hidden = true;

    root.innerHTML = '';
    root.appendChild(levels);
    root.appendChild(grid);
    root.appendChild(feedback);
    root.appendChild(pad);
    root.appendChild(tools);
    root.appendChild(check);
    render();
  }

  async function boot() {
    var root = document.getElementById('sudoku-root');
    if (!root) return;
    var date = melbourneDate(new Date());
    var dateEl = document.getElementById('sudoku-date');
    if (dateEl) dateEl.textContent = date;

    var sb = client();
    if (!sb) return;

    var drawn = await drawPuzzles(sb);
    if (drawn.error) {
      var note = document.createElement('p');
      note.className = 'trivia-status';
      note.textContent = 'Sudoku could not be loaded.';
      root.appendChild(note);
      return;
    }
    if (!Object.keys(drawn.puzzles).length) return;
    mount(root, drawn.puzzles, date);
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

  function puzzleFrom(data, leveled) {
    if (!data || data.ok !== true || typeof data.givens !== 'string' || data.givens.length !== 81) return null;
    return { id: String(data.id || ''), givens: data.givens, leveled: leveled };
  }

  async function drawPuzzles(sb) {
    var leveled = await Promise.all(LEVELS.map(function (level) {
      return sb.rpc('draw_sudoku_today', { level: level });
    }));
    var missingLevel = leveled.every(function (result) {
      return result.error && /could not find the function/i.test(result.error.message || '');
    });
    if (missingLevel) {
      var single = await sb.rpc('draw_sudoku_today');
      if (single.error) return { error: true, puzzles: {} };
      var one = puzzleFrom(single.data, false);
      return { error: false, puzzles: one ? { easy: one } : {} };
    }
    var puzzles = {};
    var failed = false;
    leveled.forEach(function (result, index) {
      if (result.error) {
        failed = true;
        return;
      }
      var puzzle = puzzleFrom(result.data, true);
      if (puzzle) puzzles[LEVELS[index]] = puzzle;
    });
    if (!Object.keys(puzzles).length && failed) return { error: true, puzzles: {} };
    return { error: false, puzzles: puzzles };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
