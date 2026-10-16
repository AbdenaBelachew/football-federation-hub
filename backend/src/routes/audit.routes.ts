import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/rbac.js";
import { pgDb } from "../db/postgres.js";

export const auditRouter = Router();

export function mapAuditRow(a: any): any {
  if (!a) return null;
  return {
    id: a.id,
    actorId: a.actor_id,
    actorName: a.actor_name,
    role: a.role,
    action: a.action,
    entityType: a.entity_type,
    entityId: a.entity_id,
    before: a.before_state,
    after: a.after_state,
    metadata: a.metadata,
    ip: a.ip,
    userAgent: a.user_agent,
    timestamp: a.timestamp ? new Date(a.timestamp).getTime() : Date.now(),
  };
}

// GET /api/audit
auditRouter.get("/", authenticate(false), requireAdmin(), async (req: Request, res: Response): Promise<void> => {
  try {
    const { action, entityType, entityId, actorId, limit = "50", offset = "0" } = req.query;
    const whereClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (action) {
      whereClauses.push(`action LIKE $${idx++}`);
      params.push(`%${action}%`);
    }
    if (entityType) {
      whereClauses.push(`entity_type = $${idx++}`);
      params.push(entityType);
    }
    if (entityId) {
      whereClauses.push(`entity_id = $${idx++}`);
      params.push(entityId);
    }
    if (actorId) {
      whereClauses.push(`actor_id = $${idx++}`);
      params.push(actorId);
    }

    const where = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const countRes = await pgDb.query(`SELECT COUNT(*) FROM audit_log ${where}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const query = `SELECT * FROM audit_log ${where} ORDER BY timestamp DESC LIMIT $${idx++} OFFSET $${idx}`;
    params.push(parseInt(limit as string, 10));
    params.push(parseInt(offset as string, 10));

    const result = await pgDb.query(query, params);
    const auditLog = result.rows.map(mapAuditRow);

    res.json({ total, count: auditLog.length, items: auditLog, auditLog });
  } catch (err: any) {
    console.error("Audit GET error:", err);
    res.status(500).json({ error: "Failed to fetch audit log" });
  }
});
