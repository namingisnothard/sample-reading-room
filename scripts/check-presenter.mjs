import assert from 'node:assert/strict';
import fs from 'node:fs';
const moduleFrom=async name=>import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(new URL('../'+name,import.meta.url))).toString('base64'));
const {NoteReader}=await moduleFrom('presenter-narration.js');
const {chooseSentence,spokenSentence}=await moduleFrom('presenter-sentence-focus.js');
assert.equal(chooseSentence(['Replay executes the reference.','MPC optimizes a local trajectory.','RL learns residual corrections.'],'MPC searches locally around the reference.','MPC'),1);
assert.equal(chooseSentence(['Replay executes the reference.'],'Bananas and astronomy.'),-1);
assert.equal(spokenSentence('Replay runs first. MPC corrects errors.',.8),'MPC corrects errors.');
const spoken=[];let cancelled=0,ended=0,progress=-1,error='';const synth={cancel(){cancelled++;},speak(u){spoken.push(u);}};
class Utterance{constructor(text){this.text=text;}}
const reader=new NoteReader(synth,Utterance);
const callbacks={onprogress:f=>progress=f,onend:()=>ended++,onerror:e=>error=e};
reader.read('one two three four',{...callbacks,startWord:1});
assert.equal(spoken.at(-1).text,'two three four');spoken.at(-1).onstart();spoken.at(-1).onboundary({charIndex:4});assert.equal(progress,.5);
const stale=spoken.at(-1);reader.stop();stale.onend();assert.equal(ended,0,'cancelled audio cannot advance the transcript');
reader.read(Array.from({length:70},(_,i)=>'word'+i).join(' '),callbacks);
for(let i=0;i<3;i++){assert.ok(spoken.at(-1).text.split(' ').length<=32);spoken.at(-1).onstart();spoken.at(-1).onend();}
assert.equal(ended,1,'advance only after all speech chunks finish');
reader.read('unavailable voice',callbacks);spoken.at(-1).onend();assert.equal(error,'voice-did-not-start');assert.equal(ended,1);
reader.read('error example',callbacks);spoken.at(-1).onerror({error:'voice-unavailable'});assert.equal(error,'voice-unavailable');reader.stop();
console.log('PASS: speech chunking, resume position, cancellation, completion, errors, and sentence selection.');
const {createHash}=await import('node:crypto');
const text='one two three four',key=createHash('sha256').update(text).digest('hex').slice(0,20);
globalThis.fetch=async()=>({ok:true,json:async()=>({[key]:'test.m4a'})});
let audio;
globalThis.Audio=class{constructor(src){this.src=src;this.duration=8;audio=this;}pause(){this.paused=true;}removeAttribute(){}play(){this.played=true;return Promise.resolve();}};
await reader.readRecording(text,{...callbacks,startWord:2,rate:.8});audio.onloadedmetadata();assert.equal(audio.currentTime,4);assert.equal(audio.playbackRate,.8);audio.ontimeupdate();assert.equal(progress,.5);
const oldAudio=audio;reader.stop();oldAudio.onended();assert.equal(ended,1,'stale audio cannot advance after pause');
await reader.readRecording('changed note text',callbacks);assert.equal(error,'notes-changed','never use stale recorded words for edited notes');
reader.stop();console.log('PASS: recorded voice seek, speed, cancellation, and edited-note protection.');
const narrationPath=new URL('../assets/narration/manifest.json',import.meta.url);
if(fs.existsSync(narrationPath)){
 const manifest=JSON.parse(fs.readFileSync(narrationPath));
 const script=fs.readFileSync(new URL('../rehearsal-script.md',import.meta.url),'utf8').replace(/<!--[^]*?-->/g,'');
 for(let block of script.split(/\n\s*\n/)){block=block.trim();if(!block||/^#{1,2}\s/.test(block)||/^[-*_]{3,}$/.test(block))continue;
  const speech=block.replace(/^###\s+|^>\s?|^\s*[-•]\s+/gm,'').replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g,'$1').replace(/\*\*|`/g,'').split(/\s+/).filter(w=>/[\p{L}\p{N}]/u.test(w)).join(' ');
  if(speech){const key=createHash('sha256').update(speech).digest('hex').slice(0,20);assert.ok(manifest[key],'Missing recording for: '+speech.slice(0,70));}
 }

 for(const file of Object.values(manifest))assert.ok(fs.statSync(new URL('../assets/narration/'+file,import.meta.url)).size>1000,'recording must contain audio: '+file);
 console.log('PASS: '+Object.keys(manifest).length+' recorded audio files.');
}
