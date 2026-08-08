'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

/**
 * Click any photo on the page to inspect it full size.
 *
 * Implemented as a single document-level click delegate rather than a prop threaded through every
 * image component. Photos are rendered by four different components across nine sections, several
 * of them inside grids built from template literals -- wiring a handler into each would mean
 * touching all of them and would quietly miss any added later. A delegate means an image is
 * zoomable the moment it carries data-zoomable, wherever it lives.
 *
 * The gallery is collected at open time from whatever is currently in the DOM, so stepping with
 * the arrows walks the images actually on screen -- the active category tab and variant, not a
 * list assembled in advance that would go stale the moment a tab changed.
 */
export function Lightbox() {
  const [gallery, setGallery] = useState<{ src: string; alt: string }[]>([]);
  const [index, setIndex] = useState(0);

  const open = gallery.length > 0;
  const current = gallery[index];

  // The gallery length is read through a ref rather than from inside a state updater. Calling
  // setIndex within a setGallery updater stepped twice per press, because React invokes updaters
  // more than once in development and an updater that triggers another update runs that side
  // effect every time. Updaters have to stay pure.
  const galleryRef = useRef(gallery);
  galleryRef.current = gallery;

  const close = useCallback(() => setGallery([]), []);
  const step = useCallback((delta: number) => {
    const n = galleryRef.current.length;
    if (n) setIndex((i) => (i + delta + n) % n);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = (e.target as HTMLElement)?.closest?.('[data-zoomable]') as HTMLImageElement | null;
      if (!target) return;
      // Never hijack a click that was going somewhere -- a photo inside a link stays a link.
      if (target.closest('a, button')) return;

      const all = [...document.querySelectorAll<HTMLImageElement>('img[data-zoomable]')].filter(
        (img) => img.offsetParent !== null && img.naturalWidth > 0,
      );
      if (!all.length) return;
      e.preventDefault();
      setGallery(all.map((img) => ({ src: img.currentSrc || img.src, alt: img.alt })));
      setIndex(Math.max(0, all.indexOf(target)));
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    }
    document.addEventListener('keydown', onKey);
    // Freeze the page behind the overlay, and pad for the scrollbar that just disappeared so the
    // layout underneath does not jump sideways as it opens.
    const gap = window.innerWidth - document.documentElement.clientWidth;
    const prev = { overflow: document.body.style.overflow, pad: document.body.style.paddingRight };
    document.body.style.overflow = 'hidden';
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev.overflow;
      document.body.style.paddingRight = prev.pad;
    };
  }, [open, close, step]);

  if (!open || !current) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={current.alt || 'Photo'}
      onClick={close}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-marketplace-ink/92 p-4 backdrop-blur-sm sm:p-8"
    >
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-6 sm:top-6"
      >
        <X className="h-5 w-5" strokeWidth={2} />
      </button>

      {gallery.length > 1 && (
        <>
          <Arrow side="left" onClick={() => step(-1)} />
          <Arrow side="right" onClick={() => step(1)} />
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.src}
        alt={current.alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[82vh] max-w-full rounded-[14px] object-contain shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)]"
      />

      <div className="mt-5 flex items-center gap-4 text-center" onClick={(e) => e.stopPropagation()}>
        {current.alt && (
          <p className="text-[0.9375rem] font-medium tracking-[-0.01em] text-white/90">
            {current.alt}
          </p>
        )}
        {gallery.length > 1 && (
          <p className="font-mono text-[0.8125rem] text-white/45">
            {index + 1} / {gallery.length}
          </p>
        )}
      </div>
    </div>
  );
}

function Arrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={side === 'left' ? 'Previous photo' : 'Next photo'}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20 ${
        side === 'left' ? 'left-3 sm:left-6' : 'right-3 sm:right-6'
      }`}
    >
      <Icon className="h-6 w-6" strokeWidth={2} />
    </button>
  );
}
