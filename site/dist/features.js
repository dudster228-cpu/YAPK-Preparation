/* Quizlet-inspired study controls: previous step, answer reveal, audio, stars and a mixed test. */
const ypkOriginalRenderPanel=renderPanel;
const ypkOriginalRenderList=renderList;
state.starred=new Set(JSON.parse(localStorage.getItem("ypk2-starred")||"[]"));
state.testItems=[];
state.testAnswers=[];

const ypkPrepRu={
"controversy ___ the value":"спор о ценности","___ the bounds of the law":"в пределах закона","bear up ___ careful scrutiny":"выдержать тщательную проверку","to be ___ large":"находиться на свободе","a mindset ___ officials":"образ мышления среди чиновников","a trade-off ___ human rights and security":"компромисс между правами человека и безопасностью","a query ___ the role":"вопрос о роли","restitution ___ the bank":"возмещение банку","scramble ___ analysis":"стремиться как можно скорее получить анализ","insight ___ priorities":"понимание приоритетов","reimburse him ___ gas":"возместить ему расходы на бензин","convert ___ new customers":"превратить в новых клиентов","align ___ the framework":"соответствовать установленным рамкам","compensation ___ loss of revenue":"компенсация за потерю дохода",
"be subject ___ regulation":"подлежать регулированию","___ the wake of the crisis":"после кризиса","shake the market ___ its core":"потрясти рынок до основания","interest ___ debts":"проценты по долгам","implications ___ consumers":"последствия для потребителей","attune ___ new risks":"приспособиться к новым рискам","pertain ___ finance":"относиться к финансам","resort ___ borrowing":"прибегнуть к заимствованию","turn a profit ___ the deal":"получить прибыль от сделки","trade ___ goods":"обменивать на товары","struggle ___ high debt loads":"бороться с высокой долговой нагрузкой","enrol ___ a university":"поступить в университет","take care ___ personal finances":"заниматься личными финансами","a hedge ___ volatility":"защита от волатильности","cater ___ customers' needs":"удовлетворять потребности клиентов",
"subscribe ___ a channel":"подписаться на канал","be inundated ___ messages":"быть заваленным сообщениями","piggyback ___ a trend":"воспользоваться существующим трендом","account ___ 60% of the workforce":"составлять 60% рабочей силы","come up ___ the right words":"подобрать правильные слова","factor ___ inflation":"учесть инфляцию","factor ___ unusual effects":"исключить необычные эффекты из расчёта","tangle ___ competitors":"вступить в противостояние с конкурентами","bid ___ a contract":"участвовать в конкурсе на контракт","contrary ___ expectations":"вопреки ожиданиям","constrained ___ limited capacity":"ограниченный недостаточными мощностями","slide ___ recession":"скатиться в рецессию","information ___ the internet":"информация в интернете","available ___ consideration":"доступный для рассмотрения","return ___ investment":"доходность инвестиций","subscribe ___ notifications":"подписаться на уведомления",
"___ response to complaints":"в ответ на жалобы","available ___ your fingertips":"доступный под рукой","sell ___ a catalogue":"продавать через каталог","purchase items ___ catalogues":"покупать товары по каталогам","expand ___ product lines":"расширяться в новые категории товаров","shop ___ home":"делать покупки из дома","attention ___ detail":"внимание к деталям","align ___ one's values":"соответствовать чьим-либо ценностям","resonate ___ customers":"находить отклик у клиентов","shrink ___ 20%":"сократиться на 20%","capitalise ___ knowledge":"извлечь выгоду из знаний","draw ___ savings":"использовать сбережения","lay the foundations ___ growth":"заложить основы роста","interaction ___ customers":"взаимодействие с клиентами","connection ___ a customer":"связь с клиентом","be ___ the core of the brand":"быть в основе бренда","earn commission ___ sales":"получать комиссию с продаж"
};

const ypkQuizMode=modes.find(x=>x[0]==="quiz");
if(ypkQuizMode)ypkQuizMode[1]="Учить";
if(!modes.some(x=>x[0]==="test"))modes.splice(3,0,["test","Тест"]);

function ypkFindWord(en){for(const u of Object.values(units)){const found=u.words.find(w=>w.en===en);if(found)return found}return null}
function ypkWrittenAnswerMatches(answer,term){
  const clean=value=>norm(String(value??"").normalize("NFKC"));
  const entered=clean(answer),expected=clean(term);
  return entered!==""&&(entered===expected||entered===expected.replace(/^(to|a|an)\s+/,""));
}
function ypkCurrentWord(){if(state.mode==="prep"&&state.prepQueue[state.i]){const p=state.prepQueue[state.i];return {en:p[0].replace("___",p[1]),ru:ypkPrepRu[p[0]]||p[2]||""}}return state.mode==="test"&&state.testItems[state.i]?.word?state.testItems[state.i].word:word()}
function ypkSaveStars(){localStorage.setItem("ypk2-starred",JSON.stringify([...state.starred]))}
function ypkSpeak(){const w=ypkCurrentWord();if(!w||!window.speechSynthesis)return;window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(w.en);utterance.lang="en-US";utterance.rate=.85;window.speechSynthesis.speak(utterance)}
function ypkToggleStar(){const w=ypkCurrentWord(),key=`${state.unit}:${w.en}`;state.starred.has(key)?state.starred.delete(key):state.starred.add(key);ypkSaveStars();const button=$("starWord");if(button){button.classList.toggle("starred",state.starred.has(key));button.textContent=state.starred.has(key)?"★ В избранном":"☆ В избранное"}renderList($("search").value)}
function ypkPrevious(){clearInterval(state.timer);if(state.i>0){state.i--;state.flip=false;if(state.mode==="test")ypkRenderTest();else if(state.mode==="prep")prep(false);else renderPanel()}else{const note=$("toolNote");if(note)note.textContent="Это первое задание в режиме"}}
function ypkReveal(){let html="";
  if(state.mode==="prep"){const pair=state.prepQueue[state.i];html=pair?`<b>Правильный предлог: ${esc(pair[1])}</b><span>${esc(pair[0].replace("___",pair[1]))}</span><small><strong>Перевод:</strong> ${esc(ypkPrepRu[pair[0]]||pair[2]||"")}</small>`:"<b>Серия завершена</b>"}
  else if(state.mode==="match"){html="<b>Подсказка</b><span>Переводы уже находятся в правой колонке. Сначала найди знакомые пары, затем исключай оставшиеся.</span>"}
  else if(state.mode==="odd"){const found=[...document.querySelectorAll("[data-odd]")].map(b=>ypkFindWord(b.dataset.odd)).filter(Boolean);html=`<b>Переводы вариантов</b>${found.map(w=>`<span>${esc(w.en)} — ${esc(w.ru)}</span>`).join("")}`}
  else{const w=ypkCurrentWord();html=`<b>${esc(w.en)}</b><span>${esc(w.ru)}</span><small>${esc(w.def)}</small>`}
  let box=$("revealBox");if(!box){box=document.createElement("div");box.id="revealBox";box.className="reveal-box";const tools=document.querySelector(".study-tools");tools?tools.before(box):$("panel").append(box)}box.innerHTML=html;
  const button=$("revealTranslation");if(button)button.textContent="Перевод показан";
}
function ypkEnsureTools(){const panel=$("panel");if(!panel||panel.querySelector(".study-tools"))return;const w=ypkCurrentWord(),key=`${state.unit}:${w.en}`,bar=document.createElement("div");bar.className="study-tools";bar.innerHTML=`<button class="study-tool" id="stepBack" ${state.i===0?"disabled":""}>← Назад</button><button class="study-tool" id="revealTranslation">Показать перевод</button><button class="study-tool" id="speakWord">🔊 Слушать</button><button class="study-tool ${state.starred.has(key)?"starred":""}" id="starWord">${state.starred.has(key)?"★ В избранном":"☆ В избранное"}</button><span class="tool-note" id="toolNote">←/→ — навигация · пробел — перевод</span>`;panel.append(bar);$("stepBack").onclick=ypkPrevious;$("revealTranslation").onclick=ypkReveal;$("speakWord").onclick=ypkSpeak;$("starWord").onclick=ypkToggleStar}

function ypkBuildTest(){state.testItems=shuffle(U().words).slice(0,10).map((w,i)=>({word:w,type:["choice","written","truefalse"][i%3],claim:i%2?w.ru:shuffle(U().words.filter(x=>x!==w))[0].ru}));state.testAnswers=[];state.i=0}
function ypkAnswerTest(value){const item=state.testItems[state.i];if(!item||state.testAnswers[state.i])return;let ok=false,label=value;if(item.type==="choice")ok=value===item.word.en;if(item.type==="written")ok=ypkWrittenAnswerMatches(value,item.word.en);if(item.type==="truefalse")ok=(value==="true")===(item.claim===item.word.ru);state.testAnswers[state.i]={ok,label};if(ok)learn(item.word.en);ypkRenderTest()}
function ypkRenderTest(){if(!state.testItems.length)ypkBuildTest();if(state.i>=state.testItems.length){const score=state.testAnswers.filter(x=>x&&x.ok).length;$("panel").innerHTML=`<div class="eyebrow">Тест завершён</div><div class="game-score">${score}/10</div><p class="definition">${score>=8?"Отличный результат. Повтори ошибки и попробуй ещё раз.":"Открой ошибки ниже и повтори определения."}</p><div class="test-review">${state.testItems.map((x,i)=>`<div class="test-row ${state.testAnswers[i]?.ok?"ok":"bad"}"><b>${i+1}. ${esc(x.word.en)} — ${esc(x.word.ru)}</b><br><small>${esc(x.word.def)}</small></div>`).join("")}</div><div class="actions"><button class="primary" id="testAgain">Новый тест</button></div>`;$("testAgain").onclick=()=>{ypkBuildTest();ypkRenderTest()};ypkEnsureTools();return}
  const item=state.testItems[state.i],answered=state.testAnswers[state.i];let task="";
  if(item.type==="choice"){const opts=shuffle([item.word,...shuffle(U().words.filter(x=>x!==item.word)).slice(0,3)]);task=`<div class="prompt">${esc(item.word.ru)}</div><div class="choices">${opts.map(x=>`<button class="choice" data-test="${esc(x.en)}" ${answered?"disabled":""}>${esc(x.en)}</button>`).join("")}</div>`}
  if(item.type==="written")task=`<div class="prompt">${esc(item.word.ru)}</div><p class="definition">Напиши термин по-английски.</p><div class="inputrow"><input id="testInput" autocomplete="off" ${answered?"disabled":""}><button class="primary" id="testCheck" ${answered?"disabled":""}>Проверить</button></div>`;
  if(item.type==="truefalse")task=`<div class="prompt">${esc(item.word.en)} — ${esc(item.claim)}</div><p class="definition">Этот перевод верный?</p><div class="choices"><button class="choice" data-test-bool="true" ${answered?"disabled":""}>Верно</button><button class="choice" data-test-bool="false" ${answered?"disabled":""}>Неверно</button></div>`;
  $("panel").innerHTML=`<div class="eyebrow">Тест · вопрос ${state.i+1} из ${state.testItems.length}</div><div class="test-progress"><i style="width:${(state.i+1)/state.testItems.length*100}%"></i></div>${task}${answered?fb(answered.ok,item.word):'<div class="feedback">Ответь на вопрос. Перевод можно открыть кнопкой ниже.</div>'}${answered?'<div class="actions"><button class="primary" id="testNext">Следующий вопрос</button></div>':""}`;
  document.querySelectorAll("[data-test]").forEach(b=>b.onclick=()=>ypkAnswerTest(b.dataset.test));document.querySelectorAll("[data-test-bool]").forEach(b=>b.onclick=()=>ypkAnswerTest(b.dataset.testBool));if($("testCheck")){const check=()=>ypkAnswerTest($("testInput").value);$("testCheck").onclick=check;$("testInput").onkeydown=e=>{if(e.key==="Enter")check()}}if($("testNext"))$("testNext").onclick=()=>{state.i++;ypkRenderTest()};ypkEnsureTools()
}

renderPanel=function(){if(state.mode==="test")ypkRenderTest();else ypkOriginalRenderPanel();setTimeout(ypkEnsureTools,0)};
const ypkOriginalType=type;
type=function(){
  ypkOriginalType();
  const current=word(),answer=$("answer"),checkButton=$("check");
  let credited=false;
  $("feedback").textContent="Регистр букв, артикль и знаки препинания не влияют на проверку.";
  const check=()=>{
    const ok=ypkWrittenAnswerMatches(answer.value,current.en);
    const feedback=$("panel").querySelector(".feedback");
    if(feedback)feedback.outerHTML=fb(ok,current);
    if(ok&&!credited){credited=true;learn(current.en)}
  };
  checkButton.onclick=check;
  answer.onkeydown=e=>{if(e.key==="Enter")check()};
};
renderList=function(q=""){ypkOriginalRenderList(q);document.querySelectorAll("#list .word").forEach(card=>{const en=card.querySelector("b")?.textContent;if(!en)return;const key=`${state.unit}:${en}`,button=document.createElement("button");button.className="word-star";button.title="Добавить в избранное";button.textContent=state.starred.has(key)?"★":"☆";button.onclick=()=>{state.starred.has(key)?state.starred.delete(key):state.starred.add(key);ypkSaveStars();renderList($("search").value)};card.append(button)})};
const ypkObserver=new MutationObserver(()=>setTimeout(ypkEnsureTools,0));ypkObserver.observe($("panel"),{childList:true});
document.addEventListener("keydown",e=>{if(["INPUT","TEXTAREA"].includes(document.activeElement.tagName))return;if(e.key==="ArrowLeft"){e.preventDefault();ypkPrevious()}if(e.key==="ArrowRight"&&state.mode!=="match"){e.preventDefault();next()}if(e.code==="Space"){e.preventDefault();ypkReveal()}if(e.key.toLowerCase()==="s")ypkToggleStar()});
renderModes();renderList();renderPanel();
