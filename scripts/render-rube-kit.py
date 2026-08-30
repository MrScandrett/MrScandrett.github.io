"""Render original low-poly Rube Goldberg parts in the shared model style.

Usage:
  blender --background --python scripts/render-rube-kit.py -- ramp output.png
"""

import math
import os
import sys

import bpy
from mathutils import Vector


def arguments():
    try:
        return sys.argv[sys.argv.index("--") + 1 :]
    except ValueError:
        return []


part_name, output_path = arguments()
bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, color):
    value = bpy.data.materials.new(name)
    value.diffuse_color = (*color, 1)
    value.roughness = 0.72
    return value


NAVY = material("Workshop navy", (0.025, 0.09, 0.15))
STEEL = material("Painted steel", (0.34, 0.55, 0.67))
STEEL_LIGHT = material("Steel highlight", (0.63, 0.76, 0.82))
IVORY = material("Warm ivory", (0.82, 0.78, 0.66))
RED = material("Signal red", (0.78, 0.14, 0.10))
YELLOW = material("Safety yellow", (0.92, 0.56, 0.05))
MINT = material("Workshop mint", (0.17, 0.58, 0.43))


def bevel(obj, amount=0.08, segments=2):
    modifier = obj.modifiers.new("Soft workshop edges", "BEVEL")
    modifier.width = amount
    modifier.segments = segments
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    return obj


def cube(name, location, scale, mat, bevel_width=0.06, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel(obj, bevel_width)
    obj.data.materials.append(mat)
    return obj


def cylinder(name, location, radius, depth, mat, rotation=(0, 0, 0), vertices=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    bevel(obj, min(radius, depth) * 0.12)
    obj.data.materials.append(mat)
    return obj


def sphere(name, location, scale, mat):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return obj


def build_ramp():
    cube("Ramp body", (0, 0, 0), (1.35, 0.34, 0.13), STEEL, 0.08)
    cube("Ivory running surface", (0, -0.02, 0.17), (1.26, 0.29, 0.055), IVORY, 0.045)
    for x in (-1.08, -0.54, 0, 0.54, 1.08):
        cube("Grip strip", (x, -0.325, 0.235), (0.035, 0.018, 0.105), NAVY, 0.012, rotation=(0, math.radians(-18), 0))
    for x in (-1.13, 1.13):
        cylinder("Ramp bolt", (x, -0.36, 0.03), 0.055, 0.035, YELLOW, rotation=(math.pi / 2, 0, 0), vertices=12)


def build_platform():
    cube("Platform body", (0, 0, 0), (1.18, 0.43, 0.18), STEEL, 0.1)
    cube("Platform top", (0, -0.015, 0.235), (1.08, 0.37, 0.06), STEEL_LIGHT, 0.05)
    for x in (-0.88, 0.88):
        cylinder("Platform bolt", (x, -0.45, 0.04), 0.065, 0.04, YELLOW, rotation=(math.pi / 2, 0, 0), vertices=12)
    for x in (-0.48, 0, 0.48):
        cube("Top grip", (x, -0.39, 0.26), (0.025, 0.02, 0.12), NAVY, 0.01, rotation=(0, math.radians(-18), 0))


def build_domino():
    cube("Domino", (0, 0, 0), (0.42, 0.18, 1.05), RED, 0.12)
    cube("Center groove", (0, -0.19, 0), (0.32, 0.025, 0.025), NAVY, 0.01)
    for z in (-0.62, 0.62):
        sphere("Domino pip", (0, -0.205, z), (0.105, 0.035, 0.105), IVORY)
    sphere("Domino pip", (0, -0.205, -0.34), (0.075, 0.03, 0.075), NAVY)
    sphere("Domino pip", (0, -0.205, 0.34), (0.075, 0.03, 0.075), NAVY)


def build_fan():
    cube("Fan base", (0, 0.05, -1.02), (0.68, 0.42, 0.15), STEEL, 0.1)
    cube("Fan neck", (0, 0.08, -0.67), (0.13, 0.16, 0.35), STEEL_LIGHT, 0.08)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.72, minor_radius=0.105, major_segments=20, minor_segments=8, location=(0, 0, 0.15), rotation=(math.pi / 2, 0, 0))
    ring = bpy.context.object
    ring.name = "Fan guard"
    ring.data.materials.append(MINT)
    cylinder("Fan hub", (0, -0.08, 0.15), 0.18, 0.24, YELLOW, rotation=(math.pi / 2, 0, 0), vertices=16)
    for index in range(4):
        angle = index * math.pi / 2 + math.pi / 4
        x, z = math.cos(angle) * 0.36, math.sin(angle) * 0.36 + 0.15
        blade = cube("Fan blade", (x, -0.04, z), (0.16, 0.09, 0.42), IVORY, 0.11)
        blade.rotation_euler[1] = -angle
    cylinder("Fan switch", (0.42, -0.44, -1.0), 0.07, 0.04, RED, rotation=(math.pi / 2, 0, 0), vertices=12)


builders = {"ramp": build_ramp, "platform": build_platform, "domino": build_domino, "fan": build_fan}
if part_name not in builders:
    raise ValueError(f"Unknown part: {part_name}")
builders[part_name]()

meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
minimum = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
maximum = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
center = (minimum + maximum) / 2
largest = max(maximum.x - minimum.x, maximum.y - minimum.y, maximum.z - minimum.z)
scale = 2.45 / largest
for obj in meshes:
    obj.location = (obj.location - center) * scale
    obj.scale *= scale

camera_data = bpy.data.cameras.new("Shared kit camera")
camera = bpy.data.objects.new("Shared kit camera", camera_data)
bpy.context.collection.objects.link(camera)
camera.location = (4.2, -6.2, 4.1)
camera.data.type = "ORTHO"
camera.data.ortho_scale = 3.35
bpy.context.scene.camera = camera
target = bpy.data.objects.new("Camera target", None)
bpy.context.collection.objects.link(target)
constraint = camera.constraints.new(type="TRACK_TO")
constraint.target = target
constraint.track_axis = "TRACK_NEGATIVE_Z"
constraint.up_axis = "UP_Y"

key_data = bpy.data.lights.new("Upper-left key", type="AREA")
key_data.energy = 850
key_data.shape = "DISK"
key_data.size = 4
key = bpy.data.objects.new("Upper-left key", key_data)
key.location = (-3.5, -4.5, 6)
bpy.context.collection.objects.link(key)

fill_data = bpy.data.lights.new("Soft fill", type="AREA")
fill_data.energy = 500
fill_data.size = 5
fill = bpy.data.objects.new("Soft fill", fill_data)
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
scene.world = bpy.data.worlds.new("Workshop world")
scene.world.color = (0.035, 0.05, 0.075)
scene.display.shading.light = "STUDIO"
scene.display.shading.studio_light = "rim.sl"
scene.display.shading.color_type = "MATERIAL"
scene.display.shading.show_shadows = True
scene.display.shading.show_cavity = True
scene.display.shading.cavity_type = "WORLD"
bpy.ops.render.render(write_still=True)
