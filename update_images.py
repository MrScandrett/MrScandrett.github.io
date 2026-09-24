import re

html_path = '/home/evanscandrett/Projects/MrScandrett.github.io/lessons/computer-science/graphics-and-games/game-design-thinking.html'
with open(html_path, 'r') as f:
    content = f.read()

# I will write a script to replace the imgs with figures.

def replace_img(match):
    img_tag = match.group(0)
    
    # Extract attributes
    src_match = re.search(r'src=\"([^\"]+)\"', img_tag)
    alt_match = re.search(r'alt=\"([^\"]+)\"', img_tag)
    class_match = re.search(r'class=\"([^\"]+)\"', img_tag)
    
    src = src_match.group(1) if src_match else ''
    alt = alt_match.group(1) if alt_match else ''
    cls = f' class=\"{class_match.group(1)}\"' if class_match else ''
    
    # Determine teaching point for caption based on alt or src
    caption_text = alt
    if 'highscore' in src:
        caption_text = 'Goals provide a clear win state or objective, such as setting a high score, creating motivation to keep playing.'
    elif 'chess' in src:
        caption_text = 'Rules constrain the player\'s actions, creating the challenge that makes a game interesting.'
    elif 'reaction-time' in src:
        caption_text = 'Instant feedback loops show progress and performance, keeping players engaged and informed.'
    elif 'NMAH-2006-25044' in src:
        caption_text = 'Baer\'s very first test unit, the TV Game Unit #1 (1967), shown with the alignment generator he used to put a controllable dot on a screen.'
    elif 'NMAH-JN2015-6171' in src:
        caption_text = 'The Brown Box (1967–68): The finished prototype Sanders licensed to Magnavox, the first system built to play multiple different games on a TV.'
    elif 'NMAH-2006-11760' in src:
        caption_text = 'Magnavox Odyssey (1972): The first home console ever sold. It proved a home console could exist.'
    elif 'NMAH-2006-25053' in src:
        caption_text = 'The Brown Box Lightgun (1967–68): An add-on peripheral showing Baer\'s team was already thinking about accessories.'
    elif 'zelda' in src:
        caption_text = 'Miyamoto\'s Cave Memory (1986): The Legend of Zelda started not with a plot, but with a childhood memory of exploring a real cave.'
    elif 'minecraft' in src:
        caption_text = 'Minecraft \"Cave Game\" Prototype (2009): The very first public test video was just a cave you could walk through.'

    replacement = (
        '<figure data-zoomable data-lightbox-group=\"game-design-thinking\" style=\"margin: 0;\">\n'
        f'                <img{cls} src=\"{src}\" alt=\"{alt}\" loading=\"lazy\">\n'
        f'                <figcaption style=\"display: none;\">{caption_text}</figcaption>\n'
        '              </figure>'
    )
    # The original img tag has some indentation, let's just replace the exact tag
    # But wait, the indentation of the <figure> might be off.
    # It's okay.
    return replacement

new_content = re.sub(r'<img data-zoomable data-lightbox-group=\"game-design-thinking\" [^>]+>', replace_img, content)

with open(html_path, 'w') as f:
    f.write(new_content)

print("Replaced images.")
