import * as Blockly from "blockly/core";
import "blockly/blocks";
import { javascriptGenerator } from "blockly/javascript";
import * as English from "blockly/msg/en";
import { installClassroomBlockly } from "../assets/js/blockly-classroom.mjs";

// Blockly 13's workspace accessibility labels require a locale before inject().
Blockly.setLocale(English);

// Preserve the browser-global API used by the existing visual coding lessons.
// Module namespace objects are immutable, so expose a shallow browser facade
// with the legacy Blockly.JavaScript generator attached.
// installClassroomBlockly adds the site-wide readable theme and zoom floor
// (assets/js/blockly-classroom.mjs) to every block editor.
window.Blockly = installClassroomBlockly({ ...Blockly, JavaScript: javascriptGenerator });
