(function () {
  var STORAGE_PREFIX = 'iain-button:';
  var TRIES = 6;
  var TARGET = 10;
  var LIMIT = 60;

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
    var clockTimer = 0;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'red-button';
    var clock = document.createElement('p');
    clock.className = 'red-clock';
    clock.setAttribute('aria-live', 'off');
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

    function clockText(seconds) {
      var capped = Math.min(Math.max(seconds, 0), LIMIT);
      if (capped >= LIMIT) return '1:00.00';
      var whole = Math.floor(capped);
      var hundredths = Math.floor((capped - whole) * 100 + 1e-6);
      if (hundredths >= 100) {
        whole += 1;
        hundredths = 0;
      }
      if (whole >= LIMIT) return '1:00.00';
      var secs = whole % 60;
      return Math.floor(whole / 60) + ':' + (secs < 10 ? '0' : '') + secs + '.' + (hundredths < 10 ? '0' : '') + hundredths;
    }

    function onTarget(value) {
      return value < LIMIT && value.toFixed(2) === TARGET.toFixed(2);
    }

    function offText(value) {
      if (value >= LIMIT) return 'Timed out.';
      if (onTarget(value)) return 'Right on it.';
      var off = Math.abs(value - TARGET);
      return off.toFixed(2) + (value < TARGET ? ' early' : ' late') + '.';
    }

    function closest() {
      var best = null;
      tries.forEach(function (value) {
        var off = Math.abs(value - TARGET);
        if (best === null || off < best) best = off;
      });
      return best;
    }

    function stopClock() {
      if (clockTimer) window.clearInterval(clockTimer);
      clockTimer = 0;
    }

    function render() {
      var running = !!startedAt;
      var done = tries.length >= TRIES;
      var best = closest();
      var last = tries.length ? tries[tries.length - 1] : null;
      button.classList.toggle('is-running', running);
      button.disabled = done;
      clock.classList.toggle('is-running', running);
      if (!running) clock.textContent = last === null ? '0:00.00' : clockText(last);
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
        var won = tries.some(onTarget);
        feedback.textContent = won
          ? 'Right on it. That’s today’s Red Button.'
          : 'Closest was ' + best.toFixed(2) + ' off.';
        feedback.className = 'red-feedback' + (won ? ' is-right' : '');
      } else if (last !== null) {
        feedback.textContent = last >= LIMIT ? '1:00. Timed out.' : last.toFixed(2) + ' seconds. ' + offText(last);
        feedback.className = 'red-feedback' + (onTarget(last) ? ' is-right' : '');
      } else {
        feedback.textContent = '';
        feedback.className = 'red-feedback';
      }
      list.innerHTML = '';
      tries.forEach(function (value, index) {
        var item = document.createElement('li');
        if (onTarget(value)) item.className = 'is-best';
        item.textContent = value >= LIMIT ? '1:00. Timed out.' : value.toFixed(2) + ' seconds. ' + offText(value);
        item.setAttribute('aria-label', 'Try ' + (index + 1) + ', ' + item.textContent);
        list.appendChild(item);
      });
    }

    function finish(value) {
      if (!startedAt) return;
      var timedOut = value >= LIMIT;
      var stored = timedOut ? LIMIT : value;
      stopClock();
      startedAt = 0;
      tries.push(stored);
      save();
      render();
      if (!timedOut && onTarget(stored) && window.puzzleCelebrate) window.puzzleCelebrate(button);
    }

    function startClock() {
      stopClock();
      clock.textContent = clockText(secondsFrom(startedAt));
      clockTimer = window.setInterval(function () {
        if (!startedAt) {
          stopClock();
          return;
        }
        var value = secondsFrom(startedAt);
        if (value >= LIMIT) finish(value);
        else clock.textContent = clockText(value);
      }, 50);
    }

    function freshDay() {
      var next = localDate();
      if (next === date) return false;
      date = next;
      tries = load(date);
      stopClock();
      startedAt = 0;
      var dateEl = document.getElementById('button-date');
      if (dateEl) dateEl.textContent = date;
      return true;
    }

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'visible') return;
      if (freshDay()) {
        render();
        return;
      }
      if (startedAt && secondsFrom(startedAt) >= LIMIT) finish(LIMIT);
    });
    window.setInterval(function () {
      if (freshDay()) {
        render();
      }
    }, 30000);

    button.addEventListener('click', function () {
      if (freshDay()) {
        render();
        return;
      }
      if (tries.length >= TRIES) return;
      if (!startedAt) {
        startedAt = performance.now();
        if (window.ID_PLAY) window.ID_PLAY('button');
        feedback.textContent = '';
        feedback.className = 'red-feedback';
        render();
        startClock();
        return;
      }
      var value = secondsFrom(startedAt);
      if (value < 0.4) return;
      finish(value);
    });

    root.innerHTML = '';
    root.appendChild(clock);
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
