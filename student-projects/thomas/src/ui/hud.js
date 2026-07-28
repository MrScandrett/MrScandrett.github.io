/*
 * hud — run state at a glance.
 *
 * This was one line of red text reading "Health: 87 Level: 3 Score: 400".
 * A wave-based run needs to answer "how hurt am I, what's left of this wave,
 * and can I afford anything?" without the player parsing a sentence.
 */

const FONT = 'Segoe UI, Roboto, sans-serif';

function panel(styles) {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.fontFamily = FONT;
    el.style.pointerEvents = 'none';
    el.style.zIndex = '1100';
    el.style.display = 'none';
    Object.assign(el.style, styles);
    document.body.appendChild(el);
    return el;
}

export function createHud() {
    // ── bottom left: health ────────────────────────────────────────────────
    const healthPanel = panel({ bottom: '26px', left: '26px', width: '260px' });

    const healthLabel = document.createElement('div');
    healthLabel.style.cssText = `color:#cfe3ff;font-size:12px;letter-spacing:2.5px;
        font-weight:700;margin-bottom:6px;text-shadow:0 1px 4px rgba(0,0,0,0.8)`;
    healthLabel.innerText = 'HEALTH';
    healthPanel.appendChild(healthLabel);

    const healthTrack = document.createElement('div');
    healthTrack.style.cssText = `height:16px;border-radius:9px;overflow:hidden;
        background:rgba(6,12,22,0.78);border:1px solid rgba(255,255,255,0.22);
        box-shadow:0 4px 14px rgba(0,0,0,0.45)`;
    const healthFill = document.createElement('div');
    healthFill.style.cssText = `height:100%;width:100%;border-radius:8px;
        transition:width 140ms ease-out, background-color 220ms linear`;
    healthTrack.appendChild(healthFill);
    healthPanel.appendChild(healthTrack);

    const healthText = document.createElement('div');
    healthText.style.cssText = `color:#eaf4ff;font-size:15px;font-weight:700;margin-top:6px;
        text-shadow:0 1px 4px rgba(0,0,0,0.85)`;
    healthPanel.appendChild(healthText);

    // Shield energy, directly under health. It is a spend-it-deliberately
    // resource now, so it has to be readable mid-fight without looking away.
    const shieldTrack = document.createElement('div');
    shieldTrack.style.cssText = `height:8px;border-radius:5px;overflow:hidden;margin-top:8px;
        background:rgba(6,12,22,0.78);border:1px solid rgba(255,255,255,0.18)`;
    const shieldFill = document.createElement('div');
    shieldFill.style.cssText = `height:100%;width:100%;border-radius:4px;
        transition:width 90ms linear, background-color 180ms linear`;
    shieldTrack.appendChild(shieldFill);
    healthPanel.appendChild(shieldTrack);

    const shieldText = document.createElement('div');
    shieldText.style.cssText = `color:#8fc4ff;font-size:12px;letter-spacing:1.6px;
        font-weight:700;margin-top:4px;text-shadow:0 1px 4px rgba(0,0,0,0.85)`;
    shieldText.innerText = 'SHIELD  [RIGHT CLICK]';
    healthPanel.appendChild(shieldText);

    // ── top left: wave and what's left of it ───────────────────────────────
    const wavePanel = panel({ top: '58px', left: '26px' });
    const waveTitle = document.createElement('div');
    waveTitle.style.cssText = `color:#eaf4ff;font-size:30px;font-weight:800;letter-spacing:1px;
        text-shadow:0 2px 8px rgba(0,0,0,0.85)`;
    const waveSub = document.createElement('div');
    waveSub.style.cssText = `color:#9fd0ff;font-size:14px;margin-top:2px;
        text-shadow:0 1px 4px rgba(0,0,0,0.85)`;
    wavePanel.append(waveTitle, waveSub);

    // ── right side, below the minimap: score and kills ─────────────────────
    // The minimap owns the top-right 200x200, so this sits underneath it.
    const scorePanel = panel({ top: '236px', right: '26px', textAlign: 'right' });
    const scoreText = document.createElement('div');
    scoreText.style.cssText = `color:#8affc1;font-size:26px;font-weight:800;
        text-shadow:0 2px 8px rgba(0,0,0,0.85)`;
    const killsText = document.createElement('div');
    killsText.style.cssText = `color:#bcd4ee;font-size:14px;margin-top:2px;
        text-shadow:0 1px 4px rgba(0,0,0,0.85)`;
    const upgradeText = document.createElement('div');
    upgradeText.style.cssText = `color:#ffd694;font-size:13px;margin-top:6px;
        text-shadow:0 1px 4px rgba(0,0,0,0.85)`;
    scorePanel.append(scoreText, killsText, upgradeText);

    const panels = [healthPanel, wavePanel, scorePanel];

    function setVisible(visible) {
        for (const el of panels) el.style.display = visible ? 'block' : 'none';
    }

    function updateHealth(health, maxHealth) {
        const ratio = Math.max(0, Math.min(1, health / maxHealth));
        healthFill.style.width = `${ratio * 100}%`;
        // Green until it matters, amber as a warning, red when a hit could end it.
        healthFill.style.backgroundColor =
            ratio > 0.6 ? '#43d17a' : ratio > 0.3 ? '#ffc247' : '#ff4d4d';
        healthText.innerText = `${Math.ceil(health)} / ${maxHealth}`;
    }

    function updateShield(energy, maxEnergy, active, broken) {
        const ratio = Math.max(0, Math.min(1, energy / maxEnergy));
        shieldFill.style.width = `${ratio * 100}%`;
        shieldFill.style.backgroundColor = broken ? '#8a4b4b' : active ? '#7dd3fc' : '#4f7fa8';
        if (broken) {
            shieldText.innerText = 'SHIELD BROKEN — RECHARGING';
            shieldText.style.color = '#ff8a8a';
        } else {
            shieldText.innerText = active ? 'SHIELD UP' : 'SHIELD  [RIGHT CLICK]';
            shieldText.style.color = active ? '#7dd3fc' : '#8fc4ff';
        }
    }

    function updateWave(waveNumber, remaining, secondsToNext) {
        if (secondsToNext > 0) {
            waveTitle.innerText = waveNumber > 0 ? `WAVE ${waveNumber} CLEARED` : 'GET READY';
            waveSub.innerText = `Next wave in ${secondsToNext}s  ·  press B for the workshop`;
        } else {
            waveTitle.innerText = `WAVE ${waveNumber}`;
            waveSub.innerText = `${remaining} snowmen left`;
        }
    }

    function updateScore(score, kills, armourLevel, regenLevel, healthLevel) {
        scoreText.innerText = `${Math.floor(score)}`;
        killsText.innerText = `${kills} kills`;
        const owned = [];
        if (armourLevel > 0) owned.push(`Parka ${armourLevel}`);
        if (regenLevel > 0) owned.push(`Warmers ${regenLevel}`);
        if (healthLevel > 0) owned.push(`Rations ${healthLevel}`);
        upgradeText.innerText = owned.join('  ·  ');
    }

    return { setVisible, updateHealth, updateShield, updateWave, updateScore };
}
