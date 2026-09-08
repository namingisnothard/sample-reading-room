'use strict';
(()=>{
 const paper=document.querySelector('main > article'), companion=document.getElementById('reading-companion'), content=document.getElementById('evidence-content');
 const byId=id=>document.getElementById(id);
 const visualRoots=[...paper.querySelectorAll('figure,table')].filter(el=>!el.parentElement.closest('figure,table')&&el.id!=='p1.1');
 const numberedFigures=[...paper.querySelectorAll('figure')].filter(el=>/^(Figure|Table)\s/.test(el.querySelector(':scope > figcaption > .ltx_tag')?.textContent.trim()||''));
 const media=[...numberedFigures.filter(el=>!numberedFigures.some(parent=>parent!==el&&parent.contains(el))),...paper.querySelectorAll('table.ltx_equation')];
 const bibliography=paper.querySelector('.ltx_bibliography');
 const references=new Map([...paper.querySelectorAll('.ltx_bibitem')].map(el=>[el.id,el]));
 const origins=new Map(media.map(el=>[el,el.closest('section')]));
 visualRoots.forEach(el=>{el.classList.add('reading-visual');el.setAttribute('aria-hidden','true')});
 if(bibliography){bibliography.classList.add('reading-visual');bibliography.setAttribute('aria-hidden','true')}
 const demos=window.READER_DEMOS||[];
 let active=null,lastKey='',pinned=null,frame=0,videoScope='passage',matchedId=null,evidenceScope='passage';
 const evidenceFilters=document.createElement('div');evidenceFilters.className='evidence-filters';evidenceFilters.setAttribute('role','group');evidenceFilters.setAttribute('aria-label','Browse paper visuals');
 for(const [value,label] of [['passage','This passage'],['figures','Figures'],['tables','Tables']]){const button=document.createElement('button');button.type='button';button.dataset.evidenceScope=value;button.textContent=label;button.setAttribute('aria-pressed',String(value==='passage'));button.onclick=()=>{setEvidenceScope(value);window.openReaderPanel('sources');showEvidence(active,true)};evidenceFilters.append(button)}
 byId('sources-panel').insertBefore(evidenceFilters,content);
 function setEvidenceScope(value){evidenceScope=value;evidenceFilters.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.evidenceScope===value)));videoFilter.hidden=value!=='passage';if(value!=='passage')window.syncSolverGuide?.(null)}
 const videoFilter=document.createElement('select');videoFilter.id='video-scope';videoFilter.setAttribute('aria-label','Video demo selection');
 for(const [value,label] of [['passage','Demos for this section'],['all','All local demos']]){const option=document.createElement('option');option.value=value;option.textContent=label;videoFilter.append(option)}
 byId('sources-panel').insertBefore(videoFilter,content);videoFilter.onchange=()=>{videoScope=videoFilter.value;showEvidence(active,true)};

 window.openReaderPanel=panel=>{
  for(const name of ['sources','notes']){byId(name+'-panel').classList.toggle('hidden',name!==panel);byId(name+'-tab').setAttribute('aria-selected',String(name===panel));byId(name+'-tab').tabIndex=name===panel?0:-1}
  byId('margin-notes-toggle').setAttribute('aria-expanded',String(panel==='notes'));companion.querySelectorAll('video').forEach(video=>video.pause());companion.scrollTop=0;
 };
 byId('margin-notes-toggle').onclick=()=>window.openReaderPanel(byId('notes-panel').classList.contains('hidden')?'notes':'sources');
 document.querySelectorAll('[data-panel]').forEach(btn=>{btn.onclick=()=>window.openReaderPanel(btn.dataset.panel);btn.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const next=btn.dataset.panel==='sources'?'notes':'sources';window.openReaderPanel(next);byId(next+'-tab').focus()}}});
 const contentsLinks=[...byId('toc').querySelectorAll('a[href^="#"]')].map(link=>({link,target:byId(decodeURIComponent(link.hash.slice(1)))})).filter(item=>item.target);
 let currentContents=null;
 function keepContentsVisible(){const nav=byId('paper-contents');if(!currentContents||!nav.classList.contains('contents-open'))return;const r=currentContents.link.getBoundingClientRect(),bounds=nav.getBoundingClientRect();if(r.top<bounds.top+12)nav.scrollTop+=r.top-bounds.top-12;else if(r.bottom>bounds.bottom-12)nav.scrollTop+=r.bottom-bounds.bottom+12;}
 function updateContents(){const line=document.querySelector('body > header').getBoundingClientRect().bottom+80;let current=null;
  for(const item of contentsLinks){if(item.target.closest('.reading-visual')||!item.target.getClientRects().length)continue;if(item.target.getBoundingClientRect().top<=line)current=item;}
  if(current===currentContents)return;currentContents=current;
  for(const item of contentsLinks){const selected=item===current;item.link.classList.toggle('contents-current',selected);item.link.classList.toggle('contents-parent',!selected&&!!current&&item.target.contains(current.target));if(selected)item.link.setAttribute('aria-current','location');else item.link.removeAttribute('aria-current');}
  keepContentsVisible();
 }
 function setContentsVisible(visible){byId('contents-toggle').setAttribute('aria-expanded',String(visible));byId('paper-contents').classList.toggle('contents-open',visible);try{localStorage.setItem('egoengine-contents-visible',String(visible))}catch{}if(visible){updateContents();keepContentsVisible()}}
 byId('contents-toggle').onclick=()=>setContentsVisible(byId('contents-toggle').getAttribute('aria-expanded')!=='true');
 let contentsVisible=innerWidth>820;try{const stored=localStorage.getItem('egoengine-contents-visible');if(stored!==null)contentsVisible=stored==='true'}catch{}setContentsVisible(contentsVisible);
 function resolveVisual(id){const el=byId(id);return media.find(m=>m===el||m.contains(el))}
 function localLinks(el){return [...el.querySelectorAll('a[href^="#"]')].map(a=>a.getAttribute('href').slice(1))}
 function sourceClone(el){
  const clone=el.cloneNode(true);clone.classList.remove('reading-visual');clone.removeAttribute('aria-hidden');
  clone.querySelectorAll('.comment-sticker,.rendered-math').forEach(n=>n.remove());
  for(const node of [clone,...clone.querySelectorAll('*')]){node.removeAttribute('id');node.removeAttribute('tabindex');node.removeAttribute('aria-controls');if(node.dataset?.block){node.dataset.originBlock=node.dataset.block;delete node.dataset.block}node.classList.remove('active-block','flash');}
  clone.querySelectorAll('math').forEach(math=>{if(math.dataset.typeset){math.style.display=math.dataset.mathDisplay||'';math.removeAttribute('aria-hidden')}});
  return clone;
 }
 // Figures remain readable when optional columns leave little horizontal space.
 const viewer=document.createElement('dialog');viewer.id='visual-viewer';viewer.setAttribute('aria-labelledby','visual-viewer-title');
 viewer.innerHTML='<div class="visual-viewer-heading"><h2 id="visual-viewer-title"></h2><button type="button" aria-label="Close expanded visual">Close ×</button></div><div class="visual-viewer-content"></div>';
 document.body.append(viewer);
 viewer.querySelector('button').onclick=()=>viewer.close();
 viewer.addEventListener('click',event=>{if(event.target===viewer){const r=viewer.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)viewer.close()}});
 function expandVisual(visual){
  viewer.querySelector('h2').textContent=labelMedia(visual).replace(/:$/,'');
  const body=document.createElement('article');body.className='evidence-body';body.append(sourceClone(visual));
  viewer.querySelector('.visual-viewer-content').replaceChildren(body);viewer.showModal();
 }
 function addVisualExpansion(card,visual){
  const button=document.createElement('button');button.type='button';button.className='expand-visual';button.textContent='Expand';button.setAttribute('aria-label','Expand '+labelMedia(visual).replace(/:$/,''));button.onclick=()=>expandVisual(visual);
  const heading=card.querySelector(':scope > h3');const bar=document.createElement('div');bar.className='evidence-heading';heading.before(bar);bar.append(heading,button);
  card.querySelectorAll('img').forEach(img=>{img.classList.add('expandable-image');img.addEventListener('click',()=>expandVisual(visual))});
 }
 function labelMedia(el){return (el.querySelector('figcaption .ltx_tag,.ltx_eqn_eqno')?.textContent||el.querySelector('.ltx_tag_equation')?.textContent|| (el.matches('.ltx_equation')?'Equation':'Paper visual')).trim()}

 function refTarget(link){const id=decodeURIComponent(link.getAttribute('href').slice(1));return references.get(id)||resolveVisual(id)}
 function refKind(el){return references.has(el.id)?'citation':el.matches('.ltx_equation')?'equation':el.matches('.ltx_table,table')?'table':'figure'}
 function decorateReferences(){paper.querySelectorAll('a[href^="#"]').forEach(link=>{const target=refTarget(link);if(!target)return;link.classList.add('paper-ref');link.dataset.refKind=refKind(target);link.dataset.refTarget=target.id;link.title='Show '+(references.has(target.id)?'citation '+target.querySelector('.ltx_tag')?.textContent:labelMedia(target))+' in the right column'})}
 function highlightMatch(){paper.querySelectorAll('.paper-ref').forEach(link=>link.classList.toggle('reference-match',link.dataset.refTarget===matchedId));content.querySelectorAll('[data-evidence-id]').forEach(card=>card.classList.toggle('reference-match',card.dataset.evidenceId===matchedId))}
 function briefReference(ref){
  const clean=text=>(text||'').replace(/\s+/g,' ').trim();
  const blocks=[...ref.querySelectorAll('.ltx_bibblock')],texts=blocks.map(b=>clean(b.textContent));
  const author=(texts[0]||'').split(/,| and /)[0].replace(/\.$/,'');
  const year=texts.slice(1).join(' ').match(/\b(?:19|20)\d{2}\b/)?.[0]||'Year not listed';
  const title=(texts[1]||'Untitled reference').replace(/,\s*(?:[A-Z][a-z]+\.\s*)?(?:19|20)\d{2}\.?$/,'').replace(/\.$/,'');
  let venue=clean(ref.querySelector('em')?.textContent);
  const arxiv=texts.slice(1).join(' ').match(/arXiv:(\d{4}\.\d{4,5})/i);
  const url=ref.querySelector('a[href^="http"]')?.href||(arxiv?'https://arxiv.org/abs/'+arxiv[1]:null);
  if(/arxiv/i.test(venue)||(!venue&&url?.includes('arxiv.org')))venue='arXiv';
  else if(/computer vision and pattern recognition/i.test(venue))venue='CVPR';
  else if(/\(ICRA\)/i.test(venue))venue='ICRA';
  else if(/international conference on computer vision/i.test(venue))venue='ICCV';
  else if(/neural information processing systems/i.test(venue))venue='NeurIPS';
  else if(/european conference on computer vision/i.test(venue))venue='ECCV';
  else if(!venue)venue=url?.includes('github.com')?'GitHub':'Venue not listed';
  const card=document.createElement('li');card.className='reference-line';card.dataset.evidenceId=ref.id;card.dataset.refKind='citation';
  const heading=document.createElement('a');heading.className='reference-title';heading.textContent=clean(ref.querySelector('.ltx_tag')?.textContent)+' '+title;
  heading.href=url||'https://arxiv.org/html/2606.12604v1#'+ref.id;heading.target='_blank';heading.rel='noopener';
  const details=document.createElement('span');details.className='reference-meta';details.textContent=' — '+[venue,author,year].join(' · ');card.append(heading,details);return card;
 }
 function revealReference(link){const target=refTarget(link);if(!target)return false;setEvidenceScope('passage');matchedId=target.id;pinned={type:references.has(target.id)?'reference':'media',el:target};showEvidence(link.closest('main [data-block]')||active);window.openReaderPanel('sources');highlightMatch();const card=[...content.querySelectorAll('[data-evidence-id]')].find(card=>card.dataset.evidenceId===matchedId);if(card&&companion.scrollHeight>companion.clientHeight){companion.scrollTop+=card.getBoundingClientRect().top-companion.getBoundingClientRect().top-80}return true}
 function equationContext(equation){
  const section=equation.closest('section');
  const nodes=[...(section||paper).querySelectorAll('p.ltx_p,table.ltx_equation')].filter(node=>!node.closest('figure,.ltx_bibliography'));
  const index=nodes.indexOf(equation);
  let before=null,after=null;
  for(let i=index-1;i>=0;i--){if(nodes[i].matches('p')&&nodes[i].textContent.trim().length>35){before=nodes[i];break}}
  for(let i=index+1;i<nodes.length;i++){if(nodes[i].matches('table'))break;if(nodes[i].textContent.trim().length>35){after=nodes[i];break}}
  return {section,before,after};
 }
 function addEquationContext(card,equation){
  const {section,before,after}=equationContext(equation),location=before||after||section;
  const bar=document.createElement('div');bar.className='equation-location';
  const label=document.createElement('span');label.textContent=section?.querySelector('h2,h3,h4,h5,h6')?.textContent.trim()||'Paper equation';
  const jump=document.createElement('button');jump.textContent='↖ Jump to passage';jump.onclick=()=>{if(!location)return;location.scrollIntoView({behavior:'smooth',block:'center'});paper.querySelectorAll('.equation-origin').forEach(node=>node.classList.remove('equation-origin'));location.classList.add('equation-origin');location.setAttribute('tabindex','-1');location.focus({preventScroll:true})};bar.append(label,jump);card.append(bar);
  if(before){const context=document.createElement('div');context.className='equation-context';const takeaway=before.parentElement.querySelector(':scope > .paragraph-takeaway');if(takeaway)context.textContent=takeaway.textContent;else context.append(sourceClone(before));card.append(context)}
  card.append(sourceClone(equation));
  if(before||after){const details=document.createElement('details');details.open=true;details.className='equation-explanation';const summary=document.createElement('summary');summary.textContent='Surrounding text & symbol definitions';details.append(summary);for(const paragraph of [before,after].filter(Boolean))details.append(sourceClone(paragraph));card.append(details)}
 }
 function mediaCard(visual){
  const card=document.createElement('article');card.className='evidence-body';card.dataset.evidenceId=visual.id;card.dataset.refKind=refKind(visual);const title=document.createElement('h3');title.textContent=labelMedia(visual);
  if(visual.matches('.ltx_equation')){title.textContent='Equation '+labelMedia(visual);card.append(title);addEquationContext(card,visual)}else{card.append(title,sourceClone(visual));addVisualExpansion(card,visual)}return card;
 }
 function showMediaCatalog(force){
  const key='catalog-'+evidenceScope;if(lastKey===key&&!force)return;lastKey=key;
  content.querySelectorAll('video').forEach(v=>v.pause());content.replaceChildren();
  const selected=media.filter(el=>evidenceScope==='tables'?el.matches('figure.ltx_table'):el.matches('figure')&&!el.matches('.ltx_table'));
  byId('passage-section').textContent='All paper '+evidenceScope+' · '+selected.length;
  for(const visual of selected)content.append(mediaCard(visual));
 }
 function showEvidence(block,force=false){
  if(evidenceScope!=='passage'){if(block)active=block;showMediaCatalog(force);return;}
  if(!block)return;const passageChanged=active!==block;active=block;window.syncSolverGuide?.(block);window.updateGlossaryPassage?.(block);window.updateCodePassage?.(block);
  const section=block.closest('section'),ids=localLinks(block),cited=ids.filter(id=>references.has(id));
  let visuals=[...new Set(ids.map(resolveVisual).filter(Boolean))];
  if(!visuals.length){let scope=section;while(scope&&!visuals.length){visuals=media.filter(m=>origins.get(m)===scope);scope=scope.parentElement?.closest('section')}
   if(!visuals.length&&(!section||section.classList.contains('ltx_abstract')))visuals=media.slice(0,1);
  }
  const paragraphGroup=block.closest('.ltx_para');const nearbyEquations=media.filter(el=>el.matches('.ltx_equation')&&paragraphGroup?.contains(el));visuals=[...nearbyEquations,...visuals.filter(el=>!nearbyEquations.includes(el))];
  if(pinned?.type==='media')visuals=[pinned.el,...visuals.filter(el=>el!==pinned.el)];
  if(pinned?.type==='reference'&&!cited.includes(pinned.el.id))cited.unshift(pinned.el.id);
  const title=section?.querySelector('h2,h3,h4,h5,h6')?.textContent?.trim()||'Abstract';
  const clips=videoScope==='all'?demos:demos.filter(d=>d.sections.some(id=>byId(id)?.contains(block)));
  const key=clips.map(c=>c.id).join(',')+'|'+title+'|'+visuals.map(v=>v.id).join(',')+'|'+cited.join(',');if(key===lastKey&&!force){highlightMatch();return;}lastKey=key;
  if(passageChanged&&!byId('sources-panel').classList.contains('hidden'))companion.scrollTop=0;
  byId('passage-section').textContent=title;content.querySelectorAll('video').forEach(v=>v.pause());content.replaceChildren();
  if(cited.length){const group=document.createElement('section');group.className='citation-list';const heading=document.createElement('h3');heading.textContent='Cited in this passage';group.append(heading);
   const list=document.createElement('ul');list.className='reference-list';for(const id of [...new Set(cited)]){list.append(briefReference(references.get(id)))}group.append(list);content.append(group);
  }
  if(block.closest('#S3.SS3,#S4.SS2,#A2')&&window.createVisualComparison)content.append(window.createVisualComparison());
  for(const visual of visuals)content.append(mediaCard(visual));
  if(clips.length){const group=document.createElement('section');group.className='demo-list';const heading=document.createElement('h3');heading.textContent=videoScope==='all'?'Local video library':'Demos for this section';group.append(heading);
   for(const demo of clips){const card=document.createElement('figure');card.className='demo-card';const caption=document.createElement('figcaption');const title=document.createElement('strong');title.textContent=demo.title;const detail=document.createElement('p');detail.textContent=demo.description;caption.append(title,detail);
    const video=document.createElement('video');video.controls=true;video.playsInline=true;video.preload='none';video.src=demo.file;video.poster=demo.poster;video.setAttribute('aria-label',demo.title);video.addEventListener('play',()=>content.querySelectorAll('video').forEach(other=>{if(other!==video)other.pause()}));
    const source=document.createElement('a');source.href=demo.url;source.textContent='Official source ↗';source.target='_blank';source.rel='noopener';card.append(caption,video,source);group.append(card)}content.append(group);
  }
  window.decorateReportedValues?.(content);
  if(!cited.length&&!visuals.length&&!clips.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='Figures, tables, equations, and citations appear here when the current passage refers to them.';content.append(empty)}
 }
 window.refreshEvidence=()=>{decorateReferences();if(active)showEvidence(active,true);highlightMatch()};
 for(const event of ['pointerover','focusin'])paper.addEventListener(event,e=>{const link=e.target.closest('a.paper-ref');if(link&&!link.contains(e.relatedTarget))revealReference(link)});
 byId('annotate-passage').onclick=()=>{if(active?.dataset.block)setContext({block:active.dataset.block,start:0,end:active.textContent.length,quote:active.textContent});window.openReaderPanel('notes');byId('note').focus()};
 document.addEventListener('click',e=>{
  const link=e.target.closest('a[href^="#"]');if(link){const id=decodeURIComponent(link.getAttribute('href').slice(1)),ref=references.get(id),visual=resolveVisual(id);
   if(ref||visual){e.preventDefault();revealReference(link);return}
   if(bibliography&&id===bibliography.id){e.preventDefault();window.syncSolverGuide?.(null);content.replaceChildren();const list=document.createElement('ul');list.className='reference-list';for(const ref of references.values()){list.append(briefReference(ref))}content.append(list);byId('passage-section').textContent='References';lastKey='';window.openReaderPanel('sources');return}
  }
  const block=e.target.closest('main [data-block]');if(block&&!block.closest('.reading-visual')){pinned=null;matchedId=null;showEvidence(block);highlightMatch()}
 });
 const prose=[...paper.querySelectorAll('[data-block]')].filter(el=>!el.closest('.reading-visual'));
 function follow(){frame=0;updateContents();const top=document.querySelector('body > header').getBoundingClientRect().bottom+80;let closest=prose[0],distance=Infinity;for(const el of prose){const r=el.getBoundingClientRect();const d=r.top<=top&&r.bottom>=top?0:Math.abs(r.top-top);if(d<distance){distance=d;closest=el}}if(closest!==active){pinned=null;matchedId=null;showEvidence(closest);highlightMatch()}}
 window.addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(follow)},{passive:true});
 const headerObserver=new ResizeObserver(()=>document.documentElement.style.setProperty('--reader-header',document.querySelector('body > header').getBoundingClientRect().height+'px'));headerObserver.observe(document.querySelector('body > header'));
 window.addEventListener('resize',()=>{if(!frame)frame=requestAnimationFrame(follow)});
 decorateReferences();showEvidence(prose[0]);follow();
})();
