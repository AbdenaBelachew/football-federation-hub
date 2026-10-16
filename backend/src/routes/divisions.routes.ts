import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole, requireAdmin, COMPETITION_ROLES } from "../middleware/rbac.js";
import { logAudit } from "../middleware/audit.js";
import { pgDb } from "../db/postgres.js";
import { mapClubRow } from "./clubs.routes.js";

export const divisionsRouter = Router();

export function mapDivisionRow(d: any): any {
  if (!d) return null;
  return {
    id: d.id,
    name: d.name,
    tier: Number(d.tier),
    seasonId: d.season_id,
    description: d.description,
    maxClubs: d.max_clubs != null ? Number(d.max_clubs) : 16,
    promotionSlots: d.promotion_slots != null ? Number(d.promotion_slots) : 3,
    relegationSlots: d.relegation_slots != null ? Number(d.relegation_slots) : 3,
    createdAt: d.created_at ? new Date(d.created_at).getTime() : Date.now(),
  };
}

// GET /api/divisions
divisionsRouter.get("/", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const { seasonId } = req.query;
    let query = "SELECT * FROM divisions";
    const params: any[] = [];
    if (seasonId) {
      query += " WHERE season_id = $1";
      params.push(seasonId);
    }
    query += " ORDER BY tier ASC";

    const divRes = await pgDb.query(query, params);
    const divisions = divRes.rows.map(mapDivisionRow);

    const compRes = await pgDb.query("SELECT * FROM competitions");
    const comps = compRes.rows;

    const teamClubRes = await pgDb.query(`
      SELECT t.division_id, t.competition_id, c.*
      FROM teams t
      JOIN clubs c ON c.id = t.club_id
    `);
    const teamClubs = teamClubRes.rows;

    const enriched = divisions.map((d) => {
      const divisionComps = comps
        .filter((c: any) => c.division_id === d.id)
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          seasonId: c.season_id,
          divisionId: c.division_id,
          description: c.description,
          rules: c.rules,
          isActive: Boolean(c.is_active),
        }));

      const compIds = new Set(divisionComps.map((c) => c.id));
      const seenClubIds = new Set<string>();
      const clubs: any[] = [];

      for (const tc of teamClubs) {
        if (tc.division_id === d.id || compIds.has(tc.competition_id)) {
          if (!seenClubIds.has(tc.id)) {
            seenClubIds.add(tc.id);
            clubs.push(mapClubRow(tc));
          }
        }
      }

      return {
        ...d,
        competitions: divisionComps,
        clubs,
        clubCount: clubs.length,
      };
    });

    res.json({ total: enriched.length, count: enriched.length, items: enriched, divisions: enriched });
  } catch (err: any) {
    console.error("Divisions GET error:", err);
    res.status(500).json({ error: "Failed to fetch divisions" });
  }
});

// GET /api/divisions/:id
divisionsRouter.get("/:id", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const divRes = await pgDb.query("SELECT * FROM divisions WHERE id = $1", [req.params.id]);
    if (!divRes.rows[0]) {
      res.status(404).json({ error: "Division not found" });
      return;
    }
    const division = mapDivisionRow(divRes.rows[0]);

    const compRes = await pgDb.query("SELECT * FROM competitions WHERE division_id = $1", [division.id]);
    res.json({ division, competitions: compRes.rows });
  } catch (err: any) {
    console.error("Division GET by id error:", err);
    res.status(500).json({ error: "Failed to fetch division" });
  }
});

// POST /api/divisions
divisionsRouter.post(
  "/",
  authenticate(false),
  requireRole(COMPETITION_ROLES),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, tier, seasonId, description, maxClubs, promotionSlots, relegationSlots } = req.body;
      if (!name || tier == null || !seasonId) {
        res.status(400).json({ error: "name, tier, and seasonId are required" });
        return;
      }

      const id = req.body.id || `div-${Date.now()}`;
      const insertRes = await pgDb.query(
        `INSERT INTO divisions (id, name, tier, season_id, description, max_clubs, promotion_slots, relegation_slots, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         RETURNING *`,
        [
          id,
          name,
          Number(tier),
          seasonId,
          description || null,
          maxClubs ? Number(maxClubs) : 16,
          promotionSlots ? Number(promotionSlots) : 3,
          relegationSlots ? Number(relegationSlots) : 3,
        ]
      );

      const division = mapDivisionRow(insertRes.rows[0]);

      logAudit(req, {
        action: "division.create",
        entityType: "division",
        entityId: division.id,
        after: division,
      });

      res.status(201).json({ message: "Division created successfully", division });
    } catch (err: any) {
      console.error("Division create error:", err);
      res.status(500).json({ error: err.message || "Failed to create division" });
    }
  }
);

// PUT /api/divisions/:id
divisionsRouter.put(
  "/:id",
  authenticate(false),
  requireAdmin(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const existingRes = await pgDb.query("SELECT * FROM divisions WHERE id = $1", [id]);
      if (!existingRes.rows[0]) {
        res.status(404).json({ error: "Division not found" });
        return;
      }
      const existing = mapDivisionRow(existingRes.rows[0]);

      const { name, tier, seasonId, description, maxClubs, promotionSlots, relegationSlots } = req.body;
      const setClauses: string[] = [];
      const values: any[] = [id];
      let idx = 2;

      if (name !== undefined) { setClauses.push(`name = $${idx++}`); values.push(name); }
      if (tier !== undefined) { setClauses.push(`tier = $${idx++}`); values.push(Number(tier)); }
      if (seasonId !== undefined) { setClauses.push(`season_id = $${idx++}`); values.push(seasonId); }
      if (description !== undefined) { setClauses.push(`description = $${idx++}`); values.push(description); }
      if (maxClubs !== undefined) { setClauses.push(`max_clubs = $${idx++}`); values.push(Number(maxClubs)); }
      if (promotionSlots !== undefined) { setClauses.push(`promotion_slots = $${idx++}`); values.push(Number(promotionSlots)); }
      if (relegationSlots !== undefined) { setClauses.push(`relegation_slots = $${idx++}`); values.push(Number(relegationSlots)); }

      if (setClauses.length === 0) {
        res.json({ message: "No updates provided", division: existing });
        return;
      }

      const updateRes = await pgDb.query(
        `UPDATE divisions SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`,
        values
      );
      const updated = mapDivisionRow(updateRes.rows[0]);

      logAudit(req, {
        action: "division.update",
        entityType: "division",
        entityId: id,
        before: existing,
        after: updated,
      });

      res.json({ message: "Division updated successfully", division: updated });
    } catch (err: any) {
      console.error("Division update error:", err);
      res.status(500).json({ error: err.message || "Failed to update division" });
    }
  }
);

// DELETE /api/divisions/:id
divisionsRouter.delete(
  "/:id",
  authenticate(false),
  requireAdmin(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const existingRes = await pgDb.query("SELECT * FROM divisions WHERE id = $1", [id]);
      if (!existingRes.rows[0]) {
        res.status(404).json({ error: "Division not found" });
        return;
      }
      const existing = mapDivisionRow(existingRes.rows[0]);

      await pgDb.query("DELETE FROM divisions WHERE id = $1", [id]);

      logAudit(req, {
        action: "division.delete",
        entityType: "division",
        entityId: id,
        before: existing,
      });

      res.json({ message: "Division deleted successfully" });
    } catch (err: any) {
      console.error("Division delete error:", err);
      res.status(500).json({ error: err.message || "Failed to delete division" });
    }
  }
);
