const ingredientDefs = {
  Dough: { cost: 3, type: "base" },
  Sauce: { cost: 2, type: "base" },
  Cheese: { cost: 3, type: "base" },
  Pepperoni: { cost: 4, type: "topping" },
  Chicken: { cost: 4, type: "topping" },
  Bacon: { cost: 4, type: "topping" },
  Sausage: { cost: 4, type: "topping" },
  Onion: { cost: 3, type: "topping" },
  Jalapeno: { cost: 3, type: "topping" },
  Olive: { cost: 3, type: "topping" },
  Mushroom: { cost: 3, type: "topping" },
  Pepper: { cost: 3, type: "topping" },
  Pineapple: { cost: 3, type: "topping" },
  Ham: { cost: 4, type: "topping" },
};

const drinkDefs = {
  Cola: { tipBonus: 2 },
  Lemonade: { tipBonus: 2 },
  Water: { tipBonus: 1 },
};

const upgrades = {
  fast_oven: { cost: 20, label: "Fast Oven", desc: "Bake meter moves faster" },
  cozy_tables: { cost: 24, label: "Cozy Tables", desc: "+$1 tip on perfect orders" },
  ad_board: { cost: 28, label: "Ad Board", desc: "+2 customers each day" },
  dispatch_rider: { cost: 22, label: "Dispatch Rider", desc: "Ingredient deliveries arrive faster" },
};

const recipeDefs = {
  classic_cheese: { label: "Classic Cheese", toppings: [], unlockDay: 1, baseBonus: 0 },
  pepperoni_classic: { label: "Pepperoni Classic", toppings: ["Pepperoni"], unlockDay: 1, baseBonus: 1 },
  garden_fresh: { label: "Garden Fresh", toppings: ["Mushroom", "Olive", "Pepper"], unlockDay: 1, baseBonus: 2 },
  bbq_chicken: { label: "BBQ Chicken", toppings: ["Chicken", "Bacon"], unlockDay: 2, baseBonus: 2 },
  sausage_onion: { label: "Sausage & Onion", toppings: ["Sausage", "Onion"], unlockDay: 2, baseBonus: 2 },
  spicy_kick: { label: "Spicy Kick", toppings: ["Jalapeno", "Pepperoni"], unlockDay: 3, baseBonus: 2 },
  tropical_ham: { label: "Tropical Ham", toppings: ["Ham", "Pineapple"], unlockDay: 3, baseBonus: 2 },
  firehouse_meat: { label: "Firehouse Meat", toppings: ["Sausage", "Bacon", "Jalapeno"], unlockDay: 4, baseBonus: 3 },
  meat_lovers: { label: "Meat Lovers", toppings: ["Pepperoni", "Bacon", "Ham"], unlockDay: 4, baseBonus: 3 },
  house_supreme: { label: "House Supreme", toppings: ["Pepperoni", "Mushroom", "Olive", "Pepper", "Onion"], unlockDay: 5, baseBonus: 4 },
};

const customerTypeDefs = {
  regular: {
    label: "Regular",
    weight: 40,
    timerMult: 1,
    minScore: 3,
    tipBonus: 0,
    perfectTipBonus: 0,
    repGainBonus: 0,
    failPenalty: 6,
    timeoutPenalty: 7,
    perfectScoreBonus: 0,
  },
  patient: {
    label: "Patient",
    weight: 18,
    timerMult: 1.18,
    minScore: 2,
    tipBonus: 0,
    perfectTipBonus: 1,
    repGainBonus: 0,
    failPenalty: 4,
    timeoutPenalty: 5,
    perfectScoreBonus: 0,
  },
  rush: {
    label: "Rush",
    weight: 24,
    timerMult: 0.82,
    minScore: 3,
    tipBonus: 2,
    perfectTipBonus: 1,
    repGainBonus: 0,
    failPenalty: 7,
    timeoutPenalty: 8,
    perfectScoreBonus: 0,
  },
  picky: {
    label: "Picky",
    weight: 18,
    timerMult: 0.95,
    minScore: 4,
    tipBonus: 2,
    perfectTipBonus: 3,
    repGainBonus: 1,
    failPenalty: 9,
    timeoutPenalty: 9,
    perfectScoreBonus: 0,
  },
};

// IDEA: add a weekly special event (own entry here + a case in rollDayEvent)
// that unlocks a limited-time recipe for bonus tips.
const dayEventDefs = {
  none: {
    label: "None",
    desc: "Standard business day.",
    weight: 26,
    queueBonus: 0,
    timerMult: 1,
    payBonus: 0,
    tipBonus: 0,
    perfectRepBonus: 0,
    deliveryCostMult: 1,
    customerBias: null,
  },
  lunch_rush: {
    label: "Lunch Rush",
    desc: "More customers, faster clocks, +$1 base pay.",
    weight: 23,
    queueBonus: 3,
    timerMult: 0.88,
    payBonus: 1,
    tipBonus: 0,
    perfectRepBonus: 0,
    deliveryCostMult: 1,
    customerBias: "rush",
  },
  block_party: {
    label: "Block Party",
    desc: "Crowds are generous today: +2 customers, +$2 tips.",
    weight: 20,
    queueBonus: 2,
    timerMult: 1,
    payBonus: 0,
    tipBonus: 2,
    perfectRepBonus: 1,
    deliveryCostMult: 1,
    customerBias: null,
  },
  ingredient_shortage: {
    label: "Ingredient Shortage",
    desc: "Fewer customers but delivery crates cost 50% more.",
    weight: 17,
    queueBonus: -1,
    timerMult: 1,
    payBonus: 0,
    tipBonus: 0,
    perfectRepBonus: 0,
    deliveryCostMult: 1.5,
    customerBias: null,
  },
  family_night: {
    label: "Family Night",
    desc: "Slightly longer timers and more patient customers.",
    weight: 14,
    queueBonus: 1,
    timerMult: 1.12,
    payBonus: 0,
    tipBonus: 0,
    perfectRepBonus: 0,
    deliveryCostMult: 1,
    customerBias: "patient",
  },
  recipe_spotlight: {
    label: "Recipe Spotlight",
    desc: "Customers ask for {{recipe}} more often.",
    weight: 12,
    minDay: 3,
    queueBonus: 1,
    timerMult: 1,
    payBonus: 0,
    tipBonus: 0,
    perfectRepBonus: 1,
    deliveryCostMult: 1,
    customerBias: null,
    spotlightTipBonus: 2,
  },
};

const STARTER_RECIPE_IDS = Object.entries(recipeDefs)
  .filter(([, recipe]) => recipe.unlockDay === 1)
  .map(([id]) => id);
const TOTAL_RECIPE_COUNT = Object.keys(recipeDefs).length;

function createInitialState() {
  return {
    day: 1,
    money: 15,
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
      Dough: 20,
      Sauce: 20,
      Cheese: 20,
      Pepperoni: 20,
      Chicken: 20,
      Bacon: 20,
      Sausage: 20,
      Onion: 20,
      Jalapeno: 20,
      Olive: 20,
      Mushroom: 20,
      Pepper: 20,
      Pineapple: 20,
      Ham: 20,
    },
    employees: 0,
    paused: false,
    delivery: {
      pending: [],
      eta: 0,
    },
    ownedUpgrades: [],
    unlockedRecipes: [...STARTER_RECIPE_IDS],
    dayEvent: {
      id: "none",
      spotlightRecipeId: null,
    },
    drinkStation: {
      prepared: null,
    },
  };
}

const state = createInitialState();

const ui = {
  day: document.getElementById("day"),
  money: document.getElementById("money"),
  rep: document.getElementById("rep"),
  served: document.getElementById("served"),
  combo: document.getElementById("combo"),
  employees: document.getElementById("employees"),
  eventName: document.getElementById("eventName"),
  customerType: document.getElementById("customerType"),
  servedRecipeNotice: document.getElementById("servedRecipeNotice"),
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
  drinkRequest: document.getElementById("drinkRequest"),
  drinkPrepared: document.getElementById("drinkPrepared"),
  drinkButtons: document.getElementById("drinkButtons"),
  clearDrinkBtn: document.getElementById("clearDrinkBtn"),
  drinkCupLiquid: document.getElementById("drinkCupLiquid"),
  queue: document.getElementById("queue"),
  openBtn: document.getElementById("openBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  serveBtn: document.getElementById("serveBtn"),
  clearBtn: document.getElementById("clearBtn"),
  restartBtn: document.getElementById("restartBtn"),
  nextDayBtn: document.getElementById("nextDayBtn"),
  shopGrid: document.getElementById("shopGrid"),
  recipeList: document.getElementById("recipeList"),
  recipeUnlockStatus: document.getElementById("recipeUnlockStatus"),
  deliveryGrid: document.getElementById("deliveryGrid"),
  deliveryStatus: document.getElementById("deliveryStatus"),
  hireBtn: document.getElementById("hireBtn"),
};

const SAVE_KEY = "pizza_sim_save_v1";
let servedRecipeNoticeTimer = null;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function randFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick(items) {
  if (!items.length) return null;
  const total = items.reduce((sum, item) => sum + Math.max(0, item.weight || 0), 0);
  if (total <= 0) return items[0].id;

  let roll = Math.random() * total;
  for (const item of items) {
    roll -= Math.max(0, item.weight || 0);
    if (roll <= 0) return item.id;
  }
  return items[items.length - 1].id;
}

function hasUpgrade(id) {
  return state.ownedUpgrades.includes(id);
}

function setStatus(text, cls = "") {
  ui.status.className = cls;
  ui.status.textContent = text;
}

function showServedRecipeNotice(recipeLabel) {
  if (!ui.servedRecipeNotice) return;
  if (servedRecipeNoticeTimer) {
    clearTimeout(servedRecipeNoticeTimer);
    servedRecipeNoticeTimer = null;
  }

  ui.servedRecipeNotice.textContent = `Served: ${recipeLabel}`;
  ui.servedRecipeNotice.classList.add("show");
  servedRecipeNoticeTimer = setTimeout(() => {
    ui.servedRecipeNotice.classList.remove("show");
    servedRecipeNoticeTimer = null;
  }, 2200);
}

function getEventDef() {
  return dayEventDefs[state.dayEvent.id] || dayEventDefs.none;
}

function getEventLabel() {
  const event = getEventDef();
  if (state.dayEvent.id === "recipe_spotlight" && state.dayEvent.spotlightRecipeId) {
    const recipe = recipeDefs[state.dayEvent.spotlightRecipeId];
    return `${event.label}: ${recipe.label}`;
  }
  return event.label;
}

function getEventDescription() {
  const event = getEventDef();
  if (state.dayEvent.id === "recipe_spotlight" && state.dayEvent.spotlightRecipeId) {
    const recipe = recipeDefs[state.dayEvent.spotlightRecipeId];
    return event.desc.replace("{{recipe}}", recipe.label);
  }
  return event.desc;
}

function getCurrentCustomerDef() {
  if (!state.currentOrder) return customerTypeDefs.regular;
  return customerTypeDefs[state.currentOrder.customerType] || customerTypeDefs.regular;
}

function getCurrentRecipeDef() {
  if (!state.currentOrder) return recipeDefs.classic_cheese;
  return recipeDefs[state.currentOrder.recipeId] || recipeDefs.classic_cheese;
}

function getDeliveryEta() {
  return hasUpgrade("dispatch_rider") ? 35 : 60;
}

function getDeliveryCostMultiplier() {
  return getEventDef().deliveryCostMult || 1;
}

function getMinUnitsForIngredient(name) {
  if (ingredientDefs[name]?.type !== "topping") return 1;
  return 2;
}

function getToppingPortionSize(name) {
  const stock = state.inventory[name];
  if (name === "Chicken") {
    if (stock < 2) return 0;
    const maxPortion = Math.min(5, stock);
    return 2 + Math.floor(Math.random() * (maxPortion - 1));
  }
  if (stock < 2) return 0;
  const maxPortion = Math.min(4, stock);
  return 2 + Math.floor(Math.random() * (maxPortion - 1));
}

function normalizeUnlockedRecipes(list) {
  if (!Array.isArray(list)) return [...STARTER_RECIPE_IDS];
  const valid = [];
  for (const id of list) {
    if (recipeDefs[id] && !valid.includes(id)) valid.push(id);
  }
  if (!valid.length) return [...STARTER_RECIPE_IDS];
  return valid;
}

function unlockRecipesForDay(announce = false) {
  const unlockedNow = [];
  for (const [id, recipe] of Object.entries(recipeDefs)) {
    if (state.unlockedRecipes.includes(id)) continue;
    if (state.day >= recipe.unlockDay) {
      state.unlockedRecipes.push(id);
      unlockedNow.push(recipe.label);
    }
  }
  if (unlockedNow.length && announce) {
    setStatus(`New recipe unlocked: ${unlockedNow.join(", ")}.`, "good");
  }
  if (unlockedNow.length) {
    renderHud();
    renderRecipes();
    saveGame();
  }
  return unlockedNow;
}

function rollDayEvent() {
  const pool = [];
  for (const [id, event] of Object.entries(dayEventDefs)) {
    if (event.minDay && state.day < event.minDay) continue;
    if (id === "recipe_spotlight" && state.unlockedRecipes.length < 4) continue;
    pool.push({ id, weight: event.weight });
  }

  const chosen = weightedPick(pool) || "none";
  state.dayEvent = { id: chosen, spotlightRecipeId: null };

  if (chosen === "recipe_spotlight") {
    const unlockedAdvanced = state.unlockedRecipes.filter((id) => recipeDefs[id]?.unlockDay > 1);
    const spotlightPool = unlockedAdvanced.length ? unlockedAdvanced : state.unlockedRecipes;
    state.dayEvent.spotlightRecipeId = randFrom(spotlightPool);
  }
}

function pickRecipeIdForOrder() {
  const available = state.unlockedRecipes.length ? state.unlockedRecipes : [...STARTER_RECIPE_IDS];
  if (state.dayEvent.id === "recipe_spotlight" && state.dayEvent.spotlightRecipeId) {
    const weighted = available.map((id) => ({
      id,
      weight: id === state.dayEvent.spotlightRecipeId ? 4 : 1,
    }));
    return weightedPick(weighted) || available[0];
  }
  return randFrom(available);
}

function pickCustomerTypeForOrder() {
  const event = getEventDef();
  const weighted = Object.entries(customerTypeDefs).map(([id, data]) => {
    let weight = data.weight;
    if (event.customerBias && event.customerBias === id) {
      weight += 10;
    }
    return { id, weight };
  });
  return weightedPick(weighted) || "regular";
}

function pickDrinkForOrder() {
  const wantsDrink = Math.random() < 0.45;
  if (!wantsDrink) return null;
  return randFrom(Object.keys(drinkDefs));
}

function makeOrder() {
  const recipeId = pickRecipeIdForOrder();
  const recipe = recipeDefs[recipeId];
  const customerType = pickCustomerTypeForOrder();
  return {
    dough: true,
    sauce: true,
    cheese: true,
    recipeId,
    customerType,
    toppings: [...recipe.toppings],
    drink: pickDrinkForOrder(),
  };
}

function makeQueue() {
  const event = getEventDef();
  const count = clamp(5 + (state.day - 1) + (hasUpgrade("ad_board") ? 2 : 0) + (event.queueBonus || 0), 3, 24);
  state.queue = Array.from({ length: count }, makeOrder);
}

function renderHud() {
  const totalQueue = state.queue.length + (state.currentOrder ? 1 : 0);
  ui.day.textContent = String(state.day);
  ui.money.textContent = String(state.money);
  ui.rep.textContent = String(state.reputation);
  ui.served.textContent = String(state.served);
  ui.combo.textContent = String(state.combo);
  ui.employees.textContent = String(state.employees);
  ui.queue.textContent = String(totalQueue);
  ui.timeLeft.textContent = String(Math.ceil(Math.max(0, state.timeLeft)));
  ui.timerFill.style.width = `${clamp((state.timeLeft / state.timerMax) * 100, 0, 100)}%`;
  ui.ovenHeat.textContent = String(Math.round(state.bake.heat));
  ui.ovenFill.style.left = `${clamp(state.bake.heat, 0, 100)}%`;
  ui.eventName.textContent = state.dayOpen ? getEventLabel() : "None";
  ui.customerType.textContent = state.currentOrder ? getCurrentCustomerDef().label : "-";
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

function renderRecipes() {
  if (!ui.recipeList || !ui.recipeUnlockStatus) return;
  ui.recipeList.innerHTML = "";
  for (const [id, recipe] of Object.entries(recipeDefs)) {
    const unlocked = state.unlockedRecipes.includes(id);
    const card = document.createElement("div");
    card.className = "recipe-item";
    if (unlocked) {
      const toppings = recipe.toppings.length ? recipe.toppings.join(", ") : "Cheese only";
      card.innerHTML = `<strong>${recipe.label}</strong><div>${toppings}</div>`;
    } else {
      card.innerHTML = `<strong>Locked Recipe</strong><div>Unlocks on Day ${recipe.unlockDay}</div>`;
    }
    ui.recipeList.appendChild(card);
  }
  ui.recipeUnlockStatus.textContent = `${state.unlockedRecipes.length} / ${TOTAL_RECIPE_COUNT} recipes unlocked`;
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
    if (top === "Bacon") {
      const angle = Math.floor(Math.random() * 90) - 45;
      const scale = (0.85 + Math.random() * 0.45).toFixed(2);
      dot.style.transform = `rotate(${angle}deg) scale(${scale})`;
    } else if (top === "Chicken") {
      const angle = Math.floor(Math.random() * 130) - 65;
      const scale = (0.8 + Math.random() * 0.55).toFixed(2);
      dot.style.transform = `rotate(${angle}deg) scale(${scale})`;
      const sat = (0.9 + Math.random() * 0.35).toFixed(2);
      const bright = (0.88 + Math.random() * 0.28).toFixed(2);
      dot.style.filter = `saturate(${sat}) brightness(${bright})`;
    } else if (top === "Onion") {
      const angle = Math.floor(Math.random() * 180) - 90;
      const scale = (0.9 + Math.random() * 0.35).toFixed(2);
      dot.style.transform = `rotate(${angle}deg) scale(${scale})`;
    } else if (top === "Jalapeno") {
      const angle = Math.floor(Math.random() * 180) - 90;
      const scale = (0.9 + Math.random() * 0.25).toFixed(2);
      dot.style.transform = `rotate(${angle}deg) scale(${scale})`;
    } else if (top === "Pepper") {
      const angle = Math.floor(Math.random() * 180) - 90;
      const scale = (0.9 + Math.random() * 0.28).toFixed(2);
      const squash = (0.8 + Math.random() * 0.35).toFixed(2);
      dot.style.transform = `rotate(${angle}deg) scale(${scale}) scaleX(${squash})`;
    } else if (top === "Olive") {
      const angle = Math.floor(Math.random() * 180) - 90;
      const scale = (0.85 + Math.random() * 0.25).toFixed(2);
      const squash = (0.62 + Math.random() * 0.42).toFixed(2);
      dot.style.transform = `rotate(${angle}deg) scale(${scale}) scaleX(${squash})`;
    } else if (top === "Mushroom") {
      const angle = Math.floor(Math.random() * 180) - 90;
      const scale = (0.85 + Math.random() * 0.3).toFixed(2);
      dot.style.transform = `rotate(${angle}deg) scale(${scale})`;
    } else if (top === "Ham") {
      const angle = Math.floor(Math.random() * 90) - 45;
      const scale = (0.92 + Math.random() * 0.38).toFixed(2);
      const bright = (0.9 + Math.random() * 0.25).toFixed(2);
      dot.style.transform = `rotate(${angle}deg) scale(${scale})`;
      dot.style.filter = `saturate(1.05) brightness(${bright})`;
    } else if (top === "Pineapple") {
      const angle = Math.floor(Math.random() * 180) - 90;
      const scale = (0.86 + Math.random() * 0.34).toFixed(2);
      const squash = (0.88 + Math.random() * 0.24).toFixed(2);
      dot.style.transform = `rotate(${angle}deg) scale(${scale}) scaleY(${squash})`;
    }
    ui.pizzaView.appendChild(dot);
  }
}

function renderTicket() {
  ui.orderTicket.innerHTML = "";
  if (!state.currentOrder) {
    ui.orderLabel.textContent = "No customer yet.";
    return;
  }

  const recipe = getCurrentRecipeDef();
  const customer = getCurrentCustomerDef();
  ui.orderLabel.textContent = `${customer.label} customer wants ${recipe.label}`;

  const rows = ["Dough", "Sauce", "Cheese", ...state.currentOrder.toppings];
  if (state.currentOrder.drink) rows.push(`Drink: ${state.currentOrder.drink}`);
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
    const minUnits = getMinUnitsForIngredient(name);
    btn.disabled = !state.dayOpen || state.inventory[name] < minUnits;
    btn.addEventListener("click", () => addIngredient(name));
    ui.ingredientButtons.appendChild(btn);
  }
}

function renderDrinkStation() {
  if (!ui.drinkButtons || !ui.drinkRequest || !ui.drinkPrepared || !ui.clearDrinkBtn) return;
  const requested = state.currentOrder?.drink || "None";
  const prepared = state.drinkStation.prepared || "None";
  ui.drinkRequest.textContent = requested;
  ui.drinkPrepared.textContent = prepared;
  if (ui.drinkCupLiquid) {
    const liquidType = state.drinkStation.prepared ? state.drinkStation.prepared.toLowerCase() : "none";
    ui.drinkCupLiquid.className = `cup-liquid ${liquidType}`;
  }

  ui.drinkButtons.innerHTML = "";
  for (const name of Object.keys(drinkDefs)) {
    const btn = document.createElement("button");
    btn.className = `drink-btn${state.drinkStation.prepared === name ? " active" : ""}`;
    btn.textContent = `Pour ${name}`;
    btn.disabled = !state.dayOpen || !state.currentOrder;
    btn.addEventListener("click", () => prepareDrink(name));
    ui.drinkButtons.appendChild(btn);
  }

  ui.clearDrinkBtn.disabled = !state.dayOpen || !state.currentOrder || !state.drinkStation.prepared;
}

function prepareDrink(name) {
  if (!state.dayOpen || !state.currentOrder) return;
  if (!drinkDefs[name]) return;
  state.drinkStation.prepared = name;
  setStatus(`${name} is ready at the drink station.`);
  renderDrinkStation();
}

function clearPreparedDrink() {
  state.drinkStation.prepared = null;
  setStatus("Cleared prepared drink.");
  renderDrinkStation();
}

function scoreDrink() {
  if (!state.currentOrder?.drink) {
    return { requested: null, prepared: state.drinkStation.prepared, tipDelta: 0, repDelta: 0, note: "" };
  }

  const requested = state.currentOrder.drink;
  const prepared = state.drinkStation.prepared;

  if (!prepared) {
    return { requested, prepared: null, tipDelta: -2, repDelta: -1, note: `No ${requested}` };
  }

  if (prepared === requested) {
    const tipDelta = drinkDefs[requested]?.tipBonus ?? 2;
    return { requested, prepared, tipDelta, repDelta: 1, note: `+ ${requested}` };
  }

  return { requested, prepared, tipDelta: -1, repDelta: -1, note: "Wrong drink" };
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
  const costMult = getDeliveryCostMultiplier();
  for (const [name, data] of Object.entries(ingredientDefs)) {
    const card = document.createElement("div");
    card.className = "shop-item";
    const orderCost = Math.ceil(data.cost * 2 * costMult);
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
    state.delivery.eta = getDeliveryEta();
  }
  if (getDeliveryCostMultiplier() > 1) {
    setStatus(`Ordered ${name} (+${qty}) at shortage pricing.`, "");
  } else {
    setStatus(`Ordered ${name} delivery (+${qty}).`, "");
  }
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
  const def = ingredientDefs[name];
  if (!def) return;

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
    const portionSize = getToppingPortionSize(name);
    const minUnits = getMinUnitsForIngredient(name);
    if (portionSize < minUnits) {
      setStatus(`Need at least ${minUnits} ${name} in stock.`, "bad");
      return;
    }
    for (let i = 0; i < portionSize; i += 1) {
      state.pizza.toppings.push(name);
    }
    state.inventory[name] -= portionSize;
    setStatus(`Added ${portionSize}x ${name}.`);
    renderInventory();
    renderIngredients();
    renderPizza();
    return;
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
  state.drinkStation.prepared = null;
  const dayPressure = Math.min(18, state.day * 1.2);
  const repRelief = state.reputation >= 70 ? 3 : 0;
  const event = getEventDef();
  const customer = getCurrentCustomerDef();
  state.timerMax = clamp((60 - dayPressure + repRelief) * customer.timerMult * event.timerMult, 28, 75);
  state.timeLeft = state.timerMax;
  ui.serveBtn.disabled = false;
  ui.clearBtn.disabled = false;
  ui.bakeBtn.disabled = false;
  renderTicket();
  renderDrinkStation();
  renderPizza();
  renderHud();
  saveGame();
}

function getBakeResult() {
  if (!state.bake.done) {
    return { id: "undercooked", label: "Undercooked", scoreDelta: -2, tipDelta: -4 };
  }

  const heat = state.bake.heat;
  if (heat >= 53 && heat <= 67) {
    return { id: "perfect", label: "Perfect", scoreDelta: 2, tipDelta: 3 };
  }
  if (heat < 53) {
    return { id: "undercooked", label: "Undercooked", scoreDelta: -1, tipDelta: -2 };
  }

  const overdoneTipPenalty = heat >= 86 ? -4 : -2;
  return { id: "overdone", label: "Overdone", scoreDelta: -1, tipDelta: overdoneTipPenalty };
}

function scorePizza() {
  if (!state.currentOrder) {
    return {
      ok: false,
      perfect: false,
      score: 0,
      bake: { id: "undercooked", label: "Undercooked", scoreDelta: -2, tipDelta: -4 },
    };
  }
  const customer = getCurrentCustomerDef();
  const bake = getBakeResult();

  let score = 0;
  if (state.pizza.hasDough) score += 1;
  if (state.pizza.hasSauce) score += 1;
  if (state.pizza.hasCheese) score += 1;

  const required = new Set(state.currentOrder.toppings);
  const made = new Set(state.pizza.toppings);

  for (const topping of required) {
    if (made.has(topping)) score += 1;
    else score -= 1;
  }
  for (const topping of made) {
    if (!required.has(topping)) score -= 1;
  }

  score += bake.scoreDelta;

  const perfectTarget = 3 + state.currentOrder.toppings.length + 2 + customer.perfectScoreBonus;
  return { ok: score >= customer.minScore, perfect: score >= perfectTarget, score, bake };
}

function servePizza() {
  if (!state.currentOrder) return;
  const result = scorePizza();
  const event = getEventDef();
  const customer = getCurrentCustomerDef();
  const recipe = getCurrentRecipeDef();

  if (!result.ok) {
    state.combo = 0;
    state.reputation = clamp(state.reputation - customer.failPenalty, 0, 100);
    setStatus(`${customer.label} customer rejected the pizza.`, "bad");
  } else {
    const base = 8 + state.currentOrder.toppings.length * 2 + recipe.baseBonus + event.payBonus;
    if (result.perfect) state.combo += 1;
    else state.combo = 0;
    const comboBonus = Math.min(8, state.combo);
    const drink = scoreDrink();

    let tip = (result.perfect ? 2 : 0) + (hasUpgrade("cozy_tables") ? 1 : 0) + comboBonus + customer.tipBonus + event.tipBonus;
    if (result.perfect) tip += customer.perfectTipBonus;
    if (state.dayEvent.id === "recipe_spotlight" && state.dayEvent.spotlightRecipeId === state.currentOrder.recipeId) {
      tip += event.spotlightTipBonus || 0;
    }
    tip += drink.tipDelta;
    tip += result.bake.tipDelta;
    tip = Math.max(0, tip);

    const comboMilestone = result.perfect && state.combo > 0 && state.combo % 5 === 0;
    const milestoneBonus = comboMilestone ? 5 : 0;

    state.money += base + tip + milestoneBonus;
    state.served += 1;
    const repGain = (result.perfect ? 3 : 1) + customer.repGainBonus + (result.perfect ? event.perfectRepBonus : 0);
    state.reputation = clamp(state.reputation + repGain + drink.repDelta, 0, 100);
    const drinkText = drink.requested ? `, ${drink.note}` : "";
    setStatus(
      `Served ${recipe.label} (${result.bake.label} bake${drinkText}). +$${base}${tip ? ` +$${tip} tip` : ""}${state.combo ? ` (Combo ${state.combo}x)` : ""}${comboMilestone ? ` Combo streak bonus +$${milestoneBonus}!` : ""}`,
      "good",
    );
    showServedRecipeNotice(recipe.label);
  }

  startOrder();
  renderHud();
  renderShop();
  renderRecipes();
  saveGame();
}

function endDay() {
  state.dayOpen = false;
  state.dayEvent = { id: "none", spotlightRecipeId: null };
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
  state.drinkStation.prepared = null;
  resetPizza();
  renderPizza();
  renderTicket();
  renderDrinkStation();
  renderHud();
  renderIngredients();
  renderDeliveryShop();
  renderShop();
  setStatus(`Day ended. Rent -$${rent}, wages -$${wages}.`, "");
  saveGame();
}

function openShop() {
  if (state.dayOpen) return;
  state.dayOpen = true;
  ui.openBtn.disabled = true;
  ui.nextDayBtn.disabled = true;
  rollDayEvent();
  makeQueue();
  startOrder();
  renderIngredients();
  renderDeliveryShop();
  renderHud();
  setStatus(`Shop open. Event: ${getEventDescription()}`);
  saveGame();
}

function nextDay() {
  if (state.dayOpen) return;
  state.day += 1;
  ui.openBtn.disabled = false;
  const unlocked = unlockRecipesForDay(false);
  const unlockText = unlocked.length ? ` New recipes: ${unlocked.join(", ")}.` : "";
  setStatus(`Day ${state.day} ready.${unlockText} Open shop when ready.`);
  renderHud();
  renderRecipes();
  renderDeliveryShop();
  saveGame();
}

function restartGame() {
  const shouldRestart = window.confirm("Restart game and erase saved progress?");
  if (!shouldRestart) return;

  Object.assign(state, createInitialState());

  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Ignore storage failures.
  }

  ui.openBtn.disabled = false;
  ui.nextDayBtn.disabled = true;
  ui.serveBtn.disabled = true;
  ui.clearBtn.disabled = true;
  ui.bakeBtn.disabled = true;
  ui.pauseBtn.textContent = "Pause";

  setStatus("Game restarted. Press Open Shop to begin.");
  renderHud();
  renderInventory();
  renderIngredients();
  renderPizza();
  renderTicket();
  renderDrinkStation();
  renderShop();
  renderRecipes();
  renderDeliveryShop();
  renderDeliveryStatus();
  saveGame();
}

function buyUpgrade(id) {
  const upgrade = upgrades[id];
  if (!upgrade || hasUpgrade(id)) return;
  if (state.money < upgrade.cost) {
    setStatus("Not enough money.", "bad");
    return;
  }
  state.money -= upgrade.cost;
  state.ownedUpgrades.push(id);
  if (id === "dispatch_rider" && state.delivery.pending.length) {
    state.delivery.eta = Math.min(state.delivery.eta, getDeliveryEta());
    renderDeliveryStatus();
  }
  setStatus(`${upgrade.label} purchased.`, "good");
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
    state.combo = 0;
    state.reputation = clamp(state.reputation - getCurrentCustomerDef().timeoutPenalty, 0, 100);
    setStatus(`${getCurrentCustomerDef().label} customer left after waiting too long.`, "bad");
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
    unlockedRecipes: state.unlockedRecipes,
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
    state.money = Number(data.money) || 15;
    state.reputation = Number(data.reputation) || 50;
    state.served = Number(data.served) || 0;
    state.employees = Number(data.employees) || 0;
    state.combo = Number(data.combo) || 0;
    if (data.inventory && typeof data.inventory === "object") {
      for (const key of Object.keys(state.inventory)) {
        if (typeof data.inventory[key] === "number") state.inventory[key] = data.inventory[key];
      }
    }
    if (Array.isArray(data.ownedUpgrades)) {
      state.ownedUpgrades = data.ownedUpgrades.filter((id) => upgrades[id]);
    }
    state.unlockedRecipes = normalizeUnlockedRecipes(data.unlockedRecipes);
    unlockRecipesForDay(false);
    state.dayEvent = { id: "none", spotlightRecipeId: null };
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
  if (ui.clearDrinkBtn) {
    ui.clearDrinkBtn.addEventListener("click", clearPreparedDrink);
  }
  ui.restartBtn.addEventListener("click", restartGame);
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
  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === "o") openShop();
    if (key === "b") ui.bakeBtn.click();
    if (key === "c") ui.clearBtn.click();
    if (key === "d" && ui.clearDrinkBtn) ui.clearDrinkBtn.click();
    if (key === "enter") ui.serveBtn.click();
    if (key === " ") {
      event.preventDefault();
      togglePause();
    }
  });
}

function init() {
  loadGame();
  unlockRecipesForDay(false);
  bind();
  renderHud();
  renderInventory();
  renderIngredients();
  renderPizza();
  renderTicket();
  renderDrinkStation();
  renderShop();
  renderRecipes();
  renderDeliveryShop();
  renderDeliveryStatus();
  setInterval(tick, 100);
  setInterval(saveGame, 5000);
}

init();
