import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../setup/db-reset";
import { createUser } from "./fixtures";
import { db } from "@/lib/db";
import {
  listAdmins,
  createAdmin,
  updateAdmin,
  resetAdminPassword,
  deactivateAdmin,
  reactivateAdmin,
  verifyAdminCredentials,
  isUserSessionActive,
} from "@/server/services/user.service";
import { ForbiddenError, DuplicateEmailError, SuperAdminProtectedError } from "@/server/errors";

beforeEach(async () => {
  await resetDb();
});

const VALID_INPUT = {
  name: "New Admin",
  email: "new-admin@vertex.test",
  password: "correct-horse",
  confirmPassword: "correct-horse",
};

describe("Admin account management — Super Admin capabilities", () => {
  it("Super Admin can list admins", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    await createAdmin(superAdmin, VALID_INPUT);
    const admins = await listAdmins(superAdmin);
    expect(admins.map((a) => a.email)).toEqual(expect.arrayContaining([VALID_INPUT.email]));
  });

  it("Super Admin can create an ADMIN", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const created = await createAdmin(superAdmin, VALID_INPUT);
    expect(created.role).toBe("ADMIN");
    expect(created.isActive).toBe(true);
  });

  it("Super Admin can edit an ADMIN", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const created = await createAdmin(superAdmin, VALID_INPUT);
    const updated = await updateAdmin(superAdmin, created.id, {
      name: "Renamed Admin",
      email: "renamed@vertex.test",
    });
    expect(updated.name).toBe("Renamed Admin");
    expect(updated.email).toBe("renamed@vertex.test");
  });

  it("Super Admin can reset an ADMIN's password", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const created = await createAdmin(superAdmin, VALID_INPUT);
    await resetAdminPassword(superAdmin, created.id, {
      password: "brand-new-pass",
      confirmPassword: "brand-new-pass",
    });
    const verified = await verifyAdminCredentials(VALID_INPUT.email, "brand-new-pass");
    expect(verified?.id).toBe(created.id);
  });

  it("Super Admin can remove/deactivate an ADMIN", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const created = await createAdmin(superAdmin, VALID_INPUT);
    const deactivated = await deactivateAdmin(superAdmin, created.id);
    expect(deactivated.isActive).toBe(false);
  });

  it("Super Admin can reactivate a deactivated ADMIN", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const created = await createAdmin(superAdmin, VALID_INPUT);
    await deactivateAdmin(superAdmin, created.id);
    const reactivated = await reactivateAdmin(superAdmin, created.id);
    expect(reactivated.isActive).toBe(true);
  });
});

describe("Admin account management — regular ADMIN is fully blocked", () => {
  it("ADMIN cannot list admins", async () => {
    const admin = await createUser("ADMIN");
    await expect(listAdmins(admin)).rejects.toThrow(ForbiddenError);
  });

  it("ADMIN cannot create an ADMIN", async () => {
    const admin = await createUser("ADMIN");
    await expect(createAdmin(admin, VALID_INPUT)).rejects.toThrow(ForbiddenError);
  });

  it("ADMIN cannot edit another ADMIN", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const admin = await createUser("ADMIN");
    const target = await createAdmin(superAdmin, VALID_INPUT);
    await expect(
      updateAdmin(admin, target.id, { name: "Hijack", email: "hijack@vertex.test" })
    ).rejects.toThrow(ForbiddenError);
  });

  it("ADMIN cannot reset another ADMIN's password", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const admin = await createUser("ADMIN");
    const target = await createAdmin(superAdmin, VALID_INPUT);
    await expect(
      resetAdminPassword(admin, target.id, { password: "hijacked1", confirmPassword: "hijacked1" })
    ).rejects.toThrow(ForbiddenError);
  });

  it("ADMIN cannot remove another ADMIN", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const admin = await createUser("ADMIN");
    const target = await createAdmin(superAdmin, VALID_INPUT);
    await expect(deactivateAdmin(admin, target.id)).rejects.toThrow(ForbiddenError);
  });

  it("ADMIN cannot call admin-management actions directly to self-escalate (no role parameter exists to assign SUPER_ADMIN in the first place)", async () => {
    const admin = await createUser("ADMIN");
    // There is no `role` field anywhere in CreateAdminInput/UpdateAdminInput
    // — createAdmin always assigns "ADMIN" server-side (see user.service.ts).
    // The only assertion needed here is that the whole surface is
    // permission-gated, already covered above; this test documents the
    // absence of a role-selector attack surface explicitly.
    await expect(createAdmin(admin, VALID_INPUT)).rejects.toThrow(ForbiddenError);
  });
});

describe("Admin account management — Super Admin protection", () => {
  it("Super Admin cannot be edited through the admin-management path", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    await expect(
      updateAdmin(superAdmin, superAdmin.userId, { name: "Self edit", email: "self@vertex.test" })
    ).rejects.toThrow(SuperAdminProtectedError);
  });

  it("Super Admin cannot be removed through the admin-management path", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    await expect(deactivateAdmin(superAdmin, superAdmin.userId)).rejects.toThrow(
      SuperAdminProtectedError
    );
  });

  it("Super Admin cannot have its password reset through the admin-management path", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    await expect(
      resetAdminPassword(superAdmin, superAdmin.userId, { password: "newpass12", confirmPassword: "newpass12" })
    ).rejects.toThrow(SuperAdminProtectedError);
  });

  it("a second Super Admin is also protected from this path (not just 'the last one')", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const anotherSuperAdmin = await createUser("SUPER_ADMIN");
    await expect(deactivateAdmin(superAdmin, anotherSuperAdmin.userId)).rejects.toThrow(
      SuperAdminProtectedError
    );
  });
});

describe("Admin account management — input validation", () => {
  it("rejects a duplicate email on create", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    await createAdmin(superAdmin, VALID_INPUT);
    await expect(createAdmin(superAdmin, VALID_INPUT)).rejects.toThrow(DuplicateEmailError);
  });

  it("rejects a duplicate email on edit", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const first = await createAdmin(superAdmin, VALID_INPUT);
    const second = await createAdmin(superAdmin, {
      ...VALID_INPUT,
      email: "second-admin@vertex.test",
    });
    await expect(
      updateAdmin(superAdmin, second.id, { name: second.name, email: first.email })
    ).rejects.toThrow(DuplicateEmailError);
  });

  it("rejects a password under 8 characters", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    await expect(
      createAdmin(superAdmin, { ...VALID_INPUT, password: "short1", confirmPassword: "short1" })
    ).rejects.toThrow();
  });

  it("rejects mismatched password/confirmPassword", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    await expect(
      createAdmin(superAdmin, { ...VALID_INPUT, confirmPassword: "different-pass" })
    ).rejects.toThrow();
  });

  it("normalizes email the same way self-service does (lowercase)", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const created = await createAdmin(superAdmin, { ...VALID_INPUT, email: "New-Admin@Vertex.test" });
    expect(created.email).toBe("new-admin@vertex.test");
  });

  it("stores the password hashed, never plaintext", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const created = await createAdmin(superAdmin, VALID_INPUT);
    const row = await db.user.findUniqueOrThrow({ where: { id: created.id } });
    expect(row.passwordHash).not.toBe(VALID_INPUT.password);
    expect(row.passwordHash.startsWith("$2")).toBe(true); // bcrypt hash prefix
  });
});

describe("Admin account management — authentication and session revocation", () => {
  it("a created ADMIN can log in with the password it was given", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    await createAdmin(superAdmin, VALID_INPUT);
    const verified = await verifyAdminCredentials(VALID_INPUT.email, VALID_INPUT.password);
    expect(verified).not.toBeNull();
    expect(verified?.role).toBe("ADMIN");
  });

  it("a removed/deactivated ADMIN cannot log in", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const created = await createAdmin(superAdmin, VALID_INPUT);
    await deactivateAdmin(superAdmin, created.id);
    const verified = await verifyAdminCredentials(VALID_INPUT.email, VALID_INPUT.password);
    expect(verified).toBeNull();
  });

  it("an already-authenticated removed ADMIN loses protected access at the next session check", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const created = await createAdmin(superAdmin, VALID_INPUT);

    // Simulates the already-issued JWT's per-request re-check (the `jwt`
    // callback in src/lib/auth.ts calls this exact function on every
    // request after sign-in) — while active, the session stays valid.
    expect(await isUserSessionActive(created.id)).not.toBeNull();

    await deactivateAdmin(superAdmin, created.id);

    // The next authorization check for that same, already-issued token
    // must now reject it — this is what makes deactivation effective
    // immediately rather than only at the next login attempt.
    expect(await isUserSessionActive(created.id)).toBeNull();
  });

  it("reactivating restores session validity", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const created = await createAdmin(superAdmin, VALID_INPUT);
    await deactivateAdmin(superAdmin, created.id);
    expect(await isUserSessionActive(created.id)).toBeNull();

    await reactivateAdmin(superAdmin, created.id);
    expect(await isUserSessionActive(created.id)).not.toBeNull();
  });
});
