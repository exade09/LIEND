import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "wallet"
  | "token"
  | "borrow"
  | "sol"
  | "swap"
  | "transaction"
  | "explorer"
  | "leaderboard"
  | "docs"
  | "x"
  | "pump-fun"
  | "search"
  | "copy"
  | "external-link"
  | "chevron"
  | "status"
  | "collateral"
  | "liquidity"
  | "menu"
  | "close"
  | "arrow"
  | "check"
  | "clock";

export interface IconProps
  extends Omit<SVGProps<SVGSVGElement>, "children" | "name"> {
  name: IconName;
  size?: number | string;
  title?: string;
}

const glyphs: Record<IconName, ReactNode> = {
  wallet: (
    <>
      <path d="M4.75 6.25h12.5A2.75 2.75 0 0 1 20 9v8.25A2.75 2.75 0 0 1 17.25 20H4.75A2.75 2.75 0 0 1 2 17.25V7.75A3.75 3.75 0 0 1 5.75 4h10" />
      <path d="M15 11.25h5v4.5h-5a2.25 2.25 0 0 1 0-4.5Z" />
      <circle cx="15.4" cy="13.5" r="0.65" fill="currentColor" stroke="none" />
    </>
  ),
  token: (
    <>
      <circle cx="12" cy="12" r="8.75" />
      <path d="m12 7.25 4.1 2.35v4.8L12 16.75 7.9 14.4V9.6L12 7.25Z" />
      <path d="m8.15 9.75 3.85 2.2 3.85-2.2M12 12v4.45" />
    </>
  ),
  borrow: (
    <>
      <path d="M12 3.25v10.5m-3.5-3.4 3.5 3.5 3.5-3.5" />
      <path d="M5.25 16.25h13.5v3.5H5.25z" />
      <path d="M7.5 16.25v-1.5m9 1.5v-1.5" />
    </>
  ),
  sol: (
    <>
      <path d="M6.2 4.75h12.55l-2.9 2.9H3.3l2.9-2.9Z" />
      <path d="M5.25 10.55H17.8l2.9 2.9H8.15l-2.9-2.9Z" />
      <path d="M6.2 16.35h12.55l-2.9 2.9H3.3l2.9-2.9Z" />
    </>
  ),
  swap: (
    <>
      <path d="M4 7.25h14.5m-3-3 3 3-3 3" />
      <path d="M20 16.75H5.5m3 3-3-3 3-3" />
    </>
  ),
  transaction: (
    <>
      <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="4" />
      <circle cx="7.25" cy="8" r="1.2" />
      <circle cx="16.75" cy="16" r="1.2" />
      <path d="M8.45 8h4.8a3.5 3.5 0 0 1 3.5 3.5v3.3" />
      <path d="m14.5 12.55 2.25 2.25L19 12.55" />
    </>
  ),
  explorer: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m14.8 9.2-1.55 4.05L9.2 14.8l1.55-4.05 4.05-1.55Z" />
      <circle cx="12" cy="12" r="0.7" fill="currentColor" stroke="none" />
    </>
  ),
  leaderboard: (
    <>
      <path d="M4 20V9.5h4V20m4 0V4h4v16m4 0v-7h-4" />
      <path d="M2.75 20h18.5" />
      <path d="M5.4 6.25h1.2m6.8-4h1.2m4.8 8h1.2" />
    </>
  ),
  docs: (
    <>
      <path d="M12 6.25A5.3 5.3 0 0 0 7.25 4H3.5v13.25h3.75A5.3 5.3 0 0 1 12 19.5V6.25Z" />
      <path d="M12 6.25A5.3 5.3 0 0 1 16.75 4h3.75v13.25h-3.75A5.3 5.3 0 0 0 12 19.5" />
      <path d="M6.25 8h2.5m-2.5 3h2.5m6.5-3h2.5m-2.5 3h2.5" />
    </>
  ),
  x: (
    <>
      <path d="m4.5 4.25 15 15.5M19.25 4.25 12.7 11M11.1 12.65l-6.35 7.1" />
    </>
  ),
  "pump-fun": (
    <>
      <g transform="rotate(-32 12 12)">
        <rect x="3.75" y="8" width="16.5" height="8" rx="4" />
        <path d="M12 8v8" />
        <path d="M7.35 13.75V10.2h1.4a1.35 1.35 0 1 1 0 2.7h-1.4" />
      </g>
      <circle cx="18.8" cy="5.2" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  search: (
    <>
      <circle cx="10.75" cy="10.75" r="6.75" />
      <path d="m15.6 15.6 4.4 4.4" />
    </>
  ),
  copy: (
    <>
      <rect x="7.25" y="7.25" width="12.25" height="12.25" rx="2.25" />
      <path d="M16.75 7.25v-1.5A2.25 2.25 0 0 0 14.5 3.5H5.75A2.25 2.25 0 0 0 3.5 5.75v8.75a2.25 2.25 0 0 0 2.25 2.25h1.5" />
    </>
  ),
  "external-link": (
    <>
      <path d="M13.5 4.25h6.25v6.25m-.5-5.75-8.5 8.5" />
      <path d="M10.25 6.25h-4a2 2 0 0 0-2 2v9.5a2 2 0 0 0 2 2h9.5a2 2 0 0 0 2-2v-4" />
    </>
  ),
  chevron: <path d="m8.5 5.5 6.5 6.5-6.5 6.5" />,
  status: (
    <>
      <circle cx="12" cy="12" r="8.75" />
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  collateral: (
    <>
      <path d="M12 3.25 19 6v5.15c0 4.45-2.75 7.7-7 9.6-4.25-1.9-7-5.15-7-9.6V6l7-2.75Z" />
      <path d="m8.75 10.25 3.25-2 3.25 2V14L12 16l-3.25-2v-3.75Z" />
      <path d="m8.95 10.4 3.05 1.85 3.05-1.85M12 12.25v3.5" />
    </>
  ),
  liquidity: (
    <>
      <path d="M12 3.25s-5.75 6.1-5.75 10.35a5.75 5.75 0 0 0 11.5 0C17.75 9.35 12 3.25 12 3.25Z" />
      <path d="M8.75 14.25c.35 1.6 1.4 2.55 3.05 2.85" />
      <path d="M3.25 20.25h17.5" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>
  ),
  close: <path d="m5.5 5.5 13 13m0-13-13 13" />,
  arrow: (
    <>
      <path d="M4 12h15.5" />
      <path d="m14.5 7 5 5-5 5" />
    </>
  ),
  check: <path d="m4.75 12.25 4.5 4.5 10-10" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.75" />
      <path d="M12 7.25v5.25l3.5 2" />
    </>
  ),
};

export function Icon({
  name,
  size = 20,
  title,
  strokeWidth = 1.6,
  role,
  "aria-label": ariaLabel,
  "aria-hidden": ariaHidden,
  ...props
}: IconProps) {
  const hasAccessibleName = Boolean(title || ariaLabel);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={role ?? (hasAccessibleName ? "img" : undefined)}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden ?? (hasAccessibleName ? undefined : true)}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {glyphs[name]}
    </svg>
  );
}
