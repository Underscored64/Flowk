import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { audit } from "../audit";
import { evaluateRules } from "./rules";
import {
  FINANCE_RULES,
  FINANCE_TEMPLATE,
  FINANCE_TEMPLATE_KEY,
  buildInvoiceContext,
} from "./finance-rules";
import { formatMoney } from "../../lib/format";

type Actor = { type: "user" | "system"; id?: string };
const json = (v: unknown) => v as unknown as Prisma.InputJsonValue;

/**
 * Runs the invoice workflow in-process (no background worker):
 * rules -> low: auto-approve + schedule payment | medium/high: human approval.
 * High risk also blocks the invoice and publishes an urgent announcement.
 * Everything is written in one transaction together with the audit entries.
 */
export async function runInvoiceWorkflow(
  invoiceId: string,
  actor: Actor,
  opts: { silent?: boolean } = {},
) {
  const inv = await db.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { supplier: true, po: true },
  });
  const others = await db.invoice.findMany({
    where: { orgId: inv.orgId, supplierId: inv.supplierId, id: { not: inv.id } },
    select: { number: true, amountCents: true, issueDate: true },
  });
  const now = new Date();
  const ctx = buildInvoiceContext({
    invoice: inv,
    supplier: inv.supplier,
    po: inv.po,
    others,
    now,
  });
  const result = evaluateRules(FINANCE_RULES, ctx);
  const needsApproval = result.level !== "low";
  const blocked = result.level === "high";

  return db.$transaction(async (tx) => {
    const template = await tx.workflowTemplate.upsert({
      where: {
        orgId_key_version: { orgId: inv.orgId, key: FINANCE_TEMPLATE_KEY, version: 1 },
      },
      update: {},
      create: {
        orgId: inv.orgId,
        key: FINANCE_TEMPLATE_KEY,
        name: "Invoice processing",
        domain: "finance",
        version: 1,
        definition: json(FINANCE_TEMPLATE),
      },
    });

    const run = await tx.workflowRun.create({
      data: {
        orgId: inv.orgId,
        templateId: template.id,
        templateVersion: 1,
        status: needsApproval ? "waiting_approval" : "completed",
        subjectType: "invoice",
        subjectId: inv.id,
        context: json(ctx),
        currentStepId: needsApproval ? "review" : null,
        startedBy: actor.id ?? null,
        finishedAt: needsApproval ? null : now,
      },
    });

    await tx.stepRun.create({
      data: {
        runId: run.id,
        stepId: "check",
        type: "rules",
        status: "done",
        attempt: 1,
        input: json(ctx),
        output: json(result),
        startedAt: now,
        finishedAt: now,
      },
    });

    if (needsApproval) {
      await tx.stepRun.create({
        data: { runId: run.id, stepId: "review", type: "approval", status: "waiting", attempt: 1, startedAt: now },
      });
      await tx.approval.create({
        data: {
          orgId: inv.orgId,
          runId: run.id,
          stepId: "review",
          assigneeRole: "manager",
          dueAt: new Date(now.getTime() + 24 * 3600 * 1000),
        },
      });
    } else {
      await tx.stepRun.create({
        data: {
          runId: run.id,
          stepId: "pay",
          type: "task",
          status: "done",
          attempt: 1,
          output: json({ paymentStatus: "scheduled" }),
          startedAt: now,
          finishedAt: now,
        },
      });
    }

    await tx.invoice.update({
      where: { id: inv.id },
      data: {
        riskScore: result.score,
        flags: json(result.flags),
        status: blocked ? "blocked" : needsApproval ? "in_review" : "approved",
        paymentStatus: needsApproval ? "unpaid" : "scheduled",
      },
    });

    await audit(tx, {
      orgId: inv.orgId,
      actorType: actor.type,
      actorId: actor.id ?? null,
      action: "invoice.risk_scored",
      entityType: "invoice",
      entityId: inv.id,
      data: json({ score: result.score, level: result.level, flags: result.flags.map((f) => f.id), runId: run.id }),
    });

    if (blocked && !opts.silent) {
      await tx.announcement.create({
        data: {
          orgId: inv.orgId,
          authorId: actor.id ?? "system",
          title: `Invoice ${inv.number} blocked (risk ${result.score})`,
          body:
            `Invoice ${inv.number} from ${inv.supplier.name} (${formatMoney(inv.amountCents, inv.currency)}) was blocked automatically.\n` +
            result.flags.map((f) => `- ${f.label}`).join("\n") +
            `\nA manager must review it.`,
          importance: "urgent",
          audience: "all",
          pinned: true,
        },
      });
      await audit(tx, {
        orgId: inv.orgId,
        actorType: "system",
        action: "announcement.auto_published",
        entityType: "invoice",
        entityId: inv.id,
      });
    }

    return { runId: run.id, level: result.level, score: result.score };
  });
}

export async function decideApproval(input: {
  approvalId: string;
  userId: string;
  orgId: string;
  role: string;
  decision: "approved" | "rejected";
  comment?: string;
}) {
  if (input.role !== "admin" && input.role !== "manager") throw new Error("Forbidden");
  await db.$transaction(async (tx) => {
    const ap = await tx.approval.findFirst({
      where: { id: input.approvalId, orgId: input.orgId },
      include: { run: true },
    });
    if (!ap) throw new Error("Approval not found");
    if (ap.status !== "pending") throw new Error("Already decided");
    const now = new Date();

    await tx.approval.update({
      where: { id: ap.id },
      data: {
        status: input.decision,
        decidedBy: input.userId,
        decidedAt: now,
        comment: input.comment ?? null,
      },
    });
    await tx.stepRun.updateMany({
      where: { runId: ap.runId, stepId: ap.stepId, status: "waiting" },
      data: {
        status: "done",
        output: json({ decision: input.decision, comment: input.comment ?? null }),
        finishedAt: now,
      },
    });
    await tx.workflowRun.update({
      where: { id: ap.runId },
      data: { status: "completed", currentStepId: null, finishedAt: now },
    });
    if (ap.run.subjectType === "invoice") {
      await tx.invoice.update({
        where: { id: ap.run.subjectId },
        data:
          input.decision === "approved"
            ? { status: "approved", paymentStatus: "scheduled" }
            : { status: "blocked", paymentStatus: "unpaid" },
      });
    }
    await audit(tx, {
      orgId: input.orgId,
      actorType: "user",
      actorId: input.userId,
      action: `approval.${input.decision}`,
      entityType: ap.run.subjectType,
      entityId: ap.run.subjectId,
      data: json({ approvalId: ap.id, comment: input.comment ?? null }),
    });
  });
}
