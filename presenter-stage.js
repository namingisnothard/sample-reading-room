import {gapVisuals} from './presenter-gaps.js?v=intro-gaps-1';
import {discussionGallery} from './discussion-examples.js?v=discussion-demos-1';
import {focusSentence} from './presenter-sentence-focus.js?v=voice-solvers-1';
const documents = new Map();
async function sourceDocument(path) {
  if (!documents.has(path)) documents.set(path, fetch(path).then(r => { if (!r.ok) throw Error('Cannot load ' + path); return r.text(); }).then(s => new DOMParser().parseFromString(s, 'text/html')));
  return documents.get(path);
}
export class Stage {
  constructor(root, preview = false) { this.root = root; this.preview = preview; this.version = 0; this.key = ''; this.pointer = null; }
  async show(visual, blank = false) {
    if (!visual) return;
    if(visual.kind==='paper'&&visual.target?.startsWith('S3.SS2.SSS2')&&['Replay','MPC','RL'].includes(visual.point?.label)){const mode=visual.point.label;visual={...visual,focus:undefined,panel:'code',code:'solver-'+mode.toLowerCase(),label:mode+' · simulation execution and optimization',terms:[{Replay:'Replay',MPC:'Model predictive control (MPC)',RL:'Residual policy'}[mode]]};}
    const previous=this.visual; this.visual=visual;
    const key = JSON.stringify({...visual,trigger:undefined,label:undefined,point:undefined});
    if (this.key !== key) {
      this.key = key; const version = ++this.version; this.navigating=false;this.manualVersion=(this.manualVersion||0)+1;
      const existing=this.root.querySelector('.stage-frame');
      if(existing?.dataset.ready==='true'&&previous?.kind===visual.kind&&['paper','commentary'].includes(visual.kind)){
        existing.title=visual.label;
        this.navigateFrame(visual,existing,version);
      }else{
      this.root.querySelectorAll('video').forEach(v => v.pause());
      this.root.replaceChildren();
      try {
        if (visual.kind === 'paper' || visual.kind === 'commentary') {
          const frame = document.createElement('iframe'); frame.className = 'stage-frame'; frame.title = visual.label;
          frame.src = visual.kind === 'paper' ? 'index.html' : 'commentary.html?v=natural-motion-1';
          frame.allow = 'autoplay; fullscreen';
          frame.onload = async () => {
            frame.dataset.ready='true';
            const d = frame.contentDocument, w = frame.contentWindow;
            if (!d || version !== this.version) return;
            w.setSummaryVisible?.(false); w.setGlossaryVisible?.(false); w.setCodeVisible?.(false);
            const style = d.createElement('style');
            style.textContent = 'header,#paper-contents,.column-resizer,#notes-panel,#reader-glossary,#reader-code,.paper-summary{display:none!important} .layout{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(300px,.85fr)!important}.paragraph-flow{display:block!important;margin-left:0!important}main{padding:25px!important;min-width:0}.paragraph-takeaway{margin:0 0 10px!important}main p.ltx_p{font-size:21px!important;line-height:1.6!important}';
            d.head.append(style);
            await this.navigateFrame(visual,frame,version);
            if (this.preview) frame.style.pointerEvents = 'none';
            this.point(this.pointer);
          };
          this.root.append(frame);
        } else {
          const content = document.createElement('div'); content.className = 'stage-content';
          const label = document.createElement('div'); label.className = 'stage-label'; label.textContent = 'EGOENGINE / ' + visual.label; content.append(label); this.root.append(content);
          if (visual.kind === 'figure' || visual.kind === 'equation') {
            const doc = await sourceDocument('index.html'); if (version !== this.version) return;
            const original = doc.getElementById(visual.target); if (!original) throw Error('Visual not found: ' + visual.target);
            const node = original.cloneNode(true);
            node.querySelectorAll('script').forEach(x => x.remove());
            node.querySelectorAll('[style]').forEach(x => x.removeAttribute('style')); node.removeAttribute('style');
            if (visual.kind === 'equation') { const p = document.createElement('p'); p.textContent = visual.context || 'Object tracking connects the demonstrated goal to simulated robot execution.'; content.append(p); }
            content.append(node);
          } else if (visual.kind === 'video') {
            const v = document.createElement('video'); v.src = 'assets/' + visual.target; v.controls = !this.preview; v.muted = true; v.playsInline = true; v.preload = 'metadata'; content.append(v);
          } else if (visual.kind === 'image') {
            const img = document.createElement('img'); img.src = 'assets/' + visual.target; img.alt = visual.label; img.style.objectFit = 'contain'; img.style.minHeight = '0'; content.append(img);
          } else if(visual.kind==='discussion'){
            const gallery=await discussionGallery({autoplay:true});if(version!==this.version)return;content.classList.add('has-examples');content.append(gallery);
          } else {
            content.classList.add('discussion-visual'); const h = document.createElement('h1'); h.textContent = visual.label; const p = document.createElement('p'); p.textContent = visual.context || 'Take a moment. What would you test, and what evidence would change your mind?'; content.append(h, p);
          }
        }
      } catch (error) { const p = document.createElement('p'); p.className = 'stage-loading stage-error'; p.textContent = error.message; this.root.append(p); }
    }
    }
    let cover = this.root.querySelector('.stage-blank');
    if (blank && !cover) { cover = document.createElement('div'); cover.className = 'stage-blank'; this.root.append(cover); this.command('pause'); }
    if (!blank) cover?.remove();
    this.point(this.pointer);
  }
  async navigateFrame(visual,frame,version){
    const d=frame.contentDocument,w=frame.contentWindow;
    if(!d||!w)return;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const live=()=>version===this.version&&frame.isConnected;
    const delay=ms=>new Promise(resolve=>setTimeout(resolve,reduced?0:ms));
    this.navigating=true;this.root.querySelector('.stage-pointer')?.remove();
    let motionStyle=d.getElementById('presenter-motion-style');
    if(!motionStyle){motionStyle=d.createElement('style');motionStyle.id='presenter-motion-style';motionStyle.textContent='.presenter-hand{position:fixed;left:0;top:0;z-index:99999;pointer-events:none;font-size:28px;line-height:1;color:#243a30;text-shadow:0 1px 3px white;transition:transform .65s cubic-bezier(.25,.7,.3,1);filter:drop-shadow(0 2px 3px #0004)}.presenter-hand:after{content:"";position:absolute;inset:-12px;border:2px solid #e3a34c;border-radius:50%;opacity:0;transform:scale(.4)}.presenter-hand.clicking:after{opacity:1;transform:scale(1.2);transition:transform .22s,opacity .22s}.columns{transition:grid-template-columns .8s ease}.source-snapshot{animation:snapshot-reveal .35s ease}@keyframes snapshot-reveal{from{opacity:.5;transform:translateY(8px)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.presenter-hand,.columns{transition:none}.source-snapshot{animation:none}}';d.head.append(motionStyle);}
    d.querySelector('.presenter-hand')?.remove();
    const hand=d.createElement('div');hand.className='presenter-hand';hand.textContent='➤';hand.setAttribute('aria-hidden','true');hand.style.transform='translate('+Math.round(w.innerWidth*.55)+'px,'+Math.round(w.innerHeight*.6)+'px) rotate(-25deg)';d.body.append(hand);
    const scroll=async target=>{const top=target?target.getBoundingClientRect().top+w.scrollY-40:0;w.scrollTo({top,behavior:reduced?'instant':'smooth'});await delay(650)};
    const click=async button=>{if(!button||!live())return;let r=button.getBoundingClientRect();if(r.top<0||r.bottom>w.innerHeight){await scroll(button);if(!live())return;r=button.getBoundingClientRect();}hand.style.transform='translate('+(r.left+r.width*.55)+'px,'+(r.top+r.height*.55)+'px) rotate(-25deg)';await delay(650);if(!live())return;hand.classList.add('clicking');await delay(150);if(!live())return;button.click();await delay(180);hand.classList.remove('clicking');};
    try{
      if(visual.kind==='commentary'){
        d.querySelectorAll('video').forEach(v=>v.pause());
        let compact=d.getElementById('presenter-focus-style');
        if(!compact){compact=d.createElement('style');compact.id='presenter-focus-style';d.head.append(compact);}
        if(visual.target==='authors'){
          const entering=!compact.dataset.authors;
          if(entering){
            compact.textContent='';await scroll(d.querySelector('.author-quotes'));if(!live())return;
            compact.textContent='.project-header,footer,.editorial-section{display:none!important}.editorial-section:has(.author-quotes){display:block!important;margin-top:0!important}.columns{align-items:start!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}.source-snapshots{position:static!important}.source-snapshot img{max-height:560px!important;object-fit:contain!important}.author-quotes blockquote{transition:background .3s,box-shadow .3s}.author-quotes .source-active{background:#fff1c7;box-shadow:0 0 0 8px #fff1c7;border-radius:3px}';compact.dataset.authors='true';w.scrollTo(0,0);
          }
          const sources=d.getElementById('media-tab-sources');if(sources?.getAttribute('aria-selected')!=='true')await click(sources);if(!live())return;
          await click(d.getElementById('snapshot-tab-'+(visual.source||'essay')));if(!live())return;
          if(entering){
            const columns=d.querySelector('.columns'),media=d.querySelector('.source-snapshots');
            if(columns&&media){const r=media.getBoundingClientRect(),box=columns.getBoundingClientRect();hand.textContent='↔';hand.style.transform='translate('+(r.left-15)+'px,'+(r.top+180)+'px)';await delay(500);if(!live())return;hand.classList.add('clicking');columns.style.setProperty('grid-template-columns','minmax(0,.8fr) minmax(0,1.2fr)','important');hand.style.transform='translate('+(box.left+box.width*.4)+'px,'+(r.top+180)+'px)';await delay(800);if(!live())return;hand.classList.remove('clicking');hand.textContent='➤';}
          }

          d.querySelectorAll('.source-active').forEach(el=>el.classList.remove('source-active'));
          d.querySelectorAll('.author-quotes blockquote')[{essay:0,thread:1,coauthor:2,real2sim:3}[visual.source||'essay']]?.classList.add('source-active');
        }else{
          compact.textContent='';delete compact.dataset.authors;d.querySelector('.columns')?.style.removeProperty('grid-template-columns');
          await scroll(d.getElementById(visual.target));if(!live())return;
          if(visual.target==='coffee-analogy'){
            await click(d.getElementById('media-tab-analogy'));if(!live())return;
            await w.prepareAnalogy?.();if(!live())return;
            compact.textContent='.project-header,footer,.editorial-section,.analogy-setup{display:none!important}.analogy-note{display:block!important}.columns{align-items:start!important}';w.scrollTo(0,0);if(this.playRequested)w.playAnalogy?.();
          }
        }
      }else{
        d.querySelectorAll('#presenter-aid video').forEach(v=>v.pause());d.querySelector('#presenter-aid')?.remove();
        const el=d.getElementById(visual.target);
        let focusStyle=d.getElementById('presenter-reading-focus-style');if(!focusStyle){focusStyle=d.createElement('style');focusStyle.id='presenter-reading-focus-style';focusStyle.textContent='.presenter-key-sentence{font-weight:750!important}main .ltx_para{transition:opacity .45s ease}body.presenter-reading-focus main .ltx_para{opacity:.25}body.presenter-reading-focus main .ltx_para.presenter-active-passage,body.presenter-reading-focus main .presenter-active-passage .ltx_para{opacity:1}@media(prefers-reduced-motion:reduce){main .ltx_para{transition:none}}';d.head.append(focusStyle);}
        d.querySelectorAll('.presenter-active-passage').forEach(n=>n.classList.remove('presenter-active-passage'));const active=el?.closest('.ltx_para')||el?.querySelector('.ltx_para');active?.classList.add('presenter-active-passage');for(let parent=active?.parentElement?.closest('.ltx_para');parent;parent=parent.parentElement?.closest('.ltx_para'))parent.classList.add('presenter-active-passage');d.body.classList.toggle('presenter-reading-focus',Boolean(active));
        // Keep the reader at its current passage when only the companion changes.
        if(frame.dataset.passage!==visual.target){await scroll(el);if(!live())return;frame.dataset.passage=visual.target;}
        const paragraph=el?.matches('p')?el:el?.querySelector('p.ltx_p');paragraph?.click();
        if(visual.focus||visual.panel){
          const aid=d.createElement('aside');aid.id='presenter-aid';aid.setAttribute('aria-label',visual.panel==='code'?'Code explanation':visual.panel==='glossary'?'Glossary explanation':'Referenced visual');
          const label=d.createElement('p');label.className='aid-label';label.textContent=visual.label;aid.append(label);
          if(visual.panel==='gaps')aid.append(gapVisuals(d));
          if(visual.focus){const original=d.getElementById(visual.focus);if(original){const clone=original.cloneNode(true);clone.querySelectorAll('[style]').forEach(n=>n.removeAttribute('style'));clone.removeAttribute('style');clone.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));clone.removeAttribute('id');aid.append(clone);}}
          if(visual.panel==='glossary'||visual.terms?.length){
            for(const term of (visual.terms||[])){const card=[...d.querySelectorAll('#glossary-entries .glossary-entry')].find(c=>c.querySelector('h3')?.textContent.toLowerCase()===term.toLowerCase());if(card){const clone=card.cloneNode(true);clone.querySelectorAll('button').forEach(n=>n.remove());clone.removeAttribute('id');clone.hidden=false;aid.append(clone);}}
          }
          const illustrated=[...aid.querySelectorAll('.glossary-entry')].filter(c=>c.querySelector('.glossary-illustration'));
          if(illustrated.length>1){
            const tabs=d.createElement('div');tabs.className='illustration-tabs';tabs.setAttribute('aria-label','Original paper illustrations');
            const activate=index=>{illustrated.forEach((card,i)=>{card.hidden=i!==index;tabs.children[i]?.setAttribute('aria-pressed',String(i===index));});aid.scrollTop=0;};
            illustrated.forEach((card,i)=>{card.dataset.illustrationTerm=card.querySelector('h3').textContent;const button=d.createElement('button');button.textContent=i===0?'OSMO · tactile glove':'DexUMI · hand interface';button.onclick=()=>activate(i);tabs.append(button);});aid.insertBefore(tabs,illustrated[0]);activate(0);
          }
          if(visual.panel==='code'){
            const select=d.getElementById('code-topic');if(select){select.value=visual.code;select.dispatchEvent(new w.Event('change'));}
            const heading=d.createElement('p');heading.textContent='Unofficial reproduction · not author code';aid.append(heading);
            const content=d.getElementById('code-content')?.cloneNode(true);if(content){if(visual.code?.startsWith('solver-')){aid.classList.add('solver-aid');const pre=content.querySelector('pre'),note=pre?.nextElementSibling;content.replaceChildren(...[pre,note?.tagName==='P'?note:null].filter(Boolean));}content.removeAttribute('id');content.querySelectorAll('details').forEach(n=>n.remove());content.querySelectorAll('h4').forEach(n=>{if(n.textContent==='Implementation excerpts')n.remove()});aid.append(content);}
            const source=d.querySelector('#reader-code .repo-source')?.cloneNode(true);if(source)aid.append(source);
          }
          const style=d.createElement('style');style.textContent='#presenter-aid{position:fixed;top:20px;right:20px;width:43%;max-height:calc(100vh - 40px);overflow:auto;box-sizing:border-box;padding:22px;background:#fffef8;border:1px solid #c9d3c5;border-radius:10px;box-shadow:0 12px 35px #17281b18;z-index:30;animation:snapshot-reveal .4s ease;font:17px/1.5 system-ui;color:#263c2d}#presenter-aid .aid-label{font:600 12px system-ui;color:#54725a;margin:0 0 15px}#presenter-aid figure{margin:0;width:100%!important}#presenter-aid img{width:auto!important;height:auto!important;max-width:100%!important;max-height:55vh!important;display:block;margin:auto}#presenter-aid table{width:100%;font-size:14px;border-collapse:collapse}#presenter-aid th,#presenter-aid td{position:static!important;padding:7px;border-bottom:1px solid #d5decf}#presenter-aid figcaption{font-size:14px;line-height:1.5;margin-top:15px}#presenter-aid pre{font:14px/1.6 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere;background:#edf2e8;padding:14px;border-radius:8px}#presenter-aid .glossary-entry{padding:12px 0;border-bottom:1px solid #d5decf}#presenter-aid a{color:#416a48}#presenter-aid.solver-aid .glossary-entry{padding:0;border:0}#presenter-aid.solver-aid p{font-size:14px;line-height:1.4;margin:10px 0}#presenter-aid.solver-aid pre{font-size:16px;line-height:1.5;padding:12px}#presenter-aid h3{font-size:20px;margin:8px 0}#presenter-aid .glossary-entry[hidden]{display:none!important}#presenter-aid .glossary-entry>p{font-size:16px;line-height:1.45}#presenter-aid .glossary-illustration img{max-height:55vh!important}#presenter-aid .glossary-illustration figcaption{font:12px/1.4 system-ui;margin-top:8px}#presenter-aid .illustration-tabs{display:flex;gap:8px;margin-bottom:8px}#presenter-aid .illustration-tabs button{font:13px system-ui;padding:9px;border:1px solid #bcc9b7;border-radius:6px;background:#f3f6ef;cursor:pointer}#presenter-aid .illustration-tabs button[aria-pressed=true]{background:#2d523b;color:white}@media(prefers-reduced-motion:reduce){#presenter-aid{animation:none}}';aid.append(style);d.body.append(aid);
          const r=aid.getBoundingClientRect();hand.style.transform='translate('+(r.left+45)+'px,'+(r.top+35)+'px) rotate(-25deg)';await delay(600);
        }
      }
    }finally{hand.remove();if(live()){this.navigating=false;this.point(this.pointer);}}
  }
  point(pointer) {
    this.pointer = pointer;
    if(this.navigating)return;
    if(pointer?.example){const gallery=this.root.querySelector('.discussion-examples');if(gallery&&gallery.dataset.example!==pointer.example)gallery.querySelector('[data-example="'+pointer.example+'"]')?.click();}
    this.root.querySelectorAll('.stage-emphasis').forEach(el=>el.classList.remove('stage-emphasis'));
    const frame=this.root.querySelector('iframe'), doc=frame?.contentDocument;
    doc?.querySelectorAll('.stage-emphasis').forEach(el=>el.classList.remove('stage-emphasis'));
    if(doc&&this.visual?.kind==='paper'){const key=JSON.stringify([this.visual.target,pointer?.passageText,pointer?.passageHint]);if(this.sentenceKey!==key){this.sentenceKey=key;focusSentence(doc,this.visual.target,pointer?.passageText,pointer?.passageHint);}}
    if(this.visual?.panel==='gaps'&&doc)doc.querySelectorAll('[data-gap]').forEach(card=>card.toggleAttribute('data-active',card.dataset.gap===pointer?.gap));
    if(pointer?.glossaryTerm&&doc){const cards=[...doc.querySelectorAll('#presenter-aid [data-illustration-term]')];const index=cards.findIndex(c=>c.dataset.illustrationTerm===pointer.glossaryTerm);if(index>=0&&cards[index].hidden)doc.querySelectorAll('#presenter-aid .illustration-tabs button')[index]?.click();}
    let cursor=this.root.querySelector('.stage-pointer');
    if(!pointer){cursor?.remove();return;}
    if(!cursor){cursor=document.createElement('div');cursor.className='stage-pointer';this.root.append(cursor);}
    let rect=null,highlight=null;
    const searchRoot=(doc&&(this.visual?.target==='authors'?doc.querySelector('.author-quotes .source-active')||doc.querySelector('.author-quotes'):doc.querySelector('#presenter-aid [data-illustration-term]:not([hidden])')||doc.getElementById('presenter-aid')||doc.getElementById(this.visual?.target)||doc.body)) || this.root.querySelector('.stage-content');
    if(pointer.element&&searchRoot){const node=searchRoot.querySelector('figure img,math,table,pre,h3,h2,h1,p')||searchRoot;const r=node.getBoundingClientRect();if(r.width&&r.height)rect={left:r.left,top:Math.max(35,r.top),width:r.width,height:Math.min(r.height,100)};}
    if(pointer.region){const img=doc?.querySelector('#presenter-aid figure img')||this.root.querySelector('figure img');if(img){const r=img.getBoundingClientRect();rect={left:r.left+r.width*pointer.region[0],top:r.top+r.height*pointer.region[1],width:0,height:0};}}
    if(!rect&&pointer.match&&searchRoot){
      const walker=(doc||document).createTreeWalker(searchRoot,NodeFilter.SHOW_TEXT);let node;
      while(node=walker.nextNode()){
        if(node.parentElement?.closest('script,style,annotation,.stage-label,.stage-pointer'))continue;
        const index=node.textContent.toLowerCase().indexOf(pointer.match.toLowerCase());if(index<0)continue;
        const range=(doc||document).createRange();range.setStart(node,index);range.setEnd(node,index+pointer.match.length);const r=range.getBoundingClientRect();
        if(!r.width)continue;
        if(r.top<0||r.bottom>(frame?.clientHeight||this.root.clientHeight)){if(frame&&this.visual?.kind==='paper'){const aid=node.parentElement.closest('#presenter-aid');if(aid){aid.scrollTop+=r.top-aid.getBoundingClientRect().top-aid.clientHeight*.4;requestAnimationFrame(()=>this.point(pointer));return;}frame.contentWindow.scrollTo(0,frame.contentWindow.scrollY+r.top-frame.clientHeight*.4);requestAnimationFrame(()=>this.point(pointer));return;}continue;}
        rect=r;highlight=node.parentElement.closest('tr');break;
      }
    }
    if(!rect&&this.visual?.focus&&searchRoot){const node=searchRoot.querySelector('math,figure img,table');if(node){const r=node.getBoundingClientRect();if(r.width&&r.height)rect=r;}}
    if(!rect){cursor.hidden=true;return;}
    cursor.hidden=false;highlight?.classList.add('stage-emphasis');
    const base=this.root.getBoundingClientRect(), scaleX=base.width/this.root.clientWidth,scaleY=base.height/this.root.clientHeight;
    const frameRect=frame?.getBoundingClientRect();
    const x=frame?(frameRect.left-base.left)/scaleX+rect.left+rect.width/2:(rect.left-base.left+rect.width/2)/scaleX;
    const y=frame?(frameRect.top-base.top)/scaleY+rect.top+rect.height/2:(rect.top-base.top+rect.height/2)/scaleY;
    cursor.style.left=Math.max(70,Math.min(this.root.clientWidth-70,x))+'px';cursor.style.top=Math.max(25,Math.min(this.root.clientHeight-85,y))+'px';cursor.dataset.label=pointer.label;
  }
  async animate(pointers){
    const token=this.manualVersion=(this.manualVersion||0)+1,version=this.version;
    const live=()=>token===this.manualVersion&&version===this.version;
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    // A new cue may still be scrolling/clicking; never race that navigation.
    for(let i=0;this.navigating&&live()&&i<150;i++)await wait(100);
    if(!live()||this.navigating)return;
    const frame=this.root.querySelector('.stage-frame');
    if(frame?.dataset.ready==='true'){
      delete frame.dataset.passage;
      await this.navigateFrame(this.visual,frame,version);
    }
    for(const p of pointers||[{element:true,label:this.visual?.label}]){
      if(!live())return;
      this.point(p);await wait(matchMedia('(prefers-reduced-motion: reduce)').matches?0:750);
    }
  }
  command(action,pointers) {
    if(action==='animate'){this.animate(pointers);return;}
    if(action==='pause')this.manualVersion=(this.manualVersion||0)+1;
    const frame = this.root.querySelector('iframe'); const d = frame?.contentDocument;
    if(['resume','play','pause'].includes(action)&&this.visual?.target==='coffee-analogy'){this.playRequested=action==='pause'?false:action==='resume'?true:!this.playRequested;if(this.playRequested)frame?.contentWindow?.playAnalogy?.();else frame?.contentWindow?.pauseAnalogy?.();return;}
    if (action === 'up' || action === 'down') {
      const dy = (action === 'up' ? -1 : 1) * (frame ? frame.clientHeight : this.root.clientHeight) * .65;
      if (frame) frame.contentWindow?.scrollBy({top:dy,behavior:'smooth'}); else this.root.querySelector('.stage-content')?.scrollBy({top:dy,behavior:'smooth'});
    } else if (action === 'play' || action === 'resume' || action === 'pause') {
      const videos = [...this.root.querySelectorAll('video'), ...(d ? d.querySelectorAll('video') : [])];
      if (action === 'pause') videos.forEach(v => v.pause()); else {
        const v = videos.find(v => { const box=v.getBoundingClientRect(); return box.width && box.height && box.top < (frame?.clientHeight || innerHeight) && box.bottom > 0; });
        if (v) { if (action === 'resume' || v.paused) v.play().catch(() => {}); else v.pause(); }
      }
    }
  }
}
