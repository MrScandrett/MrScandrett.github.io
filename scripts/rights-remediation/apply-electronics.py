"""Replace the retired unverified assets with the original concept diagrams.
Run after electronics-art.mjs. Source SVGs can be regenerated independently.
"""
import json,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
d=json.loads((ROOT/'assets/images/lessons/electronics-reference/sources.json').read_text())
rows=d['assets']
changed=[]
for rel in subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=ROOT).decode().split('\0'):
 if not rel:continue
 p=ROOT/rel
 if not p.is_file() or any(x in p.parts for x in ['.git','node_modules','apps','.venv','dist','.claude']):continue
 if p.suffix not in ['.html','.css','.js','.mjs','.json','.md']:continue
 if p.name=='sources.json' and p.parent.name=='electronics-reference':continue
 if 'rights-remediation' in p.parts or p.name in ['IMAGE_SOURCES.md','copyright-audit-2026-11-15.md']:continue
 try:s=p.read_text()
 except UnicodeDecodeError:continue
 old=s
 for x in rows:s=s.replace(x['old'],x['target']).replace(x['old'].replace(' ','%20'),x['target'])
 if s==old:continue
 if p.suffix=='.html':
  titles={x['target'].split('/')[-1]:x['title'] for x in rows}
  def fix_img(m):
   tag=m.group(0)
   if '/electronics-reference/' not in tag:return tag
   for name,title in titles.items():
    if name in tag:
     alt='Original concept diagram: '+title
     if re.search(r'\balt="[^"]*"',tag):tag=re.sub(r'\balt="[^"]*"','alt="'+alt+'"',tag)
     else:tag=tag[:-1]+' alt="'+alt+'">'
     break
   return tag
  s=re.sub(r'<img\b[^>]*>',fix_img,s)
  def credit(m):
   f=m.group(0)
   if '/electronics-reference/' not in f:return f
   label=' <small>Original ClassroomOS concept diagram · <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 1.0</a>; verify the actual component and pin labels.</small>'
   if '<figcaption' in f:f=f.replace('</figcaption>',label+'</figcaption>')
   else:f=f.replace('</figure>','<figcaption>'+label.strip()+'</figcaption></figure>')
   return f
  s=re.sub(r'<figure\b[^>]*>[\s\S]*?</figure>',credit,s)
  s=s.replace('Use these photos as quick visual anchors','Use these original concept diagrams as quick visual anchors')
  if 'photo-lightbox.js' not in s:
   depth=len(p.relative_to(ROOT).parts)-1
   s=s.replace('</body>','<script src="'+'../'*depth+'assets/js/photo-lightbox.js"></script></body>')
 p.write_text(s);changed.append(str(p.relative_to(ROOT)))
for x in rows:
 p=ROOT/x['old']
 if p.exists():p.unlink()
print('\n'.join(changed))
