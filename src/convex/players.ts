import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireRole, logAudit } from "./roles";
import { ROLES } from "./schema";

// ─── List all players (paginated) ───
export const list = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"), v.literal("suspended"), v.literal("retired"))),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    const results = args.status
      ? await ctx.db.query("players").withIndex("by_status", (q) => q.eq("status", args.status!)).collect()
      : await ctx.db.query("players").withIndex("by_name").collect();

    let filtered = results;
    if (args.search) {
      const search = args.search.toLowerCase();
      filtered = results.filter(
        (p) =>
          p.firstName.toLowerCase().includes(search) ||
          p.lastName.toLowerCase().includes(search) ||
          (p.email?.toLowerCase().includes(search) ?? false)
      );
    }

    return { items: filtered.slice(offset, offset + limit), total: filtered.length, limit, offset };
  },
});

// ─── Get single player by ID ───
export const get = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.get(args.playerId);
  },
});

// ─── Create a new player ───
export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    nationality: v.string(),
    position: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    idDocumentType: v.optional(v.string()),
    idDocumentNumber: v.optional(v.string()),
    address: v.optional(v.string()),
    height: v.optional(v.number()),
    weight: v.optional(v.number()),
    preferredFoot: v.optional(v.union(v.literal("left"), v.literal("right"), v.literal("both"))),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [
      ROLES.SUPER_ADMIN,
      ROLES.FEDERATION_ADMIN,
      ROLES.REGISTRATION_OFFICER,
    ]);

    const now = Date.now();
    const playerId = await ctx.db.insert("players", {
      ...args,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    await logAudit(ctx, {
      action: "player.create",
      entityType: "player",
      entityId: playerId,
      after: { ...args, status: "active" },
    });

    return playerId;
  },
});

// ─── Update a player ───
export const update = mutation({
  args: {
    playerId: v.id("players"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    nationality: v.optional(v.string()),
    position: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    idDocumentType: v.optional(v.string()),
    idDocumentNumber: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"), v.literal("suspended"), v.literal("retired"))),
    address: v.optional(v.string()),
    height: v.optional(v.number()),
    weight: v.optional(v.number()),
    preferredFoot: v.optional(v.union(v.literal("left"), v.literal("right"), v.literal("both"))),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [
      ROLES.SUPER_ADMIN,
      ROLES.FEDERATION_ADMIN,
      ROLES.REGISTRATION_OFFICER,
    ]);

    const existing = await ctx.db.get(args.playerId);
    if (!existing) throw new Error("Player not found");

    const { playerId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(args.playerId, {
      ...filtered,
      updatedAt: Date.now(),
    });

    await logAudit(ctx, {
      action: "player.update",
      entityType: "player",
      entityId: args.playerId,
      before: existing,
      after: { ...existing, ...filtered },
    });

    return args.playerId;
  },
});

// ─── Get player with registrations ───
export const getWithRegistrations = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const player = await ctx.db.get(args.playerId);
    if (!player) return null;

    const registrations = await ctx.db
      .query("playerRegistrations")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .collect();

    const enriched = await Promise.all(
      registrations.map(async (reg) => {
        const club = await ctx.db.get(reg.clubId);
        const competition = await ctx.db.get(reg.competitionId);
        const season = await ctx.db.get(reg.seasonId);
        return { ...reg, club, competition, season };
      })
    );

    return { player, registrations: enriched };
  },
});

// ─── Get stats ───
export const stats = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

    const players = await ctx.db.query("players").collect();
    const active = players.filter((p) => p.status === "active").length;
    const inactive = players.filter((p) => p.status === "inactive").length;
    const suspended = players.filter((p) => p.status === "suspended").length;

    const registrations = await ctx.db.query("playerRegistrations").collect();
    const pendingRegistrations = registrations.filter((r) => r.status === "pending").length;

    return {
      totalPlayers: players.length,
      activePlayers: active,
      inactivePlayers: inactive,
      suspendedPlayers: suspended,
      totalRegistrations: registrations.length,
      pendingRegistrations,
    };
  },
});
