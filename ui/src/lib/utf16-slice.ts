export function truncateUtf16Safe(value: string, maxLength: number): string {
  if (maxLength <= 0) {
    return "";
  }
  const slice = value.slice(0, maxLength);
  const last = slice.charCodeAt(slice.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? slice.slice(0, -1) : slice;
}
