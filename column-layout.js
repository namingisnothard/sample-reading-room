'use strict';
(()=>{
 const reading=!!document.querySelector('main>article.ltx_document'),root=document.querySelector(reading?'.layout':'.columns');if(!root)return;
 const key='egoengine-column-widths-'+(reading?'reader':'commentary');let preferences={};try{preferences=JSON.parse(localStorage.getItem(key)||'{}')}catch{}
 let panes=[],handles=[],widths=[],signature='',drag=null,frame=0;
 const reset=document.createElement('button');reset.className='auto-columns';reset.textContent='Auto columns';reset.title='Restore automatic column widths';(reading?document.querySelector('body>header'):document.querySelector('header nav')).append(reset);
 const label=p=>p.id==='paper-contents'?'Contents':p.tagName==='MAIN'?'Paper text':p.id==='reading-companion'?'Figures and notes':p.id==='reader-glossary'?'Glossary':p.id==='reader-code'?'Code':p.id==='paper-summary'?'Summary':p.classList.contains('source-snapshots')?'Demos and illustrations':'Commentary';
 function available(){const style=getComputedStyle(root);return root.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-(panes.length-1)*(parseFloat(style.columnGap)||0)}
 function minimum(p){return p.id==='paper-contents'?160:p.tagName==='MAIN'?360:p.classList.contains('source-snapshots')?300:240}
 function distribute(total,weights){const mins=panes.map(minimum),remaining=total-mins.reduce((a,b)=>a+b,0);if(remaining<0)return weights.map(()=>total/weights.length);const sum=weights.reduce((a,b)=>a+b,0);return weights.map((v,i)=>mins[i]+remaining*v/sum)}
 function renderWidths(){root.style.gridTemplateColumns=widths.map(w=>Math.max(0,w)+'px').join(' ');panes.forEach((p,i)=>{p.classList.add('resizable-pane');if(p.tagName==='MAIN')p.classList.toggle('compact-prose',widths[i]<650)});positionHandles()}
 function positionHandles(){const r=root.getBoundingClientRect(),header=document.querySelector('body>header').getBoundingClientRect();handles.forEach((h,i)=>{const a=panes[i].getBoundingClientRect(),b=panes[i+1].getBoundingClientRect(),top=Math.max(r.top,header.bottom);h.style.left=((a.right+b.left)/2-6)+'px';h.style.top=top+'px';h.style.height=Math.max(0,Math.min(r.bottom,innerHeight)-top)+'px';h.hidden=top>=innerHeight||r.bottom<=top;h.setAttribute('aria-valuenow',String(Math.round(widths[i])));h.setAttribute('aria-valuetext',label(panes[i])+': '+Math.round(widths[i])+' pixels')})}
 function remember(){const total=widths.reduce((a,b)=>a+b,0);preferences[signature]=widths.map(w=>w/total);try{localStorage.setItem(key,JSON.stringify(preferences))}catch{}}
 function move(index,delta,start=widths){const total=start[index]+start[index+1],minA=minimum(panes[index]),minB=minimum(panes[index+1]);widths=[...start];widths[index]=Math.max(minA,Math.min(total-minB,start[index]+delta));widths[index+1]=total-widths[index];renderWidths()}
 function clearHandles(){handles.forEach(h=>h.remove());handles=[]}
 function makeHandles(){clearHandles();for(let i=0;i<panes.length-1;i++){const h=document.createElement('div');h.className='column-resizer';h.tabIndex=0;h.setAttribute('role','separator');h.setAttribute('aria-orientation','vertical');h.setAttribute('aria-label','Resize '+label(panes[i])+' and '+label(panes[i+1]));h.setAttribute('aria-valuemin',String(minimum(panes[i])));h.title='Drag to resize · double-click for automatic widths · arrow keys to adjust';
  h.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();drag={index:i,x:e.clientX,widths:[...widths]};h.setPointerCapture(e.pointerId);document.body.classList.add('resizing-columns')};
  h.onpointermove=e=>{if(drag)move(drag.index,e.clientX-drag.x,drag.widths)};
  const finish=()=>{if(!drag)return;drag=null;remember();document.body.classList.remove('resizing-columns');schedule()};h.onpointerup=finish;h.onpointercancel=finish;h.onlostpointercapture=finish;
  h.ondblclick=()=>reset.click();h.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();move(i,(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?50:15));remember()}else if(e.key==='Home'){e.preventDefault();reset.click()}};document.body.append(h);handles.push(h)
 }}
 function layout(){frame=0;if(drag){positionHandles();return}
  const next=[...root.children].filter(p=>(!p.matches('nav')||p.id==='paper-contents')&&!p.hidden&&getComputedStyle(p).display!=='none'&&getComputedStyle(p).position!=='fixed');
  const nextSignature=next.map(label).join('|'),changed=nextSignature!==signature;root.querySelectorAll(':scope > .resizable-pane').forEach(p=>p.classList.remove('resizable-pane'));panes=next;signature=nextSignature;
  const stacked=innerWidth<=(reading?820:900);root.classList.toggle('columns-stacked',stacked);
  if(stacked||panes.length<2){root.style.gridTemplateColumns='';clearHandles();return}
  const total=available(),saved=preferences[signature];const defaults=panes.map((p,i)=>p.id==='paper-contents'?0.18:['paper-summary','reader-glossary','reader-code'].includes(p.id)?0.6:reading?(p.tagName==='MAIN'?1.3:1):(i===0?0.8:1.2));
  if(Array.isArray(saved)&&saved.length===panes.length&&saved.every(v=>Number.isFinite(v)&&v>0)){
   widths=saved.map(v=>v*total/saved.reduce((a,b)=>a+b,0));if(widths.some((w,i)=>w<minimum(panes[i])))widths=distribute(total,saved);
  }else widths=distribute(total,defaults);
  if(changed||handles.length!==panes.length-1)makeHandles();renderWidths();
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(layout)}
 reset.onclick=()=>{delete preferences[signature];try{localStorage.setItem(key,JSON.stringify(preferences))}catch{}schedule()};
 new ResizeObserver(schedule).observe(root);new MutationObserver(schedule).observe(root,{childList:true,subtree:false});
 for(const p of root.children){let wasOpen=p.classList.contains('contents-open');new MutationObserver(()=>{if(p.id==='paper-contents'){const open=p.classList.contains('contents-open');if(open===wasOpen)return;wasOpen=open}schedule()}).observe(p,{attributes:true,attributeFilter:p.id==='paper-contents'?['hidden','class']:['hidden']});}
 new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});
 window.addEventListener('resize',schedule);window.addEventListener('scroll',positionHandles,{passive:true});layout();
})();
