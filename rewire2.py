import re

with open("lessons/earth-science/volcano-simulator.html", "r") as f:
    content = f.read()

# I will replace the entire <div class="ll-stage" ...> ... </aside> with my new Blender layout.

# First, extract the inner HTML of the cards we want to keep
def get_card(title_html):
    pattern = rf'<div class="vs-card">\s*<h3>{title_html}</h3>[\s\S]*?</div>\s*<!--'
    m = re.search(pattern, content)
    if m:
        # We trim the trailing `<!--`
        return m.group(0)[:-4].strip()
    # Alternate search without trailing comment
    pattern2 = rf'<div class="vs-card">\s*<h3>{title_html}</h3>[\s\S]*?</div>'
    m = re.search(pattern2, content)
    return m.group(0) if m else ""

eruptions_card = get_card("Famous Eruptions")
type_card = get_card("Volcano Type")
controls_card = get_card("Eruption Controls")
data_card = get_card("Eruption Data")

# Event desc and photo
desc_photo_match = re.search(r'<!-- Event description -->[\s\S]*?</figure>', content)
desc_photo = desc_photo_match.group(0) if desc_photo_match else ""

# The new HTML structure
new_html = f"""  <div class="ll-stage" id="main-content">
    
    <!-- 3D Canvas (Full Screen) -->
    <div class="volcano-outer" id="vol-outer">
      <canvas id="vol-canvas"></canvas>
      <div class="vol-overlay" style="top: 1rem; left: 1rem;">
        <span class="vol-badge" id="vol-name-badge">🌋 Mt Vesuvius — 79 AD</span>
        <span class="vei-badge" id="vei-badge">VEI 5 · Stratovolcano</span>
      </div>
      
      <div class="drag-hint" style="bottom: 5rem;">Drag to orbit · Scroll to zoom</div>
    </div>

    <!-- Timeline Overlay (Bottom Center) -->
    <div class="timeline-overlay" id="timeline-overlay">
      <div class="tl-labels">
        <span>Pre-eruption</span>
        <span>During Eruption</span>
        <span>Aftermath</span>
      </div>
      <input type="range" id="s-timeline" min="0" max="1" step="0.01" value="0.5" />
    </div>

    <!-- Blender Left Panel -->
    <aside class="blender-panel panel-left">
      {eruptions_card}
      <div class="vs-card" style="margin-top: auto; padding-top: 1rem; border-top: 1px solid rgba(255,120,40,0.2);">
        {desc_photo}
      </div>
    </aside>

    <!-- Blender Right Panel -->
    <aside class="blender-panel panel-right">
      {type_card}
      {controls_card}
      {data_card}
    </aside>
    
  </div>"""

# Replace in content
content = re.sub(r'<div class="ll-stage" id="main-content">.*?</aside>', new_html, content, flags=re.DOTALL)

# Add CSS
css_add = """
    /* Blender Workspace Layout */
    html, body { overflow: hidden; width: 100%; height: 100%; margin: 0; padding: 0; }
    .ll-viewport { display: flex; flex-direction: column; height: 100vh; }
    .ll-stage { flex: 1; position: relative; overflow: hidden; background: #000; }
    
    .vs-hero { display: none; }
    
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
"""
content = re.sub(r'<style>', f'<style>\n{css_add}', content)

with open("lessons/earth-science/volcano-simulator.html", "w") as f:
    f.write(content)

