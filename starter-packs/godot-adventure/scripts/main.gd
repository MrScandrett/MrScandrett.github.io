extends Node3D

# MAIN — owns level construction, score, win state, and interface.
const PlayerController = preload("res://scripts/player.gd")
const CollectibleController = preload("res://scripts/collectible.gd")

const TOTAL_CELLS := 6
var score := 0
var score_label: Label
var message_label: Label


func _ready() -> void:
    _build_environment()
    _build_floor()
    _build_player()
    _build_collectibles()
    _build_hud()
    update_hud()


func _build_environment() -> void:
    var world := WorldEnvironment.new()
    var environment := Environment.new()
    environment.background_mode = Environment.BG_COLOR
    environment.background_color = Color("07111f")
    environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
    environment.ambient_light_color = Color("88bde8")
    environment.ambient_light_energy = 0.65
    world.environment = environment
    add_child(world)

    var sun := DirectionalLight3D.new()
    sun.rotation_degrees = Vector3(-52, -35, 0)
    sun.light_energy = 1.1
    sun.shadow_enabled = true
    add_child(sun)


func _build_floor() -> void:
    var floor := StaticBody3D.new()
    floor.name = "Floor"
    floor.collision_layer = 1
    add_child(floor)

    var collider := CollisionShape3D.new()
    var shape := BoxShape3D.new()
    shape.size = Vector3(24, 0.5, 18)
    collider.shape = shape
    collider.position.y = -0.25
    floor.add_child(collider)

    var visible_floor := MeshInstance3D.new()
    var floor_mesh := BoxMesh.new()
    floor_mesh.size = Vector3(24, 0.5, 18)
    visible_floor.mesh = floor_mesh
    visible_floor.position.y = -0.25
    var material := StandardMaterial3D.new()
    material.albedo_color = Color("163a55")
    material.metallic = 0.15
    material.roughness = 0.8
    visible_floor.material_override = material
    floor.add_child(visible_floor)

    # TRY THIS: Turn these decorations into collidable platforms.
    for position in [Vector3(-8, 0.6, -5), Vector3(7, 0.8, -3), Vector3(5, 0.5, 6)]:
        var marker := MeshInstance3D.new()
        var mesh := BoxMesh.new()
        mesh.size = Vector3(2.2, 1.0, 2.2)
        marker.mesh = mesh
        marker.position = position
        var marker_material := StandardMaterial3D.new()
        marker_material.albedo_color = Color("285b73")
        marker.material_override = marker_material
        add_child(marker)


func _build_player() -> void:
    var player := CharacterBody3D.new()
    player.set_script(PlayerController)
    player.position = Vector3(0, 0.05, 5.5)
    add_child(player)


func _build_collectibles() -> void:
    var positions := [
        Vector3(-8, 0.8, -6), Vector3(-4, 0.8, 1), Vector3(0, 0.8, -5),
        Vector3(4, 0.8, 2), Vector3(8, 0.8, -4), Vector3(8, 0.8, 6)
    ]
    for index in positions.size():
        var cell := Area3D.new()
        cell.name = "EnergyCell%d" % (index + 1)
        cell.set_script(CollectibleController)
        cell.position = positions[index]
        cell.connect("collected", Callable(self, "_on_cell_collected"))
        add_child(cell)


func _build_hud() -> void:
    var layer := CanvasLayer.new()
    layer.name = "HUD"
    add_child(layer)

    var panel := ColorRect.new()
    panel.position = Vector2(18, 18)
    panel.size = Vector2(360, 92)
    panel.color = Color(0.02, 0.06, 0.11, 0.88)
    layer.add_child(panel)

    score_label = Label.new()
    score_label.position = Vector2(18, 12)
    score_label.add_theme_font_size_override("font_size", 24)
    panel.add_child(score_label)

    message_label = Label.new()
    message_label.position = Vector2(18, 50)
    message_label.add_theme_color_override("font_color", Color("9bb4c8"))
    panel.add_child(message_label)


func _on_cell_collected() -> void:
    score += 1
    update_hud()


func update_hud() -> void:
    score_label.text = "ENERGY  %d / %d" % [score, TOTAL_CELLS]
    message_label.text = "Launch gate online!" if score == TOTAL_CELLS else "WASD move · Mouse look · Space jump · Esc cursor"
    if score == TOTAL_CELLS:
        score_label.add_theme_color_override("font_color", Color("55e6c1"))
