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

`nxc.mjs` exports source targeting stock firmware 1.28+. It is **not** a compiler or NXT-G importer. On Windows x64, download the companion ZIP linked inside the app, Extract All, and run Start-NXT-Compiler.cmd. It obtains portable Node.js and pinned/checksummed NBC/NXC without Git, npm install, admin setup or system PATH edits. Its self-test compiles a tone and all twelve starters before starting the service. On other computers, install a compatible free NBC/NXC compiler and compile `myrobot.nxc -O=myrobot.rxe -v=128`. Old downloads may not run on a modern OS; verify compatibility first. Source export and mocked transfer tests do not prove the generated source compiles or executes on physical hardware.

Optional `npm run nxt:compiler` starts a loopback-only companion on port 8791. Set `NXT_NBC` to the trusted compiler executable if it is not on PATH. It validates a program tree, generates source in a temporary directory, invokes the installed compiler with a 15-second limit, and returns verified RXE-header bytes. It does not accept raw NXC, modify firmware, connect to a robot, or replace existing brick files. `NXT_COMPILER_ORIGINS` allows additional exact origins if hosting moves.

Upload never auto-starts a program. Disconnect, then select the stored program from the NXT's My Files / Software files menu to run without a laptop. Browser CSV samples become LCD output in generated standalone programs; no standalone file logger is claimed.

## Optional phone controls

`npm run nxt:remote -- --lan` starts a token-protected classroom relay on port 8792. Paste its localhost link into the teacher desktop's Remote panel; open its LAN link on the phone. A phone does not connect to NXT Bluetooth directly: it sends finite direction/stop messages to the connected desktop browser. Keep the teacher tab active and the readiness check enabled. Without `--lan` the relay is loopback-only. Use trusted classroom Wi-Fi, keep links private, and stop the companion after class. No arbitrary robot packets or source code are accepted.

## Checks and hardware acceptance

- `npm run test:nxt` checks interpreter logic, all template schemas/NXC output, sensor request fields, file acknowledgements/cleanup, audio headers, compiler companion errors and phone relay restrictions.
- With `node serve-local.js` running, `npm run check:nxt:browser` checks both editors, templates, simulated encoder math, saved projects, CSV/NXC downloads, fullscreen, phone layout, STOP and mocked USB interactions.
- Creation-app, integrity, theme and accessibility checks apply. Check accessibility again with Blocks visible after Blockly changes.

No physical NXT or installed NBC/NXC compiler was available for development verification. Before a class: verify the firmware and compiler version; compile a tone-only export; confirm the battery handshake over each intended transport; verify each sensor snapshot; test STOP and 90° moves with wheels lifted; test upload and unplugged execution; measure black/white threshold and turn calibration; and test each attachment unloaded. Hardware setup and software tests are separate acceptance steps. A disconnected/stalled motor may not respond to browser STOP: an adult must be able to turn the brick off.

## Windows distribution and diagnostics

`npm run build:nxt-companion` bundles the bridge and its source-generation dependencies into `downloads/nxt-compiler-windows.zip`, with the launcher in `scripts/nxt-windows/`. The ZIP contains no redistributed Node/NBC binaries. The launcher obtains Node 24 from nodejs.org and checks its published SHA-256; the NBC 1.2.1 r4 archive and executable are pinned to checked SHA-256 values from the official SourceForge release. All portable files live beside the launcher under runtime/. School policies may require IT approval. Windows ARM is explicitly unsupported by the automatic setup.

`npm run check:nxt-companion` checks that the committed download matches source. The generated-files hook rebuilds it before relevant commits. `NXT Windows compiler` CI extracts that exact ZIP in a path containing spaces, exercises portable setup and runs real compilation on Windows.

GET /health now compiles a generated tone program before reporting compilerReady. It distinguishes a reachable companion with a missing/broken compiler from a helper that the browser cannot reach. A stale helper that predates this protocol is reported as outdated. Failed startup/compilation never becomes a downloaded fake .rxe. The public app has a Check compiler button and automatically opens the Windows setup panel when checking or compiling fails.
