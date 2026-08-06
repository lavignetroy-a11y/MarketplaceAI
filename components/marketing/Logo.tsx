export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z"
          stroke="#0C0D12"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M3 7 L12 12 L21 7" stroke="#0C0D12" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M12 12 L12 22" stroke="#0C0D12" strokeWidth="1.6" />
      </svg>
      <span className="text-[17px] font-[650] uppercase tracking-[0.105em] text-marketplace-ink max-md:text-sm max-md:tracking-[0.08em]">
        Marketplace<span className="text-marketplace-muted-light"> / AI</span>
      </span>
    </span>
  );
}
