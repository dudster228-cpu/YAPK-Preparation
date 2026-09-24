// Shared glossary corrections. The server is authoritative; visitors can read, only the owner can write.
let ypkCanEditTranslations=false;
let ypkTranslationsAvailable=true;
function ypkGlossaryWord(unit,term){return units[unit]?.words.find(w=>w.en===term)}
function ypkApplyTranslation(unit,term,ru){const word=ypkGlossaryWord(unit,term);if(word)word.ru=ru}
function ypkRefreshTranslations(){renderList($("search").value);renderPanel()}

fetch("/api/translations",{cache:"no-store"}).then(async response=>{
  if(!response.ok)throw new Error("translations unavailable");
  const data=await response.json();
  ypkCanEditTranslations=Boolean(data.canEdit);
  (data.translations||[]).forEach(row=>ypkApplyTranslation(row.unit,row.term,row.ru));
  ypkRefreshTranslations();
}).catch(()=>{ypkTranslationsAvailable=false});

function ypkEditTranslation(unit,term){
  const word=ypkGlossaryWord(unit,term);if(!word)return;
  document.querySelector("#translationEdit")?.remove();
  const panel=$("panel"),bar=panel.querySelector(".study-tools");
  const box=document.createElement("div");box.id="translationEdit";box.className="translation-edit";
  if(!ypkTranslationsAvailable){box.innerHTML="<b>Исправления временно недоступны.</b>"}
  else if(!ypkCanEditTranslations){box.innerHTML='<b>Общий перевод может менять владелец сайта.</b><p>Войдите в ChatGPT как владелец, затем вернитесь к слову.</p><a class="study-tool" href="/signin-with-chatgpt?return_to=%2F" target="_top">Войти для правки</a>'}
  else{
    box.innerHTML=`<form id="translationForm"><label for="translationInput">Исправить перевод: <b>${esc(word.en)}</b></label><textarea id="translationInput" maxlength="180" rows="2" required>${esc(word.ru)}</textarea><div class="translation-edit-actions"><button class="primary" type="submit">Сохранить для всех</button><button class="secondary" id="translationCancel" type="button">Отмена</button></div><p id="translationStatus" role="status"></p></form>`;
    box.querySelector("#translationCancel").onclick=()=>box.remove();
    box.querySelector("form").onsubmit=async event=>{
      event.preventDefault();const input=box.querySelector("#translationInput"),ru=input.value.trim(),status=box.querySelector("#translationStatus"),button=box.querySelector('button[type="submit"]');
      if(!ru)return;button.disabled=true;status.textContent="Сохраняем…";
      try{
        const response=await fetch("/api/translations",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({unit,term,ru})});
        const data=await response.json();if(!response.ok)throw new Error(data.error||"Не удалось сохранить перевод.");
        ypkApplyTranslation(unit,term,data.ru);box.remove();ypkRefreshTranslations();
      }catch(error){status.textContent=error.message;button.disabled=false}
    };
  }
  bar?bar.before(box):panel.append(box);
  box.querySelector("textarea")?.focus();
}

const ypkPreviousEnsureToolsForTranslations=ypkEnsureTools;
ypkEnsureTools=function(){
  ypkPreviousEnsureToolsForTranslations();
  if(!["cards","quiz","type","test","lightning"].includes(state.mode))return;
  const bar=$("panel").querySelector(".study-tools");if(!bar||bar.querySelector("#editTranslation"))return;
  const word=ypkCurrentWord();if(!ypkGlossaryWord(state.unit,word.en))return;
  const button=document.createElement("button");button.type="button";button.className="study-tool edit-translation-button";button.id="editTranslation";button.textContent="✎ Исправить";
  $("revealTranslation")?.after(button);
  button.onclick=()=>ypkEditTranslation(state.unit,word.en);
};

const ypkPreviousRenderListForTranslations=renderList;
renderList=function(q=""){
  ypkPreviousRenderListForTranslations(q);
  $("list").querySelectorAll(".word").forEach(card=>{
    const term=card.querySelector("b")?.textContent;if(!term)return;
    const button=document.createElement("button");button.type="button";button.className="word-edit";button.title=`Исправить перевод: ${term}`;button.setAttribute("aria-label",button.title);button.textContent="✎";
    button.onclick=()=>ypkEditTranslation(state.unit,term);card.append(button);
  });
};
renderList($("search").value);ypkEnsureTools();
