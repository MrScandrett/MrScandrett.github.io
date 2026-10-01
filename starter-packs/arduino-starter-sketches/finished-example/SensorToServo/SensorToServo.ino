/*
  FINISHED EXAMPLE: SENSOR TO SERVO (no delay)
  Combines all three starter sketches:
    - SensorReading:     a potentiometer on A0 sets a target angle,
    - MotorControl:      a servo on pin 9 moves toward that angle,
    - BlinkWithoutDelay: the built-in LED blinks faster as the angle grows.
  Everything is timed with millis(), so the sensor, servo, and LED all update
  independently. Try the challenges before reading this.

  PARTS:   Arduino Uno, 10k potentiometer, SG90 servo, jumper wires, breadboard.
  WIRING:  Potentiometer: outer legs to 5V and GND, middle leg to A0.
           Servo: brown/black -> GND, red -> 5V, orange/yellow -> pin 9.
  VIEW IT: Serial Monitor or Serial Plotter at 9600 baud.
*/

#include <Servo.h>

const int sensorPin = A0;
const int servoPin = 9;
const int ledPin = LED_BUILTIN;

const unsigned long servoStepMs = 10;   // move one degree at most every 10 ms
const unsigned long printEveryMs = 100; // print 10 times a second

Servo servo;
int currentAngle = 90;
int targetAngle = 90;
int ledState = LOW;

unsigned long lastServoStep = 0;
unsigned long lastBlink = 0;
unsigned long lastPrint = 0;

void setup() {
  Serial.begin(9600);
  pinMode(ledPin, OUTPUT);
  servo.attach(servoPin);
  servo.write(currentAngle);
}

void loop() {
  unsigned long now = millis();

  // 1. SENSE: read the potentiometer every loop. It is fast and has no timer.
  targetAngle = map(analogRead(sensorPin), 0, 1023, 0, 180);

  // 2. ACT: step the servo one degree toward the target, but only every servoStepMs.
  //    WHY step instead of jumping: smooth motion, and less sudden current draw.
  if (now - lastServoStep >= servoStepMs && currentAngle != targetAngle) {
    lastServoStep = now;
    currentAngle += (targetAngle > currentAngle) ? 1 : -1;
    servo.write(currentAngle);
  }

  // 3. SIGNAL: blink faster as the angle grows (500 ms at 0 deg, 60 ms at 180 deg).
  unsigned long blinkMs = map(currentAngle, 0, 180, 500, 60);
  if (now - lastBlink >= blinkMs) {
    lastBlink = now;
    ledState = (ledState == LOW) ? HIGH : LOW;
    digitalWrite(ledPin, ledState);
  }

  // 4. REPORT: print for the Serial Plotter without slowing the loop down.
  if (now - lastPrint >= printEveryMs) {
    lastPrint = now;
    Serial.print("target:");
    Serial.print(targetAngle);
    Serial.print("\tangle:");
    Serial.println(currentAngle);
  }
}
