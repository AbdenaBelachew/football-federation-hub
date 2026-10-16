import { Request } from "express";
import { pgDb } from "../db/postgres.js";
import { AuditLogEntry } from "../types.js";

export function logAudit(
  req: Request,
  params: {
    action: string;
    entityType: string;
    entityId: string;
    before?: any;
    after?: any;
    metadata?: any;
  }
): AuditLogEntry {
  const actorId = req.user?.id || req.userId || "anonymous";
  const actorName = req.user?.name || req.user?.email || "System / Dev";
  const role = req.user?.role || "public";
  const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();

  // Async fire-and-forget insert directly into Postgres audit_log
  pgDb.query(
    `INSERT INTO audit_log (id, actor_id, actor_name, role, action, entity_type, entity_id, before_state, after_state, metadata, ip, user_agent, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      id,
      actorId,
      actorName,
      role,
      params.action,
      params.entityType,
      params.entityId,
      params.before ? JSON.stringify(params.before) : null,
      params.after ? JSON.stringify(params.after) : null,
      params.metadata ? JSON.stringify(params.metadata) : null,
      req.ip || null,
      req.get("user-agent") || null,
      now,
    ]
  ).catch((err) => {
    console.error("Audit log PG insert error:", err.message);
  });

  return {
    id,
    actorId,
    actorName,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    before: params.before,
    after: params.after,
    metadata: params.metadata,
    timestamp: now.getTime(),
  };
}
