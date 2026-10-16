import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole, requireAdmin, COMPETITION_ROLES } from "../middleware/rbac.js";
import { logAudit } from "../middleware/audit.js";
import { pgDb } from "../db/postgres.js";

export const seasonsRouter = Router();

export function mapSeasonRow(s: any): any {
  if (!s) return null;
  return {
    id: s.id,
    name: s.name,
    startDate: s.start_date instanceof Date ? s.start_date.toISOString().split("T")[0] : String(s.start_date || ""),
    endDate: s.end_date instanceof Date ? s.end_date.toISOString().split("T")[0] : String(s.end_date || ""),
    isActive: Boolean(s.is_active),
    description: s.description,
    createdAt: s.created_at ? new Date(s.created_at).getTime() : Date.now(),
  };
}

// GET /api/seasons
seasonsRouter.get("/", authenticate(true), async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pgDb.query("SELECT * FROM seasons ORDER BY start_date DESC");
    const seasons = result.rows.map(mapSeasonRow);
    res.json({ total: seasons.length, count: seasons.length, items: seasons, seasons });
  } catch (err: any) {
    console.error("Seasons GET error:", err);
    res.status(500).json({ error: "Failed to fetch seasons" });
  }
});

// GET /api/seasons/active
seasonsRouter.get("/active", authenticate(true), async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pgDb.query("SELECT * FROM seasons WHERE is_active = true LIMIT 1");
    if (!result.rows[0]) {
      res.status(404).json({ error: "No active season found" });
      return;
    }
    res.json({ season: mapSeasonRow(result.rows[0]) });
  } catch (err: any) {
    console.error("Season active error:", err);
    res.status(500).json({ error: "Failed to fetch active season" });
  }
});

// GET /api/seasons/:id
seasonsRouter.get("/:id", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const seasonRes = await pgDb.query("SELECT * FROM seasons WHERE id = $1", [req.params.id]);
    if (!seasonRes.rows[0]) {
      res.status(404).json({ error: "Season not found" });
      return;
    }
    const season = mapSeasonRow(seasonRes.rows[0]);

    const divRes = await pgDb.query("SELECT * FROM divisions WHERE season_id = $1 ORDER BY tier ASC", [season.id]);
    const compRes = await pgDb.query("SELECT * FROM competitions WHERE season_id = $1 ORDER BY name ASC", [season.id]);

    res.json({ season, divisions: divRes.rows, competitions: compRes.rows });
  } catch (err: any) {
    console.error("Season GET by id error:", err);
    res.status(500).json({ error: "Failed to fetch season" });
  }
});

// POST /api/seasons
seasonsRouter.post(
  "/",
  authenticate(false),
  requireRole(COMPETITION_ROLES),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, startDate, endDate, description, isActive = false } = req.body;
      if (!name || !startDate || !endDate) {
        res.status(400).json({ error: "name, startDate, and endDate are required" });
        return;
      }

      if (isActive) {
        await pgDb.query("UPDATE seasons SET is_active = false");
      }

      const id = req.body.id || `season-${Date.now()}`;
      const result = await pgDb.query(
        `INSERT INTO seasons (id, name, start_date, end_date, description, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING *`,
        [id, name, startDate, endDate, description || null, Boolean(isActive)]
      );

      const season = mapSeasonRow(result.rows[0]);

      logAudit(req, {
        action: "season.create",
        entityType: "season",
        entityId: season.id,
        after: season,
      });

      res.status(201).json({ message: "Season created successfully", season });
    } catch (err: any) {
      console.error("Season create error:", err);
      res.status(500).json({ error: err.message || "Failed to create season" });
    }
  }
);

// PUT /api/seasons/:id
seasonsRouter.put(
  "/:id",
  authenticate(false),
  requireAdmin(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const existingRes = await pgDb.query("SELECT * FROM seasons WHERE id = $1", [id]);
      if (!existingRes.rows[0]) {
        res.status(404).json({ error: "Season not found" });
        return;
      }
      const existing = mapSeasonRow(existingRes.rows[0]);

      const { name, startDate, endDate, description, isActive } = req.body;
      if (isActive) {
        await pgDb.query("UPDATE seasons SET is_active = false");
      }

      const setClauses: string[] = [];
      const values: any[] = [id];
      let idx = 2;

      if (name !== undefined) { setClauses.push(`name = $${idx++}`); values.push(name); }
      if (startDate !== undefined) { setClauses.push(`start_date = $${idx++}`); values.push(startDate); }
      if (endDate !== undefined) { setClauses.push(`end_date = $${idx++}`); values.push(endDate); }
      if (description !== undefined) { setClauses.push(`description = $${idx++}`); values.push(description); }
      if (isActive !== undefined) { setClauses.push(`is_active = $${idx++}`); values.push(Boolean(isActive)); }

      if (setClauses.length === 0) {
        res.json({ message: "No updates provided", season: existing });
        return;
      }

      const updateRes = await pgDb.query(
        `UPDATE seasons SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`,
        values
      );
      const updated = mapSeasonRow(updateRes.rows[0]);

      logAudit(req, {
        action: "season.update",
        entityType: "season",
        entityId: id,
        before: existing,
        after: updated,
      });

      res.json({ message: "Season updated successfully", season: updated });
    } catch (err: any) {
      console.error("Season update error:", err);
      res.status(500).json({ error: err.message || "Failed to update season" });
    }
  }
);

// POST /api/seasons/:id/activate
seasonsRouter.post(
  "/:id/activate",
  authenticate(false),
  requireAdmin(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const existingRes = await pgDb.query("SELECT * FROM seasons WHERE id = $1", [id]);
      if (!existingRes.rows[0]) {
        res.status(404).json({ error: "Season not found" });
        return;
      }

      await pgDb.query("UPDATE seasons SET is_active = false");
      const result = await pgDb.query("UPDATE seasons SET is_active = true WHERE id = $1 RETURNING *", [id]);
      const season = mapSeasonRow(result.rows[0]);

      logAudit(req, {
        action: "season.activate",
        entityType: "season",
        entityId: id,
      });

      res.json({ message: `Season '${season.name}' is now active`, season });
    } catch (err: any) {
      console.error("Season activate error:", err);
      res.status(500).json({ error: err.message || "Failed to activate season" });
    }
  }
);

// PATCH /api/seasons/:id/set-active (alias used by frontend)
seasonsRouter.patch(
  "/:id/set-active",
  authenticate(false),
  requireAdmin(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const existingRes = await pgDb.query("SELECT * FROM seasons WHERE id = $1", [id]);
      if (!existingRes.rows[0]) {
        res.status(404).json({ error: "Season not found" });
        return;
      }

      await pgDb.query("UPDATE seasons SET is_active = false");
      const result = await pgDb.query("UPDATE seasons SET is_active = true WHERE id = $1 RETURNING *", [id]);
      const season = mapSeasonRow(result.rows[0]);

      logAudit(req, {
        action: "season.activate",
        entityType: "season",
        entityId: id,
      });

      res.json({ message: `Season '${season.name}' is now active`, season });
    } catch (err: any) {
      console.error("Season set-active error:", err);
      res.status(500).json({ error: err.message || "Failed to activate season" });
    }
  }
);

// DELETE /api/seasons/:id
seasonsRouter.delete(
  "/:id",
  authenticate(false),
  requireAdmin(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const existingRes = await pgDb.query("SELECT * FROM seasons WHERE id = $1", [id]);
      if (!existingRes.rows[0]) {
        res.status(404).json({ error: "Season not found" });
        return;
      }
      const existing = mapSeasonRow(existingRes.rows[0]);

      await pgDb.query("DELETE FROM seasons WHERE id = $1", [id]);

      logAudit(req, {
        action: "season.delete",
        entityType: "season",
        entityId: id,
        before: existing,
      });

      res.json({ message: "Season deleted successfully" });
    } catch (err: any) {
      console.error("Season delete error:", err);
      res.status(500).json({ error: err.message || "Failed to delete season" });
    }
  }
);
