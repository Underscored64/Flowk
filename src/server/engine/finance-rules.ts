import type { Rule } from "./rules";

export const FINANCE_TEMPLATE_KEY = "invoice_processing";

/** Stored in WorkflowTemplate.definition (shown on the workflows page). */
export const FINANCE_TEMPLATE = {
  start: "check",
  steps: {
    check: {
      type: "rules",
      ruleset: "invoice_anomalies",
      next: { low: "pay", medium: "review", high: "review" },
    },
    review: {
      type: "approval",
      assigneeRole: "manager",
      dueInHours: 24,
      next: { approved: "pay", rejected: "end" },
    },
    pay: { type: "task", handler: "invoice.schedule_payment", next: "end" },
  },
};

/** Weights are adjustable. Thresholds: <30 low, 30-69 medium, >=70 high. */
export const FINANCE_RULES: Rule[] = [
  {
    id: "dup_invoice",
    label: "Possible duplicate invoice (same number, or same amount within 30 days)",
    weight: 60,
    logic: { var: "isDuplicate" },
  },
  {
    id: "amount_outlier",
    label: "Amount is more than 3x the supplier average",
    weight: 40,
    logic: {
      and: [
        { ">": [{ var: "supplierAvg" }, 0] },
        { ">": [{ var: "amount" }, { "*": [3, { var: "supplierAvg" }] }] },
      ],
    },
  },
  {
    id: "unknown_supplier",
    label: "Supplier is not verified",
    weight: 50,
    logic: { "!==": [{ var: "supplierStatus" }, "verified"] },
  },
  {
    id: "po_mismatch",
    label: "Amount differs from the purchase order by more than 5%",
    weight: 35,
    logic: { and: [{ var: "hasPo" }, { ">": [{ var: "poDeviationPct" }, 5] }] },
  },
  {
    id: "bank_changed",
    label: "Supplier bank details changed in the last 30 days",
    weight: 70,
    logic: { var: "bankChangedRecently" },
  },
  {
    id: "date_incoherent",
    label: "Inconsistent dates (due before issue, or issued in the future)",
    weight: 20,
    logic: { or: [{ var: "dueBeforeIssue" }, { var: "issueInFuture" }] },
  },
];

export type InvoiceContextInput = {
  invoice: { number: string; amountCents: number; issueDate: Date; dueDate: Date };
  supplier: { status: string; bankChangedAt: Date | null; avgInvoiceCents: number };
  po: { amountCents: number } | null;
  others: { number: string; amountCents: number; issueDate: Date }[];
  now: Date;
};

const DAY = 24 * 3600 * 1000;

/** Turns raw records into the flat object the rules read. Pure and unit-tested. */
export function buildInvoiceContext(i: InvoiceContextInput) {
  const { invoice, supplier, po, others, now } = i;
  const isDuplicate = others.some(
    (o) =>
      o.number === invoice.number ||
      (Math.abs(o.amountCents - invoice.amountCents) <= invoice.amountCents * 0.01 &&
        Math.abs(o.issueDate.getTime() - invoice.issueDate.getTime()) <= 30 * DAY),
  );
  const poDeviationPct =
    po && po.amountCents > 0
      ? (Math.abs(invoice.amountCents - po.amountCents) / po.amountCents) * 100
      : 0;
  const bankChangedRecently =
    supplier.bankChangedAt !== null && now.getTime() - supplier.bankChangedAt.getTime() < 30 * DAY;
  return {
    amount: invoice.amountCents,
    supplierAvg: supplier.avgInvoiceCents,
    supplierStatus: supplier.status,
    isDuplicate,
    hasPo: po !== null,
    poDeviationPct,
    bankChangedRecently,
    dueBeforeIssue: invoice.dueDate.getTime() < invoice.issueDate.getTime(),
    issueInFuture: invoice.issueDate.getTime() > now.getTime() + DAY,
  };
}
