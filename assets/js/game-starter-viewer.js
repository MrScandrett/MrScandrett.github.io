(() => {
const files = document.querySelectorAll(".file-list button");
const source = document.querySelector("#source");
const download = document.querySelector("#download");
const copy = document.querySelector("#copy");
const feedback = document.querySelector("#feedback");
const base = new URL(".", download.href);
const notes = fetch(new URL("notes.json", base)).then(response => response.json()).catch(() => ({}));
let selection;

async function showFile(button) {
  hideTip();
  selection = button;
  const name = button.textContent;
  files.forEach(file => file.setAttribute("aria-pressed", String(file === button)));
  download.href = new URL(name, base).href;
  download.textContent = "Download " + name;
  copy.disabled = true;
  feedback.textContent = "";
  source.textContent = "Loading…";
  try {
    const response = await fetch(download.href);
    if (!response.ok) throw new Error();
    const [contents, lineNotes] = await Promise.all([response.text(), notes]);
    if (selection !== button) return;
    const fragment = document.createDocumentFragment();
    for (const [index, line] of contents.split("\n").entries()) {
      if (index) fragment.append("\n");
      const row = document.createElement("span");
      row.textContent = line;
      if (line.trim()) {
        row.dataset.note = lineNotes[name]?.[line.trim()] || "";
        row.dataset.line = index + 1;
      }
      fragment.append(row);
    }
    source.replaceChildren(fragment);
    source.parentElement.scrollTo(0, 0);
    copy.disabled = false;
  } catch {
    if (selection === button) source.textContent = "Preview unavailable. Use Download to open this file.";
  }
}
files.forEach(button => button.onclick = () => showFile(button));
copy.onclick = async () => {
  const name = selection.textContent;
  try {
    await navigator.clipboard.writeText(source.textContent);
    feedback.textContent = "Copied " + name;
  } catch {
    const range = document.createRange();
    range.selectNodeContents(source);
    const selected = window.getSelection();
    selected.removeAllRanges();
    selected.addRange(range);
    feedback.textContent = "Code selected. Press Ctrl+C or ⌘C to copy.";
  }
};
const preview = source.parentElement;
const tip = document.querySelector("#line-tip");
let activeRow;
function hideTip() {
  activeRow?.removeAttribute("data-active");
  activeRow = null;
  tip.hidden = true;
}
function showTip(row) {
  hideTip();
  if (!row?.dataset.note) return;
  activeRow = row;
  row.dataset.active = "";
  tip.textContent = "Line " + row.dataset.line + " · " + row.dataset.note;
  tip.hidden = false;
  const bounds = row.getBoundingClientRect();
  const panel = preview.getBoundingClientRect();
  tip.style.left = Math.max(8, Math.min(panel.left + 8, innerWidth - tip.offsetWidth - 8)) + "px";
  const top = bounds.bottom + 4;
  tip.style.top = (top + tip.offsetHeight <= innerHeight ? top : Math.max(4, bounds.top - tip.offsetHeight - 4)) + "px";
}
preview.addEventListener("pointerover", event => showTip(event.target.closest("[data-note]")));
preview.addEventListener("pointerleave", event => { if (event.pointerType === "mouse") hideTip(); });
preview.addEventListener("click", event => showTip(event.target.closest("[data-note]")));
preview.addEventListener("blur", hideTip);
preview.addEventListener("keydown", event => {
  if (!["ArrowUp", "ArrowDown"].includes(event.key)) return;
  event.preventDefault();
  const rows = [...source.querySelectorAll("[data-note]")];
  if (!rows.length) return;
  const step = event.key === "ArrowDown" ? 1 : -1;
  const index = Math.max(0, Math.min(rows.length - 1, rows.indexOf(activeRow) + step));
  rows[index].scrollIntoView({block: "nearest", inline: "nearest"});
  showTip(rows[index]);
});
document.addEventListener("keydown", event => { if (event.key === "Escape") hideTip(); });
document.addEventListener("pointerdown", event => { if (!preview.contains(event.target)) hideTip(); });
window.addEventListener("resize", hideTip);
window.addEventListener("scroll", () => {
  if (!activeRow) return;
  const row = activeRow.getBoundingClientRect();
  const panel = preview.getBoundingClientRect();
  if (row.bottom < panel.top || row.top > panel.bottom) hideTip();
  else showTip(activeRow);
}, true);
showFile(files[0]);
})();
