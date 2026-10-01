extends "res://scripts/player.gd"

# REFERENCE EXTENSION — attempt the dash challenge before reading this.
# WHAT: Adds a Shift dash on top of the starter controller without copying it.
# HOW TO TRY IT: In scripts/main.gd, swap the PlayerController preload to
# "res://extensions/player_dash.gd" (the comment there shows the exact line).
# WHY "extends": Inheritance reuses every line of player.gd. This file only adds
# the new rule, so a bug fix in player.gd automatically applies here too.

@export var dash_speed := 16.0
@export var dash_duration := 0.18  # seconds the burst lasts
@export var dash_cooldown := 0.8   # seconds before another dash may start

var dash_time := 0.0
var cooldown_time := 0.0


func _physics_process(delta: float) -> void:
    # WHAT: Both timers count toward zero every physics frame.
    dash_time = maxf(dash_time - delta, 0.0)
    cooldown_time = maxf(cooldown_time - delta, 0.0)

    # WHY: is_action_just_pressed is true for one frame only (a rising edge), so
    # holding Shift starts exactly one dash.
    if Input.is_action_just_pressed("dash") and cooldown_time == 0.0:
        dash_time = dash_duration
        cooldown_time = dash_cooldown

    # WHAT: Temporarily raise speed and acceleration, run the normal movement
    # code in player.gd with super(), then restore the original values.
    var normal_speed := move_speed
    var normal_acceleration := acceleration
    if dash_time > 0.0:
        move_speed = dash_speed
        acceleration = 400.0  # reach dash speed almost instantly
    super(delta)
    move_speed = normal_speed
    acceleration = normal_acceleration

    # TEST: Hold W and tap Shift. The player should surge forward, then return to
    # normal speed. Tapping again during the cooldown should do nothing.
