const compactUsdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: safeValue !== 0 && Math.abs(safeValue) < 1 ? 4 : 2,
    maximumFractionDigits: safeValue !== 0 && Math.abs(safeValue) < 1 ? 6 : 2,
  }).format(safeValue);
}

export function formatCompactCurrency(value: number): string {
  return compactUsdFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatNumber(
  value: number,
  maximumFractionDigits = 2,
): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatSol(value: number, maximumFractionDigits = 4): string {
  return `${formatNumber(value, maximumFractionDigits)} SOL`;
}

export function formatPercent(value: number, maximumFractionDigits = 1): string {
  return `${formatNumber(value, maximumFractionDigits)}%`;
}

export function formatTimestamp(value: string | number | Date): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatRelativeTime(
  value: string | number | Date,
  now = new Date(),
): string {
  const timestamp = new Date(value).getTime();
  const deltaSeconds = Math.round((timestamp - now.getTime()) / 1000);

  if (!Number.isFinite(deltaSeconds)) {
    return "Unavailable";
  }

  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
    ["second", 1],
  ];
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  for (const [unit, seconds] of ranges) {
    if (Math.abs(deltaSeconds) >= seconds || unit === "second") {
      return formatter.format(Math.round(deltaSeconds / seconds), unit);
    }
  }

  return "now";
}
