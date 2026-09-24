import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root=path.resolve(import.meta.dirname,"..");
const publicDir=path.join(root,"dist");
const names=["index.html","data.js","all-extra.js","mobile.css","features.css","features.js","prepositions.js","sentences.css","sentences.js","rounds.css","rounds.js","translation-editor.css","translation-editor.js"];
const files=Object.fromEntries(names.map(name=>[`/${name}`,fs.readFileSync(path.join(publicDir,name),"utf8")]));
files["/"]=files["/index.html"];
const glossary=vm.runInNewContext(`${files["/data.js"]}\n${files["/all-extra.js"]}\nunits`);
const terms=Object.entries(glossary).flatMap(([unit,data])=>data.words.map(word=>`${unit}:${word.en}`));

const worker=`const FILES=${JSON.stringify(files)};
const TERMS=new Set(${JSON.stringify(terms)});
const OWNER_ID="1b560ff4-65fa-4309-b61d-4c293d233177";
const OWNER_EMAIL="7q62847fm8@privaterelay.appleid.com";
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const editable=request=>request.headers.get("oai-authenticated-user-id")===OWNER_ID||request.headers.get("oai-authenticated-user-email")?.toLowerCase()===OWNER_EMAIL;
export default {async fetch(request,env){
  const url=new URL(request.url),pathname=url.pathname;
  if(pathname==="/api/translations"){
    if(request.method==="GET"){
      try{const result=await env.DB.prepare("SELECT unit, term, ru FROM translation_overrides").all();return json({translations:result.results||[],canEdit:editable(request)})}
      catch{return json({error:"Не удалось загрузить исправления переводов."},503)}
    }
    if(request.method!=="PUT")return json({error:"Метод не поддерживается."},405);
    if(!editable(request))return json({error:"Редактирование доступно только владельцу сайта."},403);
    if(!request.headers.get("content-type")?.startsWith("application/json"))return json({error:"Ожидается JSON."},415);
    const origin=request.headers.get("origin");if(origin&&origin!==url.origin)return json({error:"Недопустимый источник запроса."},403);
    let input;try{input=await request.json()}catch{return json({error:"Неверный формат данных."},400)}
    const unit=String(input.unit||""),term=String(input.term||""),ru=String(input.ru||"").trim();
    if(!TERMS.has(unit+":"+term)||!ru||ru.length>180)return json({error:"Проверьте слово и перевод (до 180 символов)."},400);
    try{await env.DB.prepare("INSERT INTO translation_overrides (unit, term, ru) VALUES (?, ?, ?) ON CONFLICT(unit, term) DO UPDATE SET ru = excluded.ru").bind(unit,term,ru).run();return json({unit,term,ru})}
    catch{return json({error:"Не удалось сохранить перевод. Попробуйте ещё раз."},503)}
  }
  if(request.method!=="GET"&&request.method!=="HEAD")return new Response("Method Not Allowed",{status:405});
  const body=FILES[pathname];if(body===undefined)return new Response("Not Found",{status:404});
  const type=pathname.endsWith(".css")?"text/css":pathname.endsWith(".js")?"application/javascript":"text/html";
  return new Response(request.method==="HEAD"?null:body,{headers:{"content-type":type+"; charset=utf-8","cache-control":"no-cache"}});
}};
`;
const out=path.join(publicDir,"server","index.js");
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,worker,"utf8");
const metadata=path.join(publicDir,".openai");
fs.mkdirSync(metadata,{recursive:true});
fs.copyFileSync(path.join(root,".openai","hosting.json"),path.join(metadata,"hosting.json"));
fs.cpSync(path.join(root,"drizzle"),path.join(metadata,"drizzle"),{recursive:true,force:true});
console.log(`Built Worker with ${names.length} site files and ${terms.length} glossary terms.`);
