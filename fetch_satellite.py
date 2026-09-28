import math
import urllib.request
import os
from PIL import Image
import socket
socket.setdefaulttimeout(10)

volcanoes = {
    'vesuvius79':   (40.8224, 14.4289, 13),
    'tambora1815':  (-8.2470, 117.9940, 12),
    'krakatoa1883': (-6.1020, 105.4230, 13),
    'sthelenr1980': (46.1912, -122.1944, 13),
    'pinatubo1991': (15.1429, 120.3506, 12),
    'eyja2010':     (63.6330, -19.6000, 12),
    'maunaloa2022': (19.4721, -155.5922, 10),
    'yellowstone':  (44.4280, -110.5885, 9)
}

def get_tile_url(z, x, y):
    # ESRI World Imagery
    return f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"

def latlon_to_pixels(lat, lon, zoom):
    lat_rad = math.radians(lat)
    n = 2.0 ** zoom
    x = (lon + 180.0) / 360.0 * n
    y = (1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n
    return x * 256.0, y * 256.0

out_dir = "assets/images/lessons/volcano-simulator"
os.makedirs(out_dir, exist_ok=True)

for vid, (lat, lon, zoom) in volcanoes.items():
    px, py = latlon_to_pixels(lat, lon, zoom)

    tx = int(px // 256)
    ty = int(py // 256)

    canvas = Image.new('RGB', (256*3, 256*3))
    for dx in [-1, 0, 1]:
        for dy in [-1, 0, 1]:
            ix = tx + dx
            iy = ty + dy
            url = get_tile_url(zoom, ix, iy)
            tile_path = f"tmp_color_{ix}_{iy}.jpg"
            try:
                # Add User-Agent to avoid blocks
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req) as response, open(tile_path, 'wb') as out_file:
                    out_file.write(response.read())
                img = Image.open(tile_path).convert("RGB")
                canvas.paste(img, ((dx+1)*256, (dy+1)*256))
                os.remove(tile_path)
            except Exception as e:
                print(f"Error fetching {url}: {e}")

    center_x = (px - (tx-1)*256)
    center_y = (py - (ty-1)*256)

    left = int(center_x - 128)
    top = int(center_y - 128)
    cropped = canvas.crop((left, top, left+256, top+256))
    
    out_path = os.path.join(out_dir, f"{vid}-color.jpg")
    cropped.save(out_path, quality=85)
    print(f"Saved {out_path}")
