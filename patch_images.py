import re

html_path = '/home/evanscandrett/Projects/MrScandrett.github.io/lessons/computer-science/graphics-and-games/game-design-thinking.html'
with open(html_path, 'r') as f:
    content = f.read()

grim_img = '''<figure data-zoomable data-lightbox-group="game-design-thinking" style="margin: 0;">
                <img class="artifact-photo" src="https://upload.wikimedia.org/wikipedia/en/b/b5/Grim_Fandango_artwork.jpg" alt="Grim Fandango artwork" loading="lazy">
                <figcaption style="display: none;">Grim Fandango (1998): A masterpiece of adventure game puzzle design, mapped out on paper before a single line of code was written.</figcaption>
              </figure>'''

portal_img = '''<figure data-zoomable data-lightbox-group="game-design-thinking" style="margin: 0;">
                <img class="artifact-photo" src="https://upload.wikimedia.org/wikipedia/en/3/30/Narbacular_drop_gameplay.png" alt="Narbacular Drop gameplay screenshot showing early portal mechanics" loading="lazy">
                <figcaption style="display: none;">Narbacular Drop (2005): The student project that caught Valve's attention and eventually became the award-winning game Portal.</figcaption>
              </figure>'''

# Replace Grim Fandango empty space
content = content.replace(
    '<div class="sketch-head"><span class="sketch-icon">✏️</span><strong>Grim Fandango</strong></div>',
    grim_img + '\n              <div class="sketch-head"><span class="sketch-icon">✏️</span><strong>Grim Fandango</strong></div>'
)

# Replace Portal empty space
content = content.replace(
    '<div class="sketch-head"><span class="sketch-icon">🎓</span><strong>Portal</strong></div>',
    portal_img + '\n              <div class="sketch-head"><span class="sketch-icon">🎓</span><strong>Portal</strong></div>'
)

with open(html_path, 'w') as f:
    f.write(content)
print("Patched images.")
