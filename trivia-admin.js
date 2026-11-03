(function () {
  var statusEl = document.getElementById('trivia-admin-status');
  var loginForm = document.getElementById('trivia-login');
  var editor = document.getElementById('trivia-editor');
  var statsEl = document.getElementById('trivia-bank-stats');
  var listEl = document.getElementById('trivia-bank-list');
  var pasteEl = document.getElementById('trivia-paste');
  var pasteForm = document.getElementById('trivia-paste-form');
  var fileInput = document.getElementById('trivia-file');
  var searchEl = document.getElementById('trivia-search');
  var addButton = document.getElementById('trivia-add');
  var sb = null;
  var busy = false;
  var LETTERS = ['A', 'B', 'C', 'D'];
  var CHUNK = 400;

  function localDate() {
    if (window.ID_LOCAL_DATE) return window.ID_LOCAL_DATE();
    var now = new Date();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    return now.getFullYear() + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
  }

  function shiftMonths(iso, months) {
    var parts = iso.split('-').map(Number);
    var index = parts[1] - 1 + months;
    var year = parts[0] + Math.floor(index / 12);
    var month = ((index % 12) + 12) % 12;
    var lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    var day = Math.min(parts[2], lastDay);
    function pad(n) { return n < 10 ? '0' + n : String(n); }
    return year + '-' + pad(month + 1) + '-' + pad(day);
  }

  function normPrompt(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
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

  function parseBank(text) {
    var lines = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    var questions = [];
    var errors = [];
    var current = null;

    function finish() {
      if (!current) return;
      var missing = [];
      if (!current.prompt) missing.push('the question');
      LETTERS.forEach(function (letter) {
        if (!current.choices[letter]) missing.push(letter);
      });
      if (!current.answer) missing.push('the answer');
      if (missing.length) {
        errors.push('Question ' + (current.number || '?') + ' is missing ' + missing.join(', ') + '.');
      } else {
        questions.push({
          prompt: current.prompt.trim().replace(/\s+/g, ' '),
          choices: LETTERS.map(function (letter) { return current.choices[letter]; }),
          correct_index: LETTERS.indexOf(current.answer)
        });
      }
      current = null;
    }

    lines.forEach(function (raw, index) {
      var line = raw.trim();
      if (!line) return;
      var numbered = line.match(/^(\d+)\s*[\.\)]\s*(.+)$/);
      var choice = line.match(/^([A-D])\s*[\)\.\:]\s*(.+)$/i);
      var answer = line.match(/^answer\s*:\s*([A-D])\b/i);
      if (numbered) {
        finish();
        current = { number: numbered[1], prompt: numbered[2].trim(), choices: {}, answer: '' };
        return;
      }
      if (!current) {
        errors.push('Line ' + (index + 1) + ' is outside a numbered question.');
        return;
      }
      if (choice && !current.answer) {
        current.choices[choice[1].toUpperCase()] = choice[2].trim();
        return;
      }
      if (answer) {
        current.answer = answer[1].toUpperCase();
        return;
      }
      if (!current.choices.A && !current.choices.B && !current.choices.C && !current.choices.D) {
        current.prompt += ' ' + line;
        return;
      }
      errors.push('Line ' + (index + 1) + ' was not understood.');
    });
    finish();
    return { questions: questions, errors: errors };
  }

  function showLogin() {
    loginForm.hidden = false;
    editor.hidden = true;
  }

  function showEditor() {
    loginForm.hidden = true;
    editor.hidden = false;
  }

  function latestServe(serves) {
    var dates = (serves || []).map(function (row) { return row.play_date; }).filter(Boolean).sort();
    return dates.length ? dates[dates.length - 1] : '';
  }

  function renderStats(stats) {
    var total = stats.total || 0;
    var ready = stats.ready || 0;
    var servedToday = stats.served_today || 0;
    if (!total) {
      statsEl.textContent = 'Nothing in the bank yet.';
      return;
    }
    if (servedToday === 10) {
      statsEl.textContent = total + ' in the bank. ' + ready + ' still available. Today’s 10 are already locked in.';
    } else if (ready < 10) {
      statsEl.textContent = total + ' in the bank. ' + ready + ' ready for a draw. A day needs 10 that have not been used in the last 12 months.';
    } else {
      statsEl.textContent = total + ' in the bank. ' + ready + ' ready for a draw. The first visit to today’s trivia locks in 10 of them.';
    }
  }

  function renderBank(rows, searching) {
    var today = localDate(new Date());
    var cutoff = shiftMonths(today, -12);
    listEl.innerHTML = '';

    if (!rows.length) {
      var empty = document.createElement('p');
      empty.className = 'trivia-status';
      empty.textContent = searching ? 'No questions match that search.' : 'Nothing to show yet.';
      listEl.appendChild(empty);
      return;
    }

    var note = document.createElement('p');
    note.className = 'trivia-bank-note';
    note.textContent = searching ? 'Up to 30 matches.' : 'Latest 30 questions.';
    listEl.appendChild(note);

    var list = document.createElement('ul');
    list.className = 'trivia-bank-list';
    rows.forEach(function (row) {
      var used = latestServe(row.trivia_serves);
      var item = document.createElement('li');
      item.className = 'trivia-bank-item';
      var prompt = document.createElement('p');
      prompt.className = 'trivia-bank-prompt';
      prompt.textContent = row.prompt;
      var answer = document.createElement('p');
      answer.className = 'trivia-bank-meta';
      var letter = LETTERS[row.correct_index] || '?';
      var label = (row.choices && row.choices[row.correct_index]) || '';
      answer.textContent = 'Answer: ' + letter + (label ? ' — ' + label : '');
      var state = document.createElement('p');
      state.className = 'trivia-bank-meta';
      if (used && used > cutoff) {
        var back = shiftMonths(used, 12);
        state.textContent = used === today
          ? 'In today’s quiz. Back in the draw on ' + back + '.'
          : 'Resting until ' + back + '.';
      } else {
        state.textContent = 'Ready for the draw.';
      }
      item.appendChild(prompt);
      item.appendChild(answer);
      item.appendChild(state);
      if (!used) {
        var remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'btn-secondary trivia-bank-remove';
        remove.textContent = 'Remove';
        remove.addEventListener('click', function () { removeQuestion(row.id); });
        item.appendChild(remove);
      }
      list.appendChild(item);
    });
    listEl.appendChild(list);
  }

  function explain(error) {
    var message = error && error.message ? error.message : 'Could not reach the bank.';
    if (/could not find the function/i.test(message) || /schema cache/i.test(message) || /prompt_key/i.test(message)) {
      return 'Run the updated supabase/trivia.sql in the Supabase SQL editor, then try again.';
    }
    return message;
  }

  function errorNote(errors) {
    if (!errors.length) return '';
    var shown = errors.slice(0, 3).join(' ');
    if (errors.length > 3) shown += ' ' + (errors.length - 3) + ' more questions were skipped.';
    return shown;
  }

  async function loadBank(keepStatus) {
    if (!keepStatus) setStatus('Loading the bank…');
    var stats = await sb.rpc('trivia_bank_stats');
    if (stats.error) {
      setStatus(explain(stats.error), true);
      statsEl.textContent = '';
      listEl.innerHTML = '';
      return;
    }
    renderStats(stats.data || {});

    var term = (searchEl.value || '').replace(/[%_*]/g, '').trim();
    var query = sb
      .from('trivia_bank')
      .select('id, prompt, choices, correct_index, created_at, trivia_serves(play_date)')
      .order('created_at', { ascending: false })
      .limit(30);
    if (term) query = query.ilike('prompt', '%' + term + '%');
    var result = await query;
    if (result.error) {
      setStatus(explain(result.error), true);
      listEl.innerHTML = '';
      return;
    }
    renderBank(result.data || [], !!term);
    if (!keepStatus) setStatus('');
  }

  async function uploadQuestions(questions, repeats, problems, clearPaste) {
    var added = 0;
    var skipped = 0;
    var i;
    busy = true;
    addButton.disabled = true;
    for (i = 0; i < questions.length; i += CHUNK) {
      var slice = questions.slice(i, i + CHUNK);
      setStatus('Adding ' + Math.min(i + slice.length, questions.length) + ' of ' + questions.length + '…');
      var result = await sb.rpc('add_trivia_questions', { payload: slice });
      if (result.error) {
        busy = false;
        addButton.disabled = false;
        var soFar = added ? 'Added ' + added + ' before stopping. You can try the file again; questions already saved will be skipped. ' : '';
        setStatus(soFar + explain(result.error), true);
        loadBank(true);
        return;
      }
      var data = result.data || {};
      added += data.added || 0;
      skipped += data.skipped || 0;
    }
    busy = false;
    addButton.disabled = false;
    if (clearPaste) pasteEl.value = '';
    var note = 'Added ' + added + (added === 1 ? ' question.' : ' questions.');
    if (repeats) note += ' Ignored ' + repeats + ' repeated in the file.';
    if (skipped) note += ' Skipped ' + skipped + ' already in the bank or repeated in a batch.';
    if (problems.length) note += ' ' + errorNote(problems);
    setStatus(note, problems.length > 0 && added === 0);
    loadBank(true);
  }

  async function ingest(text, clearPaste) {
    if (busy) return;
    if (!String(text || '').trim()) {
      setStatus('Paste at least one question, or choose a text file.', true);
      return;
    }
    var parsed = parseBank(text);
    if (!parsed.questions.length) {
      setStatus(errorNote(parsed.errors) || 'No questions found. Keep the numbered question, A) to D), and Answer: letter shape.', true);
      return;
    }
    var seen = {};
    var unique = [];
    parsed.questions.forEach(function (question) {
      var key = normPrompt(question.prompt);
      if (seen[key]) return;
      seen[key] = true;
      unique.push(question);
    });
    var repeats = parsed.questions.length - unique.length;
    await uploadQuestions(unique, repeats, parsed.errors, clearPaste);
  }

  async function addQuestions(event) {
    event.preventDefault();
    await ingest(pasteEl.value, true);
  }

  async function removeQuestion(id) {
    var removed = await sb.from('trivia_bank').delete().eq('id', id);
    if (removed.error) {
      setStatus('That question has been used, so it stays on record for the 12-month gap.', true);
      return;
    }
    setStatus('Removed from the bank.');
    loadBank(true);
  }

  async function boot() {
    sb = client();
    if (!sb) {
      setStatus('Add the Supabase URL and anon key in supabase-config.js before signing in.', true);
      return;
    }
    pasteForm.addEventListener('submit', addQuestions);
    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        fileInput.value = '';
        ingest(String(reader.result || ''), false);
      };
      reader.onerror = function () {
        fileInput.value = '';
        setStatus('Could not read that file.', true);
      };
      setStatus('Reading ' + file.name + '…');
      reader.readAsText(file);
    });
    searchEl.addEventListener('input', function () {
      clearTimeout(searchEl._timer);
      searchEl._timer = setTimeout(function () { loadBank(true); }, 250);
    });
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
      loadBank();
    });

    var session = await sb.auth.getSession();
    if (session.data && session.data.session) {
      showEditor();
      loadBank();
    } else {
      showLogin();
      setStatus('Sign in with the user created in Supabase. Public sign-up should stay off.');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
