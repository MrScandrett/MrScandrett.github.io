(function () {
  'use strict';
  var terms = {
    pcb: ['BOARD STRUCTURE', 'PCB — printed circuit board', 'Fiberglass holds the parts while thin copper tracks connect them. Colored solder mask protects the copper; exposed pads make electrical contact.', 'Follow a signal from a header pin to a chip. Real boards have several layers and many more tracks than this learning map.', 'outside circuit → copper track → component'],
    silkscreen: ['PRINTED LABEL', 'Silkscreen', 'The readable ink printed on the board labels pins, parts, polarity, and warnings. It does not carry electricity.', 'Read it before connecting a wire. Tiny marks often prevent reversed power or a wrong pin choice.', 'your eyes → printed label → correct connection'],
    digital: ['PIN LANGUAGE', 'Digital', 'A digital pin treats a signal as LOW or HIGH and can usually be configured as an input or output.', 'Read a button or switch a small LED. Never drive a motor directly from a GPIO pin.', 'D7 → input/output circuit → MCU'],
    analog: ['PIN LANGUAGE', 'Analog / ADC', 'An analog input measures a range of voltages. An ADC converts that voltage into a number the program can use.', 'Read a potentiometer, light sensor, or joystick axis.', 'A0 → ADC → number in MCU'],
    pwm: ['PIN LANGUAGE', 'PWM — pulse-width modulation', 'PWM switches a digital pin HIGH and LOW quickly. Changing its ON-time fraction creates an average effect such as dimmer light or slower motor speed.', 'Use a ~ marked pin to dim an LED or command a motor driver.', 'MCU timer → fast pulses → ~ pin'],
    uart: ['COMMUNICATION BUS', 'UART / Serial — TX and RX', 'TX transmits bits and RX receives them. Two devices cross-connect TX to RX and share ground.', 'Talk to a GPS receiver, another controller, or a serial monitor.', 'MCU UART → TX / RX → device'],
    i2c: ['COMMUNICATION BUS', 'I²C — SDA and SCL', 'SDA carries data and SCL carries the clock. Many addressed devices can share the same two wires.', 'Connect displays, sensors, and Qwiic modules with very few wires.', 'MCU I²C → SDA + SCL → device'],
    spi: ['COMMUNICATION BUS', 'SPI — COPI, CIPO, SCK and CS', 'SPI is a fast bus. COPI sends controller-to-peripheral data, CIPO returns it, SCK is the clock, and CS selects a device.', 'Connect SD cards, displays, and radios. Older diagrams may say MOSI and MISO.', 'MCU SPI → clock + data → selected device'],
    power: ['POWER PIN', 'VIN, 5V and 3V3', 'VIN accepts an external supply before regulation. 5V and 3V3 are regulated rails; they are not signal pins.', 'Check the exact board limits before powering it. Logic voltage differs across Arduino families.', 'VIN or USB → regulator → board rail'],
    ground: ['POWER REFERENCE', 'GND — ground', 'Ground is the shared zero-volt reference and return path. Signals only make sense when connected devices share a reference.', 'Connect grounds between boards and sensors unless the circuit is intentionally isolated.', 'circuit → GND return → power source'],
    reset: ['CONTROL SIGNAL', 'RESET / RST', 'Reset stops the current program, returns the processor to startup, and runs setup() again. It does not erase the sketch.', 'Restart after a stuck program or let an uploader start the bootloader.', 'reset signal → MCU restarts → setup()']
  };
  var standardDigital = ['D0/RX', 'D1/TX', 'D2', '~D3', 'D4', '~D5', '~D6', 'D7', 'D8', '~D9', '~D10', '~D11', 'D12', 'D13'];
  var standardAnalog = ['A0', 'A1', 'A2', 'A3', 'A4/SDA', 'A5/SCL'];
  var standardPower = ['VIN', '5V', '3V3', 'GND', 'RESET', 'AREF'];
  var standardBus = ['TX', 'RX', 'SDA', 'SCL', 'COPI', 'CIPO', 'SCK'];
  var boards = {
    uno: { name: 'Arduino UNO R3', sub: 'ATmega328P · 5 V logic · 16 MHz', brain: 'ATmega<br>328P', brainName: 'ATmega328P', brainAt: [72,67], className: 'is-uno', credit: ['MakeMagazinDE', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Arduino_uno_r3.jpg'], note: 'UNO R3 has 14 digital pins (6 PWM) and 6 analog inputs. A0–A5 can also work as digital pins D14–D19.', pins: [standardDigital, standardAnalog, standardPower, standardBus], parts: [
      ['usb', 'USB-B', 13, 29, 'USB CONNECTOR', 'Carries 5 V power and data between a computer and the board. A helper chip converts USB data into serial messages.', 'Upload sketches and open the Serial Monitor.', 'computer → USB → ATmega16U2 → ATmega328P'],
      ['reset', 'Reset', 20, 9, 'RESET BUTTON', 'Pressing this button restarts the ATmega328P and runs setup() again without erasing the sketch.', 'Restart a program or manually begin a new boot cycle.', 'button → reset line → ATmega328P'],
      ['bridge', 'ATmega16U2', 37, 35, 'USB–SERIAL CONTROLLER', 'This square helper microcontroller translates USB packets into UART serial data. It does not normally run your sketch.', 'Upload code and communicate over Serial without a separate adapter.', 'USB-B → ATmega16U2 → RX/TX → ATmega328P'],
      ['jack', 'DC jack', 18, 82, 'POWER INPUT', 'Accepts external DC power before it reaches the voltage regulator.', 'Power an untethered project with a suitable regulated adapter.', 'DC jack → regulator → 5 V rail'],
      ['reg', 'Regulator', 27, 65, '5 V REGULATOR', 'The large three-legged device turns a higher input voltage into a steady 5 V board rail. Extra voltage becomes heat.', 'Keep board power stable; this is not a high-current motor supply.', 'VIN / DC jack → regulator → 5 V rail'],
      ['led', 'L / TX / RX', 46, 31, 'STATUS LEDS', 'L is the built-in D13 LED. TX and RX flash during USB serial traffic. ON indicates board power.', 'Test code with LED_BUILTIN and watch serial activity.', 'MCU or USB bridge → resistor → LED'],
      ['icsp', 'ICSP', 93, 48, 'PROGRAMMING HEADER', 'This six-pin header exposes SPI and direct programming signals for the ATmega328P.', 'Recover or directly program the main MCU, or reach SPI independently of shield pin placement.', 'programmer → SPI/reset → ATmega328P']
    ] },
    nano: { name: 'Arduino Nano Every', sub: 'ATmega4809 + SAMD11D14A USB bridge · 5 V I/O · 20 MHz', brain: 'ATmega<br>4809', brainName: 'ATmega4809', brainAt: [71,48], className: 'is-nano', credit: ['Enirstad', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Arduino_Nano_Every.png'], note: 'Nano Every has PWM on D3, D5, D6, D9, and D10—not D11. It also has analog-only A6 and A7. This differs from the classic Nano.', pins: [['D0/RX','D1/TX','D2','~D3','D4','~D5','~D6','D7','D8','~D9','~D10','D11','D12','D13'], ['A0','A1','A2','A3','A4/SDA','A5/SCL','A6','A7'], standardPower, standardBus], parts: [
      ['usb', 'Micro USB', 6, 50, 'USB CONNECTOR', 'Carries power and data in a connector suited to the narrow Nano format.', 'Upload a sketch or power the board from a computer.', 'computer → USB → SAMD11D14A bridge'],
      ['reset', 'Reset', 29, 55, 'RESET BUTTON', 'Pressing this button restarts the ATmega4809 and runs setup() again. It does not erase the uploaded sketch.', 'Restart a program or enter the upload sequence.', 'button → reset line → ATmega4809'],
      ['bridge', 'SAMD11', 43, 52, 'USB BRIDGE MCU', 'The smaller SAMD11D14A microcontroller translates USB serial data and manages uploads to the main ATmega4809 through UPDI.', 'It quietly makes USB uploading possible; your normal Arduino sketch does not run here.', 'USB → SAMD11D14A → UART / UPDI → ATmega4809'],
      ['serialled', 'RX / TX', 56, 47, 'SERIAL ACTIVITY LEDS', 'These two tiny LEDs flash when serial data travels between the USB bridge and the main microcontroller.', 'Watch them during an upload or while using Serial Monitor.', 'USB bridge → RX / TX lines → LEDs'],
      ['led', 'L LED', 9, 79, 'BUILT-IN LED', 'The small L indicator is the user-controllable built-in LED connected to D13.', 'Run Blink without wiring an external LED.', 'ATmega4809 → D13 → resistor → L LED']
    ] },
    r4: { name: 'Arduino UNO R4 WiFi', sub: 'Renesas RA4M1 + ESP32-S3 · 5 V GPIO · 48 MHz', brain: 'RA4M1<br>MCU', brainName: 'RA4M1 MCU', brainAt: [76,35], className: 'is-r4', credit: ['Lomrjyo', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Arduino_UNO_R4_WiFi.jpg'], note: 'UNO R4 WiFi keeps familiar UNO headers but adds a DAC, CAN bus, Qwiic connector, wireless coprocessor, and 12 × 8 LED matrix.', pins: [standardDigital, ['A0/DAC','A1','A2','A3','A4/SDA','A5/SCL'], standardPower, ['TX','RX','SDA','SCL','COPI','CIPO','SCK','CAN TX/RX']], parts: [
      ['usb', 'USB-C', 15, 32, 'USB CONNECTOR', 'Carries power, sketch uploads, serial data, and native USB communication.', 'Upload sketches or let the RA4M1 act as a USB keyboard or mouse.', 'computer → USB-C → RA4M1'],
      ['wifi', 'ESP32-S3', 30, 56, 'WIRELESS COPROCESSOR', 'A second programmable microcontroller provides Wi-Fi and Bluetooth. It is not the default sketch brain.', 'Send sensor data wirelessly or explore advanced dual-MCU projects.', 'antenna ↔ ESP32-S3 ↔ RA4M1'],
      ['matrix', '12×8 LEDs', 69, 63, 'ONBOARD OUTPUT', 'Ninety-six tiny LEDs are arranged as a matrix and driven without an external display.', 'Show icons, numbers, animations, or sensor levels.', 'RA4M1 → matrix driver → 96 LEDs'],
      ['qwiic', 'Qwiic', 91, 62, 'I²C CONNECTOR', 'A keyed connector carrying 3.3 V, ground, SDA, and SCL for plug-in sensors.', 'Add a compatible sensor without breadboard jumpers.', 'RA4M1 I²C → Qwiic → sensor'],
      ['dac', 'DAC A0', 60, 88, 'TRUE ANALOG OUTPUT', 'A digital-to-analog converter creates a real changing voltage on A0, unlike PWM pulses.', 'Generate a waveform or smooth control voltage within board limits.', 'number in sketch → DAC → A0 voltage']
    ] },
    q: { name: 'Arduino UNO Q', sub: 'QRB2210 Linux MPU + STM32U585 real-time MCU · 3.3 V MCU I/O', brain: 'STM32<br>U585 MCU', brainName: 'STM32U585 MCU', brainAt: [50,50], className: 'is-q', note: 'UNO Q stays a conceptual rendering because an openly licensed product photograph was not verified. Traditional UNO headers belong to the 3.3 V STM32 MCU; bottom high-speed connectors are not ordinary maker GPIO.', pins: [standardDigital, standardAnalog, ['VIN','5V OUT','3V3','GND','RESET','AREF'], ['TX','RX','SDA','SCL','COPI','CIPO','SCK','Qwiic']], parts: [
      ['usb', 'USB-C', 13, 43, 'USB-C SYSTEM PORT', 'Connects UNO Q to power, a computer, or—with a powered dock—displays and USB devices.', 'Develop from another computer or attach peripherals for standalone Linux use.', 'USB-C → Qualcomm MPU / power system'],
      ['mpu', 'QRB2210 MPU', 30, 14, 'LINUX BRAIN · MICROPROCESSOR', 'A quad-core Arm application processor runs Debian Linux, Python, networking, graphics, and AI. It is not intended for exact microsecond control.', 'Process camera frames, run a web service, or execute an AI model.', 'camera/network → Linux app → RPC'],
      ['rpc', 'Arduino Bridge', 77, 43, 'BRAIN-TO-BRAIN LINK', 'Remote procedure calls let Linux software and the real-time Arduino side exchange commands and data.', 'Ask the MCU for a reading, then let Linux analyze or publish it.', 'Linux MPU ↔ RPC ↔ STM32 MCU'],
      ['wireless', 'Wi-Fi / BT', 83, 16, 'WIRELESS MODULE', 'Provides dual-band Wi-Fi 5 and Bluetooth 5.1 with an onboard antenna.', 'Connect Linux applications or Arduino projects to devices and networks.', 'antenna ↔ wireless module ↔ MPU'],
      ['qwiic', 'Qwiic', 82, 70, 'I²C CONNECTOR', 'A keyed connector for power, ground, and two-wire I²C data.', 'Attach compatible Modulino nodes or sensors quickly.', 'STM32 I²C → Qwiic → module'],
      ['carrier', 'High-speed', 30, 78, 'BOTTOM CARRIER CONNECTORS', 'Bottom connectors expose camera, display, audio, and specialized signals. They are not ordinary maker GPIO.', 'Add a media or breakout carrier for advanced interfaces.', 'MPU / system → high-speed connector → carrier']
    ] }
  };
  var current = 'uno';
  var map = document.getElementById('abl-board');
  if (!map) return;
  var targets = document.getElementById('abl-targets');
  var brain = document.getElementById('abl-brain');
  var trace = document.getElementById('abl-active-trace');
  function text(id, value) { document.getElementById(id).textContent = value; }
  function inspect(item, x, y, selected) {
    text('abl-kind', item[0]); text('abl-name', item[1]); text('abl-meaning', item[2]);
    document.getElementById('abl-use').innerHTML = '<strong>Try it:</strong> ' + item[3];
    text('abl-code', item[4]);
    document.getElementById('abl-route').innerHTML = item[4].split(' → ').map(function (part, i) { return (i ? '<b>→</b>' : '') + '<span>' + part + '</span>'; }).join('');
    var brainAt = boards[current].brainAt || [50, 50];
    trace.setAttribute('d', 'M ' + (x || brainAt[0]) + ' ' + (y || brainAt[1]) + ' L ' + brainAt[0] + ' ' + brainAt[1]);
    document.querySelectorAll('.abl-target,.abl-pin,.abl-brain').forEach(function (el) { el.setAttribute('aria-pressed', String(el === selected)); });
  }
  function brainInfo() { var b = boards[current]; return ['MAIN COMPUTING BRAIN', b.brainName, current === 'q' ? 'This real-time microcontroller runs Arduino sketches and handles GPIO predictably while the Linux MPU handles heavier work.' : 'This main microcontroller runs your sketch, reads inputs, follows instructions, and changes outputs.', current === 'q' ? 'Use it for motor pulses, sensor timing, and immediate physical control.' : 'Read sensors and control outputs. Larger loads still need a driver and separate power.', 'sketch → ' + b.brainName + ' → GPIO pins']; }
  function pinInfo(pin, group) {
    var clean = pin.replace('~',''), key = group === 1 ? 'analog' : group === 2 ? (clean.indexOf('GND') >= 0 ? 'ground' : clean.indexOf('RESET') >= 0 ? 'reset' : 'power') : group === 3 ? ((clean === 'SDA' || clean === 'SCL') ? 'i2c' : (clean === 'TX' || clean === 'RX') ? 'uart' : (clean === 'COPI' || clean === 'CIPO' || clean === 'SCK') ? 'spi' : 'digital') : 'digital';
    var item = terms[key].slice(); item[0] = ['DIGITAL PIN','ANALOG PIN','POWER & CONTROL','COMMUNICATION'][group]; item[1] = pin; if (pin.charAt(0) === '~') item[2] += ' This pin also supports PWM.'; item[4] = pin + ' → ' + (key === 'analog' ? 'ADC → ' : '') + boards[current].brainName; return item;
  }
  function renderPins(b) {
    var names = ['Digital GPIO','Analog','Power & control','Communication labels'], root = document.getElementById('abl-pin-groups'); root.innerHTML = '';
    b.pins.forEach(function (pins, group) { var box = document.createElement('div'), title = document.createElement('strong'), list = document.createElement('div'); box.className = 'abl-pin-group'; list.className = 'abl-pins'; title.textContent = names[group]; pins.forEach(function (pin) { var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'abl-pin'; btn.textContent = pin; btn.setAttribute('aria-label','Inspect pin ' + pin); btn.addEventListener('click', function () { inspect(pinInfo(pin, group), group === 0 ? 86 : 14, group === 2 ? 72 : 30, btn); }); list.appendChild(btn); }); box.appendChild(title); box.appendChild(list); root.appendChild(box); });
  }
  function renderBoard(key) {
    current = key; var b = boards[key]; text('abl-board-name', b.name); text('abl-board-sub', b.sub); text('abl-note', b.note); map.className = 'abl-board ' + (b.className || ''); map.setAttribute('aria-label',(b.credit ? 'Interactive annotated photograph of ' : 'Interactive conceptual top view of ') + b.name); brain.innerHTML = b.brain; brain.style.left = b.brainAt[0] + '%'; brain.style.top = b.brainAt[1] + '%';
    var credit = document.getElementById('abl-credit'), creditLink = document.getElementById('abl-credit-link');
    credit.hidden = !b.credit; document.getElementById('abl-map-note').textContent = b.credit ? 'The photograph shows the real board; the yellow route is a conceptual signal path, not an exact microscopic copper trace.' : 'No openly licensed UNO Q product photograph was verified, so this board remains an honest conceptual map.';
    if (b.credit) { text('abl-credit-name', b.credit[0]); creditLink.textContent = b.credit[1] + ' source'; creditLink.href = b.credit[2]; }
    document.querySelectorAll('.abl-tab').forEach(function (tab) { tab.setAttribute('aria-selected', String(tab.dataset.board === key)); }); targets.innerHTML = '';
    b.parts.forEach(function (p) { var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'abl-target' + (p[1].length > 6 ? ' is-wide' : ''); btn.style.left = p[2] + '%'; btn.style.top = p[3] + '%'; btn.textContent = p[1]; btn.setAttribute('aria-label','Inspect ' + p[1]); btn.addEventListener('click', function () { inspect([p[4], p[1], p[5], p[6], p[7]], p[2], p[3], btn); }); targets.appendChild(btn); });
    renderPins(b); inspect(brainInfo(), b.brainAt[0], b.brainAt[1], brain);
  }
  document.querySelectorAll('.abl-tab').forEach(function (tab) { tab.addEventListener('click', function () { renderBoard(tab.dataset.board); }); });
  brain.addEventListener('click', function () { var at = boards[current].brainAt; inspect(brainInfo(), at[0], at[1], brain); });
  document.querySelectorAll('[data-abl-term]').forEach(function (btn) { btn.addEventListener('click', function () { inspect(terms[btn.dataset.ablTerm], 15, 28, null); document.getElementById('abl-map-wrap').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }); });
  renderBoard('uno');
}());
