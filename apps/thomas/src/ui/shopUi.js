import { COMBAT } from '../app/config.js';

/*
 * Each throw has a cooldown, so these three are a real choice rather than
 * decoration. Before, left click had no rate limit at all -- you could empty a
 * dozen snowballs in a fifth of a second, which made the highest-damage weapon
 * strictly best and every wave a spam check.
 *
 *   Ice Dart     fastest sustained damage, but needs the most hits to land
 *   Glacier Orb  biggest hit, and a miss costs you nearly a second
 *   Starter      the safe middle
 */
export const WEAPONS = [
    {
        id: 'starter-snowball',
        name: 'Starter Snowball',
        cost: 0,
        speed: COMBAT.SNOWBALL_SPEED,
        damage: 25,
        fireRate: 400,
        color: 0xbfe8ff,
        description: 'Balanced and forgiving.'
    },
    {
        id: 'ice-dart',
        name: 'Ice Dart',
        cost: 250,
        speed: 72,
        damage: 20,
        fireRate: 220,
        color: 0x8cf5ff,
        description: 'Fast and flat. Rewards accuracy.'
    },
    {
        id: 'glacier-orb',
        name: 'Glacier Orb',
        cost: 500,
        speed: 42,
        damage: 75,
        fireRate: 950,
        color: 0x9fb6ff,
        description: 'Huge hit, slow recovery. Punishes a miss.'
    }
];

/*
 * Upgrades give score a purpose beyond the three weapons -- there was nothing to
 * save for once you owned the Glacier Orb, so score just accumulated unspent.
 * Each line is capped so no run becomes untouchable.
 */
export const UPGRADES = [
    {
        id: 'parka',
        name: 'Reinforced Parka',
        description: 'Cuts incoming damage.',
        costs: [200, 420, 760],
        effect: (level) => `-${level * 12}% damage taken`
    },
    {
        id: 'warmers',
        name: 'Hand Warmers',
        description: 'Recover faster between fights.',
        costs: [150, 320, 580],
        effect: (level) => `+${level * 8} health per second`
    },
    {
        id: 'rations',
        name: 'Field Rations',
        description: 'Raises your maximum health.',
        costs: [260, 520, 900],
        effect: (level) => `+${level * 25} max health`
    }
];

export function createShopUi(controls, onSelectWeapon, tryPurchase, onBuyUpgrade) {
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
    subtitle.innerText = 'Spend score between waves on better throws and better gear.';
    subtitle.style.margin = '10px 0 18px';
    subtitle.style.color = '#bfd5ee';
    panel.appendChild(subtitle);

    const scoreLine = document.createElement('div');
    scoreLine.style.marginBottom = '16px';
    scoreLine.style.color = '#89f0c0';
    scoreLine.style.fontWeight = '600';
    panel.appendChild(scoreLine);

    function sectionHeading(text) {
        const h = document.createElement('h3');
        h.innerText = text;
        h.style.cssText = 'margin:4px 0 12px;color:#9fd0ff;font-size:13px;letter-spacing:2.4px';
        panel.appendChild(h);
        return h;
    }

    function cardGrid() {
        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(190px, 1fr))';
        grid.style.gap = '14px';
        panel.appendChild(grid);
        return grid;
    }

    sectionHeading('THROWS');
    const cards = cardGrid();
    const upgradeHeading = sectionHeading('GEAR');
    upgradeHeading.style.marginTop = '22px';
    const upgradeCards = cardGrid();

    let open = false;
    let currentScore = 0;
    let unlockedWeapons = [0];
    let currentWeaponIndex = 0;
    let upgradeLevels = { parka: 0, warmers: 0, rations: 0 };

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
            const perSecond = (1000 / weapon.fireRate).toFixed(1);
            const dps = Math.round(weapon.damage * (1000 / weapon.fireRate));
            details.innerText = `${weapon.description}\nDamage ${weapon.damage} · ${perSecond}/sec · ${dps} dps · speed ${weapon.speed}`;
            details.style.margin = '0 0 14px';
            details.style.whiteSpace = 'pre-line';
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

        renderUpgrades();
    }

    function renderUpgrades() {
        upgradeCards.innerHTML = '';

        for (const upgrade of UPGRADES) {
            const level = upgradeLevels[upgrade.id] || 0;
            const maxed = level >= upgrade.costs.length;
            const cost = maxed ? null : upgrade.costs[level];
            const affordable = !maxed && currentScore >= cost;

            const card = document.createElement('div');
            card.style.cssText = `padding:16px;border-radius:14px;color:#edf5ff;
                border:1px solid ${level > 0 ? 'rgba(255,214,148,0.7)' : 'rgba(255,255,255,0.12)'};
                background:${level > 0 ? 'rgba(48,38,20,0.7)' : 'rgba(10,17,29,0.82)'}`;

            const name = document.createElement('h3');
            name.innerText = upgrade.name;
            name.style.cssText = 'margin:0 0 8px';
            card.appendChild(name);

            const details = document.createElement('p');
            details.innerText = upgrade.description;
            details.style.cssText = 'margin:0 0 10px;color:#b9c9dc;font-size:14px';
            card.appendChild(details);

            // Pips make the remaining headroom obvious at a glance.
            const pips = document.createElement('div');
            pips.style.cssText = 'display:flex;gap:5px;margin-bottom:10px';
            for (let i = 0; i < upgrade.costs.length; i++) {
                const pip = document.createElement('span');
                pip.style.cssText = `flex:1;height:6px;border-radius:3px;
                    background:${i < level ? '#ffd694' : 'rgba(255,255,255,0.16)'}`;
                pips.appendChild(pip);
            }
            card.appendChild(pips);

            const status = document.createElement('div');
            status.innerText = level > 0 ? upgrade.effect(level) : 'Not owned';
            status.style.cssText = `margin-bottom:12px;font-size:14px;
                color:${level > 0 ? '#8affc1' : '#8fa8c4'}`;
            card.appendChild(status);

            const action = document.createElement('button');
            action.innerText = maxed ? 'Fully upgraded' : `Buy · ${cost}`;
            action.disabled = maxed || !affordable;
            action.style.cssText = `width:100%;padding:10px 12px;border:none;border-radius:10px;
                color:#07101f;font-weight:600;
                cursor:${maxed || !affordable ? 'default' : 'pointer'};
                background:${maxed ? '#4c6b8f' : affordable ? '#ffd694' : '#5a5f68'}`;
            action.onclick = () => {
                if (maxed || !onBuyUpgrade) return;
                if (onBuyUpgrade(upgrade.id, cost)) {
                    upgradeLevels[upgrade.id] = level + 1;
                    currentScore = Math.max(0, currentScore - cost);
                    render();
                }
            };
            card.appendChild(action);
            upgradeCards.appendChild(card);
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

    function updateState(score, unlocked, selectedIndex, levels) {
        currentScore = score;
        unlockedWeapons = Array.isArray(unlocked) ? unlocked : [0];
        currentWeaponIndex = selectedIndex || 0;
        if (levels) upgradeLevels = levels;
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
