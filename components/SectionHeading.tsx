import type { ReactNode } from "react"

type SectionHeadingProps = {
  index: string
  eyebrow: string
  title: ReactNode
  copy?: ReactNode
  align?: "left" | "split"
}

export function SectionHeading({ index, eyebrow, title, copy, align = "split" }: SectionHeadingProps) {
  return (
    <header className={`section-heading section-heading--${align}`}>
      <div className="section-heading__title">
        <div className="section-kicker">
          <span>{index}</span>
          {eyebrow}
        </div>
        <h2>{title}</h2>
      </div>
      {copy ? <div className="section-heading__copy">{copy}</div> : null}
    </header>
  )
}
