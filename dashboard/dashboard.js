(function() {
  var AUTH_KEY = 'enerval_dashboard_auth';
  var CLIENTS_KEY = 'enerval_dashboard_clients';
  var ASSESSMENT_KEY = 'enerval_dashboard_assessment';
  var CLIENTS_MAX_KEY = 'enerval_dashboard_clients_max';
  var ASSESSMENT_MAX_KEY = 'enerval_dashboard_assessment_max';
  var PASSWORD = 'enerval';
  var ABSOLUTE_MAX = 500;
  var DEFAULT_MAX = 10;

  var gate = document.getElementById('dashboardGate');
  var content = document.getElementById('dashboardContent');
  var form = document.getElementById('gateForm');
  var input = document.getElementById('dashboardPassword');
  var errorEl = document.getElementById('gateError');

  function isAuthenticated() { return sessionStorage.getItem(AUTH_KEY) === '1'; }
  function setAuthenticated(ok) { if (ok) sessionStorage.setItem(AUTH_KEY, '1'); else sessionStorage.removeItem(AUTH_KEY); }
  function showGate() { gate.hidden = false; content.hidden = true; }
  function showDashboard() { gate.hidden = true; content.hidden = false; errorEl.textContent = ''; input.value = ''; initMetrics(); }

  if (isAuthenticated()) showDashboard(); else showGate();

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    if (input.value.trim() === PASSWORD) { setAuthenticated(true); showDashboard(); }
    else { errorEl.textContent = 'Incorrect password. Try again.'; input.focus(); }
  });

  document.getElementById('logoutBtn').addEventListener('click', function() { setAuthenticated(false); showGate(); });

  function getStored(key, def) { var v = localStorage.getItem(key); return v !== null ? parseInt(v, 10) : def; }
  function setStored(key, val) { localStorage.setItem(key, String(val)); }
  function getMax(key, def) { var m = getStored(key, def); return Math.max(1, Math.min(ABSOLUTE_MAX, isNaN(m) ? def : m)); }

  function initMetrics() {
    var clientsValEl = document.getElementById('clientsValue');
    var assessmentValEl = document.getElementById('assessmentValue');
    var clientsEditRow = document.getElementById('clientsEditRow');
    var assessmentEditRow = document.getElementById('assessmentEditRow');
    var clientsMaxInput = document.getElementById('clientsMaxInput');
    var assessmentMaxInput = document.getElementById('assessmentMaxInput');

    function render() {
      var cMax = getMax(CLIENTS_MAX_KEY, DEFAULT_MAX);
      var aMax = getMax(ASSESSMENT_MAX_KEY, DEFAULT_MAX);
      var c = getStored(CLIENTS_KEY, 0);
      var a = getStored(ASSESSMENT_KEY, 0);
      if (c > cMax) { setStored(CLIENTS_KEY, cMax); c = cMax; }
      if (a > aMax) { setStored(ASSESSMENT_KEY, aMax); a = aMax; }
      clientsValEl.textContent = c + '/' + cMax;
      assessmentValEl.textContent = a + '/' + aMax;
      clientsMaxInput.value = cMax;
      assessmentMaxInput.value = aMax;
    }

    function adjust(key, maxKey, delta) {
      var maxVal = getMax(maxKey, DEFAULT_MAX);
      var n = getStored(key, 0) + delta;
      n = Math.max(0, Math.min(maxVal, n));
      setStored(key, n);
      render();
    }

    function saveMax(maxKey, inputEl, editRow) {
      var v = parseInt(inputEl.value, 10);
      if (isNaN(v) || v < 1 || v > ABSOLUTE_MAX) { inputEl.focus(); return; }
      setStored(maxKey, v);
      var valKey = maxKey === CLIENTS_MAX_KEY ? CLIENTS_KEY : ASSESSMENT_KEY;
      if (getStored(valKey, 0) > v) setStored(valKey, v);
      editRow.classList.add('dashboard-metric-edit-row-hidden');
      render();
    }

    document.getElementById('clientsUp').onclick = function() { adjust(CLIENTS_KEY, CLIENTS_MAX_KEY, 1); };
    document.getElementById('clientsDown').onclick = function() { adjust(CLIENTS_KEY, CLIENTS_MAX_KEY, -1); };
    document.getElementById('assessmentUp').onclick = function() { adjust(ASSESSMENT_KEY, ASSESSMENT_MAX_KEY, 1); };
    document.getElementById('assessmentDown').onclick = function() { adjust(ASSESSMENT_KEY, ASSESSMENT_MAX_KEY, -1); };
    document.getElementById('clientsEdit').onclick = function() { clientsEditRow.classList.remove('dashboard-metric-edit-row-hidden'); clientsMaxInput.focus(); };
    document.getElementById('assessmentEdit').onclick = function() { assessmentEditRow.classList.remove('dashboard-metric-edit-row-hidden'); assessmentMaxInput.focus(); };
    document.getElementById('clientsSave').onclick = function() { saveMax(CLIENTS_MAX_KEY, clientsMaxInput, clientsEditRow); };
    document.getElementById('assessmentSave').onclick = function() { saveMax(ASSESSMENT_MAX_KEY, assessmentMaxInput, assessmentEditRow); };
    clientsMaxInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); saveMax(CLIENTS_MAX_KEY, clientsMaxInput, clientsEditRow); } });
    assessmentMaxInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); saveMax(ASSESSMENT_MAX_KEY, assessmentMaxInput, assessmentEditRow); } });
    render();
  }
})();
