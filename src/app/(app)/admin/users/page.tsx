import { db } from "@/server/db";
import { requireRole } from "@/server/auth";
import { formatDate } from "@/lib/format";
import { Badge, Card, PageHeader, btnCls, inputCls } from "@/components/flowk-ui";
import { createUser } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const s = await requireRole("admin");
  const sp = await searchParams;
  const users = await db.user.findMany({ where: { orgId: s.orgId }, orderBy: { createdAt: "asc" } });

  return (
    <div className="max-w-3xl">
      <PageHeader title="Users" subtitle="Create accounts and assign roles." />
      {sp.error ? (
        <p className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-800">{sp.error}</p>
      ) : null}
      <Card className="mb-6">
        <form action={createUser} className="grid gap-3 md:grid-cols-2">
          <input name="name" required maxLength={80} className={inputCls} placeholder="Full name" />
          <input name="email" type="email" required maxLength={120} className={inputCls} placeholder="Email" />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={100}
            className={inputCls}
            placeholder="Temporary password (8+ characters)"
          />
          <div className="flex gap-2">
            <select name="role" defaultValue="agent" className={inputCls}>
              <option value="admin">admin</option>
              <option value="manager">manager</option>
              <option value="agent">agent</option>
            </select>
            <select name="domain" defaultValue="" className={inputCls}>
              <option value="">no domain</option>
              <option value="finance">finance</option>
              <option value="support">support</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <button type="submit" className={btnCls}>
              Create user
            </button>
          </div>
        </form>
      </Card>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Domain</th>
              <th className="p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">
                  <Badge tone={u.role === "admin" ? "red" : u.role === "manager" ? "amber" : "blue"}>{u.role}</Badge>
                </td>
                <td className="p-3">{u.domain ?? "-"}</td>
                <td className="p-3">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
