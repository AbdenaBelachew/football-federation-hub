import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireRole, logAudit } from "./roles";
import { ROLES } from "./schema";

// ─── List transfers ───
export const list = query({
  args: {
    status: v.optional(v.union(
      v.literal("requested"), v.literal("approved"), v.literal("rejected"),
      v.literal("cancelled"), v.literal("completed")
    )),
    playerId: v.optional(v.id("players")),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    let all;
    if (args.playerId) {
      all = await ctx.db.query("transfers").withIndex("by_player", (q) => q.eq("playerId", args.playerId!)).collect();
    } else if (args.status) {
      all = await ctx.db.query("transfers").withIndex("by_status", (q) => q.eq("status", args.status!)).collect();
    } else {
      all = await ctx.db.query("transfers").collect();
    }

    const enriched = await Promise.all(
      all.map(async (t) => {
        const player = await ctx.db.get(t.playerId);
        const fromClub = await ctx.db.get(t.fromClubId);
        const toClub = await ctx.db.get(t.toClubId);
        return { ...t, player, fromClub, toClub };
      })
    );

    return { items: enriched.slice(offset, offset + limit), total: enriched.length };
  },
});

// ─── Create transfer request ───
export const create = mutation({
  args: {
    playerId: v.id("players"),
    fromClubId: v.id("clubs"),
    toClubId: v.id("clubs"),
    fromRegistrationId: v.id("playerRegistrations"),
    transferDate: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN, ROLES.TRANSFER_OFFICER, ROLES.CLUB_ADMIN]);

    if (args.fromClubId === args.toClubId) {
      throw new Error("Cannot transfer to the same club");
    }

    const now = Date.now();
    const transferId = await ctx.db.insert("transfers", {
      ...args,
      status: "requested",
      createdAt: now,
    });

    await logAudit(ctx, {
      action: "transfer.request",
      entityType: "transfer",
      entityId: transferId,
      after: { ...args, status: "requested" },
    });

    return transferId;
  },
});

// ─── Approve transfer ───
export const approve = mutation({
  args: { transferId: v.id("transfers"), reviewNotes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, [ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN, ROLES.TRANSFER_OFFICER]);

    const existing = await ctx.db.get(args.transferId);
    if (!existing) throw new Error("Transfer not found");
    if (existing.status !== "requested") throw new Error("Only requested transfers can be approved");

    const now = Date.now();

    // Close old registration
    await ctx.db.patch(existing.fromRegistrationId, { status: "transferred", updatedAt: now });

    await ctx.db.patch(args.transferId, {
      status: "approved",
      reviewedBy: userId,
      reviewedAt: now,
      reviewNotes: args.reviewNotes,
    });

    await logAudit(ctx, {
      action: "transfer.approve",
      entityType: "transfer",
      entityId: args.transferId,
      before: existing,
      after: { ...existing, status: "approved", reviewedBy: userId },
    });

    return args.transferId;
  },
});

// ─── Reject transfer ───
export const reject = mutation({
  args: { transferId: v.id("transfers"), reviewNotes: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, [ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN, ROLES.TRANSFER_OFFICER]);

    const existing = await ctx.db.get(args.transferId);
    if (!existing) throw new Error("Transfer not found");
    if (existing.status !== "requested") throw new Error("Only requested transfers can be rejected");

    const now = Date.now();
    await ctx.db.patch(args.transferId, {
      status: "rejected",
      reviewedBy: userId,
      reviewedAt: now,
      reviewNotes: args.reviewNotes,
    });

    await logAudit(ctx, {
      action: "transfer.reject",
      entityType: "transfer",
      entityId: args.transferId,
      before: existing,
      after: { ...existing, status: "rejected", reviewedBy: userId },
    });

    return args.transferId;
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const all = await ctx.db.query("transfers").collect();
    return {
      total: all.length,
      requested: all.filter((t) => t.status === "requested").length,
      approved: all.filter((t) => t.status === "approved").length,
      rejected: all.filter((t) => t.status === "rejected").length,
      completed: all.filter((t) => t.status === "completed").length,
    };
  },
});
