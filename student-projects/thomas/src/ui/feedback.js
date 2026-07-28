import * as THREE from 'three';

/*
 * feedback — the "did that do anything?" layer.
 *
 * Landing a shot, taking a hit and clearing a wave all used to be silent: the
 * only evidence was a number changing in the corner. These are the cheap,
 * immediate reactions that make the same mechanics feel like a game.
 */

function overlay(styles) {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.pointerEvents = 'none';
    el.style.fontFamily = 'Segoe UI, sans-serif';
    Object.assign(el.style, styles);
    document.body.appendChild(el);
    return el;
}

export function createFeedback(camera) {
    // ── hit marker: four short strokes that flick out from the crosshair ────
    const hitMarker = overlay({
        top: '50%', left: '50%', width: '26px', height: '26px',
        transform: 'translate(-50%, -50%)', opacity: '0', zIndex: '1400',
        transition: 'opacity 90ms linear'
    });
    hitMarker.innerHTML = `
        <svg viewBox="0 0 26 26" width="26" height="26">
            <g stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"
               style="filter: drop-shadow(0 0 2px rgba(0,0,0,0.8))">
                <line x1="4" y1="4" x2="9" y2="9"/><line x1="22" y1="4" x2="17" y2="9"/>
                <line x1="4" y1="22" x2="9" y2="17"/><line x1="22" y1="22" x2="17" y2="17"/>
            </g>
        </svg>`;
    let hitMarkerTimer = 0;

    // ── damage vignette ────────────────────────────────────────────────────
    const vignette = overlay({
        inset: '0', opacity: '0', zIndex: '1300',
        background: 'radial-gradient(ellipse at center, rgba(255,0,0,0) 42%, rgba(190,10,10,0.85) 100%)',
        transition: 'opacity 140ms ease-out'
    });

    // ── centred banner for wave start / clear ──────────────────────────────
    const banner = overlay({
        top: '26%', left: '50%', transform: 'translate(-50%, -50%)',
        textAlign: 'center', opacity: '0', zIndex: '1350',
        transition: 'opacity 260ms ease-out', textShadow: '0 2px 18px rgba(0,0,0,0.85)'
    });
    const bannerTitle = document.createElement('div');
    bannerTitle.style.fontSize = '52px';
    bannerTitle.style.fontWeight = '800';
    bannerTitle.style.letterSpacing = '4px';
    bannerTitle.style.color = '#eaf6ff';
    const bannerSub = document.createElement('div');
    bannerSub.style.fontSize = '19px';
    bannerSub.style.marginTop = '6px';
    bannerSub.style.color = '#9fd0ff';
    banner.append(bannerTitle, bannerSub);
    let bannerTimer = 0;

    // ── floating score popups near the crosshair ───────────────────────────
    const popupLayer = overlay({
        top: '50%', left: '50%', width: '0', height: '0', zIndex: '1360'
    });

    function scorePopup(text, colour = '#8affc1') {
        const el = document.createElement('div');
        el.innerText = text;
        el.style.position = 'absolute';
        el.style.left = `${(Math.random() - 0.5) * 90}px`;
        el.style.top = '-46px';
        el.style.transform = 'translate(-50%, 0)';
        el.style.fontSize = '21px';
        el.style.fontWeight = '700';
        el.style.color = colour;
        el.style.whiteSpace = 'nowrap';
        el.style.textShadow = '0 2px 8px rgba(0,0,0,0.9)';
        el.style.transition = 'transform 700ms ease-out, opacity 700ms ease-out';
        popupLayer.appendChild(el);
        requestAnimationFrame(() => {
            el.style.transform = 'translate(-50%, -48px)';
            el.style.opacity = '0';
        });
        setTimeout(() => el.remove(), 760);
    }

    // ── screen shake ───────────────────────────────────────────────────────
    // Applied to the camera's local offset. The camera is a child of the aim
    // rig and sits at the origin, so shaking it here can't disturb where the
    // player is actually looking or where their shots go.
    let critical = false;
    let shakeAmount = 0;
    const _shake = new THREE.Vector3();

    function shake(amount) {
        shakeAmount = Math.min(1.4, shakeAmount + amount);
    }

    function update(delta) {
        if (shakeAmount > 0.0005) {
            shakeAmount = Math.max(0, shakeAmount - delta * 2.6);
            _shake.set(
                (Math.random() - 0.5) * shakeAmount,
                (Math.random() - 0.5) * shakeAmount,
                0
            );
            camera.position.copy(_shake);
        } else if (camera.position.lengthSq() !== 0) {
            camera.position.set(0, 0, 0);
        }
    }

    return {
        update,
        shake,
        scorePopup,

        showHitMarker() {
            hitMarker.style.opacity = '1';
            clearTimeout(hitMarkerTimer);
            hitMarkerTimer = setTimeout(() => { hitMarker.style.opacity = '0'; }, 110);
        },

        flashDamage(intensity = 1) {
            vignette.style.transition = 'opacity 140ms ease-out';
            vignette.style.opacity = String(Math.min(0.95, 0.35 + intensity * 0.6));
            // Falls back to the critical glow rather than to nothing, so getting
            // hit while nearly dead doesn't clear the low-health warning.
            setTimeout(() => { vignette.style.opacity = critical ? '0.34' : '0'; }, 130);
        },

        // Held on screen while health is critical, so a near-death run reads at
        // a glance without having to watch the number. Called every frame, so it
        // only touches the DOM when the state actually flips.
        setCritical(active) {
            if (active === critical) return;
            critical = active;
            vignette.style.transition = active ? 'opacity 600ms ease-in-out' : 'opacity 140ms ease-out';
            vignette.style.opacity = active ? '0.34' : '0';
        },

        showBanner(title, subtitle = '', holdMs = 1700) {
            bannerTitle.innerText = title;
            bannerSub.innerText = subtitle;
            banner.style.opacity = '1';
            clearTimeout(bannerTimer);
            bannerTimer = setTimeout(() => { banner.style.opacity = '0'; }, holdMs);
        },

        hideAll() {
            banner.style.opacity = '0';
            vignette.style.opacity = '0';
            hitMarker.style.opacity = '0';
            critical = false;
            shakeAmount = 0;
            camera.position.set(0, 0, 0);
        }
    };
}
