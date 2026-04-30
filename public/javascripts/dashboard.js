let selectedTaskId = null;

const tasks = [
  {
    id: 1,
    title: 'Task 1',
    module: 'Module 1',
    dueDate: '2026-05-10',
    milestones: [
      { name: 'Milestone 1', startWeek: 1, endWeek: 2, done: true },
      { name: 'Milestone 2', startWeek: 3, endWeek: 4, done: true }
    ]
  },
  {
    id: 2,
    title: 'Task 1',
    module: 'Module 3',
    dueDate: '2026-05-12',
    milestones: [
      { name: 'Research', startWeek: 1, endWeek: 2, done: true },
      { name: 'Prototype', startWeek: 3, endWeek: 4, done: false }
    ]
  }
];

const completedTasks = document.getElementById('completedTasks');
const upcomingTasks = document.getElementById('upcomingTasks');
const passedTasks = document.getElementById('passedTasks');

const taskPopup = document.getElementById('taskPopup');
const closePopupButton = document.getElementById('closePopupButton');
const taskTitleInput = document.getElementById('taskTitleInput');
const moduleNameInput = document.getElementById('moduleNameInput');
const taskDueDate = document.getElementById('taskDueDate');
const ganttRows = document.getElementById('ganttRows');
const milestoneForm = document.getElementById('milestoneForm');
const addTaskButton = document.getElementById('addTaskButton');
const deleteTaskButton = document.getElementById('deleteTaskButton');

displayTasks();

closePopupButton.addEventListener('click', function () {
  taskPopup.classList.add('hidden');
});

addTaskButton.addEventListener('click', function () {
  const newTask = {
    id: Date.now(),
    title: 'New Task',
    module: 'New Module',
    dueDate: '2026-05-10',
    milestones: []
  };

  tasks.push(newTask);
  displayTasks();
});

taskTitleInput.addEventListener('input', function () {
  const task = findSelectedTask();

  if (task) {
    task.title = taskTitleInput.value;
    displayTasks();
  }
});

moduleNameInput.addEventListener('input', function () {
  const task = findSelectedTask();

  if (task) {
    task.module = moduleNameInput.value;
    displayTasks();
  }
});

taskDueDate.addEventListener('change', function () {
  const task = findSelectedTask();

  if (task) {
    task.dueDate = taskDueDate.value;
    displayTasks();
  }
});

deleteTaskButton.addEventListener('click', function () {
  const index = tasks.findIndex(function (task) {
    return task.id === selectedTaskId;
  });

  if (index !== -1) {
    tasks.splice(index, 1);
  }

  taskPopup.classList.add('hidden');
  displayTasks();
});

milestoneForm.addEventListener('submit', function (event) {
  event.preventDefault();

  const task = findSelectedTask();

  if (!task) {
    return;
  }

  const milestoneName = document.getElementById('milestoneName').value;
  const startWeek = Number(document.getElementById('startWeek').value);
  const endWeek = Number(document.getElementById('endWeek').value);

  if (milestoneName === '') {
    alert('Please enter a milestone name.');
    return;
  }

  if (endWeek < startWeek) {
    alert('End week must be after start week.');
    return;
  }

  task.milestones.push({
    name: milestoneName,
    startWeek: startWeek,
    endWeek: endWeek,
    done: false
  });

  document.getElementById('milestoneName').value = '';
  document.getElementById('startWeek').value = 1;
  document.getElementById('endWeek').value = 1;

  displayGanttChart(task);
  displayTasks();
});

function displayTasks() {
  completedTasks.innerHTML = '';
  upcomingTasks.innerHTML = '';
  passedTasks.innerHTML = '';

  tasks.forEach(function (task) {
    const progress = calculateProgress(task);
    const status = getTaskStatus(task);

    const card = document.createElement('div');
    card.className = 'task-card';

    card.innerHTML = `
      <h3>${task.title}</h3>
      <p>${task.module}</p>
      <p>Progress: ${progress}%</p>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progress}%"></div>
      </div>
      <p>Due Date: ${task.dueDate}</p>
    `;

    card.addEventListener('click', function () {
      openTaskPopup(task.id);
    });

    if (status === 'completed') {
      completedTasks.appendChild(card);
    } else if (status === 'passed') {
      passedTasks.appendChild(card);
    } else {
      upcomingTasks.appendChild(card);
    }
  });
}

function openTaskPopup(taskId) {
  selectedTaskId = taskId;

  const task = findSelectedTask();

  taskTitleInput.value = task.title;
  moduleNameInput.value = task.module;
  taskDueDate.value = task.dueDate;

  displayGanttChart(task);
  taskPopup.classList.remove('hidden');
}

function displayGanttChart(task) {
  ganttRows.innerHTML = '';

  task.milestones.forEach(function (milestone, index) {
    const row = document.createElement('div');
    row.className = 'gantt-row';

    const nameCell = document.createElement('span');
    nameCell.textContent = milestone.name;
    row.appendChild(nameCell);

    for (let week = 1; week <= 5; week++) {
      const cell = document.createElement('span');

      if (week >= milestone.startWeek && week <= milestone.endWeek) {
        cell.className = 'gantt-block';
      }

      row.appendChild(cell);
    }

    const doneCell = document.createElement('span');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = milestone.done;

    checkbox.addEventListener('change', function () {
      milestone.done = checkbox.checked;
      displayTasks();
    });

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'small-button';

    deleteButton.addEventListener('click', function () {
      task.milestones.splice(index, 1);
      displayGanttChart(task);
      displayTasks();
    });

    doneCell.appendChild(checkbox);
    doneCell.appendChild(deleteButton);
    row.appendChild(doneCell);

    ganttRows.appendChild(row);
  });
}

function calculateProgress(task) {
  if (task.milestones.length === 0) {
    return 0;
  }

  let completed = 0;

  task.milestones.forEach(function (milestone) {
    if (milestone.done) {
      completed++;
    }
  });

  return Math.round((completed / task.milestones.length) * 100);
}

function getTaskStatus(task) {
  const progress = calculateProgress(task);
  const today = new Date();
  const dueDate = new Date(task.dueDate);

  if (progress === 100) {
    return 'completed';
  }

  if (dueDate < today) {
    return 'passed';
  }

  return 'upcoming';
}

function findSelectedTask() {
  return tasks.find(function (task) {
    return task.id === selectedTaskId;
  });
}