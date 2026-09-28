#!/bin/bash
declare -A events
events[vesuvius79]="Eruption of Vesuvius J.C. Dahl"
events[tambora1815]="Tambora"
events[krakatoa1883]="Krakatoa eruption 1883 lithograph"
events[sthelenr1980]="MSH80 eruption mount st helens"
events[pinatubo1991]="Pinatubo91 eruption"
events[eyja2010]="Eyjafjallajökull volcanic ash cloud"
events[maunaloa2022]="Mauna Loa eruption 2022"
events[yellowstone]="Yellowstone Caldera Grand Prismatic"

mkdir -p assets/images/lessons/volcano-simulator

for eid in "${!events[@]}"; do
    query=$(echo "${events[$eid]}" | jq -sRr @uri)
    url="https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${query}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url"
    
    img_url=$(curl -s -A "AntigravityBot/1.0" "$url" | jq -r '.query.pages[].imageinfo[0].url' 2>/dev/null)
    
    if [ "$img_url" != "null" ] && [ -n "$img_url" ]; then
        curl -s -A "AntigravityBot/1.0" -L -o "assets/images/lessons/volcano-simulator/${eid}-photo.jpg" "$img_url"
        echo "Saved $eid"
    else
        echo "Failed $eid"
    fi
done
