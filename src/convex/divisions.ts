import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireRole, logAudit } from "./roles";
import { ROLES } from "./schema";

// ─── List divisions ───
export const list = query({
  args: { seasonId: v.optional(v.id("seasons")) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const results = args.seasonId
      ? await ctx.db.query("divisions").withIndex("by_season", (q) => q.eq("seasonId", args.seasonId!)).collect()
      : await ctx.db.query("divisions").withIndex("by_tier").collect();
    return await Promise.all(
      results.map(async (d) => {
        const season = await ctx.db.get(d.seasonId);
        return { ...d, seasonName: season?.name ?? "Unknown" };
      })
    );
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    tier: v.number(),
    seasonId: v.id("seasons"),
    description: v.optional(v.string()),
    maxClubs: v.optional(v.number()),
    promotionSlots: v.optional(v.number()),
    relegationSlots: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN, ROLES.COMPETITION_ADMIN]);
    const divisionId = await ctx.db.insert("divisions", { ...args, createdAt: Date.now() });
    await logAudit(ctx, { action: "division.create", entityType: "division", entityId: divisionId, after: args });
    return divisionId;
  },
});

export const update = mutation({
  args: {
    divisionId: v.id("divisions"),
    name: v.optional(v.string()),
    tier: v.optional(v.number()),
    description: v.optional(v.string()),
    maxClubs: v.optional(v.number()),
    promotionSlots: v.optional(v.number()),
    relegationSlots: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN, ROLES.COMPETITION_ADMIN]);
    const existing = await ctx.db.get(args.divisionId);
    if (!existing) throw new Error("Division not found");
    const { divisionId, ...updates } = args;
    const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    await ctx.db.patch(args.divisionId, filtered);
    await logAudit(ctx, { action: "division.update", entityType: "division", entityId: args.divisionId, before: existing, after: { ...existing, ...filtered } });
    return args.divisionId;
  },
});
