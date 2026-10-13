"""Build original teaching SVGs; folded C-alpha traces use public wwPDB coordinates.
Data: RCSB 1MBN (Watson & Kendrew) and 4HHB (Fermi et al.).
Run: python3 scripts/build-protein-structure-graphics.py
"""
from pathlib import Path
import json, math
from html import escape
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
 a.append(f'<circle cx="{x}" cy="{y}" r="23" fill="'+('#2563eb' if el=='N' else '#475569')+'"/>');text(a,x,y+6,el,17,'white')
text(a,400,65,'PRIMARY · amino-acid order',30)
text(a,400,108,'Repeating backbone, different side chains',24)
text(a,80,365,'N end',18);text(a,710,365,'C end',18)
text(a,400,455,'Purple links: C–N peptide bonds · green: side chains',20)
text(a,400,500,'Fragment · hydrogens omitted · schematic geometry',20)
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
text(a,400,505,'Dashed: backbone hydrogen bonds · idealized motifs',22)
save(a,'secondary')
# Smooth actual C-alpha coordinates with Catmull–Rom, project and depth-sort.
def smooth(points):
 result=[]
 for i in range(len(points)-1):
  p0=points[max(0,i-1)];p1=points[i];p2=points[i+1];p3=points[min(len(points)-1,i+2)]
  for j in range(7):
   t=j/7
   result.append([.5*(2*p1[k]+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t*t+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t*t*t) for k in range(3)])
 result.append(points[-1])
 return result

def folded(name,chains,title,subtitle):
 a=start(title);text(a,400,55,title,28)
 allpts=[p for ps in chains.values() for p in ps];center=[sum(p[k] for p in allpts)/len(allpts) for k in range(3)]
 def rot(p):
  x,y,z=[p[k]-center[k] for k in range(3)]
  return (x*.87+z*.5, y*.94-(z*.87-x*.5)*.34, y*.34+(z*.87-x*.5)*.94)
 coords={c:[rot(p) for p in smooth(ps)] for c,ps in chains.items()}
 points=[p for ps in coords.values() for p in ps];scale=min(570/(max(p[0] for p in points)-min(p[0] for p in points)),300/(max(p[1] for p in points)-min(p[1] for p in points)))
 midx=(max(p[0] for p in points)+min(p[0] for p in points))/2
 midy=(max(p[1] for p in points)+min(p[1] for p in points))/2
 colors=['#8652d1','#287da9','#c77127','#279173'];segs=[]
 for idx,(c,ps) in enumerate(coords.items()):
  for p,q in zip(ps,ps[1:]):segs.append(((p[2]+q[2])/2,p,q,colors[idx]))
 # Depth-dependent shade makes front and rear segments distinguishable.
 zmin=min(t[0] for t in segs);zmax=max(t[0] for t in segs)
 for z,p,q,color in sorted(segs):
  x,y=400+(p[0]-midx)*scale,265-(p[1]-midy)*scale;X,Y=400+(q[0]-midx)*scale,265-(q[1]-midy)*scale
  depth=(z-zmin)/(zmax-zmin or 1)
  rgb=[int(color[k:k+2],16) for k in [1,3,5]]
  shade='#'+''.join(f'{round(v*(.60+.40*depth)):02x}' for v in rgb)
  width=12 if len(chains)==1 else 9
  line(a,x,y,X,Y,shade,width)
 # Keyed chain labels avoid relying on color alone.
 if len(chains)>1:
  for i,(c,ps) in enumerate(coords.items()):
   text(a,140+i*175,450,('α' if c in ['A','C'] else 'β')+' · chain '+c,23,colors[i])
 else:
  text(a,400,450,'One continuous chain · depth-shaded Cα trace',22)
 text(a,400,485,subtitle,20)
 text(a,400,522,'wwPDB coordinates · smoothed trace · other atoms omitted',20)
 save(a,name)
folded('tertiary',DATA['1MBN'],'TERTIARY · one folded chain','Myoglobin · PDB 1MBN · one continuous polypeptide')
folded('quaternary',DATA['4HHB'],'QUATERNARY · assembled subunits','Hemoglobin · PDB 4HHB · two α and two β chains')

# Free amino-acid anatomy: bonds terminate at labels rather than crossing them.
a=start('Free alpha-amino acid in its zwitterionic form')
text(a,400,55,'FREE AMINO ACID · near neutral pH',28)
for x,y,X,Y in [(235,273,125,273),(305,273,415,273),(270,235,270,165),(270,311,270,390)]:line(a,x,y,X,Y,'#475569',4)
a.append('<circle cx="270" cy="273" r="35" fill="#e2e8f0" stroke="#475569" stroke-width="3"/>')
text(a,270,283,'Cα',26,'#1e293b');text(a,90,283,'H',28,'#1e293b')
text(a,270,150,'COO⁻',32,'#b91c1c');text(a,478,283,'NH₃⁺',32,'#1d4ed8')
a.append('<rect x="230" y="390" width="80" height="60" rx="14" fill="#ede9fe" stroke="#6d28d9" stroke-width="3"/>')
text(a,270,430,'R',32,'#6d28d9')
text(a,560,130,'Carboxylate: −1',23,'#b91c1c');line(a,345,143,450,125,'#b91c1c',2,'5 5')
text(a,560,360,'Amino group: +1',23,'#1d4ed8');line(a,478,300,478,329,'#1d4ed8',2,'5 5')
text(a,530,425,'Variable side chain',23,'#6d28d9');line(a,321,420,411,420,'#6d28d9',2,'5 5')
text(a,400,510,'General backbone · R = H for glycine · proline has a ring',21)
save(a,'amino-backbone')
# Net condensation is separated into reactants and a readable product.
a=start('Net peptide bond formation between two free amino acids')
text(a,400,55,'PEPTIDE BOND · net condensation',29)
text(a,400,97,'Bookkeeping of atoms, not the ribosome mechanism',22)
text(a,185,177,'H₂N–CH(R₁)–COOH',26,'#1e293b');text(a,400,177,'+',30)
text(a,610,177,'H₂N–CH(R₂)–COOH',26,'#1e293b')
line(a,400,213,400,257,'#6d28d9',5)
a.append('<path d="M389 247 L400 265 L411 247" fill="#6d28d9"/>')
for x,t in [(80,'H₂N'),(200,'CH(R₁)'),(330,'C'),(430,'N'),(550,'CH(R₂)'),(700,'COOH')]:text(a,x,316,t,28,'#1e293b')
for x,X in [(112,142),(259,312),(349,411),(449,491),(609,650)]:line(a,x,307,X,307,'#6d28d9' if x==349 else '#475569',6 if x==349 else 3)
line(a,326,328,326,365,'#b91c1c',3);line(a,334,328,334,365,'#b91c1c',3)
text(a,330,399,'O',27,'#b91c1c');line(a,430,328,430,363,'#475569',3);text(a,430,399,'H',27,'#1e293b')
text(a,400,451,'New C–N bond + one H₂O equivalent',26,'#6d28d9')
text(a,400,510,'Two residues → one peptide bond · R groups remain',22)
save(a,'peptide-bond')
