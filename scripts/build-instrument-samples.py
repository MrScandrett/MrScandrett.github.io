#!/usr/bin/env python3
"""Build the small, local practice sample bank. Requires ffmpeg; no runtime CDN.
Sources/commits, original names, license and conversion are recorded in manifest.json.
"""
import concurrent.futures, hashlib, json, re, subprocess, sys, tempfile, urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/audio/instruments'
TONE='https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/'
VSCO='https://raw.githubusercontent.com/sgossner/VSCO-2-CE/440300901dfe9275fd84e0b7763af1f8443ae62e/'
def get(url):
    return subprocess.check_output(['curl','--fail','--silent','--show-error','--location','--retry','2','--max-time','60',url])
def midi(p):
    m=re.fullmatch(r'([A-G])([#b]?)(-?\d+)',p); return (int(m[3])+1)*12+{'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}[m[1]]+({'#':1,'b':-1}.get(m[2],0))
# Pin the publisher revision; this file is the reproducible source of the subset.
PIN=''
lock=OUT/'sources.json'
if lock.exists(): PIN=json.loads(lock.read_text())['toneCommit']
else: PIN=json.loads(get('https://api.github.com/repos/nbrosowsky/tonejs-instruments/commits/master'))['sha']
base=TONE+PIN+'/'
source=get(base+'Tonejs-Instruments.js').decode()
OUT.mkdir(parents=True,exist_ok=True)
(OUT/'TONE-LICENSE.md').write_bytes(get(base+'LICENSE.md'))
(OUT/'TONE-SOURCES.txt').write_bytes(get(base+'sample-source-info.txt'))
(OUT/'VSCO-LICENSE.txt').write_bytes(get(VSCO+'LICENSE'))
lock.write_text(json.dumps({'toneCommit':PIN,'vscoCommit':'440300901dfe9275fd84e0b7763af1f8443ae62e'},indent=2)+'\n')
banks={
'piano':('piano',21,108,False),'pluck':('guitar-nylon',40,88,False),'bass':('bass-electric',28,72,False),
'sax':('saxophone',48,88,True),'violin':('violin',55,100,True),'cello':('cello',36,79,True),
'contrabass':('contrabass',28,67,True),'flute':('flute',60,96,True),'clarinet':('clarinet',50,94,True),
'bassoon':('bassoon',34,81,True),'horn':('french-horn',29,89,True),'trumpet':('trumpet',52,90,True),
'organ':('organ',36,96,True),'harp':('harp',24,96,False),'xylophone':('xylophone',60,96,False)}
manifest={'version':1,'license':'CC BY 3.0 (Tonejs-Instruments); CC0 (VSCO 2 CE)','source':'https://github.com/nbrosowsky/tonejs-instruments','conversion':'Mono 32 kHz MP3 64 kb/s; silence trimmed; peaks normalized to -3 dB; max 6 seconds. Sparse roots use nearest-note resampling.','banks':{}}
jobs=[]
for name,(folder,lo,hi,loop) in banks.items():
    block=re.search(r"    '"+re.escape(folder)+r"': \{(.*?)\n    \}",source,re.S)[1]
    candidates={midi(p):file for p,file in re.findall(r"'([A-G][#b]?-?\d+)': '([^']+)\.\[mp3\|ogg\]'",block)}
    selected=set()
    for target in range(lo,hi+1,6): selected.add(min(candidates,key=lambda n:abs(n-target)))
    selected.add(max(candidates))
    manifest['banks'][name]={'sustain':loop,'roots':[]}
    for pitch in sorted(selected):
        file=candidates[pitch];url=base+'samples/'+folder+'/'+file+'.mp3'
        jobs.append((name,pitch,url,'CC BY 3.0'))
# Oboe and viola come directly from the same CC0 source library.
for name,folder,pattern,pitches in [
 ('oboe','Woodwinds/Oboe/Sus/','Oboe_Sus_{}_v1_Main.wav',['D3','F3','A#3','D4','F4','A#4','D5']),
 ('viola','Strings/Viola Section/susvib/','ViolaEns_susvib_{}_v1_1.wav',['C2','G2','B2','E3','A3','D4','B4'])]:
    manifest['banks'][name]={'sustain':True,'roots':[]}
    tree=json.loads(get('https://api.github.com/repos/sgossner/VSCO-2-CE/git/trees/440300901dfe9275fd84e0b7763af1f8443ae62e?recursive=1'))
    paths={e['path'] for e in tree['tree']}
    for p in pitches:
        path=folder+pattern.format(p)
        if path not in paths: continue
        # VSCO names middle C C3, whereas scientific pitch notation names it C4.
        jobs.append((name,midi(p)+12,VSCO+urllib.parse.quote(path,safe='/'),'CC0'))
def build(job):
    name,pitch,url,license=job; dest=OUT/name/(str(pitch)+'.mp3');dest.parent.mkdir(exist_ok=True)
    if not dest.exists() or '--rebuild' in sys.argv:
        with tempfile.TemporaryDirectory() as temp:
            src=Path(temp)/'input';src.write_bytes(get(url))
            analysis=subprocess.run(['ffmpeg','-v','info','-i',str(src),'-t','6','-af','volumedetect','-f','null','-'],capture_output=True,text=True,check=True)
            peak=float(re.search(r'max_volume: (-?[0-9.]+) dB',analysis.stderr)[1])
            volume=-3-peak
            subprocess.run(['ffmpeg','-v','error','-y','-i',str(src),'-af',f'volume={volume}dB,silenceremove=start_periods=1:start_duration=0.004:start_threshold=-48dB,alimiter=limit=0.708:level=false', '-t','6','-ac','1','-ar','32000','-codec:a','libmp3lame','-b:a','64k',str(dest)],check=True)
    return name,{'midi':pitch,'file':name+'/'+str(pitch)+'.mp3','bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'source':url,'license':license}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    for name,entry in pool.map(build,jobs): manifest['banks'][name]['roots'].append(entry)
for bank in manifest['banks'].values(): bank['roots'].sort(key=lambda x:x['midi'])
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f"Built {len(jobs)} samples, {sum(p.stat().st_size for p in OUT.rglob('*.mp3'))/1024/1024:.2f} MiB")
