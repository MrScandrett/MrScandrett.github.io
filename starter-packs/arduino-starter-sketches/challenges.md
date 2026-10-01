# Arduino challenges

Change one thing, upload, and check it works before starting the next.

## Level 1: Tinkerer

- Make `BlinkWithoutDelay` blink a pattern: short, short, long.
- In `SensorReading`, swap the potentiometer for a photoresistor and find the
  readings for "covered" and "bright".
- In `MotorControl`, sweep only between 45° and 135°.
- Open the Serial Plotter and take a screenshot of an interesting reading.

## Level 2: Combiner

- Blink two LEDs at different rates with no `delay()` at all.
- Make an LED turn on only when the light level drops below a threshold (a night light).
- Control the servo angle with the potentiometer (`map()` from 0-1023 to 0-180).
- Add a pushbutton (pin 2 to GND, `pinMode(2, INPUT_PULLUP)`) that starts and stops the sweep.

## Level 3: Builder

- Rewrite `MotorControl` with `millis()` so the board can blink an LED at the same time.
- Smooth noisy sensor readings with a running average of the last 10 values.
- Build a "light-seeking" pointer: two photoresistors, and the servo turns toward
  the brighter one.
- Design your own project, draw its wiring diagram, and log the build on your
  project page.

## Done means

- The sketch compiles and uploads with no errors.
- Someone else could rebuild your circuit from the comment at the top of the sketch.
- You can explain why `millis()` lets the board do more than one thing at a time.
