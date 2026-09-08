import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
for(const name of fs.readdirSync(root).filter(n=>n.endsWith('.js')))execFileSync(process.execPath,['--check',path.join(root,name)]);
let links=0;
for(const name of ['index.html','commentary.html','presenter.html']){
 const html=fs.readFileSync(path.join(root,name),'utf8');
 assert(!/presentation\.html|reading\.html|localhost|127\.0\.0\.1/.test(html),name+' contains an obsolete link');
 for(const match of html.matchAll(/(?:src|href|poster|data-snapshot)="([^"]+)"/g)){
  const url=match[1];if(/^(?:https?:|data:|#|mailto:)/.test(url))continue;
  const file=decodeURIComponent(url.split(/[?#]/)[0]);if(!file)continue;
  assert(fs.existsSync(path.join(root,file)),name+': missing '+file);links++;
 }
}
const text=fs.readFileSync(path.join(root,'commentary.js'),'utf8');
for(const match of text.matchAll(/['"]([\w-]+\.(?:mp4|png|jpg))['"]/g))assert(fs.existsSync(path.join(root,'assets',match[1])),'Missing dynamic media '+match[1]);
assert(!fs.existsSync(path.join(root,'.openai')),'Do not include unrelated hosting configuration');
console.log('PASS: JavaScript syntax, '+links+' local page references, dynamic gallery media, and standalone routes.');

const discussion=JSON.parse(fs.readFileSync(path.join(root,'assets/discussion/sources.json'),'utf8'));assert.equal(discussion.length,4);for(const post of discussion){for(const key of ['media','poster'])assert(fs.existsSync(path.join(root,post[key])),post.id+' missing '+key);assert(post.url.startsWith('https://x.com/'));}
