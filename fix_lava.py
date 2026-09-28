import re

with open("lessons/earth-science/volcano-simulator.html", "r") as f:
    content = f.read()

# Replace the terrainColor logic to incorporate colormaps
old_terrain = r"""      // Break up perfect horizontal banding with noise
      const nH = hFrac \+ \(fbm\(x\*0\.4, z\*0\.4, 3\) - 0\.5\) \* 0\.15;
      const nH2 = clamp\(nH, 0, 1\);"""

new_terrain = r"""      // Return pure white if satellite map is loaded so we don't tint it,
      // but only for the non-lava terrain!
      if (colormaps[activeEruption]) return [1, 1, 1];
      
      // Break up perfect horizontal banding with noise
      const nH = hFrac + (fbm(x*0.4, z*0.4, 3) - 0.5) * 0.15;
      const nH2 = clamp(nH, 0, 1);"""

content = re.sub(old_terrain, new_terrain, content)

# I should also make sure the lava glows brightly at night by making the Lava Mat emissive if possible.
# Actually, vertex colors don't emit light in MeshStandardMaterial. But the ambient darkness makes them darker!
# To make lava glow at night: since it's just vertex colors, if the ambient light goes to 0, the lava will become pitch black.
# We need to make the material `emissive: 0xffffff, emissiveMap: mapTex`? No, if we do that, the whole terrain glows.
# But wait! If we change `terrainMesh.material.emissive` it affects everything.
# How does lava stay bright in the procedural version?
# There is `lavaLight` (a PointLight). That illuminates the terrain where the lava is.
# So the lava channel WILL be brightly illuminated by the `lavaLight`.
# But wait, lavaLight is positioned at `0, 6, 0`. It lights the whole crater.
# Let's boost `lavaLight` intensity at night so the crater shines brightly!
