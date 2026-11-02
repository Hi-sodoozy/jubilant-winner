(function () {
  var STORAGE_PREFIX = 'iain-tiny:';

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

  function formatTime(ms) {
    var total = Math.max(0, Math.floor(ms / 1000));
    var hours = Math.floor(total / 3600);
    var minutes = Math.floor((total % 3600) / 60);
    var seconds = total % 60;
    var padded = function (value) { return (value < 10 ? '0' : '') + value; };
    if (hours) return hours + ':' + padded(minutes) + ':' + padded(seconds);
    return minutes + ':' + padded(seconds);
  }

  function loadState(date) {
    try {
      var data = JSON.parse(localStorage.getItem(STORAGE_PREFIX + date) || '');
      if (!data || typeof data !== 'object') return {};
      return data;
    } catch (e) {
      return {};
    }
  }

  function puzzleFrom(data) {
    if (!data || data.ok !== true || data.width !== 5 || data.height !== 5) return null;
    if (typeof data.mask !== 'string' || data.mask.length !== 25) return null;
    var clues = Array.isArray(data.clues) ? data.clues : [];
    return {
      id: String(data.id || ''),
      width: 5,
      height: 5,
      mask: data.mask,
      clues: clues.filter(function (clue) {
        return clue && (clue.direction === 'across' || clue.direction === 'down');
      }).map(function (clue) {
        return {
          direction: clue.direction,
          number: Number(clue.number),
          clue: String(clue.clue || ''),
          row: Number(clue.row),
          col: Number(clue.col),
          length: Number(clue.length) || 0
        };
      })
    };
  }

  function boardFor(saved, puzzle) {
    var letters = puzzle.mask.split('');
    var same = saved && saved.id === puzzle.id;
    var prior = same && typeof saved.letters === 'string' ? saved.letters : '';
    var i;
    for (i = 0; i < letters.length; i += 1) {
      if (puzzle.mask.charAt(i) === '#') letters[i] = '#';
      else if (/^[A-Z]$/.test(prior.charAt(i))) letters[i] = prior.charAt(i);
      else letters[i] = '.';
    }
    var selected = letters.indexOf('.');
    if (same && typeof saved.selected === 'number' && puzzle.mask.charAt(saved.selected) !== '#') selected = saved.selected;
    if (selected < 0) selected = puzzle.mask.indexOf('.') >= 0 ? puzzle.mask.indexOf('.') : 0;
    return {
      id: puzzle.id,
      letters: letters.join(''),
      selected: selected,
      direction: same && saved.direction === 'down' ? 'down' : 'across',
      startedAt: same && saved.startedAt ? saved.startedAt : Date.now(),
      done: !!(same && saved.done),
      elapsed: same && saved.done ? (saved.elapsed || 0) : 0
    };
  }

  function mount(root, sb, puzzle, date) {
    var saved = loadState(date);
    var state = boardFor(saved, puzzle);
    var checking = false;
    var checked = '';
    var timerId = 0;

    var time = document.createElement('p');
    time.className = 'tiny-time';
    time.setAttribute('aria-label', 'Time');
    var clueLine = document.createElement('p');
    clueLine.className = 'tiny-current';
    var grid = document.createElement('div');
    grid.className = 'tiny-grid';
    grid.setAttribute('role', 'grid');
    grid.setAttribute('aria-label', 'Tiny Crossword');
    var capture = document.createElement('input');
    capture.className = 'tiny-capture';
    capture.setAttribute('aria-label', 'Type a letter');
    capture.setAttribute('autocomplete', 'off');
    capture.setAttribute('autocapitalize', 'characters');
    capture.setAttribute('inputmode', 'text');
    capture.maxLength = 1;
    var clues = document.createElement('div');
    clues.className = 'tiny-clues';
    var feedback = document.createElement('p');
    feedback.className = 'tiny-feedback';
    feedback.setAttribute('role', 'status');

    function persist() {
      localStorage.setItem(STORAGE_PREFIX + date, JSON.stringify(state));
    }

    function elapsedNow() {
      if (state.done) return state.elapsed || 0;
      return Date.now() - state.startedAt;
    }

    function paintTime() {
      var text = formatTime(elapsedNow());
      time.textContent = text;
      time.setAttribute('aria-label', 'Time ' + text);
    }

    function isBlock(index) {
      return puzzle.mask.charAt(index) === '#';
    }

    function run(index, direction) {
      if (index < 0 || isBlock(index)) return [];
      var row = Math.floor(index / 5);
      var col = index % 5;
      var dr = direction === 'down' ? 1 : 0;
      var dc = dr ? 0 : 1;
      while (row - dr >= 0 && col - dc >= 0 && row - dr < 5 && col - dc < 5 && !isBlock((row - dr) * 5 + (col - dc))) {
        row -= dr;
        col -= dc;
      }
      var cells = [];
      while (row >= 0 && col >= 0 && row < 5 && col < 5 && !isBlock(row * 5 + col)) {
        cells.push(row * 5 + col);
        row += dr;
        col += dc;
      }
      return cells;
    }

    function activeRun() {
      var cells = run(state.selected, state.direction);
      if (cells.length > 1) return cells;
      var other = state.direction === 'down' ? 'across' : 'down';
      var flipped = run(state.selected, other);
      if (flipped.length > 1) {
        state.direction = other;
        return flipped;
      }
      return cells;
    }

    function clueFor(cells, direction) {
      if (!cells.length) return null;
      var row = Math.floor(cells[0] / 5);
      var col = cells[0] % 5;
      var i;
      for (i = 0; i < puzzle.clues.length; i += 1) {
        var clue = puzzle.clues[i];
        if (clue.direction === direction && clue.row === row && clue.col === col) return clue;
      }
      return null;
    }

    function numbers() {
      var map = {};
      puzzle.clues.forEach(function (clue) {
        var key = clue.row + ':' + clue.col;
        if (map[key] == null || clue.number < map[key]) map[key] = clue.number;
      });
      return map;
    }

    function focusCapture() {
      if (!state.done) capture.focus();
    }

    function select(index, direction) {
      if (isBlock(index) || state.done) return;
      if (index === state.selected && direction === state.direction) direction = direction === 'down' ? 'across' : 'down';
      state.selected = index;
      if (direction) state.direction = direction;
      activeRun();
      persist();
      render();
      focusCapture();
    }

    function write(letter) {
      if (state.done || isBlock(state.selected)) return;
      var chars = state.letters.split('');
      chars[state.selected] = letter;
      state.letters = chars.join('');
      var cells = activeRun();
      var at = cells.indexOf(state.selected);
      if (at >= 0 && at < cells.length - 1) state.selected = cells[at + 1];
      persist();
      render();
      focusCapture();
      maybeCheck();
    }

    function erase() {
      if (state.done || isBlock(state.selected)) return;
      var chars = state.letters.split('');
      var cells = activeRun();
      var at = cells.indexOf(state.selected);
      if (chars[state.selected] === '.' && at > 0) {
        state.selected = cells[at - 1];
        chars[state.selected] = '.';
      } else {
        chars[state.selected] = '.';
      }
      state.letters = chars.join('');
      persist();
      render();
      focusCapture();
    }

    function move(rowStep, colStep) {
      if (state.done) return;
      var row = Math.max(0, Math.min(4, Math.floor(state.selected / 5) + rowStep));
      var col = Math.max(0, Math.min(4, (state.selected % 5) + colStep));
      var index = row * 5 + col;
      if (isBlock(index)) return;
      state.selected = index;
      if (rowStep) state.direction = 'down';
      if (colStep) state.direction = 'across';
      persist();
      render();
      focusCapture();
    }

    async function maybeCheck() {
      if (state.done || checking || state.letters.indexOf('.') !== -1) return;
      if (checked === state.letters) return;
      checked = state.letters;
      checking = true;
      var result = await sb.rpc('check_tiny_crossword_today', { letters: state.letters });
      checking = false;
      var data = result.data || {};
      if (result.error || data.ok !== true || data.valid === false) {
        checked = '';
        feedback.textContent = 'That grid could not be checked.';
        feedback.className = 'tiny-feedback is-wrong';
        return;
      }
      if (data.correct === true) {
        state.done = true;
        state.elapsed = Date.now() - state.startedAt;
        persist();
        if (timerId) clearInterval(timerId);
        paintTime();
        feedback.textContent = formatTime(state.elapsed) + '. That’s today’s Tiny Crossword.';
        feedback.className = 'tiny-feedback is-right';
        render();
        return;
      }
      if (data.complete) {
        feedback.textContent = 'Not quite.';
        feedback.className = 'tiny-feedback is-wrong';
      }
    }

    function render() {
      var cells = activeRun();
      var inWord = {};
      cells.forEach(function (index) { inWord[index] = true; });
      var current = clueFor(cells, state.direction);
      clueLine.textContent = current ? current.number + '. ' + current.clue : '';
      paintTime();

      var cellNumbers = numbers();
      grid.innerHTML = '';
      var i;
      for (i = 0; i < 25; i += 1) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'tiny-cell';
        var row = Math.floor(i / 5);
        var col = i % 5;
        var letter = state.letters.charAt(i);
        if (letter === '#') button.classList.add('is-block');
        if (inWord[i]) button.classList.add('is-word');
        if (i === state.selected) button.classList.add('is-selected');
        if (cellNumbers[row + ':' + col] != null && letter !== '#') {
          var num = document.createElement('span');
          num.className = 'tiny-num';
          num.textContent = String(cellNumbers[row + ':' + col]);
          button.appendChild(num);
        }
        if (letter !== '#' && letter !== '.') {
          var shown = document.createElement('span');
          shown.className = 'tiny-letter';
          shown.textContent = letter;
          button.appendChild(shown);
        }
        var label = 'Row ' + (row + 1) + ', column ' + (col + 1);
        if (letter === '#') label += ', block';
        else if (letter === '.') label += ', empty';
        else label += ', ' + letter;
        button.setAttribute('aria-label', label);
        button.disabled = state.done || letter === '#';
        (function (index) {
          button.addEventListener('click', function () {
            select(index, state.direction);
          });
        })(i);
        grid.appendChild(button);
      }

      clues.innerHTML = '';
      ['across', 'down'].forEach(function (direction) {
        var group = document.createElement('div');
        var title = document.createElement('h2');
        title.textContent = direction === 'across' ? 'Across' : 'Down';
        group.appendChild(title);
        var list = document.createElement('div');
        list.className = 'tiny-clue-list';
        puzzle.clues.filter(function (clue) { return clue.direction === direction; }).forEach(function (clue) {
          var item = document.createElement('button');
          item.type = 'button';
          item.className = 'tiny-clue';
          item.textContent = clue.number + '. ' + clue.clue;
          var on = current && current.direction === clue.direction && current.number === clue.number;
          item.classList.toggle('is-on', !!on);
          item.addEventListener('click', function () {
            select(clue.row * 5 + clue.col, direction);
          });
          list.appendChild(item);
        });
        group.appendChild(list);
        clues.appendChild(group);
      });

      if (state.done) {
        feedback.textContent = formatTime(state.elapsed) + '. That’s today’s Tiny Crossword.';
        feedback.className = 'tiny-feedback is-right';
        capture.disabled = true;
      }
    }

    function onKey(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      var tag = event.target && event.target.tagName;
      if (tag === 'TEXTAREA' || (tag === 'INPUT' && event.target !== capture)) return;
      if (/^[a-zA-Z]$/.test(event.key)) {
        write(event.key.toUpperCase());
        event.preventDefault();
      } else if (event.key === 'Backspace' || event.key === 'Delete') {
        erase();
        event.preventDefault();
      } else if (event.key === 'ArrowLeft') {
        move(0, -1);
        event.preventDefault();
      } else if (event.key === 'ArrowRight') {
        move(0, 1);
        event.preventDefault();
      } else if (event.key === 'ArrowUp') {
        move(-1, 0);
        event.preventDefault();
      } else if (event.key === 'ArrowDown') {
        move(1, 0);
        event.preventDefault();
      } else if (event.key === ' ') {
        state.direction = state.direction === 'down' ? 'across' : 'down';
        activeRun();
        persist();
        render();
        focusCapture();
        event.preventDefault();
      }
    }

    capture.addEventListener('input', function () {
      var letter = capture.value.replace(/[^A-Za-z]/g, '').slice(-1).toUpperCase();
      capture.value = '';
      if (letter) write(letter);
    });
    document.addEventListener('keydown', onKey);

    root.innerHTML = '';
    root.appendChild(time);
    root.appendChild(clueLine);
    root.appendChild(grid);
    root.appendChild(capture);
    root.appendChild(clues);
    root.appendChild(feedback);
    render();
    persist();
    if (!state.done) {
      timerId = setInterval(paintTime, 250);
      focusCapture();
      if (state.letters.indexOf('.') === -1) maybeCheck();
    }
  }

  async function boot() {
    var root = document.getElementById('tiny-root');
    if (!root) return;
    var date = melbourneDate(new Date());
    var dateEl = document.getElementById('tiny-date');
    if (dateEl) dateEl.textContent = date;
    var sb = client();
    if (!sb) return;
    var drawn = await sb.rpc('draw_tiny_crossword_today');
    if (drawn.error) {
      var note = document.createElement('p');
      note.className = 'trivia-status';
      note.textContent = 'Tiny Crossword could not be loaded.';
      root.appendChild(note);
      return;
    }
    var puzzle = puzzleFrom(drawn.data);
    if (!puzzle) return;
    mount(root, sb, puzzle, date);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
