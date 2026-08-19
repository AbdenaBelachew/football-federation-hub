import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./roles";

// ─── List audit log entries ───
export const list = query({
  args: {
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    action: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    let all;
    if (args.entityType && args.entityId) {
      all = await ctx.db.query("auditLog").withIndex("by_entity", (q) =>
        q.eq("entityType", args.entityType!).eq("entityId", args.entityId!)
      ).collect();
    } else if (args.action) {
      all = await ctx.db.query("auditLog").withIndex("by_action", (q) => q.eq("action", args.action!)).collect();
    } else {
      all = await ctx.db.query("auditLog").withIndex("by_timestamp").order("desc").collect();
    }

    return { items: all.slice(offset, offset + limit), total: all.length };
  },
});
