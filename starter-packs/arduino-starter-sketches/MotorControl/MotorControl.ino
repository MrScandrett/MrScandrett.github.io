/*
  SERVO SWEEP
  Sweeps a hobby servo from 0 to 180 degrees and back.

  PARTS:   Arduino Uno, a small hobby servo (SG90 or similar), jumper wires.
  WIRING:  Servo brown/black wire -> GND
           Servo red wire         -> 5V
           Servo orange/yellow    -> pin 9
  POWER:   One SG90 can run from the Uno's 5V pin. For bigger servos or more than
           one, use a separate 5V supply and connect its GND to the Arduino GND.
           A servo that jitters or resets the board usually needs more power.

  NOTE:    This sketch uses delay(), so the board can do nothing else while the
           servo moves. finished-example/SensorToServo shows the millis() way.

  Comment key: WHAT = the job · WHY = the reason · TRY THIS = a safe experiment
*/

#include <Servo.h>          // WHAT: the Servo library ships with the Arduino IDE

Servo myServo;              // WHAT: an object that represents one servo
const int servoPin = 9;
const int stepDelay = 15;   // ms per degree. TRY THIS: 5 for fast, 30 for slow

void setup() {
  myServo.attach(servoPin); // WHY: tells the library which pin sends the control pulses
}

void loop() {
  for (int angle = 0; angle <= 180; angle++) {
    myServo.write(angle);   // WHAT: move to this angle (0-180 degrees)
    delay(stepDelay);       // WHY: give the servo time to reach it
  }
  for (int angle = 180; angle >= 0; angle--) {
    myServo.write(angle);
    delay(stepDelay);
  }
  // TRY THIS: sweep only 45-135 for a gentler motion.
}
