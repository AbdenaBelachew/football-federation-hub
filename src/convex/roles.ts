import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { ROLES, Role } from "./schema";

// ─── Federation-wide admin roles ───
const FEDERATION_ROLES: Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.FEDERATION_ADMIN,
  ROLES.COMPETITION_ADMIN,
  ROLES.REGISTRATION_OFFICER,
  ROLES.TRANSFER_OFFICER,
  ROLES.DISCIPLINARY_OFFICER,
];

// ─── Roles that can manage players/registrations ───
const REGISTRATION_ROLES: Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.FEDERATION_ADMIN,
  ROLES.REGISTRATION_OFFICER,
];

// ─── Roles that can manage clubs ───
const CLUB_ADMIN_ROLES: Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.FEDERATION_ADMIN,
];

// ─── Helper: get current user or throw ───
export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Authentication required");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");
  return { userId, user };
}

// ─── Helper: require specific role(s) ───
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowedRoles: Role[]
) {
  const { userId, user } = await requireAuth(ctx);
  const role = user.role as Role | undefined;
  if (!role || !allowedRoles.includes(role)) {
    throw new Error("Insufficient permissions");
  }
  return { userId, user, role };
}

// ─── Check if user is a federation admin ───
export function isFederationAdmin(role?: Role): boolean {
  return !!role && FEDERATION_ROLES.includes(role);
}

// ─── Check if user can manage registrations ───
export function canManageRegistrations(role?: Role): boolean {
  return !!role && REGISTRATION_ROLES.includes(role);
}

// ─── Check if user can manage clubs ───
export function canManageClubs(role?: Role): boolean {
  return !!role && CLUB_ADMIN_ROLES.includes(role);
}

// ─── Log an audit action ───
export async function logAudit(
  ctx: MutationCtx,
  params: {
    action: string;
    entityType: string;
    entityId: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }
) {
  const { userId, user } = await requireAuth(ctx);
  await ctx.db.insert("auditLog", {
    actorId: userId,
    actorName: user.name ?? user.email ?? "Unknown",
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    before: params.before,
    after: params.after,
    metadata: params.metadata,
    timestamp: Date.now(),
  });
}
