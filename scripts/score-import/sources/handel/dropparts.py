# dropparts.py IN OUT P17 [P18…]: remove parts (and their part-list entries) from a MusicXML score
import sys,xml.etree.ElementTree as ET
t=ET.parse(sys.argv[1]); r=t.getroot(); drop=set(sys.argv[3:])
pl=r.find('part-list')
for sp in list(pl):
  if sp.get('id') in drop: pl.remove(sp)
for p in list(r.findall('part')):
  if p.get('id') in drop: r.remove(p)
t.write(sys.argv[2],encoding='utf-8',xml_declaration=True)
