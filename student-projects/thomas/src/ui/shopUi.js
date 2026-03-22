import { COMBAT } from '/src/app/config.js';

export const WEAPONS = [
    {
        id: 'starter-snowball',
        name: 'Starter Snowball',
        cost: 0,
        speed: COMBAT.SNOWBALL_SPEED,
        damage: 25,
        color: 0xbfe8ff,
        description: 'Balanced default projectile.'
    },
    {
        id: 'ice-dart',
        name: 'Ice Dart',
        cost: 250,
        speed: 68,
        damage: 35,
        color: 0x8cf5ff,
        description: 'Fast shot with a lighter hit.'
    },
    {
        id: 'glacier-orb',
        name: 'Glacier Orb',
        cost: 500,
        speed: 44,
        damage: 55,
        color: 0x9fb6ff,
        description: 'Heavy damage with a slower throw.'
    }
];

export function createShopUi(controls, onSelectWeapon, tryPurchase) {
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.display = 'none';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.background = 'rgba(4, 8, 16, 0.78)';
    overlay.style.zIndex = '2000';
    overlay.style.fontFamily = 'Segoe UI, sans-serif';
    document.body.appendChild(overlay);

    const panel = document.createElement('div');
    panel.style.width = 'min(720px, calc(100vw - 32px))';
    panel.style.maxHeight = 'calc(100vh - 48px)';
    panel.style.overflowY = 'auto';
    panel.style.padding = '22px';
    panel.style.borderRadius = '18px';
    panel.style.border = '1px solid rgba(255,255,255,0.18)';
    panel.style.background = 'linear-gradient(180deg, rgba(18,31,53,0.96), rgba(8,15,29,0.96))';
    panel.style.boxShadow = '0 24px 60px rgba(0,0,0,0.35)';
    overlay.appendChild(panel);

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.gap = '12px';
    panel.appendChild(header);

    const title = document.createElement('h2');
    title.innerText = 'Workshop';
    title.style.margin = '0';
    title.style.color = '#f3f8ff';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.innerText = 'Resume';
    closeBtn.style.padding = '10px 14px';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '10px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.background = '#7dd3fc';
    closeBtn.style.color = '#07101f';
    header.appendChild(closeBtn);

    const subtitle = document.createElement('p');
    subtitle.innerText = 'Spend score to unlock stronger projectiles, then equip one.';
    subtitle.style.margin = '10px 0 18px';
    subtitle.style.color = '#bfd5ee';
    panel.appendChild(subtitle);

    const scoreLine = document.createElement('div');
    scoreLine.style.marginBottom = '16px';
    scoreLine.style.color = '#89f0c0';
    scoreLine.style.fontWeight = '600';
    panel.appendChild(scoreLine);

    const cards = document.createElement('div');
    cards.style.display = 'grid';
    cards.style.gridTemplateColumns = 'repeat(auto-fit, minmax(190px, 1fr))';
    cards.style.gap = '14px';
    panel.appendChild(cards);

    let open = false;
    let currentScore = 0;
    let unlockedWeapons = [0];
    let currentWeaponIndex = 0;

    function render() {
        scoreLine.innerText = `Score: ${Math.floor(currentScore)}`;
        cards.innerHTML = '';

        for (let i = 0; i < WEAPONS.length; i++) {
            const weapon = WEAPONS[i];
            const unlocked = unlockedWeapons.includes(i);
            const equipped = currentWeaponIndex === i;

            const card = document.createElement('div');
            card.style.padding = '16px';
            card.style.borderRadius = '14px';
            card.style.border = equipped ? '1px solid rgba(125, 211, 252, 0.95)' : '1px solid rgba(255,255,255,0.12)';
            card.style.background = equipped ? 'rgba(22, 45, 76, 0.92)' : 'rgba(10, 17, 29, 0.82)';
            card.style.color = '#edf5ff';

            const name = document.createElement('h3');
            name.innerText = weapon.name;
            name.style.margin = '0 0 8px';
            card.appendChild(name);

            const details = document.createElement('p');
            details.innerText = `${weapon.description} Speed ${weapon.speed} | Damage ${weapon.damage}`;
            details.style.margin = '0 0 14px';
            details.style.color = '#b9c9dc';
            details.style.fontSize = '14px';
            card.appendChild(details);

            const status = document.createElement('div');
            status.innerText = unlocked ? (equipped ? 'Equipped' : 'Unlocked') : `Cost: ${weapon.cost}`;
            status.style.marginBottom = '12px';
            status.style.color = unlocked ? '#89f0c0' : '#ffd38a';
            card.appendChild(status);

            const action = document.createElement('button');
            action.innerText = unlocked ? (equipped ? 'Equipped' : 'Equip') : 'Unlock';
            action.disabled = equipped;
            action.style.width = '100%';
            action.style.padding = '10px 12px';
            action.style.border = 'none';
            action.style.borderRadius = '10px';
            action.style.cursor = equipped ? 'default' : 'pointer';
            action.style.background = equipped ? '#4c6b8f' : '#7dd3fc';
            action.style.color = '#07101f';

            action.onclick = () => {
                if (unlockedWeapons.includes(i)) {
                    currentWeaponIndex = i;
                    onSelectWeapon(i);
                    render();
                    return;
                }

                if (tryPurchase(i, weapon.cost)) {
                    unlockedWeapons.push(i);
                    currentScore = Math.max(0, currentScore - weapon.cost);
                    currentWeaponIndex = i;
                    onSelectWeapon(i);
                    render();
                }
            };

            card.appendChild(action);
            cards.appendChild(card);
        }
    }

    function toggleShop(forceOpen) {
        open = typeof forceOpen === 'boolean' ? forceOpen : !open;
        overlay.style.display = open ? 'flex' : 'none';
        if (open) {
            if (controls.isLocked) controls.unlock();
        } else if (!controls.isLocked) {
            controls.lock();
        }
    }

    function updateState(score, unlocked, selectedIndex) {
        currentScore = score;
        unlockedWeapons = Array.isArray(unlocked) ? unlocked : [0];
        currentWeaponIndex = selectedIndex || 0;
        render();
    }

    closeBtn.onclick = () => toggleShop(false);
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) toggleShop(false);
    });
    panel.addEventListener('click', (event) => event.stopPropagation());

    render();

    return {
        isOpen() {
            return open;
        },
        toggleShop,
        updateState
    };
}
