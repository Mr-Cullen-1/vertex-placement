import { z } from "zod";

/**
 * Admin-account-management input shapes (Super Admin only — see
 * /server/rbac.ts "admin:manage"). Lives in `domain/` — no Prisma, no
 * Next.js — same reasoning as candidate/schema.ts.
 *
 * No password-complexity policy existed anywhere in the product before
 * this (the seed script and NextAuth's own credentials schema both
 * accept any non-empty string) — `min(8)` here is a new, minimal
 * baseline for admin-created accounts, not a replacement for a stricter
 * policy that doesn't exist. Hashing itself is unchanged: bcrypt cost 12,
 * the exact mechanism `prisma/seed.ts` already uses for the Super Admin.
 */

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(200);

export const createAdminSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    email: z.email("Enter a valid email").max(255),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type CreateAdminInput = z.infer<typeof createAdminSchema>;

export const updateAdminSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.email("Enter a valid email").max(255),
});
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;

export const resetAdminPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ResetAdminPasswordInput = z.infer<typeof resetAdminPasswordSchema>;
