// =====================================================================
// MODULE ORGANISER — frontend
// Talks to the Node/Express API at /api/*. The server runs the SQL
// against Postgres and returns JSON. We no longer load data.json
// directly; we never mutate any local "table" — every change is a
// real HTTP request, every refresh re-reads the database.
// =====================================================================


// ============= GLOBAL STATE =============
// Cached copies of what the server returned. We only refresh these
// after a successful API call so the UI stays in sync with the DB.
let currentUser = null;
let modules = [];
let assignments = [];   // already JOINed by the server
let announcements = []; // already JOINed by the server

let searchQuery = "";
let filterModule = "All";


// ============= API HELPER =============
// Tiny wrapper around fetch so every call has consistent error handling.
async function api(method, path, body) {
  const options = {
    method: method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) options.body = JSON.stringify(body);

  const response = await fetch(path, options);
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const errJson = await response.json();
      if (errJson.error) detail = errJson.error;
    } catch (_) { /* response wasn't JSON */ }
    throw new Error(method + " " + path + " failed: " + detail);
  }
  // DELETE/PUT might return an empty body; guard against that
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}


// ============= LOAD INITIAL DATA =============
async function loadData() {
  try {
    // Run the four GETs in parallel — faster than awaiting them in series.
    const [user, mods, assigns, anns] = await Promise.all([
      api("GET", "/api/current-user"),
      api("GET", "/api/modules"),
      api("GET", "/api/assignments"),
      api("GET", "/api/announcements"),
    ]);
    currentUser   = user;
    modules       = mods;
    assignments   = assigns;
    announcements = anns;

    document.getElementById("loadingScreen").classList.add("hidden");
    document.getElementById("appScreen").classList.remove("hidden");

    showHeader();
    showModuleFilter();
    showAssignments();
    showAnnouncements();
    setUpButtons();
  } catch (err) {
    console.error("Error loading data:", err);
    document.getElementById("loadingScreen").classList.add("hidden");
    document.getElementById("errorScreen").classList.remove("hidden");
    const msg = document.getElementById("errorMessage");
    if (msg) msg.textContent = "Couldn't reach the server. Make sure it's running (npm start) and try again. Details: " + err.message;
  }
}

// Re-fetch just the assignments list and re-render. Called after any
// mutation (create/edit/delete) so the page reflects the database.
async function refreshAssignments() {
  assignments = await api("GET", "/api/assignments");
  showAssignments();
}

async function refreshAnnouncements() {
  announcements = await api("GET", "/api/announcements");
  showAnnouncements();
}


// ============= HELPERS =============
function padNumber(num) { return num < 10 ? "0" + num : String(num); }

function formatDate(date) {
  return padNumber(date.getDate()) + "/" +
         padNumber(date.getMonth() + 1) + "/" +
         date.getFullYear();
}

function formatNiceDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric"
  });
}

function timeAgo(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const hoursAgo = (now - date) / (1000 * 60 * 60);
  if (hoursAgo < 1)  return "just now";
  if (hoursAgo < 24) return Math.floor(hoursAgo) + "h ago";
  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo < 7) return daysAgo + "d ago";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function daysUntil(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  return Math.ceil((date - now) / (1000 * 60 * 60 * 24));
}

function escapeHTML(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getPillClass(d) {
  if (d < 0)  return "pill-overdue";
  if (d <= 7) return "pill-soon";
  return "pill-ok";
}

function getPillText(d) {
  if (d < 0)  return Math.abs(d) + "d overdue";
  if (d === 0) return "due today";
  return d + "d left";
}

function moduleNameFromCode(code) {
  for (let i = 0; i < modules.length; i++) {
    if (modules[i].code === code) return modules[i].name;
  }
  return code;
}


// ============= HEADER =============
function showHeader() {
  const now = new Date();
  const hour = now.getHours();
  let greeting = "Good Evening";
  if (hour < 12)      greeting = "Good Morning";
  else if (hour < 18) greeting = "Good Afternoon";

  document.getElementById("greeting").textContent = greeting + ".";
  document.getElementById("userName").textContent = currentUser.name;
  document.getElementById("userRole").textContent = currentUser.role;
  document.getElementById("composerAuthor").textContent = currentUser.name;
  document.getElementById("dateMain").textContent = formatDate(now);
  document.getElementById("dateSub").textContent =
    now.toLocaleDateString("en-GB", { weekday: "long" });
}


// ============= MODULE FILTER =============
function showModuleFilter() {
  const select = document.getElementById("moduleFilter");
  const options = [{ value: "All", label: "All modules" }];
  for (let i = 0; i < modules.length; i++) {
    options.push({
      value: modules[i].code,
      label: modules[i].code + " " + modules[i].name
    });
  }
  let html = "";
  for (let i = 0; i < options.length; i++) {
    const o = options[i];
    const selected = o.value === filterModule ? "selected" : "";
    html += `<option value="${escapeHTML(o.value)}" ${selected}>${escapeHTML(o.label)}</option>`;
  }
  select.innerHTML = html;
}


// ============= ASSIGNMENTS TABLE =============
function showAssignments() {
  // The server already JOINed and ORDERed for us; we just filter.
  const filtered = [];
  const query = searchQuery.toLowerCase();

  for (let i = 0; i < assignments.length; i++) {
    const r = assignments[i];
    const matchesModule = filterModule === "All" || r.module_code === filterModule;
    const matchesSearch =
      query === "" ||
      r.name.toLowerCase().includes(query) ||
      r.created_by_name.toLowerCase().includes(query) ||
      r.created_by_id.toLowerCase().includes(query);
    if (matchesModule && matchesSearch) filtered.push(r);
  }

  document.getElementById("assignmentCount").textContent =
    filtered.length + " of " + assignments.length + " assignments";

  const tbody = document.getElementById("assignmentsBody");
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">No assignments match your filters.</td></tr>`;
    return;
  }

  let html = "";
  for (let i = 0; i < filtered.length; i++) {
    const r = filtered[i];
    const days = daysUntil(r.due_date);

    html += `
      <tr>
        <td class="cell-name">${escapeHTML(r.name)}</td>
        <td class="cell-muted">
          <div>${escapeHTML(r.module_code)}</div>
          <div class="cell-id" style="font-family: inherit;">${escapeHTML(r.module_name)}</div>
        </td>
        <td>
          <div>${escapeHTML(r.created_by_name)}</div>
          <div class="cell-id">${escapeHTML(r.created_by_id)}</div>
        </td>
        <td class="cell-muted">${formatNiceDate(r.date_set)}</td>
        <td>
          <div class="cell-name">${formatNiceDate(r.due_date)}</div>
          <span class="pill ${getPillClass(days)}">${getPillText(days)}</span>
        </td>
        <td>
          <div class="cell-actions">
            <button class="btn-icon" data-action="edit" data-id="${r.id}">Edit</button>
            <button class="btn-icon danger" data-action="delete" data-id="${r.id}">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }
  tbody.innerHTML = html;
}


// ============= ANNOUNCEMENTS LIST =============
function showAnnouncements() {
  document.getElementById("annCount").textContent = announcements.length;
  const feed = document.getElementById("feed");

  if (announcements.length === 0) {
    feed.innerHTML = `<p class="empty-row">No announcements yet.</p>`;
    return;
  }

  let html = "";
  for (let i = 0; i < announcements.length; i++) {
    const a = announcements[i];
    html += `
      <div class="announcement">
        <div class="ann-head">
          <div class="ann-title">${escapeHTML(a.title)}</div>
          <div class="ann-time">${timeAgo(a.posted_at)}</div>
        </div>
        <div class="ann-meta">${escapeHTML(a.author_name)} &middot; ${escapeHTML(a.module_code)}</div>
        <div class="ann-body">${escapeHTML(a.body)}</div>
      </div>
    `;
  }
  feed.innerHTML = html;
}


// ============= ASSIGNMENT MODAL =============
function openAssignmentModal(assignment) {
  const isEditing = assignment !== null;

  let name = "";
  let moduleCode = currentUser.primary_module || (modules[0] && modules[0].code) || "";
  let dateSet = new Date().toISOString().split("T")[0];
  let dueDate = "";

  if (isEditing) {
    name        = assignment.name;
    moduleCode  = assignment.module_code;
    // The API returns dates in ISO format; <input type="date"> wants YYYY-MM-DD
    dateSet     = String(assignment.date_set).split("T")[0];
    dueDate     = String(assignment.due_date).split("T")[0];
  }

  let moduleOptions = "";
  for (let i = 0; i < modules.length; i++) {
    const m = modules[i];
    const selected = m.code === moduleCode ? "selected" : "";
    moduleOptions += `<option value="${escapeHTML(m.code)}" ${selected}>${escapeHTML(m.code + " " + m.name)}</option>`;
  }

  const title = isEditing ? "Edit assignment" : "New assignment";
  const buttonText = isEditing ? "Save" : "Create";

  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal">
        <h3>${title}</h3>
        <div id="errorSlot"></div>

        <div class="form-row">
          <label class="label" for="fName">Assignment name</label>
          <input id="fName" class="input" type="text" value="${escapeHTML(name)}">
        </div>

        <div class="form-row">
          <label class="label" for="fModule">Module</label>
          <select id="fModule" class="select">${moduleOptions}</select>
        </div>

        <div class="form-row form-row-grid">
          <div>
            <label class="label" for="fDateSet">Date set</label>
            <input id="fDateSet" class="input" type="date" value="${dateSet}">
          </div>
          <div>
            <label class="label" for="fDueDate">Due date</label>
            <input id="fDueDate" class="input" type="date" value="${dueDate}">
          </div>
        </div>

        <div class="modal-foot">
          <button class="btn btn-secondary" id="cancelBtn">Cancel</button>
          <button class="btn btn-primary" id="saveBtn">${buttonText}</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("cancelBtn").onclick = closeModal;
  document.getElementById("modalOverlay").onclick = (e) => {
    if (e.target.id === "modalOverlay") closeModal();
  };
  document.getElementById("saveBtn").onclick = () => saveAssignment(assignment);
}

function closeModal() {
  document.getElementById("modalRoot").innerHTML = "";
}

async function saveAssignment(existing) {
  const name       = document.getElementById("fName").value.trim();
  const moduleCode = document.getElementById("fModule").value;
  const dateSet    = document.getElementById("fDateSet").value;
  const dueDate    = document.getElementById("fDueDate").value;
  const errorSlot  = document.getElementById("errorSlot");
  const saveBtn    = document.getElementById("saveBtn");

  if (!name || !moduleCode || !dateSet || !dueDate) {
    errorSlot.innerHTML = `<div class="error-msg">Please fill in all fields.</div>`;
    return;
  }
  if (new Date(dueDate) < new Date(dateSet)) {
    errorSlot.innerHTML = `<div class="error-msg">Due date can't be before the date set.</div>`;
    return;
  }

  saveBtn.disabled = true;
  try {
    if (existing) {
      await api("PUT", "/api/assignments/" + existing.id, {
        name, module_code: moduleCode, date_set: dateSet, due_date: dueDate
      });
    } else {
      await api("POST", "/api/assignments", {
        name,
        module_code: moduleCode,
        date_set: dateSet,
        due_date: dueDate,
        created_by_id: currentUser.staff_id,
      });
    }
    closeModal();
    await refreshAssignments();
  } catch (err) {
    errorSlot.innerHTML = `<div class="error-msg">Save failed: ${escapeHTML(err.message)}</div>`;
    saveBtn.disabled = false;
  }
}


// ============= DELETE MODAL =============
function openDeleteModal(assignment) {
  const moduleLabel = assignment.module_code + " " + moduleNameFromCode(assignment.module_code);

  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal modal-small">
        <h3>Delete this assignment?</h3>
        <p style="color:var(--text-muted); margin-bottom:20px;">
          "${escapeHTML(assignment.name)}" will be removed for everyone in ${escapeHTML(moduleLabel)}.
          This can't be undone.
        </p>
        <div id="errorSlot"></div>
        <div class="modal-foot">
          <button class="btn btn-secondary" id="cancelBtn">Cancel</button>
          <button class="btn btn-danger" id="confirmBtn">Delete</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("cancelBtn").onclick = closeModal;
  document.getElementById("modalOverlay").onclick = (e) => {
    if (e.target.id === "modalOverlay") closeModal();
  };
  document.getElementById("confirmBtn").onclick = async () => {
    const btn = document.getElementById("confirmBtn");
    btn.disabled = true;
    try {
      await api("DELETE", "/api/assignments/" + assignment.id);
      closeModal();
      await refreshAssignments();
    } catch (err) {
      document.getElementById("errorSlot").innerHTML =
        `<div class="error-msg">Delete failed: ${escapeHTML(err.message)}</div>`;
      btn.disabled = false;
    }
  };
}


// ============= POSTING ANNOUNCEMENTS =============
async function postAnnouncement() {
  const titleInput = document.getElementById("annTitle");
  const bodyInput  = document.getElementById("annBody");
  const button     = document.getElementById("postAnnBtn");

  const title = titleInput.value.trim();
  const body  = bodyInput.value.trim();
  if (!title || !body) return;

  button.disabled = true;
  try {
    await api("POST", "/api/announcements", {
      module_code: currentUser.primary_module,
      author_id:   currentUser.staff_id,
      title, body,
    });
    titleInput.value = "";
    bodyInput.value  = "";
    await refreshAnnouncements();
  } catch (err) {
    alert("Could not post: " + err.message);
  } finally {
    updatePostButton();
  }
}

function updatePostButton() {
  const title = document.getElementById("annTitle").value.trim();
  const body  = document.getElementById("annBody").value.trim();
  document.getElementById("postAnnBtn").disabled = (title === "" || body === "");
}


// ============= EVENT WIRING =============
function setUpButtons() {
  document.getElementById("addAssignmentBtn").onclick = () => openAssignmentModal(null);

  document.getElementById("assignmentsBody").onclick = (event) => {
    const button = event.target;
    if (button.tagName !== "BUTTON") return;

    const action = button.getAttribute("data-action");
    const id = parseInt(button.getAttribute("data-id"));

    let target = null;
    for (let i = 0; i < assignments.length; i++) {
      if (assignments[i].id === id) { target = assignments[i]; break; }
    }
    if (!target) return;

    if (action === "edit")        openAssignmentModal(target);
    else if (action === "delete") openDeleteModal(target);
  };

  document.getElementById("searchInput").oninput = (e) => {
    searchQuery = e.target.value;
    showAssignments();
  };
  document.getElementById("moduleFilter").onchange = (e) => {
    filterModule = e.target.value;
    showAssignments();
  };

  document.getElementById("annTitle").oninput = updatePostButton;
  document.getElementById("annBody").oninput  = updatePostButton;
  document.getElementById("postAnnBtn").onclick = postAnnouncement;
}


// ============= GO =============
loadData();