export type AttendanceStatus = 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit';

export type ActiveView = 'checkin' | 'history' | 'students' | 'settings';

export interface Student {
  id: string;
  nis: string;
  name: string;
  className: string;
  gender: 'L' | 'P';
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  nis: string;
  studentName: string;
  className: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // HH:MM:SS
  timestamp: string; // ISO string
  status: AttendanceStatus;
  photoUrl: string | null;
  cameraDevice: string;
  notes: string;
  verified: boolean;
}

export interface SchoolSettings {
  schoolName: string;
  academicYear: string;
  cutoffTime: string; // HH:MM
}

export interface BootstrapPayload {
  students: Student[];
  attendance: AttendanceRecord[];
  settings: SchoolSettings;
}
