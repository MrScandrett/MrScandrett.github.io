/*
 * runSummary — the screen a run ends on.
 *
 * Health could previously hit zero and simply... keep going. Nothing marked the
 * end of a run, so there was no reason to care about staying alive. This is the
 * other half of that: it names what you achieved, compares it to your best, and
 * puts "go again" one click away.
 */

const BEST_KEY = 'frostline_best_run';

export function loadBestRun() {
    try {
        const raw = localStorage.getItem(BEST_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function saveBestRun(run) {
    try {
        localStorage.setItem(BEST_KEY, JSON.stringify(run));
    } catch {
        /* Private browsing and full quotas just mean no saved best. */
    }
}

export function createRunSummary({ onRetry, onReturnToLobby }) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:absolute;inset:0;display:none;align-items:center;
        justify-content:center;background:rgba(3,7,14,0.86);z-index:2400;
        font-family:'Segoe UI', Roboto, sans-serif`;
    document.body.appendChild(overlay);

    const panel = document.createElement('div');
    panel.style.cssText = `width:min(520px, calc(100vw - 32px));padding:30px 34px;
        border-radius:20px;border:1px solid rgba(255,255,255,0.18);
        background:linear-gradient(180deg, rgba(18,31,53,0.97), rgba(8,15,29,0.97));
        box-shadow:0 28px 70px rgba(0,0,0,0.5);text-align:center`;
    overlay.appendChild(panel);

    const title = document.createElement('h1');
    title.innerText = 'You Were Buried';
    title.style.cssText = `margin:0;color:#ff6b6b;font-size:38px;letter-spacing:1px`;
    panel.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.style.cssText = `margin:8px 0 22px;color:#bfd5ee;font-size:16px`;
    panel.appendChild(subtitle);

    const stats = document.createElement('div');
    stats.style.cssText = `display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:22px`;
    panel.appendChild(stats);

    function statCard(label, value, highlight) {
        const card = document.createElement('div');
        card.style.cssText = `padding:14px;border-radius:12px;background:rgba(10,17,29,0.8);
            border:1px solid rgba(255,255,255,0.1)`;
        const v = document.createElement('div');
        v.innerText = value;
        v.style.cssText = `font-size:26px;font-weight:800;color:${highlight || '#eaf4ff'}`;
        const l = document.createElement('div');
        l.innerText = label;
        l.style.cssText = `font-size:12px;letter-spacing:1.6px;color:#8fa8c4;margin-top:4px`;
        card.append(v, l);
        return card;
    }

    const bestLine = document.createElement('div');
    bestLine.style.cssText = `color:#ffd694;font-size:15px;margin-bottom:22px;min-height:20px`;
    panel.appendChild(bestLine);

    const buttons = document.createElement('div');
    buttons.style.cssText = `display:flex;gap:12px;justify-content:center`;
    panel.appendChild(buttons);

    function button(text, primary) {
        const b = document.createElement('button');
        b.innerText = text;
        b.style.cssText = `padding:13px 26px;border:none;border-radius:11px;cursor:pointer;
            font-size:16px;font-weight:700;
            background:${primary ? '#7dd3fc' : 'rgba(255,255,255,0.14)'};
            color:${primary ? '#07101f' : '#eaf4ff'}`;
        buttons.appendChild(b);
        return b;
    }

    const retryBtn = button('Play Again', true);
    const lobbyBtn = button('Back to Lobby', false);
    retryBtn.onclick = () => { hide(); onRetry(); };
    lobbyBtn.onclick = () => { hide(); onReturnToLobby(); };

    let open = false;

    function show(run) {
        const best = loadBestRun();
        const isBest = !best || run.wave > best.wave ||
            (run.wave === best.wave && run.score > best.score);
        if (isBest) saveBestRun(run);

        const accuracy = run.shots > 0 ? Math.round((run.hits / run.shots) * 100) : 0;
        const minutes = Math.floor(run.survivedMs / 60000);
        const seconds = Math.floor((run.survivedMs % 60000) / 1000);

        subtitle.innerText = run.wave > 0
            ? `You held the citadel through ${run.wave} wave${run.wave === 1 ? '' : 's'}.`
            : 'The first wave got you. Try holding the high ground.';

        stats.innerHTML = '';
        stats.append(
            statCard('WAVE REACHED', String(run.wave), '#7dd3fc'),
            statCard('SNOWMEN DOWN', String(run.kills), '#8affc1'),
            statCard('ACCURACY', `${accuracy}%`, '#ffd694'),
            statCard('SURVIVED', `${minutes}:${String(seconds).padStart(2, '0')}`, '#eaf4ff')
        );

        if (isBest) {
            bestLine.innerText = '★ New personal best!';
            bestLine.style.color = '#8affc1';
        } else {
            bestLine.innerText = `Your best: wave ${best.wave} · ${best.kills} kills`;
            bestLine.style.color = '#ffd694';
        }

        overlay.style.display = 'flex';
        open = true;
    }

    function hide() {
        overlay.style.display = 'none';
        open = false;
    }

    return { show, hide, isOpen: () => open };
}
