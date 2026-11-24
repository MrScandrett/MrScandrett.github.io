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
let hasKey = false;
function turn(search) {
  if (search) {
    message.textContent = hasKey ? "Only dusty books remain." : "A brass key falls from a book.";
    hasKey = true;
  } else if (hasKey) {
    end("The key turns. You step into the garden!");
  } else {
    message.textContent = "Locked. Something glints on the shelves.";
  }
  render();
}
function render() {
  report(hasKey ? "Inventory · brass key" : "Inventory · empty");
}
first.onclick = () => turn(true);
second.onclick = () => turn(false);
again.onclick = () => location.reload();
render();
