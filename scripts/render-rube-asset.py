"""Render a supplied GLB/OBJ as a transparent, classroom-ready simulator sprite.

Usage:
  blender --background --python scripts/render-rube-asset.py -- input.glb output.png
"""

import math
import os
import sys

import bpy
from mathutils import Vector


def args_after_separator():
    try:
        return sys.argv[sys.argv.index("--") + 1 :]
    except ValueError:
        return []


source_path, output_path = args_after_separator()
bpy.ops.wm.read_factory_settings(use_empty=True)

extension = os.path.splitext(source_path)[1].lower()
if extension in {".glb", ".gltf"}:
    bpy.ops.import_scene.gltf(filepath=source_path)
elif extension == ".obj":
    bpy.ops.wm.obj_import(filepath=source_path)
else:
    raise ValueError(f"Unsupported model format: {extension}")

meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
if not meshes:
    raise RuntimeError("Imported model contains no mesh objects")

# Flatten imported parent transforms before normalizing. Animated GLBs often
# parent their visible mesh to an armature; moving only the child location can
# otherwise leave the geometry outside the camera even though its bounds look
# correct in local space.
for obj in meshes:
    world_transform = obj.matrix_world.copy()
    obj.parent = None
    obj.matrix_world = world_transform
bpy.context.view_layer.update()

asset_name = os.path.basename(output_path).lower()
if "spring" in asset_name or "bell" in asset_name:
    color = (0.88, 0.055, 0.035, 1) if "spring" in asset_name else (0.95, 0.48, 0.045, 1)
    for obj in meshes:
        for slot in obj.material_slots:
            if slot.material:
                slot.material.diffuse_color = color

corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
minimum = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
maximum = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
center = (minimum + maximum) / 2
largest = max(maximum.x - minimum.x, maximum.y - minimum.y, maximum.z - minimum.z)
scale = 2.4 / largest if largest else 1

for obj in meshes:
    obj.location = (obj.location - center) * scale
    obj.scale *= scale

# A neutral isometric view keeps the source model recognizable when the sprite
# is rotated by the simulator's physics body.
camera_data = bpy.data.cameras.new("Sprite Camera")
camera = bpy.data.objects.new("Sprite Camera", camera_data)
bpy.context.collection.objects.link(camera)
camera.location = (4.2, -6.2, 4.1)
camera.rotation_euler = (math.radians(66), 0, math.radians(34))
camera.data.type = "ORTHO"
camera.data.ortho_scale = 3.35
bpy.context.scene.camera = camera

target = bpy.data.objects.new("Camera Target", None)
bpy.context.collection.objects.link(target)
constraint = camera.constraints.new(type="TRACK_TO")
constraint.target = target
constraint.track_axis = "TRACK_NEGATIVE_Z"
constraint.up_axis = "UP_Y"

key_data = bpy.data.lights.new("Key", type="AREA")
key_data.energy = 850
key_data.shape = "DISK"
key_data.size = 4
key = bpy.data.objects.new("Key", key_data)
key.location = (-3.5, -4.5, 6)
bpy.context.collection.objects.link(key)

fill_data = bpy.data.lights.new("Fill", type="AREA")
fill_data.energy = 500
fill_data.size = 5
fill = bpy.data.objects.new("Fill", fill_data)
fill.location = (4, 1, 3)
bpy.context.collection.objects.link(fill)

scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.render.resolution_x = 256
scene.render.resolution_y = 256
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.film_transparent = True
scene.render.filepath = output_path
scene.view_settings.look = "AgX - Medium High Contrast"
scene.view_settings.exposure = 0.25
scene.world = bpy.data.worlds.new("Sprite World")
scene.world.color = (0.035, 0.05, 0.075)
scene.display.shading.light = "STUDIO"
scene.display.shading.studio_light = "rim.sl"
scene.display.shading.color_type = "TEXTURE" if "baseball" in asset_name else "MATERIAL"
scene.display.shading.show_shadows = True
scene.display.shading.show_cavity = True
scene.display.shading.cavity_type = "WORLD"

bpy.ops.render.render(write_still=True)
