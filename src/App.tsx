import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Camera,
  ClipboardList,
  Download,
  Menu,
  Settings,
  Users,
  X,
} from 'lucide-react';
import type {
  ActiveView,
  AttendanceRecord,
  AttendanceStatus,
  BootstrapPayload,
  SchoolSettings,
  Student,
} from './types';
import {
  exportAttendanceCsv,
  formatIndonesianDate,
  getLocalDateString,
} from './lib/utils';
import { CameraCheckIn } from './components/CameraCheckIn';
import { AttendanceHistory } from './components/AttendanceHistory';
import { StudentDirectory } from './components/StudentDirectory';
import { SettingsPanel } from './components/SettingsPanel';
import { PhotoProofModal } from './components/PhotoProofModal';

const NAV_ITEMS: Array<{
  id: ActiveView;
  label: string;
  breadcrumb: string;
  icon: typeof Camera;
}> = [
  {
    id: 'checkin',
    label: 'Absensi Kamera',
    breadcrumb: 'Presensi Harian / Kamera Verifikasi',
    icon: Camera,
  },
  {
    id: 'history',
    label: 'Riwayat & Bukti Foto',
    breadcrumb: 'Presensi Harian / Riwayat & Bukti Foto',
    icon: ClipboardList,
  },
  {
    id: 'students',
    label: 'Data Siswa',
    breadcrumb: 'Direktori Sekolah / Data Siswa',
    icon: Users,
  },
  {
    id: 'settings',
    label: 'Pengaturan',
    breadcrumb: 'Konfigurasi / Sekolah & Jam Masuk',
    icon: Settings,
  },
];

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('checkin');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<SchoolSettings>({
    schoolName: 'SMK Negeri 1 Nusantara',
    academicYear: '2026/2027',
    cutoffTime: '07:15',
  });

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  const todayDate = getLocalDateString();

  const loadBootstrap = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/bootstrap?today=${encodeURIComponent(getLocalDateString())}`);
      if (!res.ok) {
        throw new Error('Gagal memuat data absensi dari server.');
      }
      const data = (await res.json()) as BootstrapPayload;
      setStudents(data.students);
      setAttendance(data.attendance);
      setSettings(data.settings);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBootstrap();
  }, [loadBootstrap]);

  const todayAttendance = useMemo(
    () => attendance.filter((rec) => rec.date === todayDate),
    [attendance, todayDate]
  );

  const kpiStats = useMemo(() => {
    const totalStudents = students.length;
    const todayStudentIds = new Set(todayAttendance.map((a) => a.studentId));
    const onTimeCount = todayAttendance.filter((a) => a.status === 'Hadir').length;
    const lateCount = todayAttendance.filter((a) => a.status === 'Terlambat').length;
    const excusedCount = todayAttendance.filter(
      (a) => a.status === 'Izin' || a.status === 'Sakit'
    ).length;
    const absentYetCount = Math.max(0, totalStudents - todayStudentIds.size);
    const presentPercent =
      totalStudents > 0 ? Math.round(((onTimeCount + lateCount) / totalStudents) * 100) : 0;

    return {
      totalStudents,
      onTimeCount,
      lateCount,
      excusedCount,
      absentYetCount,
      presentPercent,
    };
  }, [students.length, todayAttendance]);

  async function handleSubmitAttendance(payload: {
    studentId: string;
    photoDataUrl?: string | null;
    statusOverride?: 'Izin' | 'Sakit';
    notes: string;
    cameraDevice: string;
    localDate: string;
    localTime: string;
    allowReplace?: boolean;
  }): Promise<AttendanceRecord> {
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error || 'Gagal menyimpan catatan absensi.');
    }
    const created = body as AttendanceRecord;
    setAttendance((prev) => [
      created,
      ...prev.filter((item) => !(item.studentId === created.studentId && item.date === created.date)),
    ]);
    return created;
  }

  async function handleUpdateRecord(
    id: string,
    payload: { status?: AttendanceStatus; verified?: boolean; notes?: string }
  ): Promise<void> {
    const res = await fetch(`/api/attendance/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error || 'Gagal memperbarui catatan absensi.');
    }
    const updated = body as AttendanceRecord;
    setAttendance((prev) => prev.map((item) => (item.id === id ? updated : item)));
  }

  async function handleDeleteRecord(id: string): Promise<void> {
    const res = await fetch(`/api/attendance/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error || 'Gagal menghapus catatan absensi.');
    }
    setAttendance((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleAddStudent(payload: {
    nis: string;
    name: string;
    className: string;
    gender: 'L' | 'P';
  }): Promise<Student> {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error || 'Gagal menambah siswa.');
    }
    const created = body as Student;
    setStudents((prev) =>
      [...prev, created].sort(
        (a, b) => a.className.localeCompare(b.className) || a.name.localeCompare(b.name)
      )
    );
    return created;
  }

  async function handleDeleteStudent(id: string): Promise<void> {
    const res = await fetch(`/api/students/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error || 'Gagal menghapus siswa.');
    }
    setStudents((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleSaveSettings(payload: Partial<SchoolSettings>): Promise<SchoolSettings> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error || 'Gagal menyimpan pengaturan.');
    }
    const updated = body as SchoolSettings;
    setSettings(updated);
    return updated;
  }

  const activeNavMeta = NAV_ITEMS.find((n) => n.id === activeView) || NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen ? (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {/* Sidebar Navigation (256px) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-150 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="h-14 px-5 border-b border-slate-200 flex items-center justify-between">
            <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
              HadirSekolah
            </span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Tutup menu"
              className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="p-3 space-y-1" aria-label="Menu utama">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveView(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-50 text-blue-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-700' : 'text-slate-400'}`}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 text-xs text-slate-500 space-y-0.5">
          <p className="font-medium text-slate-800 truncate">{settings.schoolName}</p>
          <p className="tabular-nums">Tahun Ajaran {settings.academicYear}</p>
          <p className="font-mono text-[11px] text-slate-400 tabular-nums">
            Jam Masuk {settings.cutoffTime} WIB
          </p>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb on left, concise date + 1 primary action on right */}
        <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-8 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu navigasi"
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg lg:hidden"
            >
              <Menu className="w-4 h-4" />
            </button>
            <p className="text-xs font-medium text-slate-600 truncate">
              {activeNavMeta.breadcrumb}
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <span className="hidden sm:inline text-xs text-slate-500 whitespace-nowrap tabular-nums">
              {formatIndonesianDate(todayDate)}
            </span>
            <button
              type="button"
              onClick={() => exportAttendanceCsv(todayAttendance, 'rekap-absensi-harian')}
              disabled={todayAttendance.length === 0}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Ekspor Rekap</span>
            </button>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1260px] w-full mx-auto space-y-6">
          {/* Page Header & 4-Column KPI Summary Strip */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {activeNavMeta.label}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  {settings.schoolName} · Bukti kehadiran tercatat otomatis dengan foto kamera
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              <div className="px-5 py-3.5">
                <p className="text-xs text-slate-500">Total Siswa Terdaftar</p>
                <p className="mt-1 text-xl font-bold font-mono text-slate-900 tabular-nums">
                  {kpiStats.totalStudents}
                </p>
              </div>
              <div className="px-5 py-3.5">
                <p className="text-xs text-slate-500">Hadir Tepat Waktu</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-bold font-mono text-emerald-700 tabular-nums">
                    {kpiStats.onTimeCount}
                  </span>
                  <span className="text-xs text-slate-500 tabular-nums">
                    ({kpiStats.presentPercent}% masuk)
                  </span>
                </div>
              </div>
              <div className="px-5 py-3.5">
                <p className="text-xs text-slate-500">Terlambat / Izin & Sakit</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-bold font-mono text-amber-700 tabular-nums">
                    {kpiStats.lateCount}
                  </span>
                  <span className="text-xs text-slate-500 tabular-nums">
                    / {kpiStats.excusedCount} izin
                  </span>
                </div>
              </div>
              <div className="px-5 py-3.5">
                <p className="text-xs text-slate-500">Belum Absen Hari Ini</p>
                <p className="mt-1 text-xl font-bold font-mono text-slate-700 tabular-nums">
                  {kpiStats.absentYetCount}
                </p>
              </div>
            </div>
          </div>

          {/* Loading / Error / Active View */}
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 h-[460px] rounded-xl bg-slate-200/70 animate-pulse" />
              <div className="lg:col-span-5 h-[460px] rounded-xl bg-slate-200/70 animate-pulse" />
            </div>
          ) : loadError ? (
            <div className="bg-white border border-red-200 rounded-xl p-6 text-center">
              <p className="text-sm font-medium text-red-700">{loadError}</p>
              <button
                type="button"
                onClick={loadBootstrap}
                className="mt-3 px-4 py-2 rounded-lg bg-slate-900 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
              >
                Muat Ulang Data
              </button>
            </div>
          ) : activeView === 'checkin' ? (
            <CameraCheckIn
              students={students}
              todayAttendance={todayAttendance}
              settings={settings}
              onSubmitAttendance={handleSubmitAttendance}
              onSelectRecord={setSelectedRecord}
            />
          ) : activeView === 'history' ? (
            <AttendanceHistory
              students={students}
              attendance={attendance}
              onSelectRecord={setSelectedRecord}
              onRecordExcused={handleSubmitAttendance}
              onGoToCamera={() => setActiveView('checkin')}
            />
          ) : activeView === 'students' ? (
            <StudentDirectory
              students={students}
              todayAttendance={todayAttendance}
              allAttendance={attendance}
              onAddStudent={handleAddStudent}
              onDeleteStudent={handleDeleteStudent}
            />
          ) : (
            <SettingsPanel settings={settings} onSaveSettings={handleSaveSettings} />
          )}
        </main>
      </div>

      {/* Photo Proof Inspector Modal */}
      {selectedRecord ? (
        <PhotoProofModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onUpdate={handleUpdateRecord}
          onDelete={handleDeleteRecord}
        />
      ) : null}
    </div>
  );
}
