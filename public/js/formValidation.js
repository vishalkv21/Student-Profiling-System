function toggleCategoryFields() {
  const category = document.getElementById('studentCategory').value;
  const hostelField = document.getElementById('hostelField');
  const distanceField = document.getElementById('distanceField');

  if (category === 'Hosteller') {
    hostelField.classList.remove('d-none');
    distanceField.classList.add('d-none');
  } else {
    hostelField.classList.add('d-none');
    distanceField.classList.remove('d-none');
  }
}

function toggleCareerGoalFields() {
  const goal = document.getElementById('careerGoal').value;

  document.getElementById('placementFields').classList.toggle(
    'd-none', goal !== 'Placement'
  );
  document.getElementById('higherFields').classList.toggle(
    'd-none', goal !== 'Higher Studies'
  );
  document.getElementById('entrepreneurshipFields').classList.toggle(
    'd-none', goal !== 'Entrepreneurship'
  );
}

function semesterTemplate(sem = {}) {
  return `
    <div class="dynamic-row semester-row">
      <div class="row g-2">
        <div class="col-md-2">
          <label class="form-label">Semester</label>
          <input type="number" min="1" max="8" class="form-control sem-number"
            value="${sem.semesterNumber ?? ''}" required>
        </div>
        <div class="col-md-2">
          <label class="form-label">SGPA</label>
          <input type="number" min="0" max="10" step="0.01" class="form-control sem-sgpa"
            value="${sem.sgpa ?? ''}" required>
        </div>
        <div class="col-md-2">
          <label class="form-label">Cumulative CGPA</label>
          <input type="number" min="0" max="10" step="0.01" class="form-control sem-cgpa"
            value="${sem.cumulativeCgpa ?? ''}" required>
        </div>
        <div class="col-md-2">
          <label class="form-label">Attendance %</label>
          <input type="number" min="0" max="100" step="0.01" class="form-control sem-attendance"
            value="${sem.attendancePercentage ?? ''}" required>
        </div>
        <div class="col-md-2">
          <label class="form-label">Arrear Status</label>
          <select class="form-select sem-arrear-status">
            <option value="No" ${sem.arrearStatus === 'No' ? 'selected' : ''}>No</option>
            <option value="Yes" ${sem.arrearStatus === 'Yes' ? 'selected' : ''}>Yes</option>
          </select>
        </div>
        <div class="col-md-2">
          <label class="form-label">No. of Arrears</label>
          <input type="number" min="0" class="form-control sem-arrear-count"
            value="${sem.numberOfArrears ?? 0}">
        </div>
        <div class="col-md-5">
          <label class="form-label">Academic Achievements</label>
          <textarea class="form-control sem-achievements">${sem.academicAchievements || ''}</textarea>
        </div>
        <div class="col-md-5">
          <label class="form-label">Subjects Performed Well</label>
          <input class="form-control sem-good-subjects"
            value="${(sem.wellPerformedSubjects || []).join(', ')}">
        </div>
        <div class="col-md-2 d-flex align-items-end">
          <button type="button" class="btn btn-outline-danger w-100 remove-semester">Remove</button>
        </div>
      </div>
    </div>
  `;
}

function arrearTemplate(arr = {}) {
  return `
    <div class="dynamic-row arrear-row">
      <div class="row g-2">
        <div class="col-md-2">
          <label class="form-label">Semester Occurred</label>
          <input type="number" min="1" max="8" class="form-control arr-sem"
            value="${arr.semesterOccurred ?? ''}" required>
        </div>
        <div class="col-md-2">
          <label class="form-label">Subject Code</label>
          <input class="form-control arr-code" value="${arr.subjectCode || ''}" required>
        </div>
        <div class="col-md-3">
          <label class="form-label">Subject Name</label>
          <input class="form-control arr-name" value="${arr.subjectName || ''}" required>
        </div>
        <div class="col-md-1">
          <label class="form-label">Attempts</label>
          <input type="number" min="1" class="form-control arr-attempts"
            value="${arr.attempts ?? 1}">
        </div>
        <div class="col-md-2">
          <label class="form-label">Status</label>
          <select class="form-select arr-status">
            <option value="Pending" ${arr.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Cleared" ${arr.status === 'Cleared' ? 'selected' : ''}>Cleared</option>
          </select>
        </div>
        <div class="col-md-2">
          <label class="form-label">Semester Cleared</label>
          <input type="number" min="1" max="8" class="form-control arr-cleared-sem"
            value="${arr.semesterCleared ?? ''}">
        </div>
        <div class="col-md-2">
          <label class="form-label">Grade After Clearing</label>
          <input class="form-control arr-grade" value="${arr.gradeAfterClearing || ''}">
        </div>
        <div class="col-md-5">
          <label class="form-label">Reason for Difficulty</label>
          <textarea class="form-control arr-reason">${arr.difficultyReason || ''}</textarea>
        </div>
        <div class="col-md-3">
          <label class="form-label">Remedial / Mentor Support</label>
          <div class="form-check mt-2">
            <input class="form-check-input arr-remedial" type="checkbox"
              ${arr.remedialSupportRequired ? 'checked' : ''}>
            <label class="form-check-label">Required</label>
          </div>
        </div>
        <div class="col-md-2 d-flex align-items-end">
          <button type="button" class="btn btn-outline-danger w-100 remove-arrear">Remove</button>
        </div>
      </div>
    </div>
  `;
}

function projectTemplate(project = {}) {
  return `
    <div class="input-group mb-2 project-row">
      <input class="form-control project-title" placeholder="Project title"
        value="${project.title || ''}">
      <input class="form-control project-github" placeholder="GitHub link"
        value="${project.githubLink || ''}">
      <button type="button" class="btn btn-outline-danger remove-project">Remove</button>
    </div>
  `;
}

function hackathonTemplate(value = '') {
  return `
    <div class="input-group mb-2 hackathon-row">
      <input class="form-control hackathon-name" placeholder="Hackathon / coding contest"
        value="${value}">
      <button type="button" class="btn btn-outline-danger remove-hackathon">Remove</button>
    </div>
  `;
}

function addSemesterEntry(sem = {}) {
  document.getElementById('semestersContainer')
    .insertAdjacentHTML('beforeend', semesterTemplate(sem));
}

function addArrearEntry(arr = {}) {
  document.getElementById('arrearsContainer')
    .insertAdjacentHTML('beforeend', arrearTemplate(arr));
}

function addProjectEntry(project = {}) {
  document.getElementById('projectsContainer')
    .insertAdjacentHTML('beforeend', projectTemplate(project));
}

function addHackathonEntry(value = '') {
  document.getElementById('hackathonsContainer')
    .insertAdjacentHTML('beforeend', hackathonTemplate(value));
}
