import { CheckCircle2, Clock, FileText, HeartPulse, Minus } from 'lucide-react';
import type { AttendanceStatus } from '../types';

interface StatusLabelProps {
  status: AttendanceStatus | 'Belum Absen';
}

export function StatusLabel({ status }: StatusLabelProps) {
  switch (status) {
    case 'Hadir':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Hadir</span>
        </span>
      );
    case 'Terlambat':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Terlambat</span>
        </span>
      );
    case 'Izin':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 whitespace-nowrap">
          <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Izin</span>
        </span>
      );
    case 'Sakit':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 whitespace-nowrap">
          <HeartPulse className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Sakit</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-normal text-slate-500 whitespace-nowrap">
          <Minus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Belum Absen</span>
        </span>
      );
  }
}
