(function () {
  var STORAGE_PREFIX = 'iain-trivia:';

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

  function blankProgress(setId) {
    var answers = [];
    var i;
    for (i = 0; i < 10; i += 1) answers.push(null);
    return { setId: setId, index: 0, answers: answers, done: false };
  }

  function loadProgress(date, setId) {
    try {
      var raw = localStorage.getItem(STORAGE_PREFIX + date);
      if (!raw) return blankProgress(setId);
      var data = JSON.parse(raw);
      if (!data || data.setId !== setId || !Array.isArray(data.answers) || data.answers.length !== 10) {
        return blankProgress(setId);
      }
      return data;
    } catch (e) {
      return blankProgress(setId);
    }
  }

  function saveProgress(date, progress) {
    localStorage.setItem(STORAGE_PREFIX + date, JSON.stringify(progress));
  }

  function scoreOf(questions, answers) {
    var n = 0;
    questions.forEach(function (q, i) {
      if (answers[i] === q.correct_index) n += 1;
    });
    return n;
  }

  function asQuiz(data) {
    var questions = (data.questions || []).slice().sort(function (a, b) {
      return (a.position || 0) - (b.position || 0);
    });
    return {
      id: String(data.id || data.play_date || ''),
      questions: questions.map(function (q) {
        return {
          prompt: q.prompt || '',
          choices: Array.isArray(q.choices) ? q.choices.slice(0, 4) : [],
          correct_index: q.correct_index
        };
      })
    };
  }

  function status(root, message) {
    root.innerHTML = '';
    var p = document.createElement('p');
    p.className = 'trivia-status';
    p.textContent = message;
    root.appendChild(p);
  }

  function mount(root, quiz, date) {
    if (quiz.questions.length !== 10) {
      status(root, 'Today’s trivia is not ready. It needs 10 questions.');
      return;
    }
    var progress = loadProgress(date, quiz.id);

    function persist() {
      saveProgress(date, progress);
    }

    function renderScore() {
      var score = scoreOf(quiz.questions, progress.answers);
      root.innerHTML = '';
      var wrap = document.createElement('div');
      wrap.className = 'trivia-score';
      var kicker = document.createElement('p');
      kicker.className = 'trivia-count';
      kicker.textContent = 'Today’s score';
      var heading = document.createElement('h2');
      heading.className = 'trivia-score-number';
      heading.textContent = score + ' out of 10';
      var note = document.createElement('p');
      note.className = 'trivia-status';
      note.textContent = 'That’s the result for today. A new set arrives tomorrow.';
      wrap.appendChild(kicker);
      wrap.appendChild(heading);
      wrap.appendChild(note);
      root.appendChild(wrap);
    }

    function renderQuestion() {
      var i = progress.index;
      var q = quiz.questions[i];
      var picked = progress.answers[i];
      var locked = picked !== null && picked !== undefined;
      root.innerHTML = '';

      var count = document.createElement('p');
      count.className = 'trivia-count';
      count.textContent = 'Question ' + (i + 1) + ' of 10';
      var prompt = document.createElement('h2');
      prompt.className = 'trivia-prompt';
      prompt.textContent = q.prompt;
      var choices = document.createElement('div');
      choices.className = 'trivia-choices';
      choices.setAttribute('role', 'group');
      choices.setAttribute('aria-label', 'Answers');

      q.choices.forEach(function (label, choiceIndex) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'trivia-choice';
        btn.textContent = label;
        if (locked) {
          btn.disabled = true;
          if (choiceIndex === q.correct_index) btn.classList.add('is-correct');
          if (choiceIndex === picked && picked !== q.correct_index) btn.classList.add('is-wrong');
        } else {
          btn.addEventListener('click', function () {
            progress.answers[i] = choiceIndex;
            persist();
            render();
          });
        }
        choices.appendChild(btn);
      });

      root.appendChild(count);
      root.appendChild(prompt);
      root.appendChild(choices);

      if (!locked) return;

      var feedback = document.createElement('p');
      feedback.className = 'trivia-feedback';
      if (picked === q.correct_index) {
        feedback.textContent = 'Correct.';
        feedback.classList.add('is-correct');
      } else {
        feedback.textContent = 'Not this one. The answer is ' + q.choices[q.correct_index] + '.';
        feedback.classList.add('is-wrong');
      }
      var next = document.createElement('button');
      next.type = 'button';
      next.className = 'btn-primary trivia-next';
      next.textContent = i === 9 ? 'See today’s score' : 'Next question';
      next.addEventListener('click', function () {
        if (i === 9) progress.done = true;
        else progress.index = i + 1;
        persist();
        render();
      });
      root.appendChild(feedback);
      root.appendChild(next);
    }

    function render() {
      if (progress.done) renderScore();
      else renderQuestion();
    }

    render();
  }

  async function boot() {
    var root = document.getElementById('trivia-root');
    if (!root) return;
    var date = localDate(new Date());
    var dateEl = document.getElementById('trivia-date');
    if (dateEl) dateEl.textContent = date;

    var sb = client();
    if (!sb) {
      status(root, 'Trivia is not connected yet. Add the Supabase URL and anon key in supabase-config.js.');
      return;
    }

    var result = await window.ID_RPC(sb, 'draw_trivia_today');
    if (result.error) {
      status(root, 'The quiz could not be loaded. Run supabase/trivia.sql in the Supabase SQL editor.');
      return;
    }
    var data = result.data || {};
    if (data.ok !== true) return;
    mount(root, asQuiz(data), date);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
