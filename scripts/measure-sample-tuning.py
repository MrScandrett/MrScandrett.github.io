#!/usr/bin/env python3
"""Measure how far each bundled instrument sample sounds from its manifest root, in cents.
Usage: python3 scripts/measure-sample-tuning.py [assets/audio/instruments]   (needs ffmpeg and numpy)
Prints measured-minus-declared cents per root, after any recorded "cents" correction.
Copy offsets of 8 cents or more into CENTS in scripts/build-instrument-samples.py (not piano:
its upper-octave stretch tuning is deliberate). "?" means no stable pitch (timpani, top xylophone).
"""
import json, subprocess, sys, numpy as np
D = sys.argv[1] if len(sys.argv) > 1 else 'assets/audio/instruments'; SR = 44100
man = json.load(open(D + '/manifest.json'))
def f0(x, lo, hi):
    # cumulative-mean-normalised difference (YIN) on one frame
    W = 4096; best = []
    for start in range(0, len(x) - 2 * W, W // 2):
        fr = x[start:start + 2 * W]
        if np.sqrt(np.mean(fr ** 2)) < 0.01: continue
        tmin, tmax = int(SR / hi), min(int(SR / lo), W - 1)
        d = np.array([np.sum((fr[:W] - fr[t:t + W]) ** 2) for t in range(tmax + 1)])
        cm = d[1:] * np.arange(1, len(d)) / np.maximum(np.cumsum(d[1:]), 1e-12)
        cm = np.concatenate([[1], cm])
        cand = [t for t in range(tmin, tmax) if cm[t] < 0.15 and cm[t] <= cm[t - 1] and cm[t] <= cm[t + 1]]
        if not cand: continue
        t = cand[0]; a, b, c = cm[t - 1], cm[t], cm[t + 1]
        tt = t + 0.5 * (a - c) / (a - 2 * b + c) if (a - 2 * b + c) else t
        best.append(SR / tt)
    return np.median(best) if best else None
for name, bank in man['banks'].items():
    if name in ('timpani',): continue
    row = []
    for r in bank['roots']:
        raw = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', D + '/' + r['file'], '-ac', '1', '-ar', str(SR), '-t', '3.5', '-f', 'f32le', '-'], capture_output=True).stdout
        x = np.frombuffer(raw, np.float32)[int(0.25 * SR):]
        target = 440 * 2 ** ((r['midi'] - 69) / 12)
        f = f0(x, target / 1.6, target * 1.6)
        row.append(f"{r['midi']}:{'?' if f is None else round(1200*np.log2(f/target)) - r.get('cents', 0)}")
    print(name.ljust(15), ' '.join(row))
