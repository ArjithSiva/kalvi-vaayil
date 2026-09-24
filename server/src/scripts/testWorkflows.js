/**
 * Kalvi Vaayil — End-to-End Workflow Verification
 *
 * Tests all 4 critical workflow flows against the database:
 *   A) Physical Event QR GatePass & Scanning
 *   B) Anti-Idle Live Session Presence & Dynamic Attendance %
 *   C) Workshop Announcements & Notifications
 *   D) Quiz Gating & Auto-Certificate Issuance
 *
 * Usage: node server/src/scripts/testWorkflows.js
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { runSeed } from '../seed.js';

// Models
import User from '../models/User.js';
import Workshop from '../models/Workshop.js';
import Session from '../models/Session.js';
import Registration from '../models/Registration.js';
import Attendance from '../models/Attendance.js';
import GatePass from '../models/GatePass.js';
import Certificate from '../models/Certificate.js';
import Notification from '../models/Notification.js';
import PresenceCheck from '../models/PresenceCheck.js';
import WorkshopCategory from '../models/WorkshopCategory.js';

// Controllers
import * as registrationCtrl from '../controllers/registrationController.js';
import * as gatePassCtrl from '../controllers/gatePassController.js';
import * as presenceCtrl from '../controllers/presenceController.js';
import * as workshopCtrl from '../controllers/workshopController.js';
import * as certificateCtrl from '../controllers/certificateController.js';

// Test harness
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log('  PASS: ' + label);
  } else {
    failed++;
    failures.push(label);
    console.log('  FAIL: ' + label);
  }
}

function mockReq(overrides) {
  return Object.assign({ params: {}, query: {}, body: {}, headers: {}, user: null, organizerSettings: null }, overrides || {});
}

function mockRes() {
  const res = { _status: 200, _body: null };
  res.status = function(code) { res._status = code; return res; };
  res.json = function(body) { res._body = body; return res; };
  return res;
}

async function main() {
  console.log('=== Kalvi Vaayil - Workflow Verification ===');
  console.log('');

  await connectDB();
  console.log('Seeding database...');
  await runSeed();
  console.log('Seed complete.');
  console.log('');

  // Load fixtures
  const participant = await User.findOne({ role: 'participant', email: 'arul@student.edu' });
  const participant2 = await User.findOne({ role: 'participant', email: 'kavya@student.edu' });
  const organizer = await User.findOne({ role: 'organizer', email: 'priya@kalvivaayil.edu' });
  const admin = await User.findOne({ role: 'admin' });

  assert(!!participant, 'Fixture: participant (Arul) exists');
  assert(!!organizer, 'Fixture: organizer (Priya) exists');
  assert(!!admin, 'Fixture: admin exists');

  const physicalWorkshop = await Workshop.findOne({ mode: 'physical', status: 'published' });
  assert(!!physicalWorkshop, 'Fixture: physical published workshop exists');

  const onlineWorkshop = await Workshop.findOne({ mode: 'online', status: 'published' });
  assert(!!onlineWorkshop, 'Fixture: online published workshop exists');

  // === FLOW A: Physical Event QR GatePass & Scanning ===
  console.log('');
  console.log('-- Flow A: Physical Event QR GatePass & Scanning --');

  // Clean up
  await Registration.deleteMany({ user: participant._id, workshop: physicalWorkshop._id });
  await GatePass.deleteMany({ user: participant._id, workshop: physicalWorkshop._id });
  await Notification.deleteMany({ user: participant._id, type: 'gate_pass' });

  // A1: Register
  var regReq = mockReq({ params: { workshopId: physicalWorkshop._id.toString() }, user: participant });
  var regRes = mockRes();
  await registrationCtrl.registerForWorkshop(regReq, regRes);
  assert(regRes._status === 201, 'A1: Registration returns 201');
  assert(regRes._body && regRes._body.status === 'confirmed', 'A1: Registration status is confirmed');

  // A2: GatePass auto-created
  var gatePass = await GatePass.findOne({ user: participant._id, workshop: physicalWorkshop._id });
  assert(!!gatePass, 'A2: GatePass document exists after registration');
  assert(!!gatePass.token && gatePass.token.length > 20, 'A2: GatePass has valid JWT token');

  // A3: Notification created
  var gatePassNotif = await Notification.findOne({ user: participant._id, type: 'gate_pass' });
  assert(!!gatePassNotif, 'A3: gate_pass notification created for participant');
  assert(gatePassNotif && gatePassNotif.title.includes(physicalWorkshop.title), 'A3: Notification title includes workshop name');

  // A4: QR Scan
  var today = new Date();
  today.setHours(10, 0, 0, 0);
  var todaySession = await Session.findOne({ workshop: physicalWorkshop._id });
  if (!todaySession) {
    todaySession = await Session.create({
      workshop: physicalWorkshop._id,
      title: 'Test Session for Scan',
      date: today,
      startTime: today,
      endTime: new Date(today.getTime() + 2 * 3600000),
      attendanceMode: 'qr',
      createdBy: organizer._id,
    });
  }

  var scanReq = mockReq({ body: { token: gatePass.token }, user: organizer });
  var scanRes = mockRes();
  await gatePassCtrl.scanGatePass(scanReq, scanRes);
  assert(scanRes._status === 200, 'A4: QR scan returns 200');
  assert(scanRes._body && scanRes._body.success === true, 'A4: Scan reports success');

  // A5: Attendance record
  var attendance = await Attendance.findOne({ session: todaySession._id, user: participant._id });
  assert(!!attendance, 'A5: Attendance record exists after scan');
  assert(attendance && attendance.status === 'present', 'A5: Attendance status is present');
  assert(attendance && attendance.method === 'qr', 'A5: Attendance method is qr');

  // === FLOW B: Anti-Idle Presence & Dynamic Attendance % ===
  console.log('');
  console.log('-- Flow B: Anti-Idle Presence & Dynamic Attendance % --');

  await Registration.deleteMany({ user: participant._id, workshop: onlineWorkshop._id });
  await Registration.create({ user: participant._id, workshop: onlineWorkshop._id, status: 'confirmed', mode: 'online' });

  var onlineSession = await Session.findOne({ workshop: onlineWorkshop._id });
  if (!onlineSession) {
    var sessDate = new Date();
    onlineSession = await Session.create({
      workshop: onlineWorkshop._id,
      title: 'Online Test Session',
      date: sessDate,
      startTime: new Date(sessDate.setHours(10, 0, 0, 0)),
      endTime: new Date(sessDate.setHours(12, 0, 0, 0)),
      attendanceMode: 'manual',
      createdBy: organizer._id,
    });
  }

  // B1: Poll challenge
  var challengeReq = mockReq({ params: { sessionId: onlineSession._id.toString() }, user: participant });
  var challengeRes = mockRes();
  await presenceCtrl.createPresenceChallenge(challengeReq, challengeRes);
  assert(challengeRes._status === 200, 'B1: Challenge poll returns 200');
  assert(challengeRes._body && !!challengeRes._body.windowStart, 'B1: Challenge has windowStart');
  assert(challengeRes._body && !!challengeRes._body.windowEnd, 'B1: Challenge has windowEnd');

  // B2: Confirm presence
  var confirmReq = mockReq({
    params: { sessionId: onlineSession._id.toString() },
    body: { windowStart: challengeRes._body.windowStart, windowEnd: challengeRes._body.windowEnd },
    user: participant,
  });
  var confirmRes = mockRes();
  await presenceCtrl.confirmPresence(confirmReq, confirmRes);
  assert(confirmRes._status === 200, 'B2: Presence confirm returns 200');
  assert(confirmRes._body && confirmRes._body.confirmed === true, 'B2: Presence confirmed');

  // B3: Attendance updated
  var presenceAttendance = await Attendance.findOne({ session: onlineSession._id, user: participant._id });
  assert(!!presenceAttendance, 'B3: Attendance record exists after presence confirm');
  assert(presenceAttendance && presenceAttendance.status === 'present', 'B3: Attendance status is present');

  // B4: Dynamic attendance percentage
  assert(confirmRes._body && typeof confirmRes._body.attendancePercent === 'number', 'B4: attendancePercent is a number');
  assert(confirmRes._body && confirmRes._body.attendancePercent >= 0 && confirmRes._body.attendancePercent <= 100, 'B4: attendancePercent is between 0-100');

  // B5: PresenceCheck record
  var presenceCheck = await PresenceCheck.findOne({ session: onlineSession._id, user: participant._id });
  assert(!!presenceCheck, 'B5: PresenceCheck record exists');

  // === FLOW C: Workshop Announcements & Notifications ===
  console.log('');
  console.log('-- Flow C: Workshop Announcements & Notifications --');

  await Registration.deleteMany({ workshop: onlineWorkshop._id });
  await Registration.insertMany([
    { user: participant._id, workshop: onlineWorkshop._id, status: 'confirmed', mode: 'online' },
    { user: participant2._id, workshop: onlineWorkshop._id, status: 'confirmed', mode: 'online' },
  ]);
  await Notification.deleteMany({ type: 'announcement', relatedEntityId: onlineWorkshop._id });

  // C1: Post announcement
  var annReq = mockReq({
    params: { id: onlineWorkshop._id.toString() },
    body: { title: 'Test Announcement', message: 'This is a test announcement for verification.' },
    user: organizer,
  });
  var annRes = mockRes();
  await workshopCtrl.postAnnouncement(annReq, annRes);
  assert(annRes._status === 201, 'C1: Post announcement returns 201');
  assert(annRes._body && !!annRes._body.announcement, 'C1: Response includes announcement object');
  assert(annRes._body && annRes._body.announcement && annRes._body.announcement.title === 'Test Announcement', 'C1: Announcement title matches');

  // C2: Stored in workshop
  var updatedWorkshop = await Workshop.findById(onlineWorkshop._id);
  var hasAnnouncement = updatedWorkshop.announcements.some(function(a) { return a.title === 'Test Announcement'; });
  assert(hasAnnouncement, 'C2: Announcement stored in workshop.announcements');

  // C3: Notifications dispatched
  var annNotifs = await Notification.find({ type: 'announcement', relatedEntityId: onlineWorkshop._id });
  assert(annNotifs.length >= 2, 'C3: Notifications sent to all registered participants (>=2)');
  var p1Notif = annNotifs.find(function(n) { return n.user.toString() === participant._id.toString(); });
  var p2Notif = annNotifs.find(function(n) { return n.user.toString() === participant2._id.toString(); });
  assert(!!p1Notif, 'C3: Participant 1 received announcement notification');
  assert(!!p2Notif, 'C3: Participant 2 received announcement notification');

  // C4: GET announcements
  var getAnnReq = mockReq({ params: { id: onlineWorkshop._id.toString() } });
  var getAnnRes = mockRes();
  await workshopCtrl.getAnnouncements(getAnnReq, getAnnRes);
  assert(getAnnRes._status === 200, 'C4: GET announcements returns 200');
  assert(Array.isArray(getAnnRes._body), 'C4: Response is an array');
  assert(getAnnRes._body.length >= 1, 'C4: At least 1 announcement returned');

  // === FLOW D: Quiz Gating & Auto-Certificate Issuance ===
  console.log('');
  console.log('-- Flow D: Quiz Gating & Auto-Certificate Issuance --');

  var pastWorkshop = await Workshop.findOne({ status: 'completed' });
  assert(!!pastWorkshop, 'Fixture: completed workshop exists');

  // Ensure >=80% attendance
  var totalSessionsPast = await Session.countDocuments({ workshop: pastWorkshop._id });
  var existingPresent = await Attendance.countDocuments({ workshop: pastWorkshop._id, user: participant._id, status: 'present' });
  var currentPct = totalSessionsPast > 0 ? Math.round((existingPresent / totalSessionsPast) * 100) : 0;

  if (currentPct < 80 && totalSessionsPast > 0) {
    var neededPresent = Math.ceil(totalSessionsPast * 0.8);
    var absentRecords = await Attendance.find({ workshop: pastWorkshop._id, user: participant._id, status: 'absent' }).limit(neededPresent - existingPresent);
    for (var i = 0; i < absentRecords.length; i++) {
      absentRecords[i].status = 'present';
      await absentRecords[i].save();
    }
  }

  await Certificate.deleteMany({ user: participant._id, workshop: pastWorkshop._id });

  // D1: Check eligibility
  var certReq = mockReq({ params: { workshopId: pastWorkshop._id.toString() }, body: { quizScore: 90 }, user: participant });
  var certRes = mockRes();
  await certificateCtrl.checkCertificateEligibility(certReq, certRes);
  assert(certRes._status === 200, 'D1: Certificate eligibility check returns 200');

  // D2: Certificate created
  var certificate = await Certificate.findOne({ user: participant._id, workshop: pastWorkshop._id });
  assert(!!certificate, 'D2: Certificate record exists');
  assert(certificate && certificate.status === 'approved', 'D2: Certificate status is approved');

  // D3: UUID certificateId
  assert(certificate && !!certificate.certificateId && certificate.certificateId.indexOf('-') > 0, 'D3: Certificate has UUID certificateId');

  // D4: issuedAt
  assert(certificate && !!certificate.issuedAt, 'D4: Certificate has issuedAt timestamp');

  // D5: attendancePercent
  assert(certificate && typeof certificate.attendancePercent === 'number' && certificate.attendancePercent >= 80, 'D5: Certificate attendancePercent >= 80');

  // D6: testScore
  assert(certificate && typeof certificate.testScore === 'number' && certificate.testScore > 0, 'D6: Certificate has testScore');

  // D7: Public verification
  var verifyReq = mockReq({ params: { certificateId: certificate.certificateId } });
  var verifyRes = mockRes();
  await certificateCtrl.verifyCertificate(verifyReq, verifyRes);
  assert(verifyRes._status === 200, 'D7: Public verification returns 200');
  assert(verifyRes._body && verifyRes._body.valid === true, 'D7: Certificate verified as valid');
  assert(verifyRes._body && verifyRes._body.certificateId === certificate.certificateId, 'D7: Returned certificateId matches');
  assert(verifyRes._body && !!verifyRes._body.participantName, 'D7: Returns participant name');
  assert(verifyRes._body && !!verifyRes._body.workshopTitle, 'D7: Returns workshop title');

  // === Schema & Data Integrity ===
  console.log('');
  console.log('-- Schema & Data Integrity --');

  var categoryCount = await WorkshopCategory.countDocuments();
  assert(categoryCount === 6, 'Schema: 6 categories seeded (got ' + categoryCount + ')');

  var cat = await WorkshopCategory.findOne();
  assert(cat && !!cat.name && !!cat.name.en && !!cat.name.ta, 'Schema: Categories have bilingual names');

  var participantCount = await User.countDocuments({ role: 'participant' });
  assert(participantCount === 5, 'Schema: 5 participants seeded (got ' + participantCount + ')');

  var now2 = new Date();
  var todayStart = new Date(now2.getFullYear(), now2.getMonth(), now2.getDate());
  var todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  var todaySessionCount = await Session.countDocuments({ date: { $gte: todayStart, $lt: todayEnd } });
  assert(todaySessionCount >= 2, 'Data: >=2 today sessions exist (got ' + todaySessionCount + ')');

  var approvedCerts = await Certificate.countDocuments({ status: 'approved' });
  assert(approvedCerts >= 3, 'Data: >=3 approved certificates (got ' + approvedCerts + ')');

  var Feedback = (await import('../models/Feedback.js')).default;
  var feedbackCount = await Feedback.countDocuments();
  assert(feedbackCount >= 5, 'Data: >=5 feedback entries (got ' + feedbackCount + ')');

  // === RESULTS ===
  console.log('');
  console.log('=== Results: ' + passed + ' passed, ' + failed + ' failed ===');

  if (failures.length > 0) {
    console.log('');
    console.log('Failures:');
    failures.forEach(function(f) { console.log('  FAIL: ' + f); });
  }

  console.log(failed === 0 ? '' : '');
  console.log(failed === 0 ? 'ALL TESTS PASSED' : failed + ' TESTS FAILED');

  await mongoose.disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(function(err) {
  console.error('Fatal test error:', err);
  process.exit(1);
});
