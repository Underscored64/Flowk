"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth";
import { matchTransaction } from "@/server/engine/reconcile";

export async function runReconciliation(): Promise<void> {
  const s = await requireRole("admin", "manager");
  const [txs, invoices] = await Promise.all([
    db.bankTransaction.findMany({ where: { orgId: s.orgId, matchStatus: "unmatched" } }),
    db.invoice.findMany({
      where: { orgId: s.orgId, paymentStatus: { not: "paid" } },
      select: { id: true, number: true, amountCents: true, status: true, paymentStatus: true },
    }),
  ]);
  const paidNow = new Set<string>();
  const counts = { matched: 0, partial: 0, unmatched: 0 };

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const t of txs) {
      const open = invoices.filter((i) => !paidNow.has(i.id));
      const r = matchTransaction(t, open);
      counts[r.status] += 1;
      if (r.status === "unmatched") continue;
      await tx.bankTransaction.update({
        where: { id: t.id },
        data: { matchStatus: r.status, matchedInvoiceId: r.invoiceId },
      });
      if (r.status === "matched" && r.invoiceId) {
        paidNow.add(r.invoiceId);
        await tx.invoice.update({
          where: { id: r.invoiceId },
          data: { paymentStatus: "paid", status: "paid" },
        });
      }
    }
    await audit(tx, {
      orgId: s.orgId,
      actorType: "user",
      actorId: s.userId,
      action: "reconciliation.run",
      entityType: "reconciliation",
      entityId: `run-${Date.now()}`,
      data: counts,
    });
  });
  revalidatePath("/reconciliation");
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  redirect("/reconciliation");
}
