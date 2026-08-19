import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireRole, logAudit } from "./roles";
import { ROLES } from "./schema";

// ─── List documents ───
export const list = query({
  args: {
    ownerType: v.optional(v.union(v.literal("player"), v.literal("club"), v.literal("registration"))),
    ownerId: v.optional(v.string()),
    status: v.optional(v.union(v.literal("pending"), v.literal("verified"), v.literal("rejected"), v.literal("expired"))),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    let all;
    if (args.ownerType && args.ownerId) {
      all = await ctx.db.query("documents").withIndex("by_owner", (q) =>
        q.eq("ownerType", args.ownerType!).eq("ownerId", args.ownerId!)
      ).collect();
    } else if (args.status) {
      all = await ctx.db.query("documents").withIndex("by_status", (q) => q.eq("status", args.status!)).collect();
    } else {
      all = await ctx.db.query("documents").collect();
    }

    return { items: all.slice(offset, offset + limit), total: all.length };
  },
});

// ─── Create document record ───
export const create = mutation({
  args: {
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    documentType: v.union(
      v.literal("passport"), v.literal("national_id"), v.literal("birth_certificate"),
      v.literal("medical_certificate"), v.literal("transfer_agreement"),
      v.literal("license"), v.literal("photo"), v.literal("other")
    ),
    ownerType: v.union(v.literal("player"), v.literal("club"), v.literal("registration")),
    ownerId: v.string(),
    url: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const docId = await ctx.db.insert("documents", {
      ...args,
      status: "pending",
      uploadedBy: userId,
      createdAt: Date.now(),
    });
    await logAudit(ctx, { action: "document.upload", entityType: "document", entityId: docId, after: args });
    return docId;
  },
});

// ─── Verify document ───
export const verify = mutation({
  args: { documentId: v.id("documents"), status: v.union(v.literal("verified"), v.literal("rejected")) },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, [ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN, ROLES.REGISTRATION_OFFICER]);
    const existing = await ctx.db.get(args.documentId);
    if (!existing) throw new Error("Document not found");
    await ctx.db.patch(args.documentId, { status: args.status, verifiedBy: userId, verifiedAt: Date.now() });
    await logAudit(ctx, {
      action: `document.${args.status}`,
      entityType: "document",
      entityId: args.documentId,
      before: existing,
      after: { ...existing, status: args.status, verifiedBy: userId },
    });
    return args.documentId;
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const all = await ctx.db.query("documents").collect();
    return {
      total: all.length,
      pending: all.filter((d) => d.status === "pending").length,
      verified: all.filter((d) => d.status === "verified").length,
      rejected: all.filter((d) => d.status === "rejected").length,
    };
  },
});
