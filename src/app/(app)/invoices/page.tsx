import Link from "next/link";
import { db } from "@/server/db";
import { requireSession } from "@/server/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { Badge, PageHeader, btnCls, riskTone, statusTone } from "@/components/flowk-ui";
import { levelFor } from "@/server/engine/rules";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const s = await requireSession();
  const sp = await searchParams;
  const invoices = await db.invoice.findMany({
    where: { orgId: s.orgId, ...(sp.status ? { status: sp.status } : {}) },
    include: { supplier: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const filters = ["all", "in_review", "blocked", "approved", "paid"];

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Every invoice is scored by explicit rules, then approved, reviewed or blocked."
        action={
          <Link href="/invoices/new" className={btnCls}>
            New invoice
          </Link>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {filters.map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/invoices" : `/invoices?status=${f}`}
            className={`rounded-full border px-3 py-1 hover:bg-muted ${
              (sp.status ?? "all") === f ? "bg-muted font-medium" : ""
            }`}
          >
            {f.replace("_", " ")}
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-3">Number</th>
              <th className="p-3">Supplier</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3">Due</th>
              <th className="p-3">Risk</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td className="p-4 text-muted-foreground" colSpan={6}>
                  No invoices yet.
                </td>
              </tr>
            ) : null}
            {invoices.map((i) => (
              <tr key={i.id} className="border-t hover:bg-muted/50">
                <td className="p-3 font-medium">
                  <Link href={`/invoices/${i.id}`} className="underline-offset-2 hover:underline">
                    {i.number}
                  </Link>
                </td>
                <td className="p-3">{i.supplier.name}</td>
                <td className="p-3 text-right">{formatMoney(i.amountCents, i.currency)}</td>
                <td className="p-3">{formatDate(i.dueDate)}</td>
                <td className="p-3">
                  {i.riskScore === null ? (
                    "-"
                  ) : (
                    <Badge tone={riskTone(levelFor(i.riskScore))}>{i.riskScore}</Badge>
                  )}
                </td>
                <td className="p-3">
                  <Badge tone={statusTone(i.status)}>{i.status.replace("_", " ")}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
