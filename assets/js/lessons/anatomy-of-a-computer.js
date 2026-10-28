"use strict";
const parts = [["CPU", "Central processing unit", "Executes program instructions: arithmetic, comparisons and control. It works with registers and caches, which hold small amounts of data close to the processor.", "A cook following recipe steps. A fast cook still needs ingredients and workspace."], ["RAM", "Random-access memory", "Holds programs and data currently in use. Ordinary system RAM is volatile: its contents are lost when power is removed. Saving copies work to persistent storage.", "A worktable: room to spread out, but not a permanent filing cabinet."], ["Storage", "SSD or hard disk", "Keeps files, apps and the operating system when power is off. An SSD uses flash memory; a hard disk uses spinning magnetic platters. Storage capacity and RAM capacity are different.", "A pantry holding ingredients between cooking sessions."], ["GPU", "Graphics processing unit", "Performs many operations in parallel, including drawing graphics. GPUs also help with some scientific and AI tasks. A GPU may be integrated with the CPU and share RAM, or be a separate component.", "A team handling many similar jobs together."], ["Motherboard", "Connections and coordination", "The main circuit board connects components through sockets, traces and buses. Chips and controllers help components exchange data. In phones and some laptops, many functions share one chip.", "The connected roads and workstations of a kitchen."], ["Power & cooling", "Energy in, heat out", "A power supply or battery provides electrical energy. Heatsinks, fans or other cooling move heat away. Not every device has a fan.", "Electricity runs the kitchen; ventilation carries away heat."], ["Input / output", "Communicating with people", "Keyboards, microphones and sensors provide input. Screens, speakers and printers provide output. A touchscreen does both. Ports connect peripherals.", "Orders come in; meals go out."], ["Network adapter", "Connecting to a network", "Wi-Fi or Ethernet hardware sends and receives data on a network. A router forwards packets between networks. A modem or other access device connects to an internet provider, depending on the service.", "The delivery entrance linking this kitchen to other places."]];
document.querySelectorAll('[data-part]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-part]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  const part = parts[Number(button.dataset.part)];
  const panel = document.getElementById('part-detail');
  panel.replaceChildren();
  const heading = document.createElement('h3'); heading.textContent = `${part[0]} · ${part[1]}`;
  const text = document.createElement('p'); text.textContent = part[2];
  const analogy = document.createElement('p'); analogy.textContent = `Kitchen analogy: ${part[3]}`;
  panel.append(heading, text, analogy);
}));
let ram = '', saved = '', revision = 0;
const memoryState = document.getElementById('memory-state');
function showMemory(note) {
  memoryState.replaceChildren();
  for (const line of [`RAM: ${ram || 'empty'}`, `Storage: ${saved || 'no saved file'}`]) {
    const p = document.createElement('p'); p.textContent = line; memoryState.append(p);
  }
  document.getElementById('memory-note').textContent = note;
}
document.getElementById('edit').addEventListener('click', () => { ram = `My computer story, draft ${++revision}.`; showMemory('Edited in RAM. Storage has not changed.'); });
document.getElementById('save').addEventListener('click', () => { if (!ram) { showMemory('Write or open a document first; there is no working document to save.'); return; } saved = ram; showMemory('Saved a copy to persistent storage.'); });
document.getElementById('power').addEventListener('click', () => { ram = ''; showMemory('RAM cleared. Only the saved version survives in this model.'); });
document.getElementById('load').addEventListener('click', () => { if (!saved) { showMemory('There is no saved file to open.'); return; } ram = saved; showMemory('Copied the saved file into RAM to work on it.'); });
document.getElementById('reset-memory').addEventListener('click', () => { ram = ''; saved = ''; revision = 0; showMemory('Model reset. Try writing without saving, then power off.'); });
const steps = [["Input and browser", "You enter a URL. The browser is an application running on your device, using CPU time and RAM."], ["Find an address with DNS", "The browser or OS checks caches or asks a DNS resolver for records that help find the server address for the domain. DNS does not deliver the webpage itself."], ["Travel across networks", "Your network adapter sends data over Wi-Fi or Ethernet. A router forwards packets toward your internet provider and other networks. Different packets can take different routes."], ["Connect securely and request", "For HTTPS, the browser and server establish an encrypted connection and the browser sends an HTTP request. This simplified sequence leaves out protocol details."], ["The server responds", "A server processes the request and sends response data in packets. The server may use its own CPU, RAM, storage and other services."], ["Build the page", "Your device receives data. The browser interprets HTML and CSS, may run JavaScript, and requests more resources. CPU and GPU work help display the page; RAM holds working data."], ["Save a local copy", "Downloading and saving writes a file to your device\u2019s storage. That local file may open offline; online features and additional remote resources may still need internet."]];
let step = 0;
function showStep() {
  document.getElementById('journey-count').textContent = `Step ${step + 1} of ${steps.length}`;
  document.getElementById('journey-title').textContent = steps[step][0];
  document.getElementById('journey-text').textContent = steps[step][1];
  document.getElementById('previous').disabled = step === 0;
  document.getElementById('next').disabled = step === steps.length - 1;
}
document.getElementById('previous').addEventListener('click', () => { step = Math.max(0, step - 1); showStep(); });
document.getElementById('next').addEventListener('click', () => { step = Math.min(steps.length - 1, step + 1); showStep(); });
document.getElementById('restart').addEventListener('click', () => { step = 0; showStep(); });
showStep();
const answers = [0, 1, 0, 1, 0];
const explanations = ['RAM is volatile; saved storage persists.', 'The OS manages memory, files and devices.', 'Wi-Fi connects a local network, which may have no internet connection.', 'A server returns webpage data; DNS helps find its address.', 'Saving writes a persistent copy to storage.'];
document.getElementById('anatomy-quiz').addEventListener('submit', event => {
  event.preventDefault(); const data = new FormData(event.currentTarget); let score = 0; const feedback = [];
  answers.forEach((answer, i) => { if (data.get(`q${i}`) === String(answer)) score++; else feedback.push(`Question ${i + 1}: ${explanations[i]}`); });
  document.getElementById('quiz-result').textContent = `${score} of ${answers.length} correct. ${feedback.length ? feedback.join(' ') + ' Revise your answers and try again.' : 'Now explain your reasoning to a partner.'}`;
});
