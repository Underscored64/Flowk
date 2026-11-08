import { NextResponse } from "next/server";
import { z } from "zod";
import { compareSync } from "bcryptjs";
import { db } from "@/server/db";
import { createToken, sessionCookieHeader } from "@/server/session";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Simple in-memory rate limiter: 5 tries / minute per IP.
const attempts = new Map<string, number[]>();

function isRateLimited(ip: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const times = attempts.get(ip) ?? [];
  const recent = times.filter((t) => now - t < windowMs);
  if (recent.length >= limit) return true;
  recent.push(now);
  attempts.set(ip, recent);
  return false;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input." },
      { status: 400 },
    );
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!user) {
    return NextResponse.json(
      { error: "Invalid credentials." },
      { status: 401 },
    );
  }

  const ok = compareSync(parsed.data.password, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { error: "Invalid credentials." },
      { status: 401 },
    );
  }

  // Audit the login.
  await db.auditLog.create({
    data: {
      orgId: user.orgId,
      actorType: "user",
      actorId: user.id,
      action: "login",
      entityType: "User",
      entityId: user.id,
    },
  });

  const token = await createToken({
    userId: user.id,
    orgId: user.orgId,
    role: user.role,
    name: user.name,
  });

  const res = NextResponse.redirect(new URL("/dashboard", req.url));
  res.headers.set("set-cookie", sessionCookieHeader(token));
  return res;
}
