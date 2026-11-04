#!/usr/bin/env python3
"""Build original CC0 guitar teaching clips; requires Pillow, numpy and ffmpeg."""
from pathlib import Path
import subprocess, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/videos/guitar-composers'; OUT.mkdir(parents=True,exist_ok=True)
FONT='/System/Library/Fonts/Supplemental/Arial.ttf'
if not Path(FONT).exists(): FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def font(n): return ImageFont.truetype(FONT,n)
RATE=24000; FPS=20; LENGTH=12
for slug,title in [('django-reinhardt','Swing and chord tones'),('francisco-tarrega','A singing tremolo line')]:
    django=slug.startswith('django'); audio=np.zeros(RATE*LENGTH,dtype=np.float64); events=[]
    for changed,start in [(False,2),(True,7)]:
        for b in range(4):
            if django:
                for pitch in [45,52,57,60]: events.append((start+b,pitch,.18,.10,None,None))
                for i,pitch in enumerate([69,72,76,81,76,72,69,76][b*2:b*2+2]):
                    events.append((start+b+(0 if i==0 else 2/3 if changed else .5),pitch,.3,.27,0,pitch-64))
            else:
                low=[45,52,48,52][b];events.append((start+b,low,.75,.20,4 if b%2==0 else 3,[0,2,3,2][b]))
                for off in ([.25,.5,.75] if changed else [.25]): events.append((start+b+off,[76,77,76,74][b],.6,.28,0,[12,13,12,10][b]))
    for at,pitch,duration,volume,_,_ in events:
        t=np.arange(int(RATE*duration))/RATE; hz=440*2**((pitch-69)/12)
        sound=sum(np.sin(2*np.pi*hz*h*t)/(h*h) for h in range(1,5))*np.exp(-t*7)*volume
        begin=int(at*RATE); audio[begin:begin+len(sound)]+=sound
    audio=np.clip(audio,-.95,.95)
    wav=OUT/f'{slug}.wav'
    with wave.open(str(wav),'wb') as w:
        w.setparams((1,2,RATE,0,'NONE','not compressed'));w.writeframes((audio*32767).astype('<i2').tobytes())
    proc=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s','960x540','-r',str(FPS),'-i','-','-i',str(wav),'-c:v','libx264','-pix_fmt','yuv420p','-preset','fast','-crf','24','-c:a','aac','-movflags','+faststart','-shortest',str(OUT/f'{slug}.mp4')],stdin=subprocess.PIPE)
    for frame in range(LENGTH*FPS):
        t=frame/FPS; changed=t>=6.5; start=7 if changed else 2
        im=Image.new('RGB',(960,540),'#f5f1e7');d=ImageDraw.Draw(im)
        d.text((40,24),title,font=font(36),fill='#163b39')
        label=('Swung eighths' if changed else 'Straight eighths') if django else ('Repeated melody: p-a-m-i' if changed else 'Single melody attacks')
        d.text((40,76),label+' | 60 BPM | standard tuning',font=font(24),fill='#163b39')
        d.text((40,120),'Original classroom pattern - not a composer transcription',font=font(20),fill='#424b4a')
        x0=120; spacing=46 if not django else 80; local=[e for e in events if start<=e[0]<start+4 and e[4] is not None]
        for row,name in enumerate(['e (1)','B (2)','G (3)','D (4)','A (5)','E (6)']):
            y=205+row*40;d.text((24,y-12),name,font=font(20),fill='#163b39');d.line((x0-20,y,915,y),fill='#7c8985',width=2)
        for i,(at,pitch,dur,vol,row,fret) in enumerate(local):
            x=x0+i*spacing;y=205+row*40
            active=at<=t<at+.23
            d.rounded_rectangle((x-18,y-18,x+24,y+18),radius=5,fill='#f8d271' if active else '#f5f1e7')
            d.text((x-10,y-15),str(fret),font=font(25),fill='#163b39')
            if active:d.text((40,452),f'Now: string {row+1}, fret {fret}',font=font(24),fill='#163b39')
        d.text((40,492),'Numbers = frets | 0 = open string | CC0 teaching animation + synthesized audio',font=font(19),fill='#424b4a')
        if frame==0: im.save(OUT/f'{slug}-poster.jpg')
        proc.stdin.write(im.tobytes())
    proc.stdin.close()
    if proc.wait()!=0: raise RuntimeError('ffmpeg failed')
    wav.unlink()
    description=('The A-minor melody A C E A E C A E is played over four chord strokes. Compare equal eighth notes with long-short swing.' if django else 'A lower thumb note begins each beat. Compare a single upper melody attack with three repeated upper notes, played ring-middle-index.')
    (OUT/f'{slug}.vtt').write_text('WEBVTT\n\n00:00.000 --> 00:06.500\n'+('Straight eighths: two evenly spaced melody notes per beat.' if django else 'Single melody attacks above lower accompaniment notes.')+'\n\n00:06.500 --> 00:12.000\n'+('Swing: the second melody note arrives later within each beat.' if django else 'Tremolo: thumb, ring, middle, index; the melody repeats three times per beat.')+'\n')
