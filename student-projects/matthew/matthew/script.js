const ingredientDefs = {
  Dough: { cost: 3, type: "base" },
  Sauce: { cost: 2, type: "base" },
  Cheese: { cost: 3, type: "base" },
  Pepperoni: { cost: 4, type: "topping" },
  Olive: { cost: 3, type: "topping" },
  Mushroom: { cost: 3, type: "topping" },
  Pepper: { cost: 3, type: "topping" },
};

const upgrades = {
  fast_oven: { cost: 20, label: "Fast Oven", desc: "Bake meter moves faster" },
  cozy_tables: { cost: 24, label: "Cozy Tables", desc: "+$1 tip on perfect orders" },
  ad_board: { cost: 28, label: "Ad Board", desc: "+2 customers each day" },
};

const state = {
  day: 1,
  money: 30,
  reputation: 50,
  served: 0,
  combo: 0,
  queue: [],
  currentOrder: null,
  dayOpen: false,
  timeLeft: 60,
  timerMax: 60,
  pizza: {
    hasDough: false,
    hasSauce: false,
    hasCheese: false,
    toppings: [],
  },
  bake: {
    active: false,
    heat: 0,
    dir: 1,
    done: false,
  },
  inventory: {
    Dough: 8,
    Sauce: 10,
    Cheese: 8,
    Pepperoni: 8,
    Olive: 6,
    Mushroom: 6,
    Pepper: 6,
  },
  employees: 0,
  paused: false,
  delivery: {
    pending: [],
    eta: 0,
  },
  ownedUpgrades: [],
};

const ui = {
  day: document.getElementById("day"),
  money: document.getElementById("money"),
  rep: document.getElementById("rep"),
  served: document.getElementById("served"),
  combo: document.getElementById("combo"),
  employees: document.getElementById("employees"),
  status: document.getElementById("status"),
  ingredientButtons: document.getElementById("ingredientButtons"),
  inventory: document.getElementById("inventory"),
  pizzaView: document.getElementById("pizzaView"),
  ovenHeat: document.getElementById("ovenHeat"),
  ovenFill: document.getElementById("ovenFill"),
  bakeBtn: document.getElementById("bakeBtn"),
  timeLeft: document.getElementById("timeLeft"),
  timerFill: document.getElementById("timerFill"),
  orderLabel: document.getElementById("orderLabel"),
  orderTicket: document.getElementById("orderTicket"),
  queue: document.getElementById("queue"),
  openBtn: document.getElementById("openBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  serveBtn: document.getElementById("serveBtn"),
  clearBtn: document.getElementById("clearBtn"),
  nextDayBtn: document.getElementById("nextDayBtn"),
  shopGrid: document.getElementById("shopGrid"),
  deliveryGrid: document.getElementById("deliveryGrid"),
  deliveryStatus: document.getElementById("deliveryStatus"),
  hireBtn: document.getElementById("hireBtn"),
};

const SAVE_KEY = "pizza_sim_save_v1";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function hasUpgrade(id) {
  return state.ownedUpgrades.includes(id);
}

function setStatus(text, cls = "") {
  ui.status.className = cls;
  ui.status.textContent = text;
}

function randFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function makeOrder() {
  const toppingPool = ["Pepperoni", "Olive", "Mushroom", "Pepper"];
  const toppingCount = 1 + Math.floor(Math.random() * 3);
  return {
    dough: true,
    sauce: true,
    cheese: true,
    toppings: shuffle(toppingPool).slice(0, toppingCount),
  };
}

function makeQueue() {
  const count = 5 + (state.day - 1) + (hasUpgrade("ad_board") ? 2 : 0);
  state.queue = Array.from({ length: count }, makeOrder);
}

function renderHud() {
  ui.day.textContent = String(state.day);
  ui.money.textContent = String(state.money);
  ui.rep.textContent = String(state.reputation);
  ui.served.textContent = String(state.served);
  ui.combo.textContent = String(state.combo);
  ui.employees.textContent = String(state.employees);
  ui.queue.textContent = String(state.queue.length + (state.currentOrder ? 1 : 0));
  ui.timeLeft.textContent = String(Math.ceil(Math.max(0, state.timeLeft)));
  ui.timerFill.style.width = `${clamp((state.timeLeft / state.timerMax) * 100, 0, 100)}%`;
  ui.ovenHeat.textContent = String(Math.round(state.bake.heat));
  ui.ovenFill.style.left = `${clamp(state.bake.heat, 0, 100)}%`;
}

function renderDeliveryStatus() {
  if (!state.delivery.pending.length) {
    ui.deliveryStatus.textContent = "No delivery in progress.";
  } else {
    ui.deliveryStatus.textContent = `Delivery arriving in ${Math.ceil(state.delivery.eta)}s`;
  }
}

function renderInventory() {
  ui.inventory.innerHTML = "";
  for (const [name, amount] of Object.entries(state.inventory)) {
    const div = document.createElement("div");
    div.className = "inv-item";
    div.textContent = `${name}: ${amount}`;
    ui.inventory.appendChild(div);
  }
}

function resetPizza() {
  state.pizza = { hasDough: false, hasSauce: false, hasCheese: false, toppings: [] };
  state.bake.active = false;
  state.bake.heat = 0;
  state.bake.dir = 1;
  state.bake.done = false;
}

function renderPizza() {
  ui.pizzaView.innerHTML = "";

  if (!state.pizza.hasDough) {
    ui.pizzaView.style.opacity = "0.55";
    return;
  }

  ui.pizzaView.style.opacity = "1";

  if (state.pizza.hasSauce) {
    const sauce = document.createElement("div");
    sauce.className = "layer sauce";
    ui.pizzaView.appendChild(sauce);
  }

  if (state.pizza.hasCheese) {
    const cheese = document.createElement("div");
    cheese.className = "layer cheese";
    ui.pizzaView.appendChild(cheese);
  }

  for (const top of state.pizza.toppings) {
    const dot = document.createElement("div");
    dot.className = `topping ${top.toLowerCase()}`;
    const r = 85 * Math.sqrt(Math.random());
    const t = Math.random() * Math.PI * 2;
    dot.style.left = `${124 + Math.cos(t) * r}px`;
    dot.style.top = `${124 + Math.sin(t) * r}px`;
    ui.pizzaView.appendChild(dot);
  }
}

function renderTicket() {
  ui.orderTicket.innerHTML = "";
  if (!state.currentOrder) {
    ui.orderLabel.textContent = "No customer yet.";
    return;
  }

  ui.orderLabel.textContent = "Customer order:";
  const rows = ["Dough", "Sauce", "Cheese", ...state.currentOrder.toppings];
  for (const item of rows) {
    const row = document.createElement("div");
    row.className = "ticket-item";
    row.textContent = item;
    ui.orderTicket.appendChild(row);
  }
}

function renderIngredients() {
  ui.ingredientButtons.innerHTML = "";
  for (const name of Object.keys(ingredientDefs)) {
    const btn = document.createElement("button");
    btn.className = "ing-btn";
    btn.textContent = name;
    btn.disabled = !state.dayOpen || state.inventory[name] <= 0;
    btn.addEventListener("click", () => addIngredient(name));
    ui.ingredientButtons.appendChild(btn);
  }
}

function renderShop() {
  ui.shopGrid.innerHTML = "";
  for (const [id, data] of Object.entries(upgrades)) {
    const card = document.createElement("div");
    card.className = "shop-item";
    const owned = hasUpgrade(id);
    card.innerHTML = `<strong>${data.label}</strong><div>${data.desc}</div><div>${owned ? "Owned" : `Cost: $${data.cost}`}</div>`;
    const buy = document.createElement("button");
    buy.textContent = owned ? "Owned" : "Buy";
    buy.disabled = owned || state.money < data.cost;
    buy.addEventListener("click", () => buyUpgrade(id));
    card.appendChild(buy);
    ui.shopGrid.appendChild(card);
  }
  ui.hireBtn.disabled = state.money < 18;
  ui.pauseBtn.textContent = state.paused ? "Resume" : "Pause";
}

function renderDeliveryShop() {
  ui.deliveryGrid.innerHTML = "";
  for (const [name, data] of Object.entries(ingredientDefs)) {
    const card = document.createElement("div");
    card.className = "shop-item";
    const orderCost = data.cost * 2;
    card.innerHTML = `<strong>${name} Crate</strong><div>+4 units</div><div>Cost: $${orderCost}</div>`;
    const orderBtn = document.createElement("button");
    orderBtn.textContent = "Order";
    orderBtn.disabled = state.money < orderCost;
    orderBtn.addEventListener("click", () => orderIngredient(name, 4, orderCost));
    card.appendChild(orderBtn);
    ui.deliveryGrid.appendChild(card);
  }
}

function orderIngredient(name, qty, cost) {
  if (state.money < cost) {
    setStatus("Not enough money.", "bad");
    return;
  }
  state.money -= cost;
  state.delivery.pending.push({ name, qty });
  if (state.delivery.eta <= 0) {
    state.delivery.eta = 60;
  }
  setStatus(`Ordered ${name} delivery (+${qty}).`, "");
  renderHud();
  renderShop();
  renderDeliveryShop();
  renderDeliveryStatus();
}

function applyDelivery() {
  for (const item of state.delivery.pending) {
    state.inventory[item.name] += item.qty;
  }
  state.delivery.pending = [];
  state.delivery.eta = 0;
  setStatus("Delivery arrived and added to inventory.", "good");
  renderInventory();
  renderIngredients();
  renderDeliveryStatus();
}

function addIngredient(name) {
  if (!state.dayOpen) return;
  if (state.inventory[name] <= 0) {
    setStatus("Out of that ingredient.", "bad");
    return;
  }

  if (name === "Dough") {
    state.pizza.hasDough = true;
  } else if (name === "Sauce") {
    if (!state.pizza.hasDough) {
      setStatus("Put dough first.", "bad");
      return;
    }
    state.pizza.hasSauce = true;
  } else if (name === "Cheese") {
    if (!state.pizza.hasSauce) {
      setStatus("Add sauce before cheese.", "bad");
      return;
    }
    state.pizza.hasCheese = true;
  } else {
    if (!state.pizza.hasCheese) {
      setStatus("Add cheese before toppings.", "bad");
      return;
    }
    state.pizza.toppings.push(name);
  }

  state.inventory[name] -= 1;
  renderInventory();
  renderIngredients();
  renderPizza();
}

function startOrder() {
  state.currentOrder = state.queue.shift() || null;
  if (!state.currentOrder) {
    endDay();
    return;
  }
  resetPizza();
  const dayPressure = Math.min(18, state.day * 1.2);
  const repRelief = state.reputation >= 70 ? 3 : 0;
  state.timerMax = clamp(60 - dayPressure + repRelief, 35, 62);
  state.timeLeft = state.timerMax;
  ui.serveBtn.disabled = false;
  ui.clearBtn.disabled = false;
  ui.bakeBtn.disabled = false;
  renderTicket();
  renderPizza();
  renderHud();
  saveGame();
}

function scorePizza() {
  if (!state.currentOrder) return { ok: false, text: "No active order." };

  let score = 0;
  if (state.pizza.hasDough) score += 1;
  if (state.pizza.hasSauce) score += 1;
  if (state.pizza.hasCheese) score += 1;

  const required = new Set(state.currentOrder.toppings);
  const made = state.pizza.toppings;

  for (const t of made) {
    if (required.has(t)) score += 1;
    else score -= 1;
  }

  if (!state.bake.done) score -= 2;
  else {
    const inZone = state.bake.heat >= 53 && state.bake.heat <= 67;
    if (inZone) score += 2;
    else score -= 1;
  }

  const perfect = score >= 3 + state.currentOrder.toppings.length + 2;
  return { ok: score >= 3, perfect };
}

function servePizza() {
  const result = scorePizza();

  if (!result.ok) {
    state.combo = 0;
    state.reputation = clamp(state.reputation - 6, 0, 100);
    setStatus("Bad pizza. Customer left unhappy.", "bad");
  } else {
    const base = 8 + state.currentOrder.toppings.length * 2;
    if (result.perfect) state.combo += 1;
    else state.combo = 0;
    const comboBonus = Math.min(8, state.combo);
    const tip = (result.perfect ? 2 : 0) + (hasUpgrade("cozy_tables") ? 1 : 0) + comboBonus;
    state.money += base + tip;
    state.served += 1;
    state.reputation = clamp(state.reputation + (result.perfect ? 3 : 1), 0, 100);
    setStatus(`Served. +$${base}${tip ? ` +$${tip} tip` : ""}${state.combo ? ` (Combo ${state.combo}x)` : ""}`, "good");
  }

  startOrder();
  renderHud();
  renderShop();
  saveGame();
}

function endDay() {
  state.dayOpen = false;
  ui.serveBtn.disabled = true;
  ui.clearBtn.disabled = true;
  ui.bakeBtn.disabled = true;
  ui.nextDayBtn.disabled = false;

  const rent = 7 + state.day * 2;
  const wages = state.employees * 3;
  state.money -= rent + wages;
  if (state.money < 0) {
    state.reputation = clamp(state.reputation - 6, 0, 100);
  }

  state.currentOrder = null;
  state.combo = 0;
  resetPizza();
  renderPizza();
  renderTicket();
  renderHud();
  renderIngredients();
  renderShop();
  setStatus(`Day ended. Rent -$${rent}, wages -$${wages}.`, "");
  saveGame();
}

function openShop() {
  if (state.dayOpen) return;
  state.dayOpen = true;
  ui.openBtn.disabled = true;
  ui.nextDayBtn.disabled = true;
  makeQueue();
  startOrder();
  renderIngredients();
  setStatus("Shop open. Build, bake, and serve pizzas.");
  saveGame();
}

function nextDay() {
  if (state.dayOpen) return;
  state.day += 1;
  ui.openBtn.disabled = false;
  setStatus(`Day ${state.day} ready. Open shop when ready.`);
  renderHud();
  saveGame();
}

function buyUpgrade(id) {
  const u = upgrades[id];
  if (!u || hasUpgrade(id)) return;
  if (state.money < u.cost) {
    setStatus("Not enough money.", "bad");
    return;
  }
  state.money -= u.cost;
  state.ownedUpgrades.push(id);
  setStatus(`${u.label} purchased.`, "good");
  renderHud();
  renderShop();
  saveGame();
}

function hireEmployee() {
  if (state.money < 18) {
    setStatus("Not enough money to hire.", "bad");
    return;
  }
  state.money -= 18;
  state.employees += 1;
  setStatus("Employee hired. Production speed increased.", "good");
  renderHud();
  renderShop();
  renderDeliveryShop();
  saveGame();
}

function tick() {
  if (state.paused) return;

  if (state.delivery.pending.length) {
    state.delivery.eta -= 0.1;
    if (state.delivery.eta <= 0) {
      applyDelivery();
    } else {
      renderDeliveryStatus();
    }
  }

  if (state.bake.active) {
    const employeeBoost = 1 + state.employees * 0.15;
    const speed = (hasUpgrade("fast_oven") ? 3.7 : 2.8) * employeeBoost;
    state.bake.heat += speed * state.bake.dir;
    if (state.bake.heat >= 100) {
      state.bake.heat = 100;
      state.bake.dir = -1;
    } else if (state.bake.heat <= 0) {
      state.bake.heat = 0;
      state.bake.dir = 1;
    }
    renderHud();
  }

  if (!state.dayOpen || !state.currentOrder) return;
  const timerDrain = Math.max(0.04, 0.1 - state.employees * 0.01);
  state.timeLeft -= timerDrain;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    state.reputation = clamp(state.reputation - 7, 0, 100);
    setStatus("Too slow. Customer left.", "bad");
    state.combo = 0;
    startOrder();
  }
  renderHud();
}

function togglePause() {
  state.paused = !state.paused;
  ui.pauseBtn.textContent = state.paused ? "Resume" : "Pause";
  setStatus(state.paused ? "Paused." : "Resumed.");
}

function saveGame() {
  const payload = {
    day: state.day,
    money: state.money,
    reputation: state.reputation,
    served: state.served,
    employees: state.employees,
    combo: state.combo,
    inventory: state.inventory,
    ownedUpgrades: state.ownedUpgrades,
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures.
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    state.day = Number(data.day) || 1;
    state.money = Number(data.money) || 30;
    state.reputation = Number(data.reputation) || 50;
    state.served = Number(data.served) || 0;
    state.employees = Number(data.employees) || 0;
    state.combo = Number(data.combo) || 0;
    if (data.inventory && typeof data.inventory === "object") {
      for (const k of Object.keys(state.inventory)) {
        if (typeof data.inventory[k] === "number") state.inventory[k] = data.inventory[k];
      }
    }
    if (Array.isArray(data.ownedUpgrades)) {
      state.ownedUpgrades = data.ownedUpgrades.filter((x) => upgrades[x]);
    }
    setStatus("Save loaded.");
  } catch {
    setStatus("Could not load save.", "bad");
  }
}

function bind() {
  ui.openBtn.addEventListener("click", openShop);
  ui.nextDayBtn.addEventListener("click", nextDay);
  ui.pauseBtn.addEventListener("click", togglePause);
  ui.serveBtn.addEventListener("click", servePizza);
  ui.clearBtn.addEventListener("click", () => {
    resetPizza();
    renderPizza();
  });
  ui.bakeBtn.addEventListener("click", () => {
    if (!state.dayOpen) return;
    if (!state.pizza.hasCheese) {
      setStatus("Build pizza first before baking.", "bad");
      return;
    }
    state.bake.active = !state.bake.active;
    if (!state.bake.active) state.bake.done = true;
  });
  ui.hireBtn.addEventListener("click", hireEmployee);
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "o") openShop();
    if (k === "b") ui.bakeBtn.click();
    if (k === "c") ui.clearBtn.click();
    if (k === "enter") ui.serveBtn.click();
    if (k === " ") {
      e.preventDefault();
      togglePause();
    }
  });
}

function init() {
  loadGame();
  bind();
  renderHud();
  renderInventory();
  renderIngredients();
  renderPizza();
  renderTicket();
  renderShop();
  renderDeliveryShop();
  renderDeliveryStatus();
  renderShop();
  setInterval(tick, 100);
  setInterval(saveGame, 5000);
}

init();
