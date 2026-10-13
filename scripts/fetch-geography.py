#!/usr/bin/env python3
"""Fetch pinned source geography into a cache; build-geography.mjs creates assets.

Usage: python3 scripts/fetch-geography.py /tmp/classroom-geography
"""
import concurrent.futures
import json
import pathlib
import sys
import urllib.request

cache = pathlib.Path(sys.argv[1])
cache.mkdir(parents=True, exist_ok=True)
base = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/'
jobs = [(n, base + n) for n in [
    'ne_50m_land.geojson', 'ne_50m_admin_0_countries.geojson',
    'ne_50m_admin_1_states_provinces.geojson',
    'ne_50m_admin_0_boundary_lines_disputed_areas.geojson',
]] + [(f'coastlines_{t}ma.json',
       f'https://gws.gplates.org/reconstruct/coastlines/?time={t}&model=MULLER2019&anchor_plate_id=0')
      for t in range(0, 241, 10)]

def fetch(job):
    name, url = job
    target = cache / name
    if not target.exists():
        req = urllib.request.Request(url, headers={'User-Agent': 'ClassroomOS geography audit'})
        with urllib.request.urlopen(req, timeout=60) as response:
            content = response.read()
        data = json.loads(content)
        if data.get('type') != 'FeatureCollection' or not data.get('features'):
            raise ValueError(f'Invalid geography: {url}')
        target.write_bytes(content)
    print(name, flush=True)

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(fetch, jobs))
