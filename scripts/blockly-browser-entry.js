import * as Blockly from "blockly/core";
import "blockly/blocks";
import { javascriptGenerator } from "blockly/javascript";
import * as English from "blockly/msg/en";

// Blockly 13's workspace accessibility labels require a locale before inject().
Blockly.setLocale(English);

// Preserve the browser-global API used by the existing visual coding lessons.
// Module namespace objects are immutable, so expose a shallow browser facade
// with the legacy Blockly.JavaScript generator attached.
window.Blockly = { ...Blockly, JavaScript: javascriptGenerator };
