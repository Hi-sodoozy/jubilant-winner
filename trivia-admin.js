(function () {
  var statusEl = document.getElementById('trivia-admin-status');
  var loginForm = document.getElementById('trivia-login');
  var editorForm = document.getElementById('trivia-editor');
  var questionsEl = document.getElementById('trivia-questions');
  var dateInput = document.getElementById('trivia-play-date');
  var sb = null;

  function melbourneDate(date) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Australia/Melbourne',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date || new Date());
  }

  function setStatus(message, isError) {
    statusEl.textContent = message || '';
    statusEl.classList.toggle('is-wrong', !!isError);
  }

  function client() {
    var url = window.ID_SUPABASE_URL || '';
    var key = window.ID_SUPABASE_ANON_KEY || '';
    if (!url || !key || url.indexOf('YOUR_') === 0 || key.indexOf('YOUR_') === 0) return null;
    if (!window.supabase || !window.supabase.createClient) return null;
    return window.supabase.createClient(url, key);
  }

  function emptyQuestion() {
    return { prompt: '', choices: ['', '', '', ''], correct_index: 0 };
  }

  function buildEditor(questions) {
    questionsEl.innerHTML = '';
    questions.forEach(function (q, index) {
      var field = document.createElement('fieldset');
      field.className = 'trivia-admin-q';
      var legend = document.createElement('legend');
      legend.textContent = 'Question ' + (index + 1);
      field.appendChild(legend);

      var promptLabel = document.createElement('label');
      promptLabel.textContent = 'Question';
      var prompt = document.createElement('textarea');
      prompt.required = true;
      prompt.rows = 2;
      prompt.value = q.prompt || '';
      prompt.setAttribute('data-prompt', '');
      field.appendChild(promptLabel);
      field.appendChild(prompt);

      var answers = document.createElement('div');
      answers.className = 'trivia-admin-answers';
      for (var c = 0; c < 4; c += 1) {
        var row = document.createElement('div');
        row.className = 'trivia-admin-answer';
        var radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'correct-' + index;
        radio.value = String(c);
        radio.checked = q.correct_index === c;
        radio.setAttribute('aria-label', 'Correct answer ' + (c + 1));
        var input = document.createElement('input');
        input.type = 'text';
        input.required = true;
        input.placeholder = 'Answer ' + (c + 1);
        input.value = (q.choices && q.choices[c]) || '';
        input.setAttribute('data-choice', '');
        row.appendChild(radio);
        row.appendChild(input);
        answers.appendChild(row);
      }
      field.appendChild(answers);
      questionsEl.appendChild(field);
    });
  }

  function readEditor() {
    var blocks = questionsEl.querySelectorAll('.trivia-admin-q');
    var questions = [];
    blocks.forEach(function (block, index) {
      var prompt = block.querySelector('[data-prompt]').value.trim();
      var choices = [];
      block.querySelectorAll('[data-choice]').forEach(function (input) {
        choices.push(input.value.trim());
      });
      var selected = block.querySelector('input[type="radio"]:checked');
      questions.push({
        position: index + 1,
        prompt: prompt,
        choices: choices,
        correct_index: selected ? Number(selected.value) : 0
      });
    });
    return questions;
  }

  function showLogin() {
    loginForm.hidden = false;
    editorForm.hidden = true;
  }

  function showEditor() {
    loginForm.hidden = true;
    editorForm.hidden = false;
  }

  async function loadDate(date) {
    setStatus('Loading ' + date + '…');
    var result = await sb
      .from('trivia_sets')
      .select('id, play_date, trivia_questions(position, prompt, choices, correct_index)')
      .eq('play_date', date)
      .maybeSingle();
    if (result.error) {
      setStatus('Could not load that date. Run supabase/trivia.sql if the tables are missing.', true);
      buildEditor(Array.from({ length: 10 }, emptyQuestion));
      return;
    }
    if (!result.data) {
      buildEditor(Array.from({ length: 10 }, emptyQuestion));
      setStatus('No set for this date yet.');
      return;
    }
    var questions = (result.data.trivia_questions || []).slice().sort(function (a, b) {
      return a.position - b.position;
    });
    while (questions.length < 10) questions.push(emptyQuestion());
    buildEditor(questions.slice(0, 10));
    setStatus('Loaded ' + date + '. Save to publish changes.');
  }

  async function save(event) {
    event.preventDefault();
    var date = dateInput.value;
    if (!date) {
      setStatus('Pick a date.', true);
      return;
    }
    var questions = readEditor();
    var invalid = questions.some(function (q) {
      return !q.prompt || q.choices.length !== 4 || q.choices.some(function (c) { return !c; });
    });
    if (questions.length !== 10 || invalid) {
      setStatus('Each of the 10 questions needs a prompt and four answers.', true);
      return;
    }

    setStatus('Saving…');
    var upsert = await sb
      .from('trivia_sets')
      .upsert({
        play_date: date,
        published: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'play_date' })
      .select('id')
      .single();
    if (upsert.error || !upsert.data) {
      setStatus(upsert.error ? upsert.error.message : 'Could not save the set.', true);
      return;
    }

    var setId = upsert.data.id;
    var removed = await sb.from('trivia_questions').delete().eq('set_id', setId);
    if (removed.error) {
      setStatus(removed.error.message, true);
      return;
    }
    var rows = questions.map(function (q) {
      return {
        set_id: setId,
        position: q.position,
        prompt: q.prompt,
        choices: q.choices,
        correct_index: q.correct_index
      };
    });
    var inserted = await sb.from('trivia_questions').insert(rows);
    if (inserted.error) {
      setStatus(inserted.error.message, true);
      return;
    }
    setStatus('Saved ' + date + '. That day’s quiz is published.');
  }

  async function boot() {
    sb = client();
    if (!sb) {
      setStatus('Add the Supabase URL and anon key in supabase-config.js before signing in.', true);
      return;
    }
    dateInput.value = melbourneDate(new Date());
    dateInput.addEventListener('change', function () {
      if (dateInput.value) loadDate(dateInput.value);
    });
    editorForm.addEventListener('submit', save);
    document.getElementById('trivia-sign-out').addEventListener('click', async function () {
      await sb.auth.signOut();
      showLogin();
      setStatus('Signed out.');
    });
    loginForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      setStatus('Signing in…');
      var result = await sb.auth.signInWithPassword({
        email: document.getElementById('admin-email').value.trim(),
        password: document.getElementById('admin-password').value
      });
      if (result.error) {
        setStatus(result.error.message, true);
        return;
      }
      showEditor();
      loadDate(dateInput.value);
    });

    var session = await sb.auth.getSession();
    if (session.data && session.data.session) {
      showEditor();
      loadDate(dateInput.value);
    } else {
      showLogin();
      setStatus('Sign in with the user created in Supabase. Public sign-up should stay off.');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
