/**
 * Kalvi Vaayil — HTTP Workflow Tests
 *
 * Returns JSON results so it can be triggered via GET /api/run-tests
 * on Render (no shell needed) or Vercel.
 *
 * Every flow is wrapped in try-catch so a single failure never crashes the run.
 */
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
import Feedback from '../models/Feedback.js';
import { runSeed } from '../seed.js';

import * as registrationCtrl from '../controllers/registrationController.js';
import * as gatePassCtrl from '../controllers/gatePassController.js';
import * as presenceCtrl from '../controllers/presenceController.js';
import * as workshopCtrl from '../controllers/workshopController.js';
import * as certificateCtrl from '../controllers/certificateController.js';

function mockReq(overrides) {
  return Object.assign({ params: {}, query: {}, body: {}, headers: {}, user: null, organizerSettings: null }, overrides || {});
}

function mockRes() {
  var res = { _status: 200, _body: null };
  res.status = function(code) { res._status = code; return res; };
  res.json = function(body) { res._body = body; return res; };
  return res;
}

export async function runTests() {
  var results = [];
  var passed = 0;
  var failed = 0;

  function check(condition, label) {
    if (condition) { passed++; results.push({ status: 'pass', label: label }); }
    else { failed++; results.push({ status: 'fail', label: label }); }
  }

  // Seed fresh data
  try {
    await runSeed();
    check(true, 'Seed: Database seeded successfully');
  } catch (seedErr) {
    check(false, 'Seed: ' + seedErr.message);
    return { summary: { passed: passed, failed: failed, total: passed + failed }, allPassed: false, results: results, error: seedErr.message };
  }

  // Fixtures
  var participant = await User.findOne({ role: 'participant', email: 'arul@student.edu' });
  var participant2 = await User.findOne({ role: 'participant', email: 'kavya@student.edu' });
  var organizer = await User.findOne({ role: 'organizer', email: 'priya@kalvivaayil.edu' });
  var admin = await User.findOne({ role: 'admin' });

  check(!!participant, 'Fixture: participant (Arul) exists');
  check(!!organizer, 'Fixture: organizer (Priya) exists');
  check(!!admin, 'Fixture: admin exists');

  var physicalWorkshop = await Workshop.findOne({ mode: 'physical', status: 'published' });
  check(!!physicalWorkshop, 'Fixture: physical published workshop exists');

  var onlineWorkshop = await Workshop.findOne({ mode: 'online', status: 'published' });
  check(!!onlineWorkshop, 'Fixture: online published workshop exists');

  // === FLOW A: GatePass ===
  try {
    if (!physicalWorkshop || !participant || !organizer) {
      check(false, 'Flow A: SKIPPED — missing fixtures');
    } else {
      await Registration.deleteMany({ user: participant._id, workshop: physicalWorkshop._id });
      await GatePass.deleteMany({ user: participant._id, workshop: physicalWorkshop._id });
      await Notification.deleteMany({ user: participant._id, type: 'gate_pass' });

      var regReq = mockReq({ params: { workshopId: physicalWorkshop._id.toString() }, user: participant });
      var regRes = mockRes();
      await registrationCtrl.registerForWorkshop(regReq, regRes);
      check(regRes._status === 201, 'A1: Registration returns 201');
      check(regRes._body && regRes._body.status === 'confirmed', 'A1: Registration status confirmed');

      var gatePass = await GatePass.findOne({ user: participant._id, workshop: physicalWorkshop._id });
      check(!!gatePass, 'A2: GatePass auto-created');
      check(gatePass && !!gatePass.token && gatePass.token.length > 20, 'A2: GatePass has valid JWT');

      var gatePassNotif = await Notification.findOne({ user: participant._id, type: 'gate_pass' });
      check(!!gatePassNotif, 'A3: gate_pass notification created');
      check(gatePassNotif && gatePassNotif.title.indexOf(physicalWorkshop.title) >= 0, 'A3: Notification has workshop name');

      var today = new Date();
      today.setHours(10, 0, 0, 0);
      var tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      // Find or create a session specifically for TODAY (scanGatePass requires startTime between today 00:00 and tomorrow 00:00)
      var todaySession = await Session.findOne({
        workshop: physicalWorkshop._id,
        startTime: { $gte: today, $lt: tomorrow }
      });
      if (!todaySession) {
        todaySession = await Session.create({
          workshop: physicalWorkshop._id, title: 'Test Scan Session', date: today,
          startTime: today, endTime: new Date(today.getTime() + 7200000), attendanceMode: 'qr', createdBy: physicalWorkshop.organizer,
        });
      }

      if (gatePass && gatePass.token) {
        var scanReq = mockReq({ body: { token: gatePass.token }, user: organizer });
        var scanRes = mockRes();
        await gatePassCtrl.scanGatePass(scanReq, scanRes);
        check(scanRes._status === 200, 'A4: QR scan returns 200');
        check(scanRes._body && scanRes._body.success === true, 'A4: Scan success');
      } else {
        check(false, 'A4: SKIPPED — no gatepass token');
      }

      var attendance = await Attendance.findOne({ session: todaySession._id, user: participant._id });
      check(!!attendance, 'A5: Attendance record exists');
      check(attendance && attendance.status === 'present', 'A5: Attendance is present');
      check(attendance && attendance.method === 'qr', 'A5: Method is qr');
    }
  } catch (flowAErr) {
    check(false, 'Flow A CRASH: ' + flowAErr.message);
  }

  // === FLOW B: Anti-Idle Presence ===
  try {
    if (!onlineWorkshop || !participant || !organizer) {
      check(false, 'Flow B: SKIPPED — missing fixtures');
    } else {
      await Registration.deleteMany({ user: participant._id, workshop: onlineWorkshop._id });
      await Registration.create({ user: participant._id, workshop: onlineWorkshop._id, status: 'confirmed', mode: 'online' });

      var onlineSession = await Session.findOne({ workshop: onlineWorkshop._id });
      if (!onlineSession) {
        var sdB = new Date();
        onlineSession = await Session.create({
          workshop: onlineWorkshop._id, title: 'Online Test', date: sdB,
          startTime: new Date(sdB.setHours(10, 0, 0, 0)), endTime: new Date(sdB.setHours(12, 0, 0, 0)),
          attendanceMode: 'manual', createdBy: organizer._id,
        });
      }

      var chReq = mockReq({ params: { sessionId: onlineSession._id.toString() }, user: participant });
      var chRes = mockRes();
      await presenceCtrl.createPresenceChallenge(chReq, chRes);
      check(chRes._status === 200, 'B1: Challenge returns 200');
      check(chRes._body && !!chRes._body.windowStart, 'B1: Has windowStart');
      check(chRes._body && !!chRes._body.windowEnd, 'B1: Has windowEnd');

      if (chRes._body && chRes._body.windowStart && chRes._body.windowEnd) {
        var cfReq = mockReq({
          params: { sessionId: onlineSession._id.toString() },
          body: { windowStart: chRes._body.windowStart, windowEnd: chRes._body.windowEnd },
          user: participant,
        });
        var cfRes = mockRes();
        await presenceCtrl.confirmPresence(cfReq, cfRes);
        check(cfRes._status === 200, 'B2: Confirm returns 200');
        check(cfRes._body && cfRes._body.confirmed === true, 'B2: Confirmed');

        var pAtt = await Attendance.findOne({ session: onlineSession._id, user: participant._id });
        check(!!pAtt, 'B3: Attendance record exists');
        check(pAtt && pAtt.status === 'present', 'B3: Status is present');
        check(cfRes._body && typeof cfRes._body.attendancePercent === 'number', 'B4: attendancePercent is number');
        check(cfRes._body && cfRes._body.attendancePercent >= 0 && cfRes._body.attendancePercent <= 100, 'B4: attendancePercent 0-100');
      } else {
        check(false, 'B2-B4: SKIPPED — no challenge window');
      }

      var pc = await PresenceCheck.findOne({ session: onlineSession._id, user: participant._id });
      check(!!pc, 'B5: PresenceCheck record exists');
    }
  } catch (flowBErr) {
    check(false, 'Flow B CRASH: ' + flowBErr.message);
  }

  // === FLOW C: Announcements ===
  try {
    if (!onlineWorkshop || !participant || !participant2) {
      check(false, 'Flow C: SKIPPED — missing fixtures');
    } else {
      // Get the actual owner of the online workshop for authorization
      var onlineWorkshopOwner = await User.findById(onlineWorkshop.organizer);
      if (!onlineWorkshopOwner) {
        check(false, 'Flow C: SKIPPED — workshop owner not found');
      } else {
        await Registration.deleteMany({ workshop: onlineWorkshop._id });
        await Registration.insertMany([
          { user: participant._id, workshop: onlineWorkshop._id, status: 'confirmed', mode: 'online' },
          { user: participant2._id, workshop: onlineWorkshop._id, status: 'confirmed', mode: 'online' },
        ]);
        await Notification.deleteMany({ type: 'announcement', relatedEntityId: onlineWorkshop._id });

        var anReq = mockReq({
          params: { id: onlineWorkshop._id.toString() },
          body: { title: 'Test Announcement', message: 'Verification test message.' },
          user: onlineWorkshopOwner,
        });
        var anRes = mockRes();
        await workshopCtrl.postAnnouncement(anReq, anRes);
        check(anRes._status === 201, 'C1: Post announcement returns 201');
        check(anRes._body && !!anRes._body.announcement, 'C1: Has announcement object');
        check(anRes._body && anRes._body.announcement && anRes._body.announcement.title === 'Test Announcement', 'C1: Title matches');

        var uw = await Workshop.findById(onlineWorkshop._id);
        check(uw && uw.announcements && uw.announcements.some(function(a) { return a.title === 'Test Announcement'; }), 'C2: Stored in workshop');

        var anNotifs = await Notification.find({ type: 'announcement', relatedEntityId: onlineWorkshop._id });
        check(anNotifs.length >= 2, 'C3: Notifications sent to >=2 participants');
        check(!!anNotifs.find(function(n) { return n.user.toString() === participant._id.toString(); }), 'C3: P1 notified');
        check(!!anNotifs.find(function(n) { return n.user.toString() === participant2._id.toString(); }), 'C3: P2 notified');

        var gaReq = mockReq({ params: { id: onlineWorkshop._id.toString() } });
        var gaRes = mockRes();
        await workshopCtrl.getAnnouncements(gaReq, gaRes);
        check(gaRes._status === 200, 'C4: GET announcements returns 200');
        check(Array.isArray(gaRes._body), 'C4: Response is array');
        check(gaRes._body && gaRes._body.length >= 1, 'C4: At least 1 announcement');
      }
    }
  } catch (flowCErr) {
    check(false, 'Flow C CRASH: ' + flowCErr.message);
  }

  // === FLOW D: Certificates ===
  try {
    var pastWs = await Workshop.findOne({ status: 'completed' });
    check(!!pastWs, 'Fixture: completed workshop exists');

    if (!pastWs || !participant) {
      check(false, 'Flow D: SKIPPED — missing fixtures');
    } else {
      // Ensure sessions exist for the past workshop
      var totSess = await Session.countDocuments({ workshop: pastWs._id });
      if (totSess === 0) {
        for (var si = 0; si < 5; si++) {
          var sdD = new Date(); sdD.setDate(sdD.getDate() - 14 + si);
          await Session.create({
            workshop: pastWs._id, title: 'Makeup Session ' + (si + 1), date: sdD,
            startTime: new Date(sdD.setHours(10, 0, 0, 0)), endTime: new Date(sdD.setHours(12, 0, 0, 0)),
            attendanceMode: 'manual', createdBy: pastWs.organizer,
          });
        }
        totSess = 5;
      }

      // Ensure participant has attendance records for EVERY session
      var allSessions = await Session.find({ workshop: pastWs._id });
      for (var si2 = 0; si2 < allSessions.length; si2++) {
        var existing = await Attendance.findOne({ session: allSessions[si2]._id, user: participant._id });
        if (!existing) {
          await Attendance.create({
            session: allSessions[si2]._id, user: participant._id,
            workshop: pastWs._id, status: 'present', method: 'manual',
          });
        }
      }

      // Ensure >= 80% are present
      var exPres = await Attendance.countDocuments({ workshop: pastWs._id, user: participant._id, status: 'present' });
      if (totSess > 0) {
        var curPct = Math.round((exPres / totSess) * 100);
        if (curPct < 80) {
          var needed = Math.ceil(totSess * 0.8);
          var absRecs = await Attendance.find({ workshop: pastWs._id, user: participant._id, status: 'absent' }).limit(needed - exPres);
          for (var j = 0; j < absRecs.length; j++) { absRecs[j].status = 'present'; await absRecs[j].save(); }
        }
      }

      // Verify final attendance
      var finalPres = await Attendance.countDocuments({ workshop: pastWs._id, user: participant._id, status: 'present' });
      var finalPct = totSess > 0 ? Math.round((finalPres / totSess) * 100) : 0;
      check(finalPct >= 80, 'D0: Attendance >= 80% before cert check (got ' + finalPct + '%)');

      await Certificate.deleteMany({ user: participant._id, workshop: pastWs._id });

      var ceReq = mockReq({ params: { workshopId: pastWs._id.toString() }, body: { quizScore: 90 }, user: participant });
      var ceRes = mockRes();
      await certificateCtrl.checkCertificateEligibility(ceReq, ceRes);
      check(ceRes._status === 200, 'D1: Eligibility returns 200');

      var cert = await Certificate.findOne({ user: participant._id, workshop: pastWs._id });
      check(!!cert, 'D2: Certificate exists');
      check(cert && cert.status === 'approved', 'D2: Status approved');
      check(cert && !!cert.certificateId && cert.certificateId.indexOf('-') > 0, 'D3: UUID certificateId');
      check(cert && !!cert.issuedAt, 'D4: Has issuedAt');
      check(cert && typeof cert.attendancePercent === 'number' && cert.attendancePercent >= 80, 'D5: attendancePercent >= 80');
      check(cert && typeof cert.testScore === 'number' && cert.testScore > 0, 'D6: Has testScore');

      if (cert && cert.certificateId) {
        var vReq = mockReq({ params: { certificateId: cert.certificateId } });
        var vRes = mockRes();
        await certificateCtrl.verifyCertificate(vReq, vRes);
        check(vRes._status === 200, 'D7: Verification returns 200');
        check(vRes._body && vRes._body.valid === true, 'D7: Valid');
        check(vRes._body && vRes._body.certificateId === cert.certificateId, 'D7: certificateId matches');
        check(vRes._body && !!vRes._body.participantName, 'D7: Has participantName');
        check(vRes._body && !!vRes._body.workshopTitle, 'D7: Has workshopTitle');
      } else {
        check(false, 'D7: SKIPPED — no certificate to verify');
      }
    }
  } catch (flowDErr) {
    check(false, 'Flow D CRASH: ' + flowDErr.message);
  }

  // === Schema & Data Integrity ===
  try {
    var catCount = await WorkshopCategory.countDocuments();
    check(catCount === 6, 'Schema: 6 categories (got ' + catCount + ')');
    var cat1 = await WorkshopCategory.findOne();
    check(cat1 && !!cat1.name && !!cat1.name.en && !!cat1.name.ta, 'Schema: Bilingual names');
    var pCount = await User.countDocuments({ role: 'participant' });
    check(pCount === 5, 'Schema: 5 participants (got ' + pCount + ')');

    var nw = new Date();
    var ts = new Date(nw.getFullYear(), nw.getMonth(), nw.getDate());
    var te = new Date(ts); te.setDate(te.getDate() + 1);
    var tsc = await Session.countDocuments({ date: { $gte: ts, $lt: te } });
    check(tsc >= 2, 'Data: >=2 today sessions (got ' + tsc + ')');

    var ac = await Certificate.countDocuments({ status: 'approved' });
    check(ac >= 3, 'Data: >=3 approved certs (got ' + ac + ')');

    var fc = await Feedback.countDocuments();
    check(fc >= 5, 'Data: >=5 feedback entries (got ' + fc + ')');
  } catch (schemaErr) {
    check(false, 'Schema checks CRASH: ' + schemaErr.message);
  }

  return {
    summary: { passed: passed, failed: failed, total: passed + failed },
    allPassed: failed === 0,
    results: results,
  };
}
