import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireRole, logAudit } from "./roles";
import { ROLES } from "./schema";

// ─── List registrations ───
export const list = query({
  args: {
    status: v.optional(v.union(
      v.literal("pending"), v.literal("active"), v.literal("expired"),
      v.literal("transferred"), v.literal("rejected"), v.literal("cancelled")
    )),
    seasonId: v.optional(v.id("seasons")),
    clubId: v.optional(v.id("clubs")),
    playerId: v.optional(v.id("players")),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    let all;
    if (args.seasonId) {
      all = await ctx.db.query("playerRegistrations").withIndex("by_season", (q) => q.eq("seasonId", args.seasonId!)).collect();
    } else if (args.clubId) {
      all = await ctx.db.query("playerRegistrations").withIndex("by_club", (q) => q.eq("clubId", args.clubId!)).collect();
    } else if (args.playerId) {
      all = await ctx.db.query("playerRegistrations").withIndex("by_player", (q) => q.eq("playerId", args.playerId!)).collect();
    } else if (args.status) {
      all = await ctx.db.query("playerRegistrations").withIndex("by_status", (q) => q.eq("status", args.status!)).collect();
    } else {
      all = await ctx.db.query("playerRegistrations").collect();
    }

    // Enrich
    const enriched = await Promise.all(
      all.map(async (reg) => {
        const player = await ctx.db.get(reg.playerId);
        const club = await ctx.db.get(reg.clubId);
        const competition = await ctx.db.get(reg.competitionId);
        const season = await ctx.db.get(reg.seasonId);
        return { ...reg, player, club, competition, season };
      })
    );

    return { items: enriched.slice(offset, offset + limit), total: enriched.length, limit, offset };
  },
});

// ─── Get single registration ───
export const get = query({
  args: { registrationId: v.id("playerRegistrations") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const reg = await ctx.db.get(args.registrationId);
    if (!reg) return null;
    const player = await ctx.db.get(reg.playerId);
    const club = await ctx.db.get(reg.clubId);
    const competition = await ctx.db.get(reg.competitionId);
    const season = await ctx.db.get(reg.seasonId);
    return { ...reg, player, club, competition, season };
  },
});

// ─── Create registration (submit) ───
export const create = mutation({
  args: {
    playerId: v.id("players"),
    clubId: v.id("clubs"),
    teamId: v.id("teams"),
    competitionId: v.id("competitions"),
    seasonId: v.id("seasons"),
    squadNumber: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [
      ROLES.SUPER_ADMIN,
      ROLES.FEDERATION_ADMIN,
      ROLES.REGISTRATION_OFFICER,
      ROLES.CLUB_ADMIN,
    ]);

    // Check for duplicate active registration in same season
    const existing = await ctx.db
      .query("playerRegistrations")
      .withIndex("by_player_season", (q) =>
        q.eq("playerId", args.playerId).eq("seasonId", args.seasonId)
      )
      .collect();

    const activeDuplicate = existing.find(
      (r) => r.status === "active" || r.status === "pending"
    );
    if (activeDuplicate) {
      throw new Error("Player already has an active or pending registration for this season");
    }

    const now = Date.now();
    const registrationId = await ctx.db.insert("playerRegistrations", {
      ...args,
      status: "pending",
      registrationDate: new Date(now).toISOString().split("T")[0],
      createdAt: now,
      updatedAt: now,
    });

    await logAudit(ctx, {
      action: "registration.create",
      entityType: "playerRegistration",
      entityId: registrationId,
      after: { ...args, status: "pending" },
    });

    return registrationId;
  },
});

// ─── Approve registration ───
export const approve = mutation({
  args: {
    registrationId: v.id("playerRegistrations"),
    licenseNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, [
      ROLES.SUPER_ADMIN,
      ROLES.FEDERATION_ADMIN,
      ROLES.REGISTRATION_OFFICER,
    ]);

    const existing = await ctx.db.get(args.registrationId);
    if (!existing) throw new Error("Registration not found");
    if (existing.status !== "pending") {
      throw new Error("Only pending registrations can be approved");
    }

    const now = Date.now();
    await ctx.db.patch(args.registrationId, {
      status: "active",
      licenseNumber: args.licenseNumber,
      notes: args.notes,
      reviewedBy: userId,
      reviewedAt: now,
      updatedAt: now,
    });

    await logAudit(ctx, {
      action: "registration.approve",
      entityType: "playerRegistration",
      entityId: args.registrationId,
      before: existing,
      after: { ...existing, status: "active", reviewedBy: userId, reviewedAt: now },
    });

    return args.registrationId;
  },
});

// ─── Reject registration ───
export const reject = mutation({
  args: {
    registrationId: v.id("playerRegistrations"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, [
      ROLES.SUPER_ADMIN,
      ROLES.FEDERATION_ADMIN,
      ROLES.REGISTRATION_OFFICER,
    ]);

    const existing = await ctx.db.get(args.registrationId);
    if (!existing) throw new Error("Registration not found");
    if (existing.status !== "pending") {
      throw new Error("Only pending registrations can be rejected");
    }

    const now = Date.now();
    await ctx.db.patch(args.registrationId, {
      status: "rejected",
      notes: args.reason,
      reviewedBy: userId,
      reviewedAt: now,
      updatedAt: now,
    });

    await logAudit(ctx, {
      action: "registration.reject",
      entityType: "playerRegistration",
      entityId: args.registrationId,
      before: existing,
      after: { ...existing, status: "rejected", reviewedBy: userId, reviewedAt: now, notes: args.reason },
    });

    return args.registrationId;
  },
});

// ─── Get registration stats ───
export const stats = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const all = await ctx.db.query("playerRegistrations").collect();
    return {
      total: all.length,
      pending: all.filter((r) => r.status === "pending").length,
      active: all.filter((r) => r.status === "active").length,
      expired: all.filter((r) => r.status === "expired").length,
      transferred: all.filter((r) => r.status === "transferred").length,
      rejected: all.filter((r) => r.status === "rejected").length,
    };
  },
});
