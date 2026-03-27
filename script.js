/* ═══════════════════════════════════════════════════════
   MONTHLY HABIT TRACKER — script.js
   Sections:
     1. Constants & State
     2. Date Utilities
     3. Quote System
     4. Background System
     5. Table Rendering
     6. Task CRUD
     7. Checkbox Logic
     8. Progress
     9. Monthly Reset
    10. Toast Notifications
    11. Init
   ═══════════════════════════════════════════════════════ */


/* ─────────────────────────────────────────────────────
   1. CONSTANTS & STORAGE KEYS
───────────────────────────────────────────────────── */

const KEYS = {
  TASKS:       'ht_tasks',
  MONTH:       'ht_month',
  BG_IMAGE:    'ht_bg_image',
  QUOTE_TODAY: 'ht_quote_today',
  QUOTE_DATE:  'ht_quote_date',
  QUOTE_HIST:  'ht_quote_history',
};

// 18 motivational quotes (works offline, no API)
const QUOTES = [
  "The secret of getting ahead is getting started.",
  "Small daily improvements lead to stunning results.",
  "Discipline is choosing between what you want now and what you want most.",
  "A year from now you'll wish you had started today.",
  "You don't have to be extreme, just consistent.",
  "Success is the sum of small efforts repeated day in and day out.",
  "Don't watch the clock; do what it does. Keep going.",
  "Motivation gets you started. Habit keeps you going.",
  "The difference between who you are and who you want to be is what you do.",
  "Every action you take is a vote for the person you wish to become.",
  "Your future is created by what you do today, not tomorrow.",
  "Progress is progress, no matter how small.",
  "Push yourself, because no one else is going to do it for you.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Don't stop when you're tired. Stop when you're done.",
  "Wake up with determination. Go to bed with satisfaction.",
  "Dream it. Wish it. Do it.",
  "Great things never come from comfort zones.",
];

const DAYS_OF_WEEK  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS        = ['January','February','March','April','May','June',
                       'July','August','September','October','November','December'];

/* ─────────────────────────────────────────────────────
   2. DATE UTILITIES
───────────────────────────────────────────────────── */

/** Returns today as a Date (time zeroed) */
function today() {
  const d = new Date();
  d.setHours(0,0,0,0);
  return d;
}

/** Format date as DD-MM-YYYY */
function formatDate(d) {
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/** Number of days in a given month (1-based month) */
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/** Returns "YYYY-MM" string for current month */
function currentMonthKey() {
  const d = today();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

/* ─────────────────────────────────────────────────────
   3. QUOTE SYSTEM
   - Pick one quote per day
   - Don't repeat last 5 quotes
   - Store in localStorage
───────────────────────────────────────────────────── */

function loadDailyQuote() {
  const todayStr = formatDate(today());
  const savedDate  = localStorage.getItem(KEYS.QUOTE_DATE);
  const savedQuote = localStorage.getItem(KEYS.QUOTE_TODAY);

  // If we already have today's quote, just show it
  if (savedDate === todayStr && savedQuote) {
    document.getElementById('daily-quote').textContent = savedQuote;
    return;
  }

  // Get quote history (last 5)
  let history = [];
  try { history = JSON.parse(localStorage.getItem(KEYS.QUOTE_HIST)) || []; }
  catch (_) { history = []; }

  // Build pool excluding recent ones
  const pool = QUOTES.filter(q => !history.includes(q));
  const chosen = pool.length > 0
    ? pool[Math.floor(Math.random() * pool.length)]
    : QUOTES[Math.floor(Math.random() * QUOTES.length)];

  // Update history (keep last 8)
  history.push(chosen);
  if (history.length > 8) history.shift();

  // Persist
  localStorage.setItem(KEYS.QUOTE_TODAY, chosen);
  localStorage.setItem(KEYS.QUOTE_DATE,  todayStr);
  localStorage.setItem(KEYS.QUOTE_HIST,  JSON.stringify(history));

  // Animate in
  const el = document.getElementById('daily-quote');
  el.style.opacity = '0';
  el.textContent = chosen;
  requestAnimationFrame(() => {
    el.style.transition = 'opacity 0.7s ease';
    el.style.opacity = '1';
  });
}

/* ─────────────────────────────────────────────────────
   4. BACKGROUND SYSTEM
   - Upload → convert to base64 → save
   - Apply on load
───────────────────────────────────────────────────── */

function applyBackground(base64) {
  const imgLayer = document.getElementById('bg-image-layer');
  const overlay  = document.getElementById('bg-overlay');
  if (base64) {
    imgLayer.style.backgroundImage = `url(${base64})`;
    imgLayer.classList.add('active');
    overlay.classList.add('active');
  } else {
    imgLayer.style.backgroundImage = '';
    imgLayer.classList.remove('active');
    overlay.classList.remove('active');
  }
}

function loadBackground() {
  const saved = localStorage.getItem(KEYS.BG_IMAGE);
  if (saved) applyBackground(saved);
}

function setupBackgroundControls() {
  const uploadInput = document.getElementById('bg-upload');

  uploadInput.addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    
    if (file.size >2 * 1024 * 1024) {
      showToast("Image too large (max 2MB)", "red");
      this.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      localStorage.setItem(KEYS.BG_IMAGE, base64);
      applyBackground(base64);
      showToast('Background updated ✓', 'amber');
    };
    reader.readAsDataURL(file);
    this.value = ''; // reset input
  });

  const bglayer = document.getElementById('bg-image-layer');
  
  bglayer.addEventListener('contextmenu', (e) => {
  e.preventDefault(); // 🚫 stop browser right-click menu

  if (!localStorage.getItem(KEYS.BG_IMAGE)) return;

  const confirmReset = confirm("Remove background image?");
  if (!confirmReset) return;

  localStorage.removeItem(KEYS.BG_IMAGE);
  applyBackground(null);
  showToast('Background cleared', 'amber');
});
}

/* ─────────────────────────────────────────────────────
   5. TASK DATA — Load / Save
───────────────────────────────────────────────────── */

/**
 * Task shape:
 * { id: string, name: string, days: { "1": true, "5": false, ... } }
 */

function loadTasks() {
  try {
    const data = JSON.parse(localStorage.getItem(KEYS.TASKS));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks) {
  localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
}

function generateId() {
  return 'task_' + Date.now() + '_' + Math.floor(Math.random() * 999);
}

/* ─────────────────────────────────────────────────────
   6. MONTHLY RESET LOGIC
   - Compare saved month key with current month
   - If changed: keep names, reset all days
───────────────────────────────────────────────────── */

function checkAndResetMonth() {
  const savedMonth   = localStorage.getItem(KEYS.MONTH);
  const currentMonth = currentMonthKey();

  if (savedMonth && savedMonth !== currentMonth) {
    // Month has changed — reset checkbox data
    const tasks = loadTasks();
    tasks.forEach(t => { t.days = {}; });
    saveTasks(tasks);
    showToast('New month! Habits reset. Keep going! 🎯', 'amber');
  }

  // Always store current month
  localStorage.setItem(KEYS.MONTH, currentMonth);
}

/* ─────────────────────────────────────────────────────
   7. TABLE RENDERING
───────────────────────────────────────────────────── */

function renderTable() {
  const d      = today();
  const year   = d.getFullYear();
  const month  = d.getMonth() + 1; // 1-based
  const dayNum = d.getDate();
  const total  = daysInMonth(year, month);
  const tasks  = loadTasks();

  renderHeader(total, dayNum);
  renderBody(tasks, total, dayNum);
  updateEmptyState(tasks);
}

/** Build the <thead> row: Task | Progress | Actions | 1 | 2 | … | N */
function renderHeader(totalDays, todayDay) {
  const row = document.getElementById('table-header-row');
  row.innerHTML = '';

  // Task column
  row.appendChild(makeTH('Task', 'col-task'));
  // Progress column
  row.appendChild(makeTH('Progress', 'col-progress'));
  // Actions column
  row.appendChild(makeTH('', 'col-actions'));

  // Day columns
  for (let i = 1; i <= totalDays; i++) {
    const th = makeTH(i, 'col-day');
    if (i === todayDay) th.classList.add('today-col');
    row.appendChild(th);
  }
}

function makeTH(text, cls) {
  const th = document.createElement('th');
  th.textContent = text;
  if (cls) th.className = cls;
  return th;
}

/** Build all <tbody> rows */
function renderBody(tasks, totalDays, todayDay) {
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  tasks.forEach(task => {
    const tr = buildTaskRow(task, totalDays, todayDay);
    tbody.appendChild(tr);
  });
}

/** Build one task row */
function buildTaskRow(task, totalDays, todayDay) {
  const tr = document.createElement('tr');
  tr.dataset.id = task.id;

  // ── Task name cell
  const tdName = document.createElement('td');
  tdName.className = 'cell-task';
  const wrapper = document.createElement('div');
  wrapper.className = 'task-row';
  const nameSpan = document.createElement('span');
  nameSpan.className = 'task-name-text';
  nameSpan.textContent = task.name;
  nameSpan.title = task.name;
  const streak = calculateStreak(task);

  const streakBadge = document.createElement('div');
  streakBadge.className = 'streak-badge';
  streakBadge.textContent = `🔥${streak}`;

  if (streak >= 10) {
  streakBadge.style.background = 'orange';
  streakBadge.style.color = 'black';
  }
  wrapper.appendChild(nameSpan);
  wrapper.appendChild(streakBadge);
  tdName.appendChild(wrapper);
  tr.appendChild(tdName);

  // ── Progress cell
  const tdProgress = document.createElement('td');
  tdProgress.className = 'cell-progress';
  tdProgress.appendChild(buildProgressWidget(task, totalDays));
  tr.appendChild(tdProgress);

  // ── Actions cell
  const tdActions = document.createElement('td');
  tdActions.className = 'cell-actions';
  tdActions.innerHTML = `
    <div class="action-btns">
      <button class="btn-icon edit" title="Edit" data-id="${task.id}">✏</button>
      <button class="btn-icon del"  title="Delete" data-id="${task.id}">✕</button>
    </div>`;
  tr.appendChild(tdActions);

  // ── Day checkbox cells
  for (let day = 1; day <= totalDays; day++) {
    const tdDay = document.createElement('td');
    tdDay.className = 'cell-day';
    if (day === todayDay) tdDay.classList.add('today-col');

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'custom-cb';
    cb.checked   = !!task.days[String(day)];
    cb.dataset.id  = task.id;
    cb.dataset.day = day;

    if (day < todayDay) {
      cb.classList.add("past-day");
    } else if (day > todayDay) {
      cb.classList.add("future-day");
    }
    cb.addEventListener('change', onCheckboxChange);
    tdDay.appendChild(cb);
    tr.appendChild(tdDay);
  }

  return tr;
}

/** Progress bar + "X / N days" text */
function buildProgressWidget(task, totalDays) {
  const completed = Object.values(task.days).filter(Boolean).length;
  const pct = totalDays > 0 ? Math.round((completed / totalDays) * 100) : 0;

  const wrap = document.createElement('div');
  wrap.className = 'progress-wrap';

  const text = document.createElement('span');
  text.className = 'progress-text';
  text.textContent = `${completed} / ${totalDays} days`;

  const barBg = document.createElement('div');
  barBg.className = 'progress-bar-bg';

  const barFill = document.createElement('div');
  barFill.className = 'progress-bar-fill';
  barFill.style.width = `${pct}%`;

  barBg.appendChild(barFill);
  wrap.appendChild(text);
  wrap.appendChild(barBg);
  return wrap;
}

function calculateStreak(task) {
  const d = today();
  const todayDay = d.getDate();

  let streak = 0;

  for (let i = todayDay; i >= 1; i--) {
    if (task.days && task.days[String(i)]) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/* ─────────────────────────────────────────────────────
   8. TASK CRUD
───────────────────────────────────────────────────── */

function setupAddTask() {
  const input = document.getElementById('new-task-input');
  const btn   = document.getElementById('add-task-btn');

  const addTask = () => {
    let name = input.value.trim();
    name = name.replace(/[<>]/g, ""); // Basic sanitization to prevent HTML injection
    if (!name) {
      showToast('Please enter a habit name', 'red');
      input.focus();
      return;
    }

    btn.disabled = true;
    setTimeout(() => btn.disabled = false, 500); // Prevent rapid clicks
    const tasks = loadTasks();

    // Prevent duplicates
    if (tasks.some(t => t.name.toLowerCase() === name.toLowerCase())) {
      showToast('Habit already exists!', 'red');
      return;
    }

    // Shows Task limit toast if user tries to add more than 20 tasks
    if (tasks.length >= 20) {
      showToast('Max 20 habits allowed', 'red');
      return;
    }

    tasks.push({ id: generateId(), name, days: {} });
    saveTasks(tasks);
    input.value = '';
    renderTable();
    showToast(`"${name}" added ✓`, 'amber');
  };

  btn.addEventListener('click', addTask);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });
}

/** Delegated click handler on tbody for Edit / Delete */
function setupTableActions() {
  const tbody = document.getElementById('table-body');

  tbody.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.btn-icon.edit');
    const delBtn  = e.target.closest('.btn-icon.del');

    if (editBtn) handleEdit(editBtn.dataset.id);
    if (delBtn)  handleDelete(delBtn.dataset.id);
  });
}

/** Inline edit: replace name span with input field */
function handleEdit(id) {
  const tasks = loadTasks();
  const task  = tasks.find(t => t.id === id);
  if (!task) return;

  // Find the name cell in DOM
  const tr = document.querySelector(`tr[data-id="${id}"]`);
  if (!tr) return;
  const nameSpan = tr.querySelector('.task-name-text');
  if (!nameSpan) return;

  // Replace with input
  const inp = document.createElement('input');
  inp.type      = 'text';
  inp.className = 'task-edit-input';
  inp.value     = task.name;
  inp.maxLength = 60;
  nameSpan.replaceWith(inp);
  inp.focus();
  inp.select();

  const commit = () => {
    const newName = inp.value.trim();

    //prevent empty 
    if (!newName) {
      showToast('Name cannot be empty', 'red');
      inp.focus();
      return;
    }
    
    // Prevent duplicates
    if (tasks.some(t => t.name.toLowerCase() === newName.toLowerCase() && t.id !== id)) {
      showToast("Duplicate habit!", "red");
      inp.focus();
      return;
    }
    
    task.name = newName;
    saveTasks(tasks);
    renderTable();
    showToast('Habit renamed ✓', 'amber');
  };

  inp.addEventListener('blur',  commit);
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
    if (e.key === 'Escape') { inp.value = task.name; inp.blur(); }
  });
}

function handleDelete(id) {
  let tasks = loadTasks();
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  if (!confirm(`Delete habit "${task.name}"?`)) return;
  tasks = tasks.filter(t => t.id !== id);
  saveTasks(tasks);
  renderTable();
  showToast(`"${task.name}" removed`, 'red');
}

/* ─────────────────────────────────────────────────────
   9. CHECKBOX LOGIC
───────────────────────────────────────────────────── */

function onCheckboxChange(e) {
  const cb    = e.target;
  const id    = cb.dataset.id;
  const day   = cb.dataset.day;
  const checked = cb.checked;
  
  const todayDay = today().getDate();
  if (Number(day) !== todayDay) {
    showToast('You can only update today\'s habit status', 'red');
    e.target.checked = false;
    return;
  }
  const tasks = loadTasks();
  const task  = tasks.find(t => t.id === id);
  if (!task) return;
  
  if (!task.days) task.days = {};
  // Update the day state
  task.days[day] = checked;
  saveTasks(tasks);

  // Update just the progress cell without full re-render (smooth UX)
  const tr = cb.closest('tr');
  if (!tr) return;
  const progressCell = tr.querySelector('.cell-progress');
  const d      = today();
  const total  = daysInMonth(d.getFullYear(), d.getMonth()+1);
  progressCell.innerHTML = '';
  progressCell.appendChild(buildProgressWidget(task, total));
}

/* ─────────────────────────────────────────────────────
   10. HEADER DATE
───────────────────────────────────────────────────── */

function renderHeader_DateTime() {
  const d = today();
  document.getElementById('day-name').textContent  = DAYS_OF_WEEK[d.getDay()];
  document.getElementById('full-date').textContent = formatDate(d);

  // Month label in controls bar
  const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  document.getElementById('month-year-label').textContent = label;
}

/* ─────────────────────────────────────────────────────
   11. EMPTY STATE
───────────────────────────────────────────────────── */

function updateEmptyState(tasks) {
  const table = document.getElementById('habit-table');
  table.style.display = '';
}

/* ─────────────────────────────────────────────────────
   12. TOAST NOTIFICATIONS
───────────────────────────────────────────────────── */

let toastTimer = null;

function showToast(msg, type = '') {
  // Remove any existing toast
  const old = document.querySelector('.toast');
  if (old) old.remove();
  if (toastTimer) clearTimeout(toastTimer);

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });

  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 350);
  }, 2800);
}

/* ─────────────────────────────────────────────────────
   13. INITIALISE
───────────────────────────────────────────────────── */

function init() {
  // 1. Check if month changed → reset if so
  checkAndResetMonth();

  // 2. Render header (day + date + month label)
  renderHeader_DateTime();

  // 3. Load and show daily quote
  loadDailyQuote();

  // 4. Load saved background
  loadBackground();

  // 5. Set up background upload/clear
  setupBackgroundControls();

  // 6. Set up "Add Habit" functionality
  setupAddTask();

  // 7. Set up edit/delete delegation on table
  setupTableActions();

  // 8. Render the full habit table
  renderTable();

  // 9. Refresh table at midnight (handles day change without reload)
  scheduleMidnightRefresh();
  //10.Midnight Timer Backup (in case user keeps tab open for days)
  window.addEventListener('focus', () => {
    checkAndResetMonth();
    renderHeader_DateTime();
    renderTable();
    loadDailyQuote();
  });
}

/** Re-render table at midnight so today's column updates */
function scheduleMidnightRefresh() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 5, 0); // 5 seconds past midnight

  const msUntilMidnight = midnight.getTime() - now.getTime();
  setTimeout(() => {
    checkAndResetMonth();
    renderHeader_DateTime();
    renderTable();
    loadDailyQuote();
    scheduleMidnightRefresh(); // schedule next day
  }, msUntilMidnight);
}

// 🚀 Start the app
document.addEventListener('DOMContentLoaded', init);