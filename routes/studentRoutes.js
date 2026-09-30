const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const Student = require('../models/Student');

function buildQuery(req) {
  const { search, department, section, studentCategory, careerGoal, minCgpa, maxCgpa, hasArrears } = req.query;
  const and = [];

  if (search) {
    and.push({ $or: [
      { studentName: { $regex: search, $options: 'i' } },
      { registerNumber: { $regex: search, $options: 'i' } }
    ] });
  }
  if (department) and.push({ department });
  if (section) and.push({ section });
  if (studentCategory) and.push({ studentCategory });
  if (careerGoal) and.push({ careerGoal });
  if (hasArrears === 'true') and.push({ arrears: { $elemMatch: { status: 'Pending' } } });
  if (hasArrears === 'false') and.push({ arrears: { $not: { $elemMatch: { status: 'Pending' } } } });

  return { query: and.length ? { $and: and } : {}, minCgpa, maxCgpa };
}

function applyCgpaFilter(students, minCgpa, maxCgpa) {
  return students.filter((student) => {
    const semesters = [...student.semesters].sort((a, b) => a.semesterNumber - b.semesterNumber);
    const latest = semesters[semesters.length - 1];
    if (!latest) return false;
    if (minCgpa && latest.cumulativeCgpa < Number(minCgpa)) return false;
    if (maxCgpa && latest.cumulativeCgpa > Number(maxCgpa)) return false;
    return true;
  });
}

router.get('/', async (req, res) => {
  try {
    const { query, minCgpa, maxCgpa } = buildQuery(req);
    let students = await Student.find(query).sort({ registerNumber: 1 });
    if (minCgpa || maxCgpa) students = applyCgpaFilter(students, minCgpa, maxCgpa);
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select('-account.passwordHash');
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    res.json(student);
  } catch (err) {
    res.status(400).json({ message: 'Invalid student ID.' });
  }
});

// Create a student and automatically create the student login account.
router.post('/', async (req, res) => {
  try {
    const body = { ...req.body };
    const existing = await Student.findOne({ registerNumber: body.registerNumber });
    if (existing) return res.status(400).json({ message: 'Register number already registered.' });

    const requestedPassword = String(body.studentPassword || 'Student@123');
    if (requestedPassword.length < 6) {
      return res.status(400).json({ message: 'Student password must contain at least 6 characters.' });
    }
    delete body.studentPassword;

    body.account = {
      username: body.registerNumber,
      passwordHash: await bcrypt.hash(requestedPassword, 10),
      role: 'student',
      mustChangePassword: true
    };

    const student = await Student.create(body);
    const result = student.toObject();
    delete result.account.passwordHash;

    res.status(201).json({
      message: 'Student profile and login account created successfully.',
      student: result,
      loginUsername: student.registerNumber,
      temporaryPassword: requestedPassword
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const body = { ...req.body };
    delete body.account;
    delete body.studentPassword;

    const updated = await Student.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true
    }).select('-account.passwordHash');

    if (!updated) return res.status(404).json({ message: 'Student not found.' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Faculty can reset/create a student's login account.
router.post('/:id/reset-password', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    const password = String(req.body?.password || 'Student@123');
    if (password.length < 6) return res.status(400).json({ message: 'Password must contain at least 6 characters.' });

    student.account = {
      username: student.registerNumber,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'student',
      mustChangePassword: true
    };
    await student.save();

    res.json({
      message: 'Student login account created/reset successfully.',
      username: student.registerNumber,
      temporaryPassword: password
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Student.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Student not found.' });
    res.json({ message: 'Student profile deleted successfully.' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/:id/semesters', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    student.semesters.push(req.body);
    await student.save();
    res.status(201).json(student);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/:id/arrears', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    student.arrears.push(req.body);
    await student.save();
    res.status(201).json(student);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
