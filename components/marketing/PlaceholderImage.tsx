'use client';

import { useEffect, useRef, useState } from 'react';

// Marketing imagery lives under /public/images/... . Any file that isn't there yet renders a
// quiet placeholder instead of a broken-image icon, so a missing photo never breaks the page --
// drop the file in later and it starts rendering with no code change.
export function PlaceholderImage({
  src,
  alt,
  className = '',
  decorative = false,
  objectPosition,
  style,
}: {
  src: string;
  alt: string;
  className?: string;
  /** Suppresses the placeholder caption -- used for mirror reflections, where mirrored text reads as a glitch. */
  decorative?: boolean;
  /** CSS object-position. The hero's card slots are far taller than the source photos, so the
   *  default centre crop can miss the subject; this aims the crop at it. */
  objectPosition?: string;
  style?: React.CSSProperties;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Track failure against the specific src rather than a bare boolean. React reuses this
  // component instance when a parent swaps src (category tabs, a replaced photo), and a
  // sticky boolean would leave the placeholder showing forever even once the new image loads.
  const failed = failedSrc === src;

  useEffect(() => {
    // For an instant (localhost) 404, the native `error` event can fire before hydration
    // attaches the onError listener, so it's missed. Catch that case explicitly on mount and
    // whenever src changes.
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth === 0) {
      // Store `src`, never `el.currentSrc`. currentSrc is resolved to an absolute URL, so it
      // never equals the relative `src` this component is handed -- the failure would be
      // recorded and then never matched, and the broken-image icon would show anyway. Which
      // path fires depends on load timing, so this failed in some sections and not others.
      setFailedSrc(src);
    }
  }, [src]);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center bg-marketplace-canvas ${className}`}
        style={style}
        role="img"
        aria-label={alt}
      >
        {!decorative && (
          <span className="px-1 text-center text-[10px] font-medium leading-tight tracking-wide text-marketplace-muted-light">
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
      // Picked up by the Lightbox's document-level click delegate.
      data-zoomable={decorative ? undefined : ''}
      className={`object-cover ${className}`}
      style={objectPosition ? { ...style, objectPosition } : style}
      onError={() => setFailedSrc(src)}
    />
  );
}
