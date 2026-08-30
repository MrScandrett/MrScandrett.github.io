import * as Blockly from "blockly/core";
import "blockly/blocks";
import { javascriptGenerator } from "blockly/javascript";

// Preserve the browser-global API used by the existing visual coding lessons.
// Module namespace objects are immutable, so expose a shallow browser facade
// with the legacy Blockly.JavaScript generator attached.
window.Blockly = { ...Blockly, JavaScript: javascriptGenerator };
