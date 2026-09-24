// GitHub Pages has no write API. Corrections are saved locally and can be exported
// as translations.json for publication in the repository.
const ypkDraftKey = "ypk-pages-translation-drafts-v1";
let ypkPublishedTranslations = [];
let ypkDraftTranslations = [];

function ypkValidTranslation(row) {
  return row && /^[4-7]$/.test(String(row.unit)) &&
    typeof row.term === "string" && typeof row.ru === "string" &&
    row.ru.trim().length > 0 && row.ru.trim().length <= 180 &&
    units[String(row.unit)]?.words.some(word => word.en === row.term);
}

function ypkReadDrafts() {
  try {
    const rows = JSON.parse(localStorage.getItem(ypkDraftKey) || "[]");
    return Array.isArray(rows) ? rows.filter(ypkValidTranslation) : [];
  } catch { return []; }
}

function ypkMergedTranslations() {
  const rows = new Map();
  for (const row of [...ypkPublishedTranslations, ...ypkDraftTranslations]) {
    if (ypkValidTranslation(row)) rows.set(`${row.unit}\u0000${row.term}`, {
      unit: String(row.unit), term: row.term, ru: row.ru.trim()
    });
  }
  return [...rows.values()].sort((a,b) =>
    a.unit.localeCompare(b.unit) || a.term.localeCompare(b.term));
}

function ypkApplyTranslation(row) {
  const word = units[row.unit].words.find(item => item.en === row.term);
  if (!word) return;
  const previous = word.ru;
  word.ru = row.ru;
  for (const pair of units[row.unit].preps) {
    if (pair[2] === previous && pair[0].replace("___", pair[1]).toLowerCase() === row.term.toLowerCase()) {
      pair[2] = row.ru;
    }
  }
}

function ypkRefreshTranslations() {
  renderList($("search").value);
  renderPanel();
}

function ypkUpdateExportButton() {
  ypkExportButton.hidden = ypkDraftTranslations.length === 0;
}

ypkDraftTranslations = ypkReadDrafts();
for (const row of ypkDraftTranslations) ypkApplyTranslation(row);

fetch("translations.json", {cache:"no-store"})
  .then(response => response.ok ? response.json() : [])
  .then(rows => {
    ypkPublishedTranslations = Array.isArray(rows) ? rows.filter(ypkValidTranslation) : [];
    for (const row of ypkPublishedTranslations) ypkApplyTranslation(row);
    for (const row of ypkDraftTranslations) ypkApplyTranslation(row);
    ypkRefreshTranslations();
  })
  .catch(() => {});

const ypkExportButton = document.createElement("button");
ypkExportButton.type = "button";
ypkExportButton.className = "secondary github-export";
ypkExportButton.textContent = "Скачать исправления для GitHub";
ypkOrderControl.after(ypkExportButton);
ypkExportButton.onclick = () => {
  const content = JSON.stringify(ypkMergedTranslations(), null, 2) + "\n";
  const blob = new Blob([content], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "translations.json";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
ypkUpdateExportButton();

function ypkEditTranslation(unit, term) {
  const word = units[unit]?.words.find(item => item.en === term);
  if (!word) return;
  document.querySelector("#translationEdit")?.remove();
  const box = document.createElement("div");
  box.id = "translationEdit";
  box.className = "translation-edit";
  box.innerHTML = `<form id="translationForm"><label for="translationInput">Исправить перевод: <b>${esc(word.en)}</b></label><textarea id="translationInput" maxlength="180" rows="2" required>${esc(word.ru)}</textarea><div class="translation-edit-actions"><button class="primary" type="submit">Сохранить</button><button class="secondary" id="translationCancel" type="button">Отмена</button></div><p>Исправление сохранится в этом браузере. Чтобы его увидели все, скачайте файл исправлений и загрузите его в репозиторий GitHub.</p></form>`;
  const bar = $("panel").querySelector(".study-tools");
  bar ? bar.before(box) : $("panel").append(box);
  box.querySelector("#translationCancel").onclick = () => box.remove();
  box.querySelector("form").onsubmit = event => {
    event.preventDefault();
    const ru = box.querySelector("#translationInput").value.trim();
    if (!ru) return;
    const row = {unit, term, ru};
    ypkDraftTranslations = ypkDraftTranslations.filter(item =>
      !(item.unit === unit && item.term === term));
    ypkDraftTranslations.push(row);
    try { localStorage.setItem(ypkDraftKey, JSON.stringify(ypkDraftTranslations)); }
    catch { alert("Не удалось сохранить исправление в браузере."); return; }
    ypkApplyTranslation(row);
    ypkUpdateExportButton();
    ypkRefreshTranslations();
  };
  box.querySelector("textarea").focus();
}

const ypkPreviousEnsureToolsForTranslations = ypkEnsureTools;
ypkEnsureTools = function() {
  ypkPreviousEnsureToolsForTranslations();
  if (!["cards","quiz","type","test","lightning"].includes(state.mode)) return;
  const bar = $("panel").querySelector(".study-tools");
  if (!bar || bar.querySelector("#editTranslation")) return;
  const current = ypkCurrentWord();
  if (!units[state.unit]?.words.some(word => word.en === current.en)) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "study-tool edit-translation-button";
  button.id = "editTranslation";
  button.textContent = "✎ Исправить";
  $("revealTranslation")?.after(button);
  button.onclick = () => ypkEditTranslation(state.unit, current.en);
};

const ypkPreviousRenderListForTranslations = renderList;
renderList = function(q = "") {
  ypkPreviousRenderListForTranslations(q);
  $("list").querySelectorAll(".word").forEach(card => {
    const term = card.querySelector("b")?.textContent;
    if (!term) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "word-edit";
    button.title = `Исправить перевод: ${term}`;
    button.setAttribute("aria-label", button.title);
    button.textContent = "✎";
    button.onclick = () => ypkEditTranslation(state.unit, term);
    card.append(button);
  });
};
renderList($("search").value);
ypkEnsureTools();
