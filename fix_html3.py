import re

with open("dom_chunk.html", "r") as f:
    orig = f.read()

def get_card_greedy(title):
    # This matches the full vs-card by matching <div class="vs-card"> and ending at </div> that is followed by the next <!-- or </div>
    pattern = rf'<div class="vs-card">\s*<h3>{title}</h3>[\s\S]*?<!-- '
    m = re.search(pattern, orig)
    if m:
        return m.group(0)[:-5].strip()
    # Or ending at </div>\n    </div><!-- .vs-panel -->
    pattern2 = rf'<div class="vs-card">\s*<h3>{title}</h3>[\s\S]*?</div>\s*<!--'
    m = re.search(pattern2, orig)
    if m:
        return m.group(0)[:-4].strip()
    return ""

eruptions = get_card_greedy("Famous Eruptions")
vtype = get_card_greedy("Volcano Type")
controls = get_card_greedy("Eruption Controls")

# For Eruption Data, we know it ends with <!-- Event description -->
pattern_data = r'<div class="vs-card">\s*<h3>Eruption Data</h3>[\s\S]*?<!-- Event description -->'
m = re.search(pattern_data, orig)
data = m.group(0).replace('<!-- Event description -->', '').strip() if m else ""

# Desc and photo
pattern_desc = r'<!-- Event description -->[\s\S]*?</figure>'
m = re.search(pattern_desc, orig)
desc_photo = m.group(0) if m else ""

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
      {eruptions}
      <div class="vs-card" style="margin-top: auto; padding-top: 1rem; border-top: 1px solid rgba(255,120,40,0.2);">
        {desc_photo}
      </div>
    </aside>

    <!-- Blender Right Panel -->
    <aside class="blender-panel panel-right">
      {vtype}
      {controls}
      {data}
    </aside>
    
  </div><!-- .ll-stage -->

</div><!-- .ll-viewport -->"""

# Now replace from <div class="ll-stage" id="main-content"> down to </div><!-- .ll-viewport --> in the actual file
with open("lessons/earth-science/volcano-simulator.html", "r") as f:
    content = f.read()

content = re.sub(r'<div class="ll-stage" id="main-content">.*</div><!-- \.ll-viewport -->', new_html, content, flags=re.DOTALL)

with open("lessons/earth-science/volcano-simulator.html", "w") as f:
    f.write(content)
