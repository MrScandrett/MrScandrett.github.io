extends Area3D

# WHAT: This reusable object detects the player and announces what happened.
# WHY: It does not own score or UI; the level decides what collection means.
signal collected

@export var spin_speed := 1.8
var base_height := 0.0


func _ready() -> void:
    base_height = position.y
    collision_layer = 4
    collision_mask = 2
    monitoring = true

    var collider := CollisionShape3D.new()
    var shape := SphereShape3D.new()
    shape.radius = 0.48
    collider.shape = shape
    add_child(collider)

    var visible_orb := MeshInstance3D.new()
    var orb_mesh := SphereMesh.new()
    orb_mesh.radius = 0.36
    orb_mesh.height = 0.72
    visible_orb.mesh = orb_mesh
    var material := StandardMaterial3D.new()
    material.albedo_color = Color("ffd45a")
    material.emission_enabled = true
    material.emission = Color("ffad33")
    material.emission_energy_multiplier = 2.0
    visible_orb.material_override = material
    add_child(visible_orb)
    body_entered.connect(_on_body_entered)


func _process(delta: float) -> void:
    rotate_y(spin_speed * delta)
    # WHY: Recalculate from a stable base instead of accumulating vertical drift.
    position.y = base_height + sin(Time.get_ticks_msec() * 0.003 + position.x) * 0.14


func _on_body_entered(body: Node3D) -> void:
    if body.name == "Player":
        collected.emit()
        queue_free()
