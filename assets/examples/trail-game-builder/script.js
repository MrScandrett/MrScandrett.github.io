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
let miles = 0, food = 12, day = 1;
function turn(travel) {
  day += 1;
  if (travel) {
    miles += 10 + Math.floor(Math.random() * 6);
    food -= 3;
  } else {
    food += 4;
  }
  render();
}
function render() {
  report("Day " + day + " · " + miles + " miles · " + food + " rations");
  if (miles >= 100) end("You reached the fort!");
  else if (food <= 0 || day > 14) end("The expedition ran out of supplies or time.");
}
first.onclick = () => turn(true);
second.onclick = () => turn(false);
again.onclick = () => location.reload();
render();
