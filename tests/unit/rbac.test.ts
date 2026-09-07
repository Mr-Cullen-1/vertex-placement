import { describe, expect, it } from "vitest";
import { assertPermission, hasPermission } from "@/server/rbac";
import { ForbiddenError } from "@/server/errors";

/**
 * Correction pass: test/question/band/import authoring moved from
 * Super-Admin-only to Admin + Super Admin — see
 * /docs/PRODUCT_RULES.md "Roles". SUPER_ADMIN's only remaining
 * distinguishing privilege is `admin:manage` (plus the pre-existing,
 * deliberately-unchanged `analytics:read:full`/`export:full` content-
 * depth distinction — not an account/role-administration matter).
 */
describe("rbac permission matrix", () => {
  it("grants Admin every normal product/operational permission, including test/question/band/import authoring", () => {
    expect(hasPermission("ADMIN", "test:read")).toBe(true);
    expect(hasPermission("ADMIN", "test:write")).toBe(true);
    expect(hasPermission("ADMIN", "question:write")).toBe(true);
    expect(hasPermission("ADMIN", "band:write")).toBe(true);
    expect(hasPermission("ADMIN", "import:write")).toBe(true);
    expect(hasPermission("ADMIN", "assignment:write")).toBe(true);
    expect(hasPermission("ADMIN", "invitation:write")).toBe(true);
    expect(hasPermission("ADMIN", "candidate:read")).toBe(true);
    expect(hasPermission("ADMIN", "result:read")).toBe(true);
    expect(hasPermission("ADMIN", "result:write")).toBe(true);
    expect(hasPermission("ADMIN", "analytics:read:standard")).toBe(true);
    expect(hasPermission("ADMIN", "export:standard")).toBe(true);
  });

  it("denies Admin the remaining Super-Admin-only permissions: full analytics/export and admin account management", () => {
    expect(hasPermission("ADMIN", "analytics:read:full")).toBe(false);
    expect(hasPermission("ADMIN", "export:full")).toBe(false);
    expect(hasPermission("ADMIN", "admin:manage")).toBe(false);
  });

  it("grants Super Admin every Admin permission plus the Super-Admin-only ones", () => {
    expect(hasPermission("SUPER_ADMIN", "test:write")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "question:write")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "band:write")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "import:write")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "assignment:write")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "invitation:write")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "analytics:read:full")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "export:full")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "admin:manage")).toBe(true);
  });

  it("assertPermission throws ForbiddenError for a disallowed permission", () => {
    expect(() => assertPermission({ userId: "u1", role: "ADMIN" }, "admin:manage")).toThrow(
      ForbiddenError
    );
  });

  it("assertPermission does not throw for an allowed permission", () => {
    expect(() =>
      assertPermission({ userId: "u1", role: "ADMIN" }, "test:write")
    ).not.toThrow();
    expect(() =>
      assertPermission({ userId: "u1", role: "SUPER_ADMIN" }, "admin:manage")
    ).not.toThrow();
  });
});
