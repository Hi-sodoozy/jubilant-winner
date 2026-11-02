(function () {
  var STORAGE_PREFIX = 'iain-connections:';
  var MISTAKES_ALLOWED = 4;
  var COLORS = ['is-sun', 'is-cream', 'is-lilac', 'is-pink'];

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

  function norm(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function hashString(value) {
    var h = 2166136261;
    var i;
    for (i = 0; i < value.length; i += 1) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function shuffle(list, seedKey) {
    var copy = list.slice();
    var random = mulberry32(hashString(seedKey));
    var i;
    for (i = copy.length - 1; i > 0; i -= 1) {
      var j = Math.floor(random() * (i + 1));
      var swap = copy[i];
      copy[i] = copy[j];
      copy[j] = swap;
    }
    return copy;
  }

  function guessKey(words) {
    return words.map(norm).sort().join('|');
  }

  function blankProgress(id) {
    return { id: id, found: [], mistakes: 0, tried: [], done: false, lost: false };
  }

  function loadProgress(date, id) {
    try {
      var raw = localStorage.getItem(STORAGE_PREFIX + date);
      if (!raw) return blankProgress(id);
      var data = JSON.parse(raw);
      if (!data || data.id !== id || !Array.isArray(data.found) || !Array.isArray(data.tried)) {
        return blankProgress(id);
      }
      data.mistakes = Number(data.mistakes) || 0;
      data.done = !!data.done;
      data.lost = !!data.lost;
      return data;
    } catch (e) {
      return blankProgress(id);
    }
  }

  function saveProgress(date, progress) {
    localStorage.setItem(STORAGE_PREFIX + date, JSON.stringify(progress));
  }

  function status(root, message) {
    root.innerHTML = '';
    var p = document.createElement('p');
    p.className = 'trivia-status';
    p.textContent = message;
    root.appendChild(p);
  }

  function prepare(data) {
    var groups = (data.groups || []).map(function (group, index) {
      return {
        index: index,
        theme: group.theme || '',
        words: Array.isArray(group.words) ? group.words.slice(0, 4) : []
      };
    }).filter(function (group) {
      return group.words.length === 4 && group.theme;
    });
    var tiles = [];
    groups.forEach(function (group) {
      group.words.forEach(function (word) {
        tiles.push({ word: word, group: group.index });
      });
    });
    return {
      id: String(data.id || ''),
      groups: groups,
      tiles: shuffle(tiles, String(data.play_date || '') + ':' + String(data.id || ''))
    };
  }

  function mount(root, puzzle, date) {
    if (puzzle.groups.length !== 4 || puzzle.tiles.length !== 16) return;
    var progress = loadProgress(date, puzzle.id);
    var selected = [];
    var busy = false;

    function persist() {
      saveProgress(date, progress);
    }

    function groupByIndex(index) {
      var match = null;
      puzzle.groups.forEach(function (group) {
        if (group.index === index) match = group;
      });
      return match;
    }

    function overlap(words, group) {
      var wanted = {};
      group.words.forEach(function (word) { wanted[norm(word)] = true; });
      var n = 0;
      words.forEach(function (word) {
        if (wanted[norm(word)]) n += 1;
      });
      return n;
    }

    function matchingGroup(words) {
      var found = null;
      puzzle.groups.forEach(function (group) {
        if (progress.found.indexOf(group.index) !== -1) return;
        if (overlap(words, group) === 4) found = group;
      });
      return found;
    }

    function oneAway(words) {
      var close = false;
      puzzle.groups.forEach(function (group) {
        if (progress.found.indexOf(group.index) !== -1) return;
        if (overlap(words, group) === 3) close = true;
      });
      return close;
    }

    function render() {
      root.innerHTML = '';
      var solved = document.createElement('div');
      solved.className = 'conn-solved';
      progress.found.forEach(function (index) {
        var group = groupByIndex(index);
        if (!group) return;
        var row = document.createElement('div');
        row.className = 'conn-solved-row ' + (COLORS[index] || COLORS[0]);
        var theme = document.createElement('p');
        theme.className = 'conn-theme';
        theme.textContent = group.theme;
        var words = document.createElement('p');
        words.className = 'conn-solved-words';
        words.textContent = group.words.join(', ');
        row.appendChild(theme);
        row.appendChild(words);
        solved.appendChild(row);
      });
      if (progress.found.length) root.appendChild(solved);

      var finished = progress.done || progress.lost || progress.found.length === 4;
      if (!finished) {
        var grid = document.createElement('div');
        grid.className = 'conn-grid';
        grid.setAttribute('role', 'group');
        grid.setAttribute('aria-label', 'Words');
        puzzle.tiles.forEach(function (tile) {
          if (progress.found.indexOf(tile.group) !== -1) return;
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'conn-tile';
          btn.textContent = tile.word;
          var on = selected.indexOf(tile.word) !== -1;
          btn.setAttribute('aria-pressed', on ? 'true' : 'false');
          if (on) btn.classList.add('is-selected');
          btn.addEventListener('click', function () {
            if (busy) return;
            var at = selected.indexOf(tile.word);
            if (at !== -1) selected.splice(at, 1);
            else if (selected.length < 4) selected.push(tile.word);
            render();
          });
          grid.appendChild(btn);
        });
        root.appendChild(grid);

        var lives = document.createElement('p');
        lives.className = 'conn-lives';
        lives.textContent = 'Mistakes left: ' + (MISTAKES_ALLOWED - progress.mistakes);
        root.appendChild(lives);

        var actions = document.createElement('div');
        actions.className = 'conn-actions';
        var clear = document.createElement('button');
        clear.type = 'button';
        clear.className = 'btn-secondary';
        clear.textContent = 'Clear';
        clear.disabled = selected.length === 0;
        clear.addEventListener('click', function () {
          selected = [];
          render();
        });
        var submit = document.createElement('button');
        submit.type = 'button';
        submit.className = 'btn-primary';
        submit.textContent = 'Submit';
        submit.disabled = selected.length !== 4;
        submit.addEventListener('click', function () { guess(grid); });
        actions.appendChild(clear);
        actions.appendChild(submit);
        root.appendChild(actions);
      }

      var feedback = document.createElement('p');
      feedback.className = 'conn-feedback';
      if (progress.found.length === 4 && !progress.lost) {
        feedback.textContent = 'All four. That’s today’s Connections.';
      } else if (progress.lost) {
        feedback.textContent = 'Four misses. The groups were:';
      }
      if (feedback.textContent) root.appendChild(feedback);

      if (progress.lost) {
        var rest = document.createElement('div');
        rest.className = 'conn-solved';
        puzzle.groups.forEach(function (group) {
          if (progress.found.indexOf(group.index) !== -1) return;
          var row = document.createElement('div');
          row.className = 'conn-solved-row ' + (COLORS[group.index] || COLORS[0]);
          var theme = document.createElement('p');
          theme.className = 'conn-theme';
          theme.textContent = group.theme;
          var words = document.createElement('p');
          words.className = 'conn-solved-words';
          words.textContent = group.words.join(', ');
          row.appendChild(theme);
          row.appendChild(words);
          rest.appendChild(row);
        });
        root.appendChild(rest);
      }
    }

    function showNote(grid, message) {
      var note = document.createElement('p');
      note.className = 'conn-feedback';
      note.textContent = message;
      grid.insertAdjacentElement('afterend', note);
    }

    function guess(grid) {
      if (busy || selected.length !== 4) return;
      busy = true;
      var words = selected.slice();
      var key = guessKey(words);
      var hit = matchingGroup(words);
      if (hit) {
        busy = false;
        progress.found.push(hit.index);
        selected = [];
        if (progress.found.length === 4) progress.done = true;
        persist();
        render();
        return;
      }
      if (progress.tried.indexOf(key) !== -1) {
        busy = false;
        showNote(grid, 'Already tried.');
        return;
      }
      progress.tried.push(key);
      progress.mistakes += 1;
      if (progress.mistakes >= MISTAKES_ALLOWED) progress.lost = true;
      persist();
      grid.classList.add('is-shaking');
      var message = progress.lost
        ? 'Four misses. The groups were:'
        : (oneAway(words) ? 'One away.' : 'Not a group.');
      showNote(grid, message);
      window.setTimeout(function () {
        busy = false;
        selected = [];
        render();
        if (!progress.lost) {
          var note = document.createElement('p');
          note.className = 'conn-feedback';
          note.textContent = message;
          var actions = root.querySelector('.conn-actions');
          if (actions) root.insertBefore(note, actions);
        }
      }, 700);
    }

    render();
  }

  async function boot() {
    var root = document.getElementById('connections-root');
    if (!root) return;
    var date = melbourneDate(new Date());
    var dateEl = document.getElementById('connections-date');
    if (dateEl) dateEl.textContent = date;

    var sb = client();
    if (!sb) {
      status(root, 'Connections is not connected yet. Add the Supabase URL and anon key in supabase-config.js.');
      return;
    }

    var result = await sb.rpc('draw_connections_today');
    if (result.error) {
      status(root, 'The puzzle could not be loaded. Run supabase/trivia.sql in the Supabase SQL editor.');
      return;
    }
    var data = result.data || {};
    if (data.ok !== true) return;
    mount(root, prepare(data), date);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
