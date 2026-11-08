/**
 * Creates the organization and the 3 demo accounts. Safe to re-run.
 * Demo password for all accounts: demo1234 (demo only, never use in production).
 */
import bcrypt from "bcryptjs";
import { db } from "../src/server/db";

const USERS = [
  { email: "admin@demo.test", name: "Alice Admin", role: "admin", domain: null },
  { email: "manager@demo.test", name: "Marc Manager", role: "manager", domain: "finance" },
  { email: "agent@demo.test", name: "Ada Agent", role: "agent", domain: "support" },
] as const;

async function main() {
  const org =
    (await db.organization.findFirst()) ?? (await db.organization.create({ data: { name: "Demo Corp" } }));
  const passwordHash = await bcrypt.hash("demo1234", 10);
  for (const u of USERS) {
    await db.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, domain: u.domain, orgId: org.id, passwordHash },
      create: { email: u.email, name: u.name, role: u.role, domain: u.domain, orgId: org.id, passwordHash },
    });
  }
  console.log(`Seed OK: organization "${org.name}", ${USERS.length} users (password: demo1234)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
