import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireRole, logAudit } from "./roles";
import { ROLES } from "./schema";

// ─── List competitions ───
export const list = query({
  args: {
    seasonId: v.optional(v.id("seasons")),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const competitions = args.seasonId
      ? await ctx.db.query("competitions").withIndex("by_season", (q) => q.eq("seasonId", args.seasonId!)).collect()
      : await ctx.db.query("competitions").collect();

    return await Promise.all(
      competitions.map(async (c) => {
        const season = await ctx.db.get(c.seasonId);
        return { ...c, seasonName: season?.name ?? "Unknown" };
      })
    );
  },
});

// ─── Get single competition ───
export const get = query({
  args: { competitionId: v.id("competitions") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.get(args.competitionId);
  },
});

// ─── Create competition ───
export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(v.literal("league"), v.literal("cup"), v.literal("youth"), v.literal("friendly")),
    seasonId: v.id("seasons"),
    divisionId: v.optional(v.id("divisions")),
    description: v.optional(v.string()),
    rules: v.optional(v.string()),
    registrationDeadline: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN, ROLES.COMPETITION_ADMIN]);
    const competitionId = await ctx.db.insert("competitions", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
    });
    await logAudit(ctx, {
      action: "competition.create",
      entityType: "competition",
      entityId: competitionId,
      after: args,
    });
    return competitionId;
  },
});

// ─── Update competition ───
export const update = mutation({
  args: {
    competitionId: v.id("competitions"),
    name: v.optional(v.string()),
    type: v.optional(v.union(v.literal("league"), v.literal("cup"), v.literal("youth"), v.literal("friendly"))),
    description: v.optional(v.string()),
    rules: v.optional(v.string()),
    registrationDeadline: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN, ROLES.COMPETITION_ADMIN]);
    const existing = await ctx.db.get(args.competitionId);
    if (!existing) throw new Error("Competition not found");

    const { competitionId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(args.competitionId, filtered);

    await logAudit(ctx, {
      action: "competition.update",
      entityType: "competition",
      entityId: args.competitionId,
      before: existing,
      after: { ...existing, ...filtered },
    });
    return args.competitionId;
  },
});
