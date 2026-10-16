import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireRole, logAudit } from "./roles";
import { ROLES } from "./schema";

// ─── List seasons ───
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db.query("seasons").collect();
  },
});

// ─── Get active season ───
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const seasons = await ctx.db
      .query("seasons")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    return seasons[0] ?? null;
  },
});

// ─── Create season ───
export const create = mutation({
  args: {
    name: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN, ROLES.COMPETITION_ADMIN]);
    const seasonId = await ctx.db.insert("seasons", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
    });
    await logAudit(ctx, {
      action: "season.create",
      entityType: "season",
      entityId: seasonId,
      after: args,
    });
    return seasonId;
  },
});

// ─── Toggle season active ───
export const toggleActive = mutation({
  args: { seasonId: v.id("seasons"), isActive: v.boolean() },
  handler: async (ctx, args) => {
    await requireRole(ctx, [ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN]);
    const existing = await ctx.db.get(args.seasonId);
    if (!existing) throw new Error("Season not found");
    await ctx.db.patch(args.seasonId, { isActive: args.isActive });
    await logAudit(ctx, {
      action: "season.toggle",
      entityType: "season",
      entityId: args.seasonId,
      before: { isActive: existing.isActive },
      after: { isActive: args.isActive },
    });
    return args.seasonId;
  },
});
