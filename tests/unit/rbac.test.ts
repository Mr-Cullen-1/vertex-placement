import { describe, expect, it } from "vitest";
import { assertPermission, hasPermission } from "@/server/rbac";
import { ForbiddenError } from "@/server/errors";

describe("rbac permission matrix", () => {
  it("grants Super Admin every Admin permission plus test/question/band authoring", () => {
    expect(hasPermission("SUPER_ADMIN", "assignment:write")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "invitation:write")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "test:write")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "question:write")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "band:write")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "export:full")).toBe(true);
  });

  it("grants Admin assignment/invitation/candidate/result access but not test authoring", () => {
    expect(hasPermission("ADMIN", "test:read")).toBe(true);
    expect(hasPermission("ADMIN", "assignment:write")).toBe(true);
    expect(hasPermission("ADMIN", "invitation:write")).toBe(true);
    expect(hasPermission("ADMIN", "candidate:read")).toBe(true);
    expect(hasPermission("ADMIN", "result:read")).toBe(true);
  });

  it("denies Admin test:write, question:write, band:write, import:write, and full analytics/export", () => {
    expect(hasPermission("ADMIN", "test:write")).toBe(false);
    expect(hasPermission("ADMIN", "question:write")).toBe(false);
    expect(hasPermission("ADMIN", "band:write")).toBe(false);
    expect(hasPermission("ADMIN", "import:write")).toBe(false);
    expect(hasPermission("ADMIN", "analytics:read:full")).toBe(false);
    expect(hasPermission("ADMIN", "export:full")).toBe(false);
  });

  it("assertPermission throws ForbiddenError for a disallowed permission", () => {
    expect(() => assertPermission({ userId: "u1", role: "ADMIN" }, "test:write")).toThrow(
      ForbiddenError
    );
  });

  it("assertPermission does not throw for an allowed permission", () => {
    expect(() =>
      assertPermission({ userId: "u1", role: "SUPER_ADMIN" }, "test:write")
    ).not.toThrow();
  });
});
