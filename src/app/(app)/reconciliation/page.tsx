import Link from "next/link";
import { db } from "@/server/db";
import { requireSession } from "@/server/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { Badge, PageHeader, btnCls, statusTone } from "@/components/flowk-ui";
import { runReconciliation } from "./actions";

export const dynamic = "force-dynamic";

export default async function ReconciliationPage() {
  const s = await requireSession();
  const txs = await db.bankTransaction.findMany({
    where: { orgId: s.orgId },
    orderBy: { date: "desc" },
    take: 200,
  });
  const ids = txs.map((t) => t.matchedInvoiceId).filter((x): x is string => Boolean(x));
  const invs = await db.invoice.findMany({ where: { id: { in: ids } }, select: { id: true, number: true, status: true } });
  const byId = new Map(invs.map((i) => [i.id, i]));
  const canRun = s.role === "admin" || s.role === "manager";
  const unmatched = txs.filter((t) => t.matchStatus === "unmatched").length;

  return (
    <div>
      <PageHeader
        title="Bank reconciliation"
        subtitle="matched = amount and reference agree with an approved invoice. partial = needs a human look (e.g. payment for a blocked invoice)."
        action={
          canRun ? (
            <form action={runReconciliation}>
              <button type="submit" className={btnCls} disabled={unmatched === 0}>
                Run reconciliation ({unmatched} to process)
              </button>
            </form>
          ) : null
        }
      />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Label</th>
              <th className="p-3">Reference</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3">Match</th>
              <th className="p-3">Invoice</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((t) => {
              const inv = t.matchedInvoiceId ? byId.get(t.matchedInvoiceId) : undefined;
              return (
                <tr key={t.id} className="border-t">
                  <td className="p-3">{formatDate(t.date)}</td>
                  <td className="p-3">{t.label}</td>
                  <td className="p-3">{t.reference ?? "-"}</td>
                  <td className="p-3 text-right">{formatMoney(t.amountCents)}</td>
                  <td className="p-3">
                    <Badge tone={t.matchStatus === "unmatched" ? "neutral" : statusTone(t.matchStatus)}>
                      {t.matchStatus}
                    </Badge>
                  </td>
                  <td className="p-3">
                    {inv ? (
                      <Link href={`/invoices/${inv.id}`} className="underline-offset-2 hover:underline">
                        {inv.number} ({inv.status})
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
