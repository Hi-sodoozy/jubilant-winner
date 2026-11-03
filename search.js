(function () {
  var STORAGE_PREFIX = 'iain-search:';

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

  function line(width, start, end) {
    var sr = Math.floor(start / width);
    var sc = start % width;
    var er = Math.floor(end / width);
    var ec = end % width;
    var dr = er - sr;
    var dc = ec - sc;
    var steps = Math.max(Math.abs(dr), Math.abs(dc));
    if (steps < 1) return [start];
    var rowStep = dr === 0 ? 0 : (dr > 0 ? 1 : -1);
    var colStep = dc === 0 ? 0 : (dc > 0 ? 1 : -1);
    if (rowStep * steps !== dr || colStep * steps !== dc) return null;
    var cells = [];
    var i;
    for (i = 0; i <= steps; i += 1) cells.push((sr + rowStep * i) * width + (sc + colStep * i));
    return cells;
  }

  function mount(root, sb, puzzle, date) {
    var saved = loadState(date);
    var same = saved && saved.id === puzzle.id;
    var state = {
      id: puzzle.id,
      found: same && Array.isArray(saved.found) ? saved.found.filter(function (word) {
        return puzzle.words.indexOf(word) >= 0;
      }) : [],
      paths: same && Array.isArray(saved.paths) ? saved.paths : [],
      done: !!(same && saved.done)
    };
    var anchor = -1;
    var hover = -1;
    var checking = false;
    var grid = document.createElement('div');
    grid.className = 'search-grid';
    grid.style.setProperty('--cols', String(puzzle.width));
    grid.setAttribute('role', 'grid');
    grid.setAttribute('aria-label', 'Word Search');
    var list = document.createElement('div');
    list.className = 'search-words';
    var feedback = document.createElement('p');
    feedback.className = 'search-feedback';
    feedback.setAttribute('role', 'status');

    function persist() {
      localStorage.setItem(STORAGE_PREFIX + date, JSON.stringify(state));
    }

    function foundCells() {
      var marks = {};
      state.paths.forEach(function (path) {
        var cells = line(puzzle.width, path.start, path.end);
        if (!cells) return;
        cells.forEach(function (index) { marks[index] = true; });
      });
      return marks;
    }

    function paint() {
      var marked = foundCells();
      var active = anchor >= 0 ? (line(puzzle.width, anchor, hover >= 0 ? hover : anchor) || []) : [];
      var activeSet = {};
      active.forEach(function (index) { activeSet[index] = true; });
      Array.prototype.forEach.call(grid.children, function (cell, index) {
        cell.classList.toggle('is-found', !!marked[index]);
        cell.classList.toggle('is-path', !!activeSet[index] && !state.done);
      });
      Array.prototype.forEach.call(list.children, function (item) {
        var word = item.getAttribute('data-word');
        var on = state.found.indexOf(word) >= 0;
        item.classList.toggle('is-found', on);
      });
      if (state.done) {
        feedback.textContent = 'That’s today’s Word Search.';
        feedback.className = 'search-feedback is-right';
      }
    }

    function finishIfDone() {
      if (state.done) return;
      var all = puzzle.words.every(function (word) { return state.found.indexOf(word) >= 0; });
      if (!all) return;
      state.done = true;
      persist();
      paint();
      if (window.puzzleCelebrate) window.puzzleCelebrate(grid);
    }

    async function commit(start, end) {
      var cells = line(puzzle.width, start, end);
      if (!cells || cells.length < 3 || state.done || checking) return;
      var startRow = Math.floor(start / puzzle.width);
      var startCol = start % puzzle.width;
      var endRow = Math.floor(end / puzzle.width);
      var endCol = end % puzzle.width;
      checking = true;
      var result = await window.ID_RPC(sb, 'check_word_search_today', {
        start_row: startRow,
        start_col: startCol,
        end_row: endRow,
        end_col: endCol
      });
      checking = false;
      var data = result.data || {};
      if (result.error || data.ok !== true) {
        feedback.textContent = 'That word could not be checked.';
        feedback.className = 'search-feedback is-wrong';
        return;
      }
      if (data.valid === false || !data.found) {
        feedback.textContent = '';
        feedback.className = 'search-feedback';
        return;
      }
      if (state.found.indexOf(data.found) < 0) state.found.push(data.found);
      state.paths.push({ start: start, end: end, word: data.found });
      feedback.textContent = '';
      feedback.className = 'search-feedback';
      persist();
      paint();
      finishIfDone();
    }

    function indexFromEvent(event) {
      var el = document.elementFromPoint(event.clientX, event.clientY);
      while (el && el !== grid) {
        if (el.getAttribute && el.getAttribute('data-index') != null) return Number(el.getAttribute('data-index'));
        el = el.parentNode;
      }
      return -1;
    }

    function onDown(event) {
      if (state.done || event.button > 0) return;
      var index = indexFromEvent(event);
      if (index < 0) return;
      anchor = index;
      hover = index;
      grid.setPointerCapture(event.pointerId);
      event.preventDefault();
      paint();
    }

    function onMove(event) {
      if (anchor < 0) return;
      var index = indexFromEvent(event);
      if (index >= 0 && line(puzzle.width, anchor, index)) hover = index;
      paint();
    }

    function onUp(event) {
      if (anchor < 0) return;
      var start = anchor;
      var end = hover;
      anchor = -1;
      hover = -1;
      paint();
      if (start !== end) commit(start, end);
      if (grid.hasPointerCapture(event.pointerId)) grid.releasePointerCapture(event.pointerId);
    }

    var n;
    for (n = 0; n < puzzle.grid.length; n += 1) {
      var cell = document.createElement('div');
      cell.className = 'search-cell';
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('data-index', String(n));
      cell.textContent = puzzle.grid.charAt(n);
      var row = Math.floor(n / puzzle.width) + 1;
      var col = (n % puzzle.width) + 1;
      cell.setAttribute('aria-label', 'Row ' + row + ', column ' + col + ', ' + puzzle.grid.charAt(n));
      grid.appendChild(cell);
    }
    puzzle.words.forEach(function (word) {
      var item = document.createElement('span');
      item.className = 'search-word';
      item.setAttribute('data-word', word);
      item.textContent = word;
      list.appendChild(item);
    });

    grid.addEventListener('pointerdown', onDown);
    grid.addEventListener('pointermove', onMove);
    grid.addEventListener('pointerup', onUp);
    grid.addEventListener('pointercancel', function () {
      anchor = -1;
      hover = -1;
      paint();
    });

    root.innerHTML = '';
    root.appendChild(grid);
    root.appendChild(list);
    root.appendChild(feedback);
    paint();
    finishIfDone();
  }

  async function boot() {
    var root = document.getElementById('search-root');
    if (!root) return;
    var date = localDate(new Date());
    var dateEl = document.getElementById('search-date');
    if (dateEl) dateEl.textContent = date;
    var sb = client();
    if (!sb) return;
    var drawn = await window.ID_RPC(sb, 'draw_word_search_today');
    if (drawn.error) {
      var note = document.createElement('p');
      note.className = 'trivia-status';
      note.textContent = 'Word Search could not be loaded.';
      root.appendChild(note);
      return;
    }
    var data = drawn.data || {};
    var width = Number(data.width);
    var height = Number(data.height);
    var words = Array.isArray(data.words) ? data.words.map(function (word) { return String(word || '').toUpperCase(); }).filter(Boolean) : [];
    if (data.ok !== true || typeof data.grid !== 'string' || data.grid.length !== width * height || words.length < 3) return;
    mount(root, sb, {
      id: String(data.id || ''),
      width: width,
      height: height,
      grid: data.grid,
      words: words
    }, date);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
