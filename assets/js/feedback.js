// Rating and Bug Submission System for Student Showcase
const LOCAL_STORAGE_KEY = 'classroom_os_showcase_feedback';

function getSeededFeedback(projectId, category) {
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) {
    hash = projectId.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  const studentNames = ["Ethan", "Chloe", "Liam", "Sophia", "Mason", "Ava", "Lucas", "Olivia", "Noah", "Emma", "Logan", "Mia"];
  
  const goodComments = [
    "Awesome gameplay!",
    "Great graphics and art!",
    "Super smooth controls!",
    "Very creative idea!",
    "I could play this all day!",
    "Love the theme and music!",
    "Great work on this project!"
  ];
  
  const bugComments = [
    "Game gets stuck or frozen.",
    "Controls are a bit unresponsive.",
    "Objects clip through walls.",
    "Needs clearer instructions.",
    "Audio didn't load.",
    "Minor graphics bug in level 1."
  ];

  const likesCount = (hash % 15) + 3; // 3 to 17 likes
  const bugsCount = hash % 3; // 0 to 2 bugs
  
  const history = [];
  
  // Add some mock likes
  const numComments = (hash % 2) + 1; // 1 to 2 initial comments
  for (let i = 0; i < numComments; i++) {
    const nameIndex = (hash + i) % studentNames.length;
    const commentIndex = (hash * (i + 1)) % goodComments.length;
    const daysAgo = (hash + i) % 15 + 1;
    const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    history.push({
      student: studentNames[nameIndex],
      type: "like",
      comment: goodComments[commentIndex],
      timestamp: date
    });
  }
  
  // Maybe add a mock bug comment
  if (bugsCount > 0 && (hash % 2 === 0)) {
    const nameIndex = (hash + 10) % studentNames.length;
    const commentIndex = (hash + 5) % bugComments.length;
    const daysAgo = (hash % 10) + 1;
    const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    history.push({
      student: studentNames[nameIndex],
      type: "bug",
      comment: bugComments[commentIndex],
      timestamp: date
    });
  }

  history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return {
    likes: likesCount,
    bugs: bugsCount,
    history: history
  };
}

export function getFeedback(projectId, category) {
  let store = {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) store = JSON.parse(raw);
  } catch (e) {
    console.error("Could not read from localStorage", e);
  }

  if (!store[projectId]) {
    store[projectId] = getSeededFeedback(projectId, category);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
      console.error("Could not write to localStorage", e);
    }
  }

  return store[projectId];
}

export function addFeedback(projectId, type, comment) {
  let store = {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) store = JSON.parse(raw);
  } catch (e) {
    console.error("Could not read from localStorage", e);
  }

  if (!store[projectId]) {
    store[projectId] = getSeededFeedback(projectId, "");
  }

  if (type === "like") {
    store[projectId].likes += 1;
  } else if (type === "bug") {
    store[projectId].bugs += 1;
  }

  store[projectId].history.unshift({
    student: "You (Guest)",
    type: type,
    comment: comment,
    timestamp: new Date().toISOString()
  });

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error("Could not write to localStorage", e);
  }

  return store[projectId];
}

export function renderFeedbackWidget(container, projectId, category) {
  if (!container) return;
  
  const data = getFeedback(projectId, category);
  
  container.innerHTML = `
    <div class="feedback-widget">
      <h3 class="feedback-title">Rate & Feedback</h3>
      
      <div class="feedback-stats">
        <div class="stat-pill like-pill">
          <span class="stat-icon">👍</span>
          <span class="stat-count" id="fb-likes-count">${data.likes}</span> Cool Builds
        </div>
        <div class="stat-pill bug-pill">
          <span class="stat-icon">❌</span>
          <span class="stat-count" id="fb-bugs-count">${data.bugs}</span> Bug Reports
        </div>
      </div>

      <div class="feedback-actions">
        <button type="button" class="fb-action-btn like-btn" id="fb-like-trigger">
          👍 Cool Build
        </button>
        <button type="button" class="fb-action-btn bug-btn" id="fb-bug-trigger">
          ❌ Report Bug
        </button>
      </div>

      <!-- Selection panel -->
      <div class="feedback-panel" id="fb-selection-panel" hidden>
        <h4 class="panel-heading" id="fb-panel-title">Choose Feedback</h4>
        <div class="comment-chips" id="fb-comment-chips"></div>
        <div class="panel-actions">
          <button type="button" class="panel-btn submit-btn" id="fb-submit-comment" disabled>Submit</button>
          <button type="button" class="panel-btn cancel-btn" id="fb-cancel-comment">Cancel</button>
        </div>
      </div>

      <div class="feedback-history">
        <h4>Recent Activity</h4>
        <ul class="activity-list" id="fb-activity-list">
        </ul>
      </div>
    </div>
  `;

  const likesCountEl = container.querySelector('#fb-likes-count');
  const bugsCountEl = container.querySelector('#fb-bugs-count');
  const likeTrigger = container.querySelector('#fb-like-trigger');
  const bugTrigger = container.querySelector('#fb-bug-trigger');
  const selectionPanel = container.querySelector('#fb-selection-panel');
  const panelTitle = container.querySelector('#fb-panel-title');
  const commentChips = container.querySelector('#fb-comment-chips');
  const submitBtn = container.querySelector('#fb-submit-comment');
  const cancelBtn = container.querySelector('#fb-cancel-comment');
  const activityList = container.querySelector('#fb-activity-list');

  let currentType = null;
  let selectedComment = null;

  const goodComments = [
    "Awesome gameplay!",
    "Great graphics and art!",
    "Super smooth controls!",
    "Very creative idea!",
    "I could play this all day!",
    "Love the theme and music!",
    "Great work on this project!"
  ];
  
  const bugComments = [
    "Game gets stuck or frozen.",
    "Controls are a bit unresponsive.",
    "Objects clip through walls.",
    "Needs clearer instructions.",
    "Audio didn't load.",
    "Minor graphics bug in level 1."
  ];

  function renderHistory(history) {
    activityList.innerHTML = '';
    if (history.length === 0) {
      activityList.innerHTML = '<li class="activity-item" style="opacity: 0.6; text-align: center;">No feedback yet. Be the first!</li>';
      return;
    }
    history.forEach(item => {
      const li = document.createElement('li');
      li.className = 'activity-item';
      
      const timeStr = new Date(item.timestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const icon = item.type === "like" ? "👍" : "❌";
      const iconClass = item.type === "like" ? "activity-student" : "activity-time";
      
      li.innerHTML = `
        <div class="activity-header">
          <span class="activity-student">${item.student} ${icon}</span>
          <span class="activity-time">${timeStr}</span>
        </div>
        <div class="activity-comment">${item.comment}</div>
      `;
      activityList.appendChild(li);
    });
  }

  function showPanel(type) {
    currentType = type;
    selectedComment = null;
    submitBtn.disabled = true;
    
    selectionPanel.hidden = false;
    panelTitle.textContent = type === "like" ? "Thumbs Up Comments" : "Bug / Constructive Criticisms";
    
    const comments = type === "like" ? goodComments : bugComments;
    commentChips.innerHTML = '';
    
    comments.forEach(comment => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'comment-chip';
      btn.textContent = comment;
      
      btn.addEventListener('click', () => {
        commentChips.querySelectorAll('.comment-chip').forEach(c => c.classList.remove('selected'));
        btn.classList.add('selected');
        selectedComment = comment;
        submitBtn.disabled = false;
      });
      
      commentChips.appendChild(btn);
    });

    selectionPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hidePanel() {
    selectionPanel.hidden = true;
    currentType = null;
    selectedComment = null;
  }

  likeTrigger.addEventListener('click', () => showPanel("like"));
  bugTrigger.addEventListener('click', () => showPanel("bug"));
  cancelBtn.addEventListener('click', hidePanel);

  submitBtn.addEventListener('click', () => {
    if (!currentType || !selectedComment) return;
    const newData = addFeedback(projectId, currentType, selectedComment);
    
    likesCountEl.textContent = newData.likes;
    bugsCountEl.textContent = newData.bugs;
    renderHistory(newData.history);
    
    hidePanel();
  });

  renderHistory(data.history);
}
