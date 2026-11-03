(function () {
  var STORAGE_PREFIX = 'iain-button:';
  var TRIES = 6;
  var TARGET = 10;
  var CLOSE = 0.1;

  function localDate() {
    if (window.ID_LOCAL_DATE) return window.ID_LOCAL_DATE();
    var now = new Date();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    return now.getFullYear() + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
  }

  function load(date) {
    try {
      var data = JSON.parse(localStorage.getItem(STORAGE_PREFIX + date) || '');
      if (!data || !Array.isArray(data.tries)) return [];
      return data.tries.filter(function (value) { return typeof value === 'number' && isFinite(value); }).slice(0, TRIES);
    } catch (e) {
      return [];
    }
  }

  function mount(root) {
    var date = localDate();
    var tries = load(date);
    var startedAt = 0;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'red-button';
    var count = document.createElement('p');
    count.className = 'red-count';
    var feedback = document.createElement('p');
    feedback.className = 'red-feedback';
    feedback.setAttribute('role', 'status');
    var list = document.createElement('ol');
    list.className = 'red-tries';

    function save() {
      localStorage.setItem(STORAGE_PREFIX + date, JSON.stringify({ tries: tries }));
    }

    function secondsFrom(start) {
      return (performance.now() - start) / 1000;
    }

    function offText(value) {
      var off = Math.abs(value - TARGET);
      if (off < 0.005) return 'Right on it.';
      var text = off.toFixed(2) + (value < TARGET ? ' early' : ' late');
      if (off < CLOSE) return text + '. Right on it.';
      return text + '.';
    }

    function closest() {
      var best = null;
      tries.forEach(function (value) {
        var off = Math.abs(value - TARGET);
        if (best === null || off < best) best = off;
      });
      return best;
    }

    function render() {
      var running = !!startedAt;
      var done = tries.length >= TRIES;
      var best = closest();
      var last = tries.length ? tries[tries.length - 1] : null;
      button.classList.toggle('is-running', running);
      button.disabled = done;
      if (done) {
        button.textContent = 'Done';
        button.setAttribute('aria-label', 'No tries left today');
      } else if (running) {
        button.textContent = '';
        button.setAttribute('aria-label', 'Press on 10 seconds');
      } else {
        button.textContent = 'Start';
        button.setAttribute('aria-label', 'Start the clock');
      }
      count.textContent = done ? 'Six tries used' : 'Try ' + (tries.length + 1) + ' of ' + TRIES;
      if (running) {
        feedback.textContent = 'Press on 10.';
        feedback.className = 'red-feedback';
      } else if (done && best !== null) {
        feedback.textContent = best < CLOSE
          ? 'Right on it. That’s today’s Red Button.'
          : 'Closest was ' + best.toFixed(2) + ' off.';
        feedback.className = 'red-feedback' + (best < CLOSE ? ' is-right' : '');
      } else if (last !== null) {
        feedback.textContent = last.toFixed(2) + ' seconds. ' + offText(last);
        feedback.className = 'red-feedback' + (Math.abs(last - TARGET) < CLOSE ? ' is-right' : '');
      } else {
        feedback.textContent = '';
        feedback.className = 'red-feedback';
      }
      list.innerHTML = '';
      tries.forEach(function (value, index) {
        var item = document.createElement('li');
        var off = Math.abs(value - TARGET);
        if (best !== null && Math.abs(off - best) < 0.0005) item.className = 'is-best';
        item.textContent = value.toFixed(2) + ' seconds. ' + offText(value);
        item.setAttribute('aria-label', 'Try ' + (index + 1) + ', ' + item.textContent);
        list.appendChild(item);
      });
    }

    function freshDay() {
      var next = localDate();
      if (next === date) return false;
      date = next;
      tries = load(date);
      startedAt = 0;
      var dateEl = document.getElementById('button-date');
      if (dateEl) dateEl.textContent = date;
      return true;
    }

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && freshDay()) render();
    });
    window.setInterval(function () {
      if (freshDay()) render();
    }, 30000);

    button.addEventListener('click', function () {
      if (freshDay()) {
        render();
        return;
      }
      if (tries.length >= TRIES) return;
      if (!startedAt) {
        startedAt = performance.now();
        feedback.textContent = '';
        feedback.className = 'red-feedback';
        render();
        return;
      }
      var value = secondsFrom(startedAt);
      if (value < 0.4) return;
      startedAt = 0;
      tries.push(value);
      save();
      render();
      if (Math.abs(value - TARGET) < CLOSE && window.puzzleCelebrate) window.puzzleCelebrate(button);
    });

    root.innerHTML = '';
    root.appendChild(button);
    root.appendChild(count);
    root.appendChild(feedback);
    root.appendChild(list);
    render();
  }

  function boot() {
    var root = document.getElementById('button-root');
    if (!root) return;
    var dateEl = document.getElementById('button-date');
    if (dateEl) dateEl.textContent = localDate();
    mount(root);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
