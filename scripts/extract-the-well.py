#!/usr/bin/env python3
"""
Extract one frame of Rayleigh-Bénard temperature data from The Well (NeurIPS 2024)
and save as a grayscale PNG for use in the climate-simulator lesson.

The Well is a 15TB collection of physics simulations from Polymathic AI:
https://polymathic-ai.org/the_well/

NOTE — The Well is a gated dataset. Before running this script you must:
  1. Create a Hugging Face account at https://huggingface.co
  2. Accept the dataset terms at https://huggingface.co/datasets/polymathic-ai/the_well
  3. Log in locally:  huggingface-cli login

Without authentication the script falls back to a synthetic Rayleigh-Bénard
texture (hexagonal convection cells + turbulent plumes via numpy). The climate
simulator works either way — the synthetic version already ships in the repo.

Requirements:
    pip install huggingface_hub h5py numpy Pillow

Usage (run from the repo root):
    python scripts/extract-the-well.py

Output:
    assets/data/rayleigh-benard.png   (512×256 grayscale)
"""

import os
import sys
import numpy as np

# ── Dependency check ──────────────────────────────────────────────────────────
missing = []
try:
    from huggingface_hub import HfApi, hf_hub_download
except ImportError:
    missing.append("huggingface_hub")
try:
    import h5py
except ImportError:
    missing.append("h5py")
try:
    from PIL import Image
except ImportError:
    missing.append("Pillow")

if missing:
    print(f"Missing packages: {', '.join(missing)}")
    print(f"Install with:  pip install {' '.join(missing)}")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────────
REPO_ID   = "polymathic-ai/the_well"
OUT_PATH  = "assets/data/rayleigh-benard.png"
OUT_W, OUT_H = 512, 256
CACHE_DIR = ".cache/the_well"

# ── Synthetic fallback (used when HF auth is unavailable) ────────────────────
def generate_synthetic():
    """Physically-inspired RB texture: hexagonal cells + turbulent plumes."""
    print("Generating synthetic Rayleigh-Bénard texture…")
    rng = np.random.default_rng(42)
    x = np.linspace(0, 2 * np.pi, OUT_W, endpoint=False)
    y = np.linspace(0, np.pi,     OUT_H, endpoint=False)
    X, Y = np.meshgrid(x, y)

    def hex_wave(X, Y, scale):
        return (np.sin(X * scale) +
                np.sin((X * .5 + Y * .866) * scale) +
                np.sin((X * .5 - Y * .866) * scale)) / 3.0

    combined = (hex_wave(X, Y, 3) * .45 +
                hex_wave(X, Y, 7) * .20 +
                hex_wave(X, Y, 14) * .10)

    field = np.zeros((OUT_H, OUT_W), np.float32)
    cx = rng.uniform(0, OUT_W, 140); cy = rng.uniform(0, OUT_H, 140)
    sx = rng.uniform(8, 32, 140);    sy = rng.uniform(6, 20, 140)
    GX, GY = np.meshgrid(np.arange(OUT_W), np.arange(OUT_H))
    for i in range(140):
        dx = ((GX - cx[i] + OUT_W / 2) % OUT_W) - OUT_W / 2
        dy = GY - cy[i]
        field += np.exp(-.5 * ((dx / sx[i])**2 + (dy / sy[i])**2)) * rng.uniform(.4, 1.)
    combined += field / field.max() * .35
    combined *= 1. - .3 * (np.abs(Y / np.pi - .5) * 2) ** 2

    lo, hi = np.percentile(combined, 1), np.percentile(combined, 99)
    combined = np.clip((combined - lo) / (hi - lo), 0, 1)
    return (combined * 255).astype(np.uint8)

# ── Step 1: Find a Rayleigh-Bénard HDF5 file on Hugging Face ─────────────────
print("Listing The Well repository files (this may take a moment)…")
print("(Requires HF login: huggingface-cli login — will fall back to synthetic if not authenticated)")
try:
    api = HfApi()
    all_files = list(api.list_repo_files(REPO_ID, repo_type="dataset"))
except Exception as e:
    print(f"Hugging Face access failed ({e})")
    print("Falling back to synthetic texture.")
    pixels = generate_synthetic()
    img = Image.fromarray(pixels)
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    img.save(OUT_PATH, optimize=True)
    print(f"Saved → {OUT_PATH}  (synthetic, {os.path.getsize(OUT_PATH)//1024} KB)")
    sys.exit(0)

rb_files = sorted(
    f for f in all_files
    if "rayleigh_benard" in f.lower() and f.endswith(".hdf5")
)

if not rb_files:
    print("No Rayleigh-Bénard HDF5 files found. Falling back to synthetic.")
    pixels = generate_synthetic()
    img = Image.fromarray(pixels)
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    img.save(OUT_PATH, optimize=True)
    print(f"Saved → {OUT_PATH}  (synthetic, {os.path.getsize(OUT_PATH)//1024} KB)")
    sys.exit(0)

# Prefer a 'valid' split file so we grab a clean evaluation sample
valid_files = [f for f in rb_files if "/valid/" in f]
target_file = valid_files[0] if valid_files else rb_files[0]
print(f"Downloading: {target_file}")

# ── Step 2: Download just the one HDF5 file (~200–600 MB) ────────────────────
local_path = hf_hub_download(
    repo_id=REPO_ID,
    filename=target_file,
    repo_type="dataset",
    cache_dir=CACHE_DIR,
)
print(f"Cached at: {local_path}")

# ── Step 3: Extract a temperature field frame ─────────────────────────────────
print("Opening HDF5 file…")
with h5py.File(local_path, "r") as hf:
    # Print top-level keys so you can inspect the structure if needed
    print("  Top-level keys:", list(hf.keys()))

    # Try common field name patterns used by The Well
    temp_key = None
    for candidate in ("temperature", "T", "theta", "buoyancy", "scalar"):
        if candidate in hf:
            temp_key = candidate
            break

    if temp_key is None:
        # Fall back: use the first non-coordinate dataset
        coord_keys = {"x", "y", "z", "t", "time", "coords", "grid"}
        data_keys = [k for k in hf.keys() if k.lower() not in coord_keys]
        if not data_keys:
            print("Could not find a field dataset in:", list(hf.keys()))
            sys.exit(1)
        temp_key = data_keys[0]
        print(f"  Using field: '{temp_key}' (auto-selected)")
    else:
        print(f"  Using field: '{temp_key}'")

    ds = hf[temp_key]
    print(f"  Shape: {ds.shape}, dtype: {ds.dtype}")

    # Shape is typically (time, y, x) or (time, channel, y, x)
    # Read just the first time step to avoid pulling the whole file into RAM
    if ds.ndim == 2:
        frame = ds[:]                  # already a single 2D field
    elif ds.ndim == 3:
        frame = ds[0]                  # first time step → (y, x)
    elif ds.ndim == 4:
        frame = ds[0, 0]               # first time, first channel → (y, x)
    else:
        # Flatten extra dims
        frame = ds[tuple([0] * (ds.ndim - 2) + [slice(None), slice(None)])]

    print(f"  Extracted frame shape: {frame.shape}")

# ── Step 4: Normalise → PNG ───────────────────────────────────────────────────
frame = np.array(frame, dtype=np.float32)

# Remove outliers before normalising (clip to 2–98th percentile)
lo, hi = np.percentile(frame, 2), np.percentile(frame, 98)
frame = np.clip(frame, lo, hi)
frame = (frame - lo) / (hi - lo)          # 0..1

pixels = (frame * 255).astype(np.uint8)

img = Image.fromarray(pixels, mode="L")   # grayscale

# Resize to target dimensions using high-quality Lanczos
img = img.resize((OUT_W, OUT_H), Image.LANCZOS)

os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
img.save(OUT_PATH, optimize=True)

print(f"\nSaved → {OUT_PATH}  ({OUT_W}×{OUT_H} px, {os.path.getsize(OUT_PATH)//1024} KB)")
print("Commit this file and the climate simulator will automatically use it.")
