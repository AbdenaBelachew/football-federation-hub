import { Router, Request, Response } from "express";
import { pgDb } from "../db/postgres.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole, TRANSFER_ROLES } from "../middleware/rbac.js";
import { logAudit } from "../middleware/audit.js";
import { ROLES, Transfer } from "../types.js";

export const transfersRouter = Router();

// GET /api/transfers
transfersRouter.get("/", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const { playerId, fromClubId, toClubId, status, limit = "50", offset = "0" } = req.query;
    const params: any[] = [];
    const whereClauses: string[] = [];
    let idx = 1;

    if (playerId) { whereClauses.push(`t.player_id = $${idx}`); params.push(playerId); idx++; }
    if (fromClubId) { whereClauses.push(`t.from_club_id = $${idx}`); params.push(fromClubId); idx++; }
    if (toClubId) { whereClauses.push(`t.to_club_id = $${idx}`); params.push(toClubId); idx++; }
    if (status) { whereClauses.push(`t.status = $${idx}::transfer_status`); params.push(status); idx++; }

    const where = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const query = `
      SELECT t.*,
        p.first_name || ' ' || p.last_name AS player_name,
        fc.name AS from_club_name, fc.logo_url AS from_club_logo,
        tc.name AS to_club_name, tc.logo_url AS to_club_logo
      FROM transfers t
      LEFT JOIN players p ON p.id = t.player_id
      LEFT JOIN clubs fc ON fc.id = t.from_club_id
      LEFT JOIN clubs tc ON tc.id = t.to_club_id
      ${where}
      ORDER BY t.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(parseInt(limit as string, 10));
    params.push(parseInt(offset as string, 10));

    const result = await pgDb.query(query, params);
    const enriched = result.rows.map((t: any) => ({
      ...t,
      playerId: t.player_id,
      fromClubId: t.from_club_id,
      toClubId: t.to_club_id,
      transferFee: t.transfer_fee,
      transferDate: t.transfer_date,
      fromRegistrationId: t.from_registration_id,
      toRegistrationId: t.to_registration_id,
      reviewedBy: t.reviewed_by,
      reviewedAt: t.reviewed_at,
      reviewNotes: t.review_notes,
      playerName: t.player_name || "Unknown Player",
      fromClubName: t.from_club_name || "Unknown Club",
      toClubName: t.to_club_name || "Unknown Club",
      fromClubLogo: t.from_club_logo,
      toClubLogo: t.to_club_logo,
      createdAt: t.created_at,
    }));

    res.json({ total: enriched.length, items: enriched, transfers: enriched });
  } catch (err) {
    console.error("GET /api/transfers error:", err);
    res.status(500).json({ error: "Failed to fetch transfers" });
  }
});

// GET /api/transfers/stats
transfersRouter.get("/stats", authenticate(true), async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pgDb.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
        COUNT(*) FILTER (WHERE status = 'requested')::int AS requested,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected
      FROM transfers
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /api/transfers/stats error:", err);
    res.status(500).json({ error: "Failed to fetch transfer stats" });
  }
});

// GET /api/transfers/:id
transfersRouter.get("/:id", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const tRes = await pgDb.query("SELECT * FROM transfers WHERE id = $1", [req.params.id]);
    if (tRes.rowCount === 0) {
      res.status(404).json({ error: "Transfer not found" });
      return;
    }
    const transfer = tRes.rows[0];
    const playerRes = await pgDb.query("SELECT * FROM players WHERE id = $1", [transfer.player_id]);
    const fromClubRes = await pgDb.query("SELECT * FROM clubs WHERE id = $1", [transfer.from_club_id]);
    const toClubRes = await pgDb.query("SELECT * FROM clubs WHERE id = $1", [transfer.to_club_id]);
    res.json({ transfer, player: playerRes.rows[0], fromClub: fromClubRes.rows[0], toClub: toClubRes.rows[0] });
  } catch (err) {
    console.error("GET /api/transfers/:id error:", err);
    res.status(500).json({ error: "Failed to fetch transfer" });
  }
});

// POST /api/transfers (Initiate transfer request)
transfersRouter.post(
  "/",
  authenticate(false),
  requireRole([...TRANSFER_ROLES, ROLES.CLUB_ADMIN]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { playerId, fromClubId, toClubId, transferFee, reason } = req.body;
      if (!playerId || !fromClubId || !toClubId) {
        res.status(400).json({ error: "playerId, fromClubId, and toClubId are required" });
        return;
      }
      if (fromClubId === toClubId) {
        res.status(400).json({ error: "Cannot transfer a player to the same club" });
        return;
      }

      if (req.user?.role === ROLES.CLUB_ADMIN && req.user?.clubId) {
        if (fromClubId !== req.user.clubId && toClubId !== req.user.clubId) {
          res.status(403).json({ error: "Club admin can only initiate transfers involving their own club" });
          return;
        }
      }

      // Find current active registration
      const regRes = await pgDb.query(
        "SELECT id FROM player_registrations WHERE player_id = $1 AND club_id = $2 AND status = 'active' LIMIT 1",
        [playerId, fromClubId]
      );

      const trfId = `trf-${Date.now()}`;
      const insertQuery = `
        INSERT INTO transfers (id, player_id, from_club_id, to_club_id, from_registration_id, status, transfer_fee, transfer_date, reason, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING *`;
      const values = [
        trfId, playerId, fromClubId, toClubId,
        regRes.rows[0]?.id || null,
        "requested",
        transferFee ? Number(transferFee) : 0,
        new Date().toISOString().split("T")[0],
        reason || null,
      ];
      const result = await pgDb.query(insertQuery, values);
      const transfer = result.rows[0];

      logAudit(req, {
        action: "transfer.request",
        entityType: "transfer",
        entityId: transfer.id,
        after: transfer,
      });

      res.status(201).json({ message: "Transfer request initiated", transfer, ...transfer });
    } catch (err) {
      console.error("POST /api/transfers error:", err);
      res.status(500).json({ error: "Failed to create transfer" });
    }
  }
);

// PUT & POST /api/transfers/:id/approve
const handleTransferApprove = async (req: Request, res: Response): Promise<void> => {
  try {
    const transferId = req.params.id as string;
    const existingRes = await pgDb.query("SELECT * FROM transfers WHERE id = $1", [transferId]);
    if (existingRes.rowCount === 0) {
      res.status(404).json({ error: "Transfer not found" });
      return;
    }
    const existing = existingRes.rows[0];

    const updatedRes = await pgDb.query(
      `UPDATE transfers SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(),
       review_notes = $2 WHERE id = $3 RETURNING *`,
      [req.user?.id || null, req.body.reviewNotes || "Approved by transfer officer", transferId]
    );

    logAudit(req, {
      action: "transfer.approve",
      entityType: "transfer",
      entityId: transferId,
      before: existing,
      after: updatedRes.rows[0],
    });

    res.json({ message: "Transfer approved", transfer: updatedRes.rows[0] });
  } catch (err) {
    console.error("PUT /api/transfers/:id/approve error:", err);
    res.status(500).json({ error: "Failed to approve transfer" });
  }
};

transfersRouter.put("/:id/approve", authenticate(false), requireRole(TRANSFER_ROLES), handleTransferApprove);
transfersRouter.post("/:id/approve", authenticate(false), requireRole(TRANSFER_ROLES), handleTransferApprove);

// PUT & POST /api/transfers/:id/reject
const handleTransferReject = async (req: Request, res: Response): Promise<void> => {
  try {
    const transferId = req.params.id as string;
    const existingRes = await pgDb.query("SELECT * FROM transfers WHERE id = $1", [transferId]);
    if (existingRes.rowCount === 0) {
      res.status(404).json({ error: "Transfer not found" });
      return;
    }
    const existing = existingRes.rows[0];

    const updatedRes = await pgDb.query(
      `UPDATE transfers SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(),
       review_notes = $2 WHERE id = $3 RETURNING *`,
      [req.user?.id || null, req.body.reviewNotes || "Rejected by transfer matching officer", transferId]
    );

    logAudit(req, {
      action: "transfer.reject",
      entityType: "transfer",
      entityId: transferId,
      before: existing,
      after: updatedRes.rows[0],
    });

    res.json({ message: "Transfer rejected", transfer: updatedRes.rows[0] });
  } catch (err) {
    console.error("PUT /api/transfers/:id/reject error:", err);
    res.status(500).json({ error: "Failed to reject transfer" });
  }
};

transfersRouter.put("/:id/reject", authenticate(false), requireRole(TRANSFER_ROLES), handleTransferReject);
transfersRouter.post("/:id/reject", authenticate(false), requireRole(TRANSFER_ROLES), handleTransferReject);

// PUT & POST /api/transfers/:id/complete
const handleTransferComplete = async (req: Request, res: Response): Promise<void> => {
  try {
    const transferId = req.params.id as string;
    const existingRes = await pgDb.query("SELECT * FROM transfers WHERE id = $1", [transferId]);
    if (existingRes.rowCount === 0) {
      res.status(404).json({ error: "Transfer not found" });
      return;
    }
    const existing = existingRes.rows[0];

    const toClubRes = await pgDb.query("SELECT name FROM clubs WHERE id = $1", [existing.to_club_id]);

    // 1. Mark transfer completed
    const updatedRes = await pgDb.query(
      `UPDATE transfers SET status = 'completed', reviewed_by = $1, reviewed_at = NOW(),
       review_notes = $2 WHERE id = $3 RETURNING *`,
      [req.user?.id || null, req.body.reviewNotes || "Completed and finalized by transfer officer", transferId]
    );

    // 2. Update player record
    await pgDb.query(
      `UPDATE players SET current_club_id = $1, current_club_name = $2, updated_at = NOW() WHERE id = $3`,
      [existing.to_club_id, toClubRes.rows[0]?.name || null, existing.player_id]
    );

    // 3. Mark old registration as transferred
    if (existing.from_registration_id) {
      await pgDb.query(
        `UPDATE player_registrations SET status = 'transferred', updated_at = NOW() WHERE id = $1`,
        [existing.from_registration_id]
      );
    }

    logAudit(req, {
      action: "transfer.complete",
      entityType: "transfer",
      entityId: transferId,
      before: existing,
      after: updatedRes.rows[0],
    });

    res.json({ message: "Transfer completed and player registered with new club", transfer: updatedRes.rows[0] });
  } catch (err) {
    console.error("PUT /api/transfers/:id/complete error:", err);
    res.status(500).json({ error: "Failed to complete transfer" });
  }
};

transfersRouter.put("/:id/complete", authenticate(false), requireRole(TRANSFER_ROLES), handleTransferComplete);
transfersRouter.post("/:id/complete", authenticate(false), requireRole(TRANSFER_ROLES), handleTransferComplete);
