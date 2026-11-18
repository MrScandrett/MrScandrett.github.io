/* Grove IDE core: the boards, pin plans, preset sketches and sketch checks behind
   the Grove Beginner Kit IDE on the Sensor Modules lesson. No DOM: the editor UI
   is assets/js/lessons/grove-ide.mjs; tests are tests/grove-ide.test.mjs.

   The page can't compile C++, so it hands the sketch to Arduino's own tools:
   Arduino IDE 2 / Cloud Editor for the Lotus, UNO R3, UNO R4 WiFi and Nano
   Every, and Arduino App Lab for the UNO Q. launchSteps(board) says how.

   Pins: on the kit board every module is wired to a fixed pin (Seeed's Grove
   Beginner Kit wiki). On any other board the modules are broken out and plugged
   in with Grove cables, so the same pins are used wherever the board has them;
   only the light sensor moves (A6 → A1) on boards without an A6.

   Presets are templates: {{led}}, {{light}}… become the board's pins and
   {{board}} its name. Every pin lives in one constant (`const int LED_PIN = 4;`),
   so retarget() can move an edited sketch to another board without touching
   anything the student wrote. */

export const MODULES = {
  led: { name: 'LED', const: 'LED_PIN', kind: 'digital' },
  buzzer: { name: 'Buzzer', const: 'BUZZER_PIN', kind: 'digital' },
  button: { name: 'Button', const: 'BUTTON_PIN', kind: 'digital' },
  pot: { name: 'Rotary potentiometer', const: 'POT_PIN', kind: 'analog' },
  sound: { name: 'Sound sensor', const: 'SOUND_PIN', kind: 'analog' },
  light: { name: 'Light sensor', const: 'LIGHT_PIN', kind: 'analog' },
  dht: { name: 'Temperature & humidity (DHT11, older kits)', const: 'DHT_PIN', kind: 'digital' },
  oled: { name: '0.96″ OLED display', kind: 'i2c' },
  accel: { name: '3-axis accelerometer (LIS3DHTR)', kind: 'i2c' },
  dht20: { name: 'Temperature & humidity (DHT20, newer kits)', kind: 'i2c' },
  pressure: { name: 'Air pressure (BMP280, older kits)', kind: 'i2c' }
};

const KIT_PINS = { led: '4', buzzer: '5', button: '6', pot: 'A0', sound: 'A2', light: 'A6', dht: '3' };
const range = (n) => Array.from({ length: n }, (_, i) => 'A' + i);

export const BOARDS = {
  lotus: {
    name: 'Grove kit board (Seeeduino Lotus)', short: 'Kit board', art: null, tool: 'ide',
    menu: 'Arduino AVR Boards › Arduino Uno', core: 'Arduino AVR Boards', fqbn: 'arduino:avr:uno',
    logic: 5, analog: range(8), pwm: [3, 5, 6, 9, 10, 11], builtIn: true
  },
  'uno-r3': {
    name: 'Arduino UNO R3', short: 'UNO R3', art: 'uno-r3', tool: 'ide',
    menu: 'Arduino AVR Boards › Arduino Uno', core: 'Arduino AVR Boards', fqbn: 'arduino:avr:uno',
    logic: 5, analog: range(6), pwm: [3, 5, 6, 9, 10, 11]
  },
  'uno-r4-wifi': {
    name: 'Arduino UNO R4 WiFi', short: 'UNO R4 WiFi', art: 'uno-r4-wifi', tool: 'ide',
    menu: 'Arduino UNO R4 Boards › Arduino UNO R4 WiFi', core: 'Arduino UNO R4 Boards', fqbn: 'arduino:renesas_uno:unor4wifi',
    logic: 5, analog: range(6), pwm: [3, 5, 6, 9, 10, 11]
  },
  'nano-every': {
    name: 'Arduino Nano Every', short: 'Nano Every', art: 'nano-every', tool: 'ide',
    menu: 'Arduino megaAVR Boards › Arduino Nano Every', core: 'Arduino megaAVR Boards', fqbn: 'arduino:megaavr:nona4809',
    logic: 5, analog: range(8), pwm: [3, 5, 6, 9, 10]
  },
  'uno-q': {
    name: 'Arduino UNO Q', short: 'UNO Q', art: 'uno-q', tool: 'applab',
    menu: null, core: null, fqbn: 'arduino:zephyr:unoq',
    logic: 3.3, analog: range(6), pwm: [3, 5, 6, 9, 10, 11]
  }
};

export const BOARD_IDS = Object.keys(BOARDS);

/** The pin each module uses on a board: the kit's own pin when the board has it. */
export function pinsFor(boardId) {
  const b = BOARDS[boardId];
  if (!b) throw new Error('Unknown board: ' + boardId);
  const pins = { ...KIT_PINS };
  if (!b.analog.includes(pins.light)) pins.light = 'A1';
  return pins;
}

/** Rows for the "where does each module plug in" table. */
export function wiringFor(boardId) {
  const b = BOARDS[boardId], pins = pinsFor(boardId);
  return Object.entries(MODULES).map(([key, m]) => {
    const pin = pins[key];
    let where;
    if (m.kind === 'i2c') where = b.builtIn ? 'I2C (already wired)' : 'Any I2C port';
    else if (b.builtIn) where = (m.kind === 'analog' ? 'Analog ' : 'Digital ') + pin + ' (already wired)';
    else where = (m.kind === 'analog' ? 'Port ' : 'Port D') + pin;
    const moved = !b.builtIn && pin && pin !== KIT_PINS[key];
    return { key, name: m.name, pin: pin || 'I2C', where, moved };
  });
}

// ---- Libraries ----------------------------------------------------------

export const LIBRARIES = {
  'U8x8lib.h': { name: 'U8g2', how: 'Library Manager: search “U8g2” (by oliver)' },
  'U8g2lib.h': { name: 'U8g2', how: 'Library Manager: search “U8g2” (by oliver)' },
  'DHT.h': { name: 'Grove Temperature And Humidity Sensor', how: 'Seeed’s library: github.com/Seeed-Studio/Grove_Temperature_And_Humidity_Sensor (Sketch › Include Library › Add .ZIP Library)' },
  'Seeed_BMP280.h': { name: 'Grove BMP280', how: 'Library Manager: search “Grove BMP280”' },
  'LIS3DHTR.h': { name: 'Seeed Arduino LIS3DHTR', how: 'Seeed’s library: github.com/Seeed-Studio/Seeed_Arduino_LIS3DHTR (Sketch › Include Library › Add .ZIP Library)' }
};
const BUILT_IN_HEADERS = ['Arduino.h', 'Wire.h', 'SPI.h', 'Servo.h', 'EEPROM.h'];

// ---- Presets -----------------------------------------------------------

const P = (id, title, group, modules, blurb, code) => ({ id, title, group, modules, blurb, code: code.replace(/^\n/, '') });

export const PRESETS = [
  P('blink', 'Blink the LED', 'module', ['led'], 'The first sketch on any board: on, wait, off, wait.', `
// Blink: the Grove LED flashes once a second.
// Board: {{board}}
const int LED_PIN = {{led}};

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);   // on
  delay(500);
  digitalWrite(LED_PIN, LOW);    // off
  delay(500);
}
`),
  P('button', 'Button lights the LED', 'module', ['button', 'led'], 'An input controls an output. The Grove button reads HIGH while pressed.', `
// Button: hold the button and the LED lights.
// Board: {{board}}
const int BUTTON_PIN = {{button}};
const int LED_PIN = {{led}};

void setup() {
  pinMode(BUTTON_PIN, INPUT);    // the Grove button has its own resistor
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  int pressed = digitalRead(BUTTON_PIN);   // HIGH while pressed
  digitalWrite(LED_PIN, pressed);
}
`),
  P('knob', 'Knob sets the blink speed', 'module', ['pot', 'led'], 'An analog input (0–1023) mapped onto a delay.', `
// Knob: turn the potentiometer to change how fast the LED blinks.
// Board: {{board}}
const int POT_PIN = {{pot}};
const int LED_PIN = {{led}};

void setup() {
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int knob = analogRead(POT_PIN);             // 0 … 1023
  int wait = map(knob, 0, 1023, 50, 1000);    // 50 ms … 1 s
  Serial.print("knob ");
  Serial.print(knob);
  Serial.print("  wait ");
  Serial.println(wait);

  digitalWrite(LED_PIN, HIGH);
  delay(wait);
  digitalWrite(LED_PIN, LOW);
  delay(wait);
}
`),
  P('buzzer', 'Buzzer plays a scale', 'module', ['buzzer'], 'tone() makes a square wave at a frequency; the buzzer turns it into sound.', `
// Buzzer: play a C major scale, then rest.
// Board: {{board}}
const int BUZZER_PIN = {{buzzer}};

const int NOTES[] = { 262, 294, 330, 349, 392, 440, 494, 523 };   // C4 … C5 in hertz
const int NOTE_COUNT = 8;

void setup() {
  pinMode(BUZZER_PIN, OUTPUT);
}

void loop() {
  for (int i = 0; i < NOTE_COUNT; i++) {
    tone(BUZZER_PIN, NOTES[i], 200);
    delay(250);                 // the note, plus a short gap
  }
  noTone(BUZZER_PIN);
  delay(2000);
}
`),
  P('light', 'Light sensor readings', 'module', ['light'], 'Print raw readings and a bar graph. Open the Serial Monitor at 9600 baud.', `
// Light: print how bright it is. Brighter = higher number.
// Open the Serial Monitor (or Serial Plotter) at 9600 baud.
// Board: {{board}}
const int LIGHT_PIN = {{light}};

void setup() {
  Serial.begin(9600);
}

void loop() {
  int light = analogRead(LIGHT_PIN);     // 0 … 1023
  Serial.print(light);
  Serial.print("\\t");
  for (int i = 0; i < light / 32; i++) Serial.print('#');
  Serial.println();
  delay(200);
}
`),
  P('sound', 'Sound sensor loudness', 'module', ['sound'], 'A microphone wave goes up and down fast, so measure the biggest swing over 50 ms.', `
// Sound: how loud is the room? Measures the peak-to-peak swing over 50 ms.
// Open the Serial Plotter at 9600 baud and clap.
// Board: {{board}}
const int SOUND_PIN = {{sound}};

void setup() {
  Serial.begin(9600);
}

void loop() {
  int lowest = 1023, highest = 0;
  unsigned long start = millis();
  while (millis() - start < 50) {
    int sample = analogRead(SOUND_PIN);
    if (sample < lowest) lowest = sample;
    if (sample > highest) highest = sample;
  }
  Serial.println(highest - lowest);    // bigger swing = louder
}
`),
  P('oled', 'Hello on the OLED', 'module', ['oled'], 'Text on the 128×64 screen with the U8x8 text-only driver.', `
// OLED: write text on the kit's 0.96" screen.
// Needs the U8g2 library.
// Board: {{board}}
#include <U8x8lib.h>

U8X8_SSD1306_128X64_NONAME_HW_I2C u8x8(U8X8_PIN_NONE);

void setup() {
  u8x8.begin();
  u8x8.setFlipMode(1);   // the kit's screen is mounted upside down; use 0 if your text is
  u8x8.setFont(u8x8_font_chroma48medium8_r);
  u8x8.drawString(0, 0, "Hello, Grove!");
}

void loop() {
  u8x8.setCursor(0, 3);
  u8x8.print("Up for ");
  u8x8.print(millis() / 1000);
  u8x8.print(" s  ");
  delay(250);
}
`),
  P('dht20', 'Temperature & humidity (black DHT20)', 'module', ['dht20'], 'Kits made after October 2025: the black sensor talks over I2C.', `
// Temperature & humidity, black DHT20 sensor (kits made after October 2025).
// Needs Seeed's Grove Temperature And Humidity Sensor library.
// Board: {{board}}
#include <Wire.h>
#include "DHT.h"

DHT dht(DHT20);

void setup() {
  Serial.begin(9600);
  Wire.begin();
  dht.begin();
}

void loop() {
  float reading[2] = { 0, 0 };            // [0] humidity %, [1] temperature °C
  if (dht.readTempAndHumidity(reading) == 0) {
    Serial.print("Humidity: ");
    Serial.print(reading[0]);
    Serial.print(" %   Temperature: ");
    Serial.print(reading[1]);
    Serial.println(" C");
  } else {
    Serial.println("The sensor didn't answer. Check the cable.");
  }
  delay(1500);
}
`),
  P('dht11', 'Temperature & humidity (DHT11, older kits)', 'module', ['dht'], 'Kits made before October 2025: the DHT11 sends its reading on one digital pin.', `
// Temperature & humidity, DHT11 sensor (kits made before October 2025).
// Needs Seeed's Grove Temperature And Humidity Sensor library.
// Board: {{board}}
#include "DHT.h"

const int DHT_PIN = {{dht}};
DHT dht(DHT_PIN, DHT11);

void setup() {
  Serial.begin(9600);
  dht.begin();
}

void loop() {
  float reading[2] = { 0, 0 };            // [0] humidity %, [1] temperature °C
  if (dht.readTempAndHumidity(reading) == 0) {
    Serial.print("Humidity: ");
    Serial.print(reading[0]);
    Serial.print(" %   Temperature: ");
    Serial.print(reading[1]);
    Serial.println(" C");
  } else {
    Serial.println("The sensor didn't answer. Check the cable.");
  }
  delay(2000);                            // the DHT11 needs about a second between readings
}
`),
  P('accel', 'Accelerometer: which way is down?', 'module', ['accel'], 'Three numbers in g. Lying flat, z is about 1 and x, y are about 0.', `
// Accelerometer: print acceleration on x, y and z in g.
// Lying flat on the table, z reads about 1.0 (that's gravity).
// Needs Seeed's LIS3DHTR library.
// Board: {{board}}
#include <Wire.h>
#include "LIS3DHTR.h"

LIS3DHTR<TwoWire> accel;

void setup() {
  Serial.begin(9600);
  accel.begin(Wire, 0x19);
  delay(100);
  accel.setOutputDataRate(LIS3DHTR_DATARATE_50HZ);
}

void loop() {
  Serial.print("x ");
  Serial.print(accel.getAccelerationX());
  Serial.print("  y ");
  Serial.print(accel.getAccelerationY());
  Serial.print("  z ");
  Serial.println(accel.getAccelerationZ());
  delay(200);
}
`),
  P('pressure', 'Air pressure (BMP280, older kits)', 'module', ['pressure'], 'Kits made before October 2025. Newer kits have an SPA06-003: use Seeed’s example for it.', `
// Air pressure, BMP280 sensor (kits made before October 2025).
// Needs the Grove BMP280 library.
// Board: {{board}}
#include <Wire.h>
#include "Seeed_BMP280.h"

BMP280 bmp280;

void setup() {
  Serial.begin(9600);
  if (!bmp280.init()) Serial.println("The pressure sensor didn't answer.");
}

void loop() {
  float pressure = bmp280.getPressure();     // pascals
  Serial.print("Temperature: ");
  Serial.print(bmp280.getTemperature());
  Serial.print(" C   Pressure: ");
  Serial.print(pressure);
  Serial.print(" Pa   Altitude: ");
  Serial.print(bmp280.calcAltitude(pressure));
  Serial.println(" m");
  delay(1000);
}
`),
  P('night-light', 'Night Light (with hysteresis)', 'project', ['light', 'led'], 'Two thresholds, so the LED doesn’t flicker at dusk.', `
// Night Light: the LED turns on when it gets dark.
// Two thresholds (hysteresis) stop it flickering when the light hovers near one.
// Board: {{board}}
const int LIGHT_PIN = {{light}};
const int LED_PIN = {{led}};

const int DARK = 250;      // below this, turn on
const int BRIGHT = 350;    // above this, turn off
bool lampOn = false;

void setup() {
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int light = analogRead(LIGHT_PIN);
  if (!lampOn && light < DARK) lampOn = true;
  if (lampOn && light > BRIGHT) lampOn = false;
  digitalWrite(LED_PIN, lampOn ? HIGH : LOW);

  Serial.print("light ");
  Serial.print(light);
  Serial.println(lampOn ? "  lamp ON" : "  lamp off");
  delay(100);
}
`),
  P('clap-counter', 'Clap Counter', 'project', ['sound', 'oled'], 'Learn the room’s background noise, then count spikes above it.', `
// Clap Counter: counts loud spikes above the room's background noise.
// Needs the U8g2 library for the screen.
// Board: {{board}}
#include <U8x8lib.h>

const int SOUND_PIN = {{sound}};
const int MARGIN = 120;            // how far above the background counts as a clap
const unsigned long GAP = 300;     // ms to ignore after a clap (echoes)

U8X8_SSD1306_128X64_NONAME_HW_I2C u8x8(U8X8_PIN_NONE);
float background = 0;
int claps = 0;
unsigned long lastClap = 0;

int loudness() {
  int lowest = 1023, highest = 0;
  unsigned long start = millis();
  while (millis() - start < 20) {
    int s = analogRead(SOUND_PIN);
    if (s < lowest) lowest = s;
    if (s > highest) highest = s;
  }
  return highest - lowest;
}

void show() {
  u8x8.clearLine(3);
  u8x8.setCursor(0, 3);
  u8x8.print("Claps: ");
  u8x8.print(claps);
}

void setup() {
  u8x8.begin();
  u8x8.setFlipMode(1);   // the kit's screen is mounted upside down; use 0 if your text is
  u8x8.setFont(u8x8_font_chroma48medium8_r);
  u8x8.drawString(0, 0, "Clap Counter");
  for (int i = 0; i < 25; i++) background += loudness() / 25.0;   // half a second of quiet
  show();
}

void loop() {
  int level = loudness();
  if (level > background + MARGIN && millis() - lastClap > GAP) {
    claps++;
    lastClap = millis();
    show();
  } else if (level < background + MARGIN) {
    background = background * 0.98 + level * 0.02;   // follow slow changes in the room
  }
}
`),
  P('tilt-alarm', 'Tilt Alarm', 'project', ['accel', 'buzzer', 'button'], 'Tip the board and it beeps until you press the button.', `
// Tilt Alarm: tip the board and the buzzer beeps until you press the button.
// Needs Seeed's LIS3DHTR library.
// Board: {{board}}
#include <Wire.h>
#include "LIS3DHTR.h"

const int BUZZER_PIN = {{buzzer}};
const int BUTTON_PIN = {{button}};
const float TILT = 0.5;            // g on x or y that counts as tipped (about 30 degrees)

LIS3DHTR<TwoWire> accel;
bool alarm = false;

void setup() {
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT);
  Serial.begin(9600);
  accel.begin(Wire, 0x19);
  delay(100);
  accel.setOutputDataRate(LIS3DHTR_DATARATE_50HZ);
}

void loop() {
  float x = accel.getAccelerationX();
  float y = accel.getAccelerationY();
  if (abs(x) > TILT || abs(y) > TILT) alarm = true;
  if (digitalRead(BUTTON_PIN) == HIGH) alarm = false;

  if (alarm) {
    tone(BUZZER_PIN, 880, 100);
    delay(200);
  } else {
    noTone(BUZZER_PIN);
    delay(20);
  }
}
`),
  P('weather-station', 'Classroom Weather Station', 'project', ['dht20', 'oled', 'pot'], 'Temperature and humidity on the OLED; the knob picks the screen. Uses the black DHT20.', `
// Classroom Weather Station: temperature and humidity on the screen.
// Turn the knob to switch between the two pages.
// Uses the black DHT20 (kits made after October 2025). For a DHT11, see that preset.
// Needs the U8g2 and Grove Temperature And Humidity Sensor libraries.
// Board: {{board}}
#include <Wire.h>
#include <U8x8lib.h>
#include "DHT.h"

const int POT_PIN = {{pot}};

U8X8_SSD1306_128X64_NONAME_HW_I2C u8x8(U8X8_PIN_NONE);
DHT dht(DHT20);
int lastPage = -1;

void setup() {
  Wire.begin();
  dht.begin();
  u8x8.begin();
  u8x8.setFlipMode(1);   // the kit's screen is mounted upside down; use 0 if your text is
  u8x8.setFont(u8x8_font_chroma48medium8_r);
}

void loop() {
  int page = analogRead(POT_PIN) < 512 ? 0 : 1;
  float reading[2] = { 0, 0 };            // [0] humidity %, [1] temperature °C
  bool ok = dht.readTempAndHumidity(reading) == 0;

  if (page != lastPage) {
    u8x8.clear();
    u8x8.drawString(0, 0, page == 0 ? "Temperature" : "Humidity");
    lastPage = page;
  }
  u8x8.clearLine(3);
  u8x8.setCursor(0, 3);
  if (!ok) u8x8.print("no reading");
  else if (page == 0) { u8x8.print(reading[1], 1); u8x8.print(" C"); }
  else { u8x8.print(reading[0], 1); u8x8.print(" %"); }
  delay(1000);
}
`)
];

export function presetById(id) { return PRESETS.find((p) => p.id === id) || null; }

/** A preset's sketch with the board's pins and name filled in. */
export function renderPreset(preset, boardId) {
  const pins = pinsFor(boardId);
  const fill = { ...pins, board: BOARDS[boardId].name };
  return preset.code.replace(/\{\{(\w+)\}\}/g, (m, k) => {
    if (!(k in fill)) throw new Error('Preset ' + preset.id + ' uses unknown pin {{' + k + '}}');
    return fill[k];
  });
}

/** Move a sketch (edited or not) to another board: rewrite the pin constants
    that hold a kit pin, and the "// Board:" line. Everything else is left alone. */
export function retarget(code, fromBoard, toBoard) {
  const from = pinsFor(fromBoard), to = pinsFor(toBoard);
  let out = code;
  const changed = [];
  for (const [key, m] of Object.entries(MODULES)) {
    if (!m.const || from[key] === to[key]) continue;
    const re = new RegExp('(const\\s+(?:int|byte|uint8_t)\\s+' + m.const + '\\s*=\\s*)' + from[key] + '(\\s*;)', 'g');
    out = out.replace(re, (all, a, b) => { changed.push(m.const + ': ' + from[key] + ' → ' + to[key]); return a + to[key] + b; });
  }
  out = out.replace(/^(\/\/\s*Board:\s*).*$/m, '$1' + BOARDS[toBoard].name);
  return { code: out, changed };
}

// ---- Checking ----------------------------------------------------------

/** Remove comments and string/char literals, keeping line breaks so positions still count lines. */
export function stripCode(code) {
  let out = '', i = 0;
  while (i < code.length) {
    const c = code[i], n = code[i + 1];
    if (c === '/' && n === '/') { while (i < code.length && code[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') {
      i += 2;
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) { if (code[i] === '\n') out += '\n'; i++; }
      i += 2; continue;
    }
    if (c === '"' || c === "'") {
      const q = c; out += q + q; i++;
      while (i < code.length && code[i] !== q && code[i] !== '\n') { if (code[i] === '\\') i++; i++; }
      i++; continue;
    }
    out += c; i++;
  }
  return out;
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

/** Problems Arduino would complain about (errors) or that would quietly misbehave
    on this board (warnings), plus the libraries the sketch needs. Not a compiler:
    it catches the mistakes students make most with this kit. */
export function checkSketch(code, boardId) {
  const b = BOARDS[boardId];
  const errors = [], warnings = [], libraries = [], unknown = [];
  const bare = stripCode(code);

  if (!/\bvoid\s+setup\s*\(\s*(void)?\s*\)/.test(bare)) errors.push({ line: 0, text: 'There is no void setup(). Every sketch needs one, even if it is empty.' });
  if (!/\bvoid\s+loop\s*\(\s*(void)?\s*\)/.test(bare)) errors.push({ line: 0, text: 'There is no void loop(). Every sketch needs one, even if it is empty.' });

  const pairs = { '(': ')', '{': '}', '[': ']' };
  const stack = [];
  for (let i = 0; i < bare.length; i++) {
    const c = bare[i];
    if (pairs[c]) stack.push({ c, i });
    else if (c === ')' || c === '}' || c === ']') {
      const top = stack.pop();
      if (!top) { errors.push({ line: lineOf(bare, i), text: 'An extra “' + c + '” with nothing to close.' }); break; }
      if (pairs[top.c] !== c) { errors.push({ line: lineOf(bare, i), text: '“' + c + '” closes the “' + top.c + '” opened on line ' + lineOf(bare, top.i) + '.' }); break; }
    }
  }
  if (stack.length && !errors.some((e) => /closes|extra/.test(e.text))) {
    const top = stack[stack.length - 1];
    errors.push({ line: lineOf(bare, top.i), text: 'The “' + top.c + '” on line ' + lineOf(bare, top.i) + ' is never closed.' });
  }

  // Analog pins that this board doesn't have.
  const seen = new Set();
  for (const m of bare.matchAll(/\bA(\d{1,2})\b/g)) {
    const pin = 'A' + m[1];
    if (b.analog.includes(pin) || seen.has(pin)) continue;
    seen.add(pin);
    const fix = pin === 'A6' || pin === 'A7' ? ' Use A1 and plug the module into the A1 port.' : '';
    errors.push({ line: lineOf(bare, m.index), text: 'The ' + b.short + ' has no ' + pin + ' (it has ' + b.analog[0] + '–' + b.analog[b.analog.length - 1] + ').' + fix });
  }

  // analogWrite on a pin that can't do PWM: it just switches fully on or off.
  const consts = {};
  for (const m of bare.matchAll(/\b(?:const\s+)?(?:int|byte|uint8_t)\s+([A-Za-z_]\w*)\s*=\s*(A?\d+)\s*;/g)) consts[m[1]] = m[2];
  for (const m of bare.matchAll(/\banalogWrite\s*\(\s*([A-Za-z_]\w*|\d+)\s*,/g)) {
    const pin = /^\d+$/.test(m[1]) ? m[1] : consts[m[1]];
    if (pin && /^\d+$/.test(pin) && !b.pwm.includes(Number(pin))) {
      warnings.push({ line: lineOf(bare, m.index), text: 'Pin ' + pin + ' can’t dim (no ~ PWM on the ' + b.short + '): analogWrite will only switch it on or off. PWM pins: ' + b.pwm.join(', ') + '.' });
    }
  }

  if (/\bSerial\.(print|println|write)\b/.test(bare) && !/\bSerial\.begin\s*\(/.test(bare)) {
    warnings.push({ line: lineOf(bare, bare.search(/\bSerial\.(print|println|write)\b/)), text: 'The sketch prints to Serial but never calls Serial.begin(9600) in setup, so nothing will show.' });
  }
  if (/\bDHT\s+\w+\s*\(\s*DHT20\s*\)/.test(bare) && !/\bWire\.begin\s*\(/.test(bare)) {
    warnings.push({ line: lineOf(bare, bare.search(/\bDHT\s+\w+\s*\(\s*DHT20/)), text: 'The DHT20 is an I2C sensor: call Wire.begin() in setup before dht.begin().' });
  }

  for (const m of code.matchAll(/^\s*#\s*include\s*[<"]([^>"]+)[>"]/gm)) {
    const h = m[1].trim();
    if (LIBRARIES[h]) { if (!libraries.some((l) => l.name === LIBRARIES[h].name)) libraries.push({ header: h, ...LIBRARIES[h] }); }
    else if (!BUILT_IN_HEADERS.includes(h)) unknown.push(h);
  }
  for (const h of unknown) warnings.push({ line: 0, text: '#include “' + h + '” isn’t a library this page knows. Make sure it is installed before you upload.' });
  if (boardId === 'uno-q' && libraries.length) {
    warnings.push({ line: 0, text: 'The UNO Q builds sketches with a different core than the UNO R3. Libraries written for AVR boards may not build there yet; if App Lab can’t build it, start from a preset that needs no library.' });
  }
  return { ok: errors.length === 0, errors, warnings, libraries };
}

// ---- Getting it onto the board ------------------------------------------

/** Steps to put the sketch on the chosen board with Arduino's own tools. */
export function launchSteps(boardId, sketchName, libraries = []) {
  const b = BOARDS[boardId];
  const libs = libraries.length
    ? ['Install the libraries this sketch needs (once per computer): ' + libraries.map((l) => l.name + ' — ' + l.how).join('; ') + '.']
    : [];
  if (b.tool === 'applab') {
    return [
      'Connect the UNO Q with a USB-C cable and open Arduino App Lab on the computer (or on the UNO Q itself with a screen and keyboard).',
      'Create a new app and open its sketch file (sketch.ino).',
      'Replace everything in it with this sketch: press Copy here, then paste.',
      ...(libs.length ? ['Add the libraries this sketch needs from App Lab’s library list: ' + libraries.map((l) => l.name).join(', ') + '.'] : []),
      'Press Run. App Lab builds the sketch and loads it onto the UNO Q’s microcontroller.',
      'Grove modules: break them off the kit board and plug them in with Grove cables (a Grove Base Shield makes this easy). Set the shield’s power switch to 3.3 V: the UNO Q’s pins are 3.3 V.'
    ];
  }
  const wiring = b.builtIn
    ? ['Plug the kit board into the computer with its USB cable. All ten modules are already wired.']
    : ['Break the modules off the kit board and plug each one into ' + b.short + ' with a Grove cable, using the ports in the table (a Grove shield or Grove-to-jumper cables both work).',
       'Connect the ' + b.short + ' to the computer with its USB cable.'];
  return [
    ...wiring,
    'Press Download .ino and open the file in Arduino IDE 2. When it asks to put “' + sketchName + '.ino” in a folder of the same name, say OK. (Or press Copy and paste it into a new sketch, here or in the Arduino Cloud Editor.)',
    ...(b.core ? ['First time with this board? Tools › Board › Boards Manager: install “' + b.core + '”.'] : []),
    'Tools › Board: choose ' + b.menu + (b.builtIn ? ' (the kit board is Uno-compatible).' : '.'),
    'Tools › Port: choose the port that appeared when you plugged the board in.',
    ...libs,
    'Press Upload (→). When it says “Done uploading”, open Tools › Serial Monitor at 9600 baud for any sketch that prints.'
  ];
}

/** A file name Arduino accepts: letters, digits, dashes and underscores. */
export function sketchFileName(title) {
  const base = String(title || 'sketch').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'sketch';
  return /^[a-z]/.test(base) ? base : 'grove_' + base;
}

// ---- Students' own presets -----------------------------------------------

export const IMPORT_LIMITS = { bytes: 64 * 1024, presets: 50, title: 80 };
export const PACK_FORMAT = 'grove-ide-presets';

/** Read a dropped file: an .ino/.cpp/.h/.txt sketch, or a preset pack (.json)
    written by exportPack(). Returns { presets: [{ title, code, board? }] } or throws
    with a message a student can act on. */
export function parseImport(fileName, text) {
  const name = String(fileName || '');
  if (typeof text !== 'string') throw new Error('That file couldn’t be read as text.');
  if (text.length > IMPORT_LIMITS.bytes * 4) throw new Error('That file is too big to be a sketch.');
  if (text.includes('\u0000')) throw new Error('That isn’t a text file. Choose an .ino sketch or a preset pack (.json).');
  const ext = (name.match(/\.([a-z0-9]+)$/i) || [, ''])[1].toLowerCase();
  const title = (s) => String(s).replace(/\s+/g, ' ').trim().slice(0, IMPORT_LIMITS.title);
  const sized = (code) => {
    if (new TextEncoder().encode(code).length > IMPORT_LIMITS.bytes) throw new Error('That sketch is over 64 KB. Is it really an Arduino sketch?');
    return code.replace(/\r\n?/g, '\n');
  };
  if (ext === 'json') {
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('That .json file isn’t valid JSON.'); }
    if (!data || data.format !== PACK_FORMAT || !Array.isArray(data.presets)) throw new Error('That .json file isn’t a Grove IDE preset pack.');
    if (!data.presets.length) throw new Error('That preset pack is empty.');
    if (data.presets.length > IMPORT_LIMITS.presets) throw new Error('A preset pack can hold at most ' + IMPORT_LIMITS.presets + ' sketches.');
    return {
      presets: data.presets.map((p, i) => {
        if (!p || typeof p.code !== 'string' || !p.code.trim()) throw new Error('Sketch ' + (i + 1) + ' in the pack has no code.');
        return { title: title(p.title || 'Sketch ' + (i + 1)) || 'Sketch ' + (i + 1), code: sized(p.code), board: BOARDS[p.board] ? p.board : undefined };
      })
    };
  }
  if (!['ino', 'pde', 'cpp', 'c', 'h', 'txt'].includes(ext)) throw new Error('Choose an Arduino sketch (.ino) or a preset pack (.json).');
  if (!text.trim()) throw new Error('That file is empty.');
  return { presets: [{ title: title(name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')) || 'My sketch', code: sized(text) }] };
}

/** A preset pack another student (or the teacher) can import. */
export function exportPack(presets) {
  return JSON.stringify({
    format: PACK_FORMAT, version: 1,
    presets: presets.map((p) => ({ title: p.title, board: p.board, code: p.code }))
  }, null, 2) + '\n';
}
