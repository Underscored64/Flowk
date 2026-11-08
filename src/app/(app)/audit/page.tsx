import { db } from "@/server/db";
import { requireRole } from "@/server/auth";
import { formatDateTime } from "@/lib/format";
import { Badge, PageHeader } from "@/components/flowk-ui";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const s = await requireRole("admin", "manager");
  const logs = await db.auditLog.findMany({
    where: { orgId: s.orgId },
    orderBy: { createdAt: "desc" },
    take: 150,
  });
  return (
    <div>
      <PageHeader
        title="Audit log"
        subtitle="Append-only record of every action taken by users, rules and the system."
      />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Actor</th>
              <th className="p-3">Action</th>
              <th className="p-3">Entity</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-3 whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                <td className="p-3">
                  <Badge tone={l.actorType === "ai" ? "blue" : l.actorType === "system" ? "neutral" : "green"}>
                    {l.actorType}
                  </Badge>
                </td>
                <td className="p-3">{l.action}</td>
                <td className="p-3 text-muted-foreground">
                  {l.entityType} {l.entityId.slice(0, 8)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
