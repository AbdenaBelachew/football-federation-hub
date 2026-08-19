import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireRole, logAudit } from "./roles";
import { ROLES } from "./schema";

// ─── List matches ───
export const list = query({
  args: {
    competitionId: v.optional(v.id("competitions")),
    seasonId: v.optional(v.id("seasons")),
    status: v.optional(v.union(
      v.literal("scheduled"), v.literal("in_progress"), v.literal("completed"),
      v.literal("postponed"), v.literal("cancelled")
    )),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    let all;
    if (args.competitionId) {
      all = await ctx.db.query("matches").withIndex("by_competition", (q) => q.eq("competitionId", args.competitionId!)).collect();
    } else if (args.seasonId) {
      all = await ctx.db.query("matches").withIndex("by_season", (q) => q.eq("seasonId", args.seasonId!)).collect();
    } else {
      all = await ctx.db.query("matches").withIndex("by_date").collect();
    }

    if (args.status) all = all.filter((m) => m.status === args.status);

    const enriched = await Promise.all(
      all.map(async (m) => {
        const homeTeam = await ctx.db.get(m.homeTeamId);
        const awayTeam = await ctx.db.get(m.awayTeamId);
        const competition = await ctx.db.get(m.competitionId);
        return { ...m, homeTeam, awayTeam, competition };
      })
    );

    return { items: enriched.slice(offset, offset + limit), total: enriched.length };
  },
});

// ─── Get match with events ───
export const getWithEvents = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const match = await ctx.db.get(args.matchId);
    if (!match) return null;
    const homeTeam = await ctx.db.get(match.homeTeamId);
    const awayTeam = await ctx.db.get(match.awayTeamId);
    const events = await ctx.db.query("matchEvents").withIndex("by_match", (q) => q.eq("matchId", args.matchId)).collect();
    return { match, homeTeam, awayTeam, events };
  },
});

// ─── Create match ───
export const create = mutation({
  args: {
    homeTeamId: v.id("teams"),
    awayTeamId: v.id("teams"),
    competitionId: v.id("competitions"),
    seasonId: v.id("seasons"),
    matchDate: v.string(),
    venue: v.optional(v.string()),
    refereeId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN, ROLES.COMPETITION_ADMIN]);
    if (args.homeTeamId === args.awayTeamId) throw new Error("Home and away teams must be different");
    const matchId = await ctx.db.insert("matches", {
      ...args,
      status: "scheduled",
      createdAt: Date.now(),
    });
    await logAudit(ctx, { action: "match.create", entityType: "match", entityId: matchId, after: args });
    return matchId;
  },
});

// ─── Update match score / status ───
export const updateScore = mutation({
  args: {
    matchId: v.id("matches"),
    homeScore: v.number(),
    awayScore: v.number(),
    status: v.optional(v.union(
      v.literal("scheduled"), v.literal("in_progress"), v.literal("completed"),
      v.literal("postponed"), v.literal("cancelled")
    )),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN, ROLES.COMPETITION_ADMIN, ROLES.REFEREE]);
    const existing = await ctx.db.get(args.matchId);
    if (!existing) throw new Error("Match not found");
    await ctx.db.patch(args.matchId, {
      homeScore: args.homeScore,
      awayScore: args.awayScore,
      status: args.status ?? existing.status,
    });
    await logAudit(ctx, {
      action: "match.updateScore",
      entityType: "match",
      entityId: args.matchId,
      before: { homeScore: existing.homeScore, awayScore: existing.awayScore },
      after: { homeScore: args.homeScore, awayScore: args.awayScore },
    });
    return args.matchId;
  },
});

// ─── Add match event ───
export const addEvent = mutation({
  args: {
    matchId: v.id("matches"),
    eventType: v.union(
      v.literal("goal"), v.literal("own_goal"), v.literal("yellow_card"),
      v.literal("red_card"), v.literal("second_yellow"), v.literal("substitution"),
      v.literal("penalty_scored"), v.literal("penalty_missed")
    ),
    playerId: v.optional(v.id("players")),
    assistedByPlayerId: v.optional(v.id("players")),
    teamId: v.optional(v.id("teams")),
    minute: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN, ROLES.COMPETITION_ADMIN, ROLES.REFEREE]);
    const eventId = await ctx.db.insert("matchEvents", { ...args, createdAt: Date.now() });
    await logAudit(ctx, { action: "match.addEvent", entityType: "matchEvent", entityId: eventId, after: args });
    return eventId;
  },
});
