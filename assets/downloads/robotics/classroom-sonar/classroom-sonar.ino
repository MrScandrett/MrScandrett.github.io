// ClassroomOS stationary sonar scanner: UNO R3 (5 V logic), HC-SR04, positional servo.
// Not for a robot-car shield: check its pin assignments separately.
// HC-SR04 VCC -> UNO 5V; GND -> UNO GND; TRIG -> D7; ECHO -> D8.
// Servo signal -> D9; servo power -> regulated external 5V supply.
// Join supply ground, servo ground and UNO GND; do not join positive supply to UNO 5V.
#include <Servo.h>
Servo scanner;
const byte TRIG = 7, ECHO = 8, SERVO = 9;
const bool USE_SERVO = true; // false: rotate sensor manually to each printed angle
const bool REVERSE_ANGLE = false; // true if 30 degrees points left instead of right

float measureCm() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  unsigned long us = pulseIn(ECHO, HIGH, 25000UL);
  float cm = us * 0.0343f / 2.0f; // round trip; approximate room-temperature sound speed
  return (us == 0 || cm < 2 || cm > 200) ? -1 : cm;
}
void setup() {
  Serial.begin(9600);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  if (USE_SERVO) {
    scanner.attach(SERVO);
    scanner.write(90); // attach horn/sensor facing forward with power disconnected afterward
    delay(1000);
  }
  Serial.println("angle_deg,distance_cm");
}
void loop() {
  if (!Serial.available()) return;
  char command = Serial.read();
  if (command != 's' && command != 'S') return;
  for (int angle = 30; angle <= 150; angle += 15) {
    if (USE_SERVO) {
      scanner.write(REVERSE_ANGLE ? 180 - angle : angle);
      delay(450);
    } else {
      Serial.print("# Point sensor to "); Serial.print(angle);
      Serial.println(" degrees; send n when ready.");
      while (true) {
        if (Serial.available()) {
          char next = Serial.read();
          if (next == 'n' || next == 'N') break;
        }
      }
    }
    float readings[3];
    for (byte i = 0; i < 3; i++) { readings[i] = measureCm(); delay(65); }
    // A timeout stays unknown. Require all three valid before taking their median.
    float distance = -1;
    if (readings[0] > 0 && readings[1] > 0 && readings[2] > 0) {
      for (byte i = 0; i < 2; i++) for (byte j = i + 1; j < 3; j++) {
        if (readings[j] < readings[i]) { float t = readings[i]; readings[i] = readings[j]; readings[j] = t; }
      }
      distance = readings[1];
    }
    Serial.print(angle); Serial.print(',');
    if (distance < 0) Serial.println("NA"); else Serial.println(distance, 1);
  }
  if (USE_SERVO) scanner.write(90);
  Serial.println("# Scan finished. Send s for another scan.");
}
