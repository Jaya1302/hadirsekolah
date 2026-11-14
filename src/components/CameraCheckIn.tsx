import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  Check,
  FlipHorizontal2,
  RefreshCw,
  RotateCcw,
  Search,
  Upload,
} from 'lucide-react';
import type { AttendanceRecord, SchoolSettings, Student } from '../types';
import {
  determineStatusFromTime,
  getLocalDateString,
  getLocalTimeString,
  stampCapturedPhoto,
} from '../lib/utils';
import { PhotoFrame } from './PhotoFrame';
import { StatusLabel } from './StatusLabel';

interface CameraCheckInProps {
  students: Student[];
  todayAttendance: AttendanceRecord[];
  settings: SchoolSettings;
  onSubmitAttendance: (payload: {
    studentId: string;
    photoDataUrl: string;
    notes: string;
    cameraDevice: string;
    localDate: string;
    localTime: string;
    allowReplace?: boolean;
  }) => Promise<AttendanceRecord>;
  onSelectRecord: (record: AttendanceRecord) => void;
}

type CameraState = 'initializing' | 'active' | 'denied' | 'unavailable';

export function CameraCheckIn({
  students,
  todayAttendance,
  settings,
  onSubmitAttendance,
  onSelectRecord,
}: CameraCheckInProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>('initializing');
  const [cameraError, setCameraError] = useState<string>('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isMirrored, setIsMirrored] = useState<boolean>(true);

  const [rawCapturedUrl, setRawCapturedUrl] = useState<string | null>(null);
  const [capturedSourceLabel, setCapturedSourceLabel] = useState<string>('Kamera Perangkat');
  const [capturedTime, setCapturedTime] = useState<string>('');
  const [capturedDate, setCapturedDate] = useState<string>('');

  const [nowTime, setNowTime] = useState<string>(() => getLocalTimeString());
  const [nowDate, setNowDate] = useState<string>(() => getLocalDateString());

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('Semua');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [pendingReplace, setPendingReplace] = useState<boolean>(false);

  // Live clock tick every second
  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = new Date();
      setNowTime(getLocalTimeString(now));
      setNowDate(getLocalDateString(now));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(
    async (deviceId?: string) => {
      stopStream();
      setCameraState('initializing');
      setCameraError('');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraState('unavailable');
        setCameraError('Browser ini tidak mendukung akses kamera langsung.');
        return;
      }

      try {
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: deviceId
            ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 960 } }
            : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter((d) => d.kind === 'videoinput');
        setDevices(videoDevices);

        const activeTrack = stream.getVideoTracks()[0];
        const activeSettings = activeTrack?.getSettings();
        if (activeSettings?.deviceId) {
          setSelectedDeviceId(activeSettings.deviceId);
        }
        setCapturedSourceLabel(activeTrack?.label || 'Kamera Perangkat');
        setCameraState('active');
      } catch (err) {
        const name = err instanceof DOMException ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setCameraState('denied');
          setCameraError(
            'Izin kamera ditolak oleh browser. Aktifkan izin kamera pada bilah alamat atau unggah foto bukti dari perangkat.'
          );
        } else {
          setCameraState('unavailable');
          setCameraError(
            'Perangkat kamera tidak ditemukan atau sedang dipakai aplikasi lain. Anda tetap dapat mengunggah foto bukti kehadiran.'
          );
        }
      }
    },
    [stopStream]
  );

  useEffect(() => {
    startCamera();
    return () => {
      stopStream();
    };
  }, [startCamera, stopStream]);

  // Attach stream whenever returning from captured preview back to live video
  useEffect(() => {
    if (!rawCapturedUrl && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [rawCapturedUrl]);

  const attendanceByStudent = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const rec of todayAttendance) {
      map.set(rec.studentId, rec);
    }
    return map;
  }, [todayAttendance]);

  const classOptions = useMemo(() => {
    const unique = Array.from(new Set(students.map((s) => s.className))).sort();
    return ['Semua', ...unique];
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter((s) => {
      const matchClass = classFilter === 'Semua' || s.className === classFilter;
      const matchQuery =
        !q || s.name.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q) || s.className.toLowerCase().includes(q);
      return matchClass && matchQuery;
    });
  }, [students, classFilter, searchQuery]);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) || null,
    [students, selectedStudentId]
  );

  const selectedStudentTodayRecord = selectedStudent
    ? attendanceByStudent.get(selectedStudent.id) || null
    : null;

  const liveStatusPreview = useMemo(
    () => determineStatusFromTime(capturedTime || nowTime, settings.cutoffTime),
    [capturedTime, nowTime, settings.cutoffTime]
  );

  function handleCaptureFromCamera() {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      setSubmitError('Kamera belum siap. Tunggu beberapa saat atau unggah foto bukti.');
      return;
    }

    const width = video.videoWidth || 960;
    const height = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isMirrored) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);

    const activeTrack = streamRef.current?.getVideoTracks()[0];
    setCapturedSourceLabel(activeTrack?.label || 'Kamera Perangkat');
    setCapturedDate(getLocalDateString());
    setCapturedTime(getLocalTimeString());
    setRawCapturedUrl(canvas.toDataURL('image/jpeg', 0.9));
    setSubmitError(null);
    setSubmitSuccess(null);
    setPendingReplace(false);
  }

  function handleUploadPhotoFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1080;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        setCapturedSourceLabel(`Unggahan (${file.name})`);
        setCapturedDate(getLocalDateString());
        setCapturedTime(getLocalTimeString());
        setRawCapturedUrl(canvas.toDataURL('image/jpeg', 0.88));
        setSubmitError(null);
        setSubmitSuccess(null);
        setPendingReplace(false);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  function handleRetake() {
    setRawCapturedUrl(null);
    setCapturedTime('');
    setCapturedDate('');
    setSubmitError(null);
    setPendingReplace(false);
  }

  async function submitCheckIn(allowReplace = false) {
    if (!selectedStudent) {
      setSubmitError('Pilih nama siswa terlebih dahulu di panel sebelah kanan.');
      return;
    }
    if (!rawCapturedUrl) {
      setSubmitError('Ambil foto bukti melalui kamera terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      // Load captured photo into canvas and burn timestamp + student metadata
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Gagal memproses gambar bukti.'));
        img.src = rawCapturedUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Kanvas gambar tidak tersedia.');
      ctx.drawImage(img, 0, 0);

      const submitDate = capturedDate || getLocalDateString();
      const submitTime = capturedTime || getLocalTimeString();

      const stampedDataUrl = stampCapturedPhoto(canvas, {
        studentName: selectedStudent.name,
        nis: selectedStudent.nis,
        className: selectedStudent.className,
        date: submitDate,
        time: submitTime,
      });

      const saved = await onSubmitAttendance({
        studentId: selectedStudent.id,
        photoDataUrl: stampedDataUrl,
        notes: notes.trim(),
        cameraDevice: capturedSourceLabel,
        localDate: submitDate,
        localTime: submitTime,
        allowReplace,
      });

      setSubmitSuccess(
        `Absensi ${saved.studentName} berhasil dicatat (${saved.status} · ${saved.checkInTime} WIB).`
      );
      setRawCapturedUrl(null);
      setCapturedTime('');
      setCapturedDate('');
      setNotes('');
      setSelectedStudentId('');
      setPendingReplace(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan absensi.';
      if (msg.includes('sudah melakukan absensi')) {
        setPendingReplace(true);
      }
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const recentToday = todayAttendance.slice(0, 4);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Hardware-Inspired Camera Viewfinder */}
      <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Kamera Verifikasi Kehadiran</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Batas tepat waktu: <span className="font-mono tabular-nums text-slate-700">{settings.cutoffTime} WIB</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>Status saat ini: </span>
              <span className={liveStatusPreview === 'Hadir' ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                {liveStatusPreview}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {devices.length > 1 ? (
              <select
                aria-label="Pilih perangkat kamera"
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  startCamera(e.target.value);
                }}
                className="h-9 max-w-[180px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                {devices.map((d, idx) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Kamera ${idx + 1}`}
                  </option>
                ))}
              </select>
            ) : null}

            <button
              type="button"
              onClick={() => setIsMirrored((m) => !m)}
              title="Balik tampilan cermin"
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                isMirrored
                  ? 'border-slate-300 bg-slate-100 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
              }`}
            >
              <FlipHorizontal2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Cermin</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Unggah Foto</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleUploadPhotoFile}
              className="hidden"
            />
          </div>
        </div>

        {/* Camera Housing */}
        <div className="p-4 sm:p-5 bg-slate-950">
          <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-slate-900 border border-slate-800">
            {rawCapturedUrl ? (
              <img
                src={rawCapturedUrl}
                alt="Pratinjau foto bukti kehadiran"
                className="w-full h-full object-cover"
              />
            ) : cameraState === 'active' ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isMirrored ? '-scale-x-100' : ''}`}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <Camera className="w-10 h-10 text-slate-500 mb-3" aria-hidden="true" />
                <p className="text-sm font-medium text-slate-200">
                  {cameraState === 'initializing'
                    ? 'Menghubungkan ke kamera perangkat...'
                    : 'Kamera langsung tidak tersedia'}
                </p>
                {cameraError ? (
                  <p className="mt-1.5 text-xs text-slate-400 max-w-md leading-relaxed">
                    {cameraError}
                  </p>
                ) : null}
                {cameraState !== 'initializing' ? (
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => startCamera(selectedDeviceId || undefined)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white transition-colors whitespace-nowrap"
                    >
                      <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Coba Aktifkan Kamera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-medium text-white transition-colors whitespace-nowrap"
                    >
                      <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Unggah Foto Bukti</span>
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {/* Top Telemetry Scrim inside viewfinder */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-b from-black/70 to-transparent text-xs text-white">
              <div className="flex items-center gap-2">
                {rawCapturedUrl ? (
                  <span className="font-medium text-emerald-300">Pratinjau Foto Bukti</span>
                ) : cameraState === 'active' ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-100">
                    <span className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />
                    <span>Kamera Aktif</span>
                  </span>
                ) : (
                  <span className="text-slate-300">Mode Siaga</span>
                )}
              </div>
              <div className="font-mono tabular-nums text-slate-100">
                {capturedTime || nowTime} WIB
              </div>
            </div>

            {/* Subtle framing guide brackets when live */}
            {!rawCapturedUrl && cameraState === 'active' ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-52 h-60 sm:w-60 sm:h-72 relative opacity-45">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-md" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-md" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-md" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-md" />
                </div>
              </div>
            ) : null}

            {/* Bottom preview identity scrim */}
            {selectedStudent ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3.5 py-2.5 bg-gradient-to-t from-black/80 via-black/45 to-transparent text-white">
                <p className="text-xs font-medium truncate">
                  {selectedStudent.name} · {selectedStudent.className}
                </p>
                <p className="text-[11px] font-mono text-slate-300 tabular-nums">
                  NIS {selectedStudent.nis} · {capturedDate || nowDate}
                </p>
              </div>
            ) : null}
          </div>

          {/* Primary Camera Action Strip */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              {rawCapturedUrl
                ? 'Periksa kejelasan wajah pada foto sebelum menyimpan absensi.'
                : 'Posisikan wajah siswa di tengah bingkai kamera dengan pencahayaan cukup.'}
            </p>

            <div className="flex items-center gap-2.5 ml-auto">
              {!rawCapturedUrl ? (
                <button
                  type="button"
                  onClick={handleCaptureFromCamera}
                  disabled={cameraState !== 'active'}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-xs font-semibold text-white transition-colors whitespace-nowrap"
                >
                  <Camera className="w-4 h-4" aria-hidden="true" />
                  <span>Ambil Foto Bukti</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleRetake}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Foto Ulang</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => submitCheckIn(pendingReplace)}
                    disabled={submitting || !selectedStudent}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-xs font-semibold text-white transition-colors whitespace-nowrap"
                  >
                    <Check className="w-4 h-4" aria-hidden="true" />
                    <span>
                      {submitting
                        ? 'Menyimpan...'
                        : pendingReplace
                          ? 'Perbarui Absensi'
                          : 'Simpan Kehadiran'}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Feedback Banner */}
        {(submitError || submitSuccess) ? (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50">
            {submitError ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-red-700" role="alert">
                <span className="inline-flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{submitError}</span>
                </span>
                {pendingReplace && rawCapturedUrl ? (
                  <button
                    type="button"
                    onClick={() => submitCheckIn(true)}
                    disabled={submitting}
                    className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium whitespace-nowrap transition-colors"
                  >
                    Ganti Foto Hari Ini
                  </button>
                ) : null}
              </div>
            ) : null}
            {submitSuccess ? (
              <p className="text-xs font-medium text-emerald-700" role="status">
                {submitSuccess}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* Right Column: Student Identity Picker & Today's Recent Logs */}
      <aside className="lg:col-span-5 space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Identitas Siswa</h2>
            <span className="text-xs text-slate-500 tabular-nums">
              {filteredStudents.length} siswa
            </span>
          </div>

          <div className="relative mb-3">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau NIS siswa..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          {/* Class segmented filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto mb-3">
            {classOptions.map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => setClassFilter(cls)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  classFilter === cls
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cls}
              </button>
            ))}
          </div>

          {/* Student List */}
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-[270px] overflow-y-auto">
            {filteredStudents.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Tidak ada siswa yang sesuai pencarian.
              </div>
            ) : (
              filteredStudents.map((student) => {
                const rec = attendanceByStudent.get(student.id);
                const isSelected = student.id === selectedStudentId;
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => {
                      setSelectedStudentId(student.id);
                      setSubmitError(null);
                      setPendingReplace(false);
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-blue-50/80 hover:bg-blue-50'
                        : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                        {student.name}
                      </p>
                      <p className="text-xs text-slate-500 font-mono tabular-nums">
                        {student.nis} · {student.className}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {rec ? (
                        <div>
                          <StatusLabel status={rec.status} />
                          <p className="text-[11px] font-mono text-slate-500 tabular-nums mt-0.5">
                            {rec.checkInTime.slice(0, 5)}
                          </p>
                        </div>
                      ) : (
                        <StatusLabel status="Belum Absen" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {selectedStudentTodayRecord ? (
            <p className="mt-2.5 text-xs text-amber-700">
              {selectedStudent?.name} sudah tercatat {selectedStudentTodayRecord.status} pukul{' '}
              <span className="font-mono tabular-nums">{selectedStudentTodayRecord.checkInTime}</span>.
              Mengirim ulang akan mengganti bukti foto hari ini jika dikonfirmasi.
            </p>
          ) : null}

          <div className="mt-3.5">
            <label htmlFor="checkin-notes" className="block text-xs font-medium text-slate-700 mb-1.5">
              Catatan Tambahan (Opsional)
            </label>
            <input
              id="checkin-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Mengikuti upacara / alasan terlambat..."
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>
        </div>

        {/* Recent Check-Ins Today */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Bukti Kamera Terbaru Hari Ini</h2>
            <span className="text-xs text-slate-500 tabular-nums">
              {todayAttendance.length} tercatat
            </span>
          </div>

          {recentToday.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">
              Belum ada siswa yang melakukan absensi kamera hari ini.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentToday.map((rec) => (
                <button
                  key={rec.id}
                  type="button"
                  onClick={() => onSelectRecord(rec)}
                  className="w-full py-2.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <PhotoFrame
                      src={rec.photoUrl}
                      alt={`Foto ${rec.studentName}`}
                      className="w-12 h-9 rounded-md shrink-0 border border-slate-200"
                      fallbackLabel=""
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{rec.studentName}</p>
                      <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                        {rec.className} · {rec.checkInTime}
                      </p>
                    </div>
                  </div>
                  <StatusLabel status={rec.status} />
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
