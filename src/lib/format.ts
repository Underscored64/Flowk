/** Money is stored as integer cents. These helpers only convert at the UI boundary. */
export function formatMoney(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toISOString().slice(0, 10);
}

export function formatDateTime(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

/** "1 234,50" or "1234.5" -> 123450. Returns null when invalid. */
export function parseAmountToCents(input: string): number | null {
  const cleaned = input.replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}
