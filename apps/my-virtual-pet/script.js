const stats = {
    hunger: 6,
    sleepiness: 4,
    boredom: 5,
    age: 0
};

const displays = Object.fromEntries(
    Object.keys(stats).map((name) => [name, document.getElementById(name)])
);
const pet = document.getElementById('pet-character');
const message = document.getElementById('message');
const effect = document.getElementById('effect');
let hatched = false;
let effectTimer;

function clamp(value) {
    return Math.max(0, Math.min(10, value));
}

function updateMeters() {
    ['hunger', 'sleepiness', 'boredom'].forEach((name) => {
        const card = document.querySelector(`[data-stat="${name}"]`);
        card.querySelector('.meter i').style.width = `${stats[name] * 10}%`;
        card.classList.toggle('warning', stats[name] >= 7);
        card.classList.toggle('danger', stats[name] >= 9);
    });
}

function render(nextMessage = '') {
    Object.entries(stats).forEach(([name, value]) => {
        displays[name].textContent = value;
    });
    updateMeters();

    if (!hatched) {
        message.textContent = 'Choose an activity to hatch your pet!';
        return;
    }

    pet.classList.add('hatched');
    const highestNeed = Math.max(stats.hunger, stats.sleepiness, stats.boredom);
    pet.classList.toggle('sad', highestNeed >= 9);
    pet.classList.toggle('tired', stats.sleepiness >= 8 && highestNeed < 9);
    message.textContent = nextMessage || (highestNeed >= 9
        ? 'Oh no! Luna needs a little extra care.'
        : highestNeed >= 7
            ? 'Luna could use some attention.'
            : 'Luna is happy and sparkling!');
}

function showEffect(icon) {
    window.clearTimeout(effectTimer);
    effect.textContent = `${icon} ✦ ${icon}`;
    effect.classList.remove('pop');
    void effect.offsetWidth;
    effect.classList.add('pop');
    effectTimer = window.setTimeout(() => effect.classList.remove('pop'), 1000);
}

function care(kind, text, icon) {
    const firstHatch = !hatched;
    hatched = true;
    stats[kind] = clamp(stats[kind] - 3);
    pet.classList.remove('care');
    void pet.offsetWidth;
    pet.classList.add('care');
    showEffect(firstHatch ? '✨' : icon);
    render(firstHatch ? 'You hatched Luna! She already loves you.' : text);
    window.setTimeout(() => pet.classList.remove('care'), 600);
}

document.getElementById('feed-btn').addEventListener('click', () => care('hunger', 'Berry delicious! Luna is full and happy.', '🍓'));
document.getElementById('sleep-btn').addEventListener('click', () => care('sleepiness', 'A moonlit catnap made Luna cozy.', '💤'));
document.getElementById('play-btn').addEventListener('click', () => care('boredom', 'That was pawsitively fun!', '⭐'));

window.setInterval(() => {
    if (!hatched) return;
    stats.age += 1;
    stats.hunger = clamp(stats.hunger + 1);
    stats.sleepiness = clamp(stats.sleepiness + 1);
    stats.boredom = clamp(stats.boredom + 1);
    render();
}, 12000);

render();
