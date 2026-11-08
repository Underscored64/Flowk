import { NextResponse } from "next/server";
import { z } from "zod";
import { hashSync } from "bcryptjs";
import { db } from "@/server/db";
import { getSessionFromRequest } from "@/server/session";
import { audit } from "@/server/audit";
import type { NextRequest } from "next/server";

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "manager", "agent"]),
});

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { name, email, password, role } = parsed.data;
  const passwordHash = hashSync(password, 10);

  const user = await db.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: { email, name, role, orgId: session.orgId, passwordHash },
    });
    await audit(tx, {
      orgId: session.orgId,
      actorType: "user",
      actorId: session.userId,
      action: "user.created",
      entityType: "User",
      entityId: u.id,
      data: { email: u.email, role: u.role },
    });
    return u;
  });

  return NextResponse.json({ id: user.id, email: user.email, role: user.role }, { status: 201 });
}
