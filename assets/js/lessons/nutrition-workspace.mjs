import { foods } from './nutrition-foods.mjs';
import { eras } from './nutrition-history.mjs';

const app = document.getElementById('food-lab');
const byId = id => app.querySelector('#flab-' + id);
const nutrientRows = [
  ['energy', 'Energy', 'kcal', 'The energy available from food.'],
  ['protein', 'Protein', 'g', 'Provides amino acids for growth and repair.'],
  ['carbs', 'Carbohydrate', 'g', 'Includes starches, sugars, and fiber.'],
  ['fat', 'Total fat', 'g', 'Provides energy and helps absorb vitamins A, D, E, and K.'],
  ['satFat', 'Saturated fat', 'g', 'One of the types of fat counted in total fat.'],
  ['fiber', 'Dietary fiber', 'g', 'Supports bowel function and feeds some gut microbes.'],
  ['sugars', 'Total sugars', 'g', 'Includes sugars present in the food and sugars added to it.'],
  ['addedSugar', 'Added sugars', 'g', 'The portion of total sugars added during processing or preparation.'],
  ['sodium', 'Sodium', 'mg', 'Helps regulate fluid balance and supports nerve signaling.'],
  ['vitA', 'Vitamin A', 'µg RAE', 'Supports vision and immune function.'],
  ['vitC', 'Vitamin C', 'mg', 'Helps make collagen and absorb iron from plants.'],
  ['vitD', 'Vitamin D', 'µg', 'Helps the body absorb calcium.'],
  ['vitE', 'Vitamin E', 'mg', 'Acts as an antioxidant, helping protect cells.'],
  ['vitK', 'Vitamin K', 'µg', 'Helps the body make proteins needed for blood clotting.'],
  ['vitB6', 'Vitamin B6', 'mg', 'Helps enzymes process amino acids.'],
  ['vitB12', 'Vitamin B12', 'µg', 'Supports nerve function and red blood cell formation.'],
  ['folate', 'Folate (B9)', 'µg DFE', 'Helps cells make DNA and divide.'],
  ['calcium', 'Calcium', 'mg', 'Supports bones, muscles, and nerves.'],
  ['iron', 'Iron', 'mg', 'Helps red blood cells carry oxygen.'],
  ['potassium', 'Potassium', 'mg', 'Helps nerves and muscles function.']
];
const summaryKeys = ['energy', 'protein', 'carbs', 'fat', 'fiber'];
const mealOrder = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const storagePrefix = 'classroom-food-lab-v1:';
const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const dateInput = byId('date');
const foodSelect = byId('food');
const gramsInput = byId('grams');
const mealSelect = byId('meal');
const peerSelect = byId('peer');
const searchInput = byId('search');
const customDialog = byId('custom');
const tabs = [...app.querySelectorAll('[role="tab"]')];

const fallbackStorage = new Map();
let customFoods = readList('foods');
let productId = 'cereal-a';
let editingId = null;
let entries = [];

function node(tag, content, className) {
  const element = document.createElement(tag);
  if (content !== undefined) element.textContent = content;
  if (className) element.className = className;
  return element;
}

function readList(key) {
  if (fallbackStorage.has(key)) return fallbackStorage.get(key);
  try {
    const value = JSON.parse(localStorage.getItem(storagePrefix + key));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveList(key, value) {
  try {
    localStorage.setItem(storagePrefix + key, JSON.stringify(value));
    fallbackStorage.delete(key);
  } catch {
    fallbackStorage.set(key, value);
    byId('storage-note').textContent = 'Browser storage is unavailable. Changes may be lost on reload.';
  }
}

function idForEntry() {
  return crypto.getRandomValues(new Uint32Array(3)).join('-');
}

function today() {
  const now = new Date();
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map(part => String(part).padStart(2, '0')).join('-');
}

function announce(message) {
  byId('status').textContent = message;
}

function catalog() {
  return [...foods, ...customFoods];
}

function getFood(id) {
  return foods.find(food => food.id === id) || customFoods.find(food => food.id === id);
}

function scaledAmount(food, key, grams) {
  const value = food?.facts?.[key];
  return Number.isFinite(value) ? value * grams / food.base : null;
}

function measurement(amount, unit) {
  if (amount === null) return 'Unlisted';
  if (amount > 0 && amount < 0.01) return '<0.01 ' + unit;
  return numberFormat.format(amount) + ' ' + unit;
}

function totalsFor(key) {
  let amount = 0;
  let present = 0;
  for (const entry of entries) {
    const value = scaledAmount(getFood(entry.foodId), key, entry.grams);
    if (value === null) continue;
    amount += value;
    present += 1;
  }
  return {
    amount: entries.length && !present ? null : amount,
    partial: present > 0 && present < entries.length
  };
}

function showTab(tab, focus = false) {
  for (const item of tabs) {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  }
  if (focus) tab.focus();
}

for (const [index, tab] of tabs.entries()) {
  tab.addEventListener('click', () => showTab(tab));
  tab.addEventListener('keydown', event => {
    const nextIndex = {
      ArrowLeft: (index + tabs.length - 1) % tabs.length,
      ArrowRight: (index + 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1
    }[event.key];
    if (nextIndex === undefined) return;
    event.preventDefault();
    showTab(tabs[nextIndex], true);
  });
}

function fillFoodChoices() {
  const existingFood = foodSelect.value;
  const existingPeer = peerSelect.value;
  foodSelect.replaceChildren(...catalog().map(food => new Option(food.name, food.id)));
  if (getFood(existingFood)) foodSelect.value = existingFood;
  peerSelect.replaceChildren(new Option('Choose a second food', ''),
    ...catalog().filter(food => food.id !== productId).map(food => new Option(food.name, food.id)));
  if (existingPeer !== productId && getFood(existingPeer)) peerSelect.value = existingPeer;
}

function newEntry(foodId = foodSelect.value) {
  editingId = null;
  foodSelect.value = foodId;
  gramsInput.value = getFood(foodId).serving;
  byId('entry-title').textContent = 'Add a food';
  byId('save').textContent = 'Add to log';
  byId('cancel').hidden = true;
  byId('custom-open').hidden = false;
}

function editEntry(entry) {
  editingId = entry.id;
  foodSelect.value = entry.foodId;
  gramsInput.value = entry.grams;
  mealSelect.value = entry.meal;
  byId('entry-title').textContent = 'Edit food entry';
  byId('save').textContent = 'Save changes';
  byId('cancel').hidden = false;
  byId('custom-open').hidden = true;
  gramsInput.focus();
}

function renderTotals() {
  const metrics = document.createDocumentFragment();
  const nutrients = node('dl');
  for (const [key, label, unit, description] of nutrientRows) {
    const { amount, partial } = totalsFor(key);
    const value = measurement(amount, unit) + (partial ? ' (partial)' : '');
    if (summaryKeys.includes(key)) {
      const card = node('div', undefined, 'flab-metric');
      card.append(node('span', key === 'energy' ? 'Calories' : key === 'carbs' ? 'Carbs' : label), node('strong', value));
      metrics.append(card);
    }
    const item = node('div');
    const details = node('dd', value);
    details.append(node('small', description));
    item.append(node('dt', label), details);
    nutrients.append(item);
  }
  byId('nutrient-date').textContent = dateInput.valueAsDate.toLocaleDateString(undefined, { dateStyle: 'long', timeZone: 'UTC' });
  byId('metrics').replaceChildren(metrics);
  byId('nutrient-list').replaceChildren(nutrients);
}

function renderEntries() {
  const log = byId('entries');
  if (!entries.length) {
    log.replaceChildren(node('p', 'Add a food or try a sample meal to see what adds up.', 'flab-muted'));
    return;
  }
  const list = node('ol');
  const sorted = [...entries].sort((a, b) => mealOrder.indexOf(a.meal) - mealOrder.indexOf(b.meal));
  for (const entry of sorted) {
    const food = getFood(entry.foodId);
    if (!food) continue;
    const row = node('li');
    const details = node('div');
    details.append(node('strong', food.name), node('small',
      entry.meal + ' · ' + measurement(entry.grams, 'g') + ' · ' + measurement(scaledAmount(food, 'energy', entry.grams), 'kcal')));
    const edit = node('button', 'Edit');
    edit.type = 'button';
    edit.setAttribute('aria-label', 'Edit ' + food.name);
    edit.addEventListener('click', () => editEntry(entry));
    const remove = node('button', 'Remove');
    remove.type = 'button';
    remove.setAttribute('aria-label', 'Remove ' + food.name);
    remove.addEventListener('click', () => {
      updateDay(current => current.filter(item => item.id !== entry.id));
      if (editingId === entry.id) newEntry();
      const next = log.querySelectorAll('li button:first-of-type');
      (next[Math.min(sorted.indexOf(entry), next.length - 1)] || foodSelect).focus();
      announce(food.name + ' removed.');
    });
    row.append(details, edit, remove);
    list.append(row);
  }
  log.replaceChildren(list);
}

function readDay() {
  return readList('day:' + dateInput.value).filter(entry => getFood(entry.foodId));
}

function updateDay(change) {
  if (!dateInput.reportValidity()) return false;
  entries = change(readDay());
  saveList('day:' + dateInput.value, entries);
  renderEntries();
  renderTotals();
  return true;
}

foodSelect.addEventListener('change', () => {
  gramsInput.value = getFood(foodSelect.value).serving;
});
byId('cancel').addEventListener('click', () => {
  newEntry();
  foodSelect.focus();
});
dateInput.addEventListener('input', () => {
  if (!dateInput.validity.valid) return;
  entries = readDay();
  newEntry();
  renderEntries();
  renderTotals();
});
byId('entry').addEventListener('submit', event => {
  event.preventDefault();
  const food = getFood(foodSelect.value);
  const isEdit = editingId !== null;
  const entry = { id: editingId || idForEntry(), foodId: food.id, grams: gramsInput.valueAsNumber, meal: mealSelect.value };
  if (!updateDay(current => isEdit ? current.map(item => item.id === editingId ? entry : item) : [...current, entry])) return;
  newEntry();
  announce(food.name + (isEdit ? ' updated.' : ' added to the log.'));
});
byId('sample').addEventListener('click', () => {
  const sample = ['173904', '171711', '171267'].map(foodId => ({
    id: idForEntry(), foodId, grams: getFood(foodId).serving, meal: 'Breakfast'
  }));
  if (updateDay(current => [...current, ...sample])) announce('Added a sample breakfast of oats, blueberries, and milk.');
});

function showProduct(id) {
  productId = id;
  fillFoodChoices();
  renderProduct();
  byId('results').querySelectorAll('button').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.foodId === id));
  });
}

function renderSearch() {
  const query = searchInput.value.toLocaleLowerCase().trim();
  const matches = catalog().filter(food => food.name.toLocaleLowerCase().includes(query) || food.code === query);
  const results = matches.map(food => {
    const label = food.icon + ' ' + food.name + (food.code ? ' · ' + food.code : '');
    const button = node('button', label);
    button.type = 'button';
    button.dataset.foodId = food.id;
    button.setAttribute('aria-pressed', String(food.id === productId));
    button.addEventListener('click', () => showProduct(food.id));
    return button;
  });
  if (!matches.length) results.push(node('p', 'No matching food. Try another name or enter a label from the food log.'));
  byId('results').replaceChildren(...results);
  return matches;
}

function renderProduct() {
  const food = getFood(productId);
  const peer = getFood(peerSelect.value);
  const compareByWeight = byId('basis').value === '100';
  const products = peer ? [food, peer] : [food];
  byId('product-title').textContent = food.name;
  byId('product-type').textContent = food.fdc ? 'USDA reference food' : food.code ? 'Practice label · code ' + food.code : 'Your label';
  byId('product-note').textContent = food.note || '';
  byId('ingredients').textContent = food.ingredients ? 'Ingredients · ' + food.ingredients : '';
  const table = node('table');
  table.append(node('caption', compareByWeight ? 'Equal weight · 100 g per food' : 'Per serving · weights may differ'));
  const header = table.createTHead().insertRow();
  for (const label of ['Nutrient', ...products.map(item =>
    item.name + ' (' + (compareByWeight ? 100 : item.serving) + ' g)')]) {
    const column = node('th', label);
    column.scope = 'col';
    header.append(column);
  }
  const body = table.createTBody();
  for (const [key, label, unit] of nutrientRows) {
    const row = body.insertRow();
    const heading = node('th', label);
    heading.scope = 'row';
    row.append(heading);
    for (const item of products) {
      const scaled = scaledAmount(item, key, compareByWeight ? 100 : item.serving);
      row.append(node('td', measurement(scaled, unit)));
    }
  }
  byId('facts').replaceChildren(table);
  byId('facts').scrollTop = 0;

  const source = byId('food-source');
  source.replaceChildren();
  for (const [index, item] of products.entries()) {
    if (index > 0) source.append(' · ');
    const label = peer ? item.name + ': ' : '';
    if (item.fdc) {
      const link = node('a', label + 'USDA FoodData Central');
      link.href = 'https://fdc.nal.usda.gov/food-details/' + item.fdc + '/nutrients';
      source.append(link);
    } else {
      source.append(label + (item.code ? 'Fictional example' : 'Entered in this browser'));
    }
  }
}

searchInput.addEventListener('input', renderSearch);
searchInput.addEventListener('keydown', event => {
  if (event.key !== 'Enter') return;
  byId('results').querySelector('button')?.click();
});
peerSelect.addEventListener('change', () => {
  if (peerSelect.value) byId('basis').value = '100';
  renderProduct();
});
byId('basis').addEventListener('change', renderProduct);
byId('log-product').addEventListener('click', () => {
  newEntry(productId);
  showTab(byId('log-tab'));
  gramsInput.focus();
  announce('Set the portion for ' + getFood(productId).name + '.');
});

const customForm = byId('custom-form');
const nameField = customForm.elements.namedItem('foodName');
for (const [key, name, unit] of nutrientRows) {
  const label = node('label', name + ' (' + unit + ')');
  const input = node('input');
  input.name = key;
  input.type = 'number';
  input.min = '0';
  input.max = '10000000';
  input.step = 'any';
  input.inputMode = 'decimal';
  input.required = key === 'energy';
  label.append(input);
  byId('custom-facts').append(label);
}
byId('custom-open').addEventListener('click', () => customDialog.showModal());
byId('custom-close').addEventListener('click', () => customDialog.close());
nameField.addEventListener('input', () => nameField.setCustomValidity(''));
customForm.addEventListener('submit', event => {
  event.preventDefault();
  const form = new FormData(customForm);
  const name = form.get('foodName').trim();
  if (!name) {
    nameField.setCustomValidity('Enter a food name.');
    nameField.reportValidity();
    return;
  }
  const serving = Number(form.get('serving'));
  const facts = Object.fromEntries(nutrientRows.filter(([key]) => form.get(key) !== '')
    .map(([key]) => [key, Number(form.get(key))]));
  const food = { id: 'custom-' + idForEntry(), name, serving, base: serving, facts,
    icon: '📝', ingredients: form.get('ingredients').trim() };
  customFoods = [...readList('foods'), food];
  saveList('foods', customFoods);
  fillFoodChoices();
  renderSearch();
  customForm.reset();
  customDialog.close();
  newEntry(food.id);
  gramsInput.focus();
  announce(name + ' saved. Add it to the log when ready.');
});

function showEra(index) {
  const era = eras[index];
  for (const [field, value] of Object.entries(era.copy)) byId('history-' + field).textContent = value;
  byId('history-source').href = era.source[1];
  byId('history-source').textContent = era.source[0];
  byId('history-example').hidden = !era.example;
  byId('history-example').dataset.foodId = era.example || '';
  byId('timeline').querySelectorAll('button').forEach((button, i) => {
    button.setAttribute('aria-pressed', String(i === index));
  });
}
for (const [index, era] of eras.entries()) {
  const button = node('button', era.copy.title);
  button.type = 'button';
  button.append(node('small', era.copy.date));
  button.addEventListener('click', () => showEra(index));
  byId('timeline').append(button);
}
byId('history-example').addEventListener('click', event => {
  searchInput.value = '';
  renderSearch();
  showProduct(event.currentTarget.dataset.foodId);
  showTab(byId('labels-tab'), true);
});

document.querySelector('[data-food-history-link]').addEventListener('click', () => {
  showTab(byId('history-tab'));
});

window.addEventListener('storage', event => {
  if (event.key === storagePrefix + 'foods') {
    customFoods = readList('foods');
    fillFoodChoices();
    renderSearch();
    renderProduct();
  }
  if (event.key === storagePrefix + 'day:' + dateInput.value) {
    entries = readDay();
    if (editingId && !entries.some(entry => entry.id === editingId)) newEntry();
    renderEntries();
    renderTotals();
  }
});
dateInput.value = today();
entries = readDay();
fillFoodChoices();
newEntry();
renderEntries();
renderTotals();
renderSearch();
renderProduct();
showEra(0);
