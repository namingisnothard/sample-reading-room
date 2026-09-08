'use strict';
(()=>{
 // Decorations preserve every text character, so saved annotation offsets remain valid.
 const number=/(?<![\p{L}\p{N}_])(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?:[kK](?=\b))?(?:\s*[×x]\s*\d+(?:\.\d+)?)?(?:\s*(?:%|Hz\b|kHz\b|fps\b|hours?\b|minutes?\b|seconds?\b|ms\b|timesteps?\b|steps?\b|demos?\/hour\b|episodes?\b|videos?\b|sequences?\b|tasks?\b|scenes?\b|demonstrators?\b|trials?\b|demonstrations?\b|pixels?\b|cm\b|mm\b|m\b|rad\b|p\b))?(?![\p{L}\p{N}_])/giu;
 const wordCount=/\b(?:one|two|three|four|five|six|seven|eight|nine|ten|twelve|sixteen|twenty|hundred)\s+(?:hours?|videos?|demonstrations?|tasks?|trials?|sequences?|scenes?|demonstrators?|steps?|rollouts?|frames?|episodes?)\b/gi;
 window.decorateReportedValues=(root=document.querySelector('main>article'))=>{
  if(!root)return;
  for(const block of root.querySelectorAll('p.ltx_p,figcaption,td')){
   if(block.closest('.ltx_bibliography,.ltx_equation')||block.parentElement.closest('figcaption,td'))continue;
   const walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT),nodes=[];
   while(walker.nextNode()){const node=walker.currentNode;if(!node.parentElement.closest('math,.rendered-math,a,button,mark,.reported-value,.ltx_tag,.solver-term,.comment-sticker,code'))nodes.push(node)}
   for(const node of nodes){const text=node.textContent;const matches=[...text.matchAll(number),...text.matchAll(wordCount)].sort((a,b)=>a.index-b.index);let offset=0;const frag=document.createDocumentFragment();
    for(const match of matches){if(match.index<offset)continue;const before=text.slice(0,match.index);if(/(?:Fig(?:ure)?s?\.?|Tab(?:le)?s?\.?|Sec(?:tion)?s?\.?|Eq(?:uation)?s?\.?)\s*(?:[A-Z]\.)?\s*$/i.test(before))continue;
     // Numbered list markers are structure, not reported measurements.
     if(/^\s*$/.test(before)&&/^[.)]/.test(text.slice(match.index+match[0].length)))continue;
     frag.append(document.createTextNode(text.slice(offset,match.index)));const span=document.createElement('span');span.className='reported-value';span.textContent=match[0];frag.append(span);offset=match.index+match[0].length;
    }if(offset){frag.append(document.createTextNode(text.slice(offset)));node.replaceWith(frag)}
   }
  }
  for(const math of root.querySelectorAll('p.ltx_p math[alttext]')){
   if(math.closest('mark,.ltx_equation')||math.dataset.removed==='true'||math.style.background)continue;
   const tex=math.getAttribute('alttext');
   // Numeric settings/ranges, including H=20 and 10 cm × 10 cm; leave symbolic formulas alone.
   const plain=tex.replace(/\\(?:mathrm|text|operatorname)\{([^}]*)\}/g,'$1').replace(/\\(?:times|pm|cdot|,|;|!|quad|left|right)/g,' ').replace(/[{}\\\s]/g,'');
   if(!/\d/.test(plain)||!/^(?:[A-Za-z](?:_[A-Za-z]+)?=)?[-+±\d.,()[\]×^]+(?:(?:cm|mm|m|rad|Hz|s|circ|%|p)[-+±\d.,()[\]×^]*)*$/.test(plain))continue;
   const host=math.previousElementSibling?.classList.contains('rendered-math')?math.previousElementSibling:math;host.classList.add('reported-value');
  }
 };
 window.decorateReportedValues();window.decorateReportedValues(document.querySelector('#evidence-content'));
})();
