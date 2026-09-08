import {spokenSentence} from './presenter-sentence-focus.js?v=delete-notes-1';
import {NoteReader} from './presenter-narration.js?v=delete-notes-1';
import {Stage} from './presenter-stage.js?v=delete-notes-1';
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search), mode = params.get('view');
const session = params.get('session') || crypto.randomUUID();
const release = 'delete-notes-1';
const messageType = 'egoengine-presenter-v1';
const channel = 'BroadcastChannel' in window ? new BroadcastChannel(messageType + ':' + session) : null;
const packet = (kind, data = {}) => ({type:messageType, session, kind, ...data});
const valid = d => d?.type === messageType && d.session === session;
const formatTime = seconds => { const n=Math.max(0,Math.floor(Math.abs(seconds))); return (seconds<0?'−':'')+String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0'); };
if (mode === 'audience' || mode === 'preview') {
  document.body.className = 'stage-view' + (mode === 'preview' ? ' preview' : ''); $('audience-app').hidden = false;
  if(mode==='preview'){const scale=()=>{const n=Math.min(innerWidth/1280,innerHeight/800);$('audience-stage').style.transform='scale('+n+')';};new ResizeObserver(scale).observe(document.body);window.addEventListener('resize',scale);scale();}
  document.title = 'EgoEngine · ' + (mode === 'preview' ? 'Visual preview' : 'Audience');
  const stage = new Stage($('audience-stage'), mode === 'preview'); let lastCommand = '', lastState = '';
  const receive = d => {
    if (!valid(d)) return;
    if (d.kind === 'state') { lastState = d.sequence; stage.pointer=d.pointer||null; stage.show(d.visual,d.blank); $('audience-status').textContent=d.visual?.label || 'Connected'; }
    if (d.kind === 'pointer') stage.point(d.pointer);
    if (d.kind === 'command' && d.id !== lastCommand) { lastCommand=d.id; stage.command(d.action,d.pointers); }
  };
  window.addEventListener('message', e => { if (e.origin === location.origin && (e.source === parent || e.source === opener)) receive(e.data); });
  if (mode === 'audience') {
    channel && (channel.onmessage=e=>receive(e.data));
    const hello = () => { const d=packet('hello',{lastState}); channel?.postMessage(d); opener?.postMessage(d,location.origin); };
    hello(); setInterval(hello,1500);
    window.addEventListener('keydown', e => { if (e.target.closest('button,video,input')) return; const keys={ArrowRight:'next',PageDown:'next',ArrowLeft:'previous',PageUp:'previous',' ':'cue',b:'blank',B:'blank'}; if(keys[e.key]){e.preventDefault(); const d=packet('remote',{action:keys[e.key],id:crypto.randomUUID()});channel?.postMessage(d);opener?.postMessage(d,location.origin);} });
  }
  $('audience-fullscreen').onclick = async () => { try { if(document.fullscreenElement) await document.exitFullscreen();else await document.documentElement.requestFullscreen(); }catch{ $('audience-status').textContent='Use the browser fullscreen command.'; } };
} else {
  $('presenter-app').hidden = false;
  history.replaceState(null,'',location.pathname+'?v='+release+'&session='+session);
  let chapters=[], current=0, cue=0, blank=false, audience=null, details=null, sequence=0, lastHello=0, lastRemote='', restored=false;
  let running=false, accumulated=0, startedAt=0, notesSize=19, sourceName='rehearsal-script.md';
  let guided=false, guidedPosition=0, guidedStarted=0, guidedIndex=-1, timeline=[], pointer=null, pointerKey='', guidedFinished=false;
  let narrating=false,narrationRun=0;
  const reader=('speechSynthesis' in window&&'SpeechSynthesisUtterance' in window)?new NoteReader(window.speechSynthesis,window.SpeechSynthesisUtterance):null;
  const storageKey='egoengine-presenter-state-v1';
  let timingMode='target';
  let saved={}; try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}')}catch{}
  const previewURL = new URL('presenter.html',location.href);previewURL.search='?v='+release+'&view=preview&session='+session;
  $('current-preview').src=previewURL.href; $('next-preview').src=previewURL.href;
  const elapsed=()=>accumulated+(running?(Date.now()-startedAt)/1000:0);
  const persist=()=>{try{localStorage.setItem(storageKey,JSON.stringify({current,cue,accumulated:elapsed(),running,stamp:Date.now(),target:Number($('target-minutes').value),speed:Number($('guided-speed').value),timingMode,notesSize}));}catch{}};
  const visual=(kind,target,label,trigger='',context='')=>({kind,target,label,trigger,context});
  const fig=(target,label,trigger)=>visual('figure',target,label,trigger);
  const paper=(target,label='Read the paper',trigger='')=>visual('paper',target,label,trigger);
  const demo=(target,label,trigger)=>visual('video',target,label,trigger);
  function chapterCues(ch) {
    const t=ch.title.toLowerCase(); let cues=[];
    if (/barista|commentary opening/.test(t)) cues=[visual('commentary','','Commentary · opening','Today we’re looking'),visual('commentary','coffee-analogy','The little barista analogy','Instagram'),{...visual('commentary','authors','The authors’ perspective · essay','A visually plausible robot demonstration'),source:'essay'},{...visual('commentary','authors','Liu · announcement snapshot','Human video is everywhere'),source:'thread'},{...visual('commentary','authors','Xu · commentary snapshot','effect-driven retargeting'),source:'coauthor'},{...visual('commentary','authors','Liu · real2sim snapshot','The bottleneck is real2sim'),source:'real2sim'},visual('image','project-pipeline.png','Official method overview','two things')];
    else if (/two gaps/.test(t)) cues=[fig('S0.F1','Figure 1 · two branches','overview'),paper('S1','Introduction · motivation','visual gap')];
    else if (/object supplies/.test(t)) cues=[fig('S0.F1','Figure 1 · shared object goal','common target'),paper('S3.SS2.SSS2','Object-centered optimization','object trajectory')];
    else if (/measurable world/.test(t)) cues=[paper('S3.SS1','Section 3.1 · build the twin','digital twin'),paper('A1.SS3','Appendix A.3 · reconstruction details','Foundation'),fig('A1.F3','Figure A.3 · reconstruction examples','hundred new objects')];
    else if (/hand pose/.test(t)) cues=[paper('S3.SS2.SSS1','Human-centric retargeting','Mink'),visual('equation','S3.E2','Equation 2 · object-tracking error','Equation 2','Position and orientation error compare the simulated object with the demonstrated object trajectory. The weights balance the two.'),demo('video-policy-hammer.mp4','Hammer · real-robot example','hammer example')];
    else if (/spend computation/.test(t)) cues=[fig('S3.F2','Figure 2 · adaptive mode switching','Replay'),paper('S3.SS2.SSS2','Solver modes · Replay, MPC, RL','chunk boundary'),fig('S4.F6','Figure 6 · selected solver modes','mode assignments')];
    else if (/observation agree/.test(t)) cues=[fig('S4.F3','Figure 3 · visual generation','visual branch'),paper('S3.SS3','Section 3.3 · visibility and blending','two rendering passes'),demo('video-visual-ego.mp4','Generated robot view','scene context')];
    else if (/demonstrations into a policy/.test(t)) cues=[paper('S3.SS4','Section 3.4 · policy distillation','HPT'),paper('A4','Appendix D · policy architecture','Appendix D')];
    else if (/tests the central/.test(t)) cues=[fig('S4.T4','Table 4 · branch ablation','table'),paper('S4.SS4','Section 4.4 · ablation context','qualifications')];
    else if (/works on the real/.test(t)) cues=[fig('S4.T3','Table 3 · real-robot success','Hammer'),demo('video-policy-hammer.mp4','Hammer · inspect the grasp','wrist adjustment'),fig('S4.F7','Figure 7 · robot evaluation','failure cases')];
    else if (/earn its complexity/.test(t)) cues=[fig('S4.T2','Table 2 · action fidelity and cost','Success rate'),fig('S4.F5','Figure 5 · efficiency comparison','throughput'),paper('A3.SS3','Appendix C.3 · cost definition','successful trajectories')];
    else if (/visual metrics/.test(t)) cues=[fig('S4.T1','Table 1 · Fréchet Distance','table'),fig('S4.F4','Figure 4 · feature distributions','KDE'),paper('S4.SS2','Section 4.2 · visual comparison','baseline-description')];
    else if (/scaling claim/.test(t)) cues=[paper('S6','Limitations · reconstruction and transfer','scalab'),fig('A1.F3','Figure A.3 · examples versus coverage','sixteen'),visual('discussion','','What would demonstrate scalable conversion?','preferred next experiment','Count rejected videos, human interventions, total compute, and real-robot success on held-out conditions.')];
    else if (/unresolved test/.test(t)) cues=[fig('S0.F1','Figure 1 · return to the central idea','recover'),visual('discussion','','When does a human video become a robot demonstration?','question','Executable actions, aligned observations, and evidence that the resulting policy works.')];
    else cues=[visual('discussion','',ch.title,'',ch.paragraphs.find(p=>p.includes('?'))?.replace(/\*\*/g,'') || 'What evidence would change your mind?')];
    // Explicit figure/table references remain actionable even in newly imported chapters.
    const refs=ch.body.matchAll(/\b(Fig(?:ure)?\.?|Table|Tab\.?|Equation|Eq\.?)\s*\(?([A-E]\.\d+|\d+)/gi);
    for(const m of refs){const type=/^(fig)/i.test(m[1])?'Figure':/^t/i.test(m[1])?'Table':'Equation'; const id=referenceIds[type+' '+m[2]];if(id&&!cues.some(c=>c.target===id))cues.push(visual(type==='Equation'?'equation':'figure',id,type+' '+m[2],m[0]));}
    return cues;
  }
  const referenceIds={};
  function parse(text) {
    const re=/^##\s+(?:(\d{1,2}):(\d{2})\s*[·—-]\s*)?(.+)$/gm, hits=[...text.matchAll(re)];
    if(!hits.length)throw Error('Use Markdown chapter headings beginning with ##. Optional times: ## 00:00 · Title.');
    return hits.map((m,i)=>{const body=text.slice(m.index+m[0].length,hits[i+1]?.index??text.length).trim(); const paragraphs=[],explicit=[];let pending=null;
      for(const chunk of body.split(/\n\s*\n/)){let prose=chunk.replace(/<!--\s*cue\s+(\{[^]*?\})\s*-->/g,(_,json)=>{const c=JSON.parse(json);if(!['paper','commentary','figure','equation','video','image','discussion'].includes(c.kind)||typeof c.target!=='string'||typeof c.label!=='string')throw Error('Invalid visual cue');pending=c;return '';}).trim();if(!prose)continue;paragraphs.push(prose);explicit.push(pending);pending=null;}
      const ch={title:m[3],start:m[1]?Number(m[1])*60+Number(m[2]):i*100,body,paragraphs};
      if(explicit.some(Boolean)){ch.cues=[];ch.paragraphCues=[];let active=0;explicit.forEach((c,pi)=>{if(c){if(c.kind==='paper'&&c.target==='S1.p2.1'&&!c.focus)c={...c,panel:'gaps',label:'Two gaps · visual and action demos'};if(c.kind==='paper'&&c.target?.startsWith('S3.SS2.SSS2')&&['Replay','MPC','RL'].includes(c.point?.label)){const mode=c.point.label;c={...c,focus:undefined,panel:'code',code:'solver-'+mode.toLowerCase(),label:mode+' · simulation pseudocode',terms:[{Replay:'Replay',MPC:'Model predictive control (MPC)',RL:'Residual policy'}[mode]]};}active=ch.cues.length;ch.cues.push({...c,trigger:paragraphs[pi].slice(0,90)});}ch.paragraphCues[pi]=active;});}else ch.cues=chapterCues(ch);return ch;});
  }
  function safeInline(text){const escaped=text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');return escaped.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1 ↗</a>');}
  function paintNotes(ch){clearReadingCursor();$('notes').replaceChildren();ch.paragraphs.forEach((p,i)=>{const block=document.createElement('div'); block.dataset.paragraph=i; const cueIndex=ch.paragraphCues?ch.paragraphCues[i]:ch.cues.findIndex(c=>c.trigger&&p.toLowerCase().includes(c.trigger.toLowerCase()));if(cueIndex>=0){const b=document.createElement('button');b.className='note-cue';b.textContent='Show '+ch.cues[cueIndex].label+' ↗';b.onclick=()=>animateParagraph(i);b.setAttribute('aria-label','Animate paragraph '+(i+1)+': '+ch.cues[cueIndex].label);b.textContent='▶ '+ch.cues[cueIndex].label;block.append(b);block.dataset.cue=cueIndex;}const edit=document.createElement('button');edit.className='edit-paragraph';edit.textContent='Edit';edit.setAttribute('aria-label','Edit paragraph '+(i+1));edit.onclick=()=>editParagraph(i);block.append(edit);const prose=document.createElement('div');prose.className='note-prose';if(/^[-*_]{3,}$/.test(p.trim()))prose.innerHTML='<hr>';else{prose.innerHTML=p.split('\n').map(line=>/^###\s/.test(line)?'<h3>'+safeInline(line.replace(/^###\s+/,''))+'</h3>':/^>\s?/.test(line)?'<blockquote>'+safeInline(line.replace(/^>\s?/,''))+'</blockquote>':/^\s*[-•]\s/.test(line)?'<p>• '+safeInline(line.replace(/^\s*[-•]\s/,''))+'</p>':'<p>'+safeInline(line)+'</p>').join('');}wrapNoteWords(prose);block.append(prose);$('notes').append(block);});}
  function nextVisual(){const entry=timeline[guidedIndex];if(entry&&entry.chapter===current&&entry.cue===cue){const next=timeline.slice(guidedIndex+1).find(e=>e.chapter!==current||e.cue!==cue);return next?chapters[next.chapter].cues[next.cue]:undefined;}const ch=chapters[current];return ch.cues[cue+1] || chapters[current+1]?.cues[0];}
  function state(){return packet('state',{visual:chapters[current]?.cues[cue],blank,pointer,sequence:String(++sequence)});}
  function send(){if(!chapters.length)return;const d=state();channel?.postMessage(d);if(audience&&!audience.closed)audience.postMessage(d,location.origin);$('current-preview').contentWindow?.postMessage(d,location.origin);const next=nextVisual();$('next-preview').hidden=!next;if(next)$('next-preview').contentWindow?.postMessage(packet('state',{visual:next,blank:false}),location.origin);}
  function paint(changed=false){const ch=chapters[current];if(!ch)return;if(changed){document.querySelector('.visual-panel').scrollTop=0;$('chapter-title').textContent=ch.title;paintNotes(ch);$('notes').scrollTop=0;} $('chapter-count').textContent=String(current+1).padStart(2,'0')+' / '+chapters.length;
    document.querySelectorAll('.chapter-button').forEach((b,i)=>b.setAttribute('aria-current',String(i===current)));
    $('cue-list').replaceChildren();ch.cues.forEach((v,i)=>{const b=document.createElement('button');b.className='cue';b.setAttribute('aria-current',String(i===cue));b.append(document.createTextNode(v.label));const hint=document.createElement('span');hint.textContent=v.trigger?'When you mention “'+v.trigger+'”':'Opening visual / discussion prompt';b.append(hint);b.onclick=()=>selectCue(i);$('cue-list').append(b);});
    $('notes').querySelectorAll('[data-cue]').forEach(el=>{el.toggleAttribute('data-active-note',Number(el.dataset.cue)===cue);});
    const next=nextVisual();$('next-title').textContent=next?.label||'End of presentation';$('next-guidance').textContent=next?(next.trigger?'Cue: “'+next.trigger+'”':'Next chapter opening'):'Leave space for questions.';
    $('previous-chapter').disabled=current===0;$('next-chapter').disabled=current===chapters.length-1;$('previous-cue').disabled=current===0&&cue===0;$('next-cue').disabled=!next;$('blank').setAttribute('aria-pressed',String(blank));$('blank').textContent=blank?'Unblank':'Blank';send();persist();}
  function selectChapter(i){seekGuidedChapter(i);current=Math.max(0,Math.min(chapters.length-1,i));cue=0;paint(true);}
  function selectCue(i){if(guided||narrating)pauseGuided();clearPointer();cue=Math.max(0,Math.min(chapters[current].cues.length-1,i));paint();}
  function animateParagraph(paragraph){
    if(guided||narrating)pauseGuided();
    const index=timeline.findIndex(e=>e.chapter===current&&e.paragraph===paragraph);
    if(index<0)return;
    moveToEntry(index);
    const entry=timeline[index],points=[],seen=new Set();
    for(let i=0;i<=100;i++){const p=pointerFor(entry,i/100);if(p&&!seen.has(JSON.stringify(p))){points.push(p);seen.add(JSON.stringify(p));}}
    command('animate',{pointers:points.length?points:[{element:true,label:chapters[current].cues[cue].label}]});
    $('guided-status').textContent='Manual animation · paragraph '+(paragraph+1)+' · autoplay remains paused';
  }
  function advance(){if(cue<chapters[current].cues.length-1)selectCue(cue+1);else if(current<chapters.length-1)selectChapter(current+1);}
  function previous(){if(narrating)pauseGuided();if(cue>0)selectCue(cue-1);else if(current>0){current--;cue=chapters[current].cues.length-1;paint(true);}}
  function command(action,extra={}){const d=packet('command',{action,...extra,id:crypto.randomUUID()});channel?.postMessage(d);audience?.postMessage(d,location.origin);$('current-preview').contentWindow?.postMessage(d,location.origin);}
  function receive(d){if(!valid(d))return;if(d.kind==='hello'){lastHello=Date.now();send();}if(d.kind==='remote'&&d.id!==lastRemote){lastRemote=d.id;if(d.action==='next')selectChapter(current+1);if(d.action==='previous')selectChapter(current-1);if(d.action==='cue')advance();if(d.action==='blank'){blank=!blank;paint();}}}
  channel && (channel.onmessage=e=>receive(e.data));window.addEventListener('message',e=>{if(e.origin===location.origin && e.source===audience)receive(e.data);});
  $('current-preview').onload=send;$('next-preview').onload=send;
  function load(text,name,location=null){$('undo-delete').hidden=true;if(guided||narrating)pauseGuided();clearPointer();chapters=parse(text);guidedIndex=-1;guidedPosition=0;guidedFinished=false;sourceName=name;$('script-name').textContent=name+' · '+chapters.length+' chapters';current=0;cue=0;
    if(!restored){current=Math.max(0,Math.min(chapters.length-1,saved.current||0));cue=Math.max(0,Math.min(chapters[current].cues.length-1,saved.cue||0));accumulated=Math.max(0,saved.accumulated||0);$('target-minutes').value=saved.target||30;$('guided-speed').value=saved.speed||145;timingMode=saved.timingMode==='speed'?'speed':'target';notesSize=saved.notesSize||19;document.documentElement.style.setProperty('--notes-size',notesSize+'px');restored=true;}
    if(location){current=Math.max(0,Math.min(chapters.length-1,location.chapter));cue=chapters[current].paragraphCues?.[location.paragraph]??0;}
    syncTiming(timingMode);
    $('chapter-list').replaceChildren();chapters.forEach((ch,i)=>{const b=document.createElement('button');b.className='chapter-button';const num=document.createElement('span');num.textContent=String(i+1).padStart(2,'0');const title=document.createElement('span');title.textContent=ch.title;const time=document.createElement('small');time.textContent=formatTime(ch.start)+' planned';title.append(time);b.append(num,title);b.onclick=()=>selectChapter(i);$('chapter-list').append(b);});paint(true);}
  async function loadBundled(){const r=await fetch('rehearsal-script.md',{cache:'no-store'});if(!r.ok)throw Error('Script could not be loaded.');load(await r.text(),'rehearsal-script.md');}
  $('import-script').onclick=()=>$('script-file').click();$('script-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{load(await file.text(),file.name+' (local)');}catch(error){$('script-name').textContent=error.message;}e.target.value='';};$('restore-script').onclick=()=>loadBundled().then(()=>{try{localStorage.removeItem(draftKey)}catch{}}).catch(e=>$('script-name').textContent=e.message);
  $('next-cue').onclick=advance;$('previous-cue').onclick=previous;$('next-chapter').onclick=()=>selectChapter(current+1);$('previous-chapter').onclick=()=>selectChapter(current-1);$('blank').onclick=()=>{blank=!blank;paint();};$('scroll-up').onclick=()=>command('up');$('scroll-down').onclick=()=>command('down');$('video-toggle').onclick=()=>command('play');
  const draftKey='egoengine-presenter-script-draft-v1';
  const plainKey='egoengine-presenter-plain-draft-v1';
  let plainMode=false,plainBase='';
  let editAt=null, beforeEdit='', deletedBlock=null;
  function serializeScript(replacement=null){
    return '# EgoEngine · practice transcript\n\n'+chapters.map((ch,ci)=>{
      if(replacement?.remove&&ci===replacement.chapter&&ch.paragraphs.length===1)return '';
      let last=-1;
      return '## '+formatTime(ch.start)+' · '+ch.title+'\n\n'+ch.paragraphs.map((p,pi)=>{
        if(replacement?.remove&&ci===replacement.chapter&&pi===replacement.paragraph)return null;
        const index=ch.paragraphCues?.[pi]??ch.cues.reduce((active,c,i)=>c.trigger&&p.toLowerCase().includes(c.trigger.toLowerCase())?i:active,Math.max(0,last));
        const directive=index!==last?'<!-- cue '+JSON.stringify(ch.cues[index])+' -->\n\n':'';last=index;
        return directive+(replacement&&ci===replacement.chapter&&pi===replacement.paragraph?replacement.text:p);
      }).filter(p=>p!==null).join('\n\n');
    }).filter(Boolean).join('\n\n')+'\n';
  }
  function saveDraft(text){try{localStorage.setItem(draftKey,JSON.stringify({text,updated:new Date().toISOString()}));$('edit-status').textContent='Draft saved in this browser.';}catch{$('edit-status').textContent='Browser storage unavailable. Apply and download the script to keep edits.';}}
  function editParagraph(i){
    if(guided||narrating)pauseGuided();else if(running){accumulated=elapsed();running=false;$('timer-toggle').textContent='Start timer';}
    deletedBlock=null;$('undo-delete').hidden=true;editAt={chapter:current,paragraph:i};beforeEdit=serializeScript();
    $('edit-text').value=chapters[current].paragraphs[i];$('edit-title').textContent='Edit speaker notes · paragraph '+(i+1);$('edit-cue').textContent='Visual stays attached: '+chapters[current].cues[chapters[current].paragraphCues?.[i]??cue].label;
    $('edit-delete').disabled=chapters.length===1&&chapters[0].paragraphs.length===1;
    $('edit-status').textContent='Changes save privately as you type. Apply to update the speaking guide.';$('edit-dialog').showModal();$('edit-text').focus();
  }
  $('edit-text').oninput=()=>saveDraft(serializeScript({...editAt,text:$('edit-text').value}));
  $('edit-apply').onclick=()=>{
    const text=$('edit-text').value.trim();if(!text){$('edit-status').textContent='Keep some text in this paragraph.';return;}
    // Keep edits as one timed paragraph, even when the text uses line breaks.
    const normalized=text.replace(/\n\s*\n/g,'\n');const draft=serializeScript({...editAt,text:normalized});
    saveDraft(draft);load(draft,'Practice draft · saved in this browser',editAt);current=editAt.chapter;cue=chapters[current].paragraphCues[editAt.paragraph];paint(true);const index=timeline.findIndex(e=>e.chapter===current&&e.paragraph===editAt.paragraph);moveToEntry(index);$('edit-dialog').close();$('guided-status').textContent='Notes updated · timing recalculated; resume when ready';persist();editAt=null;
  };
  $('edit-delete').onclick=()=>{
    if(!editAt||$('edit-delete').disabled)return;
    const location={...editAt},draft=serializeScript({...editAt,remove:true});
    deletedBlock={text:beforeEdit,location};
    // Removing a cue's first block must leave the cue on the next surviving block.
    saveDraft(draft);load(draft,'Practice draft · saved in this browser',location);
    const paragraph=Math.min(location.paragraph,chapters[current].paragraphs.length-1);
    const index=timeline.findIndex(e=>e.chapter===current&&e.paragraph===paragraph);
    if(index>=0)moveToEntry(index);
    $('edit-dialog').close();editAt=null;$('undo-delete').hidden=false;
    $('guided-status').textContent='Block deleted · timing recalculated';persist();
  };
  $('undo-delete').onclick=()=>{
    if(!deletedBlock)return;
    const {text,location}=deletedBlock;saveDraft(text);load(text,'Practice draft · deletion undone',location);
    const index=timeline.findIndex(e=>e.chapter===current&&e.paragraph===location.paragraph);if(index>=0)moveToEntry(index);
    deletedBlock=null;$('undo-delete').hidden=true;persist();
  };
  function cancelEdit(){if(editAt)saveDraft(beforeEdit);editAt=null;$('edit-dialog').close();}
  $('edit-cancel').onclick=cancelEdit;$('edit-dialog').addEventListener('cancel',e=>{e.preventDefault();cancelEdit()});
  $('edit-current').onclick=()=>editParagraph(timeline[guidedIndex]?.chapter===current?timeline[guidedIndex].paragraph:0);
  function cueRows(source){const rows=[];for(const ch of parse(source)){let active=0;ch.paragraphs.forEach((text,i)=>{if(ch.paragraphCues)active=ch.paragraphCues[i];else ch.cues.forEach((c,j)=>{if(c.trigger&&text.toLowerCase().includes(c.trigger.toLowerCase()))active=j});rows.push({text,title:ch.title,cue:ch.cues[active]});});}return rows;}
  function plainScript(source){return source.replace(/<!--\s*cue\s+\{[^]*?\}\s*-->\s*/g,'').replace(/^# EgoEngine[^\n]*\n(?:\n)?/,'').trim()+'\n';}
  function rebuildPlain(){
    const text=$('plain-transcript').value;
    if(/<!--\s*cue/.test(text))throw Error('Use plain speaker text here; visual cue metadata is managed separately.');
    const next=parse(text);if(next.some(ch=>!ch.paragraphs.length))throw Error('Add some speaker text beneath each chapter heading.');
    const rows=cueRows(plainBase),used=new Set(),assignments=new Map();
    const normalize=s=>s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
    const items=next.flatMap(ch=>ch.paragraphs.map(text=>({ch,text})));
    // Match unchanged paragraphs first, even after they move between chapters.
    items.forEach(item=>{const exact=(row,i)=>!used.has(i)&&normalize(row.text)===normalize(item.text);let i=rows.findIndex((row,i)=>row.title===item.ch.title&&exact(row,i));if(i<0)i=rows.findIndex(exact);if(i>=0){used.add(i);assignments.set(item,rows[i].cue);}});
    let matched=assignments.size,inherited=0;
    items.forEach(item=>{if(assignments.has(item))return;const words=new Set(normalize(item.text).split(' '));let best=-1,score=.55;rows.forEach((row,i)=>{if(used.has(i))return;const other=new Set(normalize(row.text).split(' '));const intersection=[...words].filter(w=>other.has(w)).length;const similarity=2*intersection/(words.size+other.size);if(similarity>score){score=similarity;best=i;}});if(best>=0){used.add(best);assignments.set(item,rows[best].cue);matched++;}});
    const output=['# EgoEngine · practice transcript'];let at=0;
    for(const ch of next){output.push('## '+formatTime(ch.start)+' · '+ch.title);let previous=null;let cue=rows.find(row=>row.title===ch.title)?.cue||ch.cues[0];
      for(const paragraph of ch.paragraphs){const item=items[at++];if(assignments.has(item))cue=assignments.get(item);else inherited++;const clean={...cue};delete clean.trigger;
        const key=JSON.stringify(clean);if(key!==previous){output.push('<!-- cue '+key+' -->');previous=key;}output.push(paragraph);
      }
    }
    return {text:output.join('\n\n')+'\n',matched,inherited};
  }
  function plainLayout(on){plainMode=on;$('notes-view').value=on?'plain':'guided';$('notes').hidden=on;$('plain-notes').hidden=!on;document.querySelector('.notes-panel').classList.toggle('pure-text',on);$('edit-current').hidden=on;$('import-script').disabled=on;$('restore-script').disabled=on;$('guided-toggle').disabled=on;$('narration-toggle').disabled=on||!reader;}
  function openPlain(buffer=null){
    if(guided||narrating)pauseGuided();else if(running){accumulated=elapsed();running=false;$('timer-toggle').textContent='Start timer';persist();}
    plainBase=buffer?.base||serializeScript();$('plain-transcript').value=buffer?.text??plainScript(plainBase);plainLayout(true);$('plain-status').textContent=buffer?'Recovered your private editing draft.':'Full transcript · edits autosave privately in this browser.';const editor=$('plain-transcript');editor.focus();const cursor=Math.min(editor.value.length,buffer?.cursor||0);editor.setSelectionRange(cursor,cursor);editor.scrollTop=buffer?.scroll||0;
  }
  function applyPlain(){
    try{const updated=rebuildPlain(),title=chapters[current]?.title;const parsed=parse(updated.text),index=parsed.findIndex(ch=>ch.title===title);saveDraft(updated.text);load(updated.text,'Practice draft · saved in this browser',{chapter:index<0?0:index,paragraph:0});try{localStorage.removeItem(plainKey)}catch{}plainLayout(false);$('guided-status').textContent='Transcript updated · '+updated.matched+' paragraph cues retained'+(updated.inherited?'; '+updated.inherited+' new/reworked paragraphs inherit a nearby cue—review before presenting':'')+'. Timing recalculated.';return true;}catch(error){$('plain-status').textContent=error.message;return false;}
  }
  $('notes-view').onchange=()=>{if($('notes-view').value==='plain')openPlain();else if(!applyPlain())$('notes-view').value='plain';};
  $('plain-apply').onclick=applyPlain;
  $('plain-discard').onclick=()=>{try{localStorage.removeItem(plainKey)}catch{}plainLayout(false);$('guided-status').textContent='Text edits discarded; guided notes unchanged.';};
  $('plain-transcript').oninput=()=>{try{localStorage.setItem(plainKey,JSON.stringify({text:$('plain-transcript').value,base:plainBase,cursor:$('plain-transcript').selectionStart,scroll:$('plain-transcript').scrollTop,updated:new Date().toISOString()}));$('plain-status').textContent='Saved privately · switch to Guided notes to apply and recalculate timing.';}catch{$('plain-status').textContent='Storage unavailable · download the script to keep these edits.'}};
  $('download-script').onclick=()=>{let text=serializeScript();if(plainMode){try{text=rebuildPlain().text}catch{text=$('plain-transcript').value}}const blob=new Blob([text],{type:'text/markdown'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='rehearsal-script.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  function toggleTimer(){if(guided||narrating){pauseGuided();return;}if(running){accumulated=elapsed();running=false;}else{startedAt=Date.now();running=true;}$('timer-toggle').textContent=running?'Pause timer':'Start timer';persist();}
  $('timer-toggle').onclick=toggleTimer;$('timer-reset').onclick=()=>{if(guided||narrating)pauseGuided();guidedPosition=0;guidedIndex=-1;guidedFinished=false;clearPointer();clearReadingCursor();running=false;accumulated=0;$('timer-toggle').textContent='Start timer';persist();};$('target-minutes').onchange=()=>retime('target');
  $('notes-smaller').onclick=()=>{notesSize=Math.max(14,notesSize-1);document.documentElement.style.setProperty('--notes-size',notesSize+'px');persist();};$('notes-larger').onclick=()=>{notesSize=Math.min(32,notesSize+1);document.documentElement.style.setProperty('--notes-size',notesSize+'px');persist();};
  setInterval(()=>{const time=elapsed(),left=guidedIndex>=0&&timeline.length?timeline.at(-1).start+timeline.at(-1).duration-guidedTime():Number($('target-minutes').value)*60-time;$('elapsed').textContent=formatTime(time);$('remaining').textContent=formatTime(left);$('remaining').classList.toggle('overtime',left<0);$('wall-clock').textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});const end=chapters[current+1]?.start||Number($('target-minutes').value)*60;$('pace-status').textContent=guidedIndex>=0?(narrating?'Auto-read · ':guided?'Guided autoplay · ':'Guided paused · ')+$('guided-speed').value+' words/min · timing is estimated, not microphone tracking':(running?'Timer running':'Timer paused')+' · Chapter planned through '+formatTime(end)+(time>end?' · '+formatTime(time-end)+' behind this cue':'');if(lastHello)$('connection').textContent=Date.now()-lastHello<4500?'● Audience connected':'Audience disconnected · reopen with Present';},250);setInterval(persist,5000);window.addEventListener('pagehide',persist);
  let readingWord=null, readingFraction=0, cursorLine=null;
  function wrapNoteWords(prose){
    const walker=document.createTreeWalker(prose,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    let index=0;
    for(const node of nodes){const fragment=document.createDocumentFragment();for(const token of node.textContent.split(/(\s+)/)){
      if(/[\p{L}\p{N}]/u.test(token)){const word=document.createElement('span');word.className='note-word';word.dataset.word=String(index++);word.textContent=token;fragment.append(word);}else fragment.append(document.createTextNode(token));
    }node.replaceWith(fragment);}
  }
  function clearReadingCursor(){readingWord?.classList.remove('reading-word');readingWord?.removeAttribute('aria-current');readingWord=null;cursorLine=null;$('reading-cursor')?.remove();}
  function positionReadingCursor(){
    if(!readingWord?.isConnected)return;
    const notes=$('notes'),r=readingWord.getBoundingClientRect(),box=notes.getBoundingClientRect();
    let cursor=$('reading-cursor');if(!cursor){cursor=document.createElement('span');cursor.id='reading-cursor';cursor.setAttribute('aria-hidden','true');notes.append(cursor);}
    const x=r.left-box.left+notes.scrollLeft+Math.min(1,readingFraction)*r.width,y=r.top-box.top+notes.scrollTop;
    cursor.style.transition=cursorLine!==null&&Math.abs(cursorLine-y)<4&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'transform 100ms linear':'none';
    cursor.style.height=r.height+'px';cursor.style.transform='translate('+x+'px,'+y+'px)';cursorLine=y;
  }
  function updateReadingCursor(paragraph,fraction){
    const block=$('notes').querySelector('[data-paragraph="'+paragraph+'"]');if(!block)return;
    const words=block.querySelectorAll('.note-word');if(!words.length){clearReadingCursor();return;}
    const location=Math.max(0,Math.min(1,fraction))*words.length,index=Math.min(words.length-1,Math.floor(location));
    const next=words[index],changed=next!==readingWord;
    if(changed){readingWord?.classList.remove('reading-word');readingWord?.removeAttribute('aria-current');readingWord=next;readingWord.classList.add('reading-word');readingWord.setAttribute('aria-current','true');}
    readingFraction=fraction>=1?1:location-index;
    if(changed&&$('guided-follow').checked){const r=readingWord.getBoundingClientRect(),box=$('notes').getBoundingClientRect();if(r.top<box.top+10||r.bottom>box.bottom-20)$('notes').scrollBy({top:r.top-box.top-35,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
    positionReadingCursor();
  }
  $('notes').addEventListener('scroll',positionReadingCursor,{passive:true});new ResizeObserver(positionReadingCursor).observe($('notes'));
  function buildTimeline(requestedSpeed){
    const speed=Math.max(90,Math.min(220,Number(requestedSpeed??$('guided-speed').value)||145));$('guided-speed').value=speed;
    timeline=[];let time=0;
    chapters.forEach((ch,ci)=>{let active=0;ch.paragraphs.forEach((text,pi)=>{
      if(/^[-*_]{3,}$/.test(text.trim()))return;
      if(ch.paragraphCues)active=ch.paragraphCues[pi];else ch.cues.forEach((c,i)=>{if(c.trigger&&text.toLowerCase().includes(c.trigger.toLowerCase()))active=i;});
      const words=text.replace(/https?:\/\/\S+/g,'').replace(/[*#`•]/g,'').trim().split(/\s+/).length;
      const pause=text.includes('?')?.8:.25;
      const duration=Math.max(.5,words/speed*60)+pause;
      timeline.push({chapter:ci,paragraph:pi,cue:active,text,start:time,duration,pause});time+=duration;
    });});
    return time;
  }
  function syncTiming(mode){
    timingMode=mode;
    const requested=Math.max(.01,Math.min(240,Number($('target-minutes').value)||30))*60;
    let limited=false;
    if(mode==='target'){
      const longest=buildTimeline(90),shortest=buildTimeline(220);
      const target=Math.max(shortest,Math.min(longest,requested));limited=Math.abs(target-requested)>.1;
      let low=90,high=220;
      for(let i=0;i<32;i++){const middle=(low+high)/2;if(buildTimeline(middle)>target)low=middle;else high=middle;}
      buildTimeline(Math.round((low+high)/2*10)/10);
    }else buildTimeline();
    const total=timeline.length?timeline.at(-1).start+timeline.at(-1).duration:0;
    $('target-minutes').value=(total/60).toFixed(2);
    $('timing-link').textContent=limited?'Requested '+(requested/60).toFixed(1)+' min is outside the 90–220 wpm range. Set to the nearest achievable duration: '+(total/60).toFixed(2)+' min.':'Linked for the full script · includes short breaths; visuals move while you speak.';
  }
  function retime(mode){
    const entry=timeline[guidedIndex];
    const offset=entry?Math.max(0,guidedTime()-entry.start):0;
    const speech=entry?entry.duration-entry.pause:0;
    const fraction=entry?Math.min(1,offset/speech):0;
    const pauseOffset=entry?Math.max(0,offset-speech):0;
    if(guided||narrating)pauseGuided();
    syncTiming(mode);
    if(entry){const next=timeline[guidedIndex];guidedPosition=next.start+fraction*(next.duration-next.pause)+Math.min(pauseOffset,next.pause);guidedStarted=Date.now();tickGuided(true);}
    $('guided-status').textContent='Timing updated'+(entry?' · position kept; resume when ready':' · ready to present');
    persist();
  }
  const guidedTime=()=>guidedPosition+(guided?(Date.now()-guidedStarted)/1000:0);
  function pauseGuided(){stopNarration();command('pause');if(guided){guidedPosition=guidedTime();guided=false;}if(running){accumulated=elapsed();running=false;}$('guided-toggle').textContent='▶ Resume guided';$('timer-toggle').textContent='Start timer';persist();}
  function clearPointer(){pointer=null;pointerKey='';const d=packet('pointer',{pointer:null});channel?.postMessage(d);audience?.postMessage(d,location.origin);$('current-preview').contentWindow?.postMessage(d,location.origin);}
  function seekGuidedChapter(i){if(narrating)pauseGuided();clearReadingCursor();const entry=timeline.find(e=>e.chapter===Math.max(0,Math.min(chapters.length-1,i)));if(!entry)return;guidedPosition=entry.start;guidedStarted=Date.now();guidedIndex=-1;guidedFinished=false;clearPointer();}
  function moveToEntry(index,fraction=0){if(narrating)pauseGuided();const entry=timeline[index];if(!entry)return;guidedPosition=entry.start+fraction*(entry.duration-entry.pause);guidedStarted=Date.now();guidedIndex=-1;guidedFinished=false;tickGuided(true);}
  function pointerFor(entry,fraction){const point=visualPointerFor(entry,fraction);return {...(point||{}),passageText:spokenSentence(entry.text,fraction),passageHint:chapters[entry.chapter].cues[entry.cue].point?.label||''};}
  function visualPointerFor(entry,fraction){
    const v=chapters[entry.chapter].cues[entry.cue], text=entry.text;
    if(v.panel==='gaps'){const action=/action gap|fundamental|recover the human|retargeting|morphology|contact dynamics/i.test(text);const both=/identifies two gaps/i.test(text);const split=text.indexOf('The second');const gap=both?null:action||(split>=0&&fraction>=text.slice(0,split).split(/\s+/).length/text.split(/\s+/).length)?'action':'visual';return {gap,match:gap==='action'?'Action gap':gap==='visual'?'Visual gap':'Visual gap',label:v.label};}
    if(v.kind==='discussion'){const example=/3D reconstruction|geometry/i.test(text)?'bilawal':/world models|controllers/i.test(text)?'dmytro':/tactile|depth|force sensing/i.test(text)?'kingston':/multimodal|obvious directions/i.test(text)?'lingxiao':null;return example?{example,label:'Discussion example'}:null;}
    if(v.point&&v.target?.startsWith('S3.SS2.SSS2')&&['Replay','MPC','RL'].includes(v.point.label))return {element:true,label:v.point.label};
    if(v.point)return v.point;
    if(v.panel==='glossary'&&v.terms?.includes('Glove-based teleoperation')&&v.terms?.includes('Hand-as-interface')){if(!/glove-based|hand-as-interface/i.test(text))return {element:true,label:v.label};const words=text.split(/\s+/);const switchAt=words.findIndex(w=>/^Hand-as-interface/i.test(w));const term=switchAt>=0&&fraction>=switchAt/words.length?'Hand-as-interface':'Glove-based teleoperation';return {element:true,label:term,glossaryTerm:term};}
    if(v.target==='authors'){const quotes={essay:'A visually plausible robot demonstration',thread:'The web is full',coauthor:'effect-driven retargeting',real2sim:'the bottleneck would be real2sim'};return {label:v.source==='essay'?'The authors’ perspective':v.label,match:quotes[v.source||'essay'],source:v.source||'essay'};}
    const terms=[['Replay','Replay'],['MPC','MPC'],['RL','RL'],['Mink','Mink'],['Spider','Spider'],['H2S2R','H2S2R'],['Phantom','Phantom'],['EgoEngine','EgoEngine'],['DINOv2','DINOv2'],['ResNet-18','ResNet18'],['VGG16','VGG16'],['TACO','TACO'],['Aria','Aria'],['Mustard','Mustard'],['Drawer','Drawer'],['Flower','Flower'],['Hammer','Hammer'],['position','position'],['orientation','orientation'],['three percent','Human'],['five percent','Visual'],['forty-three percent','Action'],['fifty-one percent','EgoEngine']];
    const hits=[];for(const [term,match] of terms){const re=new RegExp('\\b'+term+'\\b','gi');for(const found of text.matchAll(re))hits.push({at:found.index/Math.max(1,text.length),label:term,match});}
    hits.sort((a,b)=>a.at-b.at);const hit=hits.filter(x=>x.at<=fraction+.025).at(-1);if(!hit)return {element:true,label:v.label};
    const result={label:hit.label,match:hit.match};
    if(v.target==='S3.F2'||v.focus==='S3.F2'){const regions={Replay:[.33,.60],MPC:[.50,.60],RL:[.67,.60],Mink:[.12,.47],Spider:[.50,.60],H2S2R:[.67,.60]};if(regions[hit.label])result.region=regions[hit.label];else return null;}
    return result;
  }
  function tickGuided(force=false){
    if(!timeline.length||(!guided&&!force))return;
    const time=guidedTime(),total=timeline.at(-1).start+timeline.at(-1).duration;
    if(time>=total){pauseGuided();guidedFinished=true;$('guided-toggle').textContent='↻ Replay guided';$('guided-status').textContent='Complete · leave the audience view open for questions';$('guided-progress').value=1;clearPointer();clearReadingCursor();return;}
    let index=timeline.findIndex(e=>time<e.start+e.duration);if(index<0)index=timeline.length-1;const entry=timeline[index];
    if(index!==guidedIndex){const chapterChanged=current!==entry.chapter,visualChanged=chapterChanged||cue!==entry.cue;current=entry.chapter;cue=entry.cue;guidedIndex=index;pointer=null;pointerKey='';paint(chapterChanged);const blocks=[...$('notes').querySelectorAll(':scope > [data-paragraph]')];blocks.forEach((el,i)=>{el.classList.toggle('spoken-current',i===entry.paragraph);el.classList.toggle('spoken-done',i<entry.paragraph);});const el=blocks[entry.paragraph];if(el&&$('guided-follow').checked){const box=el.getBoundingClientRect(),parent=$('notes').getBoundingClientRect();$('notes').scrollTo({top:$('notes').scrollTop+box.top-parent.top-10,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
      if(visualChanged&&(chapters[current].cues[cue].kind==='video'||chapters[current].cues[cue].target==='coffee-analogy'))command('resume');
    }
    const within=time-entry.start,speech=entry.duration-entry.pause,fraction=Math.min(1,within/speech);
    updateReadingCursor(entry.paragraph,fraction);
    $('guided-progress').value=Math.min(1,within/entry.duration);
    $('guided-status').textContent=(within>=speech?'Brief breath':'Speak paragraph '+(entry.paragraph+1))+' · '+formatTime(total-time)+' guided remaining';
    const nextPointer=pointerFor(entry,fraction),key=JSON.stringify(nextPointer);
    if(key!==pointerKey){pointerKey=key;pointer=nextPointer;const d=packet('pointer',{pointer});channel?.postMessage(d);audience?.postMessage(d,location.origin);$('current-preview').contentWindow?.postMessage(d,location.origin);}
  }
  $('guided-toggle').onclick=()=>{if(guided||narrating){pauseGuided();return;}if(guidedFinished){guidedPosition=0;guidedIndex=-1;guidedFinished=false;}else if(guidedIndex<0)seekGuidedChapter(current);guided=true;guidedStarted=Date.now();if(!running){startedAt=Date.now();running=true;}$('timer-toggle').textContent='Pause timer';$('guided-toggle').textContent='Ⅱ Pause guided';tickGuided();if((chapters[current].cues[cue].kind==='video'||chapters[current].cues[cue].target==='coffee-analogy'))command('resume');};
  function stopNarration(){if(!narrating)return;narrating=false;narrationRun++;reader?.stop();$('narration-toggle').textContent='🔊 Resume reading';$('narration-status').textContent='Reading paused · resumes from the current word.';}
  function startNarration(){
    if(!reader||!timeline.length)return;
    if(guided)pauseGuided();
    if(guidedFinished){guidedPosition=0;guidedIndex=-1;guidedFinished=false;}
    if(guidedIndex<0)seekGuidedChapter(current);
    narrating=true;const run=++narrationRun;
    $('narration-toggle').textContent='Ⅱ Pause reading';$('narration-status').textContent=$('narration-voice').value==='recorded-samantha'?'Recorded voice · estimated word cursor; visuals follow the notes.':'Reading aloud · voice follows notes and animation cues.';
    if(!running){startedAt=Date.now();running=true;}$('timer-toggle').textContent='Pause timer';
    let index=timeline.findIndex(e=>guidedPosition<e.start+e.duration);if(index<0)index=0;
    const speakEntry=()=>{
      if(!narrating||run!==narrationRun)return;
      const entry=timeline[index];if(!entry){pauseGuided();guidedFinished=true;$('narration-toggle').textContent='🔊 Read again';$('narration-status').textContent='Reading complete.';return;}
      const fraction=Math.max(0,Math.min(.999,(guidedPosition-entry.start)/(entry.duration-entry.pause)));
      guidedPosition=entry.start+fraction*(entry.duration-entry.pause);guidedIndex=-1;tickGuided(true);
      const block=$('notes').querySelector('[data-paragraph="'+entry.paragraph+'"]');
      const words=[...block.querySelectorAll('.note-word')].map(w=>w.textContent);const text=words.join(' ');
      const voice=window.speechSynthesis.getVoices().find(v=>v.voiceURI===$('narration-voice').value);
      const recorded=$('narration-voice').value==='recorded-samantha';
      const read=recorded?reader.readRecording.bind(reader):reader.read.bind(reader);
      read(text,{voice,rate:Number($('guided-speed').value)/175,startWord:Math.floor(fraction*words.length),
        onprogress:f=>{if(!narrating||run!==narrationRun)return;guidedPosition=entry.start+f*(entry.duration-entry.pause);tickGuided(true);$('guided-status').textContent='Reading paragraph '+(entry.paragraph+1)+' · speech-led cues';},
        onend:()=>{if(!narrating||run!==narrationRun)return;index++;guidedPosition=timeline[index]?.start||entry.start+entry.duration;speakEntry();},
        onerror:error=>{if(run!==narrationRun)return;pauseGuided();$('narration-status').textContent=error==='notes-changed'?'These notes differ from the recording. Choose a browser voice to read your edits.':'Voice could not play ('+error+'). Choose Samantha · recorded or another voice and resume.';}
      });
      if(chapters[current].cues[cue].kind==='video'||chapters[current].cues[cue].target==='coffee-analogy')command('resume');
    };speakEntry();
  }
  function populateVoices(){if(!reader)return;const select=$('narration-voice');let selected=select.value;try{selected=selected||localStorage.getItem('egoengine-reading-voice')||'';}catch{}select.replaceChildren(new Option('Samantha · recorded script','recorded-samantha'),new Option('Browser default',''));for(const voice of window.speechSynthesis.getVoices().sort((a,b)=>Number(/^en/i.test(b.lang))-Number(/^en/i.test(a.lang))))select.append(new Option(voice.name+' · '+voice.lang,voice.voiceURI));select.value=selected&&[...select.options].some(o=>o.value===selected)?selected:'recorded-samantha';}
  $('narration-toggle').onclick=()=>narrating?pauseGuided():startNarration();
  $('narration-voice').onchange=()=>{try{localStorage.setItem('egoengine-reading-voice',$('narration-voice').value);}catch{}if(narrating){pauseGuided();startNarration();}};
  if(reader){populateVoices();window.speechSynthesis.addEventListener('voiceschanged',populateVoices);}else{$('narration-toggle').disabled=true;$('narration-status').textContent='Speech synthesis is unavailable in this browser; guided autoplay still works.';}
  window.addEventListener('pagehide',()=>reader?.stop());
  $('guided-speed').onchange=()=>retime('speed');
  $('notes').addEventListener('click',e=>{if(e.target.closest('button,a'))return;const block=e.target.closest('[data-paragraph]');if(!block)return;const index=timeline.findIndex(x=>x.chapter===current&&x.paragraph===Number(block.dataset.paragraph));if(index>=0){const word=e.target.closest('.note-word');const count=block.querySelectorAll('.note-word').length;moveToEntry(index,word&&count?Number(word.dataset.word)/count:0);}});
  setInterval(()=>tickGuided(),100);
  function populateScreens(){const select=$('display-select');select.replaceChildren();details.screens.forEach((screen,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=(screen.label||'Display '+(i+1))+(screen===details.currentScreen?' · this screen':'');select.append(o);});const preferred=details.screens.findIndex(s=>s!==details.currentScreen);select.value=String(preferred<0?0:preferred);}
  $('detect-displays').onclick=async()=>{if(!window.getScreenDetails){$('connection').textContent='Automatic display placement unavailable. Drag the audience window to your display.';return;}try{details=await window.getScreenDetails();populateScreens();details.addEventListener('screenschange',populateScreens);$('connection').textContent=details.screens.length>1?'External display detected · click Present':'One display detected · audience opens separately';}catch{$('connection').textContent='Display access not granted. You can still open and move the audience window.';}};
  $('open-audience').onclick=()=>{const screen=details?.screens[Number($('display-select').value)];const features=screen?`popup=yes,left=${screen.availLeft},top=${screen.availTop},width=${screen.availWidth},height=${screen.availHeight}`:'popup=yes,width=1280,height=800';const url=new URL('presenter.html',location.href);url.search='?v='+release+'&view=audience&session='+session;audience=window.open(url.href,'egoengine-audience-'+session,features);if(!audience){$('connection').textContent='Popup blocked. Allow popups for this site, then click Present again.';return;}if(screen){try{audience.moveTo(screen.availLeft,screen.availTop);audience.resizeTo(screen.availWidth,screen.availHeight);}catch{}}$('connection').textContent='Audience window opened · click Fullscreen there';send();};
  window.addEventListener('keydown',e=>{if(plainMode||$('edit-dialog').open||e.target.closest('input,textarea,select')||(e.key===' '&&e.target.closest('button,a'))||e.ctrlKey||e.metaKey||e.altKey||!chapters.length)return;const key=e.key.toLowerCase();if(['arrowright','pagedown','arrowleft','pageup',' ','n','b','t'].includes(key)){e.preventDefault();if(['arrowright','pagedown'].includes(key))selectChapter(current+1);if(['arrowleft','pageup'].includes(key))selectChapter(current-1);if(key===' '||key==='n')advance();if(key==='b'){blank=!blank;paint();}if(key==='t')toggleTimer();}});
  try{const r=await fetch('index.html');const doc=new DOMParser().parseFromString(await r.text(),'text/html');doc.querySelectorAll('figure[id]').forEach(el=>{const m=el.querySelector('figcaption')?.textContent.match(/\b(Figure|Table)\s+([A-E]\.\d+|\d+)/);if(m)referenceIds[m[1]+' '+m[2]]=el.id;});doc.querySelectorAll('[id]').forEach(el=>{if(/\.E\d+$/.test(el.id))referenceIds['Equation '+el.id.split('.E')[1]]=el.id;});let draft=null;try{draft=JSON.parse(localStorage.getItem(draftKey)||'null')}catch{}if(draft?.text){try{load(draft.text,'Practice draft · saved in this browser')}catch{await loadBundled();}}else await loadBundled();let buffer=null;try{buffer=JSON.parse(localStorage.getItem(plainKey)||'null')}catch{}if(typeof buffer?.text==='string'&&typeof buffer?.base==='string')openPlain(buffer);}catch(e){$('script-name').textContent=e.message;}
}
