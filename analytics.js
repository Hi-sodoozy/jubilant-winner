(function () {
  var KEY = 'iain-browser';

  function day() {
    if (window.ID_LOCAL_DATE) return window.ID_LOCAL_DATE();
    var now = new Date();
    var month = now.getMonth() + 1;
    var date = now.getDate();
    return now.getFullYear() + '-' + (month < 10 ? '0' : '') + month + '-' + (date < 10 ? '0' : '') + date;
  }

  function fallbackId() {
    var bytes = new Uint8Array(16);
    var i;
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
    else {
      for (i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    }
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    var hex = [];
    for (i = 0; i < 16; i += 1) hex.push((bytes[i] + 256).toString(16).slice(1));
    return hex.slice(0, 4).join('') + '-' + hex.slice(4, 6).join('') + '-' + hex.slice(6, 8).join('') + '-' + hex.slice(8, 10).join('') + '-' + hex.slice(10, 16).join('');
  }

  function browserId() {
    try {
      var existing = localStorage.getItem(KEY) || '';
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(existing)) return existing;
      var next = window.crypto && crypto.randomUUID ? crypto.randomUUID() : fallbackId();
      localStorage.setItem(KEY, next);
      return next;
    } catch (e) {
      return '';
    }
  }

  function client() {
    var url = window.ID_SUPABASE_URL || '';
    var key = window.ID_SUPABASE_ANON_KEY || '';
    if (!url || !key || url.indexOf('YOUR_') === 0 || key.indexOf('YOUR_') === 0) return null;
    if (!window.supabase || !window.supabase.createClient) return null;
    return window.supabase.createClient(url, key);
  }

  var played = {};

  function send(name, args, mark) {
    try {
      if (mark && localStorage.getItem(mark)) return;
    } catch (e) {
      return;
    }
    var sb = client();
    var id = browserId();
    if (!sb || !id) return;
    args.browser = id;
    args.on_date = day();
    sb.rpc(name, args).then(function (result) {
      if (result.error || !mark) return;
      try { localStorage.setItem(mark, '1'); } catch (e) { /* keep playing */ }
    });
  }

  window.ID_VISIT = function () {
    send('record_visit', {}, 'iain-visit:' + day());
  };

  window.ID_PLAY = function (game) {
    if (!game || played[game]) return;
    played[game] = true;
    send('record_play', { game_name: game }, '');
  };

  window.ID_VISIT();
})();
