import assert from "node:assert/strict";

const worker=(await import(new URL("../dist/server/index.js",import.meta.url))).default;
const rows=new Map();
const DB={prepare(sql){let args=[];return {bind(...values){args=values;return this},async all(){return {results:[...rows.values()]}},async run(){rows.set(`${args[0]}:${args[1]}`,{unit:args[0],term:args[1],ru:args[2]});return {success:true}}}}};
const request=(method,path,body,headers={})=>new Request(`https://example.test${path}`,{method,headers,body:body?JSON.stringify(body):undefined});
const send=(req)=>worker.fetch(req,{DB});

let response=await send(request("GET","/api/translations"));
assert.equal(response.status,200);
assert.deepEqual(await response.json(),{translations:[],canEdit:false});

const correction={unit:"4",term:"to conspire with sb",ru:"сговориться с кем-либо"};
response=await send(request("PUT","/api/translations",correction,{"content-type":"application/json"}));
assert.equal(response.status,403);

const owner={"content-type":"application/json","oai-authenticated-user-id":"1b560ff4-65fa-4309-b61d-4c293d233177"};
response=await send(request("PUT","/api/translations",correction,owner));
assert.equal(response.status,200);
response=await send(request("GET","/api/translations"));
assert.deepEqual((await response.json()).translations,[correction]);

response=await send(request("PUT","/api/translations",{unit:"4",term:"not in glossary",ru:"X"},owner));
assert.equal(response.status,400);
response=await send(request("GET","/"));
assert.equal(response.status,200);
assert.match(await response.text(),/translation-editor\.js/);
console.log("Worker read, owner write, public visibility, input validation and site shell: OK");
