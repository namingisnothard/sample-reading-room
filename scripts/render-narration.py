"""Render current bundled notes with macOS Samantha. Requires say and ffmpeg."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,re,subprocess,tempfile
root=Path(__file__).resolve().parent.parent
out=root/'assets/narration';out.mkdir(exist_ok=True)
s=(root/'rehearsal-script.md').read_text();s=re.sub(r'<!--.*?-->','',s,flags=re.S)
texts=[]
for chunk in re.split(r'\n\s*\n',s):
 chunk=chunk.strip()
 if not chunk or re.match(r'^#{1,2}\s',chunk) or re.fullmatch(r'[-*_]{3,}',chunk):continue
 chunk=re.sub(r'^###\s+|^>\s?|^\s*[-•]\s+', '',chunk,flags=re.M)
 chunk=re.sub(r'\[([^\]]+)\]\(https?://[^)]+\)',r'\1',chunk)
 chunk=chunk.replace('**','').replace('`','')
 text=' '.join(w for w in chunk.split() if any(c.isalnum() for c in w))
 if text:texts.append(text)
def render(text):
 key=hashlib.sha256(text.encode()).hexdigest()[:20];name=key+'.m4a';dest=out/name
 if not dest.exists():
  with tempfile.TemporaryDirectory(prefix='presenter-voice-') as tmp:
   t=Path(tmp)/'text.txt';a=Path(tmp)/'voice.aiff';t.write_text(text)
   for attempt in range(3):
    try:
     subprocess.run(['say','-v','Samantha','-r','175','-f',str(t),'-o',str(a)],check=True,timeout=30);break
    except subprocess.TimeoutExpired:
     if attempt==2:raise
   subprocess.run(['ffmpeg','-v','error','-i',str(a),'-c:a','aac','-b:a','48k','-movflags','+faststart',str(dest)],check=True)
 return key,name
with ThreadPoolExecutor(max_workers=1) as pool:
 manifest=dict(pool.map(render,dict.fromkeys(texts)))
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Rendered',len(manifest),'paragraphs',flush=True)
