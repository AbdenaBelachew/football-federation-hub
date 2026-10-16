import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireRole, logAudit } from "./roles";
import { ROLES } from "./schema";

// ─── List all clubs ───
export const list = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"), v.literal("suspended"), v.literal("pending"))),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    const results = args.status
      ? await ctx.db.query("clubs").withIndex("by_status", (q) => q.eq("status", args.status!)).collect()
      : await ctx.db.query("clubs").withIndex("by_name").collect();

    let filtered = results;
    if (args.search) {
      const search = args.search.toLowerCase();
      filtered = results.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.city?.toLowerCase().includes(search) ||
          c.country.toLowerCase().includes(search)
      );
    }

    return { items: filtered.slice(offset, offset + limit), total: filtered.length, limit, offset };
  },
});

// ─── Get single club ───
export const get = query({
  args: { clubId: v.id("clubs") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.get(args.clubId);
  },
});

// ─── Create club ───
export const create = mutation({
  args: {
    name: v.string(),
    shortName: v.optional(v.string()),
    foundedYear: v.optional(v.number()),
    city: v.optional(v.string()),
    country: v.string(),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    president: v.optional(v.string()),
    secretary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN]);

    const now = Date.now();
    const clubId = await ctx.db.insert("clubs", {
      ...args,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    await logAudit(ctx, {
      action: "club.create",
      entityType: "club",
      entityId: clubId,
      after: { ...args, status: "active" },
    });

    return clubId;
  },
});

// ─── Update club ───
export const update = mutation({
  args: {
    clubId: v.id("clubs"),
    name: v.optional(v.string()),
    shortName: v.optional(v.string()),
    foundedYear: v.optional(v.number()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"), v.literal("suspended"), v.literal("pending"))),
    president: v.optional(v.string()),
    secretary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN]);

    const existing = await ctx.db.get(args.clubId);
    if (!existing) throw new Error("Club not found");

    const { clubId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(args.clubId, { ...filtered, updatedAt: Date.now() });

    await logAudit(ctx, {
      action: "club.update",
      entityType: "club",
      entityId: args.clubId,
      before: existing,
      after: { ...existing, ...filtered },
    });

    return args.clubId;
  },
});

// ─── Get club stats ───
export const stats = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const clubs = await ctx.db.query("clubs").collect();
    const active = clubs.filter((c) => c.status === "active").length;
    return { totalClubs: clubs.length, activeClubs: active };
  },
});
