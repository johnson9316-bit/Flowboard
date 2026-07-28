export function clampText(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 3))}...` : value;
}

export function formatDateMs(
  value: number,
  options: Intl.DateTimeFormatOptions,
  fallback: string,
): string {
  return Number.isFinite(value) ? new Intl.DateTimeFormat(undefined, options).format(new Date(value)) : fallback;
}

export function formatDateTimeMs(
  value: number,
  options: Intl.DateTimeFormatOptions,
  fallback: string,
): string {
  return formatDateMs(value, options, fallback);
}

export function formatDurationCompact(value: number, options: { spaced?: boolean } = {}): string {
  const suffix = options.spaced ? " " : "";
  if (value < 60_000) return `${Math.floor(value / 1000)}${suffix}s`;
  if (value < 3_600_000) return `${Math.floor(value / 60_000)}${suffix}m`;
  if (value < 86_400_000) return `${Math.floor(value / 3_600_000)}${suffix}h`;
  return `${Math.floor(value / 86_400_000)}${suffix}d`;
}
