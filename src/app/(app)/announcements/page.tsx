import { db } from "@/server/db";
import { requireSession } from "@/server/auth";
import { formatDateTime } from "@/lib/format";
import { Badge, Card, PageHeader, btnCls, btnGhostCls, inputCls } from "@/components/flowk-ui";
import { createAnnouncement, deleteAnnouncement } from "./actions";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const s = await requireSession();
  const sp = await searchParams;
  const now = new Date();
  const items = await db.announcement.findMany({
    where: {
      orgId: s.orgId,
      publishAt: { lte: now },
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        { OR: [{ audience: "all" }, { audience: s.role }] },
      ],
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 50,
  });
  const isAdmin = s.role === "admin";
  const tone = { info: "blue", important: "amber", urgent: "red" } as const;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Announcements"
        subtitle={isAdmin ? "Publish messages to your teams." : "Messages from your administrators."}
      />
      {sp.error ? (
        <p className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-800">{sp.error}</p>
      ) : null}

      {isAdmin ? (
        <Card className="mb-6">
          <form action={createAnnouncement} className="flex flex-col gap-3">
            <input name="title" required maxLength={120} className={inputCls} placeholder="Title" />
            <textarea
              name="body"
              required
              maxLength={2000}
              rows={4}
              className={inputCls}
              placeholder="Message (plain text)"
            />
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label>
                Importance{" "}
                <select name="importance" defaultValue="info" className="rounded-md border bg-background px-2 py-1">
                  <option value="info">info</option>
                  <option value="important">important</option>
                  <option value="urgent">urgent</option>
                </select>
              </label>
              <label>
                Audience{" "}
                <select name="audience" defaultValue="all" className="rounded-md border bg-background px-2 py-1">
                  <option value="all">everyone</option>
                  <option value="admin">admins</option>
                  <option value="manager">managers</option>
                  <option value="agent">agents</option>
                </select>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="pinned" /> Pin to top
              </label>
              <button type="submit" className={btnCls}>
                Publish
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3">
        {items.length === 0 ? <p className="text-sm text-muted-foreground">No announcements.</p> : null}
        {items.map((a) => (
          <Card key={a.id}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge tone={tone[a.importance as keyof typeof tone] ?? "neutral"}>{a.importance}</Badge>
                {a.pinned ? <Badge>pinned</Badge> : null}
                <span className="font-medium">{a.title}</span>
              </div>
              <span className="text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm">{a.body}</p>
            {isAdmin ? (
              <form action={deleteAnnouncement} className="mt-3">
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className={btnGhostCls}>
                  Delete
                </button>
              </form>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
