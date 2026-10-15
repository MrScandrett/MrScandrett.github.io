"""Zoom one stretch of a piano grand staff from a scan, with pitch names printed in both margins at
the staff positions detected near that spot (so a tilted scan still lines up).

    python zoom.py page.png out.png X0 X1 TREBLE_TOP BASS_TOP [scale=3] [lowerClef=bass]

X0/X1 are page x pixels; TREBLE_TOP/BASS_TOP are the y of each staff's top line (find them with
`staff-lines` in README). Check that the labels for the five lines actually sit on the five dark lines
before trusting them: if a beam or ledger line fooled the detector the labels shift by a step or two.
Staff-line spacing defaults to 12 px (the 150 dpi scans in assets/); set STAFF_SPACING to what
staff-lines.py reports for other scans. Needs numpy + pillow."""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
a = sys.argv
im = Image.open(a[1]).convert('L'); A = np.array(im).astype(float)
x0, x1, tt, bt = map(int, a[3:7]); sc = float(a[7]) if len(a) > 7 else 3; lc = a[8] if len(a) > 8 else 'bass'
SP = float(os.environ.get('STAFF_SPACING', '12'))
def five(xa, xb, t):
    ya, yb = int(t) - int(SP * 1.4), int(t) + int(SP * 5.5)
    d = (A[ya:yb, xa:xb] < 140).mean(axis=1)
    rows = [i for i, v in enumerate(d) if v > 0.55]
    g = []
    for r in rows:
        if g and r - g[-1][-1] <= 1: g[-1].append(r)
        else: g.append([r])
    ls = [ya + sum(x) / len(x) for x in g]
    best = None
    for i in range(len(ls) - 4):
        s = ls[i:i + 5]; dd = np.diff(s)
        if dd.max() - dd.min() < 3 and SP * 0.85 < dd.mean() < SP * 1.15:
            if best is None or abs(s[0] - t) < abs(best[0] - t): best = s
    return best
def track(top):
    pts = []; t = top
    for xa in range(x0, x1 - 20, 20):
        s = five(xa, xa + 20, t)
        if s and abs(s[0] - t) < (SP if not pts else SP / 3): pts.append((xa + 10, s)); t = s[0]
    if not pts:
        for xa in range(max(0, x0 - 600), x0, 20):
            s = five(xa, xa + 20, top)
            if s and abs(s[0] - top) < 12: pts.append((xa + 10, s))
    if not pts: pts = [(x0, [top + SP * k for k in range(5)])]
    return pts
def at(pts, x):
    xs = [p[0] for p in pts]
    return [float(np.interp(x, xs, [p[1][k] for p in pts])) for k in range(5)]
staves = [(track(tt), ('E', 4)), (track(bt), {'bass': ('G', 2), 'treble': ('E', 4)}[lc])]
y0, y1 = int(tt - SP * 6), int(bt + SP * 10)
crop = im.crop((x0, y0, x1, y1)).convert('RGB')
crop = crop.resize((int(crop.width * sc), int(crop.height * sc)), Image.BICUBIC)
pad = 34
out = Image.new('RGB', (crop.width + 2 * pad, crop.height), 'white'); out.paste(crop, (pad, 0))
d = ImageDraw.Draw(out, 'RGBA'); f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 11)
NAMES = 'CDEFGAB'
mid = (tt + SP * 4 + bt) / 2
for si, (pts, base) in enumerate(staves):
    for k in range(-9, 18):
        i = NAMES.index(base[0]) + k; nm = NAMES[i % 7] + str(base[1] + i // 7)
        col = (215, 0, 0) if k % 2 == 0 else (0, 80, 220)
        for side, x in ((1, x0), (out.width - pad + 3, x1)):
            L = at(pts, x); s = (L[4] - L[0]) / 8; yy = L[4] - k * s
            if (si == 0 and yy > mid + 4) or (si == 1 and yy < mid - 4): continue
            Y = (yy - y0) * sc
            if 0 < Y < out.height: d.text((side, Y - 6), nm, fill=col, font=f)
        if k < 0 or k > 8:
            if k % 2: continue
            prev = None
            for X in range(0, crop.width, 6):
                L = at(pts, x0 + X / sc); s = (L[4] - L[0]) / 8; Y = (L[4] - k * s - y0) * sc
                if prev: d.line([prev, (X + pad, Y)], fill=col + (40,), width=1)
                prev = (X + pad, Y)
for x in range(x0 - x0 % 10, x1, 10):
    X = pad + (x - x0) * sc
    if x % 50 == 0: d.text((X + 2, 2), str(x), fill=(110, 110, 110), font=f); d.line([(X, 0), (X, 8)], fill=(0, 0, 0))
out.save(a[2])
