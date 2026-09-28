with open("lessons/earth-science/volcano-simulator.html", "r") as f:
    content = f.read()

import re
old_html = r'<div class="event-desc" id="event-desc">[\s\S]*?</div>'
new_html = r'''<div class="event-desc" id="event-desc">
      </div>
      <figure id="event-photo-container" data-zoomable style="margin-top: 1rem; margin-bottom: 0; display: none;">
        <img id="event-photo" src="" alt="Event visualization" style="width: 100%; border-radius: 4px; object-fit: cover; max-height: 200px;">
        <figcaption id="event-photo-caption" style="display:none;"></figcaption>
      </figure>'''

content = re.sub(old_html, new_html, content)

with open("lessons/earth-science/volcano-simulator.html", "w") as f:
    f.write(content)
