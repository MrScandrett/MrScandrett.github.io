// Reviewed student workflows. Review dates mean source review, not a school-network guarantee.
// New resources and access corrections feed app-registry.js; the launcher never guesses from “free”.
const allGrades = ["K-2", "3-5", "6-8", "9-12"];
const older = ["3-5", "6-8", "9-12"];
const reviewedOn = "2026-09-08";
const mlcSave = "Use Share to keep the code or link in your project notes. Open it again to check it works. Save an image too; share codes expire after 18 months without use.";
function resource(id, label, category, link, description, save, source = link, grades = older, extra = {}) {
  return { id, label, shortLabel: label, type: "tool", category, categories: [category], link, description, teaches: description,
    radius: 30, grades, login: "No account needed for this activity", free: true, browser: true, openSource: false,
    tags: ["Free", "No Login"], utilities: ["free", "no-login", "browser", "projects"], related: [],
    access: "no-account", cost: "Free", save, source, reviewedOn, ...extra };
}
export const learningTools = [
  resource("beepbox", "BeepBox", "music", "https://www.beepbox.co/", "Compose a looping soundtrack for your game or story.", "Export a JSON song file to edit later; import it next time. Export WAV for a finished recording. The full song URL also holds your composition.", undefined, older, {openSource:true}),
  resource("bfxr", "Bfxr", "music", "https://www.bfxr.net/", "Invent jumps, footsteps, and other game sound effects.", "Save the editable .bfxr sound and export a WAV. Open the .bfxr file to make another version.", undefined, older, {openSource:true}),
  resource("twine", "Twine", "storytelling", "https://twinery.org/2/", "Write a story where readers choose what happens next.", "Publish to File to download your story as HTML. Import that file into Twine to edit it again. Keep a copy outside the browser.", "https://twinery.org/reference/en/publishing/publishing.html", older, {openSource:true,categories:["storytelling","games","coding"]}),
  resource("wick", "Wick Editor", "storytelling", "https://www.wickeditor.com/", "Animate a drawing or build a small interactive scene.", "Save an editable .wick project to your device. Open that file to continue; keep exported movies separately.", "https://www.wickeditor.com/index.html", older, {openSource:true,categories:["storytelling","art","games"]}),
  resource("kleki", "Kleki", "art", "https://kleki.com/", "Paint characters, landscapes, and illustrations in your browser.", "Save your picture to your device before leaving. PNG keeps the finished image, not separate editable layers. Reopen it to continue painting.", "https://help.kleki.com/", allGrades),
  resource("excalidraw", "Excalidraw", "art", "https://excalidraw.com/", "Sketch an invention, story map, or illustrated explanation.", "Save to an .excalidraw file for editing later. Export PNG or SVG for a finished picture; reopen the editable file to continue.", "https://github.com/excalidraw/excalidraw", older, {openSource:true,categories:["art","storytelling"]}),
  resource("blockbench", "Blockbench", "design3d", "https://web.blockbench.net/", "Model, paint, and animate a low-poly character.", "Save your project as .bbmodel. Open that project to continue; export a separate model when your game needs it.", "https://www.blockbench.net/", older, {openSource:true}),
  resource("mlc-fractions", "Fraction Models", "math", "https://apps.mathlearningcenter.org/fractions/", "Build circle and bar models to compare fractions.", mlcSave, "https://www.mathlearningcenter.org/apps"),
  resource("mlc-geoboard", "Geoboard", "math", "https://apps.mathlearningcenter.org/geoboard/", "Stretch bands to explore shapes, area, and perimeter.", mlcSave, "https://www.mathlearningcenter.org/apps", allGrades),
  resource("mlc-patterns", "Pattern Shapes", "math", "https://apps.mathlearningcenter.org/pattern-shapes/", "Build pictures and investigate symmetry with pattern blocks.", mlcSave, "https://www.mathlearningcenter.org/apps", allGrades),
  resource("typingclub", "TypingClub", "coding", "https://www.typingclub.com/", "Practice typing with short keyboard lessons.", "You can practice without an account. Record your lesson number in your notes; an optional profile is used for saved progress.", undefined, allGrades),
  resource("redblob", "Red Blob Games", "coding", "https://www.redblobgames.com/", "Explore how game characters find paths and how maps are made.", "Bookmark the explanation and keep your own diagram or notes. No project account is needed to explore.", undefined, ["6-8","9-12"]),
  resource("science-buddies", "Science Buddies", "science", "https://www.sciencebuddies.org/stem-activities", "Find an experiment or building challenge using everyday materials.", "Keep the activity link and record your results in a file or notebook. Ask your teacher about materials before building.", "https://www.sciencebuddies.org/science-fair-projects/science-projects", allGrades),
  resource("audacity", "Audacity", "music", "https://www.audacityteam.org/", "Record a podcast, narration, interview, or soundscape.", "Save an .aup3 project for editing and export WAV or MP3 for listening. Reopen the project in Audacity.", undefined, older, {access:"installed",browser:false,login:"Install with your teacher",openSource:true,utilities:["free","open-source","projects"]}),
  resource("classroom-math", "Math Foundations Lab", "math", "lessons/math-foundations-lab.html", "Practice math with ClassroomOS activities.", "Write down the activity and your solution, or save a screenshot. Return through this launchpad.", "lessons/math-foundations-lab.html", allGrades),
  resource("classroom-guitar", "Guitar Chords", "music", "lessons/guitar-chords.html", "Explore chords with the classroom guitar lesson.", "Keep your chord sequence in project notes and reopen the lesson next time.", "lessons/guitar-chords.html", allGrades),
  resource("classroom-library", "Classroom Library", "storytelling", "recipe-book.html", "Find books and source material for a new story or investigation.", "Bookmark your book and write down the page or chapter. Check each book’s download options and reading guidance.", "recipe-book.html", allGrades)
];

// Explicit allowlist: ambiguous or unreviewed legacy entries stay out of Start now.
const profiles = {
  scratch: ["https://scratch.mit.edu/projects/editor/", "File → Save to your computer downloads an editable .sb3 project. Next time choose File → Load from your computer.", "https://resources.scratch.mit.edu/www/HoC/en/scratch-imagine-remote-guide.pdf"],
  snap: ["https://snap.berkeley.edu/snap/snap.html", "Use the project menu to export your project as XML. Import that XML to continue; cloud saving is optional.", "https://snap.berkeley.edu/"],
  "blockly-games": [null, "Keep a note of your game and level. Browser progress may disappear when this device is cleared.", "https://blockly.games/"],
  "microbit-makecode": [null, "Download your project file to your device. Use Import on the home screen to reopen it; browser autosave is only a temporary copy.", "https://makecode.microbit.org/save"],
  "makecode-arcade": [null, "Use the save/download control to keep a project file. On the home screen choose Import to reopen it. Keep this file even if browser autosave works.", "https://arcade.makecode.com/save"],
  "chrome-music-lab": ["https://musiclab.chromeexperiments.com/Song-Maker/", "In Song Maker choose Save and copy the song link into a text file. Open that full link again before closing your work.", "https://musiclab.chromeexperiments.com/"],
  piskel: ["https://www.piskelapp.com/p/create/sprite", "Save an editable .piskel file to your device. Import it to continue. Export GIF or a PNG sprite sheet for your game.", "https://www.piskelapp.com/"],
  photopea: [null, "File → Save as PSD keeps editable layers. File → Export As makes a finished image. Reopen the PSD to continue.", "https://www.photopea.com/learn/opening-saving"],
  phet: [null, "Record the simulation name, settings, and observations in your notebook or a file. Reopen the simulation and restore those settings next time.", "https://phet.colorado.edu/"],
  codap: [null, "Use the document menu to save a copy to your computer. Open that saved document to continue your analysis.", "https://codap.concord.org/"],
  desmos: ["https://www.desmos.com/calculator", "Use Share to copy a graph link into your notes and reopen it to check. Saving graphs to an online collection uses an account.", "https://www.desmos.com/calculator"],
  falstad: [null, "Use File → Export as Text to keep the circuit text. Import that text when you return.", "https://www.falstad.com/circuit/"],
  "nasa-eyes": [null, "Keep the exploration link and your observations in a notebook. Return to the same destination next time.", "https://eyes.nasa.gov/"],
  "stellarium-web": [null, "Write down your location, date, time, and object so you can recreate the sky view.", "https://stellarium-web.org/"],
  gutenberg: [null, "Download the book format you need and note your chapter. Follow the rights information for your country.", "https://www.gutenberg.org/"],
  kenney: [null, "Download an asset pack and keep its license file alongside your project.", "https://kenney.nl/assets"],
  "ourworldindata": [null, "Keep the chart link, source credit, and downloaded data with your notes.", "https://ourworldindata.org/"],
  interland: [null, "Write down the island and one safety idea you learned; return to practice again.", "https://beinternetawesome.withgoogle.com/en_us/interland"]
};
export function applyStudentAccess(tool) {
  if (tool.type !== "tool") return;
  if (profiles[tool.id]) {
    const [link, save, source] = profiles[tool.id];
    Object.assign(tool, {access:"no-account",cost:tool.id === "photopea" ? "Free editor · ads" : "Free activity",save,source,reviewedOn,login:"No account needed for this activity"});
    if (link) tool.link = link;
  }
  if (tool.id === "tinkercad" || tool.id === "codeorg") Object.assign(tool, {access:"classroom",cost:"Free classroom access",save: tool.id === "tinkercad" ? "Use the same teacher-provided nickname and class link each time. Ask your teacher if your saved designs are missing." : "Use your teacher’s section code and picture or word password to return to saved progress. Some activities can also be tried signed out.",login:"Teacher-managed class access · no student email",source:tool.id === "tinkercad" ? "https://www.tinkercad.com/classrooms" : "https://support.code.org/hc/en-us/sections/13985284435981-Student-Accounts",reviewedOn});
  if (tool.tags?.includes("Steam")) {
    Object.assign(tool,{access:"installed",cost:"Lab access · check with teacher",login:tool.tags.includes("VR") ? "Classroom VR headset and teacher setup" : "Classroom Steam setup",save:"Use your assigned lab computer and ask your teacher where this app keeps its saves. This link opens the store page, not the installed app."});
    tool.free = tool.tags.includes("Free");
    tool.utilities = (tool.utilities || []).filter(x=> x !== "free" && x !== "no-login");
    if (tool.free) tool.utilities.push("free");
  }
  if (tool.id === "freesound") Object.assign(tool, {access:"account",cost:"Free downloads · account needed",login:"Account required to download sounds",save:"Download with an approved account. Keep each sound’s author and license with your project.",source:"https://freesound.org/help/faq/",reviewedOn});
  if (tool.id === "scratchjr") { tool.browser = false; tool.access = "installed"; tool.cost = "Free app · installation needed"; }
  if (!tool.access) tool.access = tool.browser === false ? "installed" : /^(?:login required|account required)/i.test(tool.login || "") ? "account" : "check";
  if (!tool.cost) tool.cost = tool.free ? "Free tier listed · check limits" : "Check price or school plan";
  if (!tool.save) tool.save = tool.access === "installed" ? "Ask your teacher to open or install this tool and show you its project folder. Keep an editable project file." : "Check saving and download options before starting a long project. Keep a copy you can reopen; account or export limits may apply.";
  if (tool.access !== "no-account") {
    tool.utilities = (tool.utilities || []).filter(x => x !== "no-login");
    tool.tags = (tool.tags || []).filter(x => x !== "No Login");
  } else {
    tool.utilities = [...new Set([...(tool.utilities || []),"no-login"])];
  }
  if (["desmos","geogebra","codap","mathworld"].includes(tool.id)) tool.categories = [...new Set([...(tool.categories || []),"math"])];
}

export const projectPaths = [
  {id:"soundtrack",title:"Make a soundtrack",grades:older,tools:["beepbox","bfxr"],starter:"downloads/launchpad/soundtrack-plan.txt",starterLabel:"Download beat planning sheet",steps:["Open BeepBox and choose a tempo. Tap four notes to hear your first loop.","Make a second phrase that answers the first. Add one Bfxr sound effect for a jump or discovery.","Export an editable song JSON and a WAV recording. Keep the .bfxr effect too.","Import the song JSON in a fresh BeepBox tab. Change a note and play it back."]},
  {id:"story",title:"Tell a branching story",grades:older,tools:["twine","kleki"],starter:"downloads/launchpad/story-plan.txt",starterLabel:"Download branching story starter",steps:["Open Twine and make a new story. Use the starter sheet to write your opening passage.","Give your reader two choices. Build two endings and test that every link works.","Publish to File to keep the story HTML. Save illustrations separately.","Import the HTML into Twine and edit one ending. Also open the HTML in a browser to play it."]},
  {id:"sprite",title:"Animate a game character",grades:older,tools:["piskel","makecode-arcade"],starter:"downloads/launchpad/pixel-character.svg",starterLabel:"Download 16 × 16 drawing grid (SVG)",steps:["Open Piskel and set a 16 × 16 canvas. Sketch a character using the grid as a planning sheet.","Duplicate the frame and move the feet. Play the two-frame animation. Try a matching character in MakeCode Arcade.","Save an editable .piskel file and export the animation as GIF.","Import the .piskel file into Piskel. Add a third frame and play it."]},
  {id:"shapes",title:"Explain a shape puzzle",grades:allGrades,tools:["mlc-geoboard","mlc-fractions","mlc-patterns"],starter:"downloads/launchpad/shape-challenges.txt",starterLabel:"Download shape challenges",steps:["Open Geoboard. Make a rectangle that is four spaces wide and two spaces high.","Find a different shape with the same area. Explain what happens to the perimeter.","Use Share to copy your work link or code into a text file. Keep an image and your explanation too.","Open your saved link or enter your code. Show someone how you counted the area."]},
  {id:"data",title:"Investigate a paper helicopter",grades:older,tools:["science-buddies","codap"],starter:"downloads/launchpad/flight-trials.csv",starterLabel:"Download blank trial table (CSV)",steps:["Choose a paper helicopter activity with your teacher. Open the CSV starter in CODAP by dragging in the file.","Try three rotor lengths. Keep release height and paper the same; record three flight times for each.","Make a graph, explain what you noticed, and save your CODAP document to your computer.","Reopen the saved document. Check that both your measurements and graph are there."]}
];
