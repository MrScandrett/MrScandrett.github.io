#!/usr/bin/env python3
"""analyze_breathing.py: turn a CSI recording into breaths per minute.

Usage:  python analyze_breathing.py recording.csv
        (recording.csv: the lines the ESP32 prints, "C,seq,ms,rssi,a1..a52", saved from the lesson
         page's "Save recording" button, the Arduino Serial Monitor, or the simulator.)
Needs:  pip install numpy scipy matplotlib
The same five steps as the lesson page: resample, band-pass, pick subcarriers, spectrum, peak.
"""
import sys
import numpy as np
from scipy.signal import butter, filtfilt, detrend
import matplotlib.pyplot as plt

FS = 10.0                      # analysis clock, Hz
LO, HI = 0.1, 0.6              # breathing band, Hz (6 to 36 breaths per minute)
TOP = 6                        # how many subcarriers to average

rows = [l.strip().split(",") for l in open(sys.argv[1]) if l.startswith("C,")]
rows = [r for r in rows if len(r) >= 12]
t = np.array([float(r[2]) for r in rows]) / 1000.0
amps = np.array([[float(v) for v in r[4:]] for r in rows])           # packets x subcarriers

# 1. packets never arrive on a metronome: put every subcarrier on an even 10 Hz clock
grid = np.arange(t[0], t[-1], 1 / FS)
cols = np.array([np.interp(grid, t, amps[:, k]) for k in range(amps.shape[1])])

# 2. remove the slow drift, keep only 0.1 to 0.6 Hz
def band(x):
    b, a = butter(2, [LO, HI], btype="band", fs=FS)
    return filtfilt(b, a, detrend(x), padlen=min(len(x) - 1, 30))
bands = np.array([band(c) for c in cols])

# 3. keep the subcarriers that carry the most breathing, flip the ones that move the opposite way
best = np.argsort((bands ** 2).sum(axis=1))[::-1][:TOP]
ref = bands[best[0]]
signal = sum(np.sign(bands[i] @ ref) * bands[i] for i in best) / TOP

# 4 + 5. spectrum, then the strongest peak
freqs = np.arange(0.05, 0.8, 0.005)
win = np.hanning(len(signal))
power = np.array([abs(np.sum(signal * win * np.exp(-2j * np.pi * f * grid[: len(signal)]))) ** 2 for f in freqs])
inband = (freqs >= LO) & (freqs <= HI)
peak = freqs[inband][np.argmax(power[inband])]
print(f"Strongest rhythm in selected band: {peak * 60:.1f} per minute  (peak/median spectrum: {power[inband].max() / np.median(power):.0f}x; not a validated confidence score)")

fig, ax = plt.subplots(3, 1, figsize=(8, 8))
ax[0].plot(grid, cols[best[0]]); ax[0].set_title("Raw amplitude, best subcarrier")
ax[1].plot(grid[: len(signal)], signal); ax[1].set_title("After band-pass and combining")
ax[2].plot(freqs * 60, power); ax[2].axvline(peak * 60, color="r"); ax[2].set_title("Spectrum (breaths per minute)")
plt.tight_layout(); plt.show()
