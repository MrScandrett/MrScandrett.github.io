# Arduino Starter Sketches

Three short, commented sketches that cover the building blocks of almost every
electronics project, plus a finished example that combines them:

| Sketch | Teaches | Extra parts |
|---|---|---|
| `BlinkWithoutDelay` | timing with `millis()` so the board can multitask | none (uses the on-board LED) |
| `SensorReading` | reading an analog sensor, `map()`, the Serial Monitor and Plotter | potentiometer, LED, 220 Ω resistor |
| `MotorControl` | driving a hobby servo with the `Servo` library | SG90 servo |
| `finished-example/SensorToServo` | all three at once, with no `delay()` | potentiometer, SG90 servo |

Every sketch lists its parts and wiring at the top of the file.

## Setup (once per computer)

1. Install the **Arduino IDE** (free, from the class downloads page). On a Chromebook,
   use the browser-based **Arduino Cloud Editor** instead.
2. **Unzip this pack first.** The IDE cannot open sketches inside a ZIP.
3. Plug in the board with a USB cable that carries data (some cables only charge).
4. In the IDE: **Tools > Board** → *Arduino Uno* (or your board), and
   **Tools > Port** → the port that appeared when you plugged it in.

## Your first 5-minute success

1. **File > Open** → `BlinkWithoutDelay/BlinkWithoutDelay.ino`.
2. Click **Upload** (the → arrow). Wait for *Done uploading*.
3. The small LED on the board blinks once a second.
4. Change `interval` to `250`, upload again, and watch it speed up.

## Why each sketch is inside its own folder

The Arduino IDE requires a sketch to sit in a folder with **exactly the same name**:
`SensorReading/SensorReading.ino`. If you rename one, rename the other too, or the
IDE will offer to move the file for you.

## Suggested route

1. `BlinkWithoutDelay`: understand `millis()` and the "now − then ≥ interval" check.
2. `SensorReading`: wire the potentiometer and open **Tools > Serial Plotter** to
   watch the value change as you turn it.
3. `MotorControl`: wire the servo, upload, and notice the board can do nothing else
   while `delay()` runs.
4. Try the challenges in `challenges.md`.
5. Then compare with `finished-example/SensorToServo`.

## Safety

- Change wiring with the USB cable **unplugged**.
- Always put a resistor (220 Ω is fine) in series with an LED.
- Never connect 5V directly to GND. If the board gets hot or the USB disconnects,
  unplug it and check the wiring.

## Make it a real project

The Breadboard Basics design challenge turns the SensorReading circuit into a documented prototype that another student can rebuild: a schematic, a labelled photo, predicted and measured voltages, and one fault you found and fixed. The section after it, "Where Breadboarding Leads", covers moving a working circuit onto perfboard or a custom PCB so it lasts.

**Lesson:** [Sensor-to-Output Prototype](https://mrscandrett.github.io/lessons/engineering/arduino-and-electronics/breadboard-basics.html#design-challenge)
