'use strict';
const $=id=>document.getElementById(id), article=document.querySelector('article');
const KEY='egoengine-reading-2606.12604v1-v1';
const highlightColors={yellow:'#fff0a6',green:'#c9edcb',blue:'#cce4ff',pink:'#ffd5e4',purple:'#e3d5ff'};
const highlightColor=m=>highlightColors[m?.color]||highlightColors.yellow;
let readingView='paper';
try{readingView=localStorage.getItem(KEY+'-view')==='sentences'?'sentences':'paper';const c=localStorage.getItem(KEY+'-highlight-color');if(highlightColors[c])$('highlight-color').value=c}catch{}
$('reading-view').value=readingView;
$('reading-view').onchange=()=>{readingView=$('reading-view').value;try{localStorage.setItem(KEY+'-view',readingView)}catch{}paint();getSelection().removeAllRanges()};
$('highlight-color').onchange=()=>{try{localStorage.setItem(KEY+'-highlight-color',$('highlight-color').value)}catch{}};

const blocks=[...article.querySelectorAll('p.ltx_p,figcaption,table.ltx_equation')].filter(el=>!el.parentElement.closest('p.ltx_p,figcaption,table.ltx_equation'));
const originals=new Map();
blocks.forEach((el,i)=>{el.dataset.block=el.id||`passage-${i}`;originals.set(el.dataset.block,el.innerHTML)});
const blockById=id=>blocks.find(el=>el.dataset.block===id);
let state={paper:'2606.12604v1',notes:[],marks:[]}, context=null, editing=null;
function validRange(r){const el=blockById(r?.block);return !!el&&Number.isInteger(r.start)&&Number.isInteger(r.end)&&r.start>=0&&r.end>r.start&&r.end<=el.textContent.length}
function validState(s){return s&&s.paper==='2606.12604v1'&&Array.isArray(s.notes)&&Array.isArray(s.marks)&&s.notes.every(n=>typeof n.id==='string'&&typeof n.text==='string'&&typeof n.kind==='string'&&typeof n.url==='string'&&(!n.anchor||validRange(n.anchor))&&(!n.url||safeURL(n.url)))&&s.marks.every(m=>typeof m.id==='string'&&['highlight','removed'].includes(m.type)&&validRange(m))}
function safeURL(value){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.href:null}catch{return null}}
function toast(msg){$('notice').textContent=msg;$('notice').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('notice').hidden=true,3500)}
try{const raw=localStorage.getItem(KEY);if(raw){const loaded=JSON.parse(raw);if(!validState(loaded))throw Error();state=loaded}}catch{$('save-status').textContent='Could not load saved notes; export before closing'}
const VERSIONS_KEY=KEY+'-named-versions';
let versionStore={defaultName:'lnxu',activeName:'lnxu',versions:[]};
try{
 const stored=JSON.parse(localStorage.getItem(VERSIONS_KEY)||'null');
 if(stored&&Array.isArray(stored.versions)){
  versionStore={defaultName:stored.defaultName||'lnxu',activeName:stored.defaultName||'lnxu',versions:stored.versions.filter(v=>typeof v.name==='string'&&validState(v.state))};
  const chosen=versionStore.versions.find(v=>v.name===versionStore.defaultName);if(chosen)state=structuredClone(chosen.state);
 }
 if(!versionStore.versions.length){versionStore={defaultName:'lnxu',activeName:'lnxu',versions:[{name:'lnxu',state:structuredClone(state),updated:new Date().toISOString()}]};localStorage.setItem(VERSIONS_KEY,JSON.stringify(versionStore))}
}catch{toast('Named versions could not be loaded; your current notes remain available.')}
function persistNamedVersion(){const entry={name:versionStore.activeName,state:structuredClone(state),updated:new Date().toISOString()};const i=versionStore.versions.findIndex(v=>v.name===entry.name);if(i<0)versionStore.versions.push(entry);else versionStore.versions[i]=entry;localStorage.setItem(VERSIONS_KEY,JSON.stringify(versionStore));}
const undoStack=[],redoStack=[];
const snapshot=()=>JSON.stringify(state);
function updateHistory(){ $('undo').disabled=!undoStack.length; $('redo').disabled=!redoStack.length; }
function checkpoint(){undoStack.push(snapshot());if(undoStack.length>100)undoStack.shift();redoStack.length=0;updateHistory()}
function travelHistory(from,to,label){if(!from.length)return;to.push(snapshot());state=JSON.parse(from.pop());resetEditor();paint();save();updateHistory();toast(label)}
$('undo').onclick=()=>travelHistory(undoStack,redoStack,'Change undone.');
$('redo').onclick=()=>travelHistory(redoStack,undoStack,'Change redone.');
$('reset-paper').onclick=()=>{
 if(!state.marks.length){toast('The paper is already in its original state.');return}
 checkpoint();state.marks=[];
 paint();setContext(null);getSelection().removeAllRanges();save();
 toast('Original paper restored. Notes and links kept. Undo is available.');
};
document.addEventListener('keydown',e=>{
 if(!(e.metaKey||e.ctrlKey)||e.altKey||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
 const key=e.key.toLowerCase();
 if(key==='z'){e.preventDefault();(e.shiftKey?$('redo'):$('undo')).click()}
 else if(key==='y'){e.preventDefault();$('redo').click()}
});
let removalMode='visible';
try{removalMode=localStorage.getItem(KEY+'-removal-mode')==='hidden'?'hidden':'visible'}catch{}
$('removal-mode').value=removalMode;
article.dataset.removalMode=removalMode;
$('removal-mode').onchange=()=>{
 removalMode=$('removal-mode').value;article.dataset.removalMode=removalMode;
 try{localStorage.setItem(KEY+'-removal-mode',removalMode)}catch{toast('Display preference could not be saved.')}
 paint();
};
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));persistNamedVersion();$('save-status').textContent='Saved · '+versionStore.activeName}catch{$('save-status').textContent='Storage unavailable — export your notes';toast('Please export your notes to keep this session.')}renderNotes();renderCommentStickers()}
function newId(){return globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`}
function setContext(c){context=c;blocks.forEach(el=>el.classList.toggle('active-block',el.dataset.block===c?.block));$('context-label').textContent=c?'Selected passage':'Paper-level note';$('context').textContent=c?.quote||'';$('context').classList.toggle('hidden',!c);$('clear-context').classList.toggle('hidden',!c);$('highlight').disabled=!c;$('remove-content').disabled=!c;renderNotes()}
function capture(){const sel=getSelection();if(!sel.rangeCount||sel.isCollapsed)return;const range=sel.getRangeAt(0);const el=(range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentElement).closest('[data-block]');const end=(range.endContainer.nodeType===1?range.endContainer:range.endContainer.parentElement).closest('[data-block]');if(!el||el!==end){if(article.contains(range.startContainer))toast('Select text within one paragraph, caption, or equation.');return}const before=range.cloneRange();before.selectNodeContents(el);before.setEnd(range.startContainer,range.startOffset);const start=before.toString().length;setContext({block:el.dataset.block,start,end:start+range.toString().length,quote:range.toString()});window.openReaderPanel?.('notes')}
article.addEventListener('mouseup',capture);article.addEventListener('keyup',capture);
article.addEventListener('click',e=>{if(e.target.closest('a,button,.solver-term')||getSelection().toString())return;const el=e.target.closest('[data-block]');if(el){const sentence=e.target.closest('.sentence-item');if(sentence){const r=document.createRange();r.selectNodeContents(el);r.setEndBefore(sentence);const start=r.toString().length;setContext({block:el.dataset.block,start,end:start+sentence.textContent.length,quote:sentence.textContent})}else setContext({block:el.dataset.block,start:0,end:el.textContent.length,quote:el.textContent})}});
$('clear-context').onclick=()=>{setContext(null);getSelection().removeAllRanges()};
// Keep the source MathML text in the light DOM so saved annotation offsets
// stay stable. Typeset formulas in a shadow root using the bundled renderer.
function typesetMath(){
 if(!window.katex)return;
 for(const math of article.querySelectorAll('math')){
  if(math.previousElementSibling?.classList.contains('rendered-math'))math.previousElementSibling.remove();
  if(math.dataset.typeset){math.style.display=math.dataset.mathDisplay||'';delete math.dataset.typeset}
  if(math.dataset.removed==='true'&&removalMode==='hidden'){math.style.display='none';continue}
  try{
   const markup=katex.renderToString(math.getAttribute('alttext')||'',{
    displayMode:math.getAttribute('display')==='block',output:'mathml',throwOnError:true,
    macros:{"\\mathbbm":"\\mathbb"},strict:'ignore',trust:false
   });
   const host=document.createElement('span');
   host.className='rendered-math '+(math.getAttribute('display')==='block'?'math-display':'math-inline');
   host.style.background=math.style.background;
   if(math.dataset.removed==='true')host.classList.add('removed-formula');
   host.attachShadow({mode:'open'}).innerHTML=markup+'<slot></slot>';
   math.before(host);math.dataset.mathDisplay=math.style.display;math.dataset.typeset='true';
   math.style.display='none';math.setAttribute('aria-hidden','true');
  }catch{/* Keep the original native MathML if a source expression is unsupported. */}
 }
}
// Wrapping never changes textContent: saved passage offsets work in both views.
function sentenceEnds(text){
 const segments=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('en',{granularity:'sentence'}).segment(text)]:[...text.matchAll(/[^.!?]+[.!?]+(?:\s+|$)|.+$/g)].map(m=>({segment:m[0],index:m.index}));
 return segments.filter((s,i)=>i===segments.length-1||!/(?:\b(?:Fig|Figs|Sec|Secs|Eq|Eqs|Dr|Prof|Mr|Mrs|vs|al)|e\.g|i\.e)\.\s*$/i.test(s.segment)).map(s=>s.index+s.segment.length);
}
function maskedPassage(el){
 let text=el.textContent;
 for(const n of [...el.querySelectorAll('math,a')].filter(n=>!n.parentElement.closest('math,a'))){
  const range=document.createRange();range.selectNodeContents(el);range.setEndBefore(n);
  const start=range.toString().length;text=text.slice(0,start)+'x'.repeat(n.textContent.length)+text.slice(start+n.textContent.length);
 }
 return text;
}
function renderCommentStickers(){
 article.querySelectorAll('.comment-sticker').forEach(el=>el.remove());
 article.querySelectorAll('.comment-anchor').forEach(el=>el.replaceWith(...el.childNodes));
 article.querySelectorAll('.commented-formula').forEach(el=>el.classList.remove('commented-formula'));
 for(const el of blocks){
  const notes=state.notes.filter(n=>n.anchor?.block===el.dataset.block);if(!notes.length)continue;
  const groups=new Map();
  for(const note of notes){const key=note.anchor.start+':'+note.anchor.end;if(!groups.has(key))groups.set(key,{start:note.anchor.start,end:note.anchor.end,notes:[],target:null});groups.get(key).notes.push(note)}
  const ranges=[...groups.values()];
  const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);const nodes=[];let offset=0;
  while(walker.nextNode()){const n=walker.currentNode;nodes.push({n,start:offset,end:offset+n.length});offset+=n.length}
  for(const {n,start,end} of nodes){
   const hits=ranges.filter(r=>r.start<end&&r.end>start);if(!hits.length)continue;
   const math=n.parentElement.closest('math');
   if(math){const host=math.previousElementSibling?.classList.contains('rendered-math')?math.previousElementSibling:math;host.classList.add('commented-formula');for(const hit of hits)if(!hit.target)hit.target=host;continue}
   const cuts=[start,end,...hits.flatMap(r=>[Math.max(start,r.start),Math.min(end,r.end)])].filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b);
   const frag=document.createDocumentFragment();
   for(let i=0;i<cuts.length-1;i++){
    const a=cuts[i],b=cuts[i+1],attached=hits.filter(r=>r.start<b&&r.end>a),text=n.textContent.slice(a-start,b-start);
    if(!attached.length){frag.append(document.createTextNode(text));continue}
    const phrase=document.createElement('span');phrase.className='comment-anchor';phrase.textContent=text;frag.append(phrase);
    if(text.trim())for(const hit of attached)if(!hit.target)hit.target=phrase;
   }
   n.replaceWith(frag);
  }
  for(const group of ranges){
   const attached=group.notes,sticker=document.createElement('button');sticker.type='button';sticker.className='comment-sticker';
   sticker.dataset.count=attached.length>1?String(attached.length):'';
   sticker.setAttribute('aria-label',`Open ${attached.length===1?'comment':attached.length+' comments'} on “${attached[0].anchor.quote.slice(0,100)}”`);
   sticker.title=attached.map(n=>n.text||n.url).join(' • ').slice(0,300);
   // CSS supplies the emoji; markers and underlines never alter saved text offsets.
   sticker.onclick=event=>{event.stopPropagation();window.openReaderPanel?.('notes');getSelection().removeAllRanges();$('filter').value='passage';setContext(attached[0].anchor);
    const card=[...$('notes').children].find(c=>c.dataset.noteId===attached[0].id);
    if(card){card.scrollIntoView({behavior:'smooth',block:'nearest'});card.focus({preventScroll:true});card.classList.add('flash')}
   };
   if(group.target){const count=group.target.querySelectorAll(':scope > .comment-sticker').length;sticker.style.setProperty('--sticker-offset',String(count));group.target.append(sticker)}
  }
 }
}
function applyReadingView(){
 for(const el of blocks){
  if(el.dataset.sentenceList){el.removeAttribute('role');delete el.dataset.sentenceList}
  if(readingView!=='sentences'||!el.matches('p.ltx_p')||el.closest('figure,table,.ltx_bibliography')||!el.textContent.trim())continue;
  // Math and citations are atomic, even when their source text contains periods.
  const masked=maskedPassage(el);
  const ends=sentenceEnds(masked);let start=0;const ranges=ends.map(end=>{const r={start,end};start=end;return r});
  const list=document.createDocumentFragment();
  for(const {start,end} of ranges){
   if(end<=start)continue;
   const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let offset=0,from=null,to=null;
   while(walker.nextNode()){const n=walker.currentNode,len=n.length;if(!from&&start<offset+len)from=[n,start-offset];if(end<=offset+len){to=[n,end-offset];break}offset+=len}
   if(!from||!to)continue;
   const r=document.createRange();r.setStart(...from);r.setEnd(...to);const item=document.createElement('span');item.className='sentence-item';item.setAttribute('role','listitem');item.append(r.cloneContents());list.append(item);
  }
  el.replaceChildren(list);el.setAttribute('role','list');el.dataset.sentenceList='true';
 }
}
const solverInfo={
 mcts:{title:'MCTS-style → adaptive mode switching',summary:'Standard Monte Carlo Tree Search explores a tree of choices, uses simulated outcomes to estimate which branches are promising, and balances exploration with reusing good choices.',detail:'EgoEngine borrows the progressive-search idea: try Replay for a trajectory chunk, escalate to MPC, then RL if refinement is still needed. It jointly optimizes the current and next chunk, but executes only the current one once both are feasible. The paper calls this a lightweight, heuristic strategy—not a full MCTS algorithm. Its purpose is to use the cheapest solver that produces a feasible rollout.',url:'https://arxiv.org/html/2606.12604v1#S3.SS2.SSS2',evidence:'EgoEngine’s specific use is described in §3.2.2, “MCTS-style Adaptive Mode Switching.”'},
 replay:{title:'Replay → Mink [49]',summary:'Mink is a MuJoCo-based inverse-kinematics library. EgoEngine uses it to retarget human fingertip and wrist poses into a reference robot trajectory.',detail:'The Replay baseline directly executes that reference, without action refinement. It is the cheapest first attempt, but a matching pose does not guarantee stable contact or the intended object motion.',url:'https://github.com/kevinzakka/mink'},
 mpc:{title:'MPC → SPIDER [32]',summary:'MPC means model predictive control. In EgoEngine’s experiments, SPIDER is the local trajectory-optimization baseline.',detail:'The method section describes sampling short-horizon actions around the reference and testing them in simulation. This corrects local errors at moderate cost; EgoEngine escalates beyond Replay when the object-tracking criterion is not met.',url:'https://arxiv.org/abs/2511.09484'},
 rl:{title:'RL → H2S2R [30]',summary:'RL means reinforcement learning. H2S2R refers to Human2Sim2Robot, cited as “Crossing the Human-Robot Embodiment Gap with Sim-to-Real RL using One Human Demonstration.”',detail:'In EgoEngine’s RL mode, PPO trains a hand policy to add a residual correction to the reference command, using hand state, object pose, and the reference command. This stronger refinement targets difficult chunks. It is separate from the final image-conditioned policy trained on generated data.',url:'https://arxiv.org/abs/2504.12609'}
};
Object.assign(solverInfo,{
 "sam2": {
  "label": "SAM2",
  "title": "SAM2 → human and object masks [47]",
  "summary": "SAM2 segments and tracks regions in images and video. EgoEngine uses it to identify both the demonstrator and the manipulated object.",
  "detail": "Hand-keypoint prompts produce arm–hand masks for human removal; a first-frame point prompt tracks the task object through the clip. The object masks also support pose estimation.",
  "url": "https://arxiv.org/html/2606.12604v1#bib.bib47",
  "section": "S3.SS1",
  "sectionLabel": "§3.1 · Digital twin reconstruction"
 },
 "foundationstereo": {
  "label": "FoundationStereo",
  "title": "FoundationStereo → depth estimation [46]",
  "summary": "FoundationStereo supplies the depth maps used to reconstruct the scene from the recorded frames.",
  "detail": "EgoEngine combines these depth estimates with RGB frames, object masks, and an object mesh to recover object motion and build the shared digital twin.",
  "url": "https://arxiv.org/abs/2501.09898",
  "section": "S3.SS1",
  "sectionLabel": "§3.1 · Digital twin reconstruction"
 },
 "foundationpose": {
  "label": "FoundationPose",
  "title": "FoundationPose → 6D object tracking [48]",
  "summary": "FoundationPose estimates the object’s 3D position and orientation over time.",
  "detail": "In EgoEngine, RGB-D frames, tracked object masks, and a known object mesh produce the reference object trajectory. The action branch then tries to reproduce this object motion in simulation.",
  "url": "https://arxiv.org/html/2606.12604v1#bib.bib48",
  "section": "S3.SS1",
  "sectionLabel": "§3.1 · Digital twin reconstruction"
 },
 "inpaint": {
  "label": "Inpaint-Anything",
  "title": "Inpaint-Anything v2 → human removal [58]",
  "summary": "Image inpainting fills the regions occupied by the human arms and hands.",
  "detail": "EgoEngine uses the SAM2 masks to remove the demonstrator and recover the background and object content before compositing the rendered robot into the frame.",
  "url": "https://arxiv.org/abs/2304.06790",
  "section": "S3.SS3",
  "sectionLabel": "§3.3 · Visual generation"
 },
 "hpt": {
  "label": "HPT",
  "title": "HPT → downstream visuomotor policy [59]",
  "summary": "HPT provides the policy architecture that learns from the generated robot observations and actions.",
  "detail": "EgoEngine combines RGB and proprioceptive tokens in a transformer. The appendix specifies a flow-matching action head; this deployed policy is separate from the residual RL solver used during data generation.",
  "url": "https://arxiv.org/abs/2409.20537",
  "section": "A4",
  "sectionLabel": "Appendix D · Policy training"
 },
 "sam3d": {
  "label": "SAM3D",
  "title": "SAM3D → object reconstruction [66]",
  "summary": "SAM3D is discussed as a way to automate reconstruction of task-relevant objects from egocentric observations.",
  "detail": "The appendix presents reconstruction examples from EgoDex and EgoVerse to motivate broader data generation. Digital-twin construction still remains a practical requirement and a stated scalability bottleneck.",
  "url": "https://arxiv.org/abs/2511.16624",
  "section": "A1",
  "sectionLabel": "Appendix A · Digital twin reconstruction"
 },
 "ppo": {
  "label": "PPO",
  "title": "PPO → residual policy optimization [50, 51]",
  "summary": "Proximal Policy Optimization trains the residual hand policy used for difficult trajectory chunks.",
  "detail": "The policy adds corrections to reference commands and is optimized in simulation using object tracking and auxiliary rewards. It refines demonstration actions rather than training the final image-conditioned controller.",
  "url": "https://arxiv.org/abs/1707.06347",
  "section": "S3.SS2.SSS2",
  "sectionLabel": "§3.2.2 · Action refinement"
 },
 "apriltag": {
  "label": "AprilTag",
  "title": "AprilTag → coordinate alignment",
  "summary": "A visible AprilTag acts as a common geometric anchor between human recordings and the robot.",
  "detail": "For Aria tasks, tag observations and robot kinematics transform human hand and object trajectories into robot coordinates. TACO instead uses an approximate base placement from object geometry.",
  "url": "https://arxiv.org/html/2606.12604v1#A1",
  "section": "A1",
  "sectionLabel": "Appendix A · Calibration"
 }
});
for(const [key,info] of Object.entries(solverInfo)){if(!info.label)continue;const button=document.createElement('button');button.dataset.solver=key;button.textContent=info.label;button.hidden=true;document.querySelector('.solver-guide .tools').append(button)}
const methodFormulas={
 "replay": [
  {
   "label": "EgoEngine retargeting · Eq. (1)",
   "tex": "q_t^*=\\arg\\min_{q\\in\\mathcal Q}\\;\\mathcal L_{\\rm tip}(q;t)+\\lambda_w\\mathcal L_{\\rm wrist}(q;t)",
   "text": "q is the robot configuration; the losses align fingertip poses and wrist orientation. Q enforces joint and self-collision limits. Mink solves differential IK; replaying this kinematic reference does not optimize object dynamics.",
   "url": "https://arxiv.org/html/2606.12604v1#S3.E1"
  }
 ],
 "mpc": [
  {
   "label": "SPIDER · sampling update, Eq. (2)",
   "tex": "\\begin{aligned}w_j&=\\frac{\\exp[-J(U+W_j)/\\lambda]}{\\sum_k\\exp[-J(U+W_k)/\\lambda]}\\\\U^+&=U+\\sum_jw_jW_j\\end{aligned}",
   "text": "U is the candidate control sequence and W is sampled noise. Physics rollouts score robot/object tracking and control effort through J; low-cost samples receive larger weights. The sampling covariance is scheduled across iterations and horizon steps.",
   "url": "https://arxiv.org/html/2511.09484v1#S2.SS2"
  },
  {
   "label": "How this relates to EgoEngine",
   "tex": "x_{t+1}=f(x_t,u_t),\\qquad U=(u_t,\\ldots,u_{t+H-1})",
   "text": "The simulator f checks contact dynamics over horizon H. EgoEngine names SPIDER as its MPC baseline and uses local correction around the reference; SPIDER also introduces virtual contact guidance in its original method.",
   "url": "https://arxiv.org/html/2606.12604v1#S4.SS3"
  }
 ],
 "rl": [
  {
   "label": "Human2Sim2Robot · original reward, Eqs. (1–2)",
   "tex": "\\begin{aligned}r_t&=\\exp[-\\alpha\\,d(T^{\\rm goal}_{\\tau+t},T^{\\rm obj}_t)]\\\\d(T_1,T_2)&=\\sum_i\\|T_1k_i-T_2k_i\\|_2\\end{aligned}",
   "text": "T denotes object pose; local anchor points k encode both position and orientation. Alpha controls reward sharpness and tau aligns the demonstration start. PPO learns robot actions from this reward, with a demonstrated pre-manipulation pose guiding initialization.",
   "url": "https://arxiv.org/html/2504.12609v1#S3.SS2"
  },
  {
   "label": "EgoEngine · residual refinement",
   "tex": "a_t=a_t^{\\rm base}+\\delta a_t,\\qquad\\delta a_t\\sim\\pi_\\phi(\\cdot\\mid s_t)",
   "text": "Here the state includes hand state, object pose, and reference command. EgoEngine describes residual PPO refinement with thresholded object tracking. Original Human2Sim2Robot learns arm-and-hand actions; its exponential reward above is distinct from EgoEngine’s refinement objective.",
   "url": "https://arxiv.org/html/2606.12604v1#S3.SS2.SSS2"
  }
 ]
};
function renderMethodFormulas(key){
 let host=$('solver-formulas');if(!host){host=document.createElement('div');host.id='solver-formulas';$('solver-detail').after(host)}host.replaceChildren();
 for(const item of methodFormulas[key]||[]){
  const part=document.createElement('section'),label=document.createElement('a'),formula=document.createElement('div'),text=document.createElement('p');
  part.className='method-technical';label.textContent=item.label+' ↗';label.href=item.url;label.target='_blank';label.rel='noopener';formula.className='method-formula';
  if(window.katex)formula.innerHTML=katex.renderToString(item.tex,{displayMode:true,output:'mathml',throwOnError:false,trust:false});else formula.textContent=item.tex;
  text.textContent=item.text;part.append(label,formula,text);host.append(part);
 }
}
function showSolver(key,{automatic=false}={}){const info=solverInfo[key];if(!info)return;document.querySelector('.solver-guide').classList.remove('hidden');if(!automatic)window.openReaderPanel?.('sources');$('solver-title').textContent=info.title;$('solver-summary').textContent=info.summary;$('solver-detail').textContent=info.detail;renderMethodFormulas(key);$('solver-source').href=info.url;$('solver-source').textContent=key==='mcts'?'Paper: mode-switching strategy ↗':'Original method ↗';document.querySelector('.solver-evidence').innerHTML=info.section?'EgoEngine’s specific use: <a href="#'+info.section+'">'+info.sectionLabel+'</a>.':info.evidence?'EgoEngine’s specific use: <a href="#S3.SS2.SSS2">§3.2.2 · MCTS-style Adaptive Mode Switching</a>.':'Mapping reported in <a href="#S4.SS3">§4.3 experiments</a>; mode behavior explained in <a href="#S3.SS2.SSS2">§3.2.2</a>.';$('solver-help').classList.remove('hidden');document.querySelectorAll('[data-solver]').forEach(el=>el.setAttribute('aria-expanded',String(el.dataset.solver===key)));if(!automatic){const side=$('solver-help').closest('aside');side.scrollTop=0;}}
function closeSolver(){$('solver-help').classList.add('hidden');document.querySelectorAll('[data-solver]').forEach(el=>el.setAttribute('aria-expanded','false'))}
let solverPassage=null,solverPassageKeys='';
window.syncSolverGuide=(block,preferred)=>{
 const guide=document.querySelector('.solver-guide');
 const keys=[...new Set([...block?.querySelectorAll('.solver-term')||[]].filter(term=>term.getClientRects().length).map(term=>term.dataset.solver))];
 const signature=keys.join(',');
 if(block===solverPassage&&signature===solverPassageKeys&&!preferred)return;
 solverPassage=block;solverPassageKeys=signature;
 guide.classList.toggle('hidden',!keys.length);
 guide.querySelectorAll('button[data-solver]').forEach(button=>{button.hidden=!keys.includes(button.dataset.solver)});
 if(keys.length)showSolver(keys.includes(preferred)?preferred:keys[0],{automatic:true});else closeSolver();
};
$('close-solver').onclick=closeSolver;
for(const event of ['pointerover','focusin','click'])document.addEventListener(event,e=>{const trigger=e.target.closest('[data-solver]');if(trigger){const block=trigger.closest('main [data-block]');if(block)window.syncSolverGuide(block,trigger.dataset.solver);showSolver(trigger.dataset.solver)}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSolver();const trigger=e.target.closest('.solver-term');if(trigger&&(e.key==='Enter'||e.key===' ')){e.preventDefault();showSolver(trigger.dataset.solver)}});
function methodKey(text){
 const normalized=text.toLowerCase().replace(/[\s-]/g,'');
 if(/mcts/.test(normalized))return 'mcts';
 if(normalized.startsWith('inpaintanything'))return 'inpaint';
 return {replay:'replay',mink:'replay',mpc:'mpc',spider:'mpc',rl:'rl',h2s2r:'rl',sam2:'sam2',sam3d:'sam3d',foundationstereo:'foundationstereo',foundationpose:'foundationpose',hpt:'hpt',ppo:'ppo',apriltag:'apriltag'}[normalized];
}
function decorateSolverTerms(){
 for(const el of blocks){
  if(el.closest('figure,table,.ltx_bibliography'))continue;
  const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);const texts=[];
  while(walker.nextNode()){const n=walker.currentNode;if(!n.parentElement.closest('math,a,button,.solver-term'))texts.push(n)}
  for(const n of texts){const matches=[...n.textContent.matchAll(/Monte Carlo Tree Search\s*\(MCTS\)(?:-style)?|\b(MCTS(?:-style)?|FoundationStereo|FoundationPose|SAM\s*2|SAM\s*3D|Inpaint[-\s]Anything(?:\s+v2)?|AprilTag|HPT|PPO|Replay|MPC|RL|MINK|SPIDER|H2S2R)\b/gi)];if(!matches.length)continue;
   const frag=document.createDocumentFragment();let start=0;
   for(const match of matches){frag.append(document.createTextNode(n.textContent.slice(start,match.index)));const term=document.createElement('span');term.className='solver-term';term.textContent=match[0];term.dataset.solver=methodKey(match[0]);term.tabIndex=0;term.setAttribute('role','button');term.setAttribute('aria-controls','solver-help');term.setAttribute('aria-expanded','false');term.setAttribute('aria-label',match[0]+': explain experiment implementation');frag.append(term);start=match.index+match[0].length}
   frag.append(document.createTextNode(n.textContent.slice(start)));n.replaceWith(frag);
  }
 }
}
function paint(){for(const el of blocks){el.innerHTML=originals.get(el.dataset.block);const marks=state.marks.filter(m=>m.block===el.dataset.block);if(!marks.length)continue;const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);const nodes=[];let pos=0;while(walker.nextNode()){const n=walker.currentNode;nodes.push({n,start:pos,end:pos+n.length});pos+=n.length}for(const {n,start,end} of nodes){if(n.parentElement.closest('math'))continue;const cuts=[start,end,...marks.flatMap(m=>[Math.max(start,Math.min(end,m.start)),Math.max(start,Math.min(end,m.end))])].filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b);const frag=document.createDocumentFragment();for(let i=0;i<cuts.length-1;i++){const a=cuts[i],b=cuts[i+1];const hit=marks.filter(m=>m.start<b&&m.end>a);const text=n.textContent.slice(a-start,b-start);if(hit.length){const mark=document.createElement('mark');mark.textContent=text;mark.style.background=highlightColor(hit.filter(m=>m.type==='highlight').at(-1));if(hit.some(m=>m.type==='removed'))mark.className='removed';frag.append(mark)}else frag.append(document.createTextNode(text))}n.replaceWith(frag)}// Preserve native MathML; mark or hide complete formulas touched by a range.
const mathNodes=[...el.querySelectorAll('math')];for(const math of mathNodes){const r=document.createRange();r.selectNodeContents(el);r.setEndBefore(math);const a=r.toString().length,b=a+math.textContent.length;const hit=marks.filter(m=>m.start<b&&m.end>a);if(hit.some(m=>m.type==='removed')){math.dataset.removed='true';math.classList.add('removed-formula');if(removalMode==='hidden')math.style.display='none'}else if(hit.length)math.style.background=highlightColor(hit.filter(m=>m.type==='highlight').at(-1))}}applyReadingView();typesetMath();renderCommentStickers();decorateSolverTerms();window.decorateGlossary?.();window.decorateReportedValues?.();window.refreshEvidence?.()}
function addMark(type){if(!context)return;checkpoint();state.marks.push({...context,id:newId(),type,...(type==='highlight'?{color:$('highlight-color').value}:{})});paint();save();toast(type==='removed'?'Text removed. Use Undo or restore it under Removed content.':'Highlight saved.');getSelection().removeAllRanges()}
$('highlight').onclick=()=>addMark('highlight');$('remove-content').onclick=()=>addMark('removed');
function resetEditor(){editing=null;$('note-form').reset();$('save-note').textContent='Add note';$('cancel-edit').classList.add('hidden')}
$('cancel-edit').onclick=resetEditor;
$('note-form').onsubmit=e=>{e.preventDefault();const text=$('note').value.trim(),raw=$('url').value.trim(),url=raw?safeURL(raw):'';if(raw&&!url){toast('Use an http or https link.');return}if(!text&&!url){toast('Write a note or add a link.');$('note').focus();return}const n={id:editing||newId(),kind:$('kind').value,text,url,anchor:context?{...context}:null,updated:new Date().toISOString()};checkpoint();if(editing)state.notes=state.notes.map(old=>old.id===editing?n:old);else state.notes.push(n);resetEditor();save()};
function node(tag,text,cls){const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;return el}
function button(text,fn){const b=node('button',text);b.onclick=fn;return b}
function jump(anchor){const el=blockById(anchor.block);setContext(anchor);el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash')}
function renderNotes(){const host=$('notes');host.replaceChildren();const filter=$('filter').value;const records=filter==='removed'?state.marks.filter(m=>m.type==='removed'): [...state.notes,...state.marks.filter(m=>m.type==='highlight')].filter(n=>filter!=='passage'||(context&&(n.anchor?.block||n.block)===context.block));if(!records.length){host.append(node('div',filter==='removed'?'Removed passages will appear here, ready to restore.':'Your notes and linked resources will appear here.','empty'));return}for(const n of records.slice().reverse()){const card=node('div','','card');card.dataset.noteId=n.id;card.tabIndex=-1;card.append(node('div',n.type==='removed'?'Removed text':n.type==='highlight'?'Highlight':n.kind,'kind'));const anchor=n.anchor||(n.block?n:null);if(anchor){const q=node('blockquote',anchor.quote.length>220?anchor.quote.slice(0,220)+'…':anchor.quote);q.tabIndex=0;q.role='button';q.title='Jump to passage';q.onclick=()=>jump(anchor);q.onkeydown=e=>{if(e.key==='Enter')jump(anchor)};card.append(q)}if(n.text)card.append(node('p',n.text));if(n.url){const a=node('a',n.url);a.href=safeURL(n.url);a.target='_blank';a.rel='noopener noreferrer';card.append(a)}const actions=node('div','','tools');if(n.type==='highlight'){
 const color=document.createElement('select');color.setAttribute('aria-label','Change highlight color');
 for(const name of Object.keys(highlightColors)){const option=node('option',name[0].toUpperCase()+name.slice(1));option.value=name;color.append(option)}
 color.value=highlightColors[n.color]?n.color:'yellow';card.style.borderLeft='4px solid '+highlightColor(n);
 color.onchange=()=>{checkpoint();n.color=color.value;paint();save()};actions.append(color);
 }if(!n.type)actions.append(button('Edit',()=>{editing=n.id;setContext(n.anchor);$('kind').value=n.kind;$('note').value=n.text;$('url').value=n.url;$('save-note').textContent='Save changes';$('cancel-edit').classList.remove('hidden');$('note').focus();$('composer').scrollIntoView({block:'nearest'})}));actions.append(button(n.type==='removed'?'Restore':'Delete',()=>{checkpoint();if(n.type){state.marks=state.marks.filter(x=>x.id!==n.id);paint()}else{state.notes=state.notes.filter(x=>x.id!==n.id);if(editing===n.id)resetEditor()}save()}));card.append(actions);host.append(card)}}
$('filter').onchange=renderNotes;
for(const h of article.querySelectorAll('h2,h3,h4,h6.ltx_title_abstract')){const target=h.id||h.parentElement.id;if(!target)continue;const a=node('a',h.textContent.replace(/\s+/g,' ').trim());a.href='#'+target;if(['H3','H4'].includes(h.tagName)){a.style.paddingLeft=h.tagName==='H4'?'20px':'10px';a.style.fontSize='13px'}$( 'toc').append(a);h.style.scrollMarginTop='90px'}
paint();setContext(null);
$('save-status').textContent='Saved · '+versionStore.activeName;
