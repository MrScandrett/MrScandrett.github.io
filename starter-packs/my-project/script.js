// ================================================================
// script.js — behaviour for index.html.
// WHAT: Find elements on the page, then react when something happens.
// ================================================================

// WHAT: querySelector finds the FIRST element that matches a CSS selector.
// WHY: Saving them in constants means we search the page once, not every click.
const checkButton = document.querySelector("#check-button");
const checkMessage = document.querySelector("#check-message");

// WHAT: addEventListener runs the function every time the button is clicked.
checkButton.addEventListener("click", () => {
  checkMessage.textContent = "JavaScript is connected. You're ready to build!";
  checkMessage.classList.add("is-working"); // style.css turns this class green
});

// TRY THIS: Open the browser console (F12 → Console). This line prints there.
// The console is where errors appear too, so get used to looking at it.
console.log("script.js loaded");
