// Bootstraps the very first Super Admin account. There is no public
// registration flow (see /docs/ROUTES.md) — every subsequent Admin/Super
// Admin is created by a Super Admin through the product itself. Safe to
// re-run: no-ops if the account already exists. Does not create any
// candidate, test, or attempt data.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL;
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  const name = process.env.SEED_SUPER_ADMIN_NAME ?? "Super Admin";

  if (!email || !password) {
    console.log(
      "Skipping seed: SEED_SUPER_ADMIN_EMAIL / SEED_SUPER_ADMIN_PASSWORD not set."
    );
    return;
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Seed: Super Admin ${email} already exists, skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });

  console.log(`Seed: created Super Admin ${email}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
