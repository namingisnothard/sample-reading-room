const dialog=document.getElementById('snapshot-dialog');
document.querySelectorAll('[data-snapshot]').forEach(button=>button.addEventListener('click',()=>{document.getElementById('snapshot-image').src=button.dataset.snapshot;document.getElementById('snapshot-image').alt=button.dataset.caption;document.getElementById('snapshot-caption').textContent=button.dataset.caption;document.getElementById('snapshot-description').textContent=button.dataset.description||'Screenshot of the original source. Twitter views include the author and post context.';dialog.showModal()}));
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});

const sourceTabs=[...document.querySelectorAll('[data-source-tab]')];
function selectSource(key){sourceTabs.forEach(tab=>{const selected=tab.dataset.sourceTab===key;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;document.getElementById('snapshot-panel-'+tab.dataset.sourceTab).hidden=!selected})}
sourceTabs.forEach((tab,index)=>{tab.onclick=()=>selectSource(tab.dataset.sourceTab);tab.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?sourceTabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+sourceTabs.length)%sourceTabs.length;selectSource(sourceTabs[next].dataset.sourceTab);sourceTabs[next].focus()}}});

const mediaTabs=[...document.querySelectorAll('[data-media-tab]')];
function selectMedia(key){document.querySelectorAll('#project-gallery video').forEach(v=>v.pause());mediaTabs.forEach(t=>{const active=t.dataset.mediaTab===key;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;document.getElementById('media-'+t.dataset.mediaTab).hidden=!active});if(key==='analogy')window.prepareAnalogy?.();else window.pauseAnalogy?.();}
mediaTabs.forEach((tab,i)=>{tab.onclick=()=>selectMedia(tab.dataset.mediaTab);tab.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?mediaTabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+mediaTabs.length)%mediaTabs.length;selectMedia(mediaTabs[next].dataset.mediaTab);mediaTabs[next].focus()}}});
const galleries={
 knife:{context:'One knife task across three views. The real-robot clip is refined trajectory replay, separate from learned-policy evaluation. The project uses a vertical offset and a sponge beneath the knife.',items:[['Human input','project-knife-human.mp4'],['Simulation','project-knife-sim.mp4'],['Real robot · refined replay','video-trajectory-replay.mp4','video-trajectory-replay.jpg']]},
 visual:{context:'Compare the source human observation with the synthesized robot observation.',items:[['Human input','video-visual-human.mp4','video-visual-human.jpg'],['Generated robot view','video-visual-ego.mp4','video-visual-ego.jpg']]},
 policy:{context:'Real-robot execution of policies trained on generated demonstrations. Each clip is an example, not an aggregate success-rate measurement.',items:[['Mustard','video-policy-mustard.mp4','video-policy-mustard.jpg'],['Drawer','video-policy-drawer.mp4','video-policy-drawer.jpg'],['Hammer','video-policy-hammer.mp4','video-policy-hammer.jpg'],['Flower','video-policy-flower.mp4','video-policy-flower.jpg']]},
 figures:{context:'Official project illustrations. Open any image at full size to inspect labels and reported results.',items:[['Method pipeline','project-pipeline.png'],['Policy success rates','project-results.png'],['Visual/action ablation','project-ablation.png']]}
};
const gallery=document.getElementById('project-gallery'),gallerySelect=document.getElementById('project-gallery-select');
function showGallery(){gallery.querySelectorAll('video').forEach(v=>v.pause());gallery.replaceChildren();if(gallerySelect.value==='comparison'){gallery.dataset.kind='comparison';document.getElementById('project-gallery-context').textContent='Pipelines and reported visual-fidelity scores, side by side.';gallery.append(window.createVisualComparison());return}const chosen=galleries[gallerySelect.value];gallery.dataset.kind=gallerySelect.value;document.getElementById('project-gallery-context').textContent=chosen.context;
 for(const [title,file,poster] of chosen.items){const card=document.createElement('figure'),caption=document.createElement('figcaption');caption.textContent=title;
  if(file.endsWith('.mp4')){const video=document.createElement('video');video.src='assets/'+file;video.controls=true;video.playsInline=true;video.preload='metadata';if(poster)video.poster='assets/'+poster;video.setAttribute('aria-label',title);video.onplay=()=>gallery.querySelectorAll('video').forEach(other=>{if(other!==video)other.pause()});card.append(video)}else{const button=document.createElement('button');button.className='gallery-image';const img=document.createElement('img');img.src='assets/'+file;img.alt=title;button.append(img);button.setAttribute('aria-label','Enlarge '+title);button.onclick=()=>{document.getElementById('snapshot-image').src=img.src;document.getElementById('snapshot-image').alt=title;document.getElementById('snapshot-caption').textContent=title;document.getElementById('snapshot-description').textContent='Official project illustration · egoengine.github.io';dialog.showModal()};card.append(button)}card.append(caption);gallery.append(card)
 }
}
gallerySelect.onchange=showGallery;showGallery();

// Decorative clips stay silent; reduced-motion users start with still frames.
const heroVideos=[...document.querySelectorAll('.hero-videos video')],motionButton=document.getElementById('hero-motion'),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let backgroundRequested=!reducedMotion.matches;
function refreshMotion(){const playing=backgroundRequested&&!document.hidden;heroVideos.forEach(video=>{video.muted=true;if(playing)video.play().catch(()=>{});else video.pause()});motionButton.setAttribute('aria-pressed',String(backgroundRequested));motionButton.textContent=backgroundRequested?'Pause background':'Play background'}
motionButton.onclick=()=>{backgroundRequested=!backgroundRequested;refreshMotion()};document.addEventListener('visibilitychange',refreshMotion);reducedMotion.addEventListener('change',event=>{backgroundRequested=!event.matches;refreshMotion()});refreshMotion();

// The original embed is the default; a browser-local copy enables guided playback.
const analogyPlayer=document.getElementById('analogy-player');
let analogyURL=null, analogyPlaying=false, analogyGeneration=0;
function mediaStore(mode,operation){return new Promise((resolve,reject)=>{const request=indexedDB.open('egoengine-local-media',1);request.onupgradeneeded=()=>request.result.createObjectStore('clips');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('clips',mode),result=operation(tx.objectStore('clips'));tx.oncomplete=()=>{resolve(result.result);db.close()};tx.onerror=()=>{reject(tx.error);db.close()}}})}
window.prepareAnalogy=async function(){
 if(analogyPlayer.firstElementChild)return;
 const generation=++analogyGeneration;
 let file;try{file=await mediaStore('readonly',s=>s.get('coffee'))}catch{}
 if(generation!==analogyGeneration)return;
 if(file){
  const video=document.createElement('video');analogyURL=URL.createObjectURL(file);video.src=analogyURL;video.controls=true;video.muted=true;video.playsInline=true;video.preload='auto';video.setAttribute('aria-label','Coffee analogy · local presentation copy');analogyPlayer.append(video);
  document.getElementById('analogy-status').textContent='Local copy: '+file.name+' · saved in this browser only. Guided playback starts muted.';
  document.getElementById('remove-analogy-copy').hidden=false;
  video.onerror=()=>{document.getElementById('analogy-status').textContent='This video cannot be played. Try an MP4 (H.264), or use the Instagram embed.'};
  if(analogyPlaying)video.play().catch(()=>{document.getElementById('analogy-status').textContent='Playback was blocked. Press Play on the video.'});
 }else{
  const frame=document.createElement('iframe');frame.src='https://www.instagram.com/p/DZmolRIOBvo/embed/';frame.title='Mini barista in training — Instagram post by @chel_constanti';frame.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';frame.allowFullscreen=true;analogyPlayer.append(frame);
  document.getElementById('analogy-status').textContent='Instagram embed: playback may open Instagram or require sign-in. For inline guided autoplay, choose a local copy below.';
  document.getElementById('remove-analogy-copy').hidden=true;
 }
};
window.playAnalogy=async function(){analogyPlaying=true;await window.prepareAnalogy();const v=analogyPlayer.querySelector('video');if(v)v.play().catch(()=>{document.getElementById('analogy-status').textContent='Press Play on the video to allow playback.'})};
window.pauseAnalogy=function(){analogyPlaying=false;analogyPlayer.querySelector('video')?.pause();if(analogyPlayer.querySelector('iframe')){analogyGeneration++;analogyPlayer.replaceChildren()}};
function clearAnalogy(){analogyGeneration++;analogyPlayer.querySelector('video')?.pause();analogyPlayer.replaceChildren();if(analogyURL)URL.revokeObjectURL(analogyURL);analogyURL=null;}
document.getElementById('analogy-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{await mediaStore('readwrite',s=>s.put(file,'coffee'));clearAnalogy();await window.prepareAnalogy()}catch{document.getElementById('analogy-status').textContent='Could not save this clip. Browser storage may be full or unavailable.'}e.target.value=''};
document.getElementById('remove-analogy-copy').onclick=async()=>{try{await mediaStore('readwrite',s=>s.delete('coffee'));clearAnalogy();await window.prepareAnalogy()}catch{document.getElementById('analogy-status').textContent='Could not remove the saved clip.'}};
document.querySelector('[data-open-analogy]').onclick=()=>{selectMedia('analogy');document.getElementById('media-tab-analogy').focus();document.getElementById('media-analogy').scrollIntoView({block:'nearest',behavior:reducedMotion.matches?'auto':'smooth'})};
