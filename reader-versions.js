'use strict';
(()=>{
 const modal=document.createElement('dialog');modal.id='versions-dialog';modal.setAttribute('aria-labelledby','versions-title');
 modal.innerHTML='<form method="dialog" class="versions-heading"><h2 id="versions-title">Annotation versions</h2><button aria-label="Close annotation versions">×</button></form><p id="versions-current"></p><label for="version-name">Save or export as</label><input id="version-name" maxlength="80" autocomplete="off" placeholder="e.g. lnxu"><label class="versions-check"><input type="checkbox" id="version-default"> Load this version by default when opening the reader</label><div class="tools"><button id="version-save">Save / overwrite version</button><button id="version-export">Export named JSON</button></div><hr><label for="version-list">Import a saved version by name</label><select id="version-list"></select><div class="tools"><button id="version-load">Load selected version</button><button id="version-make-default">Set selected as default</button></div><hr><button id="version-file">Import JSON file…</button><button id="version-published" disabled>Load published lnxu</button><p id="published-status" class="versions-help">Loading published annotation snapshot…</p><p class="versions-help">Changes automatically update the active named version on this browser. Saving an existing name overwrites it. Loading another version replaces the working annotations; Undo remains available. Export JSON for a portable backup.</p><p id="version-feedback" role="status"></p>';
 document.body.append(modal);
 const el=id=>document.getElementById(id),feedback=message=>{el('version-feedback').textContent=message},cleanName=value=>value.trim().slice(0,80);
 function refresh(){el('versions-current').textContent='Active: '+versionStore.activeName+' · Default: '+versionStore.defaultName;const list=el('version-list');list.replaceChildren();for(const v of versionStore.versions){const o=document.createElement('option');o.value=v.name;o.textContent=v.name+(v.name===versionStore.defaultName?' · default':'')+' — '+v.state.notes.length+' notes, '+v.state.marks.length+' annotations';list.append(o)}list.value=versionStore.activeName;el('version-default').checked=versionStore.defaultName===cleanName(el('version-name').value)}
 function open(){el('version-name').value=versionStore.activeName;feedback('');refresh();modal.showModal();el('version-name').focus()}
 el('export').onclick=open;el('import').onclick=open;
 el('version-name').oninput=()=>{el('version-default').checked=cleanName(el('version-name').value)===versionStore.defaultName};
 function saveAs(){const name=cleanName(el('version-name').value);if(!name){feedback('Enter a version name.');el('version-name').focus();return false}
  const previous=structuredClone(versionStore);try{versionStore.activeName=name;if(el('version-default').checked)versionStore.defaultName=name;persistNamedVersion();localStorage.setItem(KEY,JSON.stringify(state));el('save-status').textContent='Saved · '+name;refresh();feedback('Saved “'+name+'”. Later edits will update this version.');return true}catch{versionStore=previous;feedback('Could not save this version. Browser storage may be full.');return false}}
 el('version-save').onclick=saveAs;
 el('version-export').onclick=()=>{const name=cleanName(el('version-name').value);if(!name){feedback('Enter a version name.');return}const saved=saveAs();const data={...state,versionName:name,exportedAt:new Date().toISOString(),formatVersion:2};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='egoengine-'+name.replace(/[^\p{L}\p{N}._-]+/gu,'-')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);feedback('Exported “'+name+'” as a JSON backup.'+(saved?'':' Browser storage was unavailable; keep this file.'))};
 function loadState(name,data){checkpoint();versionStore.activeName=name;state=structuredClone(data);resetEditor();paint();save();updateHistory();el('version-name').value=name;refresh()}
 el('version-load').onclick=()=>{const v=versionStore.versions.find(v=>v.name===el('version-list').value);if(!v)return;loadState(v.name,v.state);feedback('Loaded “'+v.name+'”. Undo can restore the previous annotations.')};
 el('version-make-default').onclick=()=>{const name=el('version-list').value;if(!name)return;const previous=versionStore.defaultName;try{versionStore.defaultName=name;localStorage.setItem(VERSIONS_KEY,JSON.stringify(versionStore));refresh();feedback('“'+name+'” will load by default.')}catch{versionStore.defaultName=previous;feedback('Could not save the default version.')}};
 el('version-file').onclick=()=>el('import-file').click();
 el('import-file').onchange=async event=>{try{const file=event.target.files[0];if(!file)return;const data=JSON.parse(await file.text());if(!validState(data))throw Error('Invalid paper or annotation data');const name=cleanName(typeof data.versionName==='string'?data.versionName:el('version-name').value)||'Imported';loadState(name,{paper:data.paper,notes:data.notes,marks:data.marks});feedback('Imported “'+name+'” and replaced that version. Undo can restore the previous working annotations.')}catch{feedback('Could not import. Choose a valid EgoEngine notes JSON file.')}event.target.value=''};
 const publishedKey=KEY+'-published-lnxu';
 const initialState=snapshot();
 let published=null;
 function applyPublished(){
  // Preserve the active browser version before explicitly replacing it.
  if(state.notes.length||state.marks.length){
   const name=versionStore.activeName+' · backup '+new Date().toISOString();
   versionStore.versions.push({name,state:structuredClone(state),updated:new Date().toISOString()});
  }
  versionStore.defaultName='lnxu';
  loadState('lnxu',{paper:published.paper,notes:published.notes,marks:published.marks});
  try{localStorage.setItem(publishedKey,published.exportedAt)}catch{}
  feedback('Loaded published lnxu as default. Previous working annotations are available through Undo and a backup version.');
 }
 el('version-published').onclick=()=>{if(published)applyPublished()};
 fetch('assets/annotations/egoengine-lnxu.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{
  if(!validState(data))throw Error();published=data;el('version-published').disabled=false;
  el('published-status').textContent='Published lnxu · '+data.notes.length+' notes, '+data.marks.length+' annotations · '+data.exportedAt.slice(0,10)+'. Load to replace this browser’s working copy; a backup is kept. Future browser edits stay local.';
  let seen=true;try{seen=!!localStorage.getItem(publishedKey)}catch{}
  const empty=versionStore.versions.every(v=>!v.state.notes.length&&!v.state.marks.length);
  if(!seen&&empty&&snapshot()===initialState&&!state.notes.length&&!state.marks.length&&!undoStack.length){applyPublished();toast('Published lnxu annotations loaded. Your later edits save in this browser.');}
 }).catch(()=>{el('published-status').textContent='Published annotations could not be loaded. Your browser notes are unchanged; JSON import is still available.'});
 modal.addEventListener('click',event=>{if(event.target===modal)modal.close()});
})();
