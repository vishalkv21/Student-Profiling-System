let editingStudentId = null;
let studentModal;

const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', async () => {
  studentModal = new bootstrap.Modal($('studentModal'));

  $('loginForm').addEventListener('submit', login);
  $('logoutBtn').addEventListener('click', logout);

  $('navDashboard').addEventListener('click', e => {
    e.preventDefault();
    showSection('dashboard');
  });

  $('navStudents').addEventListener('click', e => {
    e.preventDefault();
    showSection('students');
  });

  $('navAdd').addEventListener('click', e => {
    e.preventDefault();
    openCreateForm();
  });

  $('addStudentFromDirectory').addEventListener('click', openCreateForm);
  $('cancelForm').addEventListener('click', () => showSection('students'));
  $('cancelFormBottom').addEventListener('click', () => showSection('students'));
  $('refreshDashboard').addEventListener('click', loadInsights);

  $('studentCategory').addEventListener('change', toggleCategoryFields);
  $('careerGoal').addEventListener('change', toggleCareerGoalFields);

  $('addSemesterBtn').addEventListener('click', () => addSemesterEntry());
  $('addArrearBtn').addEventListener('click', () => addArrearEntry());
  $('addProjectBtn').addEventListener('click', () => addProjectEntry());
  $('addHackathonBtn').addEventListener('click', () => addHackathonEntry());

  $('semestersContainer').addEventListener('click', e => {
    if (e.target.classList.contains('remove-semester')) {
      e.target.closest('.semester-row').remove();
    }
  });

  $('arrearsContainer').addEventListener('click', e => {
    if (e.target.classList.contains('remove-arrear')) {
      e.target.closest('.arrear-row').remove();
    }
  });

  $('projectsContainer').addEventListener('click', e => {
    if (e.target.classList.contains('remove-project')) {
      e.target.closest('.project-row').remove();
    }
  });

  $('hackathonsContainer').addEventListener('click', e => {
    if (e.target.classList.contains('remove-hackathon')) {
      e.target.closest('.hackathon-row').remove();
    }
  });

  $('studentForm').addEventListener('submit', handleProfileSubmit);
  $('applyFilters').addEventListener('click', loadStudents);
  $('clearFilters').addEventListener('click', clearFilters);

  const authenticated = await checkAuth();
  if (!authenticated) {
    $('loginScreen').classList.remove('d-none');
    $('appScreen').classList.add('d-none');
  }
});

async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return false;

    const data = await res.json();
    showApp(data.username);
    return true;
  } catch {
    return false;
  }
}

async function login(e) {
  e.preventDefault();

  const alertBox = $('loginAlert');
  alertBox.classList.add('d-none');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: $('loginUsername').value.trim(),
        password: $('loginPassword').value
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Login failed.');
    }

    $('loginForm').reset();
    showApp(data.username);
  } catch (err) {
    alertBox.textContent = err.message;
    alertBox.classList.remove('d-none');
  }
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  location.reload();
}

function showApp(username) {
  $('loginScreen').classList.add('d-none');
  $('appScreen').classList.remove('d-none');
  $('loggedInUser').textContent = `Faculty: ${username}`;
  showSection('dashboard');
}

function showSection(section) {
  $('dashboardSection').classList.add('d-none');
  $('studentsSection').classList.add('d-none');
  $('formSection').classList.add('d-none');

  if (section === 'dashboard') {
    $('dashboardSection').classList.remove('d-none');
    loadInsights();
  } else if (section === 'students') {
    $('studentsSection').classList.remove('d-none');
    loadStudents();
  } else {
    $('formSection').classList.remove('d-none');
  }
}

async function loadInsights() {
  try {
    const res = await fetch('/api/insights');
    if (res.status === 401) return location.reload();

    const data = await res.json();

    $('dashTotal').textContent = data.totalStudents;
    $('dashCgpa').textContent =
      `${data.averageCgpa} / ${data.highestCgpa} / ${data.lowestCgpa}`;
    $('dashArrears').textContent =
      `${data.totalPendingArrears} / ${data.totalClearedArrears}`;
    $('dashCategory').textContent =
      `${data.hostellers} / ${data.dayScholars}`;

    $('dashImproving').textContent = data.improvingStudents.length;
    $('dashDeclining').textContent = data.decliningStudents.length;
    $('dashRemedial').textContent = data.studentsNeedingRemedial.length;

    $('dashPlacement').textContent = data.placementCount;
    $('dashHigher').textContent = data.higherStudiesCount;
    $('dashEntre').textContent = data.entrepreneurshipCount;

    $('dashSemesterSgpa').innerHTML =
      data.semesterWiseAverageSgpa.length
        ? data.semesterWiseAverageSgpa.map(x =>
            `<tr><td>Semester ${x.semester}</td><td>${x.averageSgpa}</td></tr>`
          ).join('')
        : '<tr><td colspan="2">No semester data</td></tr>';

    $('dashSubjects').innerHTML =
      data.topSubjectArrears.length
        ? data.topSubjectArrears.map(x =>
            `<div class="d-flex justify-content-between border-bottom py-2">
              <span>${escapeHtml(x.subjectCode)}</span><strong>${x.count}</strong>
            </div>`
          ).join('')
        : '<span class="text-muted">No pending arrears.</span>';

    $('dashStrengths').innerHTML = renderTermBadges(data.commonStrengths);
    $('dashImprovements').innerHTML = renderTermBadges(data.commonImprovementAreas);

    $('dashSkillGaps').innerHTML = renderSkillGaps(data.careerSkillGaps);
    $('dashMentor').innerHTML = renderMentor(data.mentorIntervention);
    $('dashMissing').innerHTML = renderMissing(data.studentsMissingProfiles);

    $('dashImprovingList').innerHTML =
      renderStudentList(data.improvingStudents);
    $('dashDecliningList').innerHTML =
      renderStudentList(data.decliningStudents);

  } catch (err) {
    console.error(err);
  }
}

function renderTermBadges(items) {
  if (!items?.length) {
    return '<span class="text-muted">No data available.</span>';
  }

  return items.map(x =>
    `<span class="badge text-bg-light border me-1 mb-1">
      ${escapeHtml(x.term)} (${x.count})
    </span>`
  ).join('');
}

function renderSkillGaps(data) {
  return Object.entries(data || {}).map(([goal, items]) => `
    <div class="mb-3">
      <strong>${escapeHtml(goal)}</strong><br>
      ${renderTermBadges(items)}
    </div>
  `).join('') || '<span class="text-muted">No skill-gap data available.</span>';
}

function renderMentor(items) {
  if (!items?.length) {
    return '<span class="text-muted">No intervention records.</span>';
  }

  return items.map(x => `
    <div class="border-bottom py-2">
      <strong>${escapeHtml(x.name)}</strong>
      <span class="small-muted">(${escapeHtml(x.regNo)})</span>
      <div class="small">${escapeHtml(x.reason)}</div>
      ${x.mentorSupportExpected
        ? `<div class="small"><strong>Expected:</strong> ${escapeHtml(x.mentorSupportExpected)}</div>`
        : ''}
    </div>
  `).join('');
}

function renderMissing(items) {
  if (!items?.length) {
    return '<span class="text-success">All tracked portfolio fields are present.</span>';
  }

  return items.map(x => `
    <div class="border-bottom py-2">
      <strong>${escapeHtml(x.name)}</strong>
      <span class="small-muted">(${escapeHtml(x.regNo)})</span>
      <span class="badge badge-soft ms-2">${x.missing.join(', ')}</span>
    </div>
  `).join('');
}

function renderStudentList(items) {
  if (!items?.length) {
    return '<span class="text-muted">No students in this category.</span>';
  }

  return items.map(x => `
    <div class="border-bottom py-2">
      <strong>${escapeHtml(x.name)}</strong>
      <span class="small-muted">(${escapeHtml(x.regNo)})</span>
    </div>
  `).join('');
}

async function loadStudents() {
  const params = new URLSearchParams();

  const values = {
    search: $('filterSearch').value.trim(),
    department: $('filterDepartment').value.trim(),
    section: $('filterSection').value.trim(),
    studentCategory: $('filterCategory').value,
    careerGoal: $('filterCareer').value,
    hasArrears: $('filterArrear').value,
    minCgpa: $('filterMinCgpa').value,
    maxCgpa: $('filterMaxCgpa').value
  };

  Object.entries(values).forEach(([key, value]) => {
    if (value !== '') params.set(key, value);
  });

  try {
    const res = await fetch(`/api/students?${params.toString()}`);
    if (res.status === 401) return location.reload();

    const students = await res.json();

    $('studentTableBody').innerHTML = students.length
      ? students.map(st => {
          const pending = st.arrears.filter(a => a.status === 'Pending').length;
          return `
            <tr>
              <td>${escapeHtml(st.registerNumber)}</td>
              <td>${escapeHtml(st.studentName)}</td>
              <td>${escapeHtml(st.department)}</td>
              <td>${escapeHtml(st.section)}</td>
              <td>${escapeHtml(st.studentCategory)}</td>
              <td>${escapeHtml(st.careerGoal)}</td>
              <td>${pending}</td>
              <td class="text-nowrap">
                <button class="btn btn-sm btn-info" onclick="viewStudent('${st._id}')">View</button>
                <button class="btn btn-sm btn-warning" onclick="editStudent('${st._id}')">Edit</button>
                <button class="btn btn-sm btn-outline-dark" onclick="resetStudentLogin('${st._id}', '${escapeJs(st.studentName)}')">Reset Login</button>
                <button class="btn btn-sm btn-danger" onclick="deleteStudent('${st._id}', '${escapeJs(st.studentName)}')">Delete</button>
              </td>
            </tr>
          `;
        }).join('')
      : '<tr><td colspan="8" class="text-center text-muted">No students found.</td></tr>';

  } catch (err) {
    console.error(err);
  }
}

function clearFilters() {
  ['filterSearch', 'filterDepartment', 'filterSection',
   'filterMinCgpa', 'filterMaxCgpa'].forEach(id => $(id).value = '');

  $('filterCategory').value = '';
  $('filterCareer').value = '';
  $('filterArrear').value = '';
  loadStudents();
}

function openCreateForm() {
  editingStudentId = null;
  $('studentForm').reset();
  $('formTitle').textContent = 'Create Student Profile';

  $('semestersContainer').innerHTML = '';
  $('arrearsContainer').innerHTML = '';
  $('projectsContainer').innerHTML = '';
  $('hackathonsContainer').innerHTML = '';

  addSemesterEntry();
  toggleCategoryFields();
  toggleCareerGoalFields();

  $('formAlert').className = 'alert d-none';
  showSection('form');
}

async function editStudent(id) {
  try {
    const res = await fetch(`/api/students/${id}`);
    const student = await res.json();

    editingStudentId = id;
    populateForm(student);
    $('formTitle').textContent = `Edit Profile: ${student.studentName}`;
    $('formAlert').className = 'alert d-none';
    showSection('form');
  } catch (err) {
    alert(err.message);
  }
}

function populateForm(st) {
  const fields = [
    'registerNumber','studentName','gender','department','section',
    'institutionalEmail','personalEmail','mobileNumber',
    'residentialAddress','studentCategory','hostelName',
    'distanceFromResidence','fatherName','fatherOccupation',
    'fatherIncomeRange','fatherMobile','motherName','motherOccupation',
    'motherIncomeRange','motherMobile','guardianName','emergencyContact',
    'firstGenerationGraduate','scholarshipReceived','financialGuidanceRequired',
    'technicalSkills','preferredTechnicalDomain','areaOfInterest',
    'certifications','internshipExperience','githubProfile',
    'linkedinProfile','hackerrankProfile','hackerearthProfile',
    'communicationSkillLevel','aptitudeSkillLevel','academicStrengths',
    'technicalStrengths','communicationStrengths','leadershipAndTeamwork',
    'areasRequiringImprovement','subjectsRequiringSupport',
    'skillsToBeDeveloped','communicationAptitudeToImprove',
    'mentorSupportExpected','shortTermGoal','longTermGoal',
    'careerGoal'
  ];

  fields.forEach(id => {
    const el = $(id);
    if (!el) return;

    const key = id === 'githubProfile' ? null : id;

    const valueMap = {
      technicalSkills: (st.technicalSkills || []).join(', '),
      certifications: (st.certifications || []).join(', '),
      distanceFromResidence: st.distanceFromResidence ?? '',
      githubProfile: st.profileLinks?.github || '',
      linkedinProfile: st.profileLinks?.linkedin || '',
      hackerrankProfile: st.profileLinks?.hackerrank || '',
      hackerearthProfile: st.profileLinks?.hackerearth || ''
    };

    if (id === 'dob') return;

    el.value = Object.prototype.hasOwnProperty.call(valueMap, id)
      ? valueMap[id]
      : (key ? (st[key] ?? '') : '');
  });

  $('dob').value = st.dob ? st.dob.substring(0, 10) : '';

  $('semestersContainer').innerHTML = '';
  (st.semesters || []).forEach(addSemesterEntry);

  $('arrearsContainer').innerHTML = '';
  (st.arrears || []).forEach(addArrearEntry);

  $('projectsContainer').innerHTML = '';
  (st.projects || []).forEach(addProjectEntry);

  $('hackathonsContainer').innerHTML = '';
  (st.hackathons || []).forEach(addHackathonEntry);

  $('careerGoal').value = st.careerGoal || 'Placement';

  const p = st.placementDetails || {};
  $('placementRole').value = p.preferredJobRole || '';
  $('placementDomain').value = p.technicalDomain || '';
  $('placementCompanyType').value = p.companyType || '';
  $('placementSalary').value = p.expectedSalaryRange || '';
  $('placementLocation').value = p.preferredLocation || '';
  $('placementCompanies').value = p.targetCompanies || '';
  $('placementTrainingSupport').value = p.trainingSupportNeeded || '';

  const h = st.higherStudiesDetails || {};
  $('higherProgramme').value = h.preferredProgramme || '';
  $('higherSpecialization').value = h.specialization || '';
  $('higherCountry').value = h.preferredCountry || '';
  $('higherInstitutions').value = h.targetInstitutions || '';
  $('higherExams').value = (h.plannedExams || []).join(', ');
  $('higherAdmissionYear').value = h.expectedAdmissionYear || '';
  $('higherGuidance').value = h.guidanceRequired || '';

  const e = st.entrepreneurshipDetails || {};
  $('startupIdea').value = e.businessIdea || '';
  $('startupProblem').value = e.problemAddressed || '';
  $('startupSolution').value = e.proposedSolution || '';
  $('startupCustomers').value = e.targetCustomers || '';
  $('startupStage').value = e.currentStage || '';
  $('startupLaunchYear').value = e.expectedLaunchYear || '';
  $('startupSupport').value = e.supportNeeded || '';

  toggleCategoryFields();
  toggleCareerGoalFields();
}

function collectFormData() {
  const semesters = [...document.querySelectorAll('.semester-row')].map(row => ({
    semesterNumber: Number(row.querySelector('.sem-number').value),
    sgpa: Number(row.querySelector('.sem-sgpa').value),
    cumulativeCgpa: Number(row.querySelector('.sem-cgpa').value),
    attendancePercentage: Number(row.querySelector('.sem-attendance').value),
    arrearStatus: row.querySelector('.sem-arrear-status').value,
    numberOfArrears: Number(row.querySelector('.sem-arrear-count').value || 0),
    academicAchievements: row.querySelector('.sem-achievements').value.trim(),
    wellPerformedSubjects: row.querySelector('.sem-good-subjects').value
      .split(',')
      .map(x => x.trim())
      .filter(Boolean)
  }));

  const arrears = [...document.querySelectorAll('.arrear-row')].map(row => ({
    semesterOccurred: Number(row.querySelector('.arr-sem').value),
    subjectCode: row.querySelector('.arr-code').value.trim(),
    subjectName: row.querySelector('.arr-name').value.trim(),
    attempts: Number(row.querySelector('.arr-attempts').value || 1),
    status: row.querySelector('.arr-status').value,
    semesterCleared: row.querySelector('.arr-cleared-sem').value
      ? Number(row.querySelector('.arr-cleared-sem').value)
      : undefined,
    gradeAfterClearing: row.querySelector('.arr-grade').value.trim(),
    difficultyReason: row.querySelector('.arr-reason').value.trim(),
    remedialSupportRequired: row.querySelector('.arr-remedial').checked
  }));

  const projects = [...document.querySelectorAll('.project-row')].map(row => ({
    title: row.querySelector('.project-title').value.trim(),
    githubLink: row.querySelector('.project-github').value.trim()
  })).filter(x => x.title || x.githubLink);

  const hackathons = [...document.querySelectorAll('.hackathon-row')]
    .map(row => row.querySelector('.hackathon-name').value.trim())
    .filter(Boolean);

  const careerGoal = $('careerGoal').value;

  const payload = {
    registerNumber: $('registerNumber').value.trim(),
    studentPassword: $('studentPassword') ? $('studentPassword').value : '',
    studentName: $('studentName').value.trim(),
    dob: $('dob').value,
    gender: $('gender').value.trim(),
    department: $('department').value.trim(),
    section: $('section').value.trim(),
    institutionalEmail: $('institutionalEmail').value.trim(),
    personalEmail: $('personalEmail').value.trim(),
    mobileNumber: $('mobileNumber').value.trim(),
    residentialAddress: $('residentialAddress').value.trim(),
    studentCategory: $('studentCategory').value,
    hostelName: $('hostelName').value.trim(),
    distanceFromResidence: $('distanceFromResidence').value
      ? Number($('distanceFromResidence').value) : undefined,

    fatherName: $('fatherName').value.trim(),
    fatherOccupation: $('fatherOccupation').value.trim(),
    fatherIncomeRange: $('fatherIncomeRange').value.trim(),
    fatherMobile: $('fatherMobile').value.trim(),
    motherName: $('motherName').value.trim(),
    motherOccupation: $('motherOccupation').value.trim(),
    motherIncomeRange: $('motherIncomeRange').value.trim(),
    motherMobile: $('motherMobile').value.trim(),
    guardianName: $('guardianName').value.trim(),
    emergencyContact: $('emergencyContact').value.trim(),
    firstGenerationGraduate: $('firstGenerationGraduate').value,
    scholarshipReceived: $('scholarshipReceived').value,
    financialGuidanceRequired: $('financialGuidanceRequired').value,

    semesters,
    arrears,

    technicalSkills: $('technicalSkills').value.split(',').map(x => x.trim()).filter(Boolean),
    preferredTechnicalDomain: $('preferredTechnicalDomain').value.trim(),
    areaOfInterest: $('areaOfInterest').value.trim(),
    certifications: $('certifications').value.split(',').map(x => x.trim()).filter(Boolean),
    projects,
    hackathons,
    internshipExperience: $('internshipExperience').value.trim(),
    profileLinks: {
      github: $('githubProfile').value.trim(),
      linkedin: $('linkedinProfile').value.trim(),
      hackerrank: $('hackerrankProfile').value.trim(),
      hackerearth: $('hackerearthProfile').value.trim()
    },
    communicationSkillLevel: $('communicationSkillLevel').value,
    aptitudeSkillLevel: $('aptitudeSkillLevel').value,

    academicStrengths: $('academicStrengths').value.trim(),
    technicalStrengths: $('technicalStrengths').value.trim(),
    communicationStrengths: $('communicationStrengths').value.trim(),
    leadershipAndTeamwork: $('leadershipAndTeamwork').value.trim(),
    areasRequiringImprovement: $('areasRequiringImprovement').value.trim(),
    subjectsRequiringSupport: $('subjectsRequiringSupport').value.trim(),
    skillsToBeDeveloped: $('skillsToBeDeveloped').value.trim(),
    communicationAptitudeToImprove: $('communicationAptitudeToImprove').value.trim(),
    mentorSupportExpected: $('mentorSupportExpected').value.trim(),
    shortTermGoal: $('shortTermGoal').value.trim(),
    longTermGoal: $('longTermGoal').value.trim(),

    careerGoal,

    placementDetails: {
      preferredJobRole: $('placementRole').value.trim(),
      technicalDomain: $('placementDomain').value.trim(),
      companyType: $('placementCompanyType').value,
      expectedSalaryRange: $('placementSalary').value.trim(),
      preferredLocation: $('placementLocation').value.trim(),
      targetCompanies: $('placementCompanies').value.trim(),
      trainingSupportNeeded: $('placementTrainingSupport').value.trim()
    },

    higherStudiesDetails: {
      preferredProgramme: $('higherProgramme').value.trim(),
      specialization: $('higherSpecialization').value.trim(),
      preferredCountry: $('higherCountry').value.trim(),
      targetInstitutions: $('higherInstitutions').value.trim(),
      plannedExams: $('higherExams').value.split(',').map(x => x.trim()).filter(Boolean),
      expectedAdmissionYear: $('higherAdmissionYear').value
        ? Number($('higherAdmissionYear').value) : undefined,
      guidanceRequired: $('higherGuidance').value.trim()
    },

    entrepreneurshipDetails: {
      businessIdea: $('startupIdea').value.trim(),
      problemAddressed: $('startupProblem').value.trim(),
      proposedSolution: $('startupSolution').value.trim(),
      targetCustomers: $('startupCustomers').value.trim(),
      currentStage: $('startupStage').value,
      supportNeeded: $('startupSupport').value.trim(),
      expectedLaunchYear: $('startupLaunchYear').value
        ? Number($('startupLaunchYear').value) : undefined
    }
  };

  return payload;
}

async function handleProfileSubmit(e) {
  e.preventDefault();

  const form = $('studentForm');

  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    form.reportValidity();
    return;
  }

  const data = collectFormData();

  try {
    const method = editingStudentId ? 'PUT' : 'POST';
    const url = editingStudentId
      ? `/api/students/${editingStudentId}`
      : '/api/students';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.message || 'Failed to save profile.');
    }

    if (!editingStudentId && result.loginUsername) {
      showFormMessage(
        `Student profile created. Login username: ${result.loginUsername} | Temporary password: ${result.temporaryPassword}. Ask the student to change it after login.`,
        'success'
      );
    } else {
      showFormMessage(
        'Student profile updated successfully.',
        'success'
      );
    }

    setTimeout(() => {
      openCreateForm();
      showSection('students');
    }, 700);

  } catch (err) {
    showFormMessage(err.message, 'danger');
  }
}

function showFormMessage(message, type) {
  const box = $('formAlert');
  box.textContent = message;
  box.className = `alert alert-${type}`;
}

async function viewStudent(id) {
  try {
    const res = await fetch(`/api/students/${id}`);
    const st = await res.json();

    $('studentModalTitle').textContent =
      `${st.studentName} (${st.registerNumber})`;

    $('studentModalBody').innerHTML = `
      <h6>Personal Details</h6>
      ${detailTable([
        ['Department', st.department],
        ['Section', st.section],
        ['DOB', formatDate(st.dob)],
        ['Gender', st.gender],
        ['Institutional Email', st.institutionalEmail],
        ['Personal Email', st.personalEmail],
        ['Mobile', st.mobileNumber],
        ['Category', st.studentCategory],
        ['Hostel', st.hostelName],
        ['Residence Distance', st.distanceFromResidence],
        ['Career Goal', st.careerGoal]
      ])}

      <h6 class="mt-4">Parent & Family</h6>
      ${detailTable([
        ['Father', st.fatherName],
        ['Father Occupation', st.fatherOccupation],
        ['Father Income Range', st.fatherIncomeRange],
        ['Father Mobile', st.fatherMobile],
        ['Mother', st.motherName],
        ['Mother Occupation', st.motherOccupation],
        ['Mother Income Range', st.motherIncomeRange],
        ['Mother Mobile', st.motherMobile],
        ['Guardian', st.guardianName],
        ['Emergency Contact', st.emergencyContact],
        ['First-generation Graduate', st.firstGenerationGraduate],
        ['Scholarship', st.scholarshipReceived],
        ['Financial Guidance', st.financialGuidanceRequired]
      ])}

      <h6 class="mt-4">Semester Records</h6>
      ${semesterTable(st.semesters)}

      <h6 class="mt-4">Arrear History</h6>
      ${arrearTable(st.arrears)}

      <h6 class="mt-4">Technical & Professional Profile</h6>
      ${detailTable([
        ['Technical Skills', (st.technicalSkills || []).join(', ')],
        ['Area of Interest', st.areaOfInterest],
        ['Preferred Technical Domain', st.preferredTechnicalDomain],
        ['Certifications', (st.certifications || []).join(', ')],
        ['Internship', st.internshipExperience],
        ['GitHub', st.profileLinks?.github],
        ['LinkedIn', st.profileLinks?.linkedin],
        ['HackerRank', st.profileLinks?.hackerrank],
        ['HackerEarth', st.profileLinks?.hackerearth],
        ['Communication', st.communicationSkillLevel],
        ['Aptitude', st.aptitudeSkillLevel]
      ])}

      <p><strong>Projects:</strong> ${(st.projects || []).map(p =>
        `${escapeHtml(p.title)} ${p.githubLink ? `(${escapeHtml(p.githubLink)})` : ''}`
      ).join('<br>') || 'None'}</p>

      <p><strong>Hackathons / Coding Contests:</strong>
        ${escapeHtml((st.hackathons || []).join(', ') || 'None')}
      </p>

      <h6 class="mt-4">Strength & Improvement Analysis</h6>
      ${detailTable([
        ['Academic Strengths', st.academicStrengths],
        ['Technical Strengths', st.technicalStrengths],
        ['Communication Strengths', st.communicationStrengths],
        ['Leadership / Teamwork', st.leadershipAndTeamwork],
        ['Areas to Improve', st.areasRequiringImprovement],
        ['Subjects Requiring Support', st.subjectsRequiringSupport],
        ['Skills to Develop', st.skillsToBeDeveloped],
        ['Communication / Aptitude Improvement', st.communicationAptitudeToImprove],
        ['Mentor Support', st.mentorSupportExpected],
        ['Short-term Goal', st.shortTermGoal],
        ['Long-term Goal', st.longTermGoal]
      ])}

      <h6 class="mt-4">Career Goal Details</h6>
      ${careerDetails(st)}
    `;

    studentModal.show();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteStudent(id, name) {
  if (!confirm(`Are you sure you want to permanently delete ${name}?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Delete failed.');

    alert('Student profile deleted successfully.');
    loadStudents();
    loadInsights();
  } catch (err) {
    alert(err.message);
  }
}

function detailTable(rows) {
  return `
    <div class="table-responsive">
      <table class="table table-sm table-bordered">
        <tbody>
          ${rows.map(([k, v]) =>
            `<tr><th style="width:30%">${escapeHtml(k)}</th><td>${escapeHtml(v ?? '')}</td></tr>`
          ).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function semesterTable(items = []) {
  if (!items.length) return '<p class="text-muted">No semester records.</p>';

  return `
    <div class="table-responsive">
      <table class="table table-sm table-bordered">
        <thead><tr>
          <th>Sem</th><th>SGPA</th><th>CGPA</th><th>Attendance</th>
          <th>Arrears</th><th>Achievements</th><th>Well-performed Subjects</th>
        </tr></thead>
        <tbody>
          ${items.sort((a,b) => a.semesterNumber-b.semesterNumber).map(s => `
            <tr>
              <td>${s.semesterNumber}</td>
              <td>${s.sgpa}</td>
              <td>${s.cumulativeCgpa}</td>
              <td>${s.attendancePercentage}%</td>
              <td>${s.arrearStatus} (${s.numberOfArrears})</td>
              <td>${escapeHtml(s.academicAchievements || '')}</td>
              <td>${escapeHtml((s.wellPerformedSubjects || []).join(', '))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function arrearTable(items = []) {
  if (!items.length) return '<p class="text-muted">No arrears recorded.</p>';

  return `
    <div class="table-responsive">
      <table class="table table-sm table-bordered">
        <thead><tr>
          <th>Sem</th><th>Code</th><th>Subject</th><th>Attempts</th>
          <th>Status</th><th>Cleared Sem</th><th>Grade</th>
          <th>Reason</th><th>Remedial</th>
        </tr></thead>
        <tbody>
          ${items.map(a => `
            <tr>
              <td>${a.semesterOccurred}</td>
              <td>${escapeHtml(a.subjectCode)}</td>
              <td>${escapeHtml(a.subjectName)}</td>
              <td>${a.attempts}</td>
              <td>${a.status}</td>
              <td>${a.semesterCleared ?? ''}</td>
              <td>${escapeHtml(a.gradeAfterClearing || '')}</td>
              <td>${escapeHtml(a.difficultyReason || '')}</td>
              <td>${a.remedialSupportRequired ? 'Yes' : 'No'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function careerDetails(st) {
  if (st.careerGoal === 'Placement') {
    const p = st.placementDetails || {};
    return detailTable([
      ['Preferred Job Role', p.preferredJobRole],
      ['Technical Domain', p.technicalDomain],
      ['Company Type', p.companyType],
      ['Expected Salary', p.expectedSalaryRange],
      ['Preferred Location', p.preferredLocation],
      ['Target Companies', p.targetCompanies],
      ['Training / Skills Support', p.trainingSupportNeeded]
    ]);
  }

  if (st.careerGoal === 'Higher Studies') {
    const h = st.higherStudiesDetails || {};
    return detailTable([
      ['Programme', h.preferredProgramme],
      ['Specialization', h.specialization],
      ['Country', h.preferredCountry],
      ['Target Institutions', h.targetInstitutions],
      ['Planned Exams', (h.plannedExams || []).join(', ')],
      ['Expected Admission Year', h.expectedAdmissionYear],
      ['Guidance Required', h.guidanceRequired]
    ]);
  }

  const e = st.entrepreneurshipDetails || {};
  return detailTable([
    ['Business Idea', e.businessIdea],
    ['Problem Addressed', e.problemAddressed],
    ['Proposed Solution', e.proposedSolution],
    ['Target Customers', e.targetCustomers],
    ['Current Stage', e.currentStage],
    ['Team / Technology / Funding / Incubation Support', e.supportNeeded],
    ['Expected Launch Year', e.expectedLaunchYear]
  ]);
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeJs(value) {
  return String(value ?? '').replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}


async function resetStudentLogin(id, name) {
  const password = prompt(`Set a temporary password for ${name}:`, 'Student@123');
  if (password === null) return;
  if (password.length < 6) return alert('Password must contain at least 6 characters.');

  try {
    const res = await fetch(`/api/students/${id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Unable to reset login.');
    alert(`Login created/reset.\nUsername: ${data.username}\nTemporary password: ${data.temporaryPassword}`);
  } catch (err) {
    alert(err.message);
  }
}

// ============================================================
// ROLE-AWARE AUTHENTICATION + STUDENT SELF-SERVICE
// ============================================================
let currentUser = null;

async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) return false;
    const data = await res.json();
    currentUser = data.user;
    if (currentUser.role === 'student') {
      showStudentApp(currentUser);
    } else {
      showApp(currentUser.username);
    }
    return true;
  } catch {
    return false;
  }
}

async function login(e) {
  e.preventDefault();
  const alertBox = $('loginAlert');
  alertBox.classList.add('d-none');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username: $('loginUsername').value.trim(),
        password: $('loginPassword').value,
        role: $('loginRole').value
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed.');

    currentUser = data.user;
    $('loginForm').reset();

    if (currentUser.role === 'student') {
      showStudentApp(currentUser);
    } else {
      showApp(currentUser.username);
    }
  } catch (err) {
    alertBox.textContent = err.message;
    alertBox.classList.remove('d-none');
  }
}

function showApp(username) {
  $('loginScreen').classList.add('d-none');
  $('studentScreen').classList.add('d-none');
  $('appScreen').classList.remove('d-none');
  $('loggedInUser').textContent = `Faculty/Admin: ${username}`;
  showSection('dashboard');
}

function showStudentApp(user) {
  $('loginScreen').classList.add('d-none');
  $('appScreen').classList.add('d-none');
  $('studentScreen').classList.remove('d-none');
  $('studentLoggedInUser').textContent = `${user.studentName || ''} (${user.username})`;
  loadMyStudentProfile();
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  location.reload();
}

async function loadMyStudentProfile() {
  try {
    const res = await fetch('/api/student/me', { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Unable to load profile.');
    populateStudentSelfForm(data);
    renderStudentAcademicSummary(data);
    toggleSelfCareerFields();
  } catch (err) {
    showStudentAlert(err.message, 'danger');
  }
}

function setVal(id, value) {
  const el = $(id);
  if (el) el.value = value ?? '';
}

function populateStudentSelfForm(st) {
  setVal('selfRegisterNumber', st.registerNumber);
  setVal('selfStudentName', st.studentName);
  setVal('selfDob', st.dob ? String(st.dob).substring(0, 10) : '');
  setVal('selfGender', st.gender);
  setVal('selfDepartment', st.department);
  setVal('selfSection', st.section);
  setVal('selfInstitutionalEmail', st.institutionalEmail);
  setVal('selfPersonalEmail', st.personalEmail);
  setVal('selfMobileNumber', st.mobileNumber);
  setVal('selfResidentialAddress', st.residentialAddress);
  setVal('selfStudentCategory', st.studentCategory || 'Day Scholar');
  setVal('selfHostelName', st.hostelName);
  setVal('selfDistance', st.distanceFromResidence);

  setVal('selfFatherName', st.fatherName);
  setVal('selfFatherOccupation', st.fatherOccupation);
  setVal('selfFatherIncome', st.fatherIncomeRange);
  setVal('selfFatherMobile', st.fatherMobile);
  setVal('selfMotherName', st.motherName);
  setVal('selfMotherOccupation', st.motherOccupation);
  setVal('selfMotherIncome', st.motherIncomeRange);
  setVal('selfMotherMobile', st.motherMobile);
  setVal('selfGuardian', st.guardianName);
  setVal('selfEmergency', st.emergencyContact);
  setVal('selfFirstGen', st.firstGenerationGraduate || 'No');
  setVal('selfScholarship', st.scholarshipReceived || 'No');
  setVal('selfFinancialGuidance', st.financialGuidanceRequired || 'No');

  setVal('selfTechnicalSkills', (st.technicalSkills || []).join(', '));
  setVal('selfPreferredDomain', st.preferredTechnicalDomain);
  setVal('selfAreaInterest', st.areaOfInterest);
  setVal('selfCertifications', (st.certifications || []).join(', '));
  setVal('selfProjects', (st.projects || []).map(p => `${p.title || ''} | ${p.githubLink || ''}`).join('\n'));
  setVal('selfHackathons', (st.hackathons || []).join(', '));
  setVal('selfInternship', st.internshipExperience);
  setVal('selfGithub', st.profileLinks?.github);
  setVal('selfLinkedin', st.profileLinks?.linkedin);
  setVal('selfHackerrank', st.profileLinks?.hackerrank);
  setVal('selfHackerearth', st.profileLinks?.hackerearth);
  setVal('selfCommunicationLevel', st.communicationSkillLevel || 'Intermediate');
  setVal('selfAptitudeLevel', st.aptitudeSkillLevel || 'Intermediate');

  setVal('selfAcademicStrengths', st.academicStrengths);
  setVal('selfTechnicalStrengths', st.technicalStrengths);
  setVal('selfCommunicationStrengths', st.communicationStrengths);
  setVal('selfLeadership', st.leadershipAndTeamwork);
  setVal('selfImprovements', st.areasRequiringImprovement);
  setVal('selfSubjectsSupport', st.subjectsRequiringSupport);
  setVal('selfSkillsDevelop', st.skillsToBeDeveloped);
  setVal('selfCommImprove', st.communicationAptitudeToImprove);
  setVal('selfMentorSupport', st.mentorSupportExpected);
  setVal('selfShortGoal', st.shortTermGoal);
  setVal('selfLongGoal', st.longTermGoal);

  setVal('selfCareerGoal', st.careerGoal || 'Placement');
  const p = st.placementDetails || {};
  setVal('selfPlacementRole', p.preferredJobRole);
  setVal('selfPlacementDomain', p.technicalDomain);
  setVal('selfPlacementCompanyType', p.companyType);
  setVal('selfPlacementSalary', p.expectedSalaryRange);
  setVal('selfPlacementLocation', p.preferredLocation);
  setVal('selfPlacementCompanies', p.targetCompanies);
  setVal('selfPlacementSupport', p.trainingSupportNeeded);

  const h = st.higherStudiesDetails || {};
  setVal('selfHigherProgramme', h.preferredProgramme);
  setVal('selfHigherSpecialization', h.specialization);
  setVal('selfHigherCountry', h.preferredCountry);
  setVal('selfHigherInstitutions', h.targetInstitutions);
  setVal('selfHigherExams', (h.plannedExams || []).join(', '));
  setVal('selfHigherYear', h.expectedAdmissionYear);
  setVal('selfHigherGuidance', h.guidanceRequired);

  const e = st.entrepreneurshipDetails || {};
  setVal('selfEntreIdea', e.businessIdea);
  setVal('selfEntreProblem', e.problemAddressed);
  setVal('selfEntreSolution', e.proposedSolution);
  setVal('selfEntreCustomers', e.targetCustomers);
  setVal('selfEntreStage', e.currentStage);
  setVal('selfEntreSupport', e.supportNeeded);
  setVal('selfEntreYear', e.expectedLaunchYear);
}

function renderStudentAcademicSummary(st) {
  const semesters = st.semesters || [];
  const arrears = st.arrears || [];
  const latest = [...semesters].sort((a,b) => a.semesterNumber - b.semesterNumber).at(-1);

  $('studentAcademicSummary').innerHTML = `
    <div class="row g-3 mb-3">
      <div class="col-md-3"><div class="metric-card p-3"><div class="small-muted">Latest SGPA</div><h4>${latest ? latest.sgpa : '—'}</h4></div></div>
      <div class="col-md-3"><div class="metric-card p-3"><div class="small-muted">Current CGPA</div><h4>${latest ? latest.cumulativeCgpa : '—'}</h4></div></div>
      <div class="col-md-3"><div class="metric-card p-3"><div class="small-muted">Attendance</div><h4>${latest ? latest.attendancePercentage + '%' : '—'}</h4></div></div>
      <div class="col-md-3"><div class="metric-card p-3"><div class="small-muted">Pending Arrears</div><h4>${arrears.filter(a => a.status === 'Pending').length}</h4></div></div>
    </div>
    <div class="table-responsive">
      <table class="table table-sm table-bordered">
        <thead><tr><th>Semester</th><th>SGPA</th><th>CGPA</th><th>Attendance</th><th>Arrears</th><th>Achievements</th></tr></thead>
        <tbody>${semesters.length ? semesters.sort((a,b)=>a.semesterNumber-b.semesterNumber).map(x => `
          <tr><td>${x.semesterNumber}</td><td>${x.sgpa}</td><td>${x.cumulativeCgpa}</td><td>${x.attendancePercentage}%</td><td>${x.arrearStatus} (${x.numberOfArrears})</td><td>${escapeHtml(x.academicAchievements || '')}</td></tr>
        `).join('') : '<tr><td colspan="6">No academic records entered yet.</td></tr>'}</tbody>
      </table>
    </div>
    <div class="mt-3"><strong>Arrear history:</strong> ${arrears.length ? arrears.map(a => `${escapeHtml(a.subjectCode)} - ${escapeHtml(a.subjectName)} (${a.status})`).join(', ') : 'None recorded'}</div>
  `;
}

function toggleSelfCareerFields() {
  const goal = $('selfCareerGoal').value;
  $('selfPlacementFields').classList.toggle('d-none', goal !== 'Placement');
  $('selfHigherFields').classList.toggle('d-none', goal !== 'Higher Studies');
  $('selfEntreFields').classList.toggle('d-none', goal !== 'Entrepreneurship');
}

function collectStudentSelfData() {
  const projects = $('selfProjects').value.split('\n').map(line => {
    const [title, ...rest] = line.split('|');
    return { title: (title || '').trim(), githubLink: rest.join('|').trim() };
  }).filter(p => p.title || p.githubLink);

  return {
    studentName: $('selfStudentName').value.trim(),
    dob: $('selfDob').value,
    gender: $('selfGender').value.trim(),
    personalEmail: $('selfPersonalEmail').value.trim(),
    mobileNumber: $('selfMobileNumber').value.trim(),
    residentialAddress: $('selfResidentialAddress').value.trim(),
    studentCategory: $('selfStudentCategory').value,
    hostelName: $('selfHostelName').value.trim(),
    distanceFromResidence: $('selfDistance').value ? Number($('selfDistance').value) : undefined,

    fatherName: $('selfFatherName').value.trim(),
    fatherOccupation: $('selfFatherOccupation').value.trim(),
    fatherIncomeRange: $('selfFatherIncome').value.trim(),
    fatherMobile: $('selfFatherMobile').value.trim(),
    motherName: $('selfMotherName').value.trim(),
    motherOccupation: $('selfMotherOccupation').value.trim(),
    motherIncomeRange: $('selfMotherIncome').value.trim(),
    motherMobile: $('selfMotherMobile').value.trim(),
    guardianName: $('selfGuardian').value.trim(),
    emergencyContact: $('selfEmergency').value.trim(),
    firstGenerationGraduate: $('selfFirstGen').value,
    scholarshipReceived: $('selfScholarship').value,
    financialGuidanceRequired: $('selfFinancialGuidance').value,

    technicalSkills: $('selfTechnicalSkills').value.split(',').map(x=>x.trim()).filter(Boolean),
    preferredTechnicalDomain: $('selfPreferredDomain').value.trim(),
    areaOfInterest: $('selfAreaInterest').value.trim(),
    certifications: $('selfCertifications').value.split(',').map(x=>x.trim()).filter(Boolean),
    projects,
    hackathons: $('selfHackathons').value.split(',').map(x=>x.trim()).filter(Boolean),
    internshipExperience: $('selfInternship').value.trim(),
    profileLinks: {
      github: $('selfGithub').value.trim(),
      linkedin: $('selfLinkedin').value.trim(),
      hackerrank: $('selfHackerrank').value.trim(),
      hackerearth: $('selfHackerearth').value.trim()
    },
    communicationSkillLevel: $('selfCommunicationLevel').value,
    aptitudeSkillLevel: $('selfAptitudeLevel').value,

    academicStrengths: $('selfAcademicStrengths').value.trim(),
    technicalStrengths: $('selfTechnicalStrengths').value.trim(),
    communicationStrengths: $('selfCommunicationStrengths').value.trim(),
    leadershipAndTeamwork: $('selfLeadership').value.trim(),
    areasRequiringImprovement: $('selfImprovements').value.trim(),
    subjectsRequiringSupport: $('selfSubjectsSupport').value.trim(),
    skillsToBeDeveloped: $('selfSkillsDevelop').value.trim(),
    communicationAptitudeToImprove: $('selfCommImprove').value.trim(),
    mentorSupportExpected: $('selfMentorSupport').value.trim(),
    shortTermGoal: $('selfShortGoal').value.trim(),
    longTermGoal: $('selfLongGoal').value.trim(),

    careerGoal: $('selfCareerGoal').value,
    placementDetails: {
      preferredJobRole: $('selfPlacementRole').value.trim(),
      technicalDomain: $('selfPlacementDomain').value.trim(),
      companyType: $('selfPlacementCompanyType').value,
      expectedSalaryRange: $('selfPlacementSalary').value.trim(),
      preferredLocation: $('selfPlacementLocation').value.trim(),
      targetCompanies: $('selfPlacementCompanies').value.trim(),
      trainingSupportNeeded: $('selfPlacementSupport').value.trim()
    },
    higherStudiesDetails: {
      preferredProgramme: $('selfHigherProgramme').value.trim(),
      specialization: $('selfHigherSpecialization').value.trim(),
      preferredCountry: $('selfHigherCountry').value.trim(),
      targetInstitutions: $('selfHigherInstitutions').value.trim(),
      plannedExams: $('selfHigherExams').value.split(',').map(x=>x.trim()).filter(Boolean),
      expectedAdmissionYear: $('selfHigherYear').value ? Number($('selfHigherYear').value) : undefined,
      guidanceRequired: $('selfHigherGuidance').value.trim()
    },
    entrepreneurshipDetails: {
      businessIdea: $('selfEntreIdea').value.trim(),
      problemAddressed: $('selfEntreProblem').value.trim(),
      proposedSolution: $('selfEntreSolution').value.trim(),
      targetCustomers: $('selfEntreCustomers').value.trim(),
      currentStage: $('selfEntreStage').value,
      supportNeeded: $('selfEntreSupport').value.trim(),
      expectedLaunchYear: $('selfEntreYear').value ? Number($('selfEntreYear').value) : undefined
    }
  };
}

async function saveMyStudentProfile(e) {
  e.preventDefault();
  try {
    const res = await fetch('/api/student/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(collectStudentSelfData())
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Unable to save profile.');
    currentUser.studentName = data.student.studentName;
    $('studentLoggedInUser').textContent = `${currentUser.studentName} (${currentUser.username})`;
    showStudentAlert('Your profile was updated successfully.', 'success');
    renderStudentAcademicSummary(data.student);
  } catch (err) {
    showStudentAlert(err.message, 'danger');
  }
}

async function changeStudentPassword() {
  const currentPassword = $('selfCurrentPassword').value;
  const newPassword = $('selfNewPassword').value;
  if (!currentPassword || !newPassword) return showStudentAlert('Enter current and new password.', 'warning');

  try {
    const res = await fetch('/api/student/change-password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Password change failed.');
    $('selfCurrentPassword').value = '';
    $('selfNewPassword').value = '';
    showStudentAlert('Password changed successfully.', 'success');
  } catch (err) {
    showStudentAlert(err.message, 'danger');
  }
}

function showStudentAlert(message, type) {
  const box = $('studentAlert');
  box.textContent = message;
  box.className = `alert alert-${type}`;
  setTimeout(() => box.classList.add('d-none'), 4000);
}

// Bind student UI after the page has loaded.
document.addEventListener('DOMContentLoaded', () => {
  if ($('studentSelfForm')) $('studentSelfForm').addEventListener('submit', saveMyStudentProfile);
  if ($('studentReloadBtn')) $('studentReloadBtn').addEventListener('click', loadMyStudentProfile);
  if ($('studentLogoutBtn')) $('studentLogoutBtn').addEventListener('click', logout);
  if ($('selfCareerGoal')) $('selfCareerGoal').addEventListener('change', toggleSelfCareerFields);
  if ($('changePasswordBtn')) $('changePasswordBtn').addEventListener('click', changeStudentPassword);
});
