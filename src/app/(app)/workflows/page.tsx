import Link from "next/link";
import { db } from "@/server/db";
import { requireSession } from "@/server/auth";
import { formatDateTime } from "@/lib/format";
import { Badge, PageHeader, statusTone } from "@/components/flowk-ui";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage() {
  const s = await requireSession();
  const runs = await db.workflowRun.findMany({
    where: { orgId: s.orgId },
    include: { template: true },
    orderBy: { startedAt: "desc" },
    take: 100,
  });
  const templates = await db.workflowTemplate.findMany({ where: { orgId: s.orgId, active: true } });

  return (
    <div>
      <PageHeader title="Workflows" subtitle="Every run is traced step by step and audited." />
      <h2 className="mb-2 font-semibold">Templates</h2>
      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        {templates.length === 0 ? <span className="text-muted-foreground">None yet.</span> : null}
        {templates.map((t) => (
          <Badge key={t.id} tone="blue">
            {t.name} ({t.domain})
          </Badge>
        ))}
      </div>
      <h2 className="mb-2 font-semibold">Recent runs</h2>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-3">Workflow</th>
              <th className="p-3">Subject</th>
              <th className="p-3">Status</th>
              <th className="p-3">Started</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td className="p-4 text-muted-foreground" colSpan={4}>
                  No runs yet.
                </td>
              </tr>
            ) : null}
            {runs.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{r.template.name}</td>
                <td className="p-3">
                  {r.subjectType === "invoice" ? (
                    <Link href={`/invoices/${r.subjectId}`} className="underline-offset-2 hover:underline">
                      invoice
                    </Link>
                  ) : (
                    r.subjectType
                  )}
                </td>
                <td className="p-3">
                  <Badge tone={statusTone(r.status)}>{r.status.replace("_", " ")}</Badge>
                </td>
                <td className="p-3">{formatDateTime(r.startedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
