const AUTH_KEY = "hub_auth_v1";
const LOGIN_PATH = "login.html";
const USERNAME = "Champion";
const PASSWORD = "CPA";

function isLoginPage() {
  return window.location.pathname.endsWith(`/${LOGIN_PATH}`) || window.location.pathname.endsWith(LOGIN_PATH);
}

function getSession() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.username) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

function setSession(username) {
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({
      username,
      ts: Date.now(),
    })
  );
}

function clearSession() {
  localStorage.removeItem(AUTH_KEY);
}

function nextTarget() {
  const path = `${window.location.pathname}${window.location.search}`;
  return encodeURIComponent(path);
}

function redirectToLogin() {
  window.location.replace(`${LOGIN_PATH}?next=${nextTarget()}`);
}

function redirectAfterLogin() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");
  if (next) {
    try {
      const decoded = decodeURIComponent(next);
      if (decoded && !decoded.endsWith(LOGIN_PATH)) {
        window.location.replace(decoded);
        return;
      }
    } catch (_) {
      // ignore bad next param
    }
  }
  window.location.replace("index.html");
}

function bindLogoutLinks() {
  document.querySelectorAll("[data-logout]").forEach((el) => {
    el.addEventListener("click", (event) => {
      event.preventDefault();
      clearSession();
      redirectToLogin();
    });
  });
}

function bindLoginForm() {
  const form = document.getElementById("hub-login-form");
  if (!form) return;

  const errorEl = document.getElementById("hub-login-error");
  const userInput = document.getElementById("hub-login-user");
  const passInput = document.getElementById("hub-login-pass");

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const u = (userInput?.value || "").trim();
    const p = (passInput?.value || "").trim();

    if (u === USERNAME && p === PASSWORD) {
      setSession(u);
      redirectAfterLogin();
      return;
    }

    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = "Invalid username or password.";
    }
  });
}

function protectPage() {
  const session = getSession();

  if (isLoginPage()) {
    if (session) {
      redirectAfterLogin();
      return;
    }
    return;
  }

  if (!session) {
    redirectToLogin();
  }
}

protectPage();

document.addEventListener("DOMContentLoaded", () => {
  bindLogoutLinks();
  if (isLoginPage()) {
    bindLoginForm();
  }
});
