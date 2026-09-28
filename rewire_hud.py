import re

with open("lessons/earth-science/volcano-simulator.html", "r") as f:
    content = f.read()

# 1. CSS rewires
# We want to force body to overflow hidden and use absolute positioning for Blender-like UI
css_add = """
    /* Blender Workspace Layout */
    html, body { overflow: hidden; width: 100%; height: 100%; margin: 0; padding: 0; }
    .ll-viewport { display: flex; flex-direction: column; height: 100vh; }
    .ll-stage { flex: 1; position: relative; overflow: hidden; display: block; }
    
    .vs-hero { display: none; /* Hide hero text to maximize app space */ }
    .vs-wrap { display: block; padding: 0; margin: 0; max-width: none; }
    
    .volcano-outer {
      position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important;
      border-radius: 0 !important; border: none !important; aspect-ratio: auto !important;
    }
    
    .hud-panel {
      position: absolute; top: 1rem; bottom: 5.5rem; width: 340px;
      background: rgba(8, 4, 2, 0.85); backdrop-filter: blur(10px);
      border: 1px solid rgba(255,120,40,0.2); border-radius: 12px;
      display: flex; flex-direction: column; overflow-y: auto;
      z-index: 10; box-shadow: 0 16px 40px rgba(0,0,0,0.6);
      padding: 1rem;
    }
    .hud-left { left: 1rem; }
    .hud-right { right: 1rem; }
    
    .timeline-overlay {
      position: absolute !important; bottom: 1rem !important; left: 50% !important; transform: translateX(-50%) !important;
      width: clamp(400px, 60vw, 800px) !important; z-index: 10;
      background: rgba(8, 4, 2, 0.85) !important; border: 1px solid rgba(255,120,40,0.2) !important;
    }
    
    /* Scrollbar styling for panels */
    .hud-panel::-webkit-scrollbar { width: 6px; }
    .hud-panel::-webkit-scrollbar-thumb { background: rgba(255,120,40,0.3); border-radius: 3px; }
    
    .vs-hud-panel, .vs-panel { display: contents; } /* Strip old containers */
    .vs-card { margin-bottom: 1rem; background: transparent; padding: 0; border: none; box-shadow: none; }
    .vs-card h3 { font-size: 0.85rem; border-bottom: 1px solid rgba(255,120,40,0.3); padding-bottom: 0.4rem; margin-bottom: 0.8rem; }
"""

# Insert CSS right after <style>
content = re.sub(r'<style>', f'<style>\n{css_add}', content)

# 2. HTML rewires
# We need to extract the controls and readouts into the Left and Right HUD panels.
# Left Panel: Famous Eruptions, Event Description, Photo
# Right Panel: Volcano Type, Eruption Controls, Readouts

# Let's completely replace the DOM structure inside `.ll-sim` and `.vs-hud-panel`
# First, find everything between `<div class="ll-sim">` and `<!-- THREE.JS -->` (or `<script>`)

old_dom_regex = r'<div class="ll-sim">.*?(?=<script src="../../assets/js/sim-kit.js">)'
# Wait, `re.DOTALL` is needed.
