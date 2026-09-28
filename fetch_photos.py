import urllib.request
import json
import os

events = {
    'vesuvius79': 'Eruption of Vesuvius J.C. Dahl',
    'tambora1815': 'Tambora eruption map', # Hard to find a photo, maybe a painting or a map
    'krakatoa1883': 'Krakatoa eruption 1883 lithograph',
    'sthelenr1980': 'MSH80 eruption mount st helens',
    'pinatubo1991': 'Pinatubo91 eruption',
    'eyja2010': 'Eyjafjallajökull volcanic ash cloud',
    'maunaloa2022': 'Mauna Loa eruption 2022 USGS',
    'yellowstone': 'Yellowstone Caldera Grand Prismatic'
}

out_dir = "assets/images/lessons/volcano-simulator"
os.makedirs(out_dir, exist_ok=True)

for eid, query in events.items():
    # Wikipedia API for searching images
    api_url = f"https://en.wikipedia.org/w/api.php?action=query&format=json&generator=images&titles={urllib.parse.quote(query)}&prop=imageinfo&iiprop=url"
    # Actually, direct image search on commons is better
    search_url = f"https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch={urllib.parse.quote(query)}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url"
    
    try:
        req = urllib.request.Request(search_url, headers={'User-Agent': 'AntigravityBot/1.0 (example@example.com)'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            pages = data.get('query', {}).get('pages', {})
            if pages:
                page = list(pages.values())[0]
                img_url = page.get('imageinfo', [{}])[0].get('url')
                if img_url:
                    out_path = os.path.join(out_dir, f"{eid}-photo.jpg")
                    urllib.request.urlretrieve(img_url, out_path)
                    print(f"Saved {eid}: {img_url}")
                else:
                    print(f"No image URL found for {eid}")
            else:
                print(f"No results for {eid}")
    except Exception as e:
        print(f"Error for {eid}: {e}")

