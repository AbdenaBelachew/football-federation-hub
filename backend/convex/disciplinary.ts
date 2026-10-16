import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireRole, logAudit } from "./roles";
import { ROLES } from "./schema";

// ─── List disciplinary cases ───
export const list = query({
  args: {
    status: v.optional(v.union(
      v.literal("open"), v.literal("suspended"), v.literal("served"),
      v.literal("appealed"), v.literal("dismissed")
    )),
    playerId: v.optional(v.id("players")),
    clubId: v.optional(v.id("clubs")),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    let all;
    if (args.playerId) {
      all = await ctx.db.query("disciplinaryCases").withIndex("by_player", (q) => q.eq("playerId", args.playerId!)).collect();
    } else if (args.clubId) {
      all = await ctx.db.query("disciplinaryCases").withIndex("by_club", (q) => q.eq("clubId", args.clubId!)).collect();
    } else if (args.status) {
      all = await ctx.db.query("disciplinaryCases").withIndex("by_status", (q) => q.eq("status", args.status!)).collect();
    } else {
      all = await ctx.db.query("disciplinaryCases").collect();
    }

    const enriched = await Promise.all(
      all.map(async (c) => {
        const player = await ctx.db.get(c.playerId);
        const club = c.clubId ? await ctx.db.get(c.clubId) : null;
        return { ...c, player, club };
      })
    );

    return { items: enriched.slice(offset, offset + limit), total: enriched.length };
  },
});

// ─── Create disciplinary case ───
export const create = mutation({
  args: {
    playerId: v.id("players"),
    matchId: v.optional(v.id("matches")),
    clubId: v.optional(v.id("clubs")),
    competitionId: v.optional(v.id("competitions")),
    offense: v.string(),
    cardType: v.union(v.literal("yellow"), v.literal("red"), v.literal("second_yellow")),
    matchMinute: v.optional(v.number()),
    suspensionMatches: v.number(),
    fine: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN, ROLES.DISCIPLINARY_OFFICER]);
    const now = Date.now();
    const caseId = await ctx.db.insert("disciplinaryCases", {
      ...args,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });

    // Auto-update card accumulation if competition/season known
    if (args.competitionId) {
      const match = args.matchId ? await ctx.db.get(args.matchId) : null;
      const seasonId = match?.seasonId;
      if (seasonId) {
        const accumulations = await ctx.db.query("cardAccumulations")
          .withIndex("by_player_competition", (q) =>
            q.eq("playerId", args.playerId).eq("competitionId", args.competitionId!)
          ).collect();

        const existing = accumulations[0];
        const yellowDelta = args.cardType === "yellow" ? 1 : 0;
        const redDelta = args.cardType === "red" || args.cardType === "second_yellow" ? 1 : 0;

        if (existing) {
          await ctx.db.patch(existing._id, {
            yellowCards: existing.yellowCards + yellowDelta,
            redCards: existing.redCards + redDelta,
            totalSuspensionMatches: existing.totalSuspensionMatches + args.suspensionMatches,
            updatedAt: now,
          });
        } else {
          await ctx.db.insert("cardAccumulations", {
            playerId: args.playerId,
            competitionId: args.competitionId,
            seasonId,
            yellowCards: yellowDelta,
            redCards: redDelta,
            totalSuspensionMatches: args.suspensionMatches,
            updatedAt: now,
          });
        }
      }
    }

    await logAudit(ctx, {
      action: "disciplinary.create",
      entityType: "disciplinaryCase",
      entityId: caseId,
      after: args,
    });

    return caseId;
  },
});

// ─── Update case status ───
export const updateStatus = mutation({
  args: {
    caseId: v.id("disciplinaryCases"),
    status: v.union(v.literal("open"), v.literal("suspended"), v.literal("served"), v.literal("appealed"), v.literal("dismissed")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, [ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN, ROLES.DISCIPLINARY_OFFICER]);
    const existing = await ctx.db.get(args.caseId);
    if (!existing) throw new Error("Case not found");
    await ctx.db.patch(args.caseId, {
      status: args.status,
      notes: args.notes ?? existing.notes,
      reviewedBy: userId,
      reviewedAt: Date.now(),
      updatedAt: Date.now(),
    });
    await logAudit(ctx, {
      action: "disciplinary.updateStatus",
      entityType: "disciplinaryCase",
      entityId: args.caseId,
      before: existing,
      after: { ...existing, status: args.status },
    });
    return args.caseId;
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const all = await ctx.db.query("disciplinaryCases").collect();
    return {
      total: all.length,
      open: all.filter((c) => c.status === "open").length,
      suspended: all.filter((c) => c.status === "suspended").length,
      served: all.filter((c) => c.status === "served").length,
      appealed: all.filter((c) => c.status === "appealed").length,
    };
  },
});
