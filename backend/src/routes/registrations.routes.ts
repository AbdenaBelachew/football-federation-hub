import { Router, Request, Response } from "express";
import { pgDb } from "../db/postgres.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole, REGISTRATION_ROLES } from "../middleware/rbac.js";
import { logAudit } from "../middleware/audit.js";
import { ROLES, PlayerRegistration } from "../types.js";

export const registrationsRouter = Router();

// GET /api/registrations
registrationsRouter.get("/", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const { playerId, clubId, seasonId, competitionId, status, limit = "50", offset = "0" } = req.query;
    const params: any[] = [];
    const whereClauses: string[] = [];
    let idx = 1;

    if (playerId) { whereClauses.push(`pr.player_id = $${idx}`); params.push(playerId); idx++; }
    if (clubId) { whereClauses.push(`pr.club_id = $${idx}`); params.push(clubId); idx++; }
    if (seasonId) { whereClauses.push(`pr.season_id = $${idx}`); params.push(seasonId); idx++; }
    if (competitionId) { whereClauses.push(`pr.competition_id = $${idx}`); params.push(competitionId); idx++; }
    if (status) { whereClauses.push(`pr.status = $${idx}::registration_status`); params.push(status); idx++; }

    const where = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const query = `
      SELECT pr.*,
        p.first_name || ' ' || p.last_name AS player_name,
        p.photo_url AS player_photo,
        c.name AS club_name,
        c.logo_url AS club_logo,
        t.name AS team_name,
        s.name AS season_name
      FROM player_registrations pr
      LEFT JOIN players p ON p.id = pr.player_id
      LEFT JOIN clubs c ON c.id = pr.club_id
      LEFT JOIN teams t ON t.id = pr.team_id
      LEFT JOIN seasons s ON s.id = pr.season_id
      ${where}
      ORDER BY pr.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(parseInt(limit as string, 10));
    params.push(parseInt(offset as string, 10));

    const result = await pgDb.query(query, params);
    const enriched = result.rows.map((r: any) => ({
      ...r,
      playerId: r.player_id,
      clubId: r.club_id,
      teamId: r.team_id,
      seasonId: r.season_id,
      competitionId: r.competition_id,
      licenseNumber: r.license_number,
      licenseExpiry: r.license_expiry,
      registrationDate: r.registration_date,
      expiryDate: r.expiry_date,
      squadNumber: r.squad_number,
      reviewedBy: r.reviewed_by,
      reviewedAt: r.reviewed_at,
      playerName: r.player_name || "Unknown Player",
      playerPhoto: r.player_photo,
      clubName: r.club_name || "Unknown Club",
      clubLogo: r.club_logo,
      teamName: r.team_name,
      seasonName: r.season_name,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    res.json({ total: enriched.length, items: enriched, registrations: enriched });
  } catch (err) {
    console.error("GET /api/registrations error:", err);
    res.status(500).json({ error: "Failed to fetch registrations" });
  }
});

// GET /api/registrations/stats
registrationsRouter.get("/stats", authenticate(true), async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pgDb.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
        COUNT(*) FILTER (WHERE status = 'expired')::int AS expired
      FROM player_registrations
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /api/registrations/stats error:", err);
    res.status(500).json({ error: "Failed to fetch registration stats" });
  }
});

// GET /api/registrations/:id
registrationsRouter.get("/:id", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const regRes = await pgDb.query("SELECT * FROM player_registrations WHERE id = $1", [req.params.id]);
    if (regRes.rowCount === 0) {
      res.status(404).json({ error: "Registration not found" });
      return;
    }
    const reg = regRes.rows[0];
    const playerRes = await pgDb.query("SELECT * FROM players WHERE id = $1", [reg.player_id]);
    const clubRes = await pgDb.query("SELECT * FROM clubs WHERE id = $1", [reg.club_id]);
    const teamRes = reg.team_id ? await pgDb.query("SELECT * FROM teams WHERE id = $1", [reg.team_id]) : null;
    const reviewerRes = reg.reviewed_by ? await pgDb.query("SELECT id, name FROM users WHERE id = $1", [reg.reviewed_by]) : null;
    res.json({
      registration: reg,
      player: playerRes.rows[0] || null,
      club: clubRes.rows[0] || null,
      team: teamRes?.rows[0] || null,
      reviewer: reviewerRes?.rows[0] || null,
    });
  } catch (err) {
    console.error("GET /api/registrations/:id error:", err);
    res.status(500).json({ error: "Failed to fetch registration" });
  }
});

// POST /api/registrations (Submit registration)
registrationsRouter.post(
  "/",
  authenticate(false),
  requireRole([...REGISTRATION_ROLES, ROLES.CLUB_ADMIN]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { playerId, clubId, teamId, competitionId, seasonId, squadNumber, notes } = req.body;
      if (!playerId || !clubId || !seasonId) {
        res.status(400).json({ error: "playerId, clubId, and seasonId are required" });
        return;
      }

      // Check if player already registered in this season with active status
      const existingRes = await pgDb.query(
        "SELECT id FROM player_registrations WHERE player_id = $1 AND season_id = $2 AND status = 'active'",
        [playerId, seasonId]
      );
      if (existingRes.rowCount! > 0) {
        res.status(409).json({ error: "Player already holds an active registration for this season" });
        return;
      }

      const regId = `reg-${Date.now()}`;
      const insertQuery = `
        INSERT INTO player_registrations (id, player_id, club_id, team_id, competition_id, season_id, status,
          registration_date, squad_number, notes, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *`;
      const values = [
        regId, playerId, clubId, teamId || null, competitionId || null, seasonId,
        "pending", new Date().toISOString().split("T")[0],
        squadNumber ? Number(squadNumber) : null, notes || null,
      ];
      const result = await pgDb.query(insertQuery, values);
      const reg = result.rows[0];

      logAudit(req, {
        action: "registration.submit",
        entityType: "registration",
        entityId: reg.id,
        after: reg,
      });

      res.status(201).json({ message: "Player registration submitted for approval", registration: reg, ...reg });
    } catch (err) {
      console.error("POST /api/registrations error:", err);
      res.status(500).json({ error: "Failed to submit registration" });
    }
  }
);

// PUT & POST /api/registrations/:id/approve
const handleApprove = async (req: Request, res: Response): Promise<void> => {
  try {
    const existingRes = await pgDb.query("SELECT * FROM player_registrations WHERE id = $1", [req.params.id]);
    if (existingRes.rowCount === 0) {
      res.status(404).json({ error: "Registration not found" });
      return;
    }
    const existing = existingRes.rows[0];

    const year = new Date().getFullYear();
    const licenseNumber = `LIC-${year}-${Math.floor(10000 + Math.random() * 90000)}`;
    const expiryDate = `${year + 1}-06-30`;

    const updatedRes = await pgDb.query(
      `UPDATE player_registrations SET status = 'active', license_number = $1, license_expiry = $2,
       expiry_date = $3, reviewed_by = $4, reviewed_at = NOW(), notes = COALESCE($5, notes), updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [licenseNumber, expiryDate, expiryDate, req.user?.id || null, req.body.notes || null, req.params.id]
    );
    const updated = updatedRes.rows[0];

    // Also update player's currentClubId and status
    const clubRes = await pgDb.query("SELECT name FROM clubs WHERE id = $1", [existing.club_id]);
    await pgDb.query(
      `UPDATE players SET status = 'active', current_club_id = $1, current_club_name = $2, jersey_number = $3, updated_at = NOW()
       WHERE id = $4`,
      [existing.club_id, clubRes.rows[0]?.name || null, existing.squad_number, existing.player_id]
    );

    logAudit(req, {
      action: "registration.approve",
      entityType: "registration",
      entityId: req.params.id as string,
      before: existing,
      after: updated,
    });

    res.json({ message: "Registration approved and player license issued", registration: updated });
  } catch (err) {
    console.error("PUT /api/registrations/:id/approve error:", err);
    res.status(500).json({ error: "Failed to approve registration" });
  }
};

registrationsRouter.put("/:id/approve", authenticate(false), requireRole(REGISTRATION_ROLES), handleApprove);
registrationsRouter.post("/:id/approve", authenticate(false), requireRole(REGISTRATION_ROLES), handleApprove);

// PUT & POST /api/registrations/:id/reject
const handleReject = async (req: Request, res: Response): Promise<void> => {
  try {
    const existingRes = await pgDb.query("SELECT * FROM player_registrations WHERE id = $1", [req.params.id]);
    if (existingRes.rowCount === 0) {
      res.status(404).json({ error: "Registration not found" });
      return;
    }
    const existing = existingRes.rows[0];

    const updatedRes = await pgDb.query(
      `UPDATE player_registrations SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(),
       notes = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [req.user?.id || null, req.body.reason || req.body.notes || "Rejected by federation registration officer", req.params.id]
    );
    const updated = updatedRes.rows[0];

    logAudit(req, {
      action: "registration.reject",
      entityType: "registration",
      entityId: req.params.id as string,
      before: existing,
      after: updated,
    });

    res.json({ message: "Registration rejected", registration: updated });
  } catch (err) {
    console.error("PUT /api/registrations/:id/reject error:", err);
    res.status(500).json({ error: "Failed to reject registration" });
  }
};

registrationsRouter.put("/:id/reject", authenticate(false), requireRole(REGISTRATION_ROLES), handleReject);
registrationsRouter.post("/:id/reject", authenticate(false), requireRole(REGISTRATION_ROLES), handleReject);
