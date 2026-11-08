import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, type SessionPayload } from "./session";

/** Read the verified session in server components and server actions. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get("session")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireSession(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export async function requireRole(...roles: string[]): Promise<SessionPayload> {
  const s = await requireSession();
  if (!roles.includes(s.role)) redirect("/403");
  return s;
}
