import { NextResponse } from "next/server";
import { clearCookieHeader, getSessionFromRequest } from "@/server/session";
import { db } from "@/server/db";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (session) {
    await db.auditLog.create({
      data: {
        orgId: session.orgId,
        actorType: "user",
        actorId: session.userId,
        action: "logout",
        entityType: "User",
        entityId: session.userId,
       },
     });
  }

  const res = NextResponse.redirect(new URL("/login", req.url));
  res.headers.set("set-cookie", clearCookieHeader());
  return res;
}
