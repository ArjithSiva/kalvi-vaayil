export interface User {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'organizer' | 'participant';
  phone?: string;
  profilePic?: string | null;
  bio?: string;
  qualifications?: string[];
  interests?: string[];
  language: 'en' | 'ta';
  darkMode: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizerSettings {
  _id: string;
  user: string;
  isActive: boolean;
  accessFrom: string | null;
  accessUntil: string | null;
  maxWorkshopsPerWeek: number;
  maxPhysicalEventsPerMonth: number;
  maxOnlineEventsPerMonth: number;
  canHostPhysicalEvents: boolean;
  maxWorkshopsLimit: number;
  maxParticipantsPerWorkshop: number;
  rating: number;
  totalRatings: number;
}

export interface WorkshopCategory {
  _id: string;
  name: { en: string; ta: string };
  description: { en: string; ta: string };
}

export interface Workshop {
  _id: string;
  title: string;
  description: string;
  topics: string[];
  type: WorkshopCategory | string | null;
  organizer: User | string;
  schedule: { startDate: string; endDate: string };
  capacity: number;
  mode: 'online' | 'physical' | 'hybrid';
  status: 'draft' | 'published' | 'completed' | 'cancelled';
  attendanceSettings?: {
    alertIntervalMinutes: number;
    maxAllowedMissedAlerts: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SessionResource {
  title: string;
  url: string;
  type: 'slides' | 'code' | 'recording' | 'document';
}

export interface Session {
  _id: string;
  workshop: string | Workshop;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  googleMeetLink: string;
  attendanceMode: 'manual' | 'qr' | 'csv';
  qrToken?: string;
  qrExpiresAt?: string;
  resources?: SessionResource[];
}

export interface Registration {
  _id: string;
  user: string | User;
  workshop: string | Workshop;
  status: 'confirmed' | 'cancelled';
  registeredAt: string;
}

export interface Attendance {
  _id: string;
  session: string | Session;
  user: string | User;
  workshop: string;
  status: 'present' | 'absent';
  method: 'manual' | 'qr' | 'csv';
  markedAt: string;
}

export interface Resource {
  _id: string;
  workshop: string;
  type: 'pdf' | 'doc' | 'link';
  title: string;
  description: string;
  externalUrl?: string;
  fileId?: string;
  targetAudience?: 'online' | 'physical' | 'all';
}

export interface Assignment {
  _id: string;
  workshop: string;
  title: string;
  description: string;
  dueDate: string;
  maxScore: number;
}

export interface AssignmentScore {
  _id: string;
  assignment: string | Assignment;
  user: string | User;
  score: number;
  feedback: string;
}

export interface Certificate {
  _id: string;
  user: string | User;
  workshop: string | Workshop;
  certificateId: string;
  status: 'review_ready' | 'approved' | 'rejected';
  attendancePercent: number;
  testScore?: number;
  issuedAt?: string;
}

export interface Announcement {
  _id: string;
  workshop: string;
  title: string;
  content: string;
  createdBy: User | string;
  createdAt: string;
}

export interface CommunityPost {
  _id: string;
  workshop: string;
  author: User | string;
  content: string;
  isPrivate: boolean;
  parentPost: string | null;
  replies?: CommunityPost[];
  createdAt: string;
}

export interface Notification {
  _id: string;
  user: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AppSettings {
  minAttendancePercent: number;
}
