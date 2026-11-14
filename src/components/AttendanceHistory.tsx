import { useMemo, useState } from 'react';
import {
  Download,
  Eye,
  FilePlus2,
  Search,
  ShieldAlert,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import type { AttendanceRecord, AttendanceStatus, Student } from '../types';
import {
  exportAttendanceCsv,
  formatShortIndonesianDate,
  getLocalDateString,
  getLocalTimeString,
} from '../lib/utils';
import { PhotoFrame } from './PhotoFrame';
import { StatusLabel } from './StatusLabel';

interface AttendanceHistoryProps {
  students: Student[];
  attendance: AttendanceRecord[];
  onSelectRecord: (record: AttendanceRecord) => void;
  onRecordExcused: (payload: {
    studentId: string;
    statusOverride: 'Izin' | 'Sakit';
    photoDataUrl?: string | null;
    notes: string;
    cameraDevice: string;
    localDate: string;
    localTime: string;
    allowReplace?: boolean;
  }) => Promise<AttendanceRecord>;
  onGoToCamera: () => void;
}

const STATUS_FILTERS: Array<'Semua' | AttendanceStatus> = [
  'Semua',
  'Hadir',
  'Terlambat',
  'Izin',
  'Sakit',
];

export function AttendanceHistory({
  students,
  attendance,
  onSelectRecord,
  onRecordExcused,
  onGoToCamera,
}: AttendanceHistoryProps) {
  const [dateFilter, setDateFilter] = useState<string>(() => getLocalDateString());
  const [showAllDates, setShowAllDates] = useState<boolean>(false);
  const [classFilter, setClassFilter] = useState<string>('Semua');
  const [statusFilter, setStatusFilter] = useState<'Semua' | AttendanceStatus>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal for recording Izin / Sakit
  const [excuseModalOpen, setExcuseModalOpen] = useState<boolean>(false);
  const [excuseStudentId, setExcuseStudentId] = useState<string>('');
  const [excuseStatus, setExcuseStatus] = useState<'Izin' | 'Sakit'>('Izin');
  const [excuseNotes, setExcuseNotes] = useState<string>('');
  const [excusePhotoUrl, setExcusePhotoUrl] = useState<string | null>(null);
  const [excuseSaving, setExcuseSaving] = useState<boolean>(false);
  const [excuseError, setExcuseError] = useState<string | null>(null);

  const classOptions = useMemo(() => {
    const unique = Array.from(new Set(students.map((s) => s.className))).sort();
    return ['Semua', ...unique];
  }, [students]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return attendance.filter((rec) => {
      const matchDate = showAllDates || !dateFilter || rec.date === dateFilter;
      const matchClass = classFilter === 'Semua' || rec.className === classFilter;
      const matchStatus = statusFilter === 'Semua' || rec.status === statusFilter;
      const matchSearch =
        !q ||
        rec.studentName.toLowerCase().includes(q) ||
        rec.nis.toLowerCase().includes(q) ||
        rec.className.toLowerCase().includes(q);
      return matchDate && matchClass && matchStatus && matchSearch;
    });
  }, [attendance, showAllDates, dateFilter, classFilter, statusFilter, searchQuery]);

  function handleExcusePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 960;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setExcusePhotoUrl(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleExcuseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!excuseStudentId) {
      setExcuseError('Pilih siswa terlebih dahulu.');
      return;
    }
    setExcuseSaving(true);
    setExcuseError(null);
    try {
      await onRecordExcused({
        studentId: excuseStudentId,
        statusOverride: excuseStatus,
        photoDataUrl: excusePhotoUrl,
        notes: excuseNotes.trim(),
        cameraDevice: excusePhotoUrl ? 'Unggahan Surat Keterangan' : 'Input Guru Piket',
        localDate: getLocalDateString(),
        localTime: getLocalTimeString(),
        allowReplace: true,
      });
      setExcuseModalOpen(false);
      setExcuseStudentId('');
      setExcuseNotes('');
      setExcusePhotoUrl(null);
    } catch (err) {
      setExcuseError(err instanceof Error ? err.message : 'Gagal menyimpan keterangan.');
    } finally {
      setExcuseSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter & Action Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari siswa atau NIS..."
                className="h-9 w-56 pl-9 pr-3 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <select
              aria-label="Filter kelas"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            >
              {classOptions.map((cls) => (
                <option key={cls} value={cls}>
                  {cls === 'Semua' ? 'Semua Kelas' : cls}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5">
              <input
                type="date"
                aria-label="Filter tanggal"
                value={dateFilter}
                disabled={showAllDates}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setShowAllDates(false);
                }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-mono tabular-nums text-slate-700 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
              <button
                type="button"
                onClick={() => setShowAllDates((prev) => !prev)}
                className={`h-9 px-3 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                  showAllDates
                    ? 'border-blue-600 bg-blue-50 text-blue-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                }`}
              >
                {showAllDates ? 'Semua Tanggal' : 'Lihat Semua'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExcuseModalOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors whitespace-nowrap"
            >
              <FilePlus2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Catat Izin / Sakit</span>
            </button>
            <button
              type="button"
              onClick={() => exportAttendanceCsv(filteredRecords)}
              disabled={filteredRecords.length === 0}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium text-white transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Ekspor CSV</span>
            </button>
          </div>
        </div>

        {/* Status Segmented Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {STATUS_FILTERS.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 tabular-nums">
            Menampilkan {filteredRecords.length} dari {attendance.length} catatan
          </p>
        </div>
      </div>

      {/* High-Density Attendance Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <p className="text-sm font-medium text-slate-900">
              Belum ada data absensi untuk filter yang dipilih
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Ubah filter tanggal/kelas atau mulai catat kehadiran siswa menggunakan kamera.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              {!showAllDates || statusFilter !== 'Semua' || classFilter !== 'Semua' || searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowAllDates(true);
                    setStatusFilter('Semua');
                    setClassFilter('Semua');
                    setSearchQuery('');
                  }}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Reset Filter
                </button>
              ) : null}
              <button
                type="button"
                onClick={onGoToCamera}
                className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-xs font-medium text-white transition-colors"
              >
                Buka Absensi Kamera
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 tracking-wide">
                  <th className="py-2.5 px-4">Bukti Foto</th>
                  <th className="py-2.5 px-3">NIS</th>
                  <th className="py-2.5 px-3">Nama Siswa</th>
                  <th className="py-2.5 px-3">Kelas</th>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Jam Masuk</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Verifikasi</th>
                  <th className="py-2.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRecords.map((rec) => (
                  <tr
                    key={rec.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-2 px-4">
                      <button
                        type="button"
                        onClick={() => onSelectRecord(rec)}
                        className="block rounded-md overflow-hidden border border-slate-200 hover:border-blue-500 transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
                        aria-label={`Lihat bukti foto ${rec.studentName}`}
                      >
                        <PhotoFrame
                          src={rec.photoUrl}
                          alt={`Bukti foto ${rec.studentName}`}
                          className="w-14 h-10"
                          fallbackLabel=""
                        />
                      </button>
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {rec.nis}
                    </td>
                    <td className="py-2 px-3">
                      <p className="font-medium text-slate-900 whitespace-nowrap">{rec.studentName}</p>
                      {rec.notes ? (
                        <p className="text-[11px] text-slate-500 truncate max-w-[220px]">{rec.notes}</p>
                      ) : null}
                    </td>
                    <td className="py-2 px-3 text-slate-700 whitespace-nowrap">{rec.className}</td>
                    <td className="py-2 px-3 text-slate-600 tabular-nums whitespace-nowrap">
                      {formatShortIndonesianDate(rec.date)}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-900 tabular-nums whitespace-nowrap">
                      {rec.checkInTime}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <StatusLabel status={rec.status} />
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {rec.verified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>Terverifikasi</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700">
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>Tinjau</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectRecord(rec)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-blue-700 hover:bg-blue-50 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Excused Absence Modal */}
      {excuseModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="excuse-modal-title"
          onClick={() => setExcuseModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 id="excuse-modal-title" className="text-sm font-semibold text-slate-900">
                Catat Izin atau Sakit Siswa
              </h3>
              <button
                type="button"
                onClick={() => setExcuseModalOpen(false)}
                aria-label="Tutup"
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExcuseSubmit} className="p-5 space-y-4">
              <div>
                <label htmlFor="excuse-student" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Nama Siswa
                </label>
                <select
                  id="excuse-student"
                  value={excuseStudentId}
                  onChange={(e) => setExcuseStudentId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                >
                  <option value="">-- Pilih siswa --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.className} · {s.nis})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-700 mb-1.5">Jenis Keterangan</span>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
                  {(['Izin', 'Sakit'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setExcuseStatus(type)}
                      className={`py-1.5 text-xs font-medium rounded-md transition-colors ${
                        excuseStatus === type
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="excuse-notes" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Keterangan / Alasan
                </label>
                <textarea
                  id="excuse-notes"
                  rows={2}
                  value={excuseNotes}
                  onChange={(e) => setExcuseNotes(e.target.value)}
                  placeholder="Contoh: Surat keterangan dokter / izin keperluan keluarga..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-700 mb-1.5">
                  Lampiran Foto Surat (Opsional)
                </span>
                <label className="flex items-center justify-center gap-2 h-10 px-3 rounded-lg border border-dashed border-slate-300 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{excusePhotoUrl ? 'Foto surat terlampir (klik untuk ganti)' : 'Unggah foto surat keterangan'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleExcusePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {excuseError ? (
                <p className="text-xs text-red-600" role="alert">
                  {excuseError}
                </p>
              ) : null}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExcuseModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={excuseSaving}
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {excuseSaving ? 'Menyimpan...' : 'Simpan Keterangan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
