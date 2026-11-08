/**
 * Synthetic demo data (no real data). Pure and deterministic: same `now` => same output.
 * Invoices are listed in processing order: normal ones first, planted anomalies last,
 * so that only the LATER copy of a duplicate is flagged (like in real life).
 */
export type DemoSupplier = {
  key: number;
  name: string;
  status: "verified" | "unverified";
  avgInvoiceCents: number;
  bankChangedDaysAgo: number | null;
};
export type DemoPO = { key: number; supplierKey: number; reference: string; amountCents: number };
export type DemoInvoice = {
  supplierKey: number;
  poKey: number | null;
  number: string;
  amountCents: number;
  issueDate: Date;
  dueDate: Date;
  planted?: string;
  expect: "low" | "medium" | "high";
};
export type DemoBank = { date: Date; amountCents: number; label: string; reference: string | null };

const DAY = 24 * 3600 * 1000;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SUPPLIERS: DemoSupplier[] = [
  ["Northwind Office Supplies", 85000],
  ["Blue Harbor Logistics", 240000],
  ["Kestrel Cloud Services", 310000],
  ["Maple & Finch Catering", 45000],
  ["Orion Industrial Parts", 520000],
  ["Lumen Print Studio", 60000],
  ["Cobalt IT Consulting", 410000],
  ["Evergreen Facilities", 150000],
  ["Summit Telecom", 95000],
  ["Paragon Legal Services", 280000],
  ["Redwood Packaging", 130000],
].map(([name, avg], key) => ({
  key,
  name: name as string,
  status: "verified" as const,
  avgInvoiceCents: avg as number,
  bankChangedDaysAgo: null,
}));
SUPPLIERS.push(
  { key: 11, name: "Atlas Freight Co", status: "verified", avgInvoiceCents: 180000, bankChangedDaysAgo: null },
  { key: 12, name: "Bankshift Components", status: "verified", avgInvoiceCents: 220000, bankChangedDaysAgo: 9 },
  { key: 13, name: "Nova Trade SARL", status: "unverified", avgInvoiceCents: 150000, bankChangedDaysAgo: null },
  { key: 14, name: "Quickfix Services", status: "unverified", avgInvoiceCents: 0, bankChangedDaysAgo: null },
);

export function generateDemo(now: Date) {
  const rnd = rng(42);
  const pos: DemoPO[] = [];
  const invoices: DemoInvoice[] = [];
  const amountsBySupplier = new Map<number, number[]>();

  for (let i = 0; i < 54; i++) {
    const sk = i % 11;
    const avg = SUPPLIERS[sk].avgInvoiceCents;
    const seen = amountsBySupplier.get(sk) ?? [];
    let amount = 0;
    let tries = 0;
    do {
      amount = Math.round(avg * (0.75 + rnd() * 0.5));
      tries++;
    } while (seen.some((a) => Math.abs(a - amount) <= 0.02 * amount) && tries < 100);
    amountsBySupplier.set(sk, [...seen, amount]);
    const issueDate = new Date(now.getTime() - (8 + Math.floor(rnd() * 100)) * DAY);
    const dueDate = new Date(issueDate.getTime() + 30 * DAY);
    let poKey: number | null = null;
    if (i < 10) {
      poKey = i;
      pos.push({ key: i, supplierKey: sk, reference: `PO-${5000 + i}`, amountCents: amount });
    }
    invoices.push({ supplierKey: sk, poKey, number: `INV-2026-${1000 + i}`, amountCents: amount, issueDate, dueDate, expect: "low" });
  }

  const inDays = (n: number) => new Date(now.getTime() + n * DAY);
  const o12 = invoices[12];
  const o20 = invoices[20];
  pos.push({ key: 10, supplierKey: 11, reference: "PO-5100", amountCents: 200000 });
  pos.push({ key: 11, supplierKey: 2, reference: "PO-5101", amountCents: 300000 });

  invoices.push(
    { planted: "bank details changed", supplierKey: 12, poKey: null, number: "INV-2026-2001", amountCents: 195000, issueDate: inDays(-3), dueDate: inDays(27), expect: "high" },
    { planted: "duplicate + inconsistent dates", supplierKey: o12.supplierKey, poKey: null, number: o12.number, amountCents: o12.amountCents, issueDate: inDays(-4), dueDate: inDays(-10), expect: "high" },
    { planted: "unverified supplier + outlier", supplierKey: 13, poKey: null, number: "INV-2026-2003", amountCents: 900000, issueDate: inDays(-2), dueDate: inDays(28), expect: "high" },
    { planted: "PO mismatch + outlier", supplierKey: 11, poKey: 10, number: "INV-2026-2004", amountCents: 650000, issueDate: inDays(-5), dueDate: inDays(25), expect: "high" },
    { planted: "duplicate", supplierKey: o20.supplierKey, poKey: null, number: o20.number, amountCents: o20.amountCents, issueDate: inDays(-6), dueDate: inDays(24), expect: "medium" },
    { planted: "unverified supplier", supplierKey: 14, poKey: null, number: "INV-2026-2006", amountCents: 87500, issueDate: inDays(-7), dueDate: inDays(23), expect: "medium" },
    { planted: "amount outlier", supplierKey: 4, poKey: null, number: "INV-2026-2007", amountCents: 2080000, issueDate: inDays(-3), dueDate: inDays(27), expect: "medium" },
    { planted: "PO mismatch", supplierKey: 2, poKey: 11, number: "INV-2026-2008", amountCents: 336000, issueDate: inDays(-4), dueDate: inDays(26), expect: "medium" },
    { planted: "issued in the future", supplierKey: 7, poKey: null, number: "INV-2026-2009", amountCents: 151300, issueDate: inDays(10), dueDate: inDays(40), expect: "low" },
  );

  const bank: DemoBank[] = [];
  const clamp = (d: Date) => (d.getTime() > now.getTime() ? now : d);
  for (let i = 0; i < 30; i++) {
    const inv = invoices[i];
    bank.push({
      date: clamp(new Date(inv.issueDate.getTime() + 20 * DAY)),
      amountCents: inv.amountCents,
      label: `Payment ${SUPPLIERS[inv.supplierKey].name}`,
      reference: inv.number,
    });
  }
  for (let i = 30; i < 35; i++) {
    const inv = invoices[i];
    bank.push({ date: clamp(new Date(inv.issueDate.getTime() + 22 * DAY)), amountCents: inv.amountCents, label: "Wire transfer", reference: null });
  }
  bank.push({ date: inDays(-1), amountCents: 195000, label: "Payment Bankshift Components", reference: "INV-2026-2001" });
  bank.push({ date: inDays(-9), amountCents: 3399, label: "Card payment - misc", reference: null });
  bank.push({ date: inDays(-12), amountCents: 12750, label: "Card payment - misc", reference: null });
  bank.push({ date: inDays(-15), amountCents: 20111, label: "Card payment - misc", reference: null });

  return { suppliers: SUPPLIERS, pos, invoices, bank };
}
