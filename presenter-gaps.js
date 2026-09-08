// Introductory explanation; media are the official project's illustrative demos.
export function gapVisuals(doc) {
  const root=doc.createElement('div');root.className='gap-visuals';
  const cards=[
    {id:'visual',title:'Visual gap · what the robot sees',caption:'Same task, different embodiment and occlusion in the image.',clips:[['visual-human','Human observation'],['visual-ego','Generated robot observation']]},
    {id:'action',title:'Action gap · what the robot can execute',caption:'Matching human motion does not guarantee feasible robot contact. Watch the object, not just the hand.',clips:[['action-replay','Direct replay · no refinement'],['action-refined','After RL refinement']]}
  ];
  for(const card of cards){const section=doc.createElement('section');section.dataset.gap=card.id;
    const title=doc.createElement('h3');title.textContent=card.title;section.append(title);
    const pair=doc.createElement('div');pair.className='gap-pair';
    for(const [file,label] of card.clips){const figure=doc.createElement('figure'),video=doc.createElement('video'),caption=doc.createElement('figcaption');video.src='assets/video-'+file+'.mp4';video.poster='assets/video-'+file+'.jpg';video.muted=true;video.loop=true;video.autoplay=true;video.playsInline=true;video.controls=true;video.preload='metadata';video.setAttribute('aria-label',label);caption.textContent=label;figure.append(video,caption);pair.append(figure);}
    const text=doc.createElement('p');text.textContent=card.caption;section.append(pair,text);root.append(section);
  }
  const source=doc.createElement('p');source.className='gap-source';source.innerHTML='The “twofold” challenge: <a href="#S1.p2.1">§1, paragraph 2</a>. Illustrative <a href="https://egoengine.github.io/" target="_blank" rel="noopener">official project demos ↗</a>; these clips are not aggregate experimental evidence.';root.append(source);
  const style=doc.createElement('style');style.textContent=`#presenter-aid .gap-visuals section{padding:12px;border:2px solid #d4ddd0;border-radius:9px;margin-bottom:12px;transition:background .4s,border-color .4s}#presenter-aid .gap-visuals section[data-active]{border-color:#64865b;background:#edf3e7}#presenter-aid .gap-visuals h3{font-size:19px;margin:0 0 9px}#presenter-aid .gap-pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}#presenter-aid .gap-pair video{display:block;width:100%;aspect-ratio:4/3;object-fit:contain;background:#111;border-radius:5px}#presenter-aid .gap-pair figcaption{font:600 13px/1.3 system-ui;margin:6px 0 0}#presenter-aid .gap-visuals p{font:15px/1.4 system-ui;margin:9px 0 0}#presenter-aid .gap-visuals .gap-source{font-size:12px}`;root.append(style);return root;
}
