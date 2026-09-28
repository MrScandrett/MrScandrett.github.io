with open("lessons/earth-science/volcano-simulator.html", "r") as f:
    content = f.read()

old_css = r"position: relative; width: 100%; min-height: 350px; flex-shrink: 0;"
new_css = r"position: relative; width: 100%; height: 350px !important; flex: 0 0 350px !important;"

content = content.replace(old_css, new_css)

with open("lessons/earth-science/volcano-simulator.html", "w") as f:
    f.write(content)
