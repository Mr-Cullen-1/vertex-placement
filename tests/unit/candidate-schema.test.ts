import { describe, expect, it } from "vitest";
import { candidateInputSchema } from "@/domain/candidate/schema";

const VALID = {
  firstName: "Ada",
  lastName: "Lovelace",
  phoneNumber: "+998901234567",
  age: 25,
};

describe("candidateInputSchema", () => {
  it("accepts a fully valid submission without email", () => {
    expect(candidateInputSchema.safeParse(VALID).success).toBe(true);
  });

  it("accepts a valid email", () => {
    const result = candidateInputSchema.safeParse({ ...VALID, email: "ada@example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = candidateInputSchema.safeParse({ ...VALID, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing first name", () => {
    const result = candidateInputSchema.safeParse({ ...VALID, firstName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing last name", () => {
    const result = candidateInputSchema.safeParse({ ...VALID, lastName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing phone number", () => {
    const result = candidateInputSchema.safeParse({ ...VALID, phoneNumber: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an out-of-range age", () => {
    expect(candidateInputSchema.safeParse({ ...VALID, age: 0 }).success).toBe(false);
    expect(candidateInputSchema.safeParse({ ...VALID, age: 121 }).success).toBe(false);
  });

  it("rejects a non-integer age", () => {
    expect(candidateInputSchema.safeParse({ ...VALID, age: 25.5 }).success).toBe(false);
  });

  it("coerces a numeric-string age (form input) into a number", () => {
    const result = candidateInputSchema.safeParse({ ...VALID, age: "25" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.age).toBe(25);
  });
});
