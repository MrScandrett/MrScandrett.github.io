/*
  SENSOR READING
  Reads an analog sensor, scales the value to 0-255, prints both numbers to the
  Serial Monitor, and sets an LED's brightness to match.

  PARTS:   Arduino Uno, a 10k potentiometer (or a photoresistor + 10k resistor),
           an LED, a 220 ohm resistor, jumper wires, breadboard.
  WIRING:  Potentiometer: outer legs to 5V and GND, middle leg (wiper) to A0.
           Photoresistor instead: 5V -> photoresistor -> A0 -> 10k resistor -> GND.
           LED: pin 6 -> 220 ohm resistor -> LED long leg; LED short leg -> GND.
  VIEW IT: Tools > Serial Monitor, set to 9600 baud. Or Tools > Serial Plotter
           to see the values as a live graph.

  Comment key: WHAT = the job · WHY = the reason · TRY THIS = a safe experiment
*/

const int sensorPin = A0;  // WHAT: analog input pin
const int ledPin = 6;      // WHY pin 6: it supports PWM (marked ~ on the board)

int rawValue = 0;          // 0-1023 on an Uno (10-bit analog-to-digital converter)
int mappedValue = 0;       // 0-255, the range analogWrite() accepts

void setup() {
  Serial.begin(9600);      // WHY: must match the baud rate in the Serial Monitor
  pinMode(ledPin, OUTPUT);
}

void loop() {
  rawValue = analogRead(sensorPin);

  // WHAT: map() converts one range to another, like converting a test score to a percent.
  mappedValue = map(rawValue, 0, 1023, 0, 255);
  analogWrite(ledPin, mappedValue); // brighter LED = higher reading

  // WHY the labels: the Serial Plotter uses "name:value" pairs to draw a legend.
  Serial.print("raw:");
  Serial.print(rawValue);
  Serial.print("\tmapped:");
  Serial.println(mappedValue);

  // WHY: a short pause keeps the Serial Monitor readable.
  // TRY THIS: remove it and watch how fast the numbers scroll.
  delay(50);
}
