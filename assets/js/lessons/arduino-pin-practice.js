(() => {
  'use strict';
  const tasks = {
    button: ['A button should read HIGH when released and LOW when pressed. Choose its signal pin; wire the switch between that pin and GND.', 'D2', 'D2 is a digital input. INPUT_PULLUP provides an internal pull-up, so pressing the switch connects it to GND.', 'pinMode(2, INPUT_PULLUP);\nint pressed = digitalRead(2) == LOW;'],
    sensor: ['A potentiometer has its outer terminals on 5V and GND. Where should its middle terminal (wiper) go?', 'A0', 'A0 measures the wiper voltage. On a UNO R3, the default 10-bit reading spans 0–1023; the input must remain within its allowed voltage range.', 'int knob = analogRead(A0);'],
    led: ['An external LED needs adjustable brightness. Choose a signal pin; include a series resistor and connect the LED circuit to GND.', '~D9', 'D9 supports PWM on UNO R3. analogWrite sets a duty cycle, not a steady analog voltage. Use a suitable current-limiting resistor.', 'pinMode(9, OUTPUT);\nanalogWrite(9, 128); // about half duty cycle'],
    motor: ['A DC motor needs more current than a GPIO can supply. What belongs between the Arduino control pins and the motor?', 'Motor driver', 'Use a rated motor driver, suitable motor supply, and shared ground. Arduino pins command the driver; they do not supply the motor current.', '// Example route, not a complete wiring diagram:\n// Arduino GPIO → driver control input\n// motor supply → driver → motor'],
    reference: ['A sensor and the UNO use compatible signals and separate power supplies. Which connection establishes their common voltage reference?', 'GND', 'Connect grounds in this non-isolated circuit. GND is the reference and return path, not a pin you toggle with digitalWrite.', '// Sensor GND ↔ Arduino GND']
  };
  const choices = ['D2', 'A0', '~D9', '5V', 'GND', 'Motor driver'];
  const select = document.getElementById('pin-task');
  if (!select) return;
  function render() {
    const task = tasks[select.value];
    document.getElementById('pin-task-prompt').textContent = task[0];
    const feedback = document.getElementById('pin-task-feedback');
    feedback.textContent = 'Choose a connection and explain your prediction.';
    const code = document.getElementById('pin-task-code'); code.hidden = true;
    const root = document.getElementById('pin-choices'); root.replaceChildren();
    choices.forEach(choice => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = choice; button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => {
        root.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        const correct = choice === task[1];
        feedback.textContent = correct ? `Correct. ${task[2]}` : `${choice} does not solve this wiring problem. ${choice === '5V' ? '5V is a power rail, not a programmable signal.' : 'Look for the required job: digital input, voltage measurement, PWM, motor power, or reference.'} Try another connection.`;
        code.hidden = !correct; code.textContent = correct ? task[3] : '';
      }); root.appendChild(button);
    });
  }
  select.addEventListener('change', render);
  document.getElementById('pin-task-reset').addEventListener('click', render);
  render();
})();
