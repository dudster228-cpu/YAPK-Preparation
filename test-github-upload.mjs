import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync("github-upload/index.html", "utf8");
const translations = JSON.parse(fs.readFileSync("github-upload/translations.json", "utf8"));
assert.deepEqual(translations, []);
assert.equal((html.match(/<script>/g) || []).length, 8);
assert.equal((html.match(/<style>/g) || []).length, 6);
assert.doesNotMatch(html, /<script\s+src=|<link\s+rel="stylesheet"/);
assert.doesNotMatch(html, /\/api\/translations|signin-with-chatgpt/);
assert.match(html, /fetch\("translations\.json"/);
assert.match(html, /link\.download = "translations\.json"/);

for (const [, code] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
  new vm.Script(code);
}
const files = fs.readdirSync("github-upload").sort();
assert.deepEqual(files, ["index.html", "translations.json"]);
const data = fs.readFileSync("site/dist/data.js", "utf8");
const extra = fs.readFileSync("site/dist/all-extra.js", "utf8");
const count = vm.runInNewContext(`${data}\n${extra}\nObject.values(units).map(unit => unit.words.length)`).reduce((a,b)=>a+b,0);
assert.ok(count > 600, `Only ${count} terms`);
console.log(`GitHub upload OK: ${files.length} files, ${count} terms, all scripts parse`);
