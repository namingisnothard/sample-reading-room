// Speech stays in the presenter window; audience windows receive visual cues only.
export class NoteReader {
  constructor(synth, Utterance) { this.synth=synth;this.Utterance=Utterance;this.generation=0; }
  stop(){this.generation++;clearInterval(this.ticker);if(this.utterance)this.synth.cancel();this.utterance=null;if(this.audio){this.audio.pause();this.audio.removeAttribute('src');this.audio=null;}}
  async readRecording(text,{rate=1,startWord=0,onprogress,onend,onerror}){
    this.stop();const token=this.generation;
    try{
      this.recordings ||= fetch('assets/narration/manifest.json').then(r=>{if(!r.ok)throw Error('recordings-unavailable');return r.json();});
      const manifest=await this.recordings;
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text.trim().replace(/\s+/g,' ')));
      const key=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,20);
      if(token!==this.generation)return;
      if(!manifest[key]){onerror('notes-changed');return;}
      const audio=new Audio('assets/narration/'+manifest[key]);this.audio=audio;audio.playbackRate=rate;
      audio.onloadedmetadata=()=>{if(token!==this.generation)return;audio.currentTime=audio.duration*startWord/Math.max(1,(text.match(/\S+/g)||[]).length);audio.play().catch(()=>{if(token===this.generation)onerror('audio-playback-blocked');});};
      audio.ontimeupdate=()=>{if(token===this.generation&&Number.isFinite(audio.duration))onprogress(Math.min(.999,audio.currentTime/audio.duration));};
      audio.onended=()=>{if(token===this.generation)onend();};
      audio.onerror=()=>{if(token===this.generation)onerror('recording-unavailable');};
    }catch(error){if(token===this.generation)onerror(error.message||'recordings-unavailable');}
  }
  read(text,{voice,rate=1,startWord=0,onprogress,onend,onerror}){
    this.stop();const token=this.generation,words=text.match(/\S+/g)||[];let offset=Math.min(words.length,Math.max(0,startWord));
    const next=()=>{
      if(token!==this.generation)return;
      if(offset>=words.length){onend();return;}
      // Short utterances avoid long-speech stalls in browser speech engines.
      let end=Math.min(words.length,offset+32);
      for(let i=end-1;i>offset+10;i--)if(/[.!?][”"']?$/.test(words[i])){end=i+1;break;}
      const chunk=words.slice(offset,end).join(' '),utterance=new this.Utterance(chunk);this.utterance=utterance;
      utterance.voice=voice||null;utterance.lang=voice?.lang||'en-US';utterance.rate=rate;
      let word=offset,stamp=Date.now(),started=false;
      const emit=()=>{if(token===this.generation&&started)onprogress(Math.min(end-.05,word+(Date.now()-stamp)/1000*rate*175/60)/words.length);};
      utterance.onstart=()=>{if(token!==this.generation)return;started=true;stamp=Date.now();onprogress(offset/words.length);clearInterval(this.ticker);this.ticker=setInterval(emit,100);};
      utterance.onboundary=e=>{if(token!==this.generation)return;word=offset+(chunk.slice(0,e.charIndex).match(/\S+/g)||[]).length;stamp=Date.now();onprogress(word/words.length);};
      utterance.onend=()=>{if(token!==this.generation)return;clearInterval(this.ticker);if(!started){onerror('voice-did-not-start');return;}offset=end;next();};
      utterance.onerror=e=>{if(token!==this.generation)return;clearInterval(this.ticker);onerror(e.error||'speech-unavailable');};
      this.synth.speak(utterance);
    };next();
  }
}
