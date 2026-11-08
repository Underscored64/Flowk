"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth";

const Schema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2000),
  importance: z.enum(["info", "important", "urgent"]),
  audience: z.enum(["all", "admin", "manager", "agent"]),
});

export async function createAnnouncement(formData: FormData): Promise<void> {
  const s = await requireRole("admin");
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/announcements?error=Please+check+the+fields");
  const d = parsed.data;
  const pinned = formData.get("pinned") === "on";

  const a = await db.announcement.create({
    data: {
      orgId: s.orgId,
      authorId: s.userId,
      title: d.title,
      body: d.body,
      importance: d.importance,
      audience: d.audience,
      pinned,
    },
  });
  await db.$transaction((tx: Prisma.TransactionClient) =>
    audit(tx, {
      orgId: s.orgId,
      actorType: "user",
      actorId: s.userId,
      action: "announcement.created",
      entityType: "announcement",
      entityId: a.id,
      data: { title: a.title, importance: a.importance },
    }),
  );
  revalidatePath("/announcements");
  redirect("/announcements");
}

export async function deleteAnnouncement(formData: FormData): Promise<void> {
  const s = await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const found = await db.announcement.findFirst({ where: { id, orgId: s.orgId } });
  if (found) {
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.announcement.delete({ where: { id } });
      await audit(tx, {
        orgId: s.orgId,
        actorType: "user",
        actorId: s.userId,
        action: "announcement.deleted",
        entityType: "announcement",
        entityId: id,
      });
    });
  }
  revalidatePath("/announcements");
  redirect("/announcements");
}
