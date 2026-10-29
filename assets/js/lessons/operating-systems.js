/* Deliberately bounded in-memory teaching shell. Never executes system commands. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const platforms = {
    mac: {name:'macOS with zsh',home:'/Users/student',open:'Press Command–Space, type Terminal, and open the Terminal app.'},
    windows: {name:'Windows with PowerShell',home:'C:\\Users\\student',open:'Search Start for PowerShell and open it normally, or choose a PowerShell tab in Windows Terminal. Do not choose Run as administrator.'},
    linux: {name:'Linux with Bash',home:'/home/student',open:'Find Terminal in your app launcher. On Ubuntu, Ctrl–Alt–T commonly opens it. Check your distribution if it uses another shell.'}
  };
  let cwd, dirs, files, completed, history = [], historyIndex = 0;
  const win = () => $('os').value === 'windows';
  const rows = () => [
    ['Where am I?', win()?'Get-Location':'pwd','Read-only: shows the current directory.'],
    ['List contents',win()?'Get-ChildItem':'ls','Read-only: shows visible entries.'],
    ['Enter Documents',win()?'Set-Location Documents':'cd Documents','Changes your shell’s working directory, not files.'],
    ['Create a directory',win()?'New-Item -ItemType Directory PracticeLab':'mkdir PracticeLab','Creates a new practice directory.'],
    ['Enter that directory','cd PracticeLab','cd also works in PowerShell.'],
    ['Create an empty file',win()?'New-Item -ItemType File notes.txt':'touch notes.txt','Use a fresh name. Unix touch updates timestamps if the file already exists; PowerShell reports an existing file without -Force.'],
    ['Move to the parent','cd ..','One level up.'],
    ['Return home',win()?'cd $HOME':'cd ~','Your personal home, not the filesystem root.'],
    ['Copy a practice file',win()?'Copy-Item notes.txt notes-copy.txt':'cp notes.txt notes-copy.txt','Real shell only: check the destination first; a copy can replace existing content.'],
    ['Rename a practice file',win()?'Rename-Item notes-copy.txt notes-v2.txt':'mv notes-copy.txt notes-v2.txt','Real shell only: check source and destination before changing anything.'],
    ['Read a text file',win()?'Get-Content notes.txt':'cat notes.txt','Real shell only: prints file contents; an empty file has no text.'],
    ['Get help',win()?'Get-Help Get-ChildItem':'man ls',win()?'Local help may be partial; consult Microsoft documentation too.':'Use q to leave the manual viewer.']
  ];
  function path() { const p=platforms[$('os').value]; return p.home+(cwd.length?(win()?'\\':'/')+cwd.join(win()?'\\':'/'):''); }
  function prompt() { return win()?`PS ${path()}> `:`student:${path()}$ `; }
  function write(s) { $('terminal-output').textContent += s+'\n'; $('terminal-output').scrollTop=$('terminal-output').scrollHeight; }
  function reset() {
    cwd=[]; dirs=new Set(['','Documents']);files=new Set();completed=new Set();history=[];historyIndex=0;
    $('terminal-output').textContent='Practice session. No commands reach your computer.\n';$('terminal-status').textContent='0 / 6 mission steps complete.';$('command').value='';
  }
  function buildPrompt() { $('ai-prompt').value=`I am a beginner using ${platforms[$('os').value].name}. My goal: ${$('goal').value.trim() || 'organize my practice files'}. I am working in a new empty folder I own; ask me to confirm its path first. Give one command at a time. Explain every argument and option, expected output, affected paths, and whether it writes, overwrites or deletes. Start with a read-only check. Use no administrator access, downloads, recursive deletion or force flags. Show how I can verify the result in my file manager. If you are unsure about my shell or file locations, ask rather than guess.`; }
  function update() {
    $('open-terminal').textContent=platforms[$('os').value].open;
    $('commands').replaceChildren(...rows().map(row => {const tr=document.createElement('tr');row.forEach((text,i)=>{const td=document.createElement('td');const el=i===1?document.createElement('code'):document.createElement('span');el.textContent=text;td.append(el);tr.append(td);});return tr;}));
    buildPrompt(); reset();
  }
  function run(raw) {
    // Restricted grammar: one supported verb, fixed options and a simple quoted or unquoted name.
    if (/[;|&<>`\n\r]/.test(raw)) return 'This simulator accepts one simple command at a time; operators and scripts are not supported.';
    const tokens=raw.match(/"[^"]*"|'[^']*'|\S+/g)||[];
    if(tokens.some(t=>(t.startsWith('"')&&!t.endsWith('"'))||(t.startsWith("'")&&!t.endsWith("'")))) return 'Close both quotes and try again.';
    const args=tokens.map(t=>t.replace(/^(["'])(.*)\1$/,'$2'));const cmd=args.shift();
    if(!cmd) return '';
    const key=n=>[...cwd,n].join('/');
    if ((cmd==='pwd'&&!win()||cmd==='Get-Location'&&win())&&args.length===0) return path();
    if ((cmd==='ls'&&!win()||cmd==='Get-ChildItem'&&win())&&args.length===0) {
      const prefix=cwd.length?cwd.join('/')+'/':'';
      const list=[...dirs].filter(x=>x.startsWith(prefix)&&x!==cwd.join('/')&&!x.slice(prefix.length).includes('/')).map(x=>x.slice(prefix.length)+'/');
      list.push(...[...files].filter(x=>x.startsWith(prefix)&&!x.slice(prefix.length).includes('/')).map(x=>x.slice(prefix.length)));
      if(files.has('Documents/PracticeLab/notes.txt')&&cwd.join('/')==='Documents/PracticeLab')completed.add('list');
      return list.join('\n')||'(empty directory)';
    }
    if((cmd==='cd'||cmd==='Set-Location'&&win())&&args.length===1) {
      const name=args[0];
      if(name===(win()?'$HOME':'~'))cwd=[];
      else if(name==='..'){if(cwd.join('/')==='Documents/PracticeLab'&&completed.has('list'))completed.add('return');cwd.pop();}
      else if(name==='.')return path();
      else if(dirs.has(key(name))){cwd.push(name);if(cwd.join('/')==='Documents')completed.add('documents');if(cwd.join('/')==='Documents/PracticeLab')completed.add('enter');}
      else return 'Directory not found. List this location and check spelling and quotes. This simulator supports one directory name at a time.';
      return path();
    }
    let kind,name;
    if(!win()&&cmd==='mkdir'&&args.length===1){kind='directory';name=args[0];}
    if(!win()&&cmd==='touch'&&args.length===1){kind='file';name=args[0];}
    if(win()&&cmd==='New-Item'&&args.length===3&&args[0]==='-ItemType'&&['Directory','File'].includes(args[1])){kind=args[1].toLowerCase();name=args[2];}
    if(kind){
      if(!/^[a-zA-Z0-9][a-zA-Z0-9 ._-]*$/.test(name)||name.endsWith('.'))return 'Use a simple practice name: letters, numbers, spaces, hyphens, underscores and an extension.';
      const full=key(name);if(dirs.has(full)||files.has(full))return 'That name already exists. Nothing changed; choose a new name.';
      (kind==='directory'?dirs:files).add(full);
      if(kind==='directory'&&full==='Documents/PracticeLab')completed.add('create');
      if(kind==='file'&&full==='Documents/PracticeLab/notes.txt')completed.add('file');
      return `Created ${kind}: ${name}`;
    }
    if((cmd==='clear'&&!win()||cmd==='Clear-Host'&&win())&&args.length===0){$('terminal-output').textContent='';return 'Display cleared; practice files are unchanged.';}
    return 'Not supported here. Use the selected reference’s navigation and creation commands. Copy, rename, reading, help, absolute paths and deletion are outside this small simulator.';
  }
  $('terminal-form').addEventListener('submit',e=>{e.preventDefault();const raw=$('command').value.trim();if(!raw)return;history.push(raw);historyIndex=history.length;write(prompt()+raw);write(run(raw));$('command').value='';$('terminal-status').textContent=completed.size===6?'6 / 6 — Mission complete! Explain how your location changed to a partner.':`${completed.size} / 6 mission steps complete.`;});
  $('command').addEventListener('keydown',e=>{if(e.key==='ArrowUp'&&history.length){e.preventDefault();historyIndex=Math.max(0,historyIndex-1);e.target.value=history[historyIndex];}if(e.key==='ArrowDown'){e.preventDefault();historyIndex=Math.min(history.length,historyIndex+1);e.target.value=history[historyIndex]||'';}});
  $('os').addEventListener('change',update);$('reset-terminal').addEventListener('click',reset);$('build-prompt').addEventListener('click',buildPrompt);
  $('quiz').addEventListener('submit',e=>{e.preventDefault();const data=new FormData(e.target);const explanations=['cd .. moves to the parent.','Match the shell and verify effects.','A new extension does not convert data.','Check location, targets and effects first.'];let score=0;const feedback=[];['a','b','b','a'].forEach((answer,i)=>{if(data.get('q'+(i+1))===answer)score++;else feedback.push(`${i+1}: ${explanations[i]}`);});$('quiz-result').textContent=`${score} / 4. `+(score===4?'Ready for your partner demonstration.':feedback.join(' '));});
  update();
})();
