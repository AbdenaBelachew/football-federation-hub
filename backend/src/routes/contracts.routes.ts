import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole, REGISTRATION_ROLES, TRANSFER_ROLES } from "../middleware/rbac.js";
import { logAudit } from "../middleware/audit.js";
import { pgDb } from "../db/postgres.js";
import { ROLES } from "../types.js";

export const contractsRouter = Router();

export function mapContractRow(c: any): any {
  if (!c) return null;
  return {
    id: c.id,
    playerId: c.player_id,
    clubId: c.club_id,
    contractType: c.contract_type,
    startDate: c.start_date instanceof Date ? c.start_date.toISOString().split("T")[0] : String(c.start_date || ""),
    endDate: c.end_date instanceof Date ? c.end_date.toISOString().split("T")[0] : String(c.end_date || ""),
    salaryMonthly: c.salary_monthly != null ? Number(c.salary_monthly) : 0,
    currency: c.currency || "ETB",
    buyoutClause: c.buyout_clause != null ? Number(c.buyout_clause) : 0,
    status: c.status,
    agentName: c.agent_name,
    documentUrl: c.document_url,
    notes: c.notes,
    approvedBy: c.approved_by,
    approvedAt: c.approved_at ? new Date(c.approved_at).getTime() : undefined,
    createdAt: c.created_at ? new Date(c.created_at).getTime() : Date.now(),
    updatedAt: c.updated_at ? new Date(c.updated_at).getTime() : Date.now(),
    playerName: c.player_name || (c.first_name ? `${c.first_name} ${c.last_name}` : "Unknown Player"),
    playerPhoto: c.photo_url,
    playerNationalId: c.id_document_number,
    playerPosition: c.position,
    clubName: c.club_name || "Unknown Club",
    clubLogo: c.club_logo,
  };
}

// GET /api/contracts
contractsRouter.get("/", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const { playerId, clubId, status, contractType, limit = "50", offset = "0" } = req.query;
    const whereClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (playerId) {
      whereClauses.push(`c.player_id = $${idx++}`);
      params.push(playerId);
    }
    if (clubId) {
      whereClauses.push(`c.club_id = $${idx++}`);
      params.push(clubId);
    }
    if (status) {
      whereClauses.push(`c.status = $${idx++}`);
      params.push(status);
    }
    if (contractType) {
      whereClauses.push(`c.contract_type = $${idx++}`);
      params.push(contractType);
    }

    const where = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const countRes = await pgDb.query(`SELECT COUNT(*) FROM contracts c ${where}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const query = `
      SELECT 
        c.*,
        p.first_name,
        p.last_name,
        p.photo_url,
        p.position,
        p.id_document_number,
        cl.name as club_name,
        cl.logo_url as club_logo
      FROM contracts c
      LEFT JOIN players p ON p.id = c.player_id
      LEFT JOIN clubs cl ON cl.id = c.club_id
      ${where}
      ORDER BY c.created_at DESC
      LIMIT $${idx++} OFFSET $${idx}
    `;
    params.push(parseInt(limit as string, 10));
    params.push(parseInt(offset as string, 10));

    const result = await pgDb.query(query, params);
    const enriched = result.rows.map(mapContractRow);

    res.json({ total, count: enriched.length, items: enriched, contracts: enriched });
  } catch (err: any) {
    console.error("Contracts GET error:", err);
    res.status(500).json({ error: "Failed to fetch contracts" });
  }
});

// GET /api/contracts/stats
contractsRouter.get("/stats", authenticate(true), async (_req: Request, res: Response): Promise<void> => {
  try {
    const counts = await pgDb.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'pending_approval') as pending,
        COUNT(*) FILTER (WHERE status = 'expired') as expired,
        COALESCE(SUM(salary_monthly) FILTER (WHERE status = 'active'), 0) as total_monthly_wage
      FROM contracts
    `);
    const row = counts.rows[0];
    res.json({
      totalContracts: parseInt(row.total || 0, 10),
      activeContracts: parseInt(row.active || 0, 10),
      pendingContracts: parseInt(row.pending || 0, 10),
      expiredContracts: parseInt(row.expired || 0, 10),
      totalMonthlyWage: Number(row.total_monthly_wage || 0),
    });
  } catch (err: any) {
    console.error("Contracts stats error:", err);
    res.status(500).json({ error: "Failed to fetch contract stats" });
  }
});

// GET /api/contracts/:id
contractsRouter.get("/:id", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT 
        c.*,
        p.first_name,
        p.last_name,
        p.photo_url,
        p.position,
        p.id_document_number,
        cl.name as club_name,
        cl.logo_url as club_logo
      FROM contracts c
      LEFT JOIN players p ON p.id = c.player_id
      LEFT JOIN clubs cl ON cl.id = c.club_id
      WHERE c.id = $1
    `;
    const result = await pgDb.query(query, [req.params.id]);
    const row = result.rows[0];
    if (!row) {
      res.status(404).json({ error: "Contract not found" });
      return;
    }

    const contract = mapContractRow(row);
    const playerRes = await pgDb.query("SELECT * FROM players WHERE id = $1", [contract.playerId]);
    const clubRes = await pgDb.query("SELECT * FROM clubs WHERE id = $1", [contract.clubId]);

    res.json({
      contract,
      player: playerRes.rows[0] || null,
      club: clubRes.rows[0] || null,
      playerName: contract.playerName,
      clubName: contract.clubName,
    });
  } catch (err: any) {
    console.error("Contract GET by id error:", err);
    res.status(500).json({ error: "Failed to fetch contract" });
  }
});

// POST /api/contracts
contractsRouter.post(
  "/",
  authenticate(false),
  requireRole([...REGISTRATION_ROLES, ...TRANSFER_ROLES, ROLES.CLUB_ADMIN]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        playerId,
        clubId,
        contractType = "professional",
        startDate,
        endDate,
        salaryMonthly,
        currency = "ETB",
        buyoutClause,
        agentName,
        documentUrl,
        notes,
      } = req.body;

      if (!playerId || !clubId || !startDate || !endDate) {
        res.status(400).json({ error: "playerId, clubId, startDate, and endDate are required" });
        return;
      }

      const playerRes = await pgDb.query("SELECT * FROM players WHERE id = $1", [playerId]);
      const player = playerRes.rows[0];
      if (!player) {
        res.status(404).json({ error: "Player not found" });
        return;
      }

      const clubRes = await pgDb.query("SELECT * FROM clubs WHERE id = $1", [clubId]);
      const club = clubRes.rows[0];
      if (!club) {
        res.status(404).json({ error: "Club not found" });
        return;
      }

      const isOfficer = req.user && (REGISTRATION_ROLES as readonly string[]).includes(req.user.role);
      const status = isOfficer ? "active" : "pending_approval";
      const id = req.body.id || `contract-${Date.now()}`;

      const insertRes = await pgDb.query(
        `INSERT INTO contracts (
          id, player_id, club_id, contract_type, start_date, end_date,
          salary_monthly, currency, buyout_clause, status, agent_name,
          document_url, notes, approved_by, approved_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
        ) RETURNING *`,
        [
          id,
          playerId,
          clubId,
          contractType,
          startDate,
          endDate,
          salaryMonthly ? Number(salaryMonthly) : 0,
          currency,
          buyoutClause ? Number(buyoutClause) : 0,
          status,
          agentName || null,
          documentUrl || null,
          notes || null,
          isOfficer ? req.user?.id : null,
          isOfficer ? new Date() : null,
        ]
      );

      const contract = mapContractRow({
        ...insertRes.rows[0],
        first_name: player.first_name,
        last_name: player.last_name,
        photo_url: player.photo_url,
        club_name: club.name,
        club_logo: club.logo_url,
      });

      if (status === "active") {
        await pgDb.query(
          "UPDATE players SET current_club_id = $1, current_club_name = $2, updated_at = NOW() WHERE id = $3",
          [clubId, club.name, playerId]
        );
      }

      logAudit(req, {
        action: "contract.create",
        entityType: "contract",
        entityId: contract.id,
        after: contract,
      });

      res.status(201).json({
        message: status === "active" ? "Contract registered and activated" : "Contract submitted for federation approval",
        contract,
        ...contract,
      });
    } catch (err: any) {
      console.error("Contract create error:", err);
      res.status(500).json({ error: err.message || "Failed to create contract" });
    }
  }
);

// PUT /api/contracts/:id/approve
contractsRouter.put(
  "/:id/approve",
  authenticate(false),
  requireRole(REGISTRATION_ROLES),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const existingRes = await pgDb.query("SELECT * FROM contracts WHERE id = $1", [id]);
      const existing = existingRes.rows[0];
      if (!existing) {
        res.status(404).json({ error: "Contract not found" });
        return;
      }

      const updateRes = await pgDb.query(
        `UPDATE contracts 
         SET status = 'active', approved_by = $1, approved_at = NOW(), notes = COALESCE($2, notes), updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [req.user?.id || null, req.body.notes || null, id]
      );

      const clubRes = await pgDb.query("SELECT * FROM clubs WHERE id = $1", [existing.club_id]);
      const club = clubRes.rows[0];
      if (club) {
        await pgDb.query(
          "UPDATE players SET current_club_id = $1, current_club_name = $2, updated_at = NOW() WHERE id = $3",
          [existing.club_id, club.name, existing.player_id]
        );
      }

      const updated = mapContractRow(updateRes.rows[0]);

      logAudit(req, {
        action: "contract.approve",
        entityType: "contract",
        entityId: id,
        before: mapContractRow(existing),
        after: updated,
      });

      res.json({ message: "Contract approved by Federation", contract: updated });
    } catch (err: any) {
      console.error("Contract approve error:", err);
      res.status(500).json({ error: err.message || "Failed to approve contract" });
    }
  }
);

// PUT /api/contracts/:id/terminate
contractsRouter.put(
  "/:id/terminate",
  authenticate(false),
  requireRole([...REGISTRATION_ROLES, ROLES.CLUB_ADMIN]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const existingRes = await pgDb.query("SELECT * FROM contracts WHERE id = $1", [id]);
      const existing = existingRes.rows[0];
      if (!existing) {
        res.status(404).json({ error: "Contract not found" });
        return;
      }

      const reason = req.body.reason || "Mutual agreement";
      const terminationNote = `${existing.notes || ""} [Terminated on ${new Date().toISOString().split("T")[0]}: ${reason}]`.trim();

      const updateRes = await pgDb.query(
        "UPDATE contracts SET status = 'terminated', notes = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
        [terminationNote, id]
      );
      const updated = mapContractRow(updateRes.rows[0]);

      logAudit(req, {
        action: "contract.terminate",
        entityType: "contract",
        entityId: id,
        before: mapContractRow(existing),
        after: updated,
      });

      res.json({ message: "Contract terminated", contract: updated });
    } catch (err: any) {
      console.error("Contract terminate error:", err);
      res.status(500).json({ error: err.message || "Failed to terminate contract" });
    }
  }
);

// DELETE /api/contracts/:id
contractsRouter.delete(
  "/:id",
  authenticate(false),
  requireRole([ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const existingRes = await pgDb.query("SELECT * FROM contracts WHERE id = $1", [id]);
      const existing = existingRes.rows[0];
      if (!existing) {
        res.status(404).json({ error: "Contract not found" });
        return;
      }

      await pgDb.query("DELETE FROM contracts WHERE id = $1", [id]);

      logAudit(req, {
        action: "contract.delete",
        entityType: "contract",
        entityId: id,
        before: mapContractRow(existing),
      });

      res.json({ message: "Contract removed from registry" });
    } catch (err: any) {
      console.error("Contract delete error:", err);
      res.status(500).json({ error: err.message || "Failed to delete contract" });
    }
  }
);
