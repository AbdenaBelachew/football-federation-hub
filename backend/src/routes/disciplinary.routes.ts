import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole, DISCIPLINARY_ROLES } from "../middleware/rbac.js";
import { logAudit } from "../middleware/audit.js";
import { pgDb } from "../db/postgres.js";

export const disciplinaryRouter = Router();

export function mapCaseRow(d: any): any {
  if (!d) return null;
  return {
    id: d.id,
    playerId: d.player_id,
    playerName: d.player_name || (d.first_name ? `${d.first_name} ${d.last_name}` : "Unknown Player"),
    clubId: d.club_id,
    clubName: d.club_name || "Unknown Club",
    playerPhoto: d.photo_url,
    competitionId: d.competition_id,
    matchId: d.match_id,
    offense: d.offense,
    cardType: d.card_type,
    matchMinute: d.match_minute,
    suspensionMatches: d.suspension_matches != null ? Number(d.suspension_matches) : 0,
    suspensionStart: d.suspension_start,
    suspensionEnd: d.suspension_end,
    fine: d.fine != null ? Number(d.fine) : 0,
    status: d.status,
    notes: d.notes,
    reviewedBy: d.reviewed_by,
    reviewedAt: d.reviewed_at ? new Date(d.reviewed_at).getTime() : undefined,
    createdAt: d.created_at ? new Date(d.created_at).getTime() : Date.now(),
    updatedAt: d.updated_at ? new Date(d.updated_at).getTime() : Date.now(),
  };
}

// GET /api/disciplinary
disciplinaryRouter.get("/", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const { playerId, clubId, status, cardType, limit = "50", offset = "0" } = req.query;
    const whereClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (playerId) {
      whereClauses.push(`dc.player_id = $${idx++}`);
      params.push(playerId);
    }
    if (clubId) {
      whereClauses.push(`dc.club_id = $${idx++}`);
      params.push(clubId);
    }
    if (status) {
      whereClauses.push(`dc.status = $${idx++}::disciplinary_status`);
      params.push(status);
    }
    if (cardType) {
      whereClauses.push(`dc.card_type = $${idx++}::card_type`);
      params.push(cardType);
    }

    const where = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const countRes = await pgDb.query(`SELECT COUNT(*) FROM disciplinary_cases dc ${where}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const query = `
      SELECT 
        dc.*,
        p.first_name,
        p.last_name,
        p.photo_url,
        cl.name as club_name
      FROM disciplinary_cases dc
      LEFT JOIN players p ON p.id = dc.player_id
      LEFT JOIN clubs cl ON cl.id = dc.club_id
      ${where}
      ORDER BY dc.created_at DESC
      LIMIT $${idx++} OFFSET $${idx}
    `;
    params.push(parseInt(limit as string, 10));
    params.push(parseInt(offset as string, 10));

    const result = await pgDb.query(query, params);
    const cases = result.rows.map(mapCaseRow);

    res.json({ total, count: cases.length, items: cases, cases });
  } catch (err: any) {
    console.error("Disciplinary GET error:", err);
    res.status(500).json({ error: "Failed to fetch disciplinary cases" });
  }
});

// GET /api/disciplinary/accumulations
disciplinaryRouter.get("/accumulations", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const { competitionId, seasonId } = req.query;
    const whereClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (competitionId) {
      whereClauses.push(`ca.competition_id = $${idx++}`);
      params.push(competitionId);
    }
    if (seasonId) {
      whereClauses.push(`ca.season_id = $${idx++}`);
      params.push(seasonId);
    }

    const where = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const query = `
      SELECT 
        ca.*,
        p.first_name,
        p.last_name,
        p.current_club_name
      FROM card_accumulations ca
      LEFT JOIN players p ON p.id = ca.player_id
      ${where}
      ORDER BY ca.yellow_cards DESC, ca.red_cards DESC
    `;

    const result = await pgDb.query(query, params);
    const items = result.rows.map((c: any) => ({
      id: c.id,
      playerId: c.player_id,
      playerName: c.player_name || (c.first_name ? `${c.first_name} ${c.last_name}` : "Unknown Player"),
      competitionId: c.competition_id,
      seasonId: c.season_id,
      yellowCards: Number(c.yellow_cards || 0),
      redCards: Number(c.red_cards || 0),
      totalSuspensionMatches: Number(c.total_suspension_matches || 0),
      currentClubName: c.current_club_name,
      updatedAt: c.updated_at ? new Date(c.updated_at).getTime() : Date.now(),
    }));

    res.json({ total: items.length, count: items.length, items });
  } catch (err: any) {
    console.error("Disciplinary accumulations error:", err);
    res.status(500).json({ error: "Failed to fetch card accumulations" });
  }
});

// GET /api/disciplinary/stats
disciplinaryRouter.get("/stats", authenticate(true), async (_req: Request, res: Response): Promise<void> => {
  try {
    const counts = await pgDb.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'open') as open,
        COUNT(*) FILTER (WHERE status = 'suspended') as suspended,
        COUNT(*) FILTER (WHERE status = 'appealed') as appealed,
        COUNT(*) FILTER (WHERE status = 'served') as served,
        COALESCE(SUM(fine), 0) as total_fines
      FROM disciplinary_cases
    `);
    const row = counts.rows[0];
    res.json({
      totalCases: parseInt(row.total || 0, 10),
      openCases: parseInt(row.open || 0, 10),
      suspended: parseInt(row.suspended || 0, 10),
      appealed: parseInt(row.appealed || 0, 10),
      served: parseInt(row.served || 0, 10),
      totalFines: Number(row.total_fines || 0),
    });
  } catch (err: any) {
    console.error("Disciplinary stats error:", err);
    res.status(500).json({ error: "Failed to fetch disciplinary stats" });
  }
});

// GET /api/disciplinary/:id
disciplinaryRouter.get("/:id", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const caseRes = await pgDb.query("SELECT * FROM disciplinary_cases WHERE id = $1", [req.params.id]);
    if (!caseRes.rows[0]) {
      res.status(404).json({ error: "Disciplinary case not found" });
      return;
    }
    const item = mapCaseRow(caseRes.rows[0]);

    const playerRes = item.playerId ? await pgDb.query("SELECT * FROM players WHERE id = $1", [item.playerId]) : { rows: [] };
    const matchRes = item.matchId ? await pgDb.query("SELECT * FROM matches WHERE id = $1", [item.matchId]) : { rows: [] };

    res.json({ case: item, player: playerRes.rows[0] || null, match: matchRes.rows[0] || null });
  } catch (err: any) {
    console.error("Disciplinary GET by id error:", err);
    res.status(500).json({ error: "Failed to fetch disciplinary case" });
  }
});

// POST /api/disciplinary
disciplinaryRouter.post(
  "/",
  authenticate(false),
  requireRole(DISCIPLINARY_ROLES),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        playerId,
        matchId,
        clubId,
        competitionId,
        offense,
        cardType = "yellow",
        suspensionMatches = 0,
        fine,
        notes,
      } = req.body;

      if (!playerId || !offense) {
        res.status(400).json({ error: "playerId and offense are required" });
        return;
      }

      const playerRes = await pgDb.query("SELECT * FROM players WHERE id = $1", [playerId]);
      const player = playerRes.rows[0];
      const playerName = player ? `${player.first_name} ${player.last_name}` : undefined;
      const effectiveClubId = clubId || player?.current_club_id || null;

      const id = req.body.id || `disc-${Date.now()}`;
      const insertRes = await pgDb.query(
        `INSERT INTO disciplinary_cases (
          id, player_id, player_name, club_id, competition_id, match_id,
          offense, card_type, suspension_matches, fine, status, notes,
          reviewed_by, reviewed_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8::card_type, $9, $10, 'open'::disciplinary_status, $11, $12, NOW(), NOW(), NOW()
        ) RETURNING *`,
        [
          id,
          playerId,
          playerName || null,
          effectiveClubId,
          competitionId || null,
          matchId || null,
          offense,
          cardType,
          Number(suspensionMatches),
          fine ? Number(fine) : 0,
          notes || null,
          req.user?.id || null,
        ]
      );

      const newCase = mapCaseRow(insertRes.rows[0]);

      logAudit(req, {
        action: "disciplinary.create",
        entityType: "disciplinaryCase",
        entityId: newCase.id,
        after: newCase,
      });

      res.status(201).json({ message: "Disciplinary case opened", case: newCase, ...newCase });
    } catch (err: any) {
      console.error("Disciplinary create error:", err);
      res.status(500).json({ error: err.message || "Failed to create disciplinary case" });
    }
  }
);

// PUT /api/disciplinary/:id
disciplinaryRouter.put(
  "/:id",
  authenticate(false),
  requireRole(DISCIPLINARY_ROLES),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const existingRes = await pgDb.query("SELECT * FROM disciplinary_cases WHERE id = $1", [id]);
      if (!existingRes.rows[0]) {
        res.status(404).json({ error: "Disciplinary case not found" });
        return;
      }
      const existing = mapCaseRow(existingRes.rows[0]);

      const { offense, cardType, suspensionMatches, fine, status, notes } = req.body;
      const setClauses: string[] = [];
      const values: any[] = [id];
      let idx = 2;

      if (offense !== undefined) { setClauses.push(`offense = $${idx++}`); values.push(offense); }
      if (cardType !== undefined) { setClauses.push(`card_type = $${idx++}::card_type`); values.push(cardType); }
      if (suspensionMatches !== undefined) { setClauses.push(`suspension_matches = $${idx++}`); values.push(Number(suspensionMatches)); }
      if (fine !== undefined) { setClauses.push(`fine = $${idx++}`); values.push(Number(fine)); }
      if (status !== undefined) { setClauses.push(`status = $${idx++}::disciplinary_status`); values.push(status); }
      if (notes !== undefined) { setClauses.push(`notes = $${idx++}`); values.push(notes); }

      setClauses.push(`reviewed_by = $${idx++}`);
      values.push(req.user?.id || null);

      setClauses.push("reviewed_at = NOW()");
      setClauses.push("updated_at = NOW()");

      const updateRes = await pgDb.query(
        `UPDATE disciplinary_cases SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`,
        values
      );
      const updated = mapCaseRow(updateRes.rows[0]);

      logAudit(req, {
        action: "disciplinary.update",
        entityType: "disciplinaryCase",
        entityId: id,
        before: existing,
        after: updated,
      });

      res.json({ message: "Disciplinary case updated", case: updated });
    } catch (err: any) {
      console.error("Disciplinary update error:", err);
      res.status(500).json({ error: err.message || "Failed to update disciplinary case" });
    }
  }
);
