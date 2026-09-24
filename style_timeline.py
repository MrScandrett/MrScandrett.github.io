html_path = '/home/evanscandrett/Projects/MrScandrett.github.io/lessons/computer-science/graphics-and-games/game-design-thinking.html'
with open(html_path, 'r') as f:
    content = f.read()

# Make timeline era cards pop
content = content.replace(
    '.tl-era { flex: 0 0 218px; scroll-snap-align: start; border: 1px solid var(--line,#d2d2d7); border-radius: 14px; padding: 0.85rem 0.95rem; display: flex; flex-direction: column; gap: 0.35rem; background: var(--white,#fff); }',
    '.tl-era { flex: 0 0 218px; scroll-snap-align: start; border: 1px solid var(--line,#d2d2d7); border-radius: 14px; padding: 0.85rem 0.95rem; display: flex; flex-direction: column; gap: 0.35rem; background: var(--white,#fff); box-shadow: 0 4px 12px rgba(0,0,0,0.04); transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }\n    .tl-era:hover { transform: translateY(-3px); box-shadow: 0 12px 24px rgba(0,0,0,0.08); border-color: rgba(139,92,246,0.4); }'
)

# Custom scrollbar
content = content.replace(
    '.history-timeline { display: flex; gap: 0.75rem; overflow-x: auto; padding: 0.15rem 0.15rem 0.85rem; scroll-snap-type: x proximity; margin: 0.7rem -0.15rem 0; }',
    '.history-timeline { display: flex; gap: 0.75rem; overflow-x: auto; padding: 0.15rem 0.15rem 0.85rem; scroll-snap-type: x proximity; margin: 0.7rem -0.15rem 0; scrollbar-width: thin; scrollbar-color: rgba(139,92,246,0.4) rgba(0,0,0,0.04); }\n    .history-timeline::-webkit-scrollbar { height: 8px; }\n    .history-timeline::-webkit-scrollbar-track { background: rgba(0,0,0,0.04); border-radius: 4px; margin: 0 1rem; }\n    .history-timeline::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.4); border-radius: 4px; }\n    .history-timeline::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.7); }'
)

# Improve meters
content = content.replace(
    '.tl-meter-bar { flex: 1; height: 5px; border-radius: 3px; background: rgba(148,163,184,0.22); overflow: hidden; }',
    '.tl-meter-bar { flex: 1; height: 7px; border-radius: 4px; background: rgba(148,163,184,0.22); overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.08); }'
)
content = content.replace(
    '.tl-meter-fill { height: 100%; border-radius: 3px; }',
    '.tl-meter-fill { height: 100%; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }'
)
content = content.replace(
    '.tl-meter-fill.access { background: #ef4444; }',
    '.tl-meter-fill.access { background: linear-gradient(90deg, #f87171, #ef4444); }'
)
content = content.replace(
    '.tl-meter-fill.complexity { background: #22c55e; }',
    '.tl-meter-fill.complexity { background: linear-gradient(90deg, #4ade80, #22c55e); }'
)

with open(html_path, 'w') as f:
    f.write(content)
print("Timeline styles updated.")
