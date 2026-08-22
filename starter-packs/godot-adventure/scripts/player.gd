extends CharacterBody3D

# PLAYER CONTROLLER — movement, gravity, jump, and third-person camera.
# Read README-FIRST.md and search for WHAT, WHY, TRY THIS, and TEST.

@export var move_speed := 6.0
@export var acceleration := 18.0
@export var jump_velocity := 7.0
@export var mouse_sensitivity := 0.0025

var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")
var camera_pivot: Node3D


func _ready() -> void:
    name = "Player"
    collision_layer = 2
    collision_mask = 1

    # WHAT: The collision shape is the physics body's invisible physical boundary.
    var collider := CollisionShape3D.new()
    var capsule := CapsuleShape3D.new()
    capsule.radius = 0.45
    capsule.height = 1.8
    collider.shape = capsule
    collider.position.y = 0.9
    add_child(collider)

    # WHAT: A separate mesh lets appearance change without changing collision.
    var visible_body := MeshInstance3D.new()
    var body_mesh := CapsuleMesh.new()
    body_mesh.radius = 0.45
    body_mesh.height = 1.8
    visible_body.mesh = body_mesh
    visible_body.position.y = 0.9
    visible_body.material_override = _material(Color("55e6c1"))
    add_child(visible_body)

    # WHY: Rotating a pivot keeps camera look separate from player physics.
    camera_pivot = Node3D.new()
    camera_pivot.name = "CameraPivot"
    camera_pivot.position.y = 1.2
    add_child(camera_pivot)

    var camera := Camera3D.new()
    camera.name = "Camera3D"
    camera.position = Vector3(0, 3.4, 7.2)
    camera.rotation_degrees.x = -18
    camera.current = true
    camera_pivot.add_child(camera)
    Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
        camera_pivot.rotate_y(-event.relative.x * mouse_sensitivity)
    elif event.is_action_pressed("ui_cancel"):
        Input.mouse_mode = Input.MOUSE_MODE_VISIBLE if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED else Input.MOUSE_MODE_CAPTURED


func _physics_process(delta: float) -> void:
    # WHAT: Input.get_vector combines four actions and limits diagonal length to 1.
    var input_2d := Input.get_vector("move_left", "move_right", "move_forward", "move_back")

    # WHY: Movement follows the camera's horizontal direction rather than world axes.
    var forward := -camera_pivot.global_basis.z
    var right := camera_pivot.global_basis.x
    forward.y = 0.0
    right.y = 0.0
    var desired_direction := (right.normalized() * input_2d.x + forward.normalized() * -input_2d.y).normalized()
    var desired_velocity := desired_direction * move_speed
    velocity.x = move_toward(velocity.x, desired_velocity.x, acceleration * delta)
    velocity.z = move_toward(velocity.z, desired_velocity.z, acceleration * delta)

    if not is_on_floor():
        velocity.y -= gravity * delta
    elif Input.is_action_just_pressed("jump"):
        velocity.y = jump_velocity

    move_and_slide()

    # TEST: Release movement. Acceleration should ease horizontal speed toward zero.
    # TRY THIS: Add sprint only after base movement feels reliable.


func _material(color: Color) -> StandardMaterial3D:
    var material := StandardMaterial3D.new()
    material.albedo_color = color
    material.roughness = 0.55
    return material
