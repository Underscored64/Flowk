import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function AdminIndex() {
  await requireRole("admin");
  redirect("/admin/users");
}
