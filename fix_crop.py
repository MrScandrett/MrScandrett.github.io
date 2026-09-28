with open("fetch_satellite.py", "r") as f:
    content = f.read()

import re
content = re.sub(r'left = int\(center_x.*', 'left = int(center_x - 128)\n    top = int(center_y - 128)\n    cropped = canvas.crop((left, top, left+256, top+256))\n    \n    out_path = os.path.join(out_dir, f"{vid}-color.jpg")\n    cropped.save(out_path, quality=85)\n    print(f"Saved {out_path}")\n', content, flags=re.DOTALL)

with open("fetch_satellite.py", "w") as f:
    f.write(content)
