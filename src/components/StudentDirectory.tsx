import { useMemo, useState } from 'react';
import { Plus, Search, Trash2, X } from 'lucide-react';
import type { AttendanceRecord, Student } from '../types';
import { StatusLabel } from './StatusLabel';

interface StudentDirectoryProps {
  students: Student[];
  todayAttendance: AttendanceRecord[];
  allAttendance: AttendanceRecord[];
  onAddStudent: (payload: {
    nis: string;
    name: string;
    className: string;
    gender: 'L' | 'P';
  }) => Promise<Student>;
  onDeleteStudent: (id: string) => Promise<void>;
}

export function StudentDirectory({
  students,
  todayAttendance,
  allAttendance,
  onAddStudent,
  onDeleteStudent,
}: StudentDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('Semua');
  const [modalOpen, setModalOpen] = useState(false);

  const [nis, setNis] = useState('');
  const [name, setName] = useState('');
  const [className, setClassName] = useState('XII RPL 1');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const classOptions = useMemo(() => {
    const unique = Array.from(new Set(students.map((s) => s.className))).sort();
    return ['Semua', ...unique];
  }, [students]);

  const todayMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const r of todayAttendance) {
      map.set(r.studentId, r);
    }
    return map;
  }, [todayAttendance]);

  const totalCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of allAttendance) {
      if (r.status === 'Hadir' || r.status === 'Terlambat') {
        map.set(r.studentId, (map.get(r.studentId) || 0) + 1);
      }
    }
    return map;
  }, [allAttendance]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter((s) => {
      const matchClass = classFilter === 'Semua' || s.className === classFilter;
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q);
      return matchClass && matchSearch;
    });
  }, [students, classFilter, searchQuery]);

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nis.trim() || !name.trim() || !className.trim()) {
      setFormError('NIS, nama lengkap, dan kelas wajib diisi.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await onAddStudent({
        nis: nis.trim(),
        name: name.trim(),
        className: className.trim(),
        gender,
      });
      setModalOpen(false);
      setNis('');
      setName('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menambahkan siswa.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
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
              placeholder="Cari NIS atau nama siswa..."
              className="h-9 w-60 pl-9 pr-3 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <select
            aria-label="Filter kelas siswa"
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
        </div>

        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-xs font-medium text-white transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Tambah Siswa</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="py-14 px-6 text-center">
            <p className="text-sm font-medium text-slate-900">Tidak ada data siswa ditemukan</p>
            <p className="text-xs text-slate-500 mt-1">
              Tambahkan data siswa baru atau ubah kata kunci pencarian Anda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 tracking-wide">
                  <th className="py-2.5 px-4">NIS</th>
                  <th className="py-2.5 px-3">Nama Lengkap</th>
                  <th className="py-2.5 px-3">Kelas</th>
                  <th className="py-2.5 px-3">L/P</th>
                  <th className="py-2.5 px-3">Status Hari Ini</th>
                  <th className="py-2.5 px-3 text-right">Total Hadir</th>
                  <th className="py-2.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStudents.map((stu) => {
                  const rec = todayMap.get(stu.id);
                  const totalHadir = totalCountMap.get(stu.id) || 0;
                  const isConfirming = confirmDeleteId === stu.id;

                  return (
                    <tr key={stu.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                        {stu.nis}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                        {stu.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">{stu.className}</td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {stu.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <StatusLabel status={rec ? rec.status : 'Belum Absen'} />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-800 tabular-nums whitespace-nowrap">
                        {totalHadir} hari
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        {isConfirming ? (
                          <span className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={async () => {
                                await onDeleteStudent(stu.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[11px] font-medium transition-colors"
                            >
                              Hapus
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded text-slate-600 hover:bg-slate-100 text-[11px] font-medium transition-colors"
                            >
                              Batal
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(stu.id)}
                            aria-label={`Hapus ${stu.name}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Hapus</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-student-title"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 id="add-student-title" className="text-sm font-semibold text-slate-900">
                Tambah Data Siswa Baru
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Tutup"
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              <div>
                <label htmlFor="stu-nis" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Nomor Induk Siswa (NIS)
                </label>
                <input
                  id="stu-nis"
                  type="text"
                  value={nis}
                  onChange={(e) => setNis(e.target.value)}
                  placeholder="Contoh: 20261013"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="stu-name" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Nama Lengkap Siswa
                </label>
                <input
                  id="stu-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Muhammad Ilham Akbar"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="stu-class" className="block text-xs font-medium text-slate-700 mb-1.5">
                    Kelas
                  </label>
                  <input
                    id="stu-class"
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="Contoh: XII RPL 1"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="stu-gender" className="block text-xs font-medium text-slate-700 mb-1.5">
                    Jenis Kelamin
                  </label>
                  <select
                    id="stu-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value === 'P' ? 'P' : 'L')}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>

              {formError ? (
                <p className="text-xs text-red-600" role="alert">
                  {formError}
                </p>
              ) : null}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
