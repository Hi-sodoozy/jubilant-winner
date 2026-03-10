/**
 * Applies stored content overrides to the current page.
 * Requires: body has data-page-id="pageId", elements have data-content-id="pageId.fieldId",
 * and optionally data-content-type="html" for innerHTML.
 */
(function() {
  var STORAGE_KEY = 'iainduguid_site_content';
  var pageId = document.body && document.body.getAttribute('data-page-id');
  if (!pageId) return;
  var prefix = pageId + '.';
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    var data = JSON.parse(raw);
    for (var key in data) {
      if (data.hasOwnProperty(key) && key.indexOf(prefix) === 0) {
        var el = document.querySelector('[data-content-id="' + key + '"]');
        if (!el) continue;
        var val = data[key];
        if (val == null || val === '') continue;
        if (el.getAttribute('data-content-type') === 'html') el.innerHTML = val;
        else el.textContent = val;
      }
    }
  } catch (e) {}
})();
