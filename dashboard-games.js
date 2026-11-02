(function () {
  var LETTERS = ['A', 'B', 'C', 'D'];
  var CHUNK = 400;
  var started = false;
  var busy = false;
  var sb = null;

  function gate() {
    return window.ID_DASHBOARD_GATE || '';
  }

  function client() {
    if (sb) return sb;
    var url = window.ID_SUPABASE_URL || '';
    var key = window.ID_SUPABASE_ANON_KEY || '';
    if (!url || !key || url.indexOf('YOUR_') === 0 || key.indexOf('YOUR_') === 0) return null;
    if (!window.supabase || !window.supabase.createClient) return null;
    sb = window.supabase.createClient(url, key);
    return sb;
  }

  function setStatus(id, message, isError) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('is-wrong', !!isError);
  }

  function norm(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function parseTrivia(text) {
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
      if (missing.length) errors.push('Question ' + (current.number || '?') + ' is missing ' + missing.join(', ') + '.');
      else {
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

  function parseGroupLine(line) {
    var parts = line.split('|');
    if (parts.length < 2) return null;
    var theme = parts.shift().replace(/^\d+\s*[\.\)]\s*/, '').trim();
    var words = parts.join('|').split(',').map(function (word) { return word.trim(); }).filter(Boolean);
    if (!theme || words.length !== 4) return null;
    return { theme: theme, words: words };
  }

  function parseConnections(text) {
    var lines = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    var puzzles = [];
    var errors = [];
    var current = [];
    var puzzleNumber = 1;

    function close(forceError) {
      if (!current.length) return;
      if (current.length === 4) {
        var seen = {};
        var unique = true;
        current.forEach(function (group) {
          group.words.forEach(function (word) {
            var key = norm(word);
            if (seen[key]) unique = false;
            seen[key] = true;
          });
        });
        if (!unique) errors.push('Puzzle ' + puzzleNumber + ' repeats a word.');
        else puzzles.push({ groups: current.slice() });
        puzzleNumber += 1;
      } else if (forceError) {
        errors.push('Puzzle ' + puzzleNumber + ' needs 4 groups. It has ' + current.length + '.');
        puzzleNumber += 1;
      }
      current = [];
    }

    lines.forEach(function (raw, index) {
      var line = raw.trim();
      if (!line) {
        close(true);
        return;
      }
      if (!line.includes('|')) {
        errors.push('Line ' + (index + 1) + ' needs a theme, a |, and four words.');
        return;
      }
      var numbered = /^\d+\s*[\.\)]\s*/.test(line);
      if (numbered && current.length) close(true);
      var group = parseGroupLine(line);
      if (!group) {
        errors.push('Line ' + (index + 1) + ' needs four words separated by commas.');
        return;
      }
      current.push(group);
      if (current.length === 4) close(false);
    });
    close(true);
    return { puzzles: puzzles, errors: errors };
  }

  function errorNote(errors) {
    if (!errors.length) return '';
    var shown = errors.slice(0, 3).join(' ');
    if (errors.length > 3) shown += ' ' + (errors.length - 3) + ' more were skipped.';
    return shown;
  }

  function explain(error) {
    var message = error && error.message ? error.message : 'Could not reach the bank.';
    if (/could not find the function/i.test(message) || /schema cache/i.test(message) || /connections_bank/i.test(message) || /prompt_key/i.test(message)) {
      return 'Run the updated supabase/trivia.sql in the Supabase SQL editor, then try again.';
    }
    return message;
  }

  async function refreshStats() {
    var db = client();
    if (!db) {
      setStatus('game-trivia-status', 'Trivia is not connected yet.', true);
      return;
    }
    var trivia = await db.rpc('trivia_bank_stats', { gate: gate() });
    var connections = await db.rpc('connections_bank_stats', { gate: gate() });
    var triviaStats = document.getElementById('game-trivia-stats');
    var connectionStats = document.getElementById('game-conn-stats');
    if (trivia.error) {
      if (triviaStats) triviaStats.textContent = '';
      setStatus('game-trivia-status', explain(trivia.error), true);
    } else if (triviaStats) {
      var data = trivia.data || {};
      triviaStats.textContent = (data.total || 0) + ' trivia questions in the bank. ' + (data.ready || 0) + ' ready for a draw.';
    }
    if (connections.error) {
      if (connectionStats) connectionStats.textContent = '';
      setStatus('game-conn-status', explain(connections.error), true);
    } else if (connectionStats) {
      connectionStats.textContent = ((connections.data && connections.data.total) || 0) + ' Connections puzzles in the bank.';
    }
  }

  async function upload(name, rows, rpcName, statusId, clearId) {
    var db = client();
    if (!db) {
      setStatus(statusId, 'Add the Supabase URL and anon key before saving.', true);
      return;
    }
    if (busy) return;
    busy = true;
    var added = 0;
    var skipped = 0;
    var i;
    for (i = 0; i < rows.length; i += CHUNK) {
      var slice = rows.slice(i, i + CHUNK);
      setStatus(statusId, 'Adding ' + Math.min(i + slice.length, rows.length) + ' of ' + rows.length + '…');
      var result = await db.rpc(rpcName, { payload: slice, gate: gate() });
      if (result.error) {
        busy = false;
        var soFar = added ? 'Added ' + added + ' before stopping. ' : '';
        setStatus(statusId, soFar + explain(result.error), true);
        refreshStats();
        return;
      }
      added += (result.data && result.data.added) || 0;
      skipped += (result.data && result.data.skipped) || 0;
    }
    busy = false;
    if (clearId) document.getElementById(clearId).value = '';
    var note = 'Added ' + added + ' ' + name + '.';
    if (skipped) note += ' Skipped ' + skipped + ' already saved or incomplete.';
    setStatus(statusId, note);
    refreshStats();
  }

  async function ingestTrivia(text, clear) {
    if (!String(text || '').trim()) {
      setStatus('game-trivia-status', 'Paste trivia, or choose a text file.', true);
      return;
    }
    var parsed = parseTrivia(text);
    if (!parsed.questions.length) {
      setStatus('game-trivia-status', errorNote(parsed.errors) || 'No trivia questions found.', true);
      return;
    }
    var seen = {};
    var unique = [];
    parsed.questions.forEach(function (question) {
      var key = norm(question.prompt);
      if (seen[key]) return;
      seen[key] = true;
      unique.push(question);
    });
    await upload('trivia questions', unique, 'add_trivia_questions', 'game-trivia-status', clear ? 'game-trivia-paste' : '');
    if (parsed.errors.length) setStatus('game-trivia-status', document.getElementById('game-trivia-status').textContent + ' ' + errorNote(parsed.errors), false);
  }

  async function ingestConnections(text, clear) {
    if (!String(text || '').trim()) {
      setStatus('game-conn-status', 'Paste Connections puzzles, or choose a text file.', true);
      return;
    }
    var parsed = parseConnections(text);
    if (!parsed.puzzles.length) {
      setStatus('game-conn-status', errorNote(parsed.errors) || 'No Connections puzzles found.', true);
      return;
    }
    await upload('Connections puzzles', parsed.puzzles, 'add_connections_puzzles', 'game-conn-status', clear ? 'game-conn-paste' : '');
    if (parsed.errors.length) setStatus('game-conn-status', document.getElementById('game-conn-status').textContent + ' ' + errorNote(parsed.errors), false);
  }

  function bindFile(inputId, handler) {
    var input = document.getElementById(inputId);
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        input.value = '';
        handler(String(reader.result || ''), false);
      };
      reader.onerror = function () {
        input.value = '';
        setStatus(inputId === 'game-trivia-file' ? 'game-trivia-status' : 'game-conn-status', 'Could not read that file.', true);
      };
      reader.readAsText(file);
    });
  }

  function start() {
    if (started) {
      refreshStats();
      return;
    }
    started = true;
    document.getElementById('game-trivia-form').addEventListener('submit', function (event) {
      event.preventDefault();
      ingestTrivia(document.getElementById('game-trivia-paste').value, true);
    });
    document.getElementById('game-conn-form').addEventListener('submit', function (event) {
      event.preventDefault();
      ingestConnections(document.getElementById('game-conn-paste').value, true);
    });
    bindFile('game-trivia-file', ingestTrivia);
    bindFile('game-conn-file', ingestConnections);
    refreshStats();
  }

  window.startGameAdmin = start;
  var content = document.getElementById('dashboardContent');
  if (content && !content.hidden) start();
})();
