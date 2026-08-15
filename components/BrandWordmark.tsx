import Image from "next/image"

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
  if (sourceLockup) {
    return (
      <div className={`source-wordmark ${className}`} aria-label="LIEND">
        <Image
          src="/assets/liend-banner.png"
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 96vw, 1120px"
        />
      </div>
    )
  }

  return (
    <span className={`liquid-wordmark ${compact ? "is-compact" : ""} ${className}`}>
      <span aria-hidden="true" className="liquid-wordmark__letters">
        {["L", "I", "E", "N", "D"].map((letter, index) => (
          <span key={`${letter}-${index}`} style={{ "--letter-index": index } as React.CSSProperties}>
            {letter}
          </span>
        ))}
      </span>
      <span className="sr-only">LIEND</span>
    </span>
  )
}
