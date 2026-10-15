# Music Lab VST companion

Music Lab is a browser application, so it cannot execute `.vst3` binaries directly. The optional local companion discovers approved VST3 installations and opens a selected plugin through Carla without weakening the browser sandbox.

## Start it

1. Install Carla and confirm `carla-single` is available.
2. From the repository, run `npm run music:vst-bridge`.
3. Keep that terminal open and copy its temporary pairing code.
4. In Music Lab, open **FX → Desktop VST companion**, enter the code, and choose **Connect and scan**.
5. Choose **Open in Carla** beside a plugin. Music Lab never opens a native plugin without this explicit action.

Run `npm run music:vst-check` for a JSON readiness report without starting the service. Run `npm run music:vst-install` to preview the Linux desktop-launcher installation; nothing is written until `-- --install` is added. For troubleshooting, `MUSIC_LAB_VST_SAFE_MODE=1 npm run music:vst-bridge` permits discovery and project recovery while disabling native plugin launches.

The companion listens only on `127.0.0.1:4777`. It scans `~/.vst3`, `/usr/local/lib/vst3`, and `/usr/lib/vst3`; it returns opaque catalog IDs to the browser rather than filesystem paths. A new random pairing code is generated each time it starts.

## Current boundary

Phase 6 stores linked native-plugin identity, bypass/mix placeholders, compatibility, and reported latency in autosave and `.mlab.zip` projects. Reopening a project shows whether each linked plugin is available or missing. The native plugin still runs in Carla beside Music Lab: its audio, parameters, and automation do not yet enter the browser rack. Browser-native plugins remain the portable choice for live playback and offline exports.

Advanced local configuration is available through `MUSIC_LAB_VST_PORT`, `MUSIC_LAB_VST_TOKEN`, `MUSIC_LAB_VST_DIRS`, and `MUSIC_LAB_VST_ORIGINS`. Never expose the companion port to a LAN or public interface.

The companion rejects unapproved website origins, throttles repeated launch requests, and keeps a short in-memory launch-status history so a future UI can distinguish a closed plugin from a failed or crashed process.
