// Finite study rounds and lenient written answers for Units 4–7.
const ypkRoundModes=new Set(["cards","quiz","type","test","match","odd","lightning"]);
state.randomOrder=localStorage.getItem("ypk-random-order")==="1";
state.studyRounds={};
state.roundOffsets={};

ypkWrittenAnswerMatches=function(answer,term){
  const clean=value=>norm(String(value??"").normalize("NFKC"))
    .replace(/\b(?:sb|sth|smb|smth|somebody|someone|something|oneself)\b/g," ")
    .replace(/\bone s\b/g," ")
    .replace(/\s+/g," ").trim()
    .replace(/^(?:to|a|an)\s+/,"").trim();
  const variants=String(term).includes("with/into")?[String(term).replace("with/into","with"),String(term).replace("with/into","into")]:[term];
  return clean(answer)!==""&&variants.some(variant=>clean(answer)===clean(variant));
};

const ypkOrderControl=document.createElement("div");
ypkOrderControl.className="round-order";
ypkOrderControl.innerHTML='<button id="randomOrder" type="button"></button><span>Порядок заданий</span>';
$("modes").after(ypkOrderControl);
function ypkUpdateOrderButton(){const b=$("randomOrder");b.textContent=state.randomOrder?"Вразброс: включено":"Проходить в разброс";b.setAttribute("aria-pressed",String(state.randomOrder))}
ypkUpdateOrderButton();
$("randomOrder").onclick=()=>{
  state.randomOrder=!state.randomOrder;
  localStorage.setItem("ypk-random-order",state.randomOrder?"1":"0");
  state.studyRounds={};state.i=0;
  state.prepQueue=[];state.sentenceQueue=[];
  ypkUpdateOrderButton();
  if(state.mode==="prep")prep(true);else if(state.mode==="sentences")ypkRenderSentence();else renderPanel();
};

function ypkRoundSize(mode){return mode==="cards"?U().words.length:mode==="match"?6:15}
function ypkStartRound(mode){
  const words=U().words,size=Math.min(ypkRoundSize(mode),words.length),key=`${state.unit}:${mode}`;
  const offset=state.roundOffsets[key]||0;
  const items=state.randomOrder?shuffle(words).slice(0,size):Array.from({length:size},(_,i)=>words[(offset+i)%words.length]);
  if(!state.randomOrder)state.roundOffsets[key]=(offset+size)%words.length;
  const round={unit:state.unit,items,initialItems:[...items],index:0,answers:[],finished:false,left:null,right:null,matched:new Set(),creditedPairs:new Set(),history:[],attemptHistory:[],firstResults:new Map(),mistakes:new Map(),matchMistakes:new Set(),oddTargets:new Map(),seconds:30};
  if(mode==="match")round.rightOrder=shuffle(items.map((w,i)=>({i,ru:w.ru})));
  state.studyRounds[mode]=round;state.i=0;
  if(mode==="lightning")ypkStartLightningTimer(round);
  return round;
}
function ypkRound(mode){const r=state.studyRounds[mode];return !r||r.unit!==state.unit?ypkStartRound(mode):r}
function ypkRoundWord(){const r=ypkRound(state.mode);return r.items[Math.min(r.index,r.items.length-1)]}
function ypkAdvanceRound(mode,value,ok){
  const r=ypkRound(mode),w=r.items[r.index];if(!w||r.index>=r.items.length)return;
  r.attemptHistory.push({index:r.index,items:[...r.items],answers:[...r.answers],firstResults:new Map(r.firstResults),mistakes:new Map(r.mistakes)});
  if(!r.firstResults.has(w.en))r.firstResults.set(w.en,ok);
  r.answers[r.index]={value,ok};
  if(!ok){
    const reviewed=mode==="odd"?r.oddTargets.get(w.en)||w:w;
    r.mistakes.set(reviewed.en,{w:reviewed,value});
    r.items.push(w);
  }else if(!r.creditedPairs.has(w.en)){
    learn(w.en);r.creditedPairs.add(w.en);
  }
  r.index++;state.i=r.index;
  renderPanel();
}
function ypkUndoRound(mode){
  const r=ypkRound(mode),prior=r.attemptHistory.pop();
  if(!prior)return false;
  r.index=prior.index;r.items=prior.items;r.answers=prior.answers;
  r.firstResults=prior.firstResults;r.mistakes=prior.mistakes;
  r.finished=false;state.i=r.index;state.flip=false;renderPanel();return true;
}
function ypkRoundComplete(mode){
  const r=ypkRound(mode),total=r.initialItems.length;
  const correct=mode==="match"?total-r.matchMistakes.size:r.initialItems.filter(w=>r.firstResults.get(w.en)===true).length;
  r.finished=true;clearInterval(state.timer);
  const mistakes=mode==="match"?[...r.matchMistakes].map(i=>({w:r.items[i]})):[...r.mistakes.values()];
  const detail=mode==="match"?"Пар найдено без ошибок":mode==="lightning"?"Верно с первой попытки до конца времени":"Верно с первой попытки. Ошибки повторялись до правильного ответа";
  $("panel").innerHTML=`<div class="eyebrow">${r.timedOut?"Время вышло":"Раунд окончен"} · Unit ${state.unit}</div><div class="game-score">${correct}/${total}</div><p class="definition">${detail}. Можно начать новую серию.</p>${mistakes.length?`<div class="test-review"><b>Слова, в которых были ошибки</b>${mistakes.map(({w,value})=>`<div class="test-row bad"><b>${esc(w.en)} — ${esc(w.ru)}</b>${value?`<br><small>Ответ с ошибкой: ${esc(value)}</small>`:""}${w.def?`<br><small>${esc(w.def)}</small>`:""}</div>`).join("")}</div>`:'<div class="feedback good">Ошибок не было!</div>'}<div class="actions"><button class="primary" id="roundRestart">Начать заново</button>${mode==="match"&&r.history.length||mode!=="match"&&r.attemptHistory.length&&!r.timedOut?'<button class="secondary" id="roundBack">← К последнему заданию</button>':""}</div>`;
  $("roundRestart").onclick=()=>{ypkStartRound(mode);renderPanel()};
  if($("roundBack"))$("roundBack").onclick=()=>{if(mode==="match"){r.finished=false;r.matched.delete(r.history.pop());ypkRoundMatch()}else ypkUndoRound(mode)};
}
function ypkRoundHeader(title,r){return `<div class="eyebrow">${title} · ${Math.min(r.index+1,r.items.length)} из ${r.items.length}</div><div class="test-progress"><i style="width:${Math.round(r.index/r.items.length*100)}%"></i></div>`}

function ypkRoundCards(){
  const r=ypkRound("cards");if(r.index>=r.items.length)return ypkRoundComplete("cards");
  const w=r.items[r.index];
  $("panel").innerHTML=`${ypkRoundHeader("Карточки",r)}<div class="prompt">${esc(w.en)}</div>${state.flip?`<p class="definition">${esc(w.def)}</p><span class="translation">${esc(w.ru)}</span>`:'<p class="definition">Попробуй вспомнить перевод, затем открой карточку.</p>'}<div class="actions"><button class="primary" id="flip">${state.flip?"Скрыть ответ":"Показать объяснение и перевод"}</button>${state.flip?'<button class="secondary" id="yes">Знаю</button><button class="secondary danger" id="no">Повторить позже</button>':""}</div>`;
  $("flip").onclick=()=>{state.flip=!state.flip;ypkRoundCards()};
  if(state.flip){$("yes").onclick=()=>{state.flip=false;ypkAdvanceRound("cards","Знаю",true)};$("no").onclick=()=>{state.flip=false;ypkAdvanceRound("cards","Повторить",false)}}
}
function ypkRoundChoice(mode,title,prompt,opts,correct){
  const r=ypkRound(mode);if(r.index>=r.items.length)return ypkRoundComplete(mode);
  const old=r.answers[r.index];
  $("panel").innerHTML=`${ypkRoundHeader(title,r)}<div class="prompt">${esc(prompt)}</div><div class="choices">${opts.map(o=>`<button class="choice" data-round-choice="${esc(o.key)}">${esc(o.label)}</button>`).join("")}</div><div class="feedback">${old?`Ранее записано: ${esc(old.value)}. Можно выбрать другой ответ.`:"Выбери ответ — сразу появится следующее задание."}</div>`;
  $("panel").querySelectorAll("[data-round-choice]").forEach(b=>b.onclick=()=>{const option=opts.find(o=>o.key===b.dataset.roundChoice);ypkAdvanceRound(mode,option.label,option.key===correct)});
}
function ypkRoundQuiz(){
  const r=ypkRound("quiz");if(r.index>=r.items.length)return ypkRoundComplete("quiz");
  const w=r.items[r.index],opts=shuffle([w,...shuffle(U().words.filter(x=>x!==w)).slice(0,3)]).map(x=>({key:x.en,label:x.ru}));
  ypkRoundChoice("quiz","Учить · выбери перевод",w.en,opts,w.en);
}
function ypkRoundType(){
  const r=ypkRound("type");if(r.index>=r.items.length)return ypkRoundComplete("type");
  const w=r.items[r.index],old=r.answers[r.index];
  $("panel").innerHTML=`${ypkRoundHeader("Переведи на английский",r)}<div class="prompt">${esc(w.ru)}</div><p class="definition">Подсказка: ${esc(w.def)}</p><div class="inputrow"><input id="answer" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Английское слово или выражение" value="${esc(old?.value||"")}"><button class="primary" id="check">Ответить</button></div><p class="round-hint">Можно опустить начальное to и пометы sb, sth. Ошибки покажем в конце.</p><div class="actions"><button class="secondary" id="skip">Пропустить</button></div>`;
  const submit=()=>{const value=$("answer").value.trim();if(!value){$("answer").focus();return}ypkAdvanceRound("type",value,ypkWrittenAnswerMatches(value,w.en))};
  $("check").onclick=submit;$("answer").onkeydown=e=>{if(e.key==="Enter")submit()};$("skip").onclick=()=>ypkAdvanceRound("type","",false);$("answer").focus();
}
function ypkRoundTest(){
  const r=ypkRound("test");if(r.index>=r.items.length)return ypkRoundComplete("test");
  const w=r.items[r.index],old=r.answers[r.index],written=r.initialItems.indexOf(w)%2===0;
  let task;
  if(written)task=`<div class="inputrow"><input id="testInput" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Английское слово или выражение" value="${esc(old?.value||"")}"><button class="primary" id="testCheck">Ответить</button></div>`;
  else{const opts=shuffle([w,...shuffle(U().words.filter(x=>x!==w)).slice(0,3)]);task=`<div class="choices">${opts.map(x=>`<button class="choice" data-test-answer="${esc(x.en)}">${esc(x.en)}</button>`).join("")}</div>`}
  $("panel").innerHTML=`${ypkRoundHeader("Тест · русский → английский",r)}<div class="prompt">${esc(w.ru)}</div><p class="definition">${esc(w.def)}</p>${task}<p class="round-hint">Ответ проверяется после серии. Начальное to и пометы sb, sth можно опустить.</p><div class="actions"><button class="secondary" id="testSkip">Пропустить</button></div>`;
  if(written){const submit=()=>{const value=$("testInput").value.trim();if(value)ypkAdvanceRound("test",value,ypkWrittenAnswerMatches(value,w.en))};$("testCheck").onclick=submit;$("testInput").onkeydown=e=>{if(e.key==="Enter")submit()};$("testInput").focus()}
  else $("panel").querySelectorAll("[data-test-answer]").forEach(b=>b.onclick=()=>ypkAdvanceRound("test",b.dataset.testAnswer,b.dataset.testAnswer===w.en));
  $("testSkip").onclick=()=>ypkAdvanceRound("test","",false);
}
function ypkRoundOdd(){
  const r=ypkRound("odd");if(r.index>=r.items.length)return ypkRoundComplete("odd");
  const other=Object.keys(units).filter(u=>u!==state.unit),foreign=units[other[(r.index)%other.length]].words;
  const ownWord=r.items[r.index];
  if(!r.oddTargets.has(ownWord.en))r.oddTargets.set(ownWord.en,state.randomOrder?shuffle(foreign)[0]:foreign[r.index%foreign.length]);
  const wrong=r.oddTargets.get(ownWord.en);
  const own=[r.items[r.index],...U().words.filter(x=>x!==r.items[r.index]).slice(r.index,r.index+2)];
  const opts=shuffle([...own,wrong]).map(x=>({key:x.en,label:`${x.en} — ${x.def}`}));
  ypkRoundChoice("odd","Лишнее слово",`Какое слово не относится к Unit ${state.unit}?`,opts,wrong.en);
}
function ypkRoundMatch(){
  const r=ypkRound("match");if(r.matched.size===r.items.length)return ypkRoundComplete("match");
  $("panel").innerHTML=`<div class="eyebrow">Собери пару · ${r.matched.size} из ${r.items.length}</div><p class="definition">Соедини английские выражения с русским переводом.</p><div class="match"><div class="matchcol">${r.items.map((w,i)=>`<button data-match-left="${i}" class="${r.matched.has(i)?"done":""}">${esc(w.en)}</button>`).join("")}</div><div class="matchcol">${r.rightOrder.map(x=>`<button data-match-right="${x.i}" class="${r.matched.has(x.i)?"done":""}">${esc(x.ru)}</button>`).join("")}</div></div><div class="feedback" id="matchFeedback">${r.matched.size} пар найдено.</div><div class="actions"><button class="secondary" id="matchBack" ${r.history.length?"":"disabled"}>← Отменить последнюю пару</button></div>`;
  const choose=(side,i)=>{if(r.matched.has(i))return;r[side]=i;$("panel").querySelectorAll(`[data-match-${side}]`).forEach(b=>b.classList.toggle("sel",Number(b.dataset[side==="left"?"matchLeft":"matchRight"])===i));if(r.left===null||r.right===null)return;if(r.left===r.right){r.matched.add(i);r.history.push(i);if(!r.creditedPairs.has(i)){learn(r.items[i].en);r.creditedPairs.add(i)}r.left=r.right=null;ypkRoundMatch()}else{r.matchMistakes.add(r.left);r.matchMistakes.add(r.right);$("matchFeedback").textContent="Пара не совпала. Попробуй ещё раз.";r.left=r.right=null;$("panel").querySelectorAll(".match .sel").forEach(b=>b.classList.remove("sel"))}};
  $("panel").querySelectorAll("[data-match-left]").forEach(b=>b.onclick=()=>choose("left",Number(b.dataset.matchLeft)));
  $("panel").querySelectorAll("[data-match-right]").forEach(b=>b.onclick=()=>choose("right",Number(b.dataset.matchRight)));
  $("matchBack").onclick=()=>{if(r.history.length){r.matched.delete(r.history.pop());ypkRoundMatch()}};
}
function ypkStartLightningTimer(r){clearInterval(state.timer);state.timer=setInterval(()=>{if(state.mode!=="lightning"||state.studyRounds.lightning!==r){clearInterval(state.timer);return}r.seconds--;const t=$("time"),bar=$("timebar");if(t)t.textContent=r.seconds;if(bar)bar.style.width=`${Math.max(0,r.seconds)/30*100}%`;if(r.seconds<=0){r.timedOut=true;r.finished=true;ypkRoundComplete("lightning")}},1000)}
function ypkRoundLightning(){
  const r=ypkRound("lightning");if(r.index>=r.items.length||r.finished)return ypkRoundComplete("lightning");
  const w=r.items[r.index],opts=shuffle([w,...shuffle(U().words.filter(x=>x!==w)).slice(0,2)]);
  $("panel").innerHTML=`<div class="eyebrow">Молния · ${r.index+1} из ${r.items.length} · <span id="time">${r.seconds}</span> сек</div><div class="timer"><i id="timebar" style="width:${r.seconds/30*100}%"></i></div><div class="prompt">${esc(w.ru)}</div><div class="choices">${opts.map(x=>`<button class="choice" data-lightning="${esc(x.en)}">${esc(x.en)}</button>`).join("")}</div>`;
  $("panel").querySelectorAll("[data-lightning]").forEach(b=>b.onclick=()=>ypkAdvanceRound("lightning",b.dataset.lightning,b.dataset.lightning===w.en));
}

const ypkPreviousSetModeForRounds=setMode;
setMode=function(mode){if(ypkRoundModes.has(mode))state.studyRounds[mode]=null;ypkPreviousSetModeForRounds(mode)};
const ypkPreviousRenderPanelForRounds=renderPanel;
renderPanel=function(){
  if(!ypkRoundModes.has(state.mode))return ypkPreviousRenderPanelForRounds();
  if(state.mode!=="lightning")clearInterval(state.timer);
  ({cards:ypkRoundCards,quiz:ypkRoundQuiz,type:ypkRoundType,test:ypkRoundTest,match:ypkRoundMatch,odd:ypkRoundOdd,lightning:ypkRoundLightning})[state.mode]();
  ypkEnsureTools();
};
const ypkPreviousCurrentWordForRounds=ypkCurrentWord;
ypkCurrentWord=function(){return ypkRoundModes.has(state.mode)?ypkRoundWord():ypkPreviousCurrentWordForRounds()};
const ypkPreviousEnsureToolsForRounds=ypkEnsureTools;
ypkEnsureTools=function(){if(ypkRoundModes.has(state.mode)&&state.studyRounds[state.mode]?.finished)return;ypkPreviousEnsureToolsForRounds()};
const ypkPreviousBackForRounds=ypkPrevious;
ypkPrevious=function(){
  if(!ypkRoundModes.has(state.mode))return ypkPreviousBackForRounds();
  const r=ypkRound(state.mode);if(state.mode==="match"){if(r.history.length){r.matched.delete(r.history.pop());ypkRoundMatch()}return}
  if(r.timedOut)return;
  if(ypkUndoRound(state.mode))return;
  const note=$("toolNote");if(note)note.textContent="Это первое задание в режиме";
};
document.addEventListener("keydown",e=>{
  if(e.key!=="ArrowRight"||!ypkRoundModes.has(state.mode))return;
  e.stopImmediatePropagation();e.preventDefault();
  if(["type","test","quiz","odd","lightning"].includes(state.mode))return;
  if(state.mode==="cards")return;
},true);
renderPanel();
