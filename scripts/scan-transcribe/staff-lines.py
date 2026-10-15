"""List the top-line y of every five-line staff on a scanned page, measured in a strip near the left
edge (after the clef). Pairs of consecutive values are a piano system's treble and bass staves.

    python staff-lines.py page.png [stripX0=300] [stripX1=420]

Needs numpy + pillow."""
import sys
import numpy as np
from PIL import Image

a = sys.argv
A = np.array(Image.open(a[1]).convert('L')).astype(float)
x0 = int(a[2]) if len(a) > 2 else 300
x1 = int(a[3]) if len(a) > 3 else 420
dark = (A[:, x0:x1] < 140).mean(axis=1)
rows = [i for i, v in enumerate(dark) if v > 0.5]
groups = []
for r in rows:
    if groups and r - groups[-1][-1] <= 1: groups[-1].append(r)
    else: groups.append([r])
lines = [sum(g) / len(g) for g in groups]
tops, i = [], 0
while i + 4 < len(lines):
    s = lines[i:i + 5]; d = np.diff(s)
    if d.max() - d.min() < 3.5 and 0.004 * A.shape[0] < d.mean() < 0.008 * A.shape[0]:
        tops.append(round(s[0])); i += 5
    else:
        i += 1
print('staff tops:', tops)
print('line spacing ~%.1f px' % (np.mean([lines[j + 1] - lines[j] for j in range(len(lines) - 1) if lines[j + 1] - lines[j] < 0.01 * A.shape[0]]) if len(lines) > 1 else 0))
