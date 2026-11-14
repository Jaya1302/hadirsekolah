import { useState } from 'react';
import { Check } from 'lucide-react';
import type { SchoolSettings } from '../types';

interface SettingsPanelProps {
  settings: SchoolSettings;
  onSaveSettings: (payload: Partial<SchoolSettings>) => Promise<SchoolSettings>;
}

export function SettingsPanel({ settings, onSaveSettings }: SettingsPanelProps) {
  const [schoolName, setSchoolName] = useState(settings.schoolName);
  const [academicYear, setAcademicYear] = useState(settings.academicYear);
  const [cutoffTime, setCutoffTime] = useState(settings.cutoffTime);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedNotice(null);
    setError(null);
    try {
      await onSaveSettings({
        schoolName: schoolName.trim(),
        academicYear: academicYear.trim(),
        cutoffTime,
      });
      setSavedNotice('Pengaturan sekolah dan jam masuk berhasil disimpan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-900">Pengaturan Sekolah & Jam Masuk</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Konfigurasi identitas instansi dan batas waktu penentuan status tepat waktu atau terlambat.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div>
          <label htmlFor="set-school-name" className="block text-xs font-medium text-slate-700 mb-1.5">
            Nama Sekolah
          </label>
          <input
            id="set-school-name"
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            required
            className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="set-academic-year" className="block text-xs font-medium text-slate-700 mb-1.5">
              Tahun Ajaran
            </label>
            <input
              id="set-academic-year"
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div>
            <label htmlFor="set-cutoff-time" className="block text-xs font-medium text-slate-700 mb-1.5">
              Batas Jam Masuk (Tepat Waktu)
            </label>
            <input
              id="set-cutoff-time"
              type="time"
              value={cutoffTime}
              onChange={(e) => setCutoffTime(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-600 leading-relaxed">
          Siswa yang melakukan absensi kamera hingga pukul{' '}
          <span className="font-mono font-semibold text-slate-900 tabular-nums">{cutoffTime} WIB</span>{' '}
          otomatis tercatat sebagai <span className="font-medium text-emerald-700">Hadir</span>.
          Pengambilan foto melewati pukul tersebut otomatis diklasifikasikan sebagai{' '}
          <span className="font-medium text-amber-700">Terlambat</span>.
        </div>

        {error ? (
          <p className="text-xs text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        {savedNotice ? (
          <p className="text-xs font-medium text-emerald-700" role="status">
            {savedNotice}
          </p>
        ) : null}

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-xs font-medium text-white transition-colors whitespace-nowrap"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
