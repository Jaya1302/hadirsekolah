import { useState } from 'react';
import { Check, ShieldAlert, ShieldCheck, Trash2, X } from 'lucide-react';
import type { AttendanceRecord, AttendanceStatus } from '../types';
import { formatIndonesianDate } from '../lib/utils';
import { PhotoFrame } from './PhotoFrame';
import { StatusLabel } from './StatusLabel';

interface PhotoProofModalProps {
  record: AttendanceRecord;
  onClose: () => void;
  onUpdate: (
    id: string,
    payload: { status?: AttendanceStatus; verified?: boolean; notes?: string }
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const STATUS_OPTIONS: AttendanceStatus[] = ['Hadir', 'Terlambat', 'Izin', 'Sakit'];

export function PhotoProofModal({ record, onClose, onUpdate, onDelete }: PhotoProofModalProps) {
  const [status, setStatus] = useState<AttendanceStatus>(record.status);
  const [verified, setVerified] = useState<boolean>(record.verified);
  const [notes, setNotes] = useState<string>(record.notes);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges =
    status !== record.status || verified !== record.verified || notes.trim() !== record.notes.trim();

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onUpdate(record.id, { status, verified, notes: notes.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    setSaving(true);
    setError(null);
    try {
      await onDelete(record.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus catatan absensi.');
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proof-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 id="proof-modal-title" className="text-base font-semibold text-slate-900">
              Bukti Kehadiran Kamera
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              {record.studentName} · NIS {record.nis} · {record.className}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail bukti foto"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12">
          <div className="md:col-span-7 bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-slate-900">
              <PhotoFrame
                src={record.photoUrl}
                alt={`Foto bukti kehadiran ${record.studentName}`}
                className="w-full h-full"
                fallbackLabel="Tidak ada lampiran foto"
              />
            </div>
          </div>

          <div className="md:col-span-5 p-6 flex flex-col justify-between gap-5">
            <div className="space-y-4">
              <div className="space-y-2 pb-4 border-b border-slate-100 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Tanggal</span>
                  <span className="font-medium text-slate-900">{formatIndonesianDate(record.date)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Jam Masuk</span>
                  <span className="font-mono font-medium text-slate-900 tabular-nums">
                    {record.checkInTime} WIB
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Perangkat</span>
                  <span className="text-slate-700 truncate max-w-[170px]">{record.cameraDevice}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Status Saat Ini</span>
                  <StatusLabel status={status} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Ubah Status Kehadiran
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setStatus(opt)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        status === opt
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Status Verifikasi Foto
                </label>
                <button
                  type="button"
                  onClick={() => setVerified((v) => !v)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    verified
                      ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800'
                      : 'border-amber-200 bg-amber-50/70 text-amber-800'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {verified ? (
                      <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
                    )}
                    <span>{verified ? 'Foto Terverifikasi' : 'Perlu Tinjauan Guru'}</span>
                  </span>
                  <span className="text-[11px] underline">Ubah</span>
                </button>
              </div>

              <div>
                <label htmlFor="proof-notes" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Catatan Guru / Keterangan
                </label>
                <textarea
                  id="proof-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tambahkan catatan jika diperlukan..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              {error ? (
                <p className="text-xs text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Hapus</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleDeleteConfirm}
                    disabled={saving}
                    className="px-3 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Ya, Hapus
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={saving}
                    className="px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Batal
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap"
                >
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{saving ? 'Menyimpan...' : 'Simpan'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
