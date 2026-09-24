import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { pathToFileURL } from 'node:url';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import OrganizerSettings from './models/OrganizerSettings.js';
import WorkshopCategory from './models/WorkshopCategory.js';
import Workshop from './models/Workshop.js';
import Session from './models/Session.js';
import Registration from './models/Registration.js';
import Resource from './models/Resource.js';
import Announcement from './models/Announcement.js';
import Attendance from './models/Attendance.js';
import QuotaRequest from './models/QuotaRequest.js';
import AppSettings from './models/AppSettings.js';
import Feedback from './models/Feedback.js';
import Waitlist from './models/Waitlist.js';
import GatePass from './models/GatePass.js';
import Certificate from './models/Certificate.js';
import Notification from './models/Notification.js';
import PresenceCheck from './models/PresenceCheck.js';
import PresenceChallenge from './models/PresenceChallenge.js';
import SessionJoin from './models/SessionJoin.js';
import CommunityPost from './models/CommunityPost.js';
import crypto from 'crypto';

/**
 * Seed the database with rich, dynamic mock data.
 *
 * Connection ownership stays with the caller: the server imports this module to
 * auto-seed on boot and reuses its live mongoose connection, while the CLI entry
 * point at the bottom of this file connects explicitly. This function must never
 * call mongoose.disconnect() — running inside the server process, that would tear
 * down the connection every later request depends on.
 */
export async function runSeed() {
  // Clear ALL collections sequentially to avoid unique-index race conditions
  // that can occur when Promise.all fires concurrent deleteMany operations
  // against collections with unique indexes (e.g. User.email).
  const collections = [
    Notification, PresenceChallenge, PresenceCheck, SessionJoin, CommunityPost,
    GatePass, Certificate, Attendance, Feedback, Waitlist,
    Registration, Session, Resource, Announcement,
    Workshop, WorkshopCategory, QuotaRequest, AppSettings,
    OrganizerSettings, User,
  ];
  for (const model of collections) {
    await model.deleteMany({});
  }
  console.log('Cleared existing data');

  const hash = (pw) => bcrypt.hash(pw, 12);
  const now = new Date();

  // ─── Helper: create a date relative to today ───
  const daysAgo = (d) => { const dt = new Date(now); dt.setDate(dt.getDate() - d); return dt; };
  const daysFromNow = (d) => { const dt = new Date(now); dt.setDate(dt.getDate() + d); return dt; };
  const atHour = (date, h, m = 0) => { const dt = new Date(date); dt.setHours(h, m, 0, 0); return dt; };

  // ─── 1 Admin ───
  const admin = await User.create({
    email: 'admin@kalvivaayil.edu',
    passwordHash: await hash('admin123'),
    name: 'Dr. Meenakshi Sundaram',
    role: 'admin',
    phone: '+91-9876543210',
    language: 'ta',
  });

  // ─── 3 Organizers ───
  const org1 = await User.create({
    email: 'priya@kalvivaayil.edu',
    passwordHash: await hash('organizer123'),
    name: 'Priya Lakshmi',
    role: 'organizer',
    phone: '+91-9876543211',
    bio: 'Passionate about bringing technology to rural Tamil Nadu.',
    qualifications: ['M.Tech Computer Science', 'Google Certified Educator'],
    language: 'ta',
  });

  const org2 = await User.create({
    email: 'karthik@kalvivaayil.edu',
    passwordHash: await hash('organizer123'),
    name: 'Karthik Rajan',
    role: 'organizer',
    phone: '+91-9876543212',
    bio: 'AI researcher and educator focused on making ML accessible.',
    qualifications: ['PhD Artificial Intelligence', 'Published 15+ research papers'],
    language: 'en',
  });

  const org3 = await User.create({
    email: 'divya@kalvivaayil.edu',
    passwordHash: await hash('organizer123'),
    name: 'Divya Bharathi',
    role: 'organizer',
    phone: '+91-9876543213',
    bio: 'Full-stack developer and open source contributor.',
    qualifications: ['B.Tech IT', 'AWS Solutions Architect', 'Mozilla Tech Speaker'],
    language: 'ta',
  });

  await OrganizerSettings.insertMany([
    { user: org1._id, isActive: true, maxWorkshopsPerWeek: 5, maxPhysicalEventsPerMonth: 4, maxOnlineEventsPerMonth: 10, canHostPhysicalEvents: true, maxWorkshopsLimit: 10, maxParticipantsPerWorkshop: 100, rating: 4.5, totalRatings: 12 },
    { user: org2._id, isActive: true, maxWorkshopsPerWeek: 3, maxPhysicalEventsPerMonth: 2, maxOnlineEventsPerMonth: 8, canHostPhysicalEvents: false, maxWorkshopsLimit: 8, maxParticipantsPerWorkshop: 80, rating: 4.8, totalRatings: 8 },
    { user: org3._id, isActive: true, accessFrom: daysAgo(30), maxWorkshopsPerWeek: 4, maxPhysicalEventsPerMonth: 3, maxOnlineEventsPerMonth: 12, canHostPhysicalEvents: true, maxWorkshopsLimit: 12, maxParticipantsPerWorkshop: 120, rating: 4.2, totalRatings: 15 },
  ]);

  // ─── 5 Participants ───
  const participants = await User.insertMany([
    { email: 'arul@student.edu', passwordHash: await hash('student123'), name: 'Arul Mozhi', role: 'participant', interests: ['Python', 'AI', 'Agriculture'], language: 'ta' },
    { email: 'kavya@student.edu', passwordHash: await hash('student123'), name: 'Kavya Sri', role: 'participant', interests: ['Web Development', 'Design'], language: 'en' },
    { email: 'mugilan@student.edu', passwordHash: await hash('student123'), name: 'Mugilan V.', role: 'participant', interests: ['Tamil Computing', 'NLP'], language: 'ta' },
    { email: 'deepa@student.edu', passwordHash: await hash('student123'), name: 'Deepa Rani', role: 'participant', interests: ['Data Science', 'Machine Learning'], language: 'en' },
    { email: 'surya@student.edu', passwordHash: await hash('student123'), name: 'Surya Prakash', role: 'participant', interests: ['IoT', 'Embedded Systems', 'Smart Farming'], language: 'ta' },
  ]);

  // ─── 6 Bilingual Categories (Tamil Literature focus) ───
  const categories = await WorkshopCategory.insertMany([
    { name: { en: 'Tamil Literature', ta: 'தமிழ் இலக்கியம்' }, description: { en: 'Classical and modern Tamil literary works', ta: 'செம்மொழி மற்றும் நவீன தமிழ் இலக்கியங்கள்' }, createdBy: admin._id },
    { name: { en: 'Sangam Poetry', ta: 'சங்க இலக்கியம்' }, description: { en: 'Ettuthokai, Pathupattu, and Tinai concepts', ta: 'எட்டுத்தொகை, பத்துப்பாட்டு, திணைக் கோட்பாடுகள்' }, createdBy: admin._id },
    { name: { en: 'Epics & Classical Works', ta: 'காப்பியங்கள் & செம்மொழி நூல்கள்' }, description: { en: 'Silappadikaram, Manimekalai, and Kambaramayanam', ta: 'சிலப்பதிகாரம், மணிமேகலை, கம்பராமாயணம்' }, createdBy: admin._id },
    { name: { en: 'Modern Tamil Prose', ta: 'நவீன தமிழ் உரைநடை' }, description: { en: 'Contemporary fiction, essays, and creative writing', ta: 'நவீன புனைகதை, கட்டுரை, படைப்பிலக்கியம்' }, createdBy: admin._id },
    { name: { en: 'Tamil Grammar', ta: 'தமிழ் இலக்கணம்' }, description: { en: 'Tolkappiyam, Nannool, and classical grammar', ta: 'தொல்காப்பியம், நன்னூல், செம்மொழி இலக்கணம்' }, createdBy: admin._id },
    { name: { en: 'Digital Tamil', ta: 'டிஜிட்டல் தமிழ்' }, description: { en: 'Tamil NLP, Unicode, computing and language tech', ta: 'தமிழ் மொழி நிரல், யூனிகோட், கணினி தொழில்நுட்பம்' }, createdBy: admin._id },
  ]);

  // ════════════════════════════════════════════════════════════
  // PAST WORKSHOPS (2–3 weeks ago) — 3 completed workshops
  // ════════════════════════════════════════════════════════════
  const pastWorkshopDefs = [
    {
      title: 'Sangam Poetry Deep Dive — Kurunthokai Analysis / குறுந்தொகை ஆய்வு',
      description: 'An intensive 5-session exploration of Kurunthokai poems with Tinai landscape analysis.',
      topics: ['Kurunthokai', 'Tinai', 'Sangam Poetry', 'Love & War Landscapes'],
      type: categories[1]._id,
      organizer: org1._id,
      mode: 'online',
      capacity: 40,
      daysAgoStart: 21,
      daysAgoEnd: 14,
      sessionCount: 5,
    },
    {
      title: 'Silappadikaram & Epic Tamil Literature / சிலப்பதிகாரமும் காப்பிய இலக்கியமும்',
      description: 'Study of the great Tamil epic Silappadikaram — its narrative structure, characters, and cultural significance.',
      topics: ['Silappadikaram', 'Kannagi', 'Epic Poetry', 'Tamil Culture'],
      type: categories[2]._id,
      organizer: org2._id,
      mode: 'hybrid',
      venue: 'Classical Hall, Block A',
      capacity: 35,
      daysAgoStart: 18,
      daysAgoEnd: 12,
      sessionCount: 4,
    },
    {
      title: 'Modern Tamil Creative Writing / நவீன தமிழ் படைப்பிலக்கியம்',
      description: 'Hands-on workshop on short story writing, character building, and dialogue inspired by Pudumaipithan and Jeyakanthan.',
      topics: ['Pudumaipithan', 'Short Stories', 'Character Building', 'Dialogue Writing'],
      type: categories[3]._id,
      organizer: org3._id,
      mode: 'online',
      capacity: 30,
      daysAgoStart: 15,
      daysAgoEnd: 10,
      sessionCount: 4,
    },
  ];

  const pastWorkshops = [];
  // Deterministic attendance ratios per participant: [80%, 100%, 75%, 80%, 90%]
  const attendanceRatios = [0.80, 1.00, 0.75, 0.80, 0.90];

  for (const def of pastWorkshopDefs) {
    const startDate = daysAgo(def.daysAgoStart);
    const endDate = daysAgo(def.daysAgoEnd);

    const ws = await Workshop.create({
      title: def.title,
      description: def.description,
      topics: def.topics,
      type: def.type,
      organizer: def.organizer,
      schedule: { startDate, endDate },
      capacity: def.capacity,
      mode: def.mode,
      venue: def.venue || '',
      status: 'completed',
      attendanceSettings: { alertIntervalMinutes: 5, maxAllowedMissedAlerts: 3 },
      passingScore: 60,
      createdAt: startDate,
    });
    pastWorkshops.push(ws);

    // Create sessions spread across the workshop duration
    const sessions = [];
    for (let s = 0; s < def.sessionCount; s++) {
      const dayOffset = Math.round((def.daysAgoStart - def.daysAgoEnd) * s / (def.sessionCount - 1 || 1));
      const sessDate = daysAgo(def.daysAgoStart - dayOffset);
      const sess = await Session.create({
        workshop: ws._id,
        title: `Session ${s + 1}: ${['Introduction', 'Core Concepts', 'Deep Dive', 'Practice', 'Final Review'][s] || `Part ${s + 1}`}`,
        date: sessDate,
        startTime: atHour(sessDate, 10),
        endTime: atHour(sessDate, 12),
        googleMeetLink: `https://meet.google.com/past-${ws._id.toString().slice(-6)}-${s}`,
        attendanceMode: 'manual',
        createdBy: def.organizer,
      });
      sessions.push(sess);
    }

    // Create registrations for all 5 participants
    for (const p of participants) {
      await Registration.create({
        user: p._id,
        workshop: ws._id,
        status: 'confirmed',
        mode: def.mode === 'hybrid' ? 'both' : (def.mode === 'physical' ? 'physical' : 'online'),
      });
    }

    // Create deterministic attendance records (75%–100% per participant)
    for (let pi = 0; pi < participants.length; pi++) {
      const p = participants[pi];
      const ratio = attendanceRatios[pi];
      const presentCount = Math.round(sessions.length * ratio);

      for (let si = 0; si < sessions.length; si++) {
        const isPresent = si < presentCount;
        await Attendance.create({
          session: sessions[si]._id,
          user: p._id,
          workshop: ws._id,
          status: isPresent ? 'present' : 'absent',
          method: 'manual',
          markedAt: sessions[si].startTime,
        });
      }
    }

    // Create certificates for participants with ≥ 80% attendance
    for (let pi = 0; pi < participants.length; pi++) {
      const p = participants[pi];
      const presentCount = await Attendance.countDocuments({
        workshop: ws._id, user: p._id, status: 'present',
      });
      const pct = Math.round((presentCount / sessions.length) * 100);

      if (pct >= 80) {
        await Certificate.create({
          user: p._id,
          workshop: ws._id,
          certificateId: crypto.randomUUID(),
          status: 'approved',
          attendancePercent: pct,
          testScore: 85 + Math.floor(Math.random() * 14), // 85–98%
          issuedAt: endDate,
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════
  // TODAY'S LIVE SESSIONS — 2 sessions with valid Google Meet links
  // ════════════════════════════════════════════════════════════
  const todayStart1 = atHour(now, Math.max(now.getHours() - 1, 9), 0);
  const todayEnd1 = new Date(todayStart1);
  todayEnd1.setHours(todayEnd1.getHours() + 2);

  const todayStart2 = atHour(now, Math.max(now.getHours(), 10), 30);
  const todayEnd2 = new Date(todayStart2);
  todayEnd2.setHours(todayEnd2.getHours() + 1, 30);

  // We need workshops for today's sessions — create 2 quick "current" workshops
  const todayWs1 = await Workshop.create({
    title: 'Tolkappiyam Grammar Workshop / தொல்காப்பிய இலக்கணப் பயிலரங்கம்',
    description: 'Live session on Eluthathikaram and Sollathikaram — the foundational grammar of Tamil.',
    topics: ['Tolkappiyam', 'Eluthathikaram', 'Sollathikaram', 'Tamil Grammar'],
    type: categories[4]._id,
    organizer: org1._id,
    schedule: { startDate: daysAgo(2), endDate: daysFromNow(5) },
    capacity: 40,
    mode: 'online',
    status: 'published',
    attendanceSettings: { alertIntervalMinutes: 5, maxAllowedMissedAlerts: 3 },
  });

  const todayWs2 = await Workshop.create({
    title: 'Digital Tamil & Unicode Tools / டிஜிட்டல் தமிழ் & யூனிகோட் கருவிகள்',
    description: 'Build Tamil language digital tools — Unicode processing, text-to-speech, and open-source font development.',
    topics: ['Unicode', 'Tamil NLP', 'Text-to-Speech', 'Open Source Fonts'],
    type: categories[5]._id,
    organizer: org2._id,
    schedule: { startDate: daysAgo(1), endDate: daysFromNow(7) },
    capacity: 45,
    mode: 'hybrid',
    venue: 'Computer Lab, Block B',
    status: 'published',
    attendanceSettings: { alertIntervalMinutes: 5, maxAllowedMissedAlerts: 3 },
  });

  const liveSession1 = await Session.create({
    workshop: todayWs1._id,
    title: 'Live: Tolkappiyam — Core Sutras Analysis',
    date: now,
    startTime: todayStart1,
    endTime: todayEnd1,
    googleMeetLink: 'https://meet.google.com/abc-defg-hij',
    attendanceMode: 'manual',
    createdBy: org1._id,
  });

  const liveSession2 = await Session.create({
    workshop: todayWs2._id,
    title: 'Live: Tamil Unicode Processing & Font Dev',
    date: now,
    startTime: todayStart2,
    endTime: todayEnd2,
    googleMeetLink: 'https://meet.google.com/klm-nopq-rst',
    attendanceMode: 'manual',
    createdBy: org2._id,
  });

  // Register participants for today's workshops
  for (const p of participants.slice(0, 4)) {
    await Registration.create({ user: p._id, workshop: todayWs1._id, status: 'confirmed', mode: 'online' });
  }
  for (const p of participants.slice(1, 5)) {
    await Registration.create({ user: p._id, workshop: todayWs2._id, status: 'confirmed', mode: 'online' });
  }

  // ════════════════════════════════════════════════════════════
  // UPCOMING WORKSHOPS — 4 workshops at +1, +3, +5, +7 days
  // ════════════════════════════════════════════════════════════
  const upcomingDefs = [
    {
      title: 'Kurunthokai Love Poetry & Tinai Landscapes / குறுந்தொகை அகப்பாடலும் திணையும்',
      description: 'Explore the five Tinai landscapes and how they mirror human emotions in Sangam love poetry.',
      topics: ['Kurunthokai', 'Tinai', 'Akam Poetry', 'Love Landscapes'],
      type: categories[1]._id,
      organizer: org1._id,
      mode: 'hybrid',
      venue: 'Classical Hall, Block A',
      capacity: 50,
      startsIn: 1,
      endsIn: 8,
    },
    {
      title: 'Manimekalai — Buddhist Tamil Epic / மணிமேகலை — பௌத்த தமிழ்க் காப்பியம்',
      description: 'A deep study of Manimekalai, its philosophical themes, and its place in world Buddhist literature.',
      topics: ['Manimekalai', 'Buddhism', 'Tamil Epic', 'Philosophy'],
      type: categories[2]._id,
      organizer: org2._id,
      mode: 'online',
      capacity: 40,
      startsIn: 3,
      endsIn: 10,
    },
    {
      title: 'Nannool — Advanced Tamil Grammar / நன்னூல் — மேம்பட்ட தமிழ் இலக்கணம்',
      description: 'Master the Nannool grammar text — its structure, rules, and relevance to modern Tamil writing.',
      topics: ['Nannool', 'Grammar Rules', 'Pannir Padalam', 'Tamil Syntax'],
      type: categories[4]._id,
      organizer: org1._id,
      mode: 'physical',
      venue: 'Tamil Research Centre',
      capacity: 30,
      startsIn: 5,
      endsIn: 14,
    },
    {
      title: 'Tamil NLP & Machine Translation / தமிழ் மொழிபெயர்ப்பு & இயந்திர மொழிபெயர்ப்பு',
      description: 'Build machine translation systems for Tamil using modern NLP techniques and open-source tools.',
      topics: ['Machine Translation', 'Tamil NLP', 'Neural Networks', 'Corpus Building'],
      type: categories[5]._id,
      organizer: org3._id,
      mode: 'hybrid',
      venue: 'Computer Lab, Block B',
      capacity: 45,
      startsIn: 7,
      endsIn: 18,
    },
  ];

  const upcomingWorkshops = [];
  for (const def of upcomingDefs) {
    const ws = await Workshop.create({
      title: def.title,
      description: def.description,
      topics: def.topics,
      type: def.type,
      organizer: def.organizer,
      schedule: { startDate: daysFromNow(def.startsIn), endDate: daysFromNow(def.endsIn) },
      capacity: def.capacity,
      mode: def.mode,
      venue: def.venue || '',
      status: 'published',
      attendanceSettings: { alertIntervalMinutes: 5, maxAllowedMissedAlerts: 3 },
    });
    upcomingWorkshops.push(ws);

    // Create 4 sessions per upcoming workshop
    for (let s = 0; s < 4; s++) {
      const sessDate = daysFromNow(def.startsIn + Math.round((def.endsIn - def.startsIn) * s / 3));
      await Session.create({
        workshop: ws._id,
        title: ['Introduction & Overview', 'Core Concepts', 'Hands-on Practice', 'Final Presentations'][s],
        date: sessDate,
        startTime: atHour(sessDate, 10),
        endTime: atHour(sessDate, 12),
        googleMeetLink: def.mode !== 'physical' ? `https://meet.google.com/upc-${ws._id.toString().slice(-6)}-${s}` : '',
        attendanceMode: 'manual',
        createdBy: def.organizer,
      });
    }
  }

  // Register some participants for upcoming workshops
  await Registration.insertMany([
    { user: participants[0]._id, workshop: upcomingWorkshops[0]._id, status: 'confirmed', mode: 'physical' },
    { user: participants[1]._id, workshop: upcomingWorkshops[0]._id, status: 'confirmed', mode: 'online' },
    { user: participants[2]._id, workshop: upcomingWorkshops[0]._id, status: 'confirmed', mode: 'both' },
    { user: participants[0]._id, workshop: upcomingWorkshops[1]._id, status: 'confirmed', mode: 'online' },
    { user: participants[3]._id, workshop: upcomingWorkshops[1]._id, status: 'confirmed', mode: 'online' },
    { user: participants[4]._id, workshop: upcomingWorkshops[2]._id, status: 'confirmed', mode: 'physical' },
    { user: participants[2]._id, workshop: upcomingWorkshops[2]._id, status: 'confirmed', mode: 'physical' },
    { user: participants[1]._id, workshop: upcomingWorkshops[3]._id, status: 'confirmed', mode: 'online' },
    { user: participants[3]._id, workshop: upcomingWorkshops[3]._id, status: 'confirmed', mode: 'online' },
    { user: participants[4]._id, workshop: upcomingWorkshops[3]._id, status: 'confirmed', mode: 'both' },
  ]);

  // ─── Quota Requests ───
  await QuotaRequest.insertMany([
    {
      organizer: org1._id,
      type: 'physical',
      currentLimit: 4,
      requestedLimit: 8,
      reason: 'High demand for in-person Tamil literature workshops in Tirunelveli district.',
      status: 'pending',
    },
    {
      organizer: org2._id,
      type: 'online',
      currentLimit: 8,
      requestedLimit: 15,
      reason: 'AI workshop series has very high online enrollment. Need more sessions.',
      status: 'pending',
    },
    {
      organizer: org3._id,
      type: 'workshop',
      currentLimit: 4,
      requestedLimit: 6,
      reason: 'Open source contribution workshops are popular across colleges.',
      status: 'approved',
      reviewedBy: admin._id,
      reviewedAt: daysAgo(2),
      reviewNote: 'Approved. Divya has a strong track record.',
    },
  ]);

  // ─── Announcements ───
  await Announcement.create({
    workshop: upcomingWorkshops[0]._id,
    title: 'Welcome to Kurunthokai Workshop! / குறுந்தொகை பயிலரங்கத்திற்கு வரவேற்கிறோம்!',
    content: 'Please read Kurunthokai poems 1-40 before Session 1. Texts will be shared in the resources section. / முதல் அமர்வுக்கு முன் குறுந்தொகை பாடல்கள் 1-40 படிக்கவும்.',
    createdBy: org1._id,
  });

  await Announcement.create({
    workshop: todayWs2._id,
    title: 'Live Session Starting Soon! / நேரடி அமர்வு விரைவில் தொடங்குகிறது!',
    content: 'Please ensure you have the Unicode toolkit installed. Link in resources. / யூனிகோட் கருவித்தொகுப்பு நிறுவப்பட்டிருப்பதை உறுதி செய்யவும்.',
    createdBy: org2._id,
  });

  // ─── Bilingual Feedback & Star Ratings for past workshops ───
  const feedbackEntries = [
    // Past Workshop 1 — Sangam Poetry
    { workshop: pastWorkshops[0]._id, organizer: org1._id, user: participants[0]._id, workshopRating: 5, organizerRating: 5, workshopComment: 'An outstanding session on Sangam poetry! The Tinai analysis was illuminating.', organizerComment: 'Priya madam explained Kurunthokai beautifully.' },
    { workshop: pastWorkshops[0]._id, organizer: org1._id, user: participants[1]._id, workshopRating: 5, organizerRating: 5, workshopComment: 'Best literature workshop I have attended. The landscape-emotion mapping was fascinating.', organizerComment: 'Very engaging teaching style.' },
    { workshop: pastWorkshops[0]._id, organizer: org1._id, user: participants[2]._id, workshopRating: 4, organizerRating: 5, workshopComment: 'Great content, would love more sessions on Pathupattu.', organizerComment: 'Excellent depth of knowledge.' },
    { workshop: pastWorkshops[0]._id, organizer: org1._id, user: participants[3]._id, workshopRating: 5, organizerRating: 5, workshopComment: 'மிகவும் பயனுள்ள பயிலரங்கம்! திணை பற்றிய விளக்கம் அற்புதம்.', organizerComment: 'பிரியா மேடம் மிகவும் நன்றாக கற்பித்தார்.' },
    // Past Workshop 2 — Silappadikaram
    { workshop: pastWorkshops[1]._id, organizer: org2._id, user: participants[0]._id, workshopRating: 5, organizerRating: 4, workshopComment: 'The Silappadikaram analysis was deep and insightful. Kannagi\'s character study was powerful.', organizerComment: 'Karthik sir\'s research background really shows.' },
    { workshop: pastWorkshops[1]._id, organizer: org2._id, user: participants[2]._id, workshopRating: 4, organizerRating: 4, workshopComment: 'சிலப்பதிகாரம் பற்றிய சிறந்த விளக்கம். மேலும் நேரம் தேவை.', organizerComment: 'நல்ல கற்பித்தல் முறை.' },
    { workshop: pastWorkshops[1]._id, organizer: org2._id, user: participants[4]._id, workshopRating: 5, organizerRating: 5, workshopComment: 'An outstanding session on Silappadikaram! Never thought an epic could be so engaging.', organizerComment: 'World-class instruction.' },
    // Past Workshop 3 — Creative Writing
    { workshop: pastWorkshops[2]._id, organizer: org3._id, user: participants[1]._id, workshopRating: 5, organizerRating: 5, workshopComment: 'The Pudumaipithan analysis transformed how I read short stories. Amazing workshop!', organizerComment: 'Divya ma\'am is an incredible mentor.' },
    { workshop: pastWorkshops[2]._id, organizer: org3._id, user: participants[3]._id, workshopRating: 4, organizerRating: 5, workshopComment: 'Loved the hands-on writing exercises. Could use more peer review time.', organizerComment: 'Very supportive and constructive feedback.' },
    { workshop: pastWorkshops[2]._id, organizer: org3._id, user: participants[4]._id, workshopRating: 5, organizerRating: 4, workshopComment: 'புதுமைப்பித்தன் கதைகள் பற்றிய ஆய்வு மிகவும் பயனுள்ளதாக இருந்தது.', organizerComment: 'ஊக்கமளிக்கும் கற்பித்தல்.' },
  ];
  await Feedback.insertMany(feedbackEntries);

  // ─── Waitlist ───
  await Waitlist.insertMany([
    { workshop: upcomingWorkshops[0]._id, user: participants[3]._id, position: 1 },
    { workshop: upcomingWorkshops[0]._id, user: participants[4]._id, position: 2 },
    { workshop: upcomingWorkshops[2]._id, user: participants[0]._id, position: 1 },
  ]);

  // ─── Gate Pass (demo) ───
  const physReg = await Registration.findOne({ user: participants[4]._id, workshop: upcomingWorkshops[2]._id });
  if (physReg) {
    const demoGatePass = await GatePass.create({
      user: participants[4]._id,
      workshop: upcomingWorkshops[2]._id,
      registration: physReg._id,
      token: 'placeholder',
    });
    demoGatePass.token = demoGatePass.generateToken();
    await demoGatePass.save();
  }

  // ─── App Settings ───
  await AppSettings.create({ minAttendancePercent: 80 });

  // ─── Summary ───
  console.log('--- Seed Complete ---');
  console.log('Admin: admin@kalvivaayil.edu / admin123');
  console.log('Organizers: priya@ / karthik@ / divya@kalvivaayil.edu / organizer123');
  console.log('Participants: arul@ / kavya@ / mugilan@ / deepa@ / surya@student.edu / student123');
  console.log('Categories: 6 (Tamil Literature, Sangam Poetry, Epics, Modern Prose, Grammar, Digital Tamil)');
  console.log('Past Workshops: 3 completed (2–3 weeks ago) with realistic attendance (75%–100%)');
  console.log('Today\'s Live Sessions: 2 active sessions with Google Meet links');
  console.log('Upcoming Workshops: 4 (tomorrow, +3, +5, +7 days)');
  console.log('Certificates: Approved for participants with ≥80% attendance');
  console.log('Feedback: 10 bilingual reviews with 4–5 star ratings');
  console.log('Waitlist: 3 entries');
  console.log('Gate Pass: 1 demo pass for physical workshop');
  console.log('Done');
}

// CLI entry point — `npm run seed` or `node src/seed.js`.
const isCliEntry =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCliEntry) {
  connectDB()
    .then(runSeed)
    .then(() => mongoose.disconnect())
    .then(() => console.log('Disconnected'))
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}

export default runSeed;
