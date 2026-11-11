# NXT Robot Lab

Lesson: `lessons/engineering/robotics/nxt-robot-lab.html`. Static GitHub Pages source; nothing is generated under `apps/`.

Default original-kit wiring: touch 1, sound 2, light 3, ultrasonic 4; attachment A, left drive B, right drive C. Sensor ports are configurable. The two-touch remote template requires a second switch on 2 and disconnects the sound sensor. No color-sensor driver is provided: original NXT light sensors cannot recognize colors.

## Programming and transports

- Sequence mode retains version 1 project compatibility. Blocks mode uses the vendored Blockly build and version 2 data-only program trees. Save/open never evaluates imported JavaScript.
- `program.mjs` validates sensor wiring, expressions and nested instructions; `blocks.mjs` converts between Blockly and that tree. `projects.mjs` contains twelve executable teaching templates.
- The interpreter bounds programs to two minutes / 5,000 operations, repeat loops to 100, power to ±60 and individual wheel travel to 720°. Unequal drive powers scale wheel angles relative to the faster wheel, so steering changes heading.
- USB uses raw direct-command telegrams; Bluetooth Classic uses Web Serial and two-byte length framing. `brick.mjs` implements sensor configuration, ultrasonic I²C polling, encoder feedback, sound commands and acknowledged file transfers. STOP sends StopProgram before braking all outputs.
- The simulator labels estimates and logs simulated values separately. Blocks mode samples a black line and barriers, with manual light/distance overrides. There is no collision or mechanism physics.
- Microphone/audio conversion produces up to eight seconds of mono uncompressed 8 kHz RSO. Only explicit recording requests microphone permission. Audio stays local.

## Standalone programs

`nxc.mjs` exports source targeting stock firmware 1.28+. It is **not** a compiler or NXT-G importer. Install a compatible free NBC/NXC compiler and compile `myrobot.nxc -O=myrobot.rxe -v=128`. Old downloads may not run on a modern OS; verify compatibility first. Source export and mocked transfer tests do not prove the generated source compiles or executes on physical hardware.

Optional `npm run nxt:compiler` starts a loopback-only companion on port 8791. Set `NXT_NBC` to the trusted compiler executable if it is not on PATH. It validates a program tree, generates source in a temporary directory, invokes the installed compiler with a 15-second limit, and returns verified RXE-header bytes. It does not accept raw NXC, modify firmware, connect to a robot, or replace existing brick files. `NXT_COMPILER_ORIGINS` allows additional exact origins if hosting moves.

Upload never auto-starts a program. Disconnect, then select the stored program from the NXT's My Files / Software files menu to run without a laptop. Browser CSV samples become LCD output in generated standalone programs; no standalone file logger is claimed.

## Optional phone controls

`npm run nxt:remote -- --lan` starts a token-protected classroom relay on port 8792. Paste its localhost link into the teacher desktop's Remote panel; open its LAN link on the phone. A phone does not connect to NXT Bluetooth directly: it sends finite direction/stop messages to the connected desktop browser. Keep the teacher tab active and the readiness check enabled. Without `--lan` the relay is loopback-only. Use trusted classroom Wi-Fi, keep links private, and stop the companion after class. No arbitrary robot packets or source code are accepted.

## Checks and hardware acceptance

- `npm run test:nxt` checks interpreter logic, all template schemas/NXC output, sensor request fields, file acknowledgements/cleanup, audio headers, compiler companion errors and phone relay restrictions.
- With `node serve-local.js` running, `npm run check:nxt:browser` checks both editors, templates, simulated encoder math, saved projects, CSV/NXC downloads, fullscreen, phone layout, STOP and mocked USB interactions.
- Creation-app, integrity, theme and accessibility checks apply. Check accessibility again with Blocks visible after Blockly changes.

No physical NXT or installed NBC/NXC compiler was available for development verification. Before a class: verify the firmware and compiler version; compile a tone-only export; confirm the battery handshake over each intended transport; verify each sensor snapshot; test STOP and 90° moves with wheels lifted; test upload and unplugged execution; measure black/white threshold and turn calibration; and test each attachment unloaded. Hardware setup and software tests are separate acceptance steps. A disconnected/stalled motor may not respond to browser STOP: an adult must be able to turn the brick off.
