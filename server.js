require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');

const Student = require('./models/Student');
const studentRoutes = require('./routes/studentRoutes');
const insightRoutes = require('./routes/insightRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/studentProfilingDB';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 1000 * 60 * 60 * 8
  }
}));

app.use(express.static(path.join(__dirname, 'public')));

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Please login first.' });
  }
  next();
}

function requireFaculty(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'faculty') {
    return res.status(403).json({ message: 'Faculty/Admin access required.' });
  }
  next();
}

// ---------------- AUTH ----------------
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, role } = req.body || {};

    if (!username || !password || !role) {
      return res.status(400).json({ message: 'Username, password and role are required.' });
    }

    if (role === 'faculty') {
      const validUsername = process.env.FACULTY_USERNAME || 'faculty';
      const validPassword = process.env.FACULTY_PASSWORD || 'faculty123';

      if (username === validUsername && password === validPassword) {
        req.session.user = { role: 'faculty', username };
        return res.json({ authenticated: true, user: req.session.user });
      }

      return res.status(401).json({ message: 'Invalid faculty/admin credentials.' });
    }

    if (role === 'student') {
      // Students can log in using either their register number or account username.
      const student = await Student.findOne({
        $or: [
          { registerNumber: username },
          { 'account.username': username }
        ]
      });

      if (!student || !student.account?.passwordHash) {
        return res.status(401).json({
          message: 'Student account not found or not activated. Contact faculty.'
        });
      }

      const valid = await bcrypt.compare(password, student.account.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: 'Invalid student credentials.' });
      }

      req.session.user = {
        role: 'student',
        studentId: student._id.toString(),
        username: student.account.username || student.registerNumber,
        studentName: student.studentName,
        mustChangePassword: Boolean(student.account.mustChangePassword)
      };

      return res.json({ authenticated: true, user: req.session.user });
    }

    return res.status(400).json({ message: 'Invalid login role.' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully.' });
  });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ authenticated: false });
  }
  res.json({ authenticated: true, user: req.session.user });
});

// ---------------- STUDENT SELF-SERVICE ----------------
app.get('/api/student/me', requireLogin, async (req, res) => {
  try {
    if (req.session.user.role !== 'student') {
      return res.status(403).json({ message: 'Student access only.' });
    }

    const student = await Student.findById(req.session.user.studentId)
      .select('-account.passwordHash');

    if (!student) return res.status(404).json({ message: 'Student profile not found.' });
    res.json(student);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to load your profile.' });
  }
});

// Only self-entered/non-academic fields are accepted here.
app.put('/api/student/me', requireLogin, async (req, res) => {
  try {
    if (req.session.user.role !== 'student') {
      return res.status(403).json({ message: 'Student access only.' });
    }

    const student = await Student.findById(req.session.user.studentId);
    if (!student) return res.status(404).json({ message: 'Student profile not found.' });

    const allowed = [
      'studentName', 'dob', 'gender', 'personalEmail', 'mobileNumber',
      'residentialAddress', 'studentCategory', 'hostelName', 'distanceFromResidence',
      'fatherName', 'fatherOccupation', 'fatherIncomeRange', 'fatherMobile',
      'motherName', 'motherOccupation', 'motherIncomeRange', 'motherMobile',
      'guardianName', 'emergencyContact', 'firstGenerationGraduate',
      'scholarshipReceived', 'financialGuidanceRequired',
      'technicalSkills', 'preferredTechnicalDomain', 'areaOfInterest',
      'certifications', 'projects', 'hackathons', 'internshipExperience',
      'profileLinks', 'communicationSkillLevel', 'aptitudeSkillLevel',
      'academicStrengths', 'technicalStrengths', 'communicationStrengths',
      'leadershipAndTeamwork', 'areasRequiringImprovement', 'subjectsRequiringSupport',
      'skillsToBeDeveloped', 'communicationAptitudeToImprove', 'mentorSupportExpected',
      'shortTermGoal', 'longTermGoal', 'careerGoal', 'placementDetails',
      'higherStudiesDetails', 'entrepreneurshipDetails'
    ];

    for (const field of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        student[field] = req.body[field];
      }
    }

    // Never accept academic/arrear changes through the student endpoint.
    await student.save();

    req.session.user.studentName = student.studentName;
    const result = student.toObject();
    if (result.account) delete result.account.passwordHash;

    res.json({ message: 'Your profile has been updated successfully.', student: result });
  } catch (err) {
    console.error('Student self-update error:', err);
    res.status(400).json({ message: err.message || 'Unable to update your profile.' });
  }
});

app.put('/api/student/change-password', requireLogin, async (req, res) => {
  try {
    if (req.session.user.role !== 'student') {
      return res.status(403).json({ message: 'Student access only.' });
    }

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must contain at least 6 characters.' });
    }

    const student = await Student.findById(req.session.user.studentId);
    if (!student?.account?.passwordHash) {
      return res.status(400).json({ message: 'Student account is not configured.' });
    }

    const valid = await bcrypt.compare(currentPassword, student.account.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect.' });

    student.account.passwordHash = await bcrypt.hash(newPassword, 10);
    student.account.mustChangePassword = false;
    await student.save();

    req.session.user.mustChangePassword = false;
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to change password.' });
  }
});

// Faculty-only APIs
app.use('/api/students', requireFaculty, studentRoutes);
app.use('/api/insights', requireFaculty, insightRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API route not found.' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected successfully.');
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failure:', err.message);
    process.exit(1);
  });
