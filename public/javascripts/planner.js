function openSemesterModal() {
  document.getElementById('semester-modal').style.display = 'flex';
}

function closeSemesterModal() {
  document.getElementById('semester-modal').style.display = 'none';
}

function selectSemester(sem) {
  document.getElementById('current-semester').textContent = sem;
  closeSemesterModal();
}

var currentCell = null;

function openCellEditor(cell) {
  currentCell = cell;
  document.getElementById('cell-time').value = cell.dataset.time || '';
  document.getElementById('cell-desc').value = cell.dataset.task || '';
  document.getElementById('cell-modal').style.display = 'flex';
}

function closeCellModal() {
  currentCell = null;
  document.getElementById('cell-modal').style.display = 'none';
}

function saveCellTask() {
  if (!currentCell) return;
  var time = document.getElementById('cell-time').value;
  var desc = document.getElementById('cell-desc').value;
  currentCell.dataset.time = time;
  currentCell.dataset.task = desc;
  var html = '';
  if (time) html += '<span class="cell-time">' + time + '</span>';
  if (desc) html += '<span class="cell-desc">' + desc + '</span>';
  currentCell.innerHTML = html;
  closeCellModal();
}

document.addEventListener('click', function(e) {
  var semModal = document.getElementById('semester-modal');
  var cellModal = document.getElementById('cell-modal');
  if (e.target === semModal) closeSemesterModal();
  if (e.target === cellModal) closeCellModal();
});
