type BrandWordmarkProps = {
  compact?: boolean
  sourceLockup?: boolean
  className?: string
}

export function BrandWordmark({
  compact = false,
  sourceLockup = false,
  className = "",
}: BrandWordmarkProps) {
  return (
    <span className={`${sourceLockup ? "source-wordmark " : ""}liquid-wordmark ${compact ? "is-compact" : ""} ${className}`}>
      <span aria-hidden="true" className="liquid-wordmark__letters">
        {["S", "T", "A", "Y", "F", "I"].map((letter, index) => (
          <span key={`${letter}-${index}`} style={{ "--letter-index": index } as React.CSSProperties}>
            {letter}
          </span>
        ))}
      </span>
      <span className="sr-only">STAYFI</span>
    </span>
  )
}
