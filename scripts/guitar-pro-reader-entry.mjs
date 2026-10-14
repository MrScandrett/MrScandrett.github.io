// alphaTab is used only for decoding; Fake Book keeps its own renderer and player.
import { importer, Settings, Logger, LogLevel } from '../node_modules/@coderline/alphatab/dist/alphaTab.core.mjs';
export function readScore(bytes) {
  const settings = new Settings();
  settings.importer.maxDecodingBufferSize = 16 * 1024 * 1024;
  // Fake Book presents decoder failures in its accessible import status.
  const previous = Logger.logLevel;
  Logger.logLevel = LogLevel.None;
  try { return importer.ScoreLoader.loadScoreFromBytes(bytes, settings); }
  finally { Logger.logLevel = previous; }
}
