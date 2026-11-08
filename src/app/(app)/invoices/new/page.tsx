import { db } from "@/server/db";
import { requireSession } from "@/server/auth";
import { PageHeader, btnCls, inputCls, Card } from "@/components/flowk-ui";
import { createInvoice } from "../actions";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const s = await requireSession();
  const sp = await searchParams;
  const [suppliers, pos] = await Promise.all([
    db.supplier.findMany({ where: { orgId: s.orgId }, orderBy: { name: "asc" } }),
    db.purchaseOrder.findMany({ where: { orgId: s.orgId }, orderBy: { reference: "asc" }, take: 100 }),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-xl">
      <PageHeader title="New invoice" subtitle="The rules run as soon as you submit." />
      {sp.error ? (
        <p className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-800">{sp.error}</p>
      ) : null}
      <Card>
        <form action={createInvoice} className="flex flex-col gap-4">
          <label className="text-sm">
            Supplier
            <select name="supplierId" required className={inputCls}>
              <option value="">Select a supplier</option>
              {suppliers.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} {x.status !== "verified" ? `(${x.status})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Invoice number
            <input name="number" required maxLength={60} className={inputCls} placeholder="INV-2026-0100" />
          </label>
          <label className="text-sm">
            Amount (EUR)
            <input name="amount" required inputMode="decimal" className={inputCls} placeholder="1250.00" />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm">
              Issue date
              <input name="issueDate" type="date" required defaultValue={today} className={inputCls} />
            </label>
            <label className="text-sm">
              Due date
              <input name="dueDate" type="date" required className={inputCls} />
            </label>
          </div>
          <label className="text-sm">
            Purchase order (optional)
            <select name="poId" className={inputCls}>
              <option value="">None</option>
              {pos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.reference} - {formatMoney(p.amountCents)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={btnCls}>
            Submit and run checks
          </button>
        </form>
      </Card>
    </div>
  );
}
