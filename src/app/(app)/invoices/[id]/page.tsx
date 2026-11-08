import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireSession } from "@/server/auth";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import {
  Badge,
  Card,
  PageHeader,
  btnCls,
  btnDangerCls,
  inputCls,
  riskTone,
  statusTone,
} from "@/components/flowk-ui";
import { levelFor, type RuleFlag } from "@/server/engine/rules";
import { decideInvoice } from "../actions";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const s = await requireSession();
  const { id } = await params;
  const sp = await searchParams;

  const inv = await db.invoice.findFirst({
    where: { id, orgId: s.orgId },
    include: { supplier: true, po: true },
  });
  if (!inv) notFound();

  const run = await db.workflowRun.findFirst({
    where: { orgId: s.orgId, subjectType: "invoice", subjectId: inv.id },
    orderBy: { startedAt: "desc" },
    include: { steps: { orderBy: { startedAt: "asc" } }, approvals: true },
  });
  const logs = await db.auditLog.findMany({
    where: { orgId: s.orgId, entityType: "invoice", entityId: inv.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const flags = (inv.flags as RuleFlag[] | null) ?? [];
  const level = inv.riskScore === null ? null : levelFor(inv.riskScore);
  const pending = run?.approvals.find((a) => a.status === "pending");
  const canDecide = s.role === "admin" || s.role === "manager";

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={`Invoice ${inv.number}`}
        subtitle={inv.supplier.name}
        action={
          <Link href="/invoices" className="text-sm underline-offset-2 hover:underline">
            Back to invoices
          </Link>
        }
      />
      {sp.error ? (
        <p className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-800">{sp.error}</p>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <div className="text-xs text-muted-foreground">Amount</div>
          <div className="text-xl font-semibold">{formatMoney(inv.amountCents, inv.currency)}</div>
          <div className="mt-2 text-xs text-muted-foreground">
            Issued {formatDate(inv.issueDate)} - due {formatDate(inv.dueDate)}
          </div>
          {inv.po ? (
            <div className="mt-1 text-xs text-muted-foreground">
              PO {inv.po.reference}: {formatMoney(inv.po.amountCents)}
            </div>
          ) : null}
        </Card>
        <Card>
          <div className="text-xs text-muted-foreground">Risk score</div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold">{inv.riskScore ?? "-"}</span>
            {level ? <Badge tone={riskTone(level)}>{level}</Badge> : null}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">Computed by rules, not by AI.</div>
        </Card>
        <Card>
          <div className="text-xs text-muted-foreground">Status</div>
          <div className="mt-1 flex flex-wrap gap-2">
            <Badge tone={statusTone(inv.status)}>{inv.status.replace("_", " ")}</Badge>
            <Badge tone={statusTone(inv.paymentStatus === "scheduled" ? "approved" : inv.paymentStatus)}>
              payment {inv.paymentStatus}
            </Badge>
          </div>
        </Card>
      </div>

      <h2 className="mb-2 font-semibold">Why this score</h2>
      <Card className="mb-6">
        {flags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rule triggered.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {flags.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-4">
                <span>{f.label}</span>
                <Badge tone="amber">+{f.weight}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {pending ? (
        <>
          <h2 className="mb-2 font-semibold">Approval required</h2>
          <Card className="mb-6">
            {canDecide ? (
              <form action={decideInvoice} className="flex flex-col gap-3">
                <input type="hidden" name="approvalId" value={pending.id} />
                <input type="hidden" name="invoiceId" value={inv.id} />
                <input name="comment" maxLength={500} className={inputCls} placeholder="Comment (optional)" />
                <div className="flex gap-2">
                  <button type="submit" name="decision" value="approved" className={btnCls}>
                    Approve and schedule payment
                  </button>
                  <button type="submit" name="decision" value="rejected" className={btnDangerCls}>
                    Reject / keep blocked
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">Waiting for a manager to decide.</p>
            )}
          </Card>
        </>
      ) : null}

      <h2 className="mb-2 font-semibold">Workflow timeline</h2>
      <Card className="mb-6">
        {!run ? (
          <p className="text-sm text-muted-foreground">No workflow run.</p>
        ) : (
          <ol className="flex flex-col gap-2 text-sm">
            {run.steps.map((st) => (
              <li key={st.id} className="flex items-center justify-between gap-4">
                <span>
                  {st.stepId} <span className="text-muted-foreground">({st.type})</span>
                </span>
                <Badge tone={statusTone(st.status === "done" ? "completed" : st.status)}>{st.status}</Badge>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <h2 className="mb-2 font-semibold">Audit history</h2>
      <Card>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {logs.map((l) => (
              <li key={l.id} className="flex justify-between gap-4">
                <span>
                  {l.action} <span className="text-muted-foreground">by {l.actorType}</span>
                </span>
                <span className="text-muted-foreground">{formatDateTime(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
