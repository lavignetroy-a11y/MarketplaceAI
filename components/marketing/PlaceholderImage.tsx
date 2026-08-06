'use client';

import { useEffect, useRef, useState } from 'react';

// The marketing site's imagery starts blank on purpose -- these <img> tags point at real paths
// under /public/images/... that don't have files yet. Drop a matching file in later (or wire up
// a real upload) and it will simply start rendering, no code changes needed. Until then, this
// shows a quiet placeholder instead of a broken-image icon.
export function PlaceholderImage({
  src,
  alt,
  className = '',
  decorative = false,
}: {
  src: string;
  alt: string;
  className?: string;
  /** Suppresses the placeholder caption -- used for mirror reflections, where mirrored text reads as a glitch. */
  decorative?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // For an instant (localhost) 404, the native `error` event can fire before hydration
    // attaches the onError listener, so it's missed. Catch that case explicitly on mount.
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth === 0) {
      setFailed(true);
    }
  }, []);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center bg-marketplace-canvas ${className}`}
        role="img"
        aria-label={alt}
      >
        {!decorative && (
          <span className="text-[10px] font-medium tracking-wide text-marketplace-muted-light">
            Image coming soon
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={`object-cover ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
