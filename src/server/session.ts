import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "dev-secret-change-me-in-prod",
);
const COOKIE_NAME = "session";

interface BasePayload {
   [key: string]: unknown;
}

export interface SessionPayload extends BasePayload {
  userId: string;
  orgId: string;
  role: string;
  name: string;
}

/** Create a JWT token (8h expiry, HS256). */
export async function createToken(p: SessionPayload): Promise<string> {
  return new SignJWT(p)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h")
    .setIssuedAt()
    .setIssuer("app")
    .sign(SESSION_SECRET);
}

/** Verify a session token from a raw cookie string. */
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** Get the verified session from a NextRequest (route handlers). */
export async function getSessionFromRequest(
  req: NextRequest,
): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Build the set-cookie header value. */
export function sessionCookieHeader(token: string): string {
  const isSecure = process.env.APP_URL?.startsWith("https://") ?? false;
  const extra = isSecure ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${8 * 3600}${extra}`;
}

/** Build the clear-cookie header value. */
export function clearCookieHeader(): string {
  const isSecure = process.env.APP_URL?.startsWith("https://") ?? false;
  const extra = isSecure ? "; Secure" : "";
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${extra}`;
}
