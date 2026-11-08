export type TxLike = { amountCents: number; reference: string | null; label: string };
export type InvoiceLike = { id: string; number: string; amountCents: number; status: string; paymentStatus: string };
export type MatchResult = { status: "matched" | "partial" | "unmatched"; invoiceId: string | null };

/**
 * matched   = same amount AND reference contains the invoice number AND invoice is approved
 * partial   = same amount only, or reference only, or the invoice is not approved (e.g. blocked)
 * unmatched = nothing found
 */
export function matchTransaction(tx: TxLike, invoices: InvoiceLike[]): MatchResult {
  const text = `${tx.reference ?? ""} ${tx.label}`.toLowerCase();
  const open = invoices.filter((i) => i.paymentStatus !== "paid");
  const byRef = open.filter((i) => text.includes(i.number.toLowerCase()));
  const byAmount = open.filter((i) => i.amountCents === tx.amountCents);

  const exact = byRef.find((i) => i.amountCents === tx.amountCents);
  if (exact) {
    return exact.status === "approved"
      ? { status: "matched", invoiceId: exact.id }
      : { status: "partial", invoiceId: exact.id };
  }
  if (byRef.length > 0) return { status: "partial", invoiceId: byRef[0].id };
  if (byAmount.length > 0) return { status: "partial", invoiceId: byAmount[0].id };
  return { status: "unmatched", invoiceId: null };
}
