import re

file_path = '/home/evanscandrett/Projects/MrScandrett.github.io/lessons/humanities/the-ages.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    (
        r'<figcaption><a href="https://commons\.wikimedia\.org/wiki/File:Acheulean_implements\._Flint\._Abbeville,_St_Acheul\._Neues_Museum\.jpg"[^>]*>Acheulean flint tools.*?</a></figcaption>',
        r'<figcaption><strong>Acheulean hand axes</strong> Early hominins shaped these versatile flint tools, marking a cognitive leap in deliberate design.<br><a href="https://commons.wikimedia.org/wiki/File:Acheulean_implements._Flint._Abbeville,_St_Acheul._Neues_Museum.jpg" target="_blank" rel="noopener" style="font-size: 0.8em; opacity: 0.8;">Acheulean flint tools · Ismoon · CC BY-SA 4.0</a></figcaption>'
    ),
    (
        r'<figcaption><a href="https://commons\.wikimedia\.org/wiki/File:Lascaux_painting\.jpg"[^>]*>Lascaux cave art.*?</a></figcaption>',
        r'<figcaption><strong>Lascaux cave art</strong> Paleolithic cave art reveals a capacity for symbolic thinking and the passing down of cultural knowledge.<br><a href="https://commons.wikimedia.org/wiki/File:Lascaux_painting.jpg" target="_blank" rel="noopener" style="font-size: 0.8em; opacity: 0.8;">Lascaux cave art · Prof saxx · CC BY-SA 3.0</a></figcaption>'
    ),
    (
        r'<figcaption><a href="https://commons\.wikimedia\.org/wiki/File:Neolithic_Stone_Sickle\.jpg"[^>]*>Neolithic harvesting sickle.*?</a></figcaption>',
        r'<figcaption><strong>Neolithic harvesting sickle</strong> Stone sickles allowed early farmers to harvest grain efficiently, enabling the shift from foraging to settled agriculture.<br><a href="https://commons.wikimedia.org/wiki/File:Neolithic_Stone_Sickle.jpg" target="_blank" rel="noopener" style="font-size: 0.8em; opacity: 0.8;">Neolithic harvesting sickle · Gary Todd · CC0</a></figcaption>'
    ),
    (
        r'<figcaption><a href="https://commons\.wikimedia\.org/wiki/File:Bronze_age_1700-1200BC_IMG_1017_bronze_axe\.JPG"[^>]*>Bronze axe.*?</a></figcaption>',
        r'<figcaption><strong>Bronze axe</strong> Melting and casting copper and tin into bronze revolutionized tools with stronger, reusable metal.<br><a href="https://commons.wikimedia.org/wiki/File:Bronze_age_1700-1200BC_IMG_1017_bronze_axe.JPG" target="_blank" rel="noopener" style="font-size: 0.8em; opacity: 0.8;">Bronze axe · Bjoertvedt · CC BY-SA 4.0</a></figcaption>'
    ),
    (
        r'<figcaption><a href="https://commons\.wikimedia\.org/wiki/File:AbbottPapyrus-BritishMuseum-August21-08\.jpg"[^>]*>Abbott Papyrus.*?</a></figcaption>',
        r'<figcaption><strong>Abbott Papyrus</strong> Papyrus documents recorded everything from court proceedings to medical texts, allowing complex states to administer vast territories.<br><a href="https://commons.wikimedia.org/wiki/File:AbbottPapyrus-BritishMuseum-August21-08.jpg" target="_blank" rel="noopener" style="font-size: 0.8em; opacity: 0.8;">Abbott Papyrus · Captmondo · CC BY-SA 3.0</a></figcaption>'
    ),
    (
        r'<figcaption><a href="https://commons\.wikimedia\.org/wiki/File:Early_Iron_Age_swords,_Denmark\.jpg"[^>]*>Early Iron Age swords.*?</a></figcaption>',
        r'<figcaption><strong>Early Iron Age swords</strong> Iron was harder to smelt than bronze, but its abundance democratized tools and weapons, fundamentally changing ancient societies.<br><a href="https://commons.wikimedia.org/wiki/File:Early_Iron_Age_swords,_Denmark.jpg" target="_blank" rel="noopener" style="font-size: 0.8em; opacity: 0.8;">Early Iron Age swords · John Lee / National Museum of Denmark · CC BY-SA 4.0</a></figcaption>'
    ),
    (
        r'<figcaption><a href="https://commons\.wikimedia\.org/wiki/File:Sarcophagus_of_Ahiram_detail\.jpg"[^>]*>Ahiram inscription.*?</a></figcaption>',
        r'<figcaption><strong>Ahiram inscription</strong> The Phoenician alphabet used symbols for sounds rather than concepts, a simplified system that made literacy far more accessible.<br><a href="https://commons.wikimedia.org/wiki/File:Sarcophagus_of_Ahiram_detail.jpg" target="_blank" rel="noopener" style="font-size: 0.8em; opacity: 0.8;">Ahiram inscription · Emna Mizouni / Elias Ziade · CC BY-SA 4.0</a></figcaption>'
    ),
    (
        r'<figcaption><a href="https://commons\.wikimedia\.org/wiki/File:Ancient_Theatre_of_the_Asklepieion_at_Epidaurus\.jpg"[^>]*>Theatre of Epidaurus.*?</a></figcaption>',
        r'<figcaption><strong>Theatre of Epidaurus</strong> Greek theatres reflect a society that valued civic participation, shared narratives, and the exploration of the human condition.<br><a href="https://commons.wikimedia.org/wiki/File:Ancient_Theatre_of_the_Asklepieion_at_Epidaurus.jpg" target="_blank" rel="noopener" style="font-size: 0.8em; opacity: 0.8;">Theatre of Epidaurus · TimeTravelRome · CC BY 2.0</a></figcaption>'
    ),
    (
        r'<figcaption><a href="https://commons\.wikimedia\.org/wiki/File:Roman_Road_-_geograph\.org\.uk_-_4069478\.jpg"[^>]*>Roman road.*?</a></figcaption>',
        r'<figcaption><strong>Roman road</strong> Roman roads were the information highways of antiquity, enabling rapid troop movement, trade, and the spread of imperial culture.<br><a href="https://commons.wikimedia.org/wiki/File:Roman_Road_-_geograph.org.uk_-_4069478.jpg" target="_blank" rel="noopener" style="font-size: 0.8em; opacity: 0.8;">Roman road · Hugh Venables · CC BY-SA 2.0</a></figcaption>'
    ),
    (
        r'<figcaption><a href="https://commons\.wikimedia\.org/wiki/File:Cheshm_manuscript\.jpg"[^>]*>Arabic medical manuscript.*?</a></figcaption>',
        r'<figcaption><strong>Arabic medical manuscript</strong> Islamic scholars preserved and expanded upon classical knowledge, making major advances in medicine, mathematics, and astronomy.<br><a href="https://commons.wikimedia.org/wiki/File:Cheshm_manuscript.jpg" target="_blank" rel="noopener" style="font-size: 0.8em; opacity: 0.8;">Arabic medical manuscript · Cairo National Library · Public domain</a></figcaption>'
    ),
    (
        r'<figcaption><a href="https://commons\.wikimedia\.org/wiki/File:Creation_of_Adam_Michelangelo\.jpg"[^>]*>The Creation of Adam.*?</a></figcaption>',
        r'<figcaption><strong>The Creation of Adam</strong> Renaissance art revived classical realism and perspective, placing human experience and divine creation at the center of the worldview.<br><a href="https://commons.wikimedia.org/wiki/File:Creation_of_Adam_Michelangelo.jpg" target="_blank" rel="noopener" style="font-size: 0.8em; opacity: 0.8;">The Creation of Adam · Michelangelo, 1508–1512 · Public domain</a></figcaption>'
    ),
    (
        r'<figcaption><a href="https://commons\.wikimedia\.org/wiki/File:Galilei_telescopes,_Museo_Galileo,_Florence,_Inv\._242,_2428,_224088\.jpg"[^>]*>Galileo\'s surviving telescopes.*?</a></figcaption>',
        r'<figcaption><strong>Galileo\'s surviving telescopes</strong> Telescopes shifted our understanding of the cosmos from philosophical deduction to empirical observation.<br><a href="https://commons.wikimedia.org/wiki/File:Galilei_telescopes,_Museo_Galileo,_Florence,_Inv._242,_2428,_224088.jpg" target="_blank" rel="noopener" style="font-size: 0.8em; opacity: 0.8;">Galileo\'s surviving telescopes · Zde · CC BY-SA 4.0</a></figcaption>'
    ),
    (
        r'<figcaption><a href="https://commons\.wikimedia\.org/wiki/File:Gutenberg%27s_printing_press_in_the_Gutenberg_Museum,_Mainz,_Germany_\(48988292696\)\.jpg"[^>]*>Gutenberg Museum press.*?</a></figcaption>',
        r'<figcaption><strong>Gutenberg Museum press</strong> The printing press mass-produced information, breaking the monopoly on knowledge and fueling religious and scientific revolutions.<br><a href="https://commons.wikimedia.org/wiki/File:Gutenberg%27s_printing_press_in_the_Gutenberg_Museum,_Mainz,_Germany_(48988292696).jpg" target="_blank" rel="noopener" style="font-size: 0.8em; opacity: 0.8;">Gutenberg Museum press · dronepicr · CC BY 2.0</a></figcaption>'
    ),
    (
        r'<figcaption><a href="https://commons\.wikimedia\.org/wiki/File:Newcomen_steam_engine\.jpg"[^>]*>Newcomen engine model.*?</a></figcaption>',
        r'<figcaption><strong>Newcomen engine model</strong> Steam engines converted heat into mechanical work, replacing muscle and water power and launching the Industrial Revolution.<br><a href="https://commons.wikimedia.org/wiki/File:Newcomen_steam_engine.jpg" target="_blank" rel="noopener" style="font-size: 0.8em; opacity: 0.8;">Newcomen engine model studied by Watt · Public domain</a></figcaption>'
    ),
    (
        r'<figcaption><a href="https://commons\.wikimedia\.org/wiki/File:Printing_Telegraph\.jpg"[^>]*>Hughes printing telegraph.*?</a></figcaption>',
        r'<figcaption><strong>Hughes printing telegraph</strong> The telegraph decoupled communication from physical transportation, allowing information to travel instantly over vast distances.<br><a href="https://commons.wikimedia.org/wiki/File:Printing_Telegraph.jpg" target="_blank" rel="noopener" style="font-size: 0.8em; opacity: 0.8;">Hughes printing telegraph · Ambanmba · Public domain</a></figcaption>'
    ),
    (
        r'<figcaption><a href="https://commons\.wikimedia\.org/wiki/File:Server_Rack_\(54126210834\)\.jpg"[^>]*>Modern server rack.*?</a></figcaption>',
        r'<figcaption><strong>Modern server rack</strong> Data centers form the physical backbone of the internet, processing and storing the massive amounts of data that drive modern society.<br><a href="https://commons.wikimedia.org/wiki/File:Server_Rack_(54126210834).jpg" target="_blank" rel="noopener" style="font-size: 0.8em; opacity: 0.8;">Modern server rack · Tony Webster · CC BY 2.0</a></figcaption>'
    ),
    (
        r'<figcaption><a href="https://commons\.wikimedia\.org/wiki/File:Apollo11tv\.jpg"[^>]*>Apollo 11 television.*?</a></figcaption>',
        r'<figcaption><strong>Apollo 11 television transmission</strong> The Apollo moon landing demonstrated the unprecedented scale of organized science and engineering in the 20th century.<br><a href="https://commons.wikimedia.org/wiki/File:Apollo11tv.jpg" target="_blank" rel="noopener" style="font-size: 0.8em; opacity: 0.8;">Apollo 11 television transmission · NASA · Public domain</a></figcaption>'
    ),
    (
        r'<figcaption><a href="https://commons\.wikimedia\.org/wiki/File:Classic_shot_of_the_ENIAC_\(full_resolution\)\.jpg"[^>]*>ENIAC.*?</a></figcaption>',
        r'<figcaption><strong>ENIAC</strong> Early computers like ENIAC were massive calculators for the military, laying the groundwork for the digital automation of information.<br><a href="https://commons.wikimedia.org/wiki/File:Classic_shot_of_the_ENIAC_(full_resolution).jpg" target="_blank" rel="noopener" style="font-size: 0.8em; opacity: 0.8;">ENIAC · U.S. Army photograph · Public domain</a></figcaption>'
    )
]

for old_regex, new_val in replacements:
    content, count = re.subn(old_regex, new_val, content)
    if count == 0:
        print(f"Warning: could not find match for {old_regex[:40]}...")
    else:
        print(f"Replaced {count} instances.")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

