// ===== Task Board: add, edit, complete, delete, search, sort and persist tasks =====

const STORAGE_KEY = "taskBoard.tasks";
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

const $ = (id) => document.getElementById(id);
const form = $("taskForm");
const taskInput = $("taskInput");
const priorityInput = $("priorityInput");
const taskList = $("taskList");
const formError = $("formError");
const counter = $("counter");
const emptyState = $("emptyState");
const searchInput = $("searchInput");
const sortToggle = $("sortToggle");
const clearBtn = $("clearCompleted");
const filterButtons = document.querySelectorAll(".filter");

// App state
let tasks = loadTasks();
let currentFilter = "all";
let searchQuery = "";
let sortByPriority = false;
let editingId = null;

$("today").textContent = new Date().toLocaleDateString("en-IN", {
  weekday: "long", day: "numeric", month: "long", year: "numeric"
});

// ---------- Storage ----------
function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Storage may be blocked; the app still works for this session
  }
}

// ---------- Actions ----------
function addTask(title, priority) {
  tasks.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title,
    priority,
    completed: false,
    createdAt: new Date().toISOString()
  });
  saveTasks();
  render();
}

function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) task.completed = !task.completed;
  saveTasks();
  render();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  render();
}

function saveEdit(id, newTitle) {
  const title = newTitle.trim();
  const task = tasks.find((t) => t.id === id);
  if (task && title) task.title = title; // empty edits are ignored
  editingId = null;
  saveTasks();
  render();
}

// ---------- Rendering ----------
function makeButton(className, label, text) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = className;
  btn.title = label;
  btn.setAttribute("aria-label", label);
  btn.textContent = text;
  return btn;
}

function createTaskElement(task) {
  const li = document.createElement("li");
  li.className = `task priority-${task.priority}` + (task.completed ? " completed" : "");
  li.dataset.id = task.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.title = "Mark as completed";

  const text = document.createElement("div");
  text.className = "text";

  if (task.id === editingId) {
    const edit = document.createElement("input");
    edit.type = "text";
    edit.className = "edit-input";
    edit.value = task.title;
    edit.maxLength = 120;
    edit.addEventListener("keydown", (e) => {
      if (e.key === "Enter") saveEdit(task.id, edit.value);
      if (e.key === "Escape") { editingId = null; render(); }
    });
    // Blur saves too, but only if this edit is still active (avoids double saves)
    edit.addEventListener("blur", () => {
      if (editingId === task.id) saveEdit(task.id, edit.value);
    });
    text.append(edit);
    setTimeout(() => { edit.focus(); edit.select(); }, 0);
  } else {
    const title = document.createElement("span");
    title.className = "title";
    title.textContent = task.title;
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = "Added " + new Date(task.createdAt).toLocaleString("en-IN", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
    });
    text.append(title, meta);
  }

  const badge = document.createElement("span");
  badge.className = `badge ${task.priority}`;
  badge.textContent = task.priority;

  const editBtn = makeButton("icon-btn edit", "Edit task", "\u270E");
  const delBtn = makeButton("icon-btn delete", "Delete task", "\u2715");

  li.append(checkbox, text, badge, editBtn, delBtn);
  return li;
}

function getVisibleTasks() {
  let list = tasks.filter((t) =>
    currentFilter === "all" ? true : currentFilter === "completed" ? t.completed : !t.completed
  );
  if (searchQuery) {
    list = list.filter((t) => t.title.toLowerCase().includes(searchQuery));
  }
  if (sortByPriority) {
    // Array.sort is stable, so equal priorities keep their newest-first order
    list = [...list].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }
  return list;
}

function render() {
  const visible = getVisibleTasks();

  taskList.replaceChildren(...visible.map(createTaskElement));
  emptyState.classList.toggle("show", visible.length === 0);
  emptyState.textContent = tasks.length === 0
    ? "Nothing here yet. Add a task to get started."
    : "No tasks match this view.";

  const done = tasks.filter((t) => t.completed).length;
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  counter.textContent = `${tasks.length - done} pending / ${done} completed`;
  $("progressText").textContent = percent + "%";
  $("progressBar").style.width = percent + "%";
  clearBtn.disabled = done === 0;
}

// ---------- Events ----------
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = taskInput.value.trim();
  if (!title) {
    formError.textContent = "Please enter a task before adding.";
    taskInput.focus();
    return;
  }
  if (tasks.some((t) => t.title.toLowerCase() === title.toLowerCase() && !t.completed)) {
    formError.textContent = "This task is already in your pending list.";
    return;
  }
  formError.textContent = "";
  addTask(title, priorityInput.value);
  taskInput.value = "";
  taskInput.focus();
});

// Event delegation: one listener handles toggle, edit and delete for every task
taskList.addEventListener("click", (e) => {
  const li = e.target.closest(".task");
  if (!li) return;
  const id = li.dataset.id;

  if (e.target.closest(".delete")) {
    deleteTask(id);
  } else if (e.target.closest(".edit")) {
    editingId = id;
    render();
  } else if (e.target.matches("input[type='checkbox']")) {
    toggleTask(id);
  }
});

filterButtons.forEach((btn) =>
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    render();
  })
);

searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value.trim().toLowerCase();
  render();
});

sortToggle.addEventListener("click", () => {
  sortByPriority = !sortByPriority;
  sortToggle.setAttribute("aria-pressed", String(sortByPriority));
  sortToggle.textContent = sortByPriority ? "Sort: priority" : "Sort: newest";
  render();
});

clearBtn.addEventListener("click", () => {
  tasks = tasks.filter((t) => !t.completed);
  saveTasks();
  render();
});

render();