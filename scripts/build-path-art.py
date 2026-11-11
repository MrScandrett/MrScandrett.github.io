"""Build editorial path previews from existing source diagrams and credited local images.
No network or image-generation dependencies. Run from the repository root.
"""
import json, re, html
import xml.etree.ElementTree as ET
from pathlib import Path
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]
LESSONS = {l['id']: l for l in json.loads((ROOT/'data/lessons.json').read_text())['lessons']}
SOURCE = ROOT/'data/path-lesson-images.json'

# Art direction: real objects, primary sources, and working tools, rather than
# screenshots of whole pages or generic decorative illustrations.
PHOTOS = {
 'ada-lovelace': ('assets/thumbs/ada-lovelace.png', 'Alfred Edward Chalon’s portrait of Ada Lovelace'),
 'grace-hopper': ('assets/images/video-library/grace-hopper-nanoseconds.webp', 'Grace Hopper explaining the distance light travels in a nanosecond'),
 'margaret-hamilton': ('assets/images/lessons/margaret-hamilton/software-listings.webp', 'Margaret Hamilton beside the Apollo software listings'),
 'cymatics': ('assets/images/lessons/cymatics/chladni-plate-exhibit.jpg', 'A Chladni plate making vibration patterns visible'),
 'audio-compression': ('assets/images/lessons/audio-compression/urei-1176ln.jpg', 'A UREI 1176LN audio compressor'),
 'dispersive-prism': ('assets/thumbs/newton-prism.jpg', 'A prism splitting white light into its spectrum'),
 'color-theory-lab': ('assets/thumbs/newton-color-circle.png', 'Newton’s historical color circle'),
 'feynman-atoms': ('assets/thumbs/feynman.jpg', 'Richard Feynman'),
 'albert-einstein': ('assets/images/avatars/albert-einstein.webp', 'Albert Einstein'),
 'pale-blue-dot': ('assets/thumbs/pale-blue-dot.png', 'Earth photographed from deep space by Voyager 1'),
 'types-of-cells': ('assets/images/lessons/cells/animal.svg', 'Structures inside an animal cell'),
 'crispr-synthetic-biology': ('assets/images/lessons/the-ages/future-age-crispr-cas9.webp', 'A molecular model of the CRISPR–Cas9 complex'),
 'seasons-and-the-heavens': ('assets/images/avatars/blue-marble.webp', 'The sunlit Earth seen from space'),
 'speed-of-light': ('assets/images/lessons/speed-of-light/fizeau-1874-apparatus.jpg', 'Fizeau’s apparatus for measuring the speed of light'),
 'robotics-engineering-intro': ('assets/images/lessons/robotics/spot-robot-royal-air-force.jpg', 'A four-legged Spot robot'),
 'breadboard-basics': ('assets/images/lessons/resistors/breadboard-led.jpg', 'A real LED circuit assembled on a breadboard'),
 'electronic-components': ('assets/images/lessons/resistors/through-hole-board.jpg', 'Electronic components mounted on a circuit board'),
 'resistor-color-code': ('assets/images/lessons/resistors/axial-resistors.jpg', 'Axial resistors with colored value bands'),
 'arduino-robot-brain': ('assets/images/lessons/arduino-board-anatomy/uno-r3.webp', 'An Arduino Uno R3 development board'),
 'arduino-choosing-your-board': ('assets/images/lessons/arduino-board-anatomy/nano-every.webp', 'The compact Arduino Nano Every'),
 'inputs-beyond-the-button': ('assets/thumbs/ROTARYENCODER.jpg', 'A rotary encoder module'),
 'outputs-beyond-the-led': ('assets/thumbs/ACTIVEBUZZER.jpeg', 'An active buzzer module'),
 'sensor-modules': ('assets/thumbs/tempandhumiditymodule.jpg', 'A temperature and humidity sensor module'),
 'capacitors-rc-time': ('assets/thumbs/ceramiccapacitor.jpg', 'Ceramic capacitors'),
 'electronics-capstone': ('assets/images/lessons/resistors/breadboard-network.jpg', 'A network of components assembled on a breadboard'),
 'microphone-polar-patterns': ('assets/images/lessons/microphone-polar-patterns/royer-r121-figure-eight.jpg', 'A Royer R-121 ribbon microphone'),
 'audio-mixer-signal-flow': ('assets/images/lessons/audio-mixer-signal-flow/console-faders-closeup.jpg', 'Faders and routing controls on an audio mixing console'),
 'live-audio-signal-chain': ('assets/images/lessons/live-audio-signal-chain/monitor-mixing-position.jpg', 'A monitor mixing position at a live show'),
 'eq-problem-frequency': ('assets/images/lessons/eq-problem-frequency/pultec-eqp1a.jpg', 'A Pultec EQP-1A equalizer'),
 'wireless-mic-rf-coordination': ('assets/images/lessons/microphone-polar-patterns/wireless-receiver-rack.jpg', 'A rack of wireless microphone receivers'),
 'room-acoustics': ('assets/images/lessons/room-acoustics/royal-albert-hall-discs.jpg', 'Acoustic discs suspended above the Royal Albert Hall'),
 'stage-lighting-design-lab': ('assets/images/lessons/theatre-cue-sheets/etc-ion-xe20-console.jpg', 'An ETC Ion lighting console'),
 'stage-plotting': ('assets/images/lessons/stage-plotting/royal-alexandra-stage.jpg', 'The stage of the Royal Alexandra Theatre'),
 'theatre-cue-sheets': ('assets/images/lessons/theatre-cue-sheets/radamisto-prompt-book-1720.jpg', 'A historical prompt book for Radamisto'),
 'the-ages': ('assets/images/lessons/the-ages/industrial-age-steam-engine.webp', 'A steam engine from the industrial age'),
 'school-of-athens': ('assets/thumbs/SchoolofAthens.jpg', 'Raphael’s School of Athens'),
 'tragedy-of-the-commons': ('assets/images/lessons/commons/port-meadow.webp', 'The shared grazing land of Port Meadow'),
 'history-of-medicine': ('assets/images/lessons/the-ages/islamic-medical-manuscript.webp', 'A historical Islamic medical manuscript'),
 'web-how-the-web-works': ('assets/images/lessons/web-how-the-web-works/first-web-server.jpg', 'The NeXT computer used as the first web server'),
 '3d-design': ('assets/images/lessons/design3d-visuals/printed-dual-use-holder.jpg', 'A useful object made with a 3D printer'),
 '3d-printing': ('assets/images/lessons/design3d-visuals/print-in-place-fidget-cube.webp', 'A print-in-place fidget cube'),
 'chess-ai-core': ('assets/thumbs/chess-ai-thumb.png', 'A chess position used to explore machine decision-making'),
 'expert-system': ('assets/thumbs/expert-systems-thumb.jpg', 'An early expert system'),
 'perceptron-lab': ('assets/thumbs/perceptron-lab.jpeg', 'A perceptron learning system'),
}

class Captions(HTMLParser):
 def __init__(self): super().__init__(); self.figures=[]; self.active=None; self.caption=False
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='figure': self.active={'src':[], 'text':[]}
  if self.active is not None:
   if tag=='img': self.active['src'].append(a.get('src',''))
   if tag=='figcaption': self.caption=True
 def handle_data(self,data):
  if self.active is not None and self.caption:self.active['text'].append(data)
 def handle_endtag(self,tag):
  if tag=='figcaption':self.caption=False
  if tag=='figure' and self.active is not None:self.figures.append(self.active);self.active=None

# Preserve the teaching gallery's attribution verbatim; do not invent licenses.
def attribution(src,lesson):
 page=ROOT/lesson['url'].split('#')[0]
 if page.exists():
  p=Captions();p.feed(page.read_text())
  for f in p.figures:
   if any(Path(i.split('?')[0]).name==Path(src).name for i in f['src']):
    return re.sub(r'\s+', ' ', ''.join(f['text'])).strip()
 return None

text=(ROOT/'paths.html').read_text()
paths=[]
for m in re.finditer(r"id: '([^']+)',\s*title: '([^']+)'[\s\S]*?sequence: \[([\s\S]*?)\]",text):
 paths.append((m[1],m[2],re.findall(r"'([^']+)'",m[3])))
palettes=[('#163e51','#62dbc5','#f3bc70'),('#24254f','#b4a0ff','#ffcb85'),('#123a48','#82dccf','#f6d18d'),('#49301e','#ffc568','#80ded0'),('#153e37','#8ce1ac','#e5c482'),('#122b50','#85baff','#e7d69b'),('#283746','#ffbc74','#8de1d7'),('#123f45','#62e0dc','#f5ca84'),('#2d2855','#b3a5ff','#83e1d4'),('#292749','#c4abff','#f5bc8b'),('#423525','#f0c17a','#9bd7d7'),('#31294d','#ff9bb4','#90dbde'),('#163c48','#77ddd0','#ffd27f'),('#3e322d','#e4c6a5','#9dd6d6')]
lookup={id:(palettes[n],i) for n,(_,_,ids) in enumerate(paths) for i,id in enumerate(ids)}
images=json.loads(SOURCE.read_text())
out=ROOT/'assets/images/path-art';out.mkdir(exist_ok=True)
for id,entry in list(images.items()):
 src=ROOT/entry['src']
 if not src.name.endswith('.svg') or 'path-previews' not in str(src):continue
 raw=src.read_text(); root=ET.fromstring(raw)
 group=root.find('{http://www.w3.org/2000/svg}g')
 if group is None:continue
 (bg,accent,warm),i=lookup.get(id,(palettes[0],0))
 # Existing topic-specific artwork remains editable vector source. Enlarge the
 # actual diagram instead of filling the image with a second lesson headline.
 motif=ET.tostring(group, encoding='unicode').replace('#70d8cf',accent).replace('#f7cb68',warm)
 title=html.escape(LESSONS.get(id,{}).get('title',entry['alt']))
 grid=''.join(f'<path d="M{x} 0V360"/>' for x in range(0,641,40))+''.join(f'<path d="M0 {y}H640"/>' for y in range(0,361,40))
 # Low contrast registration marks and a generous focal area give each image
 # the feel of a science exhibit plate, without synthetic photographic imagery.
 svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-labelledby="title desc"><title id="title">{title}</title><desc id="desc">{html.escape(entry['alt'])}. Illustrative schematic, not to scale.</desc><defs><radialGradient id="light"><stop stop-color="{accent}" stop-opacity=".20"/><stop offset="1" stop-color="{bg}" stop-opacity="0"/></radialGradient></defs><rect width="640" height="360" fill="{bg}"/><g fill="none" stroke="{accent}" stroke-opacity=".07">{grid}</g><ellipse cx="330" cy="160" rx="340" ry="230" fill="url(#light)"/><circle cx="320" cy="180" r="137" fill="none" stroke="{accent}" stroke-opacity=".12"/><circle cx="320" cy="180" r="166" fill="none" stroke="{accent}" stroke-opacity=".08" stroke-dasharray="2 12"/><g transform="translate(-112,-7) scale(1.35 1.65)">{motif}</g><g stroke="{warm}" stroke-width="2" opacity=".8"><path d="M24 44V24H44M596 24H616V44M24 316V336H44M596 336H616V316"/></g><g fill="{accent}" opacity=".5"><circle cx="38" cy="180" r="3"/><circle cx="602" cy="180" r="3"/></g></svg>'''
 (out/f'{id}.svg').write_text(svg)
 entry['src']=f'assets/images/path-art/{id}.svg'
 entry['kind']='diagram'

for id,(src,alt) in PHOTOS.items():
 if not (ROOT/src).exists():raise FileNotFoundError(src)
 if id not in LESSONS:continue
 images[id]={'src':src,'alt':alt,'kind':'photo' if not src.endswith('.svg') else 'diagram','creditUrl':LESSONS[id]['url']}
 credit=attribution(src,LESSONS[id])
 if credit: images[id]['credit']=credit

# A few new lessons have no source preview yet. These drawings show the
# actual concept rather than borrowing an unrelated stock photograph.
extra = {
 'coulombs-law': '<circle cx="205" cy="180" r="48" fill="#ffbd76"/><circle cx="435" cy="180" r="48" fill="#79e2d1"/><path d="M185 180h40m-20-20v40M415 180h40M270 180h100m-85-12-15 12 15 12m70-24 15 12-15 12" stroke="#fff" stroke-width="5" fill="none"/>',
 'ac-vs-dc': '<path d="M65 115H575M65 265H575" stroke="#fff" stroke-opacity=".2"/><path d="M70 115Q110 15 150 115T230 115T310 115T390 115T470 115T550 115M70 235H550" fill="none" stroke="#79e2d1" stroke-width="6"/>',
 'sensor-to-webpage': '<rect x="80" y="110" width="120" height="140" rx="14" fill="#28776e" stroke="#79e2d1" stroke-width="3"/><circle cx="140" cy="160" r="24" fill="#ffbd76"/><path d="M215 180H330m-16-12 16 12-16 12" fill="none" stroke="#ffbd76" stroke-width="4"/><rect x="355" y="85" width="220" height="190" rx="12" fill="#e6f2f1"/><path d="M355 120H575" stroke="#21445a" stroke-width="3"/><path d="M380 235 410 205 440 220 470 155 500 185 540 145" fill="none" stroke="#26776e" stroke-width="6"/>',
}
for id,motif in extra.items():
 file=out/f'{id}.svg'
 file.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><title>{html.escape(LESSONS[id]["title"])}</title><rect width="640" height="360" fill="#18394a"/>{motif}</svg>')
 images[id]={'src':str(file.relative_to(ROOT)), 'alt':LESSONS[id]['title']+' — concept illustration', 'kind':'diagram'}

# Every lesson in a path gets an image, including lessons previously omitted
# from the preview registry. Prefer an existing authored lesson illustration.
for _,_,ids in paths:
 for id in ids:
  if id in images or id not in LESSONS:continue
  page=ROOT/LESSONS[id]['url'].split('#')[0]
  p=Captions();p.feed(page.read_text())
  for f in p.figures:
   found=False
   for src in f['src']:
    if src.startswith(('https:', 'http:', 'data:')):continue
    image=(page.parent/src).resolve()
    if image.exists() and image.is_relative_to(ROOT):
     images[id]={'src':str(image.relative_to(ROOT)), 'alt':LESSONS[id]['title'],'creditUrl':LESSONS[id]['url'],'credit':re.sub(r'\s+',' ',''.join(f['text'])).strip()}
     found=True;break
   if found:break

(ROOT/'data/path-art.json').write_text(json.dumps(images,indent=2,ensure_ascii=False)+'\n')
print(f'Built {len(list(out.glob("*.svg")))} vector previews; registered {len(images)} lesson images, {len(PHOTOS)} curated replacements.')
missing=[id for _,_,ids in paths for id in ids if id not in images]
print('Missing:',missing)

cover_lessons = ['margaret-hamilton','cymatics','speed-of-light','periodic-table','dna-heredity','roman-space-telescope','breadboard-basics','arduino-robot-brain','web-how-the-web-works','perceptron-lab','3d-design','dispersive-prism','audio-mixer-signal-flow','school-of-athens']
covers={slug:{**images[id], 'lessonId':id, 'creditUrl':LESSONS[id]['url']} for (slug,_,_),id in zip(paths,cover_lessons)}
(ROOT/'data/path-cover-images.json').write_text(json.dumps(covers,indent=2,ensure_ascii=False)+'\n')

# Keep only previews used by the registry, avoiding unused generated assets.
used = {entry['src'] for entry in images.values()}
for file in out.glob('*.svg'):
 if str(file.relative_to(ROOT)) not in used:
  file.unlink()
