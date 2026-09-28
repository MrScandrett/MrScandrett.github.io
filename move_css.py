import re

with open("lessons/earth-science/volcano-simulator.html", "r") as f:
    content = f.read()

# Extract my block
pattern = r'    /\* Blender Workspace Layout - Responsive \*/[\s\S]*?    \}\n'
m = re.search(pattern, content)
my_css = m.group(0)

# Remove it from the top
content = content.replace(my_css, "")

# Find the end of the <style> block and inject it there
content = content.replace('  </style>', f'\n{my_css}  </style>')

with open("lessons/earth-science/volcano-simulator.html", "w") as f:
    f.write(content)
