/*
  BLINK WITHOUT DELAY
  Blinks an LED using millis() instead of delay(), so loop() never stops and
  other code (sensors, buttons, motors) can keep running at the same time.

  PARTS:   Arduino Uno (or compatible) + USB cable. Nothing else:
           LED_BUILTIN is the small LED already on the board (pin 13 on an Uno).
  OPTIONAL: an external LED on pin 13 -> 220 ohm resistor -> GND
           (long leg of the LED toward pin 13).

  Comment key: WHAT = the job · WHY = the reason · TRY THIS = a safe experiment
*/

const int ledPin = LED_BUILTIN;      // WHAT: the pin the LED is on
const unsigned long interval = 1000; // TRY THIS: 250 for fast blinking

int ledState = LOW;                  // WHAT: remembers whether the LED is on or off
unsigned long previousMillis = 0;    // WHAT: the time of the last change

void setup() {
  pinMode(ledPin, OUTPUT);           // WHY: pins start as inputs; an LED needs an output
}

void loop() {
  // WHAT: millis() is the number of milliseconds since the board started.
  unsigned long currentMillis = millis();

  // WHY subtraction: "now - then >= interval" still works when millis() wraps
  // back to 0 after about 49 days. Comparing "now >= then + interval" does not.
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    ledState = (ledState == LOW) ? HIGH : LOW; // flip it
    digitalWrite(ledPin, ledState);
  }

  // TRY THIS: anything you add here keeps running while the LED blinks.
  // With delay(1000) above instead, this spot would only run once a second.
}
