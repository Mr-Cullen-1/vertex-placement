"use server";

import { getActorOrThrow } from "@/lib/actor";
import { runAction } from "@/server/actions/action-result";
import {
  listAdmins,
  createAdmin,
  updateAdmin,
  resetAdminPassword,
  deactivateAdmin,
  reactivateAdmin,
  type AdminSummary,
} from "@/server/services/user.service";
import type { CreateAdminInput, UpdateAdminInput, ResetAdminPasswordInput } from "@/domain/admin/schema";

/** Admin-account-management Server Actions. Super Admin only — enforced
 * in the service layer (`assertPermission`), not here; these are thin
 * wrappers that resolve the actor from the session and shape the result
 * for client components (see action-result.ts). A regular Admin calling
 * any of these directly (bypassing the UI) still gets rejected inside
 * the service layer with a `ForbiddenError` — the same server-side
 * enforcement every other admin-facing action in this file's sibling
 * modules already relies on. */

export async function listAdminsAction() {
  return runAction<AdminSummary[]>(async () => {
    const actor = await getActorOrThrow();
    return listAdmins(actor);
  });
}

export async function createAdminAction(input: CreateAdminInput) {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    return createAdmin(actor, input);
  });
}

export async function updateAdminAction(userId: string, input: UpdateAdminInput) {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    return updateAdmin(actor, userId, input);
  });
}

export async function resetAdminPasswordAction(userId: string, input: ResetAdminPasswordInput) {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    await resetAdminPassword(actor, userId, input);
    return null;
  });
}

export async function deactivateAdminAction(userId: string) {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    return deactivateAdmin(actor, userId);
  });
}

export async function reactivateAdminAction(userId: string) {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    return reactivateAdmin(actor, userId);
  });
}
