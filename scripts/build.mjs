import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'dist');
fs.mkdirSync(out,{recursive:true});
for(const entry of fs.readdirSync(root,{withFileTypes:true})){
 if(entry.name==='assets'||entry.name==='rehearsal-script.md'||(entry.isFile()&&/\.(html|css|js)$/.test(entry.name)))fs.cpSync(path.join(root,entry.name),path.join(out,entry.name),{recursive:true});
}
fs.writeFileSync(path.join(out,'.nojekyll'),'');
console.log('Built reading room and Commentary in dist/.');
