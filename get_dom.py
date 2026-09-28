import re

with open("lessons/earth-science/volcano-simulator.html", "r") as f:
    content = f.read()

m = re.search(r'(<div class="ll-sim">.*?</aside>)', content, re.DOTALL)
if m:
    with open("dom_chunk.html", "w") as out:
        out.write(m.group(1))
    print("Extracted dom_chunk.html")
else:
    print("Could not match DOM")
