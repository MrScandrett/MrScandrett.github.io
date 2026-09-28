import re

with open("lessons/earth-science/volcano-simulator.html", "r") as f:
    content = f.read()

content = content.replace("const texLoader = new THREE.TextureLoader();\n    function fetchColormap(id)", "const imgTexLoader = new THREE.TextureLoader();\n    function fetchColormap(id)")
content = content.replace("texLoader.load(`../../assets/images/lessons/volcano-simulator/${id}-color.jpg`", "imgTexLoader.load(`../../assets/images/lessons/volcano-simulator/${id}-color.jpg`")

with open("lessons/earth-science/volcano-simulator.html", "w") as f:
    f.write(content)
