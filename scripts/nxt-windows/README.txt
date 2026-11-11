NXT Compiler Companion for Windows x64

1. Download the ZIP from NXT Robot Lab. In the ZIP's Properties, use Unblock if Windows offers it, then Extract All.
2. Double-click Start-NXT-Compiler.cmd inside the extracted folder.
3. The first launch downloads portable Node.js 24 from nodejs.org if needed and the official NBC/NXC Windows compiler from the BricxCC SourceForge project. Downloads are SHA-256 checked before extraction/use. Keep an internet connection for that first launch.
4. The launcher compiles a tone-only test and all twelve starter projects. If any fail, it shows the actual diagnostic instead of reporting ready. This does not require or move a robot.
5. Leave the window open. In the website, press Check compiler, allow Chrome/Edge to contact this local computer if asked, then Compile .rxe locally.
6. Select the resulting myrobot.rxe in Brick files and send it to a connected NXT. Upload does not start the program. Test tones first, then short motor moves with wheels lifted.

No repository clone, npm install, administrator install, USB driver change or firmware change is performed. Portable tools are kept under runtime/ beside this file. Delete the extracted folder to remove them. Close the command window to stop the local service. The service listens only on 127.0.0.1:8791.

If your school blocks PowerShell, downloads, unsigned applications or local browser connections, ask IT to approve this package. Do not disable school security software. If port 8791 is already in use, check whether another companion window is open.

If you already have another compiler, set NXT_NBC to its full executable path before launching. Otherwise this package uses NBC/NXC 1.2.1 r4. Other versions must pass the same compile tests. Windows ARM needs a separately configured runtime/compiler and is not supported by this automatic launcher.

Compilation and USB transfer are different steps: a working compiler does not prove that your computer's USB driver can access the NXT. Use Connect USB in desktop Chrome/Edge and confirm a battery reading before testing a transfer.

Sources:
Node.js runtime: https://nodejs.org/en/download
NBC/NXC: https://bricxcc.sourceforge.net/nbc/
Compiler archive: https://sourceforge.net/projects/bricxcc/files/NBC_NXC/NBC%20release%201.2.1%20r4/
Classroom source: https://github.com/MrScandrett/MrScandrett.github.io

This ZIP contains the classroom bridge, not redistributed third-party runtimes. The launcher downloads those tools from their publishers; their licenses and accompanying files remain in runtime/. The NXT brick still needs a real hardware test before classroom use.
