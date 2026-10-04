"""Build original teaching SVGs; folded C-alpha traces use public wwPDB coordinates.
Data: RCSB 1MBN (Watson & Kendrew) and 4HHB (Fermi et al.).
Run: python3 scripts/build-protein-structure-graphics.py
"""
from pathlib import Path
import json, math
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/images/protein-structure'
DATA=json.loads((OUT/'coordinates.json').read_text())
def start(title):
 return ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 560" role="img"><title>'+title+'</title><defs><radialGradient id="atom" cx="30%" cy="25%"><stop stop-color="#ffffff"/><stop offset=".3" stop-color="#a69bc7"/><stop offset="1" stop-color="#534866"/></radialGradient><linearGradient id="ribbon" x2="0" y2="1"><stop stop-color="#d8b4fe"/><stop offset=".5" stop-color="#8b5cf6"/><stop offset="1" stop-color="#4c1d95"/></linearGradient></defs><rect width="800" height="560" fill="#f8f7fc"/>']
def text(a,x,y,t,size=20,color='#433566'):
 a.append(f'<text x="{x}" y="{y}" font-family="Arial,sans-serif" font-size="{size}" fill="{color}" text-anchor="middle">{t}</text>')
def line(a,x,y,X,Y,color='#746985',w=6,dash=''):
 a.append(f'<path d="M{x},{y} L{X},{Y}" fill="none" stroke="{color}" stroke-width="{w}" stroke-linecap="round"'+(f' stroke-dasharray="{dash}"' if dash else '')+'/>')
def save(a,name):
 (OUT/(name+'.svg')).write_text(''.join(a)+'</svg>\n')
# A molecular backbone fragment, schematic geometry rather than predicted conformation.
a=start('Primary structure: three residues with a repeating N–C alpha–C backbone')
pts=[(75,300,'N'),(150,255,'Cα'),(225,300,'C'),(305,255,'N'),(380,300,'Cα'),(455,255,'C'),(535,300,'N'),(610,255,'Cα'),(685,300,'C')]
for (x,y,_),(X,Y,_) in zip(pts,pts[1:]):line(a,x,y,X,Y,'#a78bfa' if (x in [225,455]) else '#746985',9)
for x,y,el in pts:
 if el=='C':
  line(a,x-5,y-15,x-5,y-65,'#db5264',4);line(a,x+5,y-15,x+5,y-65,'#db5264',4)
  a.append(f'<circle cx="{x}" cy="{y-85}" r="19" fill="#db5264"/>');text(a,x,y-78,'O',19,'white')
 if el=='Cα':
  yy=y-85 if x!=380 else y+85
  line(a,x,y,x,yy,'#16a34a',5);a.append(f'<circle cx="{x}" cy="{yy}" r="26" fill="#16865d"/>');text(a,x,yy+7,'R',22,'white')
 a.append(f'<circle cx="{x}" cy="{y}" r="23" fill="'+('#2563eb' if el=='N' else 'url(#atom)')+'"/>');text(a,x,y+6,el,17,'white')
text(a,400,80,'PRIMARY · amino-acid order',28)
text(a,400,120,'Repeating backbone, different side chains',20)
text(a,80,365,'N end',18);text(a,710,365,'C end',18)
text(a,400,455,'Purple links: C–N peptide bonds · green: side chains',20)
text(a,400,493,'Three-residue fragment · hydrogens omitted · schematic geometry',16)
save(a,'primary')
# Secondary: projected 3D idealized right-handed helix plus pleated sheet.
a=start('Secondary structure: a right-handed alpha helix and a pleated beta sheet')
text(a,400,55,'SECONDARY · local backbone folding',28)
segments=[]
for i in range(240):
 t=i/239*math.pi*8;t2=(i+1)/239*math.pi*8
 p=(170+58*math.cos(t),120+i*1.23,math.sin(t));q=(170+58*math.cos(t2),120+(i+1)*1.23,math.sin(t2))
 segments.append((p[2],p,q))
for depth,p,q in sorted(segments):
 color='#b28bea' if depth>0 else '#603699'
 line(a,p[0],p[1],q[0],q[1],color,19)
for i in range(5):line(a,156,155+i*47,156,202+i*47,'#64748b',2,'4 5')
for row in range(3):
 y=170+row*80
 upper=[(400+i*40,y+(-10 if i%2 else 10)) for i in range(8)]
 lower=[(x,Y+25) for x,Y in upper]
 points=upper+[(715,y+10),(680,y+52)]+list(reversed(lower))
 if row%2:points=[(1110-x,Y) for x,Y in points]
 a.append('<polygon points="'+' '.join(f'{x},{Y}' for x,Y in points)+'" fill="#3b82c4" stroke="#155581" stroke-width="2"/>')
 for i in range(7):line(a,415+i*40,y+15,435+i*40,y+15,'#a4d4f3',2)
 if row<2:
  for x in [430,510,590,670]:line(a,x,y+42,x,y+66,'#64748b',2,'4 5')
text(a,170,455,'α-helix',24);text(a,555,455,'β-sheet',24)
text(a,400,503,'Dashed lines: backbone hydrogen bonds (schematic)',18)
save(a,'secondary')
# Smooth actual C-alpha coordinates with Catmull–Rom, project and depth-sort.
def smooth(points):
 result=[]
 for i in range(len(points)-1):
  p0=points[max(0,i-1)];p1=points[i];p2=points[i+1];p3=points[min(len(points)-1,i+2)]
  for j in range(7):
   t=j/7
   result.append([.5*(2*p1[k]+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t*t+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t*t*t) for k in range(3)])
 return result

def folded(name,chains,title,subtitle):
 a=start(title);text(a,400,55,title,28)
 allpts=[p for ps in chains.values() for p in ps];center=[sum(p[k] for p in allpts)/len(allpts) for k in range(3)]
 def rot(p):
  x,y,z=[p[k]-center[k] for k in range(3)]
  return (x*.87+z*.5, y*.94-(z*.87-x*.5)*.34, y*.34+(z*.87-x*.5)*.94)
 coords={c:[rot(p) for p in smooth(ps)] for c,ps in chains.items()}
 points=[p for ps in coords.values() for p in ps];scale=min(570/(max(p[0] for p in points)-min(p[0] for p in points)),345/(max(p[1] for p in points)-min(p[1] for p in points)))
 colors=['#8652d1','#287da9','#c77127','#279173'];segs=[]
 for idx,(c,ps) in enumerate(coords.items()):
  for p,q in zip(ps,ps[1:]):segs.append(((p[2]+q[2])/2,p,q,colors[idx]))
 for z,p,q,color in sorted(segs):
  x,y=400+p[0]*scale,275-p[1]*scale;X,Y=400+q[0]*scale,275-q[1]*scale
  line(a,x,y,X,Y,color,8 if len(chains)==1 else 5.5)
 text(a,400,485,subtitle,20)
 text(a,400,520,'Experimental Cα trace · colors identify chains · other atoms omitted',16)
 save(a,name)
folded('tertiary',DATA['1MBN'],'TERTIARY · one folded chain','Myoglobin · PDB 1MBN · one continuous polypeptide')
folded('quaternary',DATA['4HHB'],'QUATERNARY · assembled subunits','Hemoglobin · PDB 4HHB · two α and two β chains')
