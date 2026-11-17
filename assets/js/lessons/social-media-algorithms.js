    (function () {
"use strict";

var topics = {
  science: { label: "Science", color: "#1d6fd6", score: 22 },
  gaming: { label: "Gaming", color: "#6651d8", score: 22 },
  style: { label: "Style", color: "#b26a00", score: 22 },
  fitness: { label: "Fitness", color: "#0c8f6a", score: 22 },
  comedy: { label: "Comedy", color: "#c2413a", score: 22 }
};

var posts = [
  { topic: "science", source: "Recommended For You", title: "A tiny robot learns to balance in 12 seconds", description: "A short clip explains feedback control, sensors, and machine learning through a tabletop robot.", mark: "AI" },
  { topic: "science", source: "Because you watched STEM clips", title: "Why your phone knows which way is up", description: "A creator opens the sensor menu and shows accelerometers, gyroscopes, and motion data in real time.", mark: "ST" },
  { topic: "gaming", source: "Popular with players like you", title: "The hidden math behind speed-run routes", description: "A game designer breaks down pathfinding, glitches, timing windows, and optimization.", mark: "GG" },
  { topic: "gaming", source: "High replay rate", title: "One build beats the boss in under a minute", description: "Fast cuts, suspense, and a surprise ending make this clip easy to watch again.", mark: "XP" },
  { topic: "style", source: "Sponsored adjacency", title: "Three desk setups that make homework feel cleaner", description: "A creator compares lighting, color, storage, and the feeling of a fresh workspace.", mark: "DS" },
  { topic: "style", source: "Trending nearby", title: "Before-and-after room reset in 30 seconds", description: "A visual transformation clip uses satisfying motion and product links.", mark: "FX" },
  { topic: "fitness", source: "Saved by similar users", title: "Can five minutes change your posture?", description: "A trainer demonstrates small habits, reminders, and tracking loops for daily movement.", mark: "MV" },
  { topic: "fitness", source: "Watch time rising", title: "The science of sleep and screen light", description: "A health explainer connects late scrolling, sleep pressure, and morning attention.", mark: "ZZ" },
  { topic: "comedy", source: "Shared by friends", title: "When the algorithm thinks it knows you", description: "A sketch turns recommendation mistakes into a joke about data profiles.", mark: "HA" },
  { topic: "comedy", source: "Looping audio", title: "That one sound everyone keeps remixing", description: "A repeating audio trend encourages rewatches, comments, and response videos.", mark: "RM" }
];

var ads = [
  {
    title: "This backpack is popular with students in your area",
    copy: "Thousands of people like you are upgrading before the semester starts.",
    tactic: "social-proof",
    why: "It uses other people's behavior to make the choice feel normal and safe."
  },
  {
    title: "Only 2 hours left on the creator kit bundle",
    copy: "The discount disappears tonight, and your cart is waiting.",
    tactic: "scarcity",
    why: "It creates time pressure so you act before comparing or thinking."
  },
  {
    title: "Recommended because you watched desk setup videos",
    copy: "These lights match the workspace style you keep saving.",
    tactic: "personalization",
    why: "It turns your past behavior into a reason the ad feels specially chosen."
  },
  {
    title: "For people who do not settle for average",
    copy: "Show everyone you are serious about becoming the best version of yourself.",
    tactic: "identity",
    why: "It connects the product to who you want to be, not just what the product does."
  }
];

var engineProfiles = {
  youtube: {
    label: "YouTube emulator",
    accent: "#c2413a",
    hook: "Autoplay",
    title: "The next video is already chosen",
    mechanic: "A tutorial watch creates a strong topic signal. The system offers an easier, more dramatic follow-up before your attention cools down.",
    axes: { novelty: 42, social: 28, urgency: 24, depth: 88, commerce: 18 },
    factors: [
      ["Watch history", 82],
      ["Topic similarity", 74],
      ["Retention", 68],
      ["Up Next fit", 86]
    ],
    cards: [
      ["One tutorial becomes a playlist", "The model notices a clear topic and queues a longer chain of related videos."],
      ["Shorts compress the rabbit hole", "A quick clip gives the algorithm many rapid signals in a short time."],
      ["The sidebar lowers friction", "The next choice is visible before you have decided whether you are done."]
    ],
    labels: { consume: "Watch", react: "Like", branch: "Click Up Next", resist: "Turn off autoplay" },
    messages: {
      consume: "Watch time strengthened the topic model. Similar videos move higher in the queue.",
      react: "A like is an explicit approval signal. The recommender becomes more confident.",
      branch: "Clicking Up Next confirms the rabbit hole path. The chain grows longer.",
      resist: "Autoplay friction breaks the default next step and gives your decision time back."
    }
  },
  tiktok: {
    label: "TikTok emulator",
    accent: "#6651d8",
    hook: "Novelty test",
    title: "The For You feed tests another micro-reward",
    mechanic: "A full-screen short video removes almost all choice friction. Completion, rewatching, sharing, sound, caption, and hashtag signals update the next test.",
    axes: { novelty: 96, social: 46, urgency: 38, depth: 18, commerce: 30 },
    factors: [
      ["Completion", 88],
      ["Replay", 76],
      ["Sound trend", 64],
      ["Video info", 72]
    ],
    cards: [
      ["A surprising clip gets a trial run", "The feed explores whether a new topic can catch your attention."],
      ["A rewatch is a loud signal", "Looping tells the system this format may be worth repeating."],
      ["The sound becomes a shortcut", "Audio trends bundle many different clips into one recognizable reward cue."]
    ],
    labels: { consume: "Watch full", react: "Like", branch: "Rewatch/share", resist: "Not interested" },
    messages: {
      consume: "Completion says the clip held you. Similar short-form tests become more likely.",
      react: "The like adds approval on top of watch time. The model tightens around this pattern.",
      branch: "A rewatch or share is high-value engagement. The loop gets more confident.",
      resist: "Not Interested is a direct correction. You trained the feed back instead of feeding it more signal."
    }
  },
  instagram: {
    label: "Instagram emulator",
    accent: "#d43f8d",
    hook: "Social comparison",
    title: "The feed mixes friends, identity, and visual reward",
    mechanic: "Stories, Reels, Explore, likes, saves, DMs, and profile visits combine social belonging with trend discovery and self-presentation.",
    axes: { novelty: 62, social: 84, urgency: 48, depth: 32, commerce: 44 },
    factors: [
      ["Relationship", 82],
      ["Reel watch", 70],
      ["Saves", 64],
      ["Profile visits", 74]
    ],
    cards: [
      ["A friend's Story creates a check-in loop", "Viewing feels social, and the app can immediately offer another person or Reel."],
      ["Explore guesses an identity lane", "The grid tests topics that match how you browse, save, and inspect profiles."],
      ["A creator post becomes an ad bridge", "Style, fitness, beauty, and gear content can connect identity to shopping."]
    ],
    labels: { consume: "View story", react: "Like/save", branch: "Open profile", resist: "Mute/unfollow" },
    messages: {
      consume: "Viewing signals relationship interest. More nearby social content rises.",
      react: "Likes and saves tell the system what you want to see again or become associated with.",
      branch: "Opening a profile is a deeper identity signal than a fast scroll.",
      resist: "Muting or unfollowing reduces comparison pressure and cleans the signal stream."
    }
  },
  facebook: {
    label: "Facebook emulator",
    accent: "#1d6fd6",
    hook: "Social utility",
    title: "Many doors lead back into the same graph",
    mechanic: "Friends, Groups, Pages, Marketplace, Memories, birthdays, notifications, Pokes, and old game loops all create reasons to check in.",
    axes: { novelty: 45, social: 88, urgency: 58, depth: 64, commerce: 72 },
    factors: [
      ["Friend signal", 76],
      ["Group activity", 72],
      ["Marketplace intent", 78],
      ["Memory cue", 62]
    ],
    cards: [
      ["A notification turns into a session", "A birthday, Group reply, Poke, or Marketplace message opens a new path."],
      ["A local deal adds shopping intent", "Marketplace changes the feed from social browsing into buying behavior."],
      ["A memory pulls with nostalgia", "Old photos and milestones add an emotional reason to return."]
    ],
    labels: { consume: "Open notice", react: "Comment", branch: "Browse deal", resist: "Mute group" },
    messages: {
      consume: "Opening a notification confirms that this door can pull you back.",
      react: "Commenting creates a social obligation loop: replies can summon you again.",
      branch: "Marketplace browsing tells the system shopping intent is active.",
      resist: "Muting noisy groups cuts off one of the strongest re-entry paths."
    }
  },
  twitter: {
    label: "X/Twitter emulator",
    accent: "#111827",
    hook: "Urgency",
    title: "The feed makes the world feel live",
    mechanic: "Trends, quote posts, reply chains, repost velocity, breaking-news energy, and public argument create pressure to react now.",
    axes: { novelty: 74, social: 66, urgency: 94, depth: 46, commerce: 18 },
    factors: [
      ["Recency", 86],
      ["Reply velocity", 78],
      ["Repost graph", 72],
      ["Topic match", 68]
    ],
    cards: [
      ["A trend claims your attention", "The ranking favors what feels current and socially charged."],
      ["A reply chain becomes the content", "Arguments can keep you reading even when the original post was small."],
      ["A quote post invites performance", "The system rewards fast public reaction and counter-reaction."]
    ],
    labels: { consume: "Read thread", react: "Reply", branch: "Quote/repost", resist: "Mute keyword" },
    messages: {
      consume: "Reading a thread signals that urgency and conflict can hold you.",
      react: "A reply places you inside the loop; future notifications can pull you back.",
      branch: "A quote or repost turns attention into distribution.",
      resist: "Keyword muting removes bait before it reaches the decision layer."
    }
  },
  snapchat: {
    label: "Snapchat emulator",
    accent: "#b26a00",
    hook: "Streak pressure",
    title: "A friendship counter becomes a daily task",
    mechanic: "Snaps, disappearing messages, friend status, Streaks, and notifications turn relationship maintenance into a repeated loop.",
    axes: { novelty: 50, social: 94, urgency: 88, depth: 15, commerce: 12 },
    factors: [
      ["Streak age", 92],
      ["Unread snap", 82],
      ["Friend status", 64],
      ["Map/social cue", 46]
    ],
    cards: [
      ["A streak is about to expire", "The app converts friendship into a deadline."],
      ["A disappearing message creates urgency", "Temporary content makes checking feel time-sensitive."],
      ["A friend status cue nudges curiosity", "Social presence becomes a reason to open the app."]
    ],
    labels: { consume: "Open snap", react: "Reply", branch: "Save streak", resist: "Pause alerts" },
    messages: {
      consume: "Opening confirms that time-sensitive social alerts work.",
      react: "Replying keeps the exchange alive and invites another return.",
      branch: "Saving a streak strengthens the daily obligation loop.",
      resist: "Pausing alerts separates friendship from a timer."
    }
  },
  reddit: {
    label: "Reddit emulator",
    accent: "#ff4500",
    hook: "Thread depth",
    title: "A question opens a maze of communities",
    mechanic: "Subreddits, upvotes, comments, sorting, karma, and related communities turn one curiosity into many branches.",
    axes: { novelty: 58, social: 58, urgency: 34, depth: 94, commerce: 14 },
    factors: [
      ["Community fit", 80],
      ["Comment depth", 86],
      ["Vote signal", 66],
      ["Similar subreddit", 62]
    ],
    cards: [
      ["The top comment is not the end", "Nested replies keep offering small new rewards."],
      ["A related community appears", "The system can convert one interest into several feeds."],
      ["Voting becomes identity", "Upvotes and downvotes train both the feed and the feeling of belonging."]
    ],
    labels: { consume: "Read post", react: "Upvote", branch: "Open comments", resist: "Leave thread" },
    messages: {
      consume: "Reading confirms the community/topic match.",
      react: "Voting gives the system a direct preference signal.",
      branch: "Opening comments deepens the session and adds many new branches.",
      resist: "Leaving the thread prevents curiosity from becoming a maze."
    }
  },
  live: {
    label: "Twitch/Discord emulator",
    accent: "#9146ff",
    hook: "Live FOMO",
    title: "Presence becomes the reward",
    mechanic: "Live streams, chat, server channels, mentions, highlights, and go-live alerts make being present feel urgent and social.",
    axes: { novelty: 50, social: 76, urgency: 96, depth: 68, commerce: 28 },
    factors: [
      ["Live now", 92],
      ["Chat speed", 78],
      ["Mention", 82],
      ["Channel loyalty", 64]
    ],
    cards: [
      ["The stream is live right now", "Missing it feels different from missing a normal video."],
      ["Chat keeps moving", "Social momentum makes leaving feel like falling behind."],
      ["A mention brings you back", "Direct alerts cut through other priorities."]
    ],
    labels: { consume: "Watch live", react: "Chat", branch: "Join server", resist: "Mute channel" },
    messages: {
      consume: "Watching live confirms that urgency can hold attention.",
      react: "Chat participation turns content into social presence.",
      branch: "Joining a server adds more notification surfaces.",
      resist: "Muting a channel keeps community without constant interruption."
    }
  },
  aspiration: {
    label: "Pinterest/LinkedIn emulator",
    accent: "#0c8f6a",
    hook: "Future self",
    title: "Browsing feels like self-improvement",
    mechanic: "Pins, boards, jobs, professional posts, creator advice, and product ideas make aspiration feel productive even when action keeps being delayed.",
    axes: { novelty: 70, social: 38, urgency: 28, depth: 66, commerce: 84 },
    factors: [
      ["Saved idea", 78],
      ["Search intent", 72],
      ["Product/job fit", 84],
      ["Creator authority", 58]
    ],
    cards: [
      ["A future project becomes a feed", "Saving one idea generates a long chain of related possibilities."],
      ["A product solves future-you", "Shopping intent hides inside planning and inspiration."],
      ["A career post creates comparison", "Professional aspiration can turn into pressure to perform."]
    ],
    labels: { consume: "Browse idea", react: "Save", branch: "Open product/job", resist: "Make list" },
    messages: {
      consume: "Browsing signals aspiration, which can produce endless adjacent ideas.",
      react: "Saving confirms the future-self theme and strengthens recommendations.",
      branch: "Opening a product or job converts aspiration into commerce or status intent.",
      resist: "Making a short action list turns inspiration into a stopping point."
    }
  }
};

var initialScores = {};
Object.keys(topics).forEach(function (key) { initialScores[key] = topics[key].score; });
var currentPost = posts[0];
var currentAdIndex = 0;
var signalCount = 0;
var attention = 0;
var recentSignals = [];
var enginePlatform = "youtube";
var enginePressure = 38;
var engineMinutes = 0;
var engineDefense = 0;
var engineCycle = 0;
var engineLog = [];

var topTopicEl = document.getElementById("topTopic");
var attentionEl = document.getElementById("attentionScore");
var signalCountEl = document.getElementById("signalCount");
var adMatchEl = document.getElementById("adMatch");
var profileBarsEl = document.getElementById("profileBars");
var postSourceEl = document.getElementById("postSource");
var postTitleEl = document.getElementById("postTitle");
var postTopicEl = document.getElementById("postTopic");
var postDescriptionEl = document.getElementById("postDescription");
var postVisualEl = document.getElementById("postVisual");
var postMarkEl = document.getElementById("postMark");
var feedbackEl = document.getElementById("feedFeedback");
var signalStreamEl = document.getElementById("signalStream");
var adTitleEl = document.getElementById("adTitle");
var adCopyEl = document.getElementById("adCopy");
var adFeedbackEl = document.getElementById("adFeedback");
var adChoicesEl = document.getElementById("adChoices");
var shieldFillEl = document.getElementById("shieldFill");
var shieldFeedbackEl = document.getElementById("shieldFeedback");
var attentionEngineEl = document.getElementById("attentionEngine");
var engineModesEl = document.getElementById("engineModes");
var engineAxesEl = document.getElementById("engineAxes");
var enginePressureEl = document.getElementById("enginePressure");
var engineMinutesEl = document.getElementById("engineMinutes");
var engineHookEl = document.getElementById("engineHook");
var engineDefenseEl = document.getElementById("engineDefense");
var enginePlatformLabelEl = document.getElementById("enginePlatformLabel");
var engineTitleEl = document.getElementById("engineTitle");
var engineMechanicEl = document.getElementById("engineMechanic");
var enginePressureLabelEl = document.getElementById("enginePressureLabel");
var enginePressureFillEl = document.getElementById("enginePressureFill");
var engineFactorsEl = document.getElementById("engineFactors");
var engineLogEl = document.getElementById("engineLog");
var engineConsumeEl = document.getElementById("engineConsume");
var engineReactEl = document.getElementById("engineReact");
var engineBranchEl = document.getElementById("engineBranch");
var engineResistEl = document.getElementById("engineResist");

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function renderEngineAxes(profile) {
  var labels = {
    novelty: "Novelty",
    social: "Social",
    urgency: "Urgency",
    depth: "Depth",
    commerce: "Commerce"
  };
  engineAxesEl.innerHTML = Object.keys(labels).map(function (key) {
    var value = profile.axes[key];
    return '<div class="sma-axis-row">' +
      '<span>' + labels[key] + '</span>' +
      '<div class="sma-axis-track" aria-hidden="true"><div class="sma-axis-fill" style="--fill:' + value + '%;"></div></div>' +
      '<strong>' + value + '</strong>' +
    '</div>';
  }).join("");
}

function renderEngineFactors(profile) {
  var pressureBoost = Math.round((enginePressure - 38) / 5);
  engineFactorsEl.innerHTML = profile.factors.map(function (factor, index) {
    var adjusted = clamp(factor[1] + pressureBoost + (engineCycle % 3) * (index + 1), 0, 100);
    return '<div class="sma-factor-row">' +
      '<span>' + factor[0] + '</span>' +
      '<div class="sma-factor-track" aria-hidden="true"><div class="sma-factor-fill" style="--fill:' + adjusted + '%;"></div></div>' +
      '<strong>' + adjusted + '</strong>' +
    '</div>';
  }).join("");
}

function renderEngine() {
  if (!attentionEngineEl) return;
  var profile = engineProfiles[enginePlatform];
  var card = profile.cards[engineCycle % profile.cards.length];
  var pressure = clamp(enginePressure, 0, 100);

  attentionEngineEl.setAttribute("data-platform", enginePlatform);
  attentionEngineEl.style.setProperty("--engine-accent", profile.accent);
  engineModesEl.querySelectorAll(".sma-mode-btn").forEach(function (button) {
    var selected = button.getAttribute("data-engine-platform") === enginePlatform;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  enginePressureEl.textContent = pressure + "%";
  engineMinutesEl.textContent = engineMinutes + " min";
  engineHookEl.textContent = profile.hook;
  engineDefenseEl.textContent = engineDefense + "%";
  enginePlatformLabelEl.textContent = profile.label;
  engineTitleEl.textContent = card ? card[0] : profile.title;
  engineMechanicEl.textContent = card ? card[1] : profile.mechanic;
  enginePressureLabelEl.textContent = pressure + "%";
  enginePressureFillEl.style.setProperty("--fill", pressure + "%");
  engineConsumeEl.textContent = profile.labels.consume;
  engineReactEl.textContent = profile.labels.react;
  engineBranchEl.textContent = profile.labels.branch;
  engineResistEl.textContent = profile.labels.resist;
  renderEngineAxes(profile);
  renderEngineFactors(profile);
  engineLogEl.innerHTML = engineLog.length
    ? engineLog.map(function (entry) { return "<div>" + entry + "</div>"; }).join("")
    : "<div>Pick a platform, then press the action buttons to see how the loop learns from you.</div>";
}

function setEnginePlatform(nextPlatform) {
  enginePlatform = nextPlatform;
  enginePressure = 38;
  engineMinutes = 0;
  engineDefense = 0;
  engineCycle = 0;
  engineLog = ["Loaded " + engineProfiles[enginePlatform].label + ". The emulator starts with a neutral attention profile."];
  renderEngine();
}

function runEngineAction(action) {
  var profile = engineProfiles[enginePlatform];
  var pressureDelta = 0;
  var minutesDelta = 0;
  var defenseDelta = 0;

  if (action === "consume") {
    pressureDelta = 13;
    minutesDelta = enginePlatform === "tiktok" ? 2 : enginePlatform === "snapchat" ? 1 : 8;
  } else if (action === "react") {
    pressureDelta = 10;
    minutesDelta = 2;
  } else if (action === "branch") {
    pressureDelta = 18;
    minutesDelta = enginePlatform === "reddit" || enginePlatform === "youtube" || enginePlatform === "live" ? 12 : 5;
  } else {
    pressureDelta = -22;
    minutesDelta = 0;
    defenseDelta = 20;
  }

  var previousPressure = enginePressure;
  enginePressure = clamp(enginePressure + pressureDelta - Math.round(engineDefense / 18), 0, 100);
  engineMinutes = clamp(engineMinutes + minutesDelta, 0, 999);
  engineDefense = clamp(engineDefense + defenseDelta, 0, 100);
  engineCycle += action === "resist" ? 0 : 1;
  engineLog.unshift(profile.messages[action] + " Model pressure change: " + (enginePressure - previousPressure >= 0 ? "+" : "") + (enginePressure - previousPressure) + " points.");
  engineLog = engineLog.slice(0, 5);
  renderEngine();
}

function getTopTopic() {
  return Object.keys(topics).sort(function (a, b) {
    return topics[b].score - topics[a].score;
  })[0];
}

function addSignal(label, topicKey) {
  signalCount += 1;
  recentSignals.unshift({ label: label, topic: topics[topicKey].label, topicKey: topicKey });
  recentSignals = recentSignals.slice(0, 8);
}

function chooseNextPost() {
  var total = Object.keys(topics).reduce(function (sum, key) {
    return sum + Math.max(1, topics[key].score);
  }, 0);
  var target = Math.random() * total;
  var running = 0;
  var chosenTopic = "science";

  Object.keys(topics).some(function (key) {
    running += Math.max(1, topics[key].score);
    if (running >= target) {
      chosenTopic = key;
      return true;
    }
    return false;
  });

  var matching = posts.filter(function (post) { return post.topic === chosenTopic; });
  currentPost = matching[Math.floor(Math.random() * matching.length)];
}

function renderBars() {
  profileBarsEl.innerHTML = Object.keys(topics).map(function (key) {
    var topic = topics[key];
    var pct = clamp(topic.score, 0, 100);
    return '<div class="sma-bar-row">' +
      '<span>' + topic.label + '</span>' +
      '<div class="sma-bar-track" aria-hidden="true"><div class="sma-bar-fill" style="--bar:' + pct + '%; --bar-color:' + topic.color + ';"></div></div>' +
      '<strong>' + pct + '</strong>' +
    '</div>';
  }).join("");
}

function renderSignals() {
  signalStreamEl.innerHTML = recentSignals.length ? recentSignals.map(function (signal) {
    return '<span class="sma-signal-pill" data-topic="' + signal.topicKey + '">' +
      signal.label + ': ' + signal.topic +
    '</span>';
  }).join("") : '<span class="sma-signal-pill">No signals yet</span>';
}

function renderPost() {
  var topic = topics[currentPost.topic];
  postSourceEl.textContent = currentPost.source;
  postTitleEl.textContent = currentPost.title;
  postDescriptionEl.textContent = currentPost.description;
  postTopicEl.textContent = topic.label;
  postTopicEl.setAttribute("data-topic", currentPost.topic);
  postVisualEl.style.setProperty("--post-color", topic.color);
  postMarkEl.textContent = currentPost.mark;
}

function renderReadouts() {
  var top = getTopTopic();
  topTopicEl.textContent = topics[top].label;
  attentionEl.textContent = attention + "%";
  signalCountEl.textContent = String(signalCount);
  adMatchEl.textContent = attention > 72 ? "High" : attention > 38 ? "Medium" : "Low";
}

function renderAll() {
  renderBars();
  renderSignals();
  renderPost();
  renderReadouts();
}

function updateModel(action) {
  var topicKey = currentPost.topic;
  var topic = topics[topicKey];
  var message;

  if (action === "watch") {
    topic.score = clamp(topic.score + 12, 0, 100);
    attention = clamp(attention + 10, 0, 100);
    addSignal("watch time", topicKey);
    message = "In this model, watching adds 12 topic points. The feed now predicts more " + topic.label.toLowerCase() + " content will hold your attention.";
  } else if (action === "like") {
    topic.score = clamp(topic.score + 18, 0, 100);
    attention = clamp(attention + 6, 0, 100);
    addSignal("like", topicKey);
    message = "In this model, a like adds 18 topic points. A real system can interpret likes as interest, but a like does not reveal your full intent.";
  } else if (action === "share") {
    topic.score = clamp(topic.score + 16, 0, 100);
    attention = clamp(attention + 8, 0, 100);
    addSignal("share", topicKey);
    message = "Sharing tells the system this content may spread. Platforms often value shares because they bring in more attention.";
  } else if (action === "skip") {
    topic.score = clamp(topic.score - 5, 0, 100);
    attention = clamp(attention - 2, 0, 100);
    addSignal("skip", topicKey);
    message = "In this model, a skip subtracts 5 topic points. Real platforms use different weights and contexts; this is not a universal rule.";
  } else {
    topic.score = clamp(topic.score - 20, 0, 100);
    attention = clamp(attention - 6, 0, 100);
    addSignal("not interested", topicKey);
    message = "Not interested is an explicit correction. You are training the algorithm back instead of only being trained by it.";
  }

  feedbackEl.textContent = message;
  chooseNextPost();
  renderAll();
}

document.querySelector(".sma-actions").addEventListener("click", function (event) {
  var button = event.target.closest("[data-action]");
  if (!button) return;
  updateModel(button.getAttribute("data-action"));
});

engineModesEl.addEventListener("click", function (event) {
  var button = event.target.closest("[data-engine-platform]");
  if (!button) return;
  setEnginePlatform(button.getAttribute("data-engine-platform"));
});

document.querySelector(".sma-engine-actions").addEventListener("click", function (event) {
  var button = event.target.closest("[data-engine-action]");
  if (!button) return;
  runEngineAction(button.getAttribute("data-engine-action"));
});

function renderAd() {
  var ad = ads[currentAdIndex];
  adTitleEl.textContent = ad.title;
  adCopyEl.textContent = ad.copy;
  adFeedbackEl.textContent = "Pick the influence tactic that best fits the ad.";
  adChoicesEl.querySelectorAll(".sma-choice").forEach(function (choice) {
    choice.classList.remove("correct", "wrong");
    choice.disabled = false;
  });
}

adChoicesEl.addEventListener("click", function (event) {
  var choice = event.target.closest("[data-choice]");
  if (!choice) return;
  var ad = ads[currentAdIndex];
  var selected = choice.getAttribute("data-choice");

  adChoicesEl.querySelectorAll(".sma-choice").forEach(function (button) {
    button.classList.remove("correct", "wrong");
  });

  if (selected === ad.tactic) {
    choice.classList.add("correct");
    adFeedbackEl.textContent = "Correct. " + ad.why;
  } else {
    choice.classList.add("wrong");
    adFeedbackEl.textContent = "Not quite. This ad is mainly using " + ad.tactic.replace("-", " ") + ". " + ad.why;
  }
});

document.getElementById("nextAdBtn").addEventListener("click", function () {
  currentAdIndex = (currentAdIndex + 1) % ads.length;
  renderAd();
});

document.getElementById("safetyChecklist").addEventListener("click", function (event) {
  var button = event.target.closest(".sma-check-btn");
  if (!button) return;
  var active = button.classList.toggle("active");
  button.setAttribute("aria-pressed", active ? "true" : "false");

  var buttons = Array.prototype.slice.call(document.querySelectorAll(".sma-check-btn"));
  var completed = buttons.filter(function (item) { return item.classList.contains("active"); }).length;
  var pct = Math.round((completed / buttons.length) * 100);
  shieldFillEl.style.setProperty("--shield", pct + "%");
  shieldFeedbackEl.textContent = completed === buttons.length
    ? "All habits selected. Choose one concrete action to try; this checklist does not guarantee safety."
    : completed + " of " + buttons.length + " habits selected.";
});

document.getElementById("feedReset").addEventListener("click", function () {
  Object.keys(topics).forEach(function (key) { topics[key].score = initialScores[key]; });
  signalCount = 0; attention = 0; recentSignals = []; currentPost = posts[0];
  feedbackEl.textContent = "Feed reset to its original scores and first post. Compare a different action sequence.";
  renderAll();
});
renderEngine();
renderAll();
renderAd();
    }());
