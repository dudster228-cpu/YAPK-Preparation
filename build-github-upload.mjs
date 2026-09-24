import fs from "node:fs";
import path from "node:path";

const source = path.resolve("site/dist");
const target = path.resolve("github-upload");
const read = name => fs.readFileSync(path.join(source, name), "utf8");
let html = read("index.html");

for (const name of ["mobile.css", "features.css", "sentences.css", "rounds.css", "translation-editor.css"]) {
  const link = `<link rel="stylesheet" href="${name}">`;
  if (!html.includes(link)) throw new Error(`Missing stylesheet link: ${name}`);
  const css = name === "translation-editor.css"
    ? read(name) + "\n.github-export[hidden]{display:none}\n.github-export{margin:0 0 16px}"
    : read(name);
  html = html.replace(link, `<style>\n${css}\n</style>`);
}

for (const name of ["data.js", "all-extra.js", "features.js", "prepositions.js", "sentences.js", "rounds.js", "translation-editor.js"]) {
  const tag = `<script src="${name}"></script>`;
  if (!html.includes(tag)) throw new Error(`Missing script tag: ${name}`);
  const code = name === "translation-editor.js"
    ? fs.readFileSync("github-pages-translation-editor.js", "utf8") : read(name);
  if (/<\/script/i.test(code)) throw new Error(`Unsafe script text: ${name}`);
  html = html.replace(tag, `<script>\n${code}\n</script>`);
}

fs.mkdirSync(target, {recursive:true});
fs.writeFileSync(path.join(target, "index.html"), html, "utf8");
fs.writeFileSync(path.join(target, "translations.json"), "[]\n", "utf8");
console.log("Built two-file GitHub Pages site in github-upload/");
