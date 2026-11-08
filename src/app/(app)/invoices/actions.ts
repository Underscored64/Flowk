"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { requireSession } from "@/server/auth";
import { runInvoiceWorkflow, decideApproval } from "@/server/engine/finance";
import { parseAmountToCents } from "@/lib/format";

const InvoiceSchema = z.object({
  supplierId: z.string().min(1),
  number: z.string().trim().min(1).max(60),
  amount: z.string().min(1),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  poId: z.string().optional(),
});

export async function createInvoice(formData: FormData): Promise<void> {
  const s = await requireSession();
  const parsed = InvoiceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/invoices/new?error=Please+fill+all+required+fields");
  const d = parsed.data;

  const cents = parseAmountToCents(d.amount);
  if (cents === null || cents <= 0) redirect("/invoices/new?error=Invalid+amount");
  const issueDate = new Date(d.issueDate);
  const dueDate = new Date(d.dueDate);
  if (Number.isNaN(issueDate.getTime()) || Number.isNaN(dueDate.getTime())) {
    redirect("/invoices/new?error=Invalid+date");
  }
  const supplier = await db.supplier.findFirst({ where: { id: d.supplierId, orgId: s.orgId } });
  if (!supplier) redirect("/invoices/new?error=Unknown+supplier");
  const poId = d.poId ? d.poId : null;
  if (poId) {
    const po = await db.purchaseOrder.findFirst({ where: { id: poId, orgId: s.orgId } });
    if (!po) redirect("/invoices/new?error=Unknown+purchase+order");
  }

  const inv = await db.invoice.create({
    data: {
      orgId: s.orgId,
      supplierId: supplier.id,
      poId,
      number: d.number,
      amountCents: cents,
      issueDate,
      dueDate,
    },
  });
  await db.$transaction((tx: Prisma.TransactionClient) =>
    audit(tx, {
      orgId: s.orgId,
      actorType: "user",
      actorId: s.userId,
      action: "invoice.created",
      entityType: "invoice",
      entityId: inv.id,
      data: { number: inv.number, amountCents: cents },
    }),
  );
  await runInvoiceWorkflow(inv.id, { type: "user", id: s.userId });
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  redirect(`/invoices/${inv.id}`);
}

export async function decideInvoice(formData: FormData): Promise<void> {
  const s = await requireSession();
  const approvalId = String(formData.get("approvalId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const comment = String(formData.get("comment") ?? "").slice(0, 500);
  const invoiceId = String(formData.get("invoiceId") ?? "");
  if (!approvalId || (decision !== "approved" && decision !== "rejected")) {
    redirect(`/invoices/${invoiceId}?error=Invalid+decision`);
  }
  try {
    await decideApproval({
      approvalId,
      userId: s.userId,
      orgId: s.orgId,
      role: s.role,
      decision,
      comment: comment || undefined,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    redirect(`/invoices/${invoiceId}?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
  redirect(`/invoices/${invoiceId}`);
}
