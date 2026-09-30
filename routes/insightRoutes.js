const express = require('express');
const router = express.Router();
const Student = require('../models/Student');

function tokens(value) {
  if (!value) return [];
  return String(value)
    .split(/[,;\n|]+/)
    .map(v => v.trim().toLowerCase())
    .filter(Boolean);
}

function topTerms(values, limit = 8) {
  const counts = {};
  values.flatMap(tokens).forEach(term => {
    counts[term] = (counts[term] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }));
}

function academicTrend(semesters) {
  const sorted = [...semesters].sort(
    (a, b) => a.semesterNumber - b.semesterNumber
  );

  if (sorted.length < 2) {
    return { improving: false, declining: false };
  }

  const sgpas = sorted.map(s => Number(s.sgpa));

  // "Improving" = every recorded later SGPA is >= the previous one
  // and at least one increase exists.
  const improving =
    sgpas.every((v, i) => i === 0 || v >= sgpas[i - 1]) &&
    sgpas.some((v, i) => i > 0 && v > sgpas[i - 1]);

  // "Declining" = every recorded later SGPA is <= the previous one
  // and at least one decrease exists.
  const declining =
    sgpas.every((v, i) => i === 0 || v <= sgpas[i - 1]) &&
    sgpas.some((v, i) => i > 0 && v < sgpas[i - 1]);

  return { improving, declining };
}

router.get('/', async (req, res) => {
  try {
    const students = await Student.find();

    let totalCgpa = 0;
    let cgpaCount = 0;
    let highestCgpa = 0;
    let lowestCgpa = 10;

    const semesterSgpaTotals = {};
    const semesterSgpaCounts = {};

    let hostellers = 0;
    let dayScholars = 0;

    let placementCount = 0;
    let higherStudiesCount = 0;
    let entrepreneurshipCount = 0;

    let totalPendingArrears = 0;
    let totalClearedArrears = 0;
    let studentsWithActiveArrears = 0;

    const subjectArrearCounts = {};
    const improvingStudents = [];
    const decliningStudents = [];
    const studentsNeedingRemedial = [];
    const studentsMissingProfiles = [];

    const commonStrengthInputs = [];
    const commonImprovementInputs = [];

    const careerSkillInputs = {
      Placement: [],
      'Higher Studies': [],
      Entrepreneurship: []
    };

    const mentorIntervention = [];

    students.forEach(student => {
      if (student.studentCategory === 'Hosteller') hostellers++;
      if (student.studentCategory === 'Day Scholar') dayScholars++;

      if (student.careerGoal === 'Placement') placementCount++;
      if (student.careerGoal === 'Higher Studies') higherStudiesCount++;
      if (student.careerGoal === 'Entrepreneurship') entrepreneurshipCount++;

      const sortedSemesters = [...student.semesters].sort(
        (a, b) => a.semesterNumber - b.semesterNumber
      );

      const latest = sortedSemesters[sortedSemesters.length - 1];

      if (latest) {
        totalCgpa += Number(latest.cumulativeCgpa);
        cgpaCount++;
        highestCgpa = Math.max(highestCgpa, Number(latest.cumulativeCgpa));
        lowestCgpa = Math.min(lowestCgpa, Number(latest.cumulativeCgpa));
      }

      sortedSemesters.forEach(sem => {
        const n = sem.semesterNumber;
        semesterSgpaTotals[n] = (semesterSgpaTotals[n] || 0) + Number(sem.sgpa);
        semesterSgpaCounts[n] = (semesterSgpaCounts[n] || 0) + 1;
      });

      const trend = academicTrend(sortedSemesters);

      if (trend.improving) {
        improvingStudents.push({
          id: student._id,
          name: student.studentName,
          regNo: student.registerNumber
        });
      }

      if (trend.declining) {
        decliningStudents.push({
          id: student._id,
          name: student.studentName,
          regNo: student.registerNumber
        });
      }

      let activeArrear = false;

      student.arrears.forEach(arr => {
        if (arr.status === 'Pending') {
          totalPendingArrears++;
          activeArrear = true;

          const code = arr.subjectCode || 'Unknown';
          subjectArrearCounts[code] =
            (subjectArrearCounts[code] || 0) + 1;

          if (arr.remedialSupportRequired) {
            studentsNeedingRemedial.push({
              id: student._id,
              name: student.studentName,
              regNo: student.registerNumber,
              subject: arr.subjectCode
            });
          }
        } else if (arr.status === 'Cleared') {
          totalClearedArrears++;
        }
      });

      if (activeArrear) {
        studentsWithActiveArrears++;
      }

      commonStrengthInputs.push(
        student.academicStrengths,
        student.technicalStrengths,
        student.communicationStrengths,
        student.leadershipAndTeamwork
      );

      commonImprovementInputs.push(
        student.areasRequiringImprovement,
        student.subjectsRequiringSupport,
        student.skillsToBeDeveloped,
        student.communicationAptitudeToImprove
      );

      if (student.careerGoal) {
        careerSkillInputs[student.careerGoal].push(
          student.skillsToBeDeveloped,
          student.subjectsRequiringSupport,
          student.communicationAptitudeToImprove
        );
      }

      const needsMentor =
        activeArrear ||
        Boolean(student.mentorSupportExpected?.trim()) ||
        Boolean(student.areasRequiringImprovement?.trim()) ||
        Boolean(student.subjectsRequiringSupport?.trim()) ||
        student.financialGuidanceRequired === 'Yes';

      if (needsMentor) {
        mentorIntervention.push({
          id: student._id,
          name: student.studentName,
          regNo: student.registerNumber,
          careerGoal: student.careerGoal,
          activeArrears: student.arrears.filter(a => a.status === 'Pending').length,
          mentorSupportExpected: student.mentorSupportExpected || '',
          reason: activeArrear
            ? 'Active arrears / remedial requirement'
            : student.financialGuidanceRequired === 'Yes'
              ? 'Financial or scholarship guidance required'
              : 'Improvement or mentor support indicated'
        });
      }

      const missing = [];
      if (!student.certifications?.length) missing.push('Certification');
      if (!student.projects?.length) missing.push('Project');
      if (!student.profileLinks?.github) missing.push('GitHub');
      if (!student.profileLinks?.linkedin) missing.push('LinkedIn');

      if (missing.length) {
        studentsMissingProfiles.push({
          id: student._id,
          name: student.studentName,
          regNo: student.registerNumber,
          missing
        });
      }
    });

    const semesterWiseAverageSgpa = Object.keys(semesterSgpaTotals)
      .sort((a, b) => Number(a) - Number(b))
      .map(semester => ({
        semester: Number(semester),
        averageSgpa: (
          semesterSgpaTotals[semester] /
          semesterSgpaCounts[semester]
        ).toFixed(2)
      }));

    const careerSkillGaps = {};
    Object.keys(careerSkillInputs).forEach(goal => {
      careerSkillGaps[goal] = topTerms(careerSkillInputs[goal], 8);
    });

    const topSubjectArrears = Object.entries(subjectArrearCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([subjectCode, count]) => ({ subjectCode, count }));

    res.json({
      totalStudents: students.length,
      hostellers,
      dayScholars,
      averageCgpa: cgpaCount ? (totalCgpa / cgpaCount).toFixed(2) : '0.00',
      highestCgpa: cgpaCount ? highestCgpa.toFixed(2) : '0.00',
      lowestCgpa: cgpaCount ? lowestCgpa.toFixed(2) : '0.00',

      semesterWiseAverageSgpa,

      totalPendingArrears,
      totalClearedArrears,
      studentsWithActiveArrears,
      topSubjectArrears,

      placementCount,
      higherStudiesCount,
      entrepreneurshipCount,

      improvingStudents,
      decliningStudents,
      studentsNeedingRemedial,

      commonStrengths: topTerms(commonStrengthInputs),
      commonImprovementAreas: topTerms(commonImprovementInputs),

      studentsMissingProfiles,
      careerSkillGaps,
      mentorIntervention
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
