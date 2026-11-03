(function () {
  var STORAGE_PREFIX = 'iain-crossword:';

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
    var width = Number(data && data.width);
    var height = Number(data && data.height);
    if (!data || data.ok !== true || width < 3 || height < 3 || width > 21 || height > 21) return null;
    if (typeof data.mask !== 'string' || data.mask.length !== width * height) return null;
    var clues = Array.isArray(data.clues) ? data.clues : [];
    return {
      id: String(data.id || ''),
      width: width,
      height: height,
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

  function mount(root, sb, puzzle, date) {
    var saved = loadState(date);
    var width = puzzle.width;
    var height = puzzle.height;
    var size = width * height;
    var letters = puzzle.mask.split('');
    var same = saved && saved.id === puzzle.id;
    var prior = same && typeof saved.letters === 'string' ? saved.letters : '';
    var i;
    for (i = 0; i < size; i += 1) {
      if (puzzle.mask.charAt(i) === '#') letters[i] = '#';
      else if (/^[A-Z]$/.test(prior.charAt(i))) letters[i] = prior.charAt(i);
      else letters[i] = '.';
    }
    var selected = letters.indexOf('.');
    if (same && typeof saved.selected === 'number' && puzzle.mask.charAt(saved.selected) !== '#') selected = saved.selected;
    if (selected < 0) selected = Math.max(0, puzzle.mask.indexOf('.'));
    var state = {
      id: puzzle.id,
      letters: letters.join(''),
      selected: selected,
      direction: same && saved.direction === 'down' ? 'down' : 'across',
      done: !!(same && saved.done)
    };
    var checking = false;
    var checked = '';

    var clueLine = document.createElement('p');
    clueLine.className = 'cross-current';
    var grid = document.createElement('div');
    grid.className = 'cross-grid';
    grid.style.setProperty('--cols', String(width));
    grid.setAttribute('role', 'grid');
    grid.setAttribute('aria-label', 'Crossword');
    var capture = document.createElement('input');
    capture.className = 'cross-capture';
    capture.setAttribute('aria-label', 'Type a letter');
    capture.setAttribute('autocomplete', 'off');
    capture.setAttribute('autocapitalize', 'characters');
    capture.setAttribute('inputmode', 'text');
    capture.maxLength = 1;
    var clues = document.createElement('div');
    clues.className = 'cross-clues';
    var feedback = document.createElement('p');
    feedback.className = 'cross-feedback';
    feedback.setAttribute('role', 'status');

    function persist() {
      localStorage.setItem(STORAGE_PREFIX + date, JSON.stringify(state));
    }

    function isBlock(index) {
      return puzzle.mask.charAt(index) === '#';
    }

    function run(index, direction) {
      if (index < 0 || isBlock(index)) return [];
      var row = Math.floor(index / width);
      var col = index % width;
      var dr = direction === 'down' ? 1 : 0;
      var dc = dr ? 0 : 1;
      while (row - dr >= 0 && col - dc >= 0 && row - dr < height && col - dc < width && !isBlock((row - dr) * width + (col - dc))) {
        row -= dr;
        col -= dc;
      }
      var cells = [];
      while (row >= 0 && col >= 0 && row < height && col < width && !isBlock(row * width + col)) {
        cells.push(row * width + col);
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
      var row = Math.floor(cells[0] / width);
      var col = cells[0] % width;
      var n;
      for (n = 0; n < puzzle.clues.length; n += 1) {
        var clue = puzzle.clues[n];
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
      var row = Math.max(0, Math.min(height - 1, Math.floor(state.selected / width) + rowStep));
      var col = Math.max(0, Math.min(width - 1, (state.selected % width) + colStep));
      var index = row * width + col;
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
      var result = await window.ID_RPC(sb, 'check_crossword_today', { letters: state.letters });
      checking = false;
      var data = result.data || {};
      if (result.error || data.ok !== true || data.valid === false) {
        checked = '';
        feedback.textContent = 'That grid could not be checked.';
        feedback.className = 'cross-feedback is-wrong';
        return;
      }
      if (data.correct === true) {
        state.done = true;
        persist();
        feedback.textContent = 'That’s today’s Crossword.';
        feedback.className = 'cross-feedback is-right';
        render();
        if (window.puzzleCelebrate) window.puzzleCelebrate(grid);
        return;
      }
      if (data.complete) {
        feedback.textContent = 'Not quite.';
        feedback.className = 'cross-feedback is-wrong';
      }
    }

    function render() {
      var cells = activeRun();
      var inWord = {};
      cells.forEach(function (index) { inWord[index] = true; });
      var current = clueFor(cells, state.direction);
      clueLine.textContent = current ? current.number + '. ' + current.clue : '';
      var cellNumbers = numbers();
      grid.innerHTML = '';
      var n;
      for (n = 0; n < size; n += 1) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'cross-cell';
        var row = Math.floor(n / width);
        var col = n % width;
        var letter = state.letters.charAt(n);
        if (letter === '#') button.classList.add('is-block');
        if (inWord[n]) button.classList.add('is-word');
        if (n === state.selected) button.classList.add('is-selected');
        if (cellNumbers[row + ':' + col] != null && letter !== '#') {
          var num = document.createElement('span');
          num.className = 'cross-num';
          num.textContent = String(cellNumbers[row + ':' + col]);
          button.appendChild(num);
        }
        if (letter !== '#' && letter !== '.') {
          var shown = document.createElement('span');
          shown.className = 'cross-letter';
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
          button.addEventListener('click', function () { select(index, state.direction); });
        })(n);
        grid.appendChild(button);
      }
      if (grid.children[state.selected]) grid.children[state.selected].scrollIntoView({ block: 'nearest', inline: 'nearest' });

      clues.innerHTML = '';
      ['across', 'down'].forEach(function (direction) {
        var group = document.createElement('div');
        var title = document.createElement('h2');
        title.textContent = direction === 'across' ? 'Across' : 'Down';
        group.appendChild(title);
        var list = document.createElement('div');
        list.className = 'cross-clue-list';
        puzzle.clues.filter(function (clue) { return clue.direction === direction; }).forEach(function (clue) {
          var item = document.createElement('button');
          item.type = 'button';
          item.className = 'cross-clue';
          item.textContent = clue.number + '. ' + clue.clue;
          var on = current && current.direction === clue.direction && current.number === clue.number;
          item.classList.toggle('is-on', !!on);
          item.addEventListener('click', function () { select(clue.row * width + clue.col, direction); });
          list.appendChild(item);
        });
        group.appendChild(list);
        clues.appendChild(group);
      });

      if (state.done) {
        feedback.textContent = 'That’s today’s Crossword.';
        feedback.className = 'cross-feedback is-right';
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
    root.appendChild(clueLine);
    root.appendChild(grid);
    root.appendChild(capture);
    root.appendChild(clues);
    root.appendChild(feedback);
    render();
    persist();
    if (!state.done) {
      focusCapture();
      if (state.letters.indexOf('.') === -1) maybeCheck();
    }
  }

  async function boot() {
    var root = document.getElementById('crossword-root');
    if (!root) return;
    var date = localDate(new Date());
    var dateEl = document.getElementById('crossword-date');
    if (dateEl) dateEl.textContent = date;
    var sb = client();
    if (!sb) return;
    var drawn = await window.ID_RPC(sb, 'draw_crossword_today');
    if (drawn.error) {
      var note = document.createElement('p');
      note.className = 'trivia-status';
      note.textContent = 'Crossword could not be loaded.';
      root.appendChild(note);
      return;
    }
    var puzzle = puzzleFrom(drawn.data);
    if (!puzzle) return;
    if (window.ID_PLAY) window.ID_PLAY('crossword');
    mount(root, sb, puzzle, date);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
