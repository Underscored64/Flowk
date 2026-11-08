import Link from "next/link";
import { db } from "@/server/db";
import { requireSession } from "@/server/auth";
import { formatMoney } from "@/lib/format";
import { Badge, Card, PageHeader } from "@/components/flowk-ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const s = await requireSession();
  const orgId = s.orgId;
  const [runsByStatus, invByStatus, pendingApprovals, atRisk, announcements] = await Promise.all([
    db.workflowRun.groupBy({ by: ["status"], where: { orgId }, _count: true }),
    db.invoice.groupBy({ by: ["status"], where: { orgId }, _count: true, _sum: { amountCents: true } }),
    db.approval.findMany({
      where: { orgId, status: "pending" },
      include: { run: true },
      orderBy: { createdAt: "asc" },
      take: 8,
    }),
    db.invoice.findMany({
      where: { orgId, status: { in: ["blocked", "in_review"] } },
      include: { supplier: true },
      orderBy: { riskScore: "desc" },
      take: 5,
    }),
    db.announcement.count({ where: { orgId } }),
  ]);

  const run = (st: string) => runsByStatus.find((r) => r.status === st)?._count ?? 0;
  const inv = (st: string) => invByStatus.find((r) => r.status === st);
  const blockedCents = inv("blocked")?._sum.amountCents ?? 0;

  const kpis = [
    { label: "Runs completed", value: run("completed") },
    { label: "Waiting approval", value: run("waiting_approval") },
    { label: "Runs failed", value: run("failed") },
    { label: "Invoices blocked", value: inv("blocked")?._count ?? 0, hint: formatMoney(blockedCents) },
    { label: "Invoices paid", value: inv("paid")?._count ?? 0 },
    { label: "Announcements", value: announcements },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`Welcome, ${s.name}.`} />
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <div className="text-xs text-muted-foreground">{k.label}</div>
            <div className="text-2xl font-semibold">{k.value}</div>
            {k.hint ? <div className="text-xs text-muted-foreground">{k.hint}</div> : null}
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-semibold">Pending approvals</h2>
          <Card>
            {pendingApprovals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing waiting.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {pendingApprovals.map((a) => (
                  <li key={a.id} className="flex items-center justify-between">
                    <Link
                      href={a.run.subjectType === "invoice" ? `/invoices/${a.run.subjectId}` : "/workflows"}
                      className="underline-offset-2 hover:underline"
                    >
                      {a.run.subjectType} review
                    </Link>
                    <Badge tone="amber">{a.assigneeRole}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div>
          <h2 className="mb-2 font-semibold">Highest-risk invoices</h2>
          <Card>
            {atRisk.length === 0 ? (
              <p className="text-sm text-muted-foreground">No risky invoices.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {atRisk.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2">
                    <Link href={`/invoices/${i.id}`} className="underline-offset-2 hover:underline">
                      {i.number} - {i.supplier.name}
                    </Link>
                    <Badge tone={i.status === "blocked" ? "red" : "amber"}>{i.riskScore}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
