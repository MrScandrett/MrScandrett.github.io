import re

with open("lessons/earth-science/volcano-simulator.html", "r") as f:
    content = f.read()

old_mobile = r"""    @media \(max-width: 959px\) \{[\s\S]*?\}"""

new_mobile = r"""    @media (max-width: 959px) {
      body { overflow-x: hidden; background: #060308; }
      .ll-viewport { display: flex; flex-direction: column; min-height: 100vh; }
      
      .ll-stage { display: flex; flex-direction: column; padding: 1rem; gap: 1rem; overflow-y: auto; overflow-x: hidden; }
      
      .volcano-outer {
        position: relative; width: 100%; min-height: 350px; flex-shrink: 0;
        border-radius: 12px; border: 1px solid rgba(255,120,40,0.2);
        background: #000; overflow: hidden;
      }
      .vol-overlay { position: absolute; top: 1rem; left: 1rem; display: flex; flex-direction: column; gap: 0.5rem; z-index: 10; pointer-events: none;}
      
      .timeline-overlay {
        position: relative; width: 100%; bottom: auto; left: auto; right: auto; transform: none; z-index: 10;
        background: rgba(8, 4, 2, 0.85); border: 1px solid rgba(255,120,40,0.3);
        padding: 1rem; border-radius: 12px; margin-top: -0.5rem; box-sizing: border-box;
      }
      
      .blender-panel {
        position: relative; width: 100%; top: auto; bottom: auto; left: auto; right: auto;
        background: rgba(8, 4, 2, 0.6); border: 1px solid rgba(255,120,40,0.2); border-radius: 12px;
        padding: 1.2rem; display: flex; flex-direction: column; box-sizing: border-box;
      }
      
      /* Ensure canvas remains absolute inside relative container */
      #vol-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
      .drag-hint { bottom: 1rem !important; }
    }"""

content = re.sub(old_mobile, new_mobile, content)

with open("lessons/earth-science/volcano-simulator.html", "w") as f:
    f.write(content)
