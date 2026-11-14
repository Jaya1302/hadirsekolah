import express from 'express';
import type { Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

interface Student {
  id: string;
  nis: string;
  name: string;
  className: string;
  gender: 'L' | 'P';
  createdAt: string;
}

type AttendanceStatus = 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit';

interface AttendanceRecord {
  id: string;
  studentId: string;
  nis: string;
  studentName: string;
  className: string;
  date: string;
  checkInTime: string;
  timestamp: string;
  status: AttendanceStatus;
  photoUrl: string | null;
  cameraDevice: string;
  notes: string;
  verified: boolean;
}

interface SchoolSettings {
  schoolName: string;
  academicYear: string;
  cutoffTime: string;
}

interface StoreData {
  seededForDate: string | null;
  students: Student[];
  attendance: AttendanceRecord[];
  settings: SchoolSettings;
}

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const PHOTOS_DIR = path.join(DATA_DIR, 'photos');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
const SEED_IMAGES_DIR = path.resolve(process.cwd(), 'src', 'assets', 'images');

function ensureDirs(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(PHOTOS_DIR)) fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}

function getJakartaDateString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getJakartaTimeString(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());
}

function determineStatus(checkInTime: string, cutoffTime: string): AttendanceStatus {
  const [h, m] = checkInTime.split(':').map(Number);
  const [cutH, cutM] = cutoffTime.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m) || Number.isNaN(cutH) || Number.isNaN(cutM)) {
    return 'Hadir';
  }
  return h * 60 + m > cutH * 60 + cutM ? 'Terlambat' : 'Hadir';
}

function createInitialStore(todayDate: string): StoreData {
  const students: Student[] = [
    { id: 'stu-01', nis: '20261001', name: 'Ahmad Fauzan Pratama', className: 'XII RPL 1', gender: 'L', createdAt: '2026-07-15T01:00:00.000Z' },
    { id: 'stu-02', nis: '20261002', name: 'Siti Nurhaliza Putri', className: 'XII RPL 1', gender: 'P', createdAt: '2026-07-15T01:00:00.000Z' },
    { id: 'stu-03', nis: '20261003', name: 'Budi Santoso Wijaya', className: 'XII RPL 1', gender: 'L', createdAt: '2026-07-15T01:00:00.000Z' },
    { id: 'stu-04', nis: '20261004', name: 'Dewi Lestari Anggraini', className: 'XII RPL 1', gender: 'P', createdAt: '2026-07-15T01:00:00.000Z' },
    { id: 'stu-05', nis: '20261005', name: 'Rizky Ramadhan Hakim', className: 'XII RPL 2', gender: 'L', createdAt: '2026-07-15T01:00:00.000Z' },
    { id: 'stu-06', nis: '20261006', name: 'Nadia Kusuma Wardani', className: 'XII RPL 2', gender: 'P', createdAt: '2026-07-15T01:00:00.000Z' },
    { id: 'stu-07', nis: '20261007', name: 'Bagas Adi Saputra', className: 'XII RPL 2', gender: 'L', createdAt: '2026-07-15T01:00:00.000Z' },
    { id: 'stu-08', nis: '20261008', name: 'Intan Permata Sari', className: 'XII RPL 2', gender: 'P', createdAt: '2026-07-15T01:00:00.000Z' },
    { id: 'stu-09', nis: '20261009', name: 'Fajar Hidayatullah', className: 'XI TKJ 1', gender: 'L', createdAt: '2026-07-15T01:00:00.000Z' },
    { id: 'stu-10', nis: '20261010', name: 'Aulia Rahmawati', className: 'XI TKJ 1', gender: 'P', createdAt: '2026-07-15T01:00:00.000Z' },
    { id: 'stu-11', nis: '20261011', name: 'Dimas Prasetyo Nugroho', className: 'XI TKJ 1', gender: 'L', createdAt: '2026-07-15T01:00:00.000Z' },
    { id: 'stu-12', nis: '20261012', name: 'Rani Puspita Dewi', className: 'XI TKJ 1', gender: 'P', createdAt: '2026-07-15T01:00:00.000Z' },
  ];

  const attendance: AttendanceRecord[] = [
    {
      id: 'att-seed-03',
      studentId: 'stu-03',
      nis: '20261003',
      studentName: 'Budi Santoso Wijaya',
      className: 'XII RPL 1',
      date: todayDate,
      checkInTime: '07:22:18',
      timestamp: `${todayDate}T07:22:18+07:00`,
      status: 'Terlambat',
      photoUrl: '/api/seed-photo/student_proof_budi_1794646261491.jpg',
      cameraDevice: 'Kamera Ruang Piket 01',
      notes: 'Terlambat 7 menit karena antrean gerbang depan.',
      verified: true,
    },
    {
      id: 'att-seed-02',
      studentId: 'stu-02',
      nis: '20261002',
      studentName: 'Siti Nurhaliza Putri',
      className: 'XII RPL 1',
      date: todayDate,
      checkInTime: '07:08:45',
      timestamp: `${todayDate}T07:08:45+07:00`,
      status: 'Hadir',
      photoUrl: '/api/seed-photo/student_proof_siti_1794646260711.jpg',
      cameraDevice: 'Kamera Kelas XII RPL 1',
      notes: '',
      verified: true,
    },
    {
      id: 'att-seed-01',
      studentId: 'stu-01',
      nis: '20261001',
      studentName: 'Ahmad Fauzan Pratama',
      className: 'XII RPL 1',
      date: todayDate,
      checkInTime: '06:54:12',
      timestamp: `${todayDate}T06:54:12+07:00`,
      status: 'Hadir',
      photoUrl: '/api/seed-photo/student_proof_ahmad_1794646261008.jpg',
      cameraDevice: 'Kamera Ruang Piket 01',
      notes: '',
      verified: true,
    },
  ];

  return {
    seededForDate: todayDate,
    students,
    attendance,
    settings: {
      schoolName: 'SMK Negeri 1 Nusantara',
      academicYear: '2026/2027',
      cutoffTime: '07:15',
    },
  };
}

function readStore(clientToday?: string): StoreData {
  ensureDirs();
  const fallbackDate = clientToday && /^\d{4}-\d{2}-\d{2}$/.test(clientToday) ? clientToday : getJakartaDateString();
  if (!fs.existsSync(STORE_FILE)) {
    const initial = createInitialStore(fallbackDate);
    writeStore(initial);
    return initial;
  }

  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as StoreData;

    // Align initial seed records to the first visiting browser's local today date if still on initial seed
    if (
      clientToday &&
      /^\d{4}-\d{2}-\d{2}$/.test(clientToday) &&
      parsed.seededForDate &&
      parsed.seededForDate !== clientToday &&
      parsed.attendance.every((a) => a.id.startsWith('att-seed-'))
    ) {
      parsed.attendance = parsed.attendance.map((rec) => ({
        ...rec,
        date: clientToday,
        timestamp: `${clientToday}T${rec.checkInTime}+07:00`,
      }));
      parsed.seededForDate = clientToday;
      writeStore(parsed);
    }

    return parsed;
  } catch {
    const initial = createInitialStore(fallbackDate);
    writeStore(initial);
    return initial;
  }
}

function writeStore(data: StoreData): void {
  ensureDirs();
  const tempPath = `${STORE_FILE}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, STORE_FILE);
}

function savePhotoDataUrl(photoDataUrl: string, recordId: string): string | null {
  const match = photoDataUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
  if (!match) return null;
  const ext = match[1].toLowerCase() === 'png' ? 'png' : 'jpg';
  const buffer = Buffer.from(match[2], 'base64');
  const filename = `${recordId}.${ext}`;
  ensureDirs();
  fs.writeFileSync(path.join(PHOTOS_DIR, filename), buffer);
  return `/api/photos/${filename}`;
}

async function startServer(): Promise<void> {
  ensureDirs();
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // Serve generated seed portrait images safely
  app.get('/api/seed-photo/:filename', (req: Request, res: Response) => {
    const safeName = path.basename(req.params.filename || '');
    const filePath = path.join(SEED_IMAGES_DIR, safeName);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Foto tidak ditemukan.' });
      return;
    }
    res.sendFile(filePath);
  });

  // Serve captured camera proof photos
  app.get('/api/photos/:filename', (req: Request, res: Response) => {
    const safeName = path.basename(req.params.filename || '');
    const filePath = path.join(PHOTOS_DIR, safeName);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Foto bukti tidak ditemukan.' });
      return;
    }
    res.sendFile(filePath);
  });

  app.get('/api/bootstrap', (req: Request, res: Response) => {
    const clientToday = typeof req.query.today === 'string' ? req.query.today : undefined;
    const store = readStore(clientToday);
    res.json({
      students: store.students,
      attendance: store.attendance,
      settings: store.settings,
    });
  });

  app.post('/api/attendance', (req: Request, res: Response) => {
    const {
      studentId,
      photoDataUrl,
      statusOverride,
      notes,
      cameraDevice,
      localDate,
      localTime,
      allowReplace,
    } = req.body as {
      studentId?: string;
      photoDataUrl?: string | null;
      statusOverride?: AttendanceStatus;
      notes?: string;
      cameraDevice?: string;
      localDate?: string;
      localTime?: string;
      allowReplace?: boolean;
    };

    if (!studentId) {
      res.status(400).json({ error: 'ID siswa wajib dipilih.' });
      return;
    }

    const dateStr = localDate && /^\d{4}-\d{2}-\d{2}$/.test(localDate) ? localDate : getJakartaDateString();
    const timeStr = localTime && /^\d{2}:\d{2}:\d{2}$/.test(localTime) ? localTime : getJakartaTimeString();

    const store = readStore(dateStr);
    const student = store.students.find((s) => s.id === studentId);
    if (!student) {
      res.status(404).json({ error: 'Data siswa tidak ditemukan.' });
      return;
    }

    const isExcused = statusOverride === 'Izin' || statusOverride === 'Sakit';
    if (!isExcused && !photoDataUrl) {
      res.status(400).json({ error: 'Foto bukti kamera wajib diambil untuk absensi kehadiran.' });
      return;
    }

    const existingIndex = store.attendance.findIndex(
      (a) => a.studentId === student.id && a.date === dateStr
    );

    if (existingIndex !== -1 && !allowReplace) {
      res.status(409).json({
        error: `${student.name} sudah melakukan absensi pada tanggal ${dateStr}.`,
        existingRecord: store.attendance[existingIndex],
      });
      return;
    }

    const recordId = `att-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    let photoUrl: string | null = null;
    if (photoDataUrl) {
      photoUrl = savePhotoDataUrl(photoDataUrl, recordId);
      if (!photoUrl) {
        res.status(400).json({ error: 'Format foto bukti tidak valid.' });
        return;
      }
    }

    const computedStatus: AttendanceStatus = statusOverride
      ? statusOverride
      : determineStatus(timeStr, store.settings.cutoffTime);

    const newRecord: AttendanceRecord = {
      id: recordId,
      studentId: student.id,
      nis: student.nis,
      studentName: student.name,
      className: student.className,
      date: dateStr,
      checkInTime: timeStr,
      timestamp: new Date().toISOString(),
      status: computedStatus,
      photoUrl,
      cameraDevice: (cameraDevice || 'Kamera Perangkat').slice(0, 120),
      notes: (notes || '').trim().slice(0, 300),
      verified: Boolean(photoUrl),
    };

    if (existingIndex !== -1) {
      const oldRecord = store.attendance[existingIndex];
      if (oldRecord.photoUrl?.startsWith('/api/photos/')) {
        const oldFile = path.join(PHOTOS_DIR, path.basename(oldRecord.photoUrl));
        if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
      }
      store.attendance.splice(existingIndex, 1);
    }

    store.attendance.unshift(newRecord);
    writeStore(store);
    res.status(201).json(newRecord);
  });

  app.patch('/api/attendance/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, verified, notes } = req.body as {
      status?: AttendanceStatus;
      verified?: boolean;
      notes?: string;
    };

    const store = readStore();
    const record = store.attendance.find((a) => a.id === id);
    if (!record) {
      res.status(404).json({ error: 'Data absensi tidak ditemukan.' });
      return;
    }

    if (status && ['Hadir', 'Terlambat', 'Izin', 'Sakit'].includes(status)) {
      record.status = status;
    }
    if (typeof verified === 'boolean') {
      record.verified = verified;
    }
    if (typeof notes === 'string') {
      record.notes = notes.trim().slice(0, 300);
    }

    writeStore(store);
    res.json(record);
  });

  app.delete('/api/attendance/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const store = readStore();
    const index = store.attendance.findIndex((a) => a.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Data absensi tidak ditemukan.' });
      return;
    }

    const [removed] = store.attendance.splice(index, 1);
    if (removed.photoUrl?.startsWith('/api/photos/')) {
      const photoFile = path.join(PHOTOS_DIR, path.basename(removed.photoUrl));
      if (fs.existsSync(photoFile)) {
        fs.unlinkSync(photoFile);
      }
    }

    writeStore(store);
    res.json({ deletedId: id });
  });

  app.post('/api/students', (req: Request, res: Response) => {
    const { nis, name, className, gender } = req.body as {
      nis?: string;
      name?: string;
      className?: string;
      gender?: 'L' | 'P';
    };

    const cleanNis = (nis || '').trim();
    const cleanName = (name || '').trim();
    const cleanClass = (className || '').trim();

    if (!cleanNis || !cleanName || !cleanClass) {
      res.status(400).json({ error: 'NIS, nama siswa, dan kelas wajib diisi.' });
      return;
    }

    const store = readStore();
    if (store.students.some((s) => s.nis === cleanNis)) {
      res.status(409).json({ error: `NIS ${cleanNis} sudah terdaftar.` });
      return;
    }

    const newStudent: Student = {
      id: `stu-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      nis: cleanNis,
      name: cleanName,
      className: cleanClass,
      gender: gender === 'P' ? 'P' : 'L',
      createdAt: new Date().toISOString(),
    };

    store.students.push(newStudent);
    store.students.sort((a, b) => a.className.localeCompare(b.className) || a.name.localeCompare(b.name));
    writeStore(store);
    res.status(201).json(newStudent);
  });

  app.delete('/api/students/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const store = readStore();
    const index = store.students.findIndex((s) => s.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Siswa tidak ditemukan.' });
      return;
    }

    store.students.splice(index, 1);
    writeStore(store);
    res.json({ deletedId: id });
  });

  app.put('/api/settings', (req: Request, res: Response) => {
    const { schoolName, academicYear, cutoffTime } = req.body as Partial<SchoolSettings>;
    const store = readStore();

    if (typeof schoolName === 'string' && schoolName.trim()) {
      store.settings.schoolName = schoolName.trim().slice(0, 100);
    }
    if (typeof academicYear === 'string' && academicYear.trim()) {
      store.settings.academicYear = academicYear.trim().slice(0, 30);
    }
    if (typeof cutoffTime === 'string' && /^\d{2}:\d{2}$/.test(cutoffTime)) {
      store.settings.cutoffTime = cutoffTime;
    }

    writeStore(store);
    res.json(store.settings);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HadirSekolah server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
