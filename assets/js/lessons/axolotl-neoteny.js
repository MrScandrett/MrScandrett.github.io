(function () {
  // The existing aquarium's public live-data rules are scoped to /fish.
  // Noodle is a reserved, valid creature record there, so the pet can also
  // appear in the main class aquarium without requiring a second backend.
  const PET_PATH = "fish/classPetAxolotl";
  const LOCAL_STATE_KEY = "classroomos:axolotl-pet-state:v1";
  const LOCAL_FEED_KEY = "classroomos:axolotl-pet-last-feed:v1";
  const FEED_COOLDOWN_MS = 60 * 1000;
  const POINTS_PER_FEED = 5;
  const firebaseConfig = {
    apiKey: "AIzaSyD5_i08If4CWXvTzr3nhdh3rQiZHybSDsU",
    authDomain: "steamaqaurium.firebaseapp.com",
    databaseURL: "https://steamaqaurium-default-rtdb.firebaseio.com",
    projectId: "steamaqaurium",
    storageBucket: "steamaqaurium.firebasestorage.app",
    messagingSenderId: "966555196100",
    appId: "1:966555196100:web:e0243f586e9cf14f9f4791"
  };
  const defaultState = {
    name: "Noodle",
    color: "#f28fb2",
    size: 0.95,
    role: "eel",
    petType: "class-axolotl",
    points: 0,
    totalFeeds: 0,
    lastFed: Date.now() - (3 * 60 * 60 * 1000),
    lastFood: "a snack",
    startedAt: Date.now()
  };
  const elements = {
    badge: document.getElementById("axo-live-badge"),
    connection: document.getElementById("axo-connection-label"),
    clock: document.getElementById("axo-tank-clock"),
    lastFed: document.getElementById("axo-last-fed"),
    fullnessValue: document.getElementById("axo-fullness-value"),
    fullnessMeter: document.getElementById("axo-fullness-meter"),
    happyValue: document.getElementById("axo-happy-value"),
    happyMeter: document.getElementById("axo-happy-meter"),
    message: document.getElementById("axo-pet-message"),
    note: document.getElementById("axo-feed-note"),
    points: document.getElementById("axo-points-value"),
    nextGoal: document.getElementById("axo-next-goal"),
    tank: document.getElementById("axo-pet-tank"),
    unlocks: Array.from(document.querySelectorAll(".axo-unlock")),
    buttons: Array.from(document.querySelectorAll(".axo-food-button"))
  };
  let state = Object.assign({}, defaultState);
  let database = null;
  let petRef = null;
  let liveMode = false;
  let serverOffset = 0;
  let noteLockedUntil = 0;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function safeState(value) {
    const next = value && typeof value === "object" ? value : {};
    return {
      name: "Noodle",
      color: "#f28fb2",
      size: 0.95,
      role: "eel",
      petType: "class-axolotl",
      points: clamp(Math.round(Number(next.points) || 0), 0, 10000000),
      totalFeeds: clamp(Math.round(Number(next.totalFeeds) || 0), 0, 2000000),
      lastFed: Number(next.lastFed) > 0 ? Number(next.lastFed) : defaultState.lastFed,
      lastFood: typeof next.lastFood === "string" ? next.lastFood.slice(0, 24) : "a snack",
      startedAt: Number(next.startedAt) > 0 ? Number(next.startedAt) : defaultState.startedAt
    };
  }

  function now() {
    return Date.now() + serverOffset;
  }

  function timeAgo(timestamp) {
    const minutes = Math.max(0, Math.floor((now() - timestamp) / 60000));
    if (minutes < 1) return "fed just now";
    if (minutes < 60) return "fed " + minutes + "m ago";
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return "fed " + hours + "h ago";
    return "fed " + Math.floor(hours / 24) + "d ago";
  }

  function careLevels() {
    const hoursSinceFood = Math.max(0, (now() - state.lastFed) / 3600000);
    return {
      fullness: Math.round(clamp(100 - (hoursSinceFood * 4), 0, 100)),
      happiness: Math.round(clamp(100 - (hoursSinceFood * 1.7), 12, 100))
    };
  }

  function petCopy(levels) {
    if (levels.fullness < 20) return "Noodle is very hungry. A snack would make those gills wiggle!";
    if (levels.fullness < 48) return "Noodle is peeking through the plants for a snack.";
    if (levels.fullness > 92) return "Noodle is full, floaty, and feeling fantastic.";
    if (levels.happiness > 75) return "Noodle is happily patrolling the class tank.";
    return "Noodle is calmly exploring the aquarium.";
  }

  function renderUnlocks() {
    const locked = [];
    elements.unlocks.forEach((item) => {
      const threshold = Number(item.dataset.points);
      const unlocked = state.points >= threshold;
      item.classList.toggle("is-unlocked", unlocked);
      item.querySelector(".axo-unlock-icon").textContent = unlocked ? "✨" : "🎁";
      item.querySelector(".axo-unlock-state").textContent = unlocked ? "Unlocked" : threshold + " pts";
      if (!unlocked) locked.push(threshold);
    });
    if (locked.length) {
      const next = Math.min.apply(null, locked);
      elements.nextGoal.textContent = (next - state.points) + " more points until the next tank surprise.";
    } else {
      elements.nextGoal.textContent = "All current goals unlocked. More surprises are coming later!";
    }
  }

  function render() {
    const levels = careLevels();
    elements.clock.textContent = "Tank time " + new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" }).format(new Date(now()));
    elements.lastFed.textContent = timeAgo(state.lastFed);
    elements.fullnessValue.textContent = levels.fullness + "%";
    elements.fullnessMeter.style.setProperty("--value", levels.fullness + "%");
    elements.happyValue.textContent = levels.happiness + "%";
    elements.happyMeter.style.setProperty("--value", levels.happiness + "%");
    elements.points.textContent = state.points.toLocaleString();
    if (Date.now() >= noteLockedUntil) elements.message.textContent = petCopy(levels);
    renderUnlocks();
    renderCooldown();
  }

  function getLastLocalFeed() {
    try { return Number(localStorage.getItem(LOCAL_FEED_KEY)) || 0; } catch (error) { return 0; }
  }

  function renderCooldown() {
    const remaining = Math.max(0, FEED_COOLDOWN_MS - (Date.now() - getLastLocalFeed()));
    const cooling = remaining > 0;
    elements.buttons.forEach((button) => { button.disabled = cooling; });
    if (Date.now() < noteLockedUntil) return;
    elements.note.textContent = cooling
      ? "Noodle is chewing. Another snack can be given from this device in " + Math.ceil(remaining / 1000) + "s."
      : "Each visit can add 5 class points. Pick a snack when Noodle is ready.";
  }

  function saveLocal() {
    try { localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(state)); } catch (error) { /* The live state still works. */ }
  }

  function feedAnimation(emoji) {
    const food = document.createElement("span");
    food.className = "axo-floating-food";
    food.textContent = emoji;
    food.setAttribute("aria-hidden", "true");
    food.style.setProperty("--food-x", (35 + Math.random() * 30) + "%");
    elements.tank.appendChild(food);
    window.setTimeout(() => food.remove(), 1900);
  }

  async function feed(button) {
    if (Date.now() - getLastLocalFeed() < FEED_COOLDOWN_MS) {
      renderCooldown();
      return;
    }
    const foodName = button.dataset.food;
    const emoji = button.dataset.emoji;
    elements.buttons.forEach((item) => { item.disabled = true; });
    elements.note.textContent = "Dropping " + foodName.toLowerCase() + " into the live tank…";
    try {
      const fedAt = now();
      if (petRef) {
        const result = await petRef.transaction((current) => {
          const next = safeState(current);
          next.points += POINTS_PER_FEED;
          next.totalFeeds += 1;
          next.lastFed = fedAt;
          next.lastFood = foodName;
          return next;
        });
        if (!result.committed) throw new Error("The live feed was not saved.");
        state = safeState(result.snapshot.val());
      } else {
        state.points += POINTS_PER_FEED;
        state.totalFeeds += 1;
        state.lastFed = fedAt;
        state.lastFood = foodName;
      }
      saveLocal();
      try { localStorage.setItem(LOCAL_FEED_KEY, String(Date.now())); } catch (error) { /* Continue without cooldown storage. */ }
      noteLockedUntil = Date.now() + 4500;
      elements.message.textContent = "Nom! Noodle loved the " + foodName.toLowerCase() + ". +" + POINTS_PER_FEED + " class points!";
      elements.note.textContent = liveMode
        ? "Snack delivered. Everyone will see the new class total."
        : "Snack saved on this device only. Offline points do not merge into the live class total.";
      feedAnimation(emoji);
      render();
    } catch (error) {
      elements.note.textContent = "The live tank could not save that snack. Check the connection and try again.";
      elements.buttons.forEach((item) => { item.disabled = false; });
    }
  }

  function startLocalMode() {
    try { state = safeState(JSON.parse(localStorage.getItem(LOCAL_STATE_KEY) || "null")); } catch (error) { state = safeState(defaultState); }
    petRef = null;
    liveMode = false;
    elements.connection.textContent = "This device";
    elements.badge.title = "The live class service is unavailable, so progress is saved on this device.";
    render();
  }

  // Firebase's long-polling fallback (kept for networks that block
  // WebSockets) injects an untitled hidden iframe; label it for screen readers.
  new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node.tagName === "IFRAME" && !node.title) node.title = "Class tank connection (hidden)";
    }));
  }).observe(document.body, { childList: true });

  function connectLiveTank() {
    try {
      if (!window.firebase) throw new Error("Firebase did not load");
      const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
      database = app.database();
      petRef = database.ref(PET_PATH);
      database.ref(".info/serverTimeOffset").on("value", (snapshot) => {
        serverOffset = Number(snapshot.val()) || 0;
      });
      database.ref(".info/connected").on("value", (snapshot) => {
        liveMode = snapshot.val() === true;
        elements.connection.textContent = liveMode ? "Class tank live" : "Reconnecting";
      });
      petRef.on("value", (snapshot) => {
        state = safeState(snapshot.val());
        saveLocal();
        liveMode = true;
        elements.connection.textContent = "Class tank live";
        render();
      }, startLocalMode);
    } catch (error) {
      startLocalMode();
    }
  }

  elements.buttons.forEach((button) => button.addEventListener("click", () => feed(button)));
  render();
  connectLiveTank();
  window.setInterval(() => {
    if (!document.hidden) render();
  }, 1000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) render();
  });
})();

(function () {
  const callout = document.getElementById("axo-callout");
  const featureCopy = {
    gills: {
      title: "External gills",
      text: "Those feathery branches are juvenile salamander traits that axolotls usually keep into adulthood. They help the animal exchange oxygen while living underwater."
    },
    tail: {
      title: "Tail fin",
      text: "The broad fin supports swimming. The retained larval fin supports an aquatic lifestyle. A tail fin alone does not tell us whether an animal is reproductively mature."
    },
    limbs: {
      title: "Regenerative limbs",
      text: "Axolotls can rebuild complex structures after injury. Their repair process organizes new tissue instead of only closing the wound with scar tissue."
    }
  };

  document.querySelectorAll(".axo-hotspot").forEach((button) => {
    button.addEventListener("click", () => {
      const item = featureCopy[button.dataset.part];
      callout.innerHTML = "<strong>" + item.title + "</strong><p>" + item.text + "</p>";
    });
  });

  const lifeStages = [
    ["Embryo develops inside an egg; not reproductively mature.", "Embryo develops inside an egg; not reproductively mature.", "Both paths begin with embryonic development."],
    ["Aquatic larva has external gills and a tail fin; not yet reproductively mature.", "Aquatic larva has external gills and a tail fin; not yet reproductively mature.", "Gills alone cannot distinguish a larva from a neotenic adult."],
    ["After metamorphosis, external gills are lost and the body becomes land-oriented. The adult can reproduce.", "The adult can reproduce while retaining external gills and a larval-style tail fin, usually remaining aquatic.", "Adult does not mean land-dwelling. Reproductive maturity plus retained juvenile features is the key evidence."]
  ];
  document.querySelectorAll('[data-life-stage]').forEach(button => button.addEventListener('click', () => setLifeStage(Number(button.dataset.lifeStage))));
  function setLifeStage(stage) {
    document.querySelectorAll('[data-life-stage]').forEach(button => {
      const active = Number(button.dataset.lifeStage) === stage;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('is-active', active);
    });
    document.getElementById('relative-stage').textContent = lifeStages[stage][0];
    document.getElementById('axolotl-stage').textContent = lifeStages[stage][1];
    document.getElementById('life-conclusion').textContent = lifeStages[stage][2];
  }
  setLifeStage(0);

  const questions = [
    { title: '1 · Which evidence establishes neoteny?', choices: ['An animal has external gills.', 'An animal can reproduce and retains external gills.', 'An animal has a pink body.'], correct: 1, explanation: 'Larvae also have gills. Reproductive maturity establishes adulthood; retained gills establish the juvenile feature. Color is not evidence of maturity.' },
    { title: '2 · What can the Day 47 photograph establish?', choices: ['Visible digits have formed.', 'The limb functions exactly like an uninjured limb.', 'Every axolotl regrows a limb in 47 days.'], correct: 0, explanation: 'Visible structure supports a claim about shape. Movement tests are needed for function, and a single series does not establish a universal timeline.' },
    { title: '3 · Which action addresses a wild habitat threat?', choices: ['Collect wild axolotls for classroom tanks.', 'Feed the virtual pet more often.', 'Restore protected canals with cleaner water and fewer invasive fish.'], correct: 2, explanation: 'A canal refuge addresses water quality and invasive fish. Virtual points do not restore habitat; removing wild animals adds pressure to a threatened population.' }
  ];
  const supported = new Set();
  const questionHost = document.getElementById('axo-questions');
  function renderQuestions() {
    supported.clear();
    questionHost.replaceChildren();
    questions.forEach((question, index) => {
      const group = document.createElement('fieldset');
      const legend = document.createElement('legend'); legend.textContent = question.title; group.append(legend);
      const feedback = document.createElement('p'); feedback.setAttribute('role', 'status');
      question.choices.forEach((choice, choiceIndex) => {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = choice; button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', () => {
          group.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
          const correct = choiceIndex === question.correct;
          if (correct) supported.add(index); else supported.delete(index);
          feedback.textContent = (correct ? 'Supported. ' : 'Look again. ') + question.explanation;
          document.getElementById('axo-check-progress').textContent = supported.size + ' of 3 claims supported.';
        }); group.append(button);
      }); group.append(feedback); questionHost.append(group);
    });
    document.getElementById('axo-check-progress').textContent = '0 of 3 claims supported.';
  }
  document.getElementById('axo-reset-check').addEventListener('click', renderQuestions);
  renderQuestions();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('model-viewer').forEach(model => model.removeAttribute('auto-rotate'));
  }

  const buttons = Array.from(document.querySelectorAll("#regen-buttons button"));
  const steps = Array.from(document.querySelectorAll("#regen-steps li"));
  const regenFrames = Array.from(document.querySelectorAll(".axo-regen-frame"));

  function setStage(stage) {
    buttons.forEach((button) => {
      const active = Number(button.dataset.stage) === stage;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    steps.forEach((step, index) => step.classList.toggle("is-active", index === stage));
    regenFrames.forEach((frame) => {
      const active = Number(frame.dataset.stage) === stage;
      frame.classList.toggle("is-active", active);
      frame.setAttribute("aria-hidden", String(!active));
      frame.hidden = !active;
    });
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => setStage(Number(button.dataset.stage)));
  });

  setStage(0);
})();
