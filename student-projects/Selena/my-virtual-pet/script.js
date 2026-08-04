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
let hatched = false;

function clamp(value) {
    return Math.max(0, Math.min(10, value));
}

function render(nextMessage = '') {
    Object.entries(stats).forEach(([name, value]) => {
        displays[name].textContent = value;
    });
    if (!hatched) {
        pet.textContent = '🥚';
        message.textContent = 'Choose an activity to hatch your pet!';
        return;
    }
    const highestNeed = Math.max(stats.hunger, stats.sleepiness, stats.boredom);
    pet.textContent = highestNeed >= 9 ? '😿' : highestNeed >= 7 ? '🐱' : '😸';
    message.textContent = nextMessage || (highestNeed >= 9 ? 'Your pet needs some care.' : 'Your pet is happy!');
}

function care(kind, text) {
    hatched = true;
    stats[kind] = clamp(stats[kind] - 3);
    render(text);
}

document.getElementById('feed-btn').addEventListener('click', () => care('hunger', 'Yum! That hit the spot.'));
document.getElementById('sleep-btn').addEventListener('click', () => care('sleepiness', 'A cozy nap restored your pet.'));
document.getElementById('play-btn').addEventListener('click', () => care('boredom', 'Playtime made your pet smile!'));

window.setInterval(() => {
    if (!hatched) return;
    stats.age += 1;
    stats.hunger = clamp(stats.hunger + 1);
    stats.sleepiness = clamp(stats.sleepiness + 1);
    stats.boredom = clamp(stats.boredom + 1);
    render();
}, 12000);

render();
