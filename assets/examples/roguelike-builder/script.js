const first = document.querySelector("#first");
const second = document.querySelector("#second");
const again = document.querySelector("#again");
const message = document.querySelector("#message");
function report(text) {
  document.querySelector("#stats").textContent = text;
}
function end(text) {
  message.textContent = text;
  first.hidden = second.hidden = true;
  again.hidden = false;
}
let floor = 1, health = 8, potions = 2;
function turn(descend) {
  if (descend) {
    floor += 1;
    const damage = 1 + Math.floor(Math.random() * 3);
    health -= damage;
    message.textContent = "An encounter cost " + damage + " health.";
  } else if (potions > 0) {
    potions -= 1;
    health += 3;
    message.textContent = "You feel stronger.";
  } else {
    message.textContent = "No potions left.";
  }
  render();
}
function render() {
  report("Floor " + floor + " · Health " + health + " · Potions " + potions);
  if (health <= 0) end("Your expedition ends here.");
  else if (floor >= 5) end("You found the vault!");
}
first.onclick = () => turn(true);
second.onclick = () => turn(false);
again.onclick = () => location.reload();
render();
