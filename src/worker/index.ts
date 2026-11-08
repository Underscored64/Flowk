/**
 * Flowk background worker. Runs as its own container on the Vultr VM (see docker-compose.yml).
 * Every minute it watches approvals: if a manager has not decided within the deadline,
 * it publishes ONE announcement and writes an audit entry (actor: system).
 * Start with: npm run worker
 */
import { db } from "../server/db";
import { audit } from "../server/audit";

const TICK_MS = 60_000;

async function flagOverdueApprovals(): Promise<number> {
  const overdue = await db.approval.findMany({
    where: { status: "pending", dueAt: { lt: new Date() } },
    include: { run: true },
    take: 50,
  });
  let flagged = 0;
  for (const ap of overdue) {
    const already = await db.auditLog.findFirst({
      where: {
        orgId: ap.orgId,
        action: "approval.overdue",
        entityType: ap.run.subjectType,
        entityId: ap.run.subjectId,
      },
      select: { id: true },
    });
    if (already) continue;
    await db.$transaction(async (tx) => {
      await tx.announcement.create({
        data: {
          orgId: ap.orgId,
          authorId: "system",
          title: `Approval overdue (${ap.run.subjectType})`,
          body: "A pending approval passed its 24h deadline. A manager must decide.",
          importance: "important",
          audience: "all",
        },
      });
      await audit(tx, {
        orgId: ap.orgId,
        actorType: "system",
        action: "approval.overdue",
        entityType: ap.run.subjectType,
        entityId: ap.run.subjectId,
        data: { approvalId: ap.id },
      });
    });
    flagged += 1;
  }
  return flagged;
}

async function tick(): Promise<void> {
  try {
    const n = await flagOverdueApprovals();
    console.log(`[worker] ${new Date().toISOString()} tick ok, overdue flagged: ${n}`);
  } catch (e) {
    console.error("[worker] tick failed", e);
  }
}

async function main(): Promise<void> {
  console.log("[worker] started, interval 60s");
  await tick();
  const timer = setInterval(tick, TICK_MS);
  const stop = async () => {
    clearInterval(timer);
    await db.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

void main();
