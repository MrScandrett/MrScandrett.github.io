# REFERENCE EXTENSION — attempt the dash challenge before reading this.
# Add these members to player.gd rather than attaching this file directly.

# @export var dash_speed := 14.0
# @export var dash_duration := 0.18
# @export var dash_cooldown := 0.8
# var dash_time := 0.0
# var cooldown_time := 0.0
#
# In _physics_process(delta), reduce both timers toward zero. When a named dash
# action is just pressed and cooldown_time is zero, set both timers. While
# dash_time is positive, use dash_speed instead of move_speed.
#
# WHY: Duration controls how long the effect lasts; cooldown controls how often
# it may begin. Keeping them separate makes the rule readable and tunable.
#
# TEST: Hold the dash key. A correct rising-edge input starts only one dash and
# cannot restart it until the cooldown reaches zero.
