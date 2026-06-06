#!/usr/bin/env python3
"""
Download NASA public-domain Earth textures for the Climate Modeling Simulator.

All images are from NASA Visible Earth / NASA Earth Observatory — public domain.
Attribution: NASA Earth Observatory / NASA Goddard Space Flight Center

Run once from the repo root:
    python3 scripts/download-earth-textures.py

Requires: Python 3 (stdlib only). Pillow optional — used only to resize Black Marble.
"""

import os
import sys
import urllib.request
import shutil

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'textures', 'earth')
os.makedirs(OUT, exist_ok=True)

TEXTURES = [
    {
        'filename': 'blue-marble.jpg',
        'urls': [
            # NASA Blue Marble Next Generation — various record IDs (moved over the years)
            'https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74117/world.200407.3x2048x1024.jpg',
            'https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74218/world.200408.3x2048x1024.jpg',
            'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57723/land_shallow_topo_2048.jpg',
            # three-globe MIT-licensed package images (NASA Blue Marble derived)
            'https://unpkg.com/three-globe/example/img/earth-day.jpg',
            'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-day.jpg',
        ],
        'desc': 'Blue Marble 2048×1024 (day surface)',
        'min_bytes': 100_000,
    },
    {
        'filename': 'black-marble.jpg',
        'urls': [
            # Already downloaded — kept for re-run idempotency
            'https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/BlackMarble_2016_01deg.jpg',
            'https://unpkg.com/three-globe/example/img/earth-night.jpg',
            'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg',
        ],
        'desc': 'Black Marble night lights',
        'min_bytes': 200_000,
    },
    {
        'filename': 'clouds.jpg',
        'urls': [
            # NASA cloud composite — various paths
            'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud.E2006120.3x1024x512.jpg',
            'https://unpkg.com/three-globe/example/img/earth-clouds.png',
            'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-clouds.png',
        ],
        'desc': 'Cloud cover texture',
        'min_bytes': 50_000,
    },
]

def download(url, dest, desc):
    print(f'  Downloading {desc}...')
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=60) as r, open(dest, 'wb') as f:
            total = int(r.headers.get('Content-Length', 0))
            done = 0
            while True:
                chunk = r.read(65536)
                if not chunk:
                    break
                f.write(chunk)
                done += len(chunk)
                if total:
                    pct = done * 100 // total
                    print(f'\r    {pct}% ({done // 1024} KB / {total // 1024} KB)', end='', flush=True)
            print()
        return True
    except Exception as e:
        print(f'\n    Failed: {e}')
        if os.path.exists(dest):
            os.remove(dest)
        return False

def try_resize_black_marble(path):
    """Resize Black Marble to 2048×1024 if Pillow is available and file is large."""
    try:
        from PIL import Image
        img = Image.open(path)
        if img.width > 2048:
            print(f'  Resizing Black Marble from {img.width}×{img.height} → 2048×1024...')
            img = img.resize((2048, 1024), Image.LANCZOS)
            img.save(path, 'JPEG', quality=88)
            print('  Done.')
    except ImportError:
        pass  # Pillow not installed — use as-is
    except Exception as e:
        print(f'  (resize skipped: {e})')

print('NASA Earth Texture Downloader')
print(f'Output: {os.path.abspath(OUT)}\n')

for tex in TEXTURES:
    dest = os.path.join(OUT, tex['filename'])
    if os.path.exists(dest) and os.path.getsize(dest) >= tex['min_bytes']:
        print(f'✓ {tex["filename"]} already present ({os.path.getsize(dest) // 1024} KB)')
        continue

    print(f'→ {tex["filename"]} — {tex["desc"]}')
    ok = False
    for url in tex['urls']:
        if download(url, dest, url.split('/')[-1]):
            size = os.path.getsize(dest)
            if size >= tex['min_bytes']:
                print(f'  ✓ Saved ({size // 1024} KB)')
                ok = True
                break
            else:
                print(f'  File too small ({size} bytes) — trying next URL')
                os.remove(dest)
    if not ok:
        print(f'  ✗ Could not download {tex["filename"]} — simulator will use procedural fallback\n')
        continue
    if tex['filename'] == 'black-marble.jpg':
        try_resize_black_marble(dest)
    print()

print('\nDone. Commit assets/textures/earth/ to Git so students load from GitHub Pages.')
print('Attribution: NASA Earth Observatory (public domain) — credit in lesson footer.')
