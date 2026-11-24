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
let cash = 10, day = 1;
let sunny = Math.random() < 0.5;
let receipt = "";
function turn(cheap) {
  const price = cheap ? 1 : 2;
  const buyers = sunny ? 12 : 5;
  const sold = cheap ? buyers : Math.ceil(buyers / 2);
  cash += sold * price - 4;
  receipt = "Sold " + sold + " cups. ";
  day += 1;
  sunny = Math.random() < 0.5;
  render();
}
function render() {
  report(receipt + "Cash $" + cash + " · Day " + Math.min(day, 7));
  if (day > 7) end("Week complete!");
  else message.textContent = sunny ? "Forecast: sunny" : "Forecast: rainy";
}
first.onclick = () => turn(true);
second.onclick = () => turn(false);
again.onclick = () => location.reload();
render();
