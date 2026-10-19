"""Build original, labeled SVG figures for the 3D design curriculum."""

from pathlib import Path
from html import escape

OUT = Path(__file__).resolve().parents[1] / "assets/images/lessons/design3d-visuals"
OUT.mkdir(parents=True, exist_ok=True)


def frame(title, subtitle, body):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 520" role="img" aria-label="{escape(title)}">
<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 0 10 5 0 10" fill="#40647a"/></marker>
<pattern id="check" width="32" height="32" patternUnits="userSpaceOnUse"><path fill="#e9f2ee" d="M0 0h32v32H0z"/><path fill="#82b5a9" d="M0 0h16v16H0zM16 16h16v16H16z"/></pattern>
<pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0v28" fill="none" stroke="#bfd0d1" stroke-width="1"/></pattern></defs>
<rect width="1000" height="520" fill="#f7f5ee"/><path d="M0 0h1000v8H0z" fill="#1e5f69"/>
<text x="42" y="53" font-family="Arial,sans-serif" font-size="29" font-weight="700" fill="#193f49">{escape(title)}</text>
<text x="42" y="83" font-family="Arial,sans-serif" font-size="17" fill="#49636b">{escape(subtitle)}</text>
{body}
<text x="955" y="500" text-anchor="end" font-family="Arial,sans-serif" font-size="13" fill="#587078">ClassroomOS · original teaching diagram</text></svg>'''


def card(x, title, body, w=284):
    return f'<rect x="{x}" y="114" width="{w}" height="334" rx="16" fill="#fff" stroke="#bdd0cc" stroke-width="2"/><text x="{x+18}" y="148" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#215963">{escape(title)}</text>{body}'


def label(x, y, s, size=15, color="#294c54"):
    return f'<text x="{x}" y="{y}" font-family="Arial,sans-serif" font-size="{size}" fill="{color}">{escape(s)}</text>'


figures = {}

# A continuous seam-to-surface example gives the UV lesson a visual bridge
# between its written seam advice and the existing packing simulator.
uv = card(42, "1  CUT", '<path d="M111 236l74-38 75 38-75 39z" fill="#f6c47e" stroke="#425f65" stroke-width="3"/><path d="M111 236l74 39v88l-74-40z" fill="#cb825f" stroke="#425f65" stroke-width="3"/><path d="M185 275l75-39v87l-75 40z" fill="#e7a970" stroke="#425f65" stroke-width="3"/><path d="M111 236l74 39 75-39" fill="none" stroke="#bf3451" stroke-width="6" stroke-dasharray="10 7"/>'+label(72,406,"Mark a planned edge seam"))
uv += '<path d="M336 286h37" stroke="#40647a" stroke-width="4" marker-end="url(#arrow)"/>'
uv += card(378,"2  FLATTEN",'<rect x="411" y="185" width="218" height="191" fill="url(#grid)" stroke="#9fb9b7"/><path d="M426 255h180v45H426zM471 210h45v45h-45zM471 300h45v45h-45z" fill="#e0ab75" stroke="#845c51" stroke-width="3"/><path d="M471 255v45m45-45v45m45-45v45" stroke="#845c51" stroke-width="3"/>'+label(410,406,"Six faces in one UV island"))
uv += '<path d="M674 286h37" stroke="#40647a" stroke-width="4" marker-end="url(#arrow)"/>'
uv += card(716,"3  TEST",'<path d="M760 237l75-39 75 39-75 39z" fill="url(#check)" stroke="#425f65" stroke-width="3"/><path d="M760 237l75 39v88l-75-40zM835 276l75-39v87l-75 40z" fill="url(#check)" stroke="#425f65" stroke-width="3"/>'+label(746,406,"Even checks = even scale"))
figures['uv-pipeline.svg'] = frame('From a seam to a dependable surface','Cut where the object can unfold, pack with space, then look for stretched checker squares.',uv)

rig = card(42,"JOINT PLACEMENT",'<path d="M97 357l52-122 77 1 54 121" fill="none" stroke="#d7a879" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/><path d="M97 357l52-122 77 1 54 121" fill="none" stroke="#3f6d7a" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="226" cy="236" r="12" fill="#ec6952"/>'+label(65,407,"Joint sits at bend center"))
rig += '<path d="M338 286h36" stroke="#40647a" stroke-width="4" marker-end="url(#arrow)"/>'
rig += card(378,"CLEAN BEND",'<path d="M430 230h102q38 0 38 37v79" fill="none" stroke="#dcad7e" stroke-width="50" stroke-linecap="round" stroke-linejoin="round"/><path d="M430 230h102q38 0 38 37v79" fill="none" stroke="#3f6d7a" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="550" cy="246" r="13" fill="#4b9a81"/>'+label(405,407,"Loops + gradual weights"))
rig += card(716,"PINCHED BEND",'<path d="M768 230h86l24 31-26 83" fill="none" stroke="#dcad7e" stroke-width="50" stroke-linecap="round" stroke-linejoin="miter"/><path d="M768 230h86l24 31-26 83" fill="none" stroke="#3f6d7a" stroke-width="7"/><path d="M846 235l16 23-14 10" fill="none" stroke="#bf3451" stroke-width="5"/>'+label(736,407,"Abrupt weights collapse volume"))
figures['rigging-elbow.svg'] = frame('The joint, the loops, and the weight change','Compare a supported elbow bend with a sharp pinched deformation.',rig)

walk = ''
for i,(caption,legs,ground) in enumerate([('CONTACT',((-38,70),(38,70)),'both feet touch'),('DOWN',((-20,70),(30,49)),'left foot carries weight'),('PASSING',((-20,70),(24,34)),'left foot stays planted'),('UP',((-35,47),(25,70)),'right foot carries weight')]):
    x=45+i*239
    walk+=f'<rect x="{x}" y="118" width="220" height="330" rx="16" fill="#fff" stroke="#bdd0cc" stroke-width="2"/>'+label(x+18,149,f'{i+1}  {caption}',17)
    walk+=f'<path d="M{x+18} 374h184" stroke="#95a9a5" stroke-width="3"/><circle cx="{x+110}" cy="204" r="23" fill="#e5ad79" stroke="#425f65" stroke-width="3"/><path d="M{x+110} 228v82M{x+110} 251l-42 33M{x+110} 251l43 30" fill="none" stroke="#426c78" stroke-width="10" stroke-linecap="round"/>'
    for dx,dy in legs:
        walk+=f'<path d="M{x+110} 304l{dx} {dy}" stroke="#426c78" stroke-width="11" stroke-linecap="round"/>'
    walk+=label(x+18,422,ground,14)
figures['walk-cycle.svg']=frame('Four readable poses make a walk loop','Contact → weight down → passing → rise; check the planted foot before polishing curves.',walk)

fit = card(42,"TOO TIGHT",'<circle cx="184" cy="277" r="83" fill="#e4aa72" stroke="#895a4b" stroke-width="4"/><circle cx="184" cy="277" r="49" fill="#f7f5ee" stroke="#895a4b" stroke-width="3"/><circle cx="184" cy="277" r="47" fill="#c76d5c"/><path d="M185 202v152" stroke="#b7354a" stroke-width="4"/>'+label(73,408,"Gap closes; parts fuse"))
fit += card(378,"WORKING GAP",'<circle cx="520" cy="277" r="83" fill="#e4aa72" stroke="#895a4b" stroke-width="4"/><circle cx="520" cy="277" r="54" fill="#f7f5ee" stroke="#895a4b" stroke-width="3"/><circle cx="520" cy="277" r="40" fill="#5eaa9d"/><path d="M520 228h51" stroke="#247f83" stroke-width="4" marker-end="url(#arrow)"/>'+label(410,408,"Air remains after printing"))
fit += card(716,"TOO LOOSE",'<circle cx="858" cy="277" r="83" fill="#e4aa72" stroke="#895a4b" stroke-width="4"/><circle cx="858" cy="277" r="57" fill="#f7f5ee" stroke="#895a4b" stroke-width="3"/><circle cx="858" cy="277" r="29" fill="#5eaa9d"/>'+label(744,408,"Spin may rattle or wobble"))
figures['print-clearance.svg']=frame('A captured ring needs a real printed gap','Same outer ring; only the radial clearance changes. Print a comb to find the useful gap on your printer.',fit)

room = card(42,"ONE SMALL KIT",'<rect x="85" y="219" width="70" height="70" fill="#e3b987" stroke="#557575" stroke-width="3"/><rect x="190" y="219" width="70" height="70" fill="#e3b987" stroke="#557575" stroke-width="3"/><path d="M84 325h73m32 0h72" stroke="#3f6d7a" stroke-width="16"/><path d="M113 195v-47m110 47v-47" stroke="#3f6d7a" stroke-width="15"/>'+label(69,407,"Floor · wall · doorway · corner"))
room += '<path d="M337 284h36" stroke="#40647a" stroke-width="4" marker-end="url(#arrow)"/>'
for x,title,cells in [(378,"LAYOUT A",[(0,0),(1,0),(0,1),(1,1)]),(716,"LAYOUT B",[(0,0),(1,0),(2,0),(0,1),(1,1),(2,1)])]:
    body='<rect x="'+str(x+27)+'" y="181" width="230" height="196" fill="url(#grid)" stroke="#9fb9b7"/>'
    size=61 if title=='LAYOUT A' else 52
    for cx,cy in cells:body+=f'<rect x="{x+53+cx*size}" y="{212+cy*size}" width="{size}" height="{size}" fill="#e3b987" stroke="#557575" stroke-width="2"/>'
    span=size*(2 if title=='LAYOUT A' else 3)
    bottom=211+size*2
    body+=f'<path d="M{x+52} 211h{span}M{x+52} 211v{size*2}M{x+52} {bottom}h{span/2-19}M{x+52+span/2+19} {bottom}h{span/2-19}M{x+52+span} 211v{size*2}" fill="none" stroke="#3f6d7a" stroke-width="9"/>'+label(x+22,407,'Same source pieces, new plan')
    room+=card(x,title,body)
figures['modular-room.svg']=frame('One kit, two usable rooms','Repeated pieces share exact dimensions and origins; new layouts do not require new wall meshes.',room)

chair=''
for x,title,parts in [(42,'BLOCKOUT',False),(378,'CONTROLLED EDGES',True),(716,'ENGINE CHECK',True)]:
    b=f'<path d="M{x+58} 371h173" stroke="#8fa8a7" stroke-width="3"/><path d="M{x+84} 281h142v29H{x+84}z" fill="#cc8f62" stroke="#684b45" stroke-width="3"/><path d="M{x+92} 310v61m125-61v61" stroke="#684b45" stroke-width="13"/><path d="M{x+92} 281V191h24v90" fill="#cc8f62" stroke="#684b45" stroke-width="3"/>'
    if parts:b+=f'<path d="M{x+84} 281l10-8h123l9 8M{x+92} 310l6 5m113 0 6-5" fill="none" stroke="#ffe0ae" stroke-width="4"/>'
    if title=='ENGINE CHECK':b+=f'<path d="M{x+79} 184v192h155V184z" fill="none" stroke="#4b9a81" stroke-width="3" stroke-dasharray="7 6"/><circle cx="{x+155}" cy="371" r="8" fill="#bf3451"/>'
    b+=label(x+21,408,{'BLOCKOUT':'Read the silhouette first','CONTROLLED EDGES':'Bevel catches light','ENGINE CHECK':'Pivot at floor; box collision'}[title])
    chair+=card(x,title,b)
figures['furniture-check.svg']=frame('A chair progresses from shape to game asset','Keep scale and silhouette readable; use bevels for highlights and a simple collision shape.',chair)

sculpt=''
for x,title,body in [(42,'CLAY STRIP','M84 340q42-115 85-35t89-20'),(378,'GRAB','M415 349q69-16 78-93t115-34'),(716,'SMOOTH','M752 350q63-40 126-49t71-39')]:
    p=body
    b=f'<path d="M{x+35} 370h218" stroke="#88776b" stroke-width="4"/><path d="{p}" fill="none" stroke="#d6976e" stroke-width="45" stroke-linecap="round"/><path d="{p}" fill="none" stroke="#704f49" stroke-width="3"/>'+label(x+20,409,{'CLAY STRIP':'Build a new ridge','GRAB':'Move the silhouette','SMOOTH':'Reduce small bumps'}[title])
    sculpt+=card(x,title,b)
figures['sculpt-brushes.svg']=frame('Three brushes, three different jobs','Use a broad stroke to add mass, Grab to change outline, and Smooth to soften local noise.',sculpt)

mat=''
for x,title in [(42,'ROUGH'),(378,'SATIN'),(716,'POLISHED')]:
    b=f'<ellipse cx="{x+144}" cy="301" rx="91" ry="86" fill="#9c8672" stroke="#5d6765" stroke-width="3"/>'
    b+=f'<ellipse cx="{x+112}" cy="258" rx="{58 if title=="ROUGH" else 35 if title=="SATIN" else 17}" ry="{42 if title=="ROUGH" else 25 if title=="SATIN" else 11}" fill="#fff4d7" opacity="{0.16 if title=="ROUGH" else 0.55 if title=="SATIN" else 0.95}" transform="rotate(-35 {x+112} 258)"/>'
    b+=label(x+20,408,{'ROUGH':'Wide, weak reflection','SATIN':'Soft highlight','POLISHED':'Small, sharp highlight'}[title])
    mat+=card(x,title,b)
figures['material-roughness.svg']=frame('Roughness changes the highlight, not the object','Compare the same sphere, light, and camera while changing only the surface roughness.',mat)

draft=''
for x,title in [(42,'OBJECT'),(378,'TOP / PLAN'),(716,'FRONT / ELEVATION')]:
    if title=='OBJECT':
        shape='<path d="M118 246l70-35 70 35-70 35z" fill="#f4d1a0" stroke="#47646b" stroke-width="3"/><path d="M118 246l70 35v83l-70-36z" fill="#d89b6e" stroke="#47646b" stroke-width="3"/><path d="M188 281l70-35v82l-70 36z" fill="#e9b37f" stroke="#47646b" stroke-width="3"/>'
    elif title=='TOP / PLAN':
        shape=f'<rect x="{x+73}" y="239" width="145" height="94" fill="#e9b37f" stroke="#47646b" stroke-width="4"/>'
    else:
        shape=f'<rect x="{x+72}" y="214" width="146" height="139" fill="#e9b37f" stroke="#47646b" stroke-width="4"/>'
    draft+=card(x,title,shape+label(x+21,408,{'OBJECT':'3D form','TOP / PLAN':'Look straight down','FRONT / ELEVATION':'Look straight at face'}[title]))
figures['drafting-views.svg']=frame('One object, three ways to describe it','The plan and elevation use measured parallel views; the perspective view helps identify the object.',draft)

desk = card(42, "1  MEASURE THE ITEM", '<path d="M173 205v147" stroke="#e2b66c" stroke-width="16" stroke-linecap="round"/><path d="M165 209l8-20 8 20" fill="#555a55"/><path d="M155 257h35M155 284h35" stroke="#284e5b" stroke-width="2"/><path d="M192 265h58" stroke="#284e5b" stroke-width="2" marker-end="url(#arrow)"/>'+label(77,405,"Example pencil: 8 mm wide"))
desk += '<path d="M338 282h36" stroke="#40647a" stroke-width="4" marker-end="url(#arrow)"/>'
desk += card(378, "2  PLAN THE HOLDER", '<rect x="429" y="205" width="190" height="141" rx="9" fill="#e8b689" stroke="#45646b" stroke-width="4"/><circle cx="525" cy="275" r="14" fill="#f7f5ee" stroke="#45646b" stroke-width="4"/><path d="M429 365h190m-190-11v21m190-21v21" stroke="#45646b" stroke-width="2"/><path d="M482 275h25m35 0h25" stroke="#2e7c83" stroke-width="3" marker-end="url(#arrow)"/>'+label(433,395,"Base 70 mm · opening 10 mm"))
desk += '<path d="M674 282h36" stroke="#40647a" stroke-width="4" marker-end="url(#arrow)"/>'
desk += card(716, "3  TEST AND REVISE", '<path d="M756 347l84-40 97 38-85 42z" fill="#e8b689" stroke="#45646b" stroke-width="3"/><path d="M756 347v19l96 43v-22zM852 387l85-42v20l-85 44z" fill="#c98a68" stroke="#45646b" stroke-width="3"/><path d="M807 300v42q24 11 48 0v-42" fill="#d39a71" stroke="#45646b" stroke-width="3"/><ellipse cx="831" cy="300" rx="24" ry="11" fill="#f5d7ad" stroke="#45646b" stroke-width="3"/><ellipse cx="831" cy="300" rx="11" ry="5" fill="#f7f5ee"/><path d="M831 299V211" stroke="#d2a25f" stroke-width="13" stroke-linecap="round"/><path d="M824 211l7-18 7 18" fill="#555a55"/><path d="M923 277q-14-25-35-25" fill="none" stroke="#bd4d4e" stroke-width="3" marker-end="url(#arrow)"/>'+label(740,437,"Nudge it. Does it tip?"))
figures['desk-helper-prototype.svg']=frame('A pencil helper you can measure and test','Illustrative dimensions only: measure your own item, then revise the base or opening after testing.',desk)

# Put the same three detailed panels in a vertical reading order on phones.
# Each nested viewBox crops one original card without changing its drawing.
mobile_cards = ''.join(
    f'<svg x="30" y="{116 + i*514}" width="420" height="494" viewBox="{x} 114 284 334">{desk}</svg>'
    for i, x in enumerate((42, 378, 716))
)
figures['desk-helper-prototype-mobile.svg'] = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 1680" role="img" aria-label="Pencil helper design steps">
<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 0 10 5 0 10" fill="#40647a"/></marker></defs>
<rect width="480" height="1680" fill="#f7f5ee"/><path d="M0 0h480v8H0z" fill="#1e5f69"/>
<text x="30" y="54" font-family="Arial,sans-serif" font-size="27" font-weight="700" fill="#193f49">A pencil helper to test</text>
<text x="30" y="85" font-family="Arial,sans-serif" font-size="17" fill="#49636b">Measure → plan → test and revise</text>
{mobile_cards}
<text x="448" y="1660" text-anchor="end" font-family="Arial,sans-serif" font-size="14" fill="#587078">ClassroomOS · original teaching diagram</text></svg>'''

# The route overview needs the same diagrams in a readable, stacked phone layout.
mobile_studies = {
    'drafting-views-mobile.svg': ('One object, three views', draft),
    'print-clearance-mobile.svg': ('Compare the clearance', fit),
    'material-roughness-mobile.svg': ('Compare the highlights', mat),
    'modular-room-mobile.svg': ('One kit, two layouts', room),
}
for filename, (title, drawing) in mobile_studies.items():
    panels = ''.join(
        f'<svg x="30" y="{116 + index * 514}" width="420" height="494" viewBox="{x} 114 284 334">{drawing}</svg>'
        for index, x in enumerate((42, 378, 716))
    )
    figures[filename] = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 1680" role="img" aria-label="{escape(title)}">
<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 0 10 5 0 10" fill="#40647a"/></marker>
<pattern id="check" width="32" height="32" patternUnits="userSpaceOnUse"><path fill="#e9f2ee" d="M0 0h32v32H0z"/><path fill="#82b5a9" d="M0 0h16v16H0zM16 16h16v16H16z"/></pattern>
<pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0v28" fill="none" stroke="#bfd0d1" stroke-width="1"/></pattern></defs>
<rect width="480" height="1680" fill="#f7f5ee"/><path d="M0 0h480v8H0z" fill="#1e5f69"/>
<text x="30" y="58" font-family="Arial,sans-serif" font-size="27" font-weight="700" fill="#193f49">{escape(title)}</text>
<text x="30" y="86" font-family="Arial,sans-serif" font-size="17" fill="#49636b">Study each view from top to bottom</text>
{panels}
<text x="448" y="1660" text-anchor="end" font-family="Arial,sans-serif" font-size="14" fill="#587078">ClassroomOS · original teaching diagram</text></svg>'''

for name, svg in figures.items():
    (OUT/name).write_text(svg, encoding='utf-8')
    print(name)
