/**
 * Loads synthetic demo data for Flowk. Safe to re-run (resets business data, keeps users and the audit log).
 * Usage: npm run seed   (creates organization + users first), then: npm run seed:demo
 */
import { db } from "../src/server/db";
import { runInvoiceWorkflow } from "../src/server/engine/finance";
import { generateDemo } from "./demo-data";

async function main() {
  const org = await db.organization.findFirst();
  if (!org) throw new Error("No organization found. Run `npm run seed` first.");
  const admin =
    (await db.user.findFirst({ where: { orgId: org.id, role: "admin" } })) ??
    (await db.user.findFirst({ where: { orgId: org.id } }));
  if (!admin) throw new Error("No user found. Run `npm run seed` first.");
  const orgId = org.id;
  const now = new Date();
  const demo = generateDemo(now);

  // Reset business data (AuditLog is append-only and is never deleted).
  await db.workflowRun.deleteMany({ where: { orgId } });
  await db.bankTransaction.deleteMany({ where: { orgId } });
  await db.invoice.deleteMany({ where: { orgId } });
  await db.purchaseOrder.deleteMany({ where: { orgId } });
  await db.supplier.deleteMany({ where: { orgId } });
  await db.announcement.deleteMany({ where: { orgId } });

  const supplierId = new Map<number, string>();
  for (const s of demo.suppliers) {
    const row = await db.supplier.create({
      data: {
        orgId,
        name: s.name,
        status: s.status,
        avgInvoiceCents: s.avgInvoiceCents,
        bankLast4: String(1000 + s.key * 37).slice(-4),
        bankChangedAt:
          s.bankChangedDaysAgo === null ? null : new Date(now.getTime() - s.bankChangedDaysAgo * 86400000),
      },
    });
    supplierId.set(s.key, row.id);
  }

  const poId = new Map<number, string>();
  for (const p of demo.pos) {
    const row = await db.purchaseOrder.create({
      data: { orgId, supplierId: supplierId.get(p.supplierKey)!, reference: p.reference, amountCents: p.amountCents },
    });
    poId.set(p.key, row.id);
  }

  const counts = { low: 0, medium: 0, high: 0 };
  for (const i of demo.invoices) {
    const inv = await db.invoice.create({
      data: {
        orgId,
        supplierId: supplierId.get(i.supplierKey)!,
        poId: i.poKey === null ? null : poId.get(i.poKey)!,
        number: i.number,
        amountCents: i.amountCents,
        issueDate: i.issueDate,
        dueDate: i.dueDate,
        createdAt: i.issueDate.getTime() < now.getTime() ? i.issueDate : now,
      },
    });
    const r = await runInvoiceWorkflow(inv.id, { type: "system" }, { silent: true });
    counts[r.level] += 1;
  }

  for (const b of demo.bank) {
    await db.bankTransaction.create({
      data: { orgId, date: b.date, amountCents: b.amountCents, label: b.label, reference: b.reference },
    });
  }

  await db.announcement.createMany({
    data: [
      { orgId, authorId: admin.id, title: "Risk review needed", body: "Several invoices were blocked by the risk rules. Managers: please review them in Invoices.", importance: "urgent", pinned: true },
      { orgId, authorId: admin.id, title: "Month-end close", body: "Please approve pending invoices before Friday 17:00 UTC.", importance: "important", pinned: false },
      { orgId, authorId: admin.id, title: "Welcome to Flowk", body: "Flowk runs rule-based workflows with human approvals and a full audit trail.", importance: "info", pinned: false },
    ],
  });

  console.log("Demo data loaded:", { invoices: demo.invoices.length, ...counts, bankTransactions: demo.bank.length });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
