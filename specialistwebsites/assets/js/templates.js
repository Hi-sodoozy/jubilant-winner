/**
 * Template previews — bundled under /gallery/ (paths relative to templates/index.html)
 */
(function () {
  var TEMPLATES = [
    { id: 1, folder: "Template 1", label: "Template 1", name: "Classic clinical", blurb: "Navy, structured — GP Melbourne" },
    { id: 2, folder: "Template 2", label: "Template 2", name: "Warm organic", blurb: "Sage curves — paediatrics Brisbane" },
    { id: 3, folder: "Template 3", label: "Template 3", name: "Night clinic", blurb: "Dark, modern — cardiology Sydney" },
    { id: 4, folder: "Template 4", label: "Template 4", name: "Friendly bright", blurb: "Coral accents — women’s health Perth" },
    { id: 5, folder: "Template 5", label: "Template 5", name: "Editorial print", blurb: "Broadsheet — orthopaedics Hobart" },
    { id: 6, folder: "Template 6", label: "Template 6", name: "Glass calm", blurb: "Lavender glass — dermatology Adelaide" },
    { id: 7, folder: "Template 7", label: "Template 7", name: "Swiss clarity", blurb: "Bold type — after-hours Canberra" },
    { id: 8, folder: "Template 8", label: "Template 8", name: "Coastal fresh", blurb: "Aqua waves — ophthalmology Gold Coast" },
    { id: 9, folder: "Template 9", label: "Template 9", name: "Art deco", blurb: "Gold & midnight — psychiatry Melbourne" },
    { id: 10, folder: "Template 10", label: "Template 10", name: "Bold blocks", blurb: "High energy — sport medicine Sydney" },
    { id: 11, folder: "Template 11", label: "Template 11", name: "Horizon split", blurb: "Slate & copper — gastroenterology Geelong" },
    { id: 12, folder: "Template 12", label: "Template 12", name: "Soft care", blurb: "Mauve gentle — geriatrics Adelaide" },
    { id: 13, folder: "Template 13", label: "Template 13", name: "Minimal zen", blurb: "Spacious type — GP Darwin" },
    { id: 14, folder: "Template 14", label: "Template 14", name: "Outback retro", blurb: "Warm stripes — rural GP Broken Hill" },
    { id: 15, folder: "Template 15", label: "Template 15", name: "Bento dashboard", blurb: "Modular tiles — endocrinology Sydney" }
  ];

  var listEl = document.getElementById("template-list");
  var selectEl = document.getElementById("template-select");
  var frameEl = document.getElementById("template-frame");
  var titleEl = document.getElementById("preview-title");
  var openBtn = document.getElementById("open-tab");
  var reloadBtn = document.getElementById("reload-frame");

  if (!listEl || !frameEl || !titleEl) return;

  function basePath(t) {
    return "../gallery/" + encodeURI(t.folder) + "/index.html";
  }

  function selectTemplate(t) {
    frameEl.src = basePath(t);
    titleEl.textContent = t.label + " — " + t.name;
    if (openBtn) openBtn.href = basePath(t);

    var buttons = listEl.querySelectorAll("button");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute("aria-selected", buttons[i].dataset.id === String(t.id) ? "true" : "false");
    }
    if (selectEl) selectEl.value = String(t.id);
  }

  TEMPLATES.forEach(function (t) {
    var li = document.createElement("li");
    var btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.id = String(t.id);
    btn.innerHTML =
      '<span class="t-name">' +
      t.label +
      "</span>" +
      '<span class="t-meta">' +
      t.blurb +
      "</span>";
    btn.addEventListener("click", function () {
      selectTemplate(t);
    });
    li.appendChild(btn);
    listEl.appendChild(li);

    if (selectEl) {
      var opt = document.createElement("option");
      opt.value = String(t.id);
      opt.textContent = t.label + ": " + t.name;
      selectEl.appendChild(opt);
    }
  });

  if (selectEl) {
    selectEl.addEventListener("change", function () {
      var id = parseInt(selectEl.value, 10);
      var found = TEMPLATES.filter(function (x) {
        return x.id === id;
      })[0];
      if (found) selectTemplate(found);
    });
  }

  if (reloadBtn) {
    reloadBtn.addEventListener("click", function () {
      try {
        frameEl.contentWindow.location.reload();
      } catch (e) {
        frameEl.src = frameEl.src;
      }
    });
  }

  selectTemplate(TEMPLATES[0]);
})();
