const ROWS = 5, COLS = 6, SIZE = ROWS * COLS;
let cells = new Array(SIZE).fill(0);
let generation = 0;
let interval = null;
let diceValue = 1;

const grid = document.getElementById('grid');
const genSpan = document.getElementById('generation');
const diceSpan = document.getElementById('dice');

function makeGrid(){
  grid.innerHTML = '';
  for(let i=0;i<SIZE;i++){
    const d = document.createElement('div');
    d.className = 'cell';
    d.dataset.idx = i;
    d.addEventListener('click', ()=>{
      cells[i] = cells[i] ? 0 : 1;
      render();
    });
    grid.appendChild(d);
  }
}

function render(){
  for(let i=0;i<SIZE;i++){
    const el = grid.children[i];
    if(cells[i]) el.classList.add('alive'); else el.classList.remove('alive');
  }
  genSpan.textContent = 'Gen: ' + generation;
  diceSpan.textContent = diceValue;
}

function neighbors(idx){
  const r = Math.floor(idx / COLS), c = idx % COLS;
  let count = 0;
  for(let dr=-1; dr<=1; dr++){
    for(let dc=-1; dc<=1; dc++){
      if(dr===0 && dc===0) continue;
      const nr = r + dr, nc = c + dc;
      if(nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
      const nidx = nr * COLS + nc;
      if(cells[nidx]) count++;
    }
  }
  return count;
}

function step(){
  const next = new Array(SIZE).fill(0);
  for(let i=0;i<SIZE;i++){
    const n = neighbors(i);
    if(cells[i]) next[i] = (n===2 || n===3) ? 1 : 0;
    else next[i] = (n===3) ? 1 : 0;
  }
  cells = next;
  generation++;
  render();
}

document.getElementById('start').addEventListener('click', ()=>{
  if(interval) return;
  interval = setInterval(()=> step(), 400);
  document.getElementById('start').disabled = true;
  document.getElementById('stop').disabled = false;
});
document.getElementById('stop').addEventListener('click', ()=>{
  clearInterval(interval); interval = null;
  document.getElementById('start').disabled = false;
  document.getElementById('stop').disabled = true;
});
document.getElementById('step').addEventListener('click', ()=>{
  for(let i=0;i<diceValue;i++) step();
});
document.getElementById('randomize').addEventListener('click', ()=>{
  for(let i=0;i<SIZE;i++) cells[i] = Math.random() < 0.3 ? 1 : 0;
  generation = 0; render();
});
document.getElementById('clear').addEventListener('click', ()=>{
  cells.fill(0); generation = 0; render();
});
document.getElementById('roll').addEventListener('click', ()=>{
  diceValue = Math.floor(Math.random() * 4) + 1;
  diceSpan.textContent = diceValue;
});

makeGrid();
render();
