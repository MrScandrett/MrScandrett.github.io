# Troubleshooting

## "Port" is greyed out, or upload says it cannot find the board

- Try a different USB cable; many cables only charge.
- Unplug and replug, then check **Tools > Port** again.
- On Windows, some clone boards need the CH340 driver.
- Close the Serial Monitor in any other IDE window; only one program can use the port.

## Upload fails with "programmer is not responding" or "sync" errors

- Check **Tools > Board** matches your board exactly.
- Disconnect anything wired to pins 0 and 1 while uploading (they are the USB serial pins).

## "Servo.h: No such file or directory"

- Open **Tools > Manage Libraries**, search for *Servo*, and install the one by Arduino.

## The Serial Monitor shows nonsense characters

- The baud rate in the bottom corner must match `Serial.begin(9600)`.

## The sensor value never changes

- Check the middle leg of the potentiometer goes to A0 and the outer legs to 5V and GND.
- A reading stuck at 0 or 1023 usually means a loose or missing wire.

## The servo jitters, or the board resets when it moves

- The servo is drawing too much power. Use one small servo, or a separate 5V supply
  whose GND is connected to the Arduino GND.

## The LED does not light

- LEDs only work one way round: the long leg goes toward the pin.
- Check the resistor is in series, not bridging across the LED.
- In `SensorReading`, the LED must be on a PWM pin (marked `~`), such as 6.
