// Add preposition practice from the complete unit glossary, keeping the original exercises.
const ypkPrepPattern=/(^|\s)(about|above|across|after|against|among|around|at|before|behind|below|between|beyond|by|during|for|from|in|into|of|on|onto|over|through|to|toward|towards|under|upon|via|with|within|without)(?=\s|$)/gi;
for(const unit of Object.values(units)){
  const seen=new Set(unit.preps.map(pair=>pair[0].toLowerCase()));
  for(const w of unit.words){
    ypkPrepPattern.lastIndex=0;
    for(const match of w.en.matchAll(ypkPrepPattern)){
      const prep=match[2].toLowerCase(),start=match.index+match[1].length;
      if(prep==="to"&&start===0)continue; // Infinitive marker is not the missing preposition.
      const masked=w.en.slice(0,start)+"___"+w.en.slice(start+match[2].length);
      if(!seen.has(masked.toLowerCase())){unit.preps.push([masked,prep,w.ru]);seen.add(masked.toLowerCase())}
      break; // One clear answer per glossary term.
    }
  }
}

function ypkPrepHeroCount(){const caption=$("prepHero")?.querySelector("span");if(caption)caption.textContent=`Заданий: ${U().preps.length} · все сочетания и повтор ошибок`}
const ypkBaseRenderAll=renderAll;
state.prepUnit=state.unit;
renderAll=function(){if(state.prepUnit!==state.unit){state.prepQueue=[];state.prepUnit=state.unit}ypkBaseRenderAll();ypkPrepHeroCount()};
ypkPrepHeroCount();

prep=function(start=false){
  clearInterval(state.timer);
  state.mode="prep";
  renderModes();
  if(start||!state.prepQueue.length){
    state.prepQueue=state.randomOrder?shuffle(U().preps):[...U().preps];
    state.prepOriginalCount=state.prepQueue.length;
    state.prepResults=[];
    state.prepMastered=new Set();
    state.prepMistakes=new Map();
    state.i=0;
  }
  const pair=state.prepQueue[state.i],total=state.prepOriginalCount;
  if(!pair){
    const firstTry=state.prepResults.slice(0,total).filter(Boolean).length;
    const mistakes=[...(state.prepMistakes||new Map()).values()];
    $("panel").innerHTML=`<div class="eyebrow">Все сочетания пройдены</div><div class="game-score">${firstTry}/${total}</div><p class="definition">Верно с первой попытки. Ошибочные сочетания повторялись до правильного ответа.</p>${mistakes.length?`<div class="test-review"><b>Сочетания, в которых были ошибки</b>${mistakes.map(([q,a,ru])=>`<div class="test-row bad"><b>${esc(q.replace("___",a))} — ${esc(ypkPrepRu[q]||ru||"")}</b></div>`).join("")}</div>`:'<div class="feedback good">Ошибок не было!</div>'}<button class="primary" id="prepAgain">Пройти заново</button>`;
    $("prepAgain").onclick=()=>prep(true);
    ypkEnsureTools();
    return;
  }
  const [q,a]=pair,answered=state.prepResults[state.i]!==undefined;
  const pool=["to","in","on","with","for","at","from","into","about","between","under","by","of","among","within","against","over","through","via","after","before","behind","without"];
  const opts=shuffle([a,...shuffle(pool.filter(x=>x!==a)).slice(0,3)]);
  const fraction=Math.min(100,Math.round(state.i/Math.max(total,1)*100));
  $("panel").innerHTML=`<div class="eyebrow">Учить предлоги · ${state.i+1} из ${state.prepQueue.length}</div><div class="test-progress"><i style="width:${fraction}%"></i></div><div class="prompt">${esc(q)}</div>${answered?`<div class="feedback ${state.prepResults[state.i]?"good":"bad"}">${state.prepResults[state.i]?"Верно!":"Правильный ответ:"} <b>${esc(q.replace("___",a))}</b><br><small>${esc(ypkPrepRu[q]||pair[2]||"")}</small></div><div class="actions"><button class="primary" id="prepNext">Следующее сочетание</button></div>`:`<div class="choices">${opts.map(x=>`<button class="choice" data-prep="${esc(x)}">${esc(x)}</button>`).join("")}</div><div class="feedback">Выбери предлог. Кнопка «Показать перевод» откроет ответ и русский смысл.</div>`}`;
  if(answered){$("prepNext").onclick=()=>{state.i++;prep(false)}}
  else document.querySelectorAll("[data-prep]").forEach(b=>b.onclick=()=>{
    const ok=b.dataset.prep===a;
    state.prepResults[state.i]=ok;
    if(ok){state.score++;state.prepMastered.add(q)}
    else{state.prepQueue.push(pair);state.prepMistakes.set(q,pair)}
    save();renderStats();prep(false);
  });
  ypkEnsureTools();
};
