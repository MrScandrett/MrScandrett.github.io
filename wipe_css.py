with open("lessons/earth-science/volcano-simulator.html", "r") as f:
    lines = f.readlines()

out = []
skip = False
for line in lines:
    if "/* Blender Workspace Layout - Responsive */" in line:
        skip = True
        
    if skip and "body { background: #060308" in line:
        skip = False
        
    if not skip:
        out.append(line)

new_css = """    /* Blender Workspace Layout - Responsive */
    .vs-hero { display: none; }
    
    @media (min-width: 960px) {
      html, body { overflow: hidden; width: 100%; height: 100%; margin: 0; padding: 0; }
      .ll-viewport { display: flex; flex-direction: column; height: 100vh; }
      .ll-stage { flex: 1; position: relative; overflow: hidden; background: #000; }
      
      .volcano-outer {
        position: absolute; inset: 0; width: 100%; height: 100%;
        border-radius: 0; border: none; aspect-ratio: auto; box-shadow: none;
      }
      
      .blender-panel {
        position: absolute; top: 1rem; bottom: 5rem; width: 340px;
        background: rgba(8, 4, 2, 0.82); backdrop-filter: blur(12px);
        border: 1px solid rgba(255,120,40,0.25); border-radius: 12px;
        display: flex; flex-direction: column; overflow-y: auto; overflow-x: hidden;
        z-index: 10; box-shadow: 0 16px 40px rgba(0,0,0,0.8);
        padding: 1.2rem;
      }
      .panel-left { left: 1rem; }
      .panel-right { right: 1rem; }
      
      .blender-panel::-webkit-scrollbar { width: 6px; }
      .blender-panel::-webkit-scrollbar-thumb { background: rgba(255,120,40,0.3); border-radius: 3px; }
      
      .timeline-overlay {
        position: absolute; bottom: 1rem; left: 50%; transform: translateX(-50%);
        width: clamp(400px, 60vw, 800px); z-index: 10;
        background: rgba(8, 4, 2, 0.85); border: 1px solid rgba(255,120,40,0.3);
        padding: 1rem 1.5rem; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.7);
      }
    }

    @media (max-width: 959px) {
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
      
      #vol-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
      .drag-hint { bottom: 1rem !important; }
    }
"""

content_str = "".join(out)
content_str = content_str.replace("<style>\n", f"<style>\n{new_css}\n")

with open("lessons/earth-science/volcano-simulator.html", "w") as f:
    f.write(content_str)
