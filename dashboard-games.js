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

  function setStat(name, text, compact) {
    document.querySelectorAll('[data-stat="' + name + '"]').forEach(function (el) {
      el.textContent = el.hasAttribute('data-stat-compact') ? (compact || text) : text;
    });
  }

  function showGame(name) {
    var home = document.getElementById('gameAdminHome');
    if (!home) return;
    var previous = home.getAttribute('data-open-game') || '';
    home.hidden = !!name;
    home.setAttribute('data-open-game', name || '');
    document.querySelectorAll('[data-game-panel]').forEach(function (panel) {
      panel.hidden = panel.getAttribute('data-game-panel') !== name;
    });
    var focusTarget = name
      ? document.querySelector('[data-game-panel="' + name + '"] .game-admin-back')
      : document.querySelector('[data-open="' + previous + '"]');
    if (focusTarget) focusTarget.focus();
  }

  function bindGameNav() {
    if (!document.getElementById('gameAdminHome')) return;
    document.querySelectorAll('[data-open]').forEach(function (button) {
      button.addEventListener('click', function () {
        showGame(button.getAttribute('data-open'));
      });
    });
    document.querySelectorAll('[data-game-back]').forEach(function (button) {
      button.addEventListener('click', function () {
        showGame('');
      });
    });
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

  function parseWords(text) {
    var lines = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    var words = [];
    var errors = [];
    lines.forEach(function (raw, index) {
      var line = raw.trim();
      if (!line) return;
      var parts = line.split('|');
      var left = parts.shift().replace(/^\d+\s*[\.\)]\s*/, '').trim();
      if (!/^[A-Za-z]{4,8}$/.test(left)) {
        errors.push('Line ' + (index + 1) + ' needs a word of 4 to 8 letters.');
        return;
      }
      words.push({ answer: left.toUpperCase(), hint: parts.join('|').trim() });
    });
    return { words: words, errors: errors };
  }

  function sudokuIssue(givens, solved) {
    if (!/^[0-9]{81}$/.test(givens) || !/^[1-9]{81}$/.test(solved)) return 'is not 81 digits';
    if (givens.indexOf('0') < 0) return 'has no empty squares';
    var i;
    var r;
    var c;
    var b;
    for (i = 0; i < 81; i += 1) {
      if (givens.charAt(i) !== '0' && givens.charAt(i) !== solved.charAt(i)) return 'does not match its clues';
    }
    function unique(cells) {
      var seen = {};
      var n;
      for (n = 0; n < cells.length; n += 1) {
        if (seen[cells[n]]) return false;
        seen[cells[n]] = true;
      }
      return true;
    }
    for (r = 0; r < 9; r += 1) {
      var row = [];
      for (c = 0; c < 9; c += 1) row.push(solved.charAt(r * 9 + c));
      if (!unique(row)) return 'repeats a digit in a row';
    }
    for (c = 0; c < 9; c += 1) {
      var col = [];
      for (r = 0; r < 9; r += 1) col.push(solved.charAt(r * 9 + c));
      if (!unique(col)) return 'repeats a digit in a column';
    }
    for (b = 0; b < 9; b += 1) {
      var box = [];
      for (r = 0; r < 3; r += 1) {
        for (c = 0; c < 3; c += 1) {
          box.push(solved.charAt((Math.floor(b / 3) * 3 + r) * 9 + ((b % 3) * 3 + c)));
        }
      }
      if (!unique(box)) return 'repeats a digit in a box';
    }
    return '';
  }

  function sudokuLevel(line) {
    var match = String(line || '').match(/^(?:\d+\s*[\.\)]\s*)?(easy|medium|hard)$/i);
    return match ? match[1].toLowerCase() : '';
  }

  function sudokuSection(line) {
    var word = String(line || '').replace(/^\d+\s*[\.\)]\s*/, '').replace(/:$/, '').trim().toLowerCase();
    if (/^(question|questions|clue|clues|puzzle|givens)$/.test(word)) return 'question';
    if (/^(answer|answers|solution|solved)$/.test(word)) return 'answer';
    return '';
  }

  function sudokuRows(line) {
    var body = String(line || '').replace(/^\d+[\.\)]\s*/, '');
    var digits = body.replace(/[.\-_xX*]/g, '0').replace(/[^0-9]/g, '');
    if (digits.length === 81) {
      var rows = [];
      var i;
      for (i = 0; i < 81; i += 9) rows.push(digits.slice(i, i + 9));
      return rows;
    }
    if (digits.length === 9) return [digits];
    return null;
  }

  function parseSudoku(text) {
    var lines = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    var puzzles = [];
    var errors = [];
    var question = [];
    var answer = [];
    var plain = [];
    var section = '';
    var level = '';
    var number = 1;

    function reset() {
      question = [];
      answer = [];
      plain = [];
      section = '';
      level = '';
    }

    function finish(givens, solved) {
      if (!level) {
        errors.push('Puzzle ' + number + ' needs a level: easy, medium, or hard.');
        return;
      }
      var issue = sudokuIssue(givens, solved);
      if (issue) errors.push('Puzzle ' + number + ' ' + issue + '.');
      else puzzles.push({ givens: givens, solved: solved, difficulty: level });
    }

    function close(force) {
      var labeled = question.length || answer.length || section;
      if (!labeled && !plain.length) return;
      if (labeled) {
        if (question.length === 9 && answer.length === 9) finish(question.join(''), answer.join(''));
        else if (force) errors.push('Puzzle ' + number + ' needs a question of 9 rows and an answer of 9 rows.');
        else return;
      } else if (plain.length === 18) {
        finish(plain.slice(0, 9).join(''), plain.slice(9).join(''));
      } else if (force) {
        errors.push('Puzzle ' + number + ' needs a question of 9 rows and an answer of 9 rows.');
      } else {
        return;
      }
      number += 1;
      reset();
    }

    function addRows(rows) {
      var bucket = section === 'answer' ? answer : section === 'question' ? question : plain;
      rows.forEach(function (row) { bucket.push(row); });
      if (question.length === 9 && answer.length === 9) close(false);
      else if (!section && plain.length === 18) close(false);
    }

    lines.forEach(function (raw, index) {
      var line = raw.trim();
      if (!line) {
        if (section || question.length || answer.length) {
          if (question.length === 9 && answer.length === 9) close(true);
        } else if (plain.length) {
          close(true);
        }
        return;
      }
      var nextLevel = sudokuLevel(line);
      if (nextLevel) {
        close(true);
        level = nextLevel;
        return;
      }
      var nextSection = sudokuSection(line);
      if (nextSection) {
        if (nextSection === 'answer' && !question.length && plain.length) {
          question = plain.slice();
          plain = [];
        }
        section = nextSection;
        return;
      }
      if (/^\d+\s*[\.\)]\s*$/.test(line)) return;
      var rows = sudokuRows(line);
      if (!rows) {
        errors.push('Line ' + (index + 1) + ' needs 9 digits. Use 0 or a dot for an empty square.');
        return;
      }
      addRows(rows);
    });
    close(true);
    return { puzzles: puzzles, errors: errors };
  }

  function cellAt(grid, row, col) {
    if (row < 0 || col < 0 || row >= grid.length || col >= grid[0].length) return '#';
    return grid[row].charAt(col);
  }

  function readWord(grid, row, col, stepRow, stepCol) {
    var letters = '';
    while (cellAt(grid, row, col) !== '#') {
      letters += cellAt(grid, row, col);
      row += stepRow;
      col += stepCol;
    }
    return letters;
  }

  function crosswordSlots(grid) {
    var slots = [];
    var next = 1;
    var row;
    var col;
    for (row = 0; row < grid.length; row += 1) {
      for (col = 0; col < grid[0].length; col += 1) {
        if (cellAt(grid, row, col) === '#') continue;
        var across = cellAt(grid, row, col - 1) === '#' && readWord(grid, row, col, 0, 1).length >= 2;
        var down = cellAt(grid, row - 1, col) === '#' && readWord(grid, row, col, 1, 0).length >= 2;
        if (!across && !down) continue;
        var clueNumber = next;
        next += 1;
        if (across) slots.push({ direction: 'across', number: clueNumber, row: row, col: col, answer: readWord(grid, row, col, 0, 1) });
        if (down) slots.push({ direction: 'down', number: clueNumber, row: row, col: col, answer: readWord(grid, row, col, 1, 0) });
      }
    }
    return slots;
  }

  function parseClue(line) {
    var match = line.match(/^(\d+)\s*[\.\)]\s*(.*)$/);
    if (!match) return null;
    var rest = match[2];
    var bar = rest.lastIndexOf('|');
    if (bar < 0) return { number: parseInt(match[1], 10), clue: '', answer: '' };
    return {
      number: parseInt(match[1], 10),
      clue: rest.slice(0, bar).trim().replace(/\s+/g, ' '),
      answer: rest.slice(bar + 1).replace(/[^A-Za-z]/g, '').toUpperCase()
    };
  }

  function crosswordProblem(grid, clues) {
    if (grid.length < 3) return 'needs at least 3 rows';
    var width = grid[0].length;
    var row;
    if (width < 3 || width > 21 || grid.length > 21) return 'must be between 3 and 21 squares on each side';
    for (row = 0; row < grid.length; row += 1) {
      if (grid[row].length !== width) return 'has uneven rows';
    }
    var slots = crosswordSlots(grid);
    if (!slots.length) return 'has no words';
    var given = clues.across.concat(clues.down);
    var used = {};
    var i;
    for (i = 0; i < given.length; i += 1) {
      var key = given[i].direction + ':' + given[i].number;
      if (used[key]) return 'repeats ' + given[i].direction + ' ' + given[i].number;
      used[key] = given[i];
    }
    for (i = 0; i < slots.length; i += 1) {
      var slot = slots[i];
      var clue = used[slot.direction + ':' + slot.number];
      if (!clue) return 'is missing ' + slot.direction + ' ' + slot.number;
      if (!clue.clue) return 'is missing the text for ' + slot.direction + ' ' + slot.number;
      if (clue.answer !== slot.answer) return 'has ' + slot.direction + ' ' + slot.number + ' as ' + (clue.answer || 'blank') + ' but the grid says ' + slot.answer;
      delete used[slot.direction + ':' + slot.number];
    }
    var extra = Object.keys(used);
    if (extra.length) return 'has a clue that does not match a word';
    return '';
  }

  function crosswordPayload(grid, clues) {
    var byKey = {};
    clues.across.concat(clues.down).forEach(function (clue) {
      byKey[clue.direction + ':' + clue.number] = clue;
    });
    return {
      width: grid[0].length,
      height: grid.length,
      grid: grid.join(''),
      clues: crosswordSlots(grid).map(function (slot) {
        var clue = byKey[slot.direction + ':' + slot.number];
        return {
          direction: slot.direction,
          number: slot.number,
          clue: clue.clue,
          answer: slot.answer,
          row: slot.row,
          col: slot.col
        };
      })
    };
  }

  function parseCrosswords(text) {
    var lines = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    var puzzles = [];
    var errors = [];
    var grid = [];
    var section = '';
    var clues = { across: [], down: [] };
    var active = false;
    var number = 1;

    function reset() {
      grid = [];
      section = '';
      clues = { across: [], down: [] };
      active = false;
    }

    function finish() {
      if (!active) return;
      var problem = crosswordProblem(grid, clues);
      if (problem) errors.push('Crossword ' + number + ' ' + problem + '.');
      else puzzles.push(crosswordPayload(grid, clues));
      number += 1;
      reset();
    }

    lines.forEach(function (raw, index) {
      var line = raw.trim();
      if (!line) {
        finish();
        return;
      }
      if (/^\d+\s*[\.\)]\s*$/.test(line)) {
        finish();
        active = true;
        return;
      }
      if (/^across$/i.test(line)) {
        active = true;
        section = 'across';
        return;
      }
      if (/^down$/i.test(line)) {
        active = true;
        section = 'down';
        return;
      }
      if (!section && /^[A-Za-z#]+$/.test(line)) {
        if (grid.length && line.length !== grid[0].length) {
          errors.push('Line ' + (index + 1) + ' is a different width from the row above.');
        } else {
          grid.push(line.toUpperCase());
        }
        active = true;
        return;
      }
      var clue = parseClue(line);
      if (clue && (section === 'across' || section === 'down')) {
        clue.direction = section;
        clues[section].push(clue);
        active = true;
        return;
      }
      errors.push('Line ' + (index + 1) + ' was not understood.');
      active = true;
    });
    finish();
    return { puzzles: puzzles, errors: errors };
  }

  function parseTiny(text) {
    var parsed = parseCrosswords(text);
    var puzzles = [];
    parsed.puzzles.forEach(function (puzzle) {
      if (puzzle.width !== 5 || puzzle.height !== 5) {
        parsed.errors.push('A tiny crossword must be 5 by 5.');
      } else {
        puzzles.push(puzzle);
      }
    });
    return { puzzles: puzzles, errors: parsed.errors };
  }

  function errorNote(errors) {
    if (!errors.length) return '';
    var shown = errors.slice(0, 3).join(' ');
    if (errors.length > 3) shown += ' ' + (errors.length - 3) + ' more were skipped.';
    return shown;
  }

  function explain(error, rpcName) {
    var message = error && error.message ? error.message : 'Could not reach the bank.';
    var missing = /could not find the function/i.test(message) || /schema cache/i.test(message);
    var games = /word|sudoku|crossword|tiny/i.test(rpcName || '') || /word_|sudoku_|crossword_|tiny_/i.test(message);
    if (missing && games) return 'Run supabase/games.sql in the Supabase SQL editor, then try again.';
    if (missing || /connections_bank/i.test(message) || /prompt_key/i.test(message)) {
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
    if (trivia.error) {
      setStat('trivia', '');
      setStatus('game-trivia-status', explain(trivia.error), true);
    } else {
      var data = trivia.data || {};
      setStat('trivia', (data.total || 0) + ' total · ' + (data.ready || 0) + ' ready');
    }
    if (connections.error) {
      setStat('connections', '');
      setStatus('game-conn-status', explain(connections.error, 'connections_bank_stats'), true);
    } else {
      setStat('connections', ((connections.data && connections.data.total) || 0) + ' puzzles');
    }
    await showBank('word_bank_stats', 'word', 'game-word-status');
    await showBank('sudoku_bank_stats', 'sudoku', 'game-sudoku-status');
    await showBank('crossword_bank_stats', 'crossword', 'game-cross-status');
    await showBank('tiny_crossword_bank_stats', 'tiny', 'game-tiny-status');
  }

  async function showBank(rpcName, name, statusId) {
    var db = client();
    if (!db) return;
    var result = await db.rpc(rpcName, { gate: gate() });
    if (result.error) {
      setStat(name, '');
      setStatus(statusId, explain(result.error, rpcName), true);
      return;
    }
    var data = result.data || {};
    if (data.easy && data.medium && data.hard) {
      var full = ['easy', 'medium', 'hard'].map(function (level) {
        var part = data[level] || {};
        return level.charAt(0).toUpperCase() + level.slice(1) + ': ' + (part.total || 0) + ' in the bank, ' + (part.ready || 0) + ' ready';
      }).join('. ') + '.';
      var compact = ['easy', 'medium', 'hard'].map(function (level) {
        return level.charAt(0).toUpperCase() + level.slice(1) + ' ' + ((data[level] && data[level].total) || 0);
      }).join(' · ');
      setStat(name, full, compact);
      return;
    }
    setStat(name, (data.total || 0) + ' total · ' + (data.ready || 0) + ' ready');
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
    var updated = 0;
    var skipped = 0;
    var i;
    for (i = 0; i < rows.length; i += CHUNK) {
      var slice = rows.slice(i, i + CHUNK);
      setStatus(statusId, 'Adding ' + Math.min(i + slice.length, rows.length) + ' of ' + rows.length + '…');
      var result = await db.rpc(rpcName, { payload: slice, gate: gate() });
      if (result.error) {
        busy = false;
        var soFar = added ? 'Added ' + added + ' before stopping. ' : '';
        setStatus(statusId, soFar + explain(result.error, rpcName), true);
        refreshStats();
        return;
      }
      added += (result.data && result.data.added) || 0;
      updated += (result.data && result.data.updated) || 0;
      skipped += (result.data && result.data.skipped) || 0;
    }
    busy = false;
    if (clearId) document.getElementById(clearId).value = '';
    var note = 'Added ' + added + ' ' + name + '.';
    if (updated) note += ' Moved ' + updated + ' to a new level.';
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

  function uniqueRows(rows, keyOf) {
    var seen = {};
    var unique = [];
    rows.forEach(function (row) {
      var key = keyOf(row);
      if (seen[key]) return;
      seen[key] = true;
      unique.push(row);
    });
    return unique;
  }

  async function ingestTiny(text, clear) {
    if (!String(text || '').trim()) {
      setStatus('game-tiny-status', 'Paste tiny crosswords, or choose a text file.', true);
      return;
    }
    var parsed = parseTiny(text);
    if (!parsed.puzzles.length) {
      setStatus('game-tiny-status', errorNote(parsed.errors) || 'No tiny crosswords found.', true);
      return;
    }
    var unique = uniqueRows(parsed.puzzles, function (puzzle) { return puzzle.grid; });
    await upload('tiny crosswords', unique, 'add_tiny_crosswords', 'game-tiny-status', clear ? 'game-tiny-paste' : '');
    if (parsed.errors.length) setStatus('game-tiny-status', document.getElementById('game-tiny-status').textContent + ' ' + errorNote(parsed.errors), false);
  }

  async function ingestWords(text, clear) {
    if (!String(text || '').trim()) {
      setStatus('game-word-status', 'Paste words, or choose a text file.', true);
      return;
    }
    var parsed = parseWords(text);
    if (!parsed.words.length) {
      setStatus('game-word-status', errorNote(parsed.errors) || 'No words found.', true);
      return;
    }
    var unique = uniqueRows(parsed.words, function (word) { return word.answer; });
    await upload('words', unique, 'add_words', 'game-word-status', clear ? 'game-word-paste' : '');
    if (parsed.errors.length) setStatus('game-word-status', document.getElementById('game-word-status').textContent + ' ' + errorNote(parsed.errors), false);
  }

  async function ingestSudoku(text, clear) {
    if (!String(text || '').trim()) {
      setStatus('game-sudoku-status', 'Paste sudoku puzzles, or choose a text file.', true);
      return;
    }
    var parsed = parseSudoku(text);
    if (!parsed.puzzles.length) {
      setStatus('game-sudoku-status', errorNote(parsed.errors) || 'No sudoku puzzles found.', true);
      return;
    }
    var byGrid = {};
    var order = [];
    parsed.puzzles.forEach(function (puzzle) {
      if (!byGrid[puzzle.givens]) order.push(puzzle.givens);
      byGrid[puzzle.givens] = puzzle;
    });
    var unique = order.map(function (givens) { return byGrid[givens]; });
    await upload('sudoku puzzles', unique, 'add_sudoku', 'game-sudoku-status', clear ? 'game-sudoku-paste' : '');
    if (parsed.errors.length) setStatus('game-sudoku-status', document.getElementById('game-sudoku-status').textContent + ' ' + errorNote(parsed.errors), false);
  }

  async function ingestCrosswords(text, clear) {
    if (!String(text || '').trim()) {
      setStatus('game-cross-status', 'Paste crosswords, or choose a text file.', true);
      return;
    }
    var parsed = parseCrosswords(text);
    if (!parsed.puzzles.length) {
      setStatus('game-cross-status', errorNote(parsed.errors) || 'No crosswords found.', true);
      return;
    }
    var unique = uniqueRows(parsed.puzzles, function (puzzle) { return puzzle.grid; });
    await upload('crosswords', unique, 'add_crosswords', 'game-cross-status', clear ? 'game-cross-paste' : '');
    if (parsed.errors.length) setStatus('game-cross-status', document.getElementById('game-cross-status').textContent + ' ' + errorNote(parsed.errors), false);
  }

  var FILE_STATUS = {
    'game-trivia-file': 'game-trivia-status',
    'game-conn-file': 'game-conn-status',
    'game-word-file': 'game-word-status',
    'game-sudoku-file': 'game-sudoku-status',
    'game-cross-file': 'game-cross-status',
    'game-tiny-file': 'game-tiny-status'
  };

  function bindFile(inputId, handler) {
    var input = document.getElementById(inputId);
    if (!input) return;
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
        setStatus(FILE_STATUS[inputId] || 'game-trivia-status', 'Could not read that file.', true);
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
    bindGameNav();
    document.getElementById('game-trivia-form').addEventListener('submit', function (event) {
      event.preventDefault();
      ingestTrivia(document.getElementById('game-trivia-paste').value, true);
    });
    document.getElementById('game-conn-form').addEventListener('submit', function (event) {
      event.preventDefault();
      ingestConnections(document.getElementById('game-conn-paste').value, true);
    });
    document.getElementById('game-word-form').addEventListener('submit', function (event) {
      event.preventDefault();
      ingestWords(document.getElementById('game-word-paste').value, true);
    });
    document.getElementById('game-sudoku-form').addEventListener('submit', function (event) {
      event.preventDefault();
      ingestSudoku(document.getElementById('game-sudoku-paste').value, true);
    });
    document.getElementById('game-cross-form').addEventListener('submit', function (event) {
      event.preventDefault();
      ingestCrosswords(document.getElementById('game-cross-paste').value, true);
    });
    document.getElementById('game-tiny-form').addEventListener('submit', function (event) {
      event.preventDefault();
      ingestTiny(document.getElementById('game-tiny-paste').value, true);
    });
    bindFile('game-trivia-file', ingestTrivia);
    bindFile('game-conn-file', ingestConnections);
    bindFile('game-word-file', ingestWords);
    bindFile('game-sudoku-file', ingestSudoku);
    bindFile('game-cross-file', ingestCrosswords);
    bindFile('game-tiny-file', ingestTiny);
    refreshStats();
  }

  window.startGameAdmin = start;
  var content = document.getElementById('dashboardContent');
  if (content && !content.hidden) start();
})();
