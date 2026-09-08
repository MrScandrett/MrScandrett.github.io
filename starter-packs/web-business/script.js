"use strict";

// ============================================================
// WEB BUSINESS — SERVICES AND A CONTACT FORM THAT PREVIEWS
// Read README-FIRST.md before changing this file.
//
// IMPORTANT AND NOT NEGOTIABLE:
// this file never sends anything anywhere. It checks the form and shows the
// person what they wrote. A page opened from a file has no way to deliver mail,
// and a page that says "Message sent!" without sending one is lying to a
// customer. README-FIRST.md explains what a real form would need instead.
//
// Order of the file, top to bottom:
//   1. DATA      — services and the rules for the form
//   2. ELEMENTS  — the parts of the page this script touches
//   3. FUNCTIONS — one small job each
//   4. init()    — the only thing that runs by itself, at the bottom
// ============================================================


// ---------- 1. DATA ----------

// WHAT: the three services shown on the page. Everything about them is invented.
// WHY: keeping them here means one edit changes the page, and you cannot
// accidentally leave one service styled differently from the others.
const services = [
  {
    name: "Safety check",
    price: "from $25",
    description:
      "Brakes, tyres, lights and bolts checked in about twenty minutes, with a written list of anything that needs doing."
  },
  {
    name: "Gears and brakes",
    price: "from $45",
    description:
      "Cables, pads and shifting adjusted so the bike stops properly and changes gear without guessing."
  },
  {
    name: "Wheel rebuild",
    price: "from $80",
    description:
      "New spokes or a new rim, trued by hand. Usually cheaper than a new wheel and lasts longer."
  }
];

// WHAT: one rule per field: which input, what to call it, and what counts as
// filled in properly.
// WHY: keeping the rules as data means validate() below never grows a long chain
// of if-statements. Adding a field is adding one entry here.
const validationRules = [
  {
    id: "name",
    label: "Your name",
    check: function (value) {
      if (value.trim() === "") return "Please enter your name so we know who to reply to.";
      if (value.trim().length < 2) return "That looks too short. Please enter your full name.";
      return "";
    }
  },
  {
    id: "email",
    label: "Email address",
    check: function (value) {
      const text = value.trim();
      if (text === "") return "Please enter an email address.";
      // WHY this is deliberately simple: there is no short pattern that proves an
      // address is real. Only sending a message to it and getting a reply does
      // that. This catches obvious mistakes and nothing more - which is exactly
      // what front-end validation is for.
      const looksLikeEmail = text.includes("@") && text.indexOf("@") < text.lastIndexOf(".");
      if (!looksLikeEmail) return "That does not look like an email address. Check for a missing @ or a missing dot.";
      return "";
    }
  },
  {
    id: "service",
    label: "Which service",
    check: function (value) {
      if (value === "") return "Please choose a service from the list.";
      return "";
    }
  },
  {
    id: "message",
    label: "What is wrong with the bike",
    check: function (value) {
      if (value.trim() === "") return "Please describe the problem.";
      if (value.trim().length < 10) return "Please add a little more detail - at least 10 characters.";
      return "";
    }
  }
];


// ---------- 2. ELEMENTS ----------

const serviceList = document.querySelector("#service-list");
const form = document.querySelector("#contact-form");
const formStatus = document.querySelector("#form-status");
const preview = document.querySelector("#preview");
const previewBody = document.querySelector("#preview-body");


// ---------- 3. FUNCTIONS ----------

// Draw the three service cards from the services list.
function renderServices() {
  serviceList.replaceChildren();

  services.forEach(function (service) {
    const item = document.createElement("li");
    item.className = "service-card";

    const heading = document.createElement("h3");
    heading.textContent = service.name;

    const price = document.createElement("p");
    price.className = "price";
    price.textContent = service.price;

    const description = document.createElement("p");
    description.textContent = service.description;

    item.append(heading, price, description);
    serviceList.append(item);
  });
}

// Show or clear the error message for one field.
// WHY aria-invalid: it is how assistive software knows the field is in an error
// state. The red border alone only helps people who can see it.
function showFieldError(rule, messageText) {
  const field = document.querySelector("#" + rule.id);
  const errorLine = document.querySelector("#" + rule.id + "-error");

  errorLine.textContent = messageText;
  field.setAttribute("aria-invalid", messageText === "" ? "false" : "true");
}

// Check every field. Returns the list of fields that failed, in page order.
function findProblems() {
  const problems = [];

  validationRules.forEach(function (rule) {
    const field = document.querySelector("#" + rule.id);
    const messageText = rule.check(field.value);
    showFieldError(rule, messageText);
    if (messageText !== "") problems.push(rule);
  });

  return problems;
}

// Build one label-and-value pair for the preview.
function addPreviewRow(label, value) {
  const term = document.createElement("dt");
  term.textContent = label;
  const definition = document.createElement("dd");
  // WHY textContent and not innerHTML: whatever somebody types is shown as
  // words. If they type a tag, they see a tag. Text from a form is never code.
  definition.textContent = value;
  previewBody.append(term, definition);
}

// Show the preview of a valid message. Sends nothing. Stores nothing.
function showPreview() {
  previewBody.replaceChildren();

  addPreviewRow("From", document.querySelector("#name").value.trim());
  addPreviewRow("Reply to", document.querySelector("#email").value.trim());
  addPreviewRow("Service", document.querySelector("#service").value);
  addPreviewRow("Message", document.querySelector("#message").value.trim());

  preview.hidden = false;

  // Careful wording. "Ready" and "preview" - never "sent".
  formStatus.textContent =
    "Your message looks complete. A preview is shown below. Nothing has been sent, because this page cannot send mail.";
  formStatus.className = "status status-ok";
}

// What happens when the form is submitted.
function handleSubmit(event) {
  // WHAT: stop the browser's default submit, which would reload the page and
  // throw away everything typed.
  event.preventDefault();

  const problems = findProblems();

  if (problems.length > 0) {
    preview.hidden = true;

    formStatus.textContent =
      problems.length === 1
        ? "One field needs fixing: " + problems[0].label + "."
        : problems.length + " fields need fixing. The first is " + problems[0].label + ".";
    formStatus.className = "status status-error";

    // WHY: move the cursor to the first broken field. Somebody using a keyboard
    // or a screen reader should not have to hunt for the problem.
    document.querySelector("#" + problems[0].id).focus();
    return;
  }

  showPreview();
}


// ---------- 4. START ----------

function init() {
  renderServices();
  form.addEventListener("submit", handleSubmit);
}

init();
