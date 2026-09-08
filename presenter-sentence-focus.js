const ignored='script,style,annotation,.paragraph-takeaway,.comment-sticker';
const stop=new Set('the a an and or to of in on for with is are was were be been this that it its as by we our they their from can could should would do does not only then when which what how into than so if at'.split(' '));
const tokens=text=>new Set((text.toLowerCase().match(/[a-z0-9]+/g)||[]).filter(w=>w.length>2&&!stop.has(w)));
export function spokenSentence(text,fraction){
  const sentences=[...new Intl.Segmenter('en',{granularity:'sentence'}).segment(text)];
  const wordAt=Math.floor((text.match(/\S+/g)||[]).length*fraction);let count=0;
  for(const item of sentences){count+=(item.segment.match(/\S+/g)||[]).length;if(wordAt<count)return item.segment;}
  return sentences.at(-1)?.segment||text;
}
export function chooseSentence(sentences,spoken,hint=''){
  const query=tokens(spoken);let best=-1,score=0;
  sentences.forEach((sentence,i)=>{const words=tokens(sentence);const overlap=[...query].filter(w=>words.has(w)).length;let value=overlap/Math.sqrt(Math.max(1,query.size)*Math.max(1,words.size));
    if(hint&&new RegExp('\\b'+hint.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(sentence))value+=query.size<=3?.8:query.has(hint.toLowerCase())?.3:0;
    if(value>score){score=value;best=i;}
  });return score>=.12?best:-1;
}
export function focusSentence(doc,target,spoken,hint=''){
  doc.querySelectorAll('.presenter-key-sentence').forEach(span=>span.replaceWith(...span.childNodes));
  const el=doc.getElementById(target),scope=el?.matches('p')?el:el?.querySelector('p.ltx_p');if(!scope||!spoken)return;
  scope.normalize();const nodes=[];let text='';const walker=doc.createTreeWalker(scope,4);let node;
  while(node=walker.nextNode()){if(node.parentElement.closest(ignored))continue;nodes.push({node,start:text.length});text+=node.textContent;}
  const segments=[...new Intl.Segmenter('en',{granularity:'sentence'}).segment(text)];
  const selected=chooseSentence(segments.map(s=>s.segment),spoken,hint);if(selected<0)return;
  const segment=segments[selected],start=segment.index,end=start+segment.segment.length;
  for(const item of nodes){const a=Math.max(0,start-item.start),b=Math.min(item.node.length,end-item.start);if(b<=a)continue;const range=doc.createRange();range.setStart(item.node,a);range.setEnd(item.node,b);const span=doc.createElement('span');span.className='presenter-key-sentence';range.surroundContents(span);}
}
