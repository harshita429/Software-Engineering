// We store the loaded data here so other functions can use it
let currentUser = null;
let assignments = [];
let announcements = [];

// These keep track of what the user has typed/selected in the filters
let searchQuery = "";
let filterModule = "All";


// ============= LOAD DATA WHEN PAGE OPENS =============
// This function runs when the page is ready
function loadData() {
  fetch("data.json")
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Could not load data.json");
      }
      return response.json();
    })
    .then(function (data) {
      // Save the data into our global variables
      currentUser = data.currentUser;
      assignments = data.assignments;
      announcements = data.announcements;

      // Hide the loading screen, show the main app
      document.getElementById("loadingScreen").classList.add("hidden");
      document.getElementById("appScreen").classList.remove("hidden");

      // Now draw everything on the screen
      showHeader();
      showModuleFilter();
      showAssignments();
      showAnnouncements();
      setUpButtons();
    })
    .catch(function (error) {
      // If something went wrong, show the error screen
      console.log("Error loading data:", error);
      document.getElementById("loadingScreen").classList.add("hidden");
      document.getElementById("errorScreen").classList.remove("hidden");
    });
}


// ============= HELPER FUNCTIONS =============

// Pads a number with a leading zero if needed (e.g. 5 -> "05")
function padNumber(num) {
  if (num < 10) {
    return "0" + num;
  }
  return String(num);
}

// Turns a Date object into "DD/MM/YYYY"
function formatDate(date) {
  const day = padNumber(date.getDate());
  const month = padNumber(date.getMonth() + 1);
  const year = date.getFullYear();
  return day + "/" + month + "/" + year;
}

// Turns "2026-03-02" into something nicer like "02 Mar 2026"
function formatNiceDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

// Turns a timestamp into a relative time, e.g. "2h ago", "3d ago"
function timeAgo(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const hoursAgo = (now - date) / (1000 * 60 * 60);

  if (hoursAgo < 1) {
    return "just now";
  }
  if (hoursAgo < 24) {
    return Math.floor(hoursAgo) + "h ago";
  }
  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo < 7) {
    return daysAgo + "d ago";
  }
  // Older than a week, just show the date
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

// Works out how many days from today until a date
// Returns a negative number if the date has passed
function daysUntil(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const msInADay = 1000 * 60 * 60 * 24;
  return Math.ceil((date - now) / msInADay);
}

// Replaces dangerous characters in user input so it can't break our HTML
// (basic protection against XSS attacks)
function escapeHTML(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Picks the right pill class based on how close the due date is
function getPillClass(daysLeft) {
  if (daysLeft < 0) {
    return "pill-overdue";
  }
  if (daysLeft <= 7) {
    return "pill-soon";
  }
  return "pill-ok";
}

// Picks the right pill text
function getPillText(daysLeft) {
  if (daysLeft < 0) {
    return Math.abs(daysLeft) + "d overdue";
  }
  if (daysLeft === 0) {
    return "due today";
  }
  return daysLeft + "d left";
}


// ============= DRAW THE HEADER =============
function showHeader() {
  const now = new Date();
  const hour = now.getHours();

  // Pick a greeting based on time of day
  let greeting = "Good Evening";
  if (hour < 12) {
    greeting = "Good Morning";
  } else if (hour < 18) {
    greeting = "Good Afternoon";
  }

  document.getElementById("greeting").textContent = greeting + ".";
  document.getElementById("userName").textContent = currentUser.name;
  document.getElementById("userRole").textContent = currentUser.role;
  document.getElementById("composerAuthor").textContent = currentUser.name;
  document.getElementById("dateMain").textContent = formatDate(now);

  // Day of the week, e.g. "Monday"
  const dayName = now.toLocaleDateString("en-GB", { weekday: "long" });
  document.getElementById("dateSub").textContent = dayName;
}


// ============= DRAW THE MODULE FILTER DROPDOWN =============
function showModuleFilter() {
  const select = document.getElementById("moduleFilter");

  // Build a list of unique modules from the assignments
  const modules = ["All"];
  for (let i = 0; i < assignments.length; i++) {
    const moduleName = assignments[i].module;
    if (modules.indexOf(moduleName) === -1) {
      modules.push(moduleName);
    }
  }

  // Build the HTML for the dropdown options
  let html = "";
  for (let i = 0; i < modules.length; i++) {
    const moduleName = modules[i];
    let selected = "";
    if (moduleName === filterModule) {
      selected = "selected";
    }
    html += `<option value="${escapeHTML(moduleName)}" ${selected}>${escapeHTML(moduleName)}</option>`;
  }
  select.innerHTML = html;
}


// ============= DRAW THE ASSIGNMENTS TABLE =============
function showAssignments() {
  // First, filter the assignments based on search and module dropdown
  const filtered = [];
  for (let i = 0; i < assignments.length; i++) {
    const a = assignments[i];

    // Check if it matches the module filter
    const matchesModule = filterModule === "All" || a.module === filterModule;

    // Check if it matches the search box
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      query === "" ||
      a.name.toLowerCase().includes(query) ||
      a.createdBy.name.toLowerCase().includes(query) ||
      a.createdBy.id.toLowerCase().includes(query);

    if (matchesModule && matchesSearch) {
      filtered.push(a);
    }
  }

  // Update the count text above the table
  const countText = filtered.length + " of " + assignments.length + " assignments";
  document.getElementById("assignmentCount").textContent = countText;

  // Get the tbody where rows go
  const tbody = document.getElementById("assignmentsBody");

  // If nothing matches, show an empty message
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">No assignments match your filters.</td></tr>`;
    return;
  }

  // Otherwise, build a row for each assignment
  let html = "";
  for (let i = 0; i < filtered.length; i++) {
    const a = filtered[i];
    const days = daysUntil(a.dueDate);
    const pillClass = getPillClass(days);
    const pillText = getPillText(days);

    html += `
      <tr>
        <td class="cell-name">${escapeHTML(a.name)}</td>
        <td class="cell-muted">${escapeHTML(a.module)}</td>
        <td>
          <div>${escapeHTML(a.createdBy.name)}</div>
          <div class="cell-id">${escapeHTML(a.createdBy.id)}</div>
        </td>
        <td class="cell-muted">${formatNiceDate(a.dateSet)}</td>
        <td>
          <div class="cell-name">${formatNiceDate(a.dueDate)}</div>
          <span class="pill ${pillClass}">${pillText}</span>
        </td>
        <td>
          <div class="cell-actions">
            <button class="btn-icon" data-action="edit" data-id="${a.id}">Edit</button>
            <button class="btn-icon danger" data-action="delete" data-id="${a.id}">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }
  tbody.innerHTML = html;
}


// ============= DRAW THE ANNOUNCEMENTS LIST =============
function showAnnouncements() {
  document.getElementById("annCount").textContent = announcements.length;
  const feed = document.getElementById("feed");

  if (announcements.length === 0) {
    feed.innerHTML = `<p class="empty-row">No announcements yet.</p>`;
    return;
  }

  let html = "";
  for (let i = 0; i < announcements.length; i++) {
    const ann = announcements[i];
    html += `
      <div class="announcement">
        <div class="ann-head">
          <div class="ann-title">${escapeHTML(ann.title)}</div>
          <div class="ann-time">${timeAgo(ann.timestamp)}</div>
        </div>
        <div class="ann-meta">${escapeHTML(ann.author)} · ${escapeHTML(ann.module)}</div>
        <div class="ann-body">${escapeHTML(ann.body)}</div>
      </div>
    `;
  }
  feed.innerHTML = html;
}


// ============= MODAL FOR ADDING / EDITING ASSIGNMENTS =============
function openAssignmentModal(assignment) {
  // If we got an assignment, we're editing; otherwise we're creating new
  const isEditing = assignment !== null;

  // Use existing values if editing, or blank/today if creating new
  let name = "";
  let module = "";
  let dateSet = new Date().toISOString().split("T")[0]; // today in YYYY-MM-DD
  let dueDate = "";

  if (isEditing) {
    name = assignment.name;
    module = assignment.module;
    dateSet = assignment.dateSet;
    dueDate = assignment.dueDate;
  }

  // Build the modal HTML
  const title = isEditing ? "Edit assignment" : "New assignment";
  const buttonText = isEditing ? "Save" : "Create";

  const modalRoot = document.getElementById("modalRoot");
  modalRoot.innerHTML = `
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
          <input id="fModule" class="input" type="text" value="${escapeHTML(module)}">
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

  // Hook up the buttons
  document.getElementById("cancelBtn").onclick = closeModal;

  // Click outside the modal box to close it
  document.getElementById("modalOverlay").onclick = function (event) {
    if (event.target.id === "modalOverlay") {
      closeModal();
    }
  };

  document.getElementById("saveBtn").onclick = function () {
    saveAssignment(assignment);
  };
}

// Closes whatever modal is open
function closeModal() {
  document.getElementById("modalRoot").innerHTML = "";
}

// Called when the user clicks Save in the assignment modal
function saveAssignment(existingAssignment) {
  // Read the values from the form
  const name = document.getElementById("fName").value.trim();
  const module = document.getElementById("fModule").value.trim();
  const dateSet = document.getElementById("fDateSet").value;
  const dueDate = document.getElementById("fDueDate").value;
  const errorSlot = document.getElementById("errorSlot");

  // Validate the form
  if (name === "" || module === "" || dueDate === "") {
    errorSlot.innerHTML = `<div class="error-msg">Please fill in all fields.</div>`;
    return;
  }
  if (new Date(dueDate) < new Date(dateSet)) {
    errorSlot.innerHTML = `<div class="error-msg">Due date can't be before the date set.</div>`;
    return;
  }

  if (existingAssignment) {
    // Update existing assignment
    existingAssignment.name = name;
    existingAssignment.module = module;
    existingAssignment.dateSet = dateSet;
    existingAssignment.dueDate = dueDate;
  } else {
    // Create new assignment with a new ID
    let newId = 1;
    for (let i = 0; i < assignments.length; i++) {
      if (assignments[i].id >= newId) {
        newId = assignments[i].id + 1;
      }
    }

    assignments.push({
      id: newId,
      name: name,
      module: module,
      dateSet: dateSet,
      dueDate: dueDate,
      createdBy: {
        name: currentUser.name,
        id: currentUser.id
      }
    });
  }

  // Close the modal and redraw the page
  closeModal();
  showModuleFilter();
  showAssignments();
}


// ============= MODAL FOR DELETING AN ASSIGNMENT =============
function openDeleteModal(assignment) {
  const modalRoot = document.getElementById("modalRoot");
  modalRoot.innerHTML = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal modal-small">
        <h3>Delete this assignment?</h3>
        <p style="color:var(--text-muted); margin-bottom:20px;">
          "${escapeHTML(assignment.name)}" will be removed for everyone in ${escapeHTML(assignment.module)}.
          This can't be undone.
        </p>
        <div class="modal-foot">
          <button class="btn btn-secondary" id="cancelBtn">Cancel</button>
          <button class="btn btn-danger" id="confirmBtn">Delete</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("cancelBtn").onclick = closeModal;

  document.getElementById("modalOverlay").onclick = function (event) {
    if (event.target.id === "modalOverlay") {
      closeModal();
    }
  };

  document.getElementById("confirmBtn").onclick = function () {
    // Remove the assignment from the list
    const newList = [];
    for (let i = 0; i < assignments.length; i++) {
      if (assignments[i].id !== assignment.id) {
        newList.push(assignments[i]);
      }
    }
    assignments = newList;

    closeModal();
    showModuleFilter();
    showAssignments();
  };
}


// ============= POSTING ANNOUNCEMENTS =============
function postAnnouncement() {
  const titleInput = document.getElementById("annTitle");
  const bodyInput = document.getElementById("annBody");

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  if (title === "" || body === "") {
    return;
  }

  // Work out a new ID
  let newId = 1;
  for (let i = 0; i < announcements.length; i++) {
    if (announcements[i].id >= newId) {
      newId = announcements[i].id + 1;
    }
  }

  // Add the new announcement at the start of the list
  announcements.unshift({
    id: newId,
    author: currentUser.name,
    module: currentUser.primaryModule,
    title: title,
    body: body,
    timestamp: new Date().toISOString()
  });

  // Clear the form and redraw
  titleInput.value = "";
  bodyInput.value = "";
  updatePostButton();
  showAnnouncements();
}

// Enables/disables the Post button based on whether the form is filled
function updatePostButton() {
  const title = document.getElementById("annTitle").value.trim();
  const body = document.getElementById("annBody").value.trim();
  const button = document.getElementById("postAnnBtn");

  if (title === "" || body === "") {
    button.disabled = true;
  } else {
    button.disabled = false;
  }
}


// ============= SET UP ALL THE BUTTONS AND INPUTS =============
function setUpButtons() {

  // The orange + button to add a new assignment
  document.getElementById("addAssignmentBtn").onclick = function () {
    openAssignmentModal(null);
  };

  // The Edit/Delete buttons in the table.
  // We can't add an onclick to each one because rows are added dynamically,
  // so instead we listen on the whole tbody and check what was clicked.
  document.getElementById("assignmentsBody").onclick = function (event) {
    const button = event.target;

    // Make sure the user actually clicked a button (not the row itself)
    if (button.tagName !== "BUTTON") {
      return;
    }

    const action = button.getAttribute("data-action");
    const id = parseInt(button.getAttribute("data-id"));

    // Find the matching assignment
    let assignment = null;
    for (let i = 0; i < assignments.length; i++) {
      if (assignments[i].id === id) {
        assignment = assignments[i];
        break;
      }
    }
    if (assignment === null) {
      return;
    }

    if (action === "edit") {
      openAssignmentModal(assignment);
    } else if (action === "delete") {
      openDeleteModal(assignment);
    }
  };

  // Search box - redraw the table whenever the user types
  document.getElementById("searchInput").oninput = function (event) {
    searchQuery = event.target.value;
    showAssignments();
  };

  // Module dropdown - redraw the table when changed
  document.getElementById("moduleFilter").onchange = function (event) {
    filterModule = event.target.value;
    showAssignments();
  };

  // Announcement form - update the Post button as the user types
  document.getElementById("annTitle").oninput = updatePostButton;
  document.getElementById("annBody").oninput = updatePostButton;

  // Post button
  document.getElementById("postAnnBtn").onclick = postAnnouncement;
}


// ============= START EVERYTHING =============
loadData();
