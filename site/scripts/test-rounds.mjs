import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync(new URL("../dist/rounds.js",import.meta.url),"utf8").split("const ypkPreviousSetModeForRounds=")[0];
const words=[
  {en:"to align with sth",ru:"соответствовать чему-либо",def:"To agree with something."},
  {en:"at the core",ru:"в основе",def:"At the centre of something."},
  {en:"by chance",ru:"случайно",def:"Without a plan."}
];
const elements=new Map();
const element=id=>{
  if(!elements.has(id))elements.set(id,{innerHTML:"",textContent:"",after(){},setAttribute(){},querySelectorAll(){return []}});
  return elements.get(id);
};
const state={unit:"4",mode:"type",i:0,timer:null};
const learned=[];
const context={
  state,units:{"4":{words}},U:()=>({words}),$ :element,
  localStorage:{getItem:()=>null,setItem(){}},
  document:{createElement:()=>({className:"",innerHTML:"",after(){}})},
  shuffle:x=>[...x],norm:x=>x.toLowerCase().replace(/[^a-z ]/g," ").replace(/\s+/g," ").trim(),
  renderPanel(){},learn:x=>learned.push(x),clearInterval(){},setInterval(){},esc:x=>x,
  console
};
vm.createContext(context);
vm.runInContext(source,context);

assert.equal(context.ypkWrittenAnswerMatches("ALIGN WITH",words[0].en),true);
context.ypkStartRound("type");
context.ypkAdvanceRound("type","wrong",false);
let round=context.ypkRound("type");
assert.equal(round.items.length,4);
assert.equal(round.items.at(-1).en,words[0].en);
context.ypkAdvanceRound("type","at the core",true);
context.ypkAdvanceRound("type","by chance",true);
context.ypkAdvanceRound("type","wrong again",false);
assert.equal(round.items.length,5);
context.ypkAdvanceRound("type","align with",true);
assert.equal(round.index,5);
assert.equal(round.mistakes.size,1);
context.ypkRoundComplete("type");
assert.match(element("panel").innerHTML,/2\/3/);
assert.match(element("panel").innerHTML,/Слова, в которых были ошибки/);
assert.match(element("panel").innerHTML,/соответствовать чему-либо/);
assert.equal(learned.length,3);
assert.equal(context.ypkUndoRound("type"),true);
assert.equal(round.index,4);
assert.equal(round.items.length,5);
context.ypkAdvanceRound("type","align with",true);
assert.equal(learned.length,3);

context.ypkStartRound("cards");
context.ypkAdvanceRound("cards","Повторить",false);
assert.equal(context.ypkRound("cards").items.length,4);

console.log("Incorrect answers return until solved, results retain mistakes and translations, back works: OK");
