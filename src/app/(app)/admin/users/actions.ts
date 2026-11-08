"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth";

const Schema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(8).max(100),
  role: z.enum(["admin", "manager", "agent"]),
  domain: z.enum(["", "finance", "support"]).optional(),
});

export async function createUser(formData: FormData): Promise<void> {
  const s = await requireRole("admin");
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/users?error=Check+the+fields+(password+needs+8+characters+or+more)");
  const d = parsed.data;

  const existing = await db.user.findUnique({ where: { email: d.email } });
  if (existing) redirect("/admin/users?error=This+email+already+exists");

  const passwordHash = await bcrypt.hash(d.password, 10);
  const user = await db.user.create({
    data: {
      orgId: s.orgId,
      email: d.email,
      name: d.name,
      role: d.role,
      domain: d.domain ? d.domain : null,
      passwordHash,
    },
  });
  await db.$transaction((tx: Prisma.TransactionClient) =>
    audit(tx, {
      orgId: s.orgId,
      actorType: "user",
      actorId: s.userId,
      action: "user.created",
      entityType: "user",
      entityId: user.id,
      data: { email: user.email, role: user.role },
    }),
  );
  revalidatePath("/admin/users");
  redirect("/admin/users");
}
