import { useState } from 'react';
import { CameraOff } from 'lucide-react';

interface PhotoFrameProps {
  src: string | null;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export function PhotoFrame({ src, alt, className = '', fallbackLabel = 'Tanpa Foto' }: PhotoFrameProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-100 text-slate-400 select-none ${className}`}
        role="img"
        aria-label={alt}
      >
        <CameraOff className="w-4 h-4 shrink-0" aria-hidden="true" />
        {fallbackLabel ? (
          <span className="mt-1 text-[10px] font-medium text-slate-500 px-1 text-center leading-tight">
            {fallbackLabel}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={`object-cover bg-slate-100 ${className}`}
    />
  );
}
