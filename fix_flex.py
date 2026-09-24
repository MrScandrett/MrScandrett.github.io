html_path = '/home/evanscandrett/Projects/MrScandrett.github.io/lessons/computer-science/graphics-and-games/game-design-thinking.html'
with open(html_path, 'r') as f:
    content = f.read()

content = content.replace(
    '.arch-card { position: relative; border: 1px solid var(--line,#d2d2d7); border-radius: 14px; padding: 0.8rem 0.9rem 0.75rem;  gap: 0.35rem; }',
    '.arch-card { position: relative; border: 1px solid var(--line,#d2d2d7); border-radius: 14px; padding: 0.8rem 0.9rem 0.75rem; display: flex; flex-direction: column; gap: 0.35rem; }'
)

content = content.replace(
    '.tl-era { flex: 0 0 218px; scroll-snap-align: start; border: 1px solid var(--line,#d2d2d7); border-radius: 14px; padding: 0.85rem 0.95rem;  gap: 0.35rem; background: var(--white,#fff); }',
    '.tl-era { flex: 0 0 218px; scroll-snap-align: start; border: 1px solid var(--line,#d2d2d7); border-radius: 14px; padding: 0.85rem 0.95rem; display: flex; flex-direction: column; gap: 0.35rem; background: var(--white,#fff); }'
)

content = content.replace(
    '.tl-meters {  gap: 0.25rem; margin-top: 0.2rem; }',
    '.tl-meters { display: flex; flex-direction: column; gap: 0.25rem; margin-top: 0.2rem; }'
)

content = content.replace(
    '.sketch-case { border: 1px solid var(--line,#d2d2d7); border-radius: 14px; padding: 0.9rem 1rem;  gap: 0.45rem; background: var(--white,#fff); }',
    '.sketch-case { border: 1px solid var(--line,#d2d2d7); border-radius: 14px; padding: 0.9rem 1rem; display: flex; flex-direction: column; gap: 0.45rem; background: var(--white,#fff); }'
)

content = content.replace(
    '.ingredient-tile { border: 1px solid var(--line,#d2d2d7); border-radius: 12px; padding: 1rem; background: var(--white,#fff);  gap: 0.6rem; }',
    '.ingredient-tile { border: 1px solid var(--line,#d2d2d7); border-radius: 12px; padding: 1rem; background: var(--white,#fff); display: flex; flex-direction: column; gap: 0.6rem; }'
)

with open(html_path, 'w') as f:
    f.write(content)
print("Restored flex layouts.")
