export function createFpsMeter() {
    const label = document.createElement('div');
    label.style.position = 'absolute';
    label.style.top = '20px';
    label.style.left = '20px';
    label.style.padding = '6px 10px';
    label.style.color = '#9efc8f';
    label.style.backgroundColor = 'rgba(0, 0, 0, 0.45)';
    label.style.fontFamily = 'monospace';
    label.style.fontSize = '13px';
    label.style.border = '1px solid rgba(255,255,255,0.2)';
    label.style.pointerEvents = 'none';
    label.innerText = 'FPS: --';
    document.body.appendChild(label);

    let smoothedFps = 60;
    function update(deltaSeconds) {
        if (deltaSeconds <= 0) return;
        const instantFps = 1 / deltaSeconds;
        smoothedFps = smoothedFps * 0.92 + instantFps * 0.08;
        label.innerText = `FPS: ${Math.round(smoothedFps)}`;
    }

    return { element: label, update };
}
