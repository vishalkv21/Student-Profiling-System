const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  title: { type: String, trim: true },
  githubLink: { type: String, trim: true }
}, { _id: false });

const SemesterSchema = new mongoose.Schema({
  semesterNumber: { type: Number, required: true, min: 1, max: 8 },
  sgpa: { type: Number, required: true, min: 0, max: 10 },
  cumulativeCgpa: { type: Number, required: true, min: 0, max: 10 },
  attendancePercentage: { type: Number, required: true, min: 0, max: 100 },
  arrearStatus: { type: String, enum: ['Yes', 'No'], required: true },
  numberOfArrears: { type: Number, default: 0, min: 0 },
  academicAchievements: { type: String, trim: true },
  wellPerformedSubjects: [{ type: String, trim: true }]
}, { _id: false });

const ArrearSchema = new mongoose.Schema({
  semesterOccurred: { type: Number, required: true, min: 1, max: 8 },
  subjectCode: { type: String, required: true, trim: true },
  subjectName: { type: String, required: true, trim: true },
  attempts: { type: Number, default: 1, min: 1 },
  status: { type: String, enum: ['Pending', 'Cleared'], default: 'Pending' },
  semesterCleared: { type: Number, min: 1, max: 8 },
  gradeAfterClearing: { type: String, trim: true },
  difficultyReason: { type: String, trim: true },
  remedialSupportRequired: { type: Boolean, default: false }
});

const StudentSchema = new mongoose.Schema({
  // Student login account. Password is stored only as a bcrypt hash.
  account: {
    username: { type: String, unique: true, sparse: true, trim: true },
    passwordHash: { type: String },
    role: { type: String, enum: ['student'], default: 'student' },
    mustChangePassword: { type: Boolean, default: true }
  },
  // Personal details
  registerNumber: { type: String, required: true, unique: true, trim: true },
  studentName: { type: String, required: true, trim: true },
  dob: { type: Date, required: true },
  gender: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  section: { type: String, required: true, trim: true },
  institutionalEmail: { type: String, required: true, trim: true },
  personalEmail: { type: String, trim: true },
  mobileNumber: { type: String, required: true, trim: true },
  residentialAddress: { type: String, required: true, trim: true },
  studentCategory: {
    type: String,
    enum: ['Hosteller', 'Day Scholar'],
    required: true
  },
  hostelName: { type: String, trim: true },
  distanceFromResidence: { type: Number, min: 0 },

  // Parent/family details
  fatherName: { type: String, required: true, trim: true },
  fatherOccupation: { type: String, trim: true },
  fatherIncomeRange: { type: String, trim: true },
  fatherMobile: { type: String, trim: true },
  motherName: { type: String, required: true, trim: true },
  motherOccupation: { type: String, trim: true },
  motherIncomeRange: { type: String, trim: true },
  motherMobile: { type: String, trim: true },
  guardianName: { type: String, trim: true },
  emergencyContact: { type: String, required: true, trim: true },
  firstGenerationGraduate: { type: String, enum: ['Yes', 'No'], default: 'No' },
  scholarshipReceived: { type: String, enum: ['Yes', 'No'], default: 'No' },
  financialGuidanceRequired: { type: String, enum: ['Yes', 'No'], default: 'No' },

  // Academic and arrear details
  semesters: [SemesterSchema],
  arrears: [ArrearSchema],

  // Technical/professional profile
  technicalSkills: [{ type: String, trim: true }],
  preferredTechnicalDomain: { type: String, trim: true },
  areaOfInterest: { type: String, trim: true },
  certifications: [{ type: String, trim: true }],
  projects: [ProjectSchema],
  hackathons: [{ type: String, trim: true }],
  internshipExperience: { type: String, trim: true },
  profileLinks: {
    github: { type: String, trim: true },
    linkedin: { type: String, trim: true },
    hackerrank: { type: String, trim: true },
    hackerearth: { type: String, trim: true }
  },
  communicationSkillLevel: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Intermediate'
  },
  aptitudeSkillLevel: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Intermediate'
  },

  // Strength and improvement analysis
  academicStrengths: { type: String, trim: true },
  technicalStrengths: { type: String, trim: true },
  communicationStrengths: { type: String, trim: true },
  leadershipAndTeamwork: { type: String, trim: true },
  areasRequiringImprovement: { type: String, trim: true },
  subjectsRequiringSupport: { type: String, trim: true },
  skillsToBeDeveloped: { type: String, trim: true },
  communicationAptitudeToImprove: { type: String, trim: true },
  mentorSupportExpected: { type: String, trim: true },
  shortTermGoal: { type: String, trim: true },
  longTermGoal: { type: String, trim: true },

  // Career goal
  careerGoal: {
    type: String,
    enum: ['Placement', 'Higher Studies', 'Entrepreneurship'],
    required: true
  },

  placementDetails: {
    preferredJobRole: { type: String, trim: true },
    technicalDomain: { type: String, trim: true },
    companyType: {
      type: String,
      enum: ['Product', 'Service', 'Core', 'Start-up', '']
    },
    expectedSalaryRange: { type: String, trim: true },
    preferredLocation: { type: String, trim: true },
    targetCompanies: { type: String, trim: true },
    trainingSupportNeeded: { type: String, trim: true }
  },

  higherStudiesDetails: {
    preferredProgramme: { type: String, trim: true },
    specialization: { type: String, trim: true },
    preferredCountry: { type: String, trim: true },
    targetInstitutions: { type: String, trim: true },
    plannedExams: [{ type: String, trim: true }],
    expectedAdmissionYear: { type: Number },
    guidanceRequired: { type: String, trim: true }
  },

  entrepreneurshipDetails: {
    businessIdea: { type: String, trim: true },
    problemAddressed: { type: String, trim: true },
    proposedSolution: { type: String, trim: true },
    targetCustomers: { type: String, trim: true },
    currentStage: {
      type: String,
      enum: ['Idea', 'Prototype', 'MVP', 'Revenue', '']
    },
    supportNeeded: { type: String, trim: true },
    expectedLaunchYear: { type: Number }
  }
}, { timestamps: true });

module.exports = mongoose.model('Student', StudentSchema);
