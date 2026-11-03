(function () {
  var STORAGE_PREFIX = 'iain-word:';
  var TRIES = 6;
  var ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

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

  function mount(root, sb, puzzle, date) {
    var saved = loadState(date);
    var same = saved && saved.id === puzzle.id;
    var state = {
      id: puzzle.id,
      guesses: same && Array.isArray(saved.guesses) ? saved.guesses.filter(function (row) {
        return row && typeof row.guess === 'string' && Array.isArray(row.marks);
      }) : [],
      current: '',
      done: !!(same && saved.done),
      won: !!(same && saved.won),
      hinted: !!(same && saved.hinted)
    };
    var busy = false;
    var grid = document.createElement('div');
    grid.className = 'word-grid';
    grid.style.setProperty('--length', String(puzzle.length));
    grid.setAttribute('role', 'grid');
    grid.setAttribute('aria-label', 'Word');
    var hint = document.createElement('p');
    hint.className = 'word-hint';
    hint.hidden = true;
    var hintButton = document.createElement('button');
    hintButton.type = 'button';
    hintButton.className = 'word-hint-btn';
    hintButton.textContent = 'Hint';
    var feedback = document.createElement('p');
    feedback.className = 'word-feedback';
    feedback.setAttribute('role', 'status');
    var keys = document.createElement('div');
    keys.className = 'word-keys';

    function persist() {
      localStorage.setItem(STORAGE_PREFIX + date, JSON.stringify({
        id: state.id,
        guesses: state.guesses,
        done: state.done,
        won: state.won,
        hinted: state.hinted
      }));
    }

    function rank(mark) {
      if (mark === 'correct') return 3;
      if (mark === 'present') return 2;
      if (mark === 'absent') return 1;
      return 0;
    }

    function keyMarks() {
      var best = {};
      state.guesses.forEach(function (row) {
        var i;
        for (i = 0; i < row.guess.length; i += 1) {
          var letter = row.guess.charAt(i);
          var mark = row.marks[i];
          if (rank(mark) > rank(best[letter])) best[letter] = mark;
        }
      });
      return best;
    }

    function render() {
      grid.innerHTML = '';
      var r;
      var c;
      for (r = 0; r < TRIES; r += 1) {
        var row = state.guesses[r];
        var typed = !row && r === state.guesses.length ? state.current : '';
        for (c = 0; c < puzzle.length; c += 1) {
          var cell = document.createElement('div');
          cell.className = 'word-cell';
          cell.setAttribute('role', 'gridcell');
          if (row) {
            cell.textContent = row.guess.charAt(c);
            cell.classList.add('is-' + (row.marks[c] || 'absent'));
          } else if (typed.charAt(c)) {
            cell.textContent = typed.charAt(c);
          }
          grid.appendChild(cell);
        }
      }

      var marks = keyMarks();
      keys.innerHTML = '';
      ROWS.forEach(function (letters, index) {
        var line = document.createElement('div');
        line.className = 'word-key-row';
        if (index === 2) {
          var enter = document.createElement('button');
          enter.type = 'button';
          enter.className = 'word-key is-wide';
          enter.textContent = 'Enter';
          enter.addEventListener('click', submit);
          line.appendChild(enter);
        }
        letters.split('').forEach(function (letter) {
          var button = document.createElement('button');
          button.type = 'button';
          button.className = 'word-key';
          button.textContent = letter;
          if (marks[letter]) button.classList.add('is-' + marks[letter]);
          button.disabled = state.done;
          button.addEventListener('click', function () { typeLetter(letter); });
          line.appendChild(button);
        });
        if (index === 2) {
          var back = document.createElement('button');
          back.type = 'button';
          back.className = 'word-key is-wide';
          back.textContent = 'Delete';
          back.setAttribute('aria-label', 'Delete');
          back.addEventListener('click', erase);
          line.appendChild(back);
        }
        keys.appendChild(line);
      });

      if (state.won) {
        feedback.textContent = 'That’s today’s Word.';
        feedback.className = 'word-feedback is-right';
      } else if (state.done) {
        feedback.textContent = 'Out of tries.';
        feedback.className = 'word-feedback';
      }
    }

    function typeLetter(letter) {
      if (state.done || busy || state.current.length >= puzzle.length) return;
      state.current += letter;
      render();
    }

    function erase() {
      if (state.done || busy || !state.current) return;
      state.current = state.current.slice(0, -1);
      render();
    }

    async function submit() {
      if (state.done || busy) return;
      if (state.current.length !== puzzle.length) return;
      busy = true;
      feedback.textContent = '';
      feedback.className = 'word-feedback';
      var result = await window.ID_RPC(sb, 'guess_word_today', { guess: state.current });
      busy = false;
      var data = result.data || {};
      if (result.error || data.ok !== true || data.valid === false || !Array.isArray(data.marks)) {
        feedback.textContent = 'That guess could not be checked.';
        feedback.className = 'word-feedback is-wrong';
        return;
      }
      state.guesses.push({ guess: state.current, marks: data.marks });
      state.current = '';
      if (data.correct === true) {
        state.done = true;
        state.won = true;
      } else if (state.guesses.length >= TRIES) {
        state.done = true;
      }
      persist();
      render();
      if (state.won && window.puzzleCelebrate) window.puzzleCelebrate(grid);
    }

    function onKey(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      var tag = event.target && event.target.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      if (/^[a-zA-Z]$/.test(event.key)) {
        typeLetter(event.key.toUpperCase());
        event.preventDefault();
      } else if (event.key === 'Backspace') {
        erase();
        event.preventDefault();
      } else if (event.key === 'Enter') {
        submit();
        event.preventDefault();
      }
    }

    function showHint() {
      state.hinted = true;
      hint.hidden = false;
      hint.textContent = puzzle.hint || 'No hint for this word.';
      hintButton.hidden = true;
      persist();
    }

    hintButton.addEventListener('click', showHint);
    document.addEventListener('keydown', onKey);
    root.innerHTML = '';
    root.appendChild(grid);
    root.appendChild(hintButton);
    root.appendChild(hint);
    root.appendChild(feedback);
    root.appendChild(keys);
    render();
    if (state.hinted) showHint();
  }

  async function boot() {
    var root = document.getElementById('word-root');
    if (!root) return;
    var date = localDate(new Date());
    var dateEl = document.getElementById('word-date');
    if (dateEl) dateEl.textContent = date;
    var sb = client();
    if (!sb) return;
    var drawn = await window.ID_RPC(sb, 'draw_word_today');
    if (drawn.error) {
      var note = document.createElement('p');
      note.className = 'trivia-status';
      note.textContent = 'Word could not be loaded.';
      root.appendChild(note);
      return;
    }
    var data = drawn.data || {};
    var length = Number(data.length);
    if (data.ok !== true || length < 4 || length > 8) return;
    if (window.ID_PLAY) window.ID_PLAY('word');
    mount(root, sb, {
      id: String(data.id || ''),
      length: length,
      hint: String(data.hint || '')
    }, date);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
