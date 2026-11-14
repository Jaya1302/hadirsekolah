import type { AttendanceRecord, AttendanceStatus } from '../types';

export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalTimeString(date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function formatIndonesianDate(dateStr?: string): string {
  const date = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) return dateStr || '';
  const dayName = INDONESIAN_DAYS[date.getDay()];
  const dayNum = date.getDate();
  const monthName = INDONESIAN_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${dayName}, ${dayNum} ${monthName} ${year}`;
}

export function formatShortIndonesianDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  const dayNum = String(date.getDate()).padStart(2, '0');
  const monthName = INDONESIAN_MONTHS[date.getMonth()].slice(0, 3);
  const year = date.getFullYear();
  return `${dayNum} ${monthName} ${year}`;
}

export function determineStatusFromTime(checkInTime: string, cutoffTime: string): AttendanceStatus {
  const [h, m] = checkInTime.split(':').map(Number);
  const [cutH, cutM] = cutoffTime.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m) || Number.isNaN(cutH) || Number.isNaN(cutM)) {
    return 'Hadir';
  }
  const checkInMinutes = h * 60 + m;
  const cutoffMinutes = cutH * 60 + cutM;
  return checkInMinutes > cutoffMinutes ? 'Terlambat' : 'Hadir';
}

export function stampCapturedPhoto(
  sourceCanvas: HTMLCanvasElement,
  metadata: {
    studentName: string;
    nis: string;
    className: string;
    date: string;
    time: string;
  }
): string {
  const out = document.createElement('canvas');
  out.width = sourceCanvas.width;
  out.height = sourceCanvas.height;
  const ctx = out.getContext('2d');
  if (!ctx) {
    return sourceCanvas.toDataURL('image/jpeg', 0.86);
  }

  ctx.drawImage(sourceCanvas, 0, 0);

  // Draw clean dark scrim at bottom for readable immutable timestamp proof
  const barHeight = Math.max(46, Math.round(out.height * 0.12));
  const grad = ctx.createLinearGradient(0, out.height - barHeight * 1.4, 0, out.height);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0)');
  grad.addColorStop(0.45, 'rgba(15, 23, 42, 0.72)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0.9)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, out.height - barHeight * 1.4, out.width, barHeight * 1.4);

  const padX = Math.max(14, Math.round(out.width * 0.025));
  const titleSize = Math.max(13, Math.round(out.height * 0.032));
  const subSize = Math.max(11, Math.round(out.height * 0.024));

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `600 ${titleSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(
    `${metadata.studentName} · ${metadata.className}`,
    padX,
    out.height - Math.round(barHeight * 0.52)
  );

  ctx.fillStyle = '#CBD5E1';
  ctx.font = `500 ${subSize}px "JetBrains Mono", monospace`;
  ctx.fillText(
    `NIS ${metadata.nis}  |  ${metadata.date} ${metadata.time}`,
    padX,
    out.height - Math.round(barHeight * 0.18)
  );

  return out.toDataURL('image/jpeg', 0.86);
}

export function exportAttendanceCsv(records: AttendanceRecord[], filenamePrefix = 'absensi-siswa'): void {
  const headers = [
    'NIS',
    'Nama Siswa',
    'Kelas',
    'Tanggal',
    'Jam Masuk',
    'Status',
    'Verifikasi',
    'Perangkat Kamera',
    'Catatan',
  ];

  const escapeCell = (value: string) => {
    const safe = value.replace(/"/g, '""');
    return `"${safe}"`;
  };

  const rows = records.map((r) => [
    escapeCell(r.nis),
    escapeCell(r.studentName),
    escapeCell(r.className),
    escapeCell(r.date),
    escapeCell(r.checkInTime),
    escapeCell(r.status),
    escapeCell(r.verified ? 'Terverifikasi' : 'Perlu Tinjauan'),
    escapeCell(r.cameraDevice || '-'),
    escapeCell(r.notes || '-'),
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filenamePrefix}-${getLocalDateString()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
