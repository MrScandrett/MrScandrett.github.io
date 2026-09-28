import re

with open("lessons/earth-science/volcano-simulator.html", "r") as f:
    content = f.read()

captions = {
    'vesuvius79': "A dramatic painting of the eruption of Mount Vesuvius in 79 AD. The massive Plinian column and pyroclastic surges devastated Pompeii.",
    'tambora1815': "Mount Tambora's 1815 eruption remains the largest in recorded human history. It caused a global volcanic winter.",
    'krakatoa1883': "A contemporary lithograph of the 1883 eruption of Krakatoa, which collapsed the island and generated massive tsunamis.",
    'sthelenr1980': "The spectacular ash column from the May 18, 1980 eruption of Mount St. Helens, following its catastrophic lateral blast.",
    'pinatubo1991': "The explosive 1991 eruption of Mount Pinatubo in the Philippines. It injected millions of tons of sulfur dioxide into the stratosphere.",
    'eyja2010': "Eyjafjallajökull's 2010 subglacial eruption mixed glacial meltwater with magma, creating a fine ash that grounded European aviation.",
    'maunaloa2022': "Mauna Loa's 2022 eruption featured incredible lava fountains and flows of highly fluid basalt down its massive shield slopes.",
    'yellowstone': "The Grand Prismatic Spring at Yellowstone National Park. The park sits atop a massive caldera capable of supereruptions."
}

for eid, caption in captions.items():
    # Find the line starting with { id:'eid' and add photoCaption to it
    pattern = rf"({{ id:'{eid}'.*?pyro:\d+),"
    replacement = rf"\1, photoCaption: \"{caption}\","
    content = re.sub(pattern, replacement, content)

with open("lessons/earth-science/volcano-simulator.html", "w") as f:
    f.write(content)
