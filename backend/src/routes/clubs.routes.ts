import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole, CLUB_MANAGEMENT_ROLES } from "../middleware/rbac.js";
import { logAudit } from "../middleware/audit.js";
import { pgDb } from "../db/postgres.js";
import { ROLES } from "../types.js";

export const clubsRouter = Router();

export function mapClubRow(c: any): any {
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    shortName: c.short_name,
    foundedYear: c.founded_year,
    city: c.city,
    country: c.country || "Ethiopia",
    logoUrl: c.logo_url,
    contactEmail: c.contact_email,
    contactPhone: c.contact_phone,
    address: c.address,
    registrationNumber: c.registration_number,
    status: c.status,
    president: c.president,
    secretary: c.secretary,
    stadium: c.stadium,
    createdAt: c.created_at ? new Date(c.created_at).getTime() : Date.now(),
    updatedAt: c.updated_at ? new Date(c.updated_at).getTime() : Date.now(),
  };
}

// GET /api/clubs
clubsRouter.get("/", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search, city, country, limit = "100", offset = "0" } = req.query;
    const params: any[] = [];
    const whereClauses: string[] = [];
    let idx = 1;

    if (status) {
      whereClauses.push(`status = $${idx++}::club_status`);
      params.push(status);
    }
    if (city) {
      whereClauses.push(`LOWER(city) = LOWER($${idx++})`);
      params.push(city);
    }
    if (country) {
      whereClauses.push(`LOWER(country) = LOWER($${idx++})`);
      params.push(country);
    }
    if (search) {
      const q = `%${(search as string).toLowerCase()}%`;
      whereClauses.push(
        `(LOWER(name) LIKE $${idx} OR LOWER(short_name) LIKE $${idx} OR LOWER(city) LIKE $${idx} OR LOWER(registration_number) LIKE $${idx})`
      );
      params.push(q);
      idx++;
    }

    const where = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const countRes = await pgDb.query(`SELECT COUNT(*) FROM clubs ${where}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const query = `SELECT * FROM clubs ${where} ORDER BY name ASC LIMIT $${idx++} OFFSET $${idx}`;
    params.push(parseInt(limit as string, 10));
    params.push(parseInt(offset as string, 10));

    const result = await pgDb.query(query, params);
    const clubs = result.rows.map(mapClubRow);

    res.json({ clubs, items: clubs, total, limit: parseInt(limit as string, 10), offset: parseInt(offset as string, 10) });
  } catch (err) {
    console.error("Clubs GET error:", err);
    res.status(500).json({ error: "Failed to fetch clubs" });
  }
});

// GET /api/clubs/stats
clubsRouter.get("/stats", authenticate(true), async (_req: Request, res: Response): Promise<void> => {
  try {
    const counts = await pgDb.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'suspended') as suspended
      FROM clubs
    `);
    const row = counts.rows[0];
    res.json({
      totalClubs: parseInt(row.total || 0, 10),
      activeClubs: parseInt(row.active || 0, 10),
      pendingClubs: parseInt(row.pending || 0, 10),
      suspendedClubs: parseInt(row.suspended || 0, 10),
    });
  } catch (err) {
    console.error("Clubs stats error:", err);
    res.status(500).json({ error: "Failed to fetch club stats" });
  }
});

// GET /api/clubs/:id
clubsRouter.get("/:id", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pgDb.query(`SELECT * FROM clubs WHERE id = $1`, [req.params.id]);
    const clubRow = result.rows[0];
    if (!clubRow) {
      res.status(404).json({ error: "Club not found" });
      return;
    }
    const club = mapClubRow(clubRow);

    // Fetch related teams and active player count via separate queries
    const teamsResult = await pgDb.query(`SELECT * FROM teams WHERE club_id = $1`, [club.id]);
    const registrationsResult = await pgDb.query(
      `SELECT COUNT(*) FROM player_registrations WHERE club_id = $1 AND status = 'active'`,
      [club.id]
    );
    const activePlayersCount = parseInt(registrationsResult.rows[0]?.count || 0, 10);

    res.json({ club, teams: teamsResult.rows, activePlayersCount });
  } catch (err) {
    console.error("Club GET by id error:", err);
    res.status(500).json({ error: "Failed to fetch club" });
  }
});

// POST /api/clubs
clubsRouter.post(
  "/",
  authenticate(false),
  requireRole([ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        id: customId,
        name,
        shortName,
        foundedYear,
        city = "Addis Ababa",
        country = "Ethiopia",
        logoUrl,
        contactEmail,
        contactPhone,
        address,
        registrationNumber,
        status = "active",
        president,
        secretary,
        stadium,
      } = req.body;

      if (!name) {
        res.status(400).json({ error: "Club name is required" });
        return;
      }

      const id = customId || `club-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const regNum = registrationNumber || `FED-CLB-${Math.floor(1000 + Math.random() * 9000)}`;

      const result = await pgDb.query(
        `INSERT INTO clubs (
          id, name, short_name, founded_year, city, country, logo_url,
          contact_email, contact_phone, address, registration_number,
          status, president, secretary, stadium, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::club_status, $13, $14, $15, NOW(), NOW()
        ) RETURNING *`,
        [
          id,
          name.trim(),
          shortName?.trim() || null,
          foundedYear ? Number(foundedYear) : null,
          city.trim(),
          country.trim(),
          logoUrl || null,
          contactEmail?.trim() || null,
          contactPhone?.trim() || null,
          address?.trim() || null,
          regNum,
          status,
          president?.trim() || null,
          secretary?.trim() || null,
          stadium?.trim() || null,
        ]
      );

      const club = mapClubRow(result.rows[0]);
      logAudit(req, {
        action: "club.create",
        entityType: "club",
        entityId: club.id,
        after: club,
      });

      res.status(201).json({ message: "Club created successfully", club });
    } catch (err: any) {
      console.error("Club create error:", err);
      res.status(500).json({ error: err.message || "Failed to create club" });
    }
  }
);

// POST /api/clubs/bulk (Bulk CSV Import)
clubsRouter.post(
  "/bulk",
  authenticate(false),
  requireRole(CLUB_MANAGEMENT_ROLES),
  async (req: Request, res: Response): Promise<void> => {
    const { clubs: clubsList } = req.body;
    if (!Array.isArray(clubsList) || clubsList.length === 0) {
      res.status(400).json({ error: "clubs array is required" });
      return;
    }
    const created: any[] = [];
    try {
      for (const c of clubsList) {
        if (!c.name) continue;
        const id = c.id || `club-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        const regNum = c.registrationNumber?.trim() || `FED-CLB-${Math.floor(1000 + Math.random() * 9000)}`;

        const result = await pgDb.query(
          `INSERT INTO clubs (
            id, name, short_name, city, country, stadium, founded_year, president,
            secretary, contact_email, contact_phone, registration_number, status, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::club_status, NOW(), NOW()
          ) RETURNING *`,
          [
            id,
            c.name.trim(),
            c.shortName?.trim() || null,
            c.city?.trim() || "Addis Ababa",
            c.country?.trim() || "Ethiopia",
            c.stadium?.trim() || null,
            c.foundedYear ? Number(c.foundedYear) : null,
            c.president?.trim() || null,
            c.secretary?.trim() || null,
            c.contactEmail?.trim() || null,
            c.contactPhone?.trim() || null,
            regNum,
            c.status || "active",
          ]
        );
        created.push(mapClubRow(result.rows[0]));
      }

      logAudit(req, {
        action: "club.bulk_import",
        entityType: "club",
        entityId: "bulk",
        after: { count: created.length },
      });

      res.status(201).json({
        message: `Successfully imported ${created.length} clubs`,
        count: created.length,
        clubs: created,
      });
    } catch (err: any) {
      console.error("Club bulk error:", err);
      res.status(500).json({ error: err.message || "Bulk import failed" });
    }
  }
);

// PUT /api/clubs/:id
clubsRouter.put(
  "/:id",
  authenticate(false),
  requireRole([ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN, ROLES.CLUB_ADMIN]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const existingResult = await pgDb.query(`SELECT * FROM clubs WHERE id = $1`, [req.params.id]);
      const existing = existingResult.rows[0];
      if (!existing) {
        res.status(404).json({ error: "Club not found" });
        return;
      }
      if (req.user?.role === ROLES.CLUB_ADMIN && req.user.clubId !== req.params.id) {
        res.status(403).json({ error: "You can only update your own club profile" });
        return;
      }

      const body = req.body;
      const fieldMap: Record<string, string> = {
        name: "name",
        shortName: "short_name",
        foundedYear: "founded_year",
        city: "city",
        country: "country",
        logoUrl: "logo_url",
        contactEmail: "contact_email",
        contactPhone: "contact_phone",
        address: "address",
        registrationNumber: "registration_number",
        status: "status",
        president: "president",
        secretary: "secretary",
        stadium: "stadium",
      };

      const setClauses: string[] = [];
      const values: any[] = [req.params.id];
      let idx = 2;

      for (const [key, col] of Object.entries(fieldMap)) {
        if (body[key] !== undefined) {
          if (col === "status") {
            setClauses.push(`${col} = $${idx++}::club_status`);
          } else {
            setClauses.push(`${col} = $${idx++}`);
          }
          values.push(body[key]);
        }
      }

      if (setClauses.length === 0) {
        res.json({ message: "No changes provided", club: mapClubRow(existing) });
        return;
      }

      setClauses.push("updated_at = NOW()");
      const updateResult = await pgDb.query(
        `UPDATE clubs SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`,
        values
      );
      const updated = mapClubRow(updateResult.rows[0]);

      logAudit(req, {
        action: "club.update",
        entityType: "club",
        entityId: req.params.id as string,
        before: mapClubRow(existing),
        after: updated,
      });

      res.json({ message: "Club updated successfully", club: updated });
    } catch (err: any) {
      console.error("Club update error:", err);
      res.status(500).json({ error: err.message || "Failed to update club" });
    }
  }
);

// DELETE /api/clubs/:id
clubsRouter.delete(
  "/:id",
  authenticate(false),
  requireRole([ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const existingResult = await pgDb.query(`SELECT * FROM clubs WHERE id = $1`, [req.params.id]);
      const existing = existingResult.rows[0];
      if (!existing) {
        res.status(404).json({ error: "Club not found" });
        return;
      }
      await pgDb.query(`DELETE FROM clubs WHERE id = $1`, [req.params.id]);
      logAudit(req, {
        action: "club.delete",
        entityType: "club",
        entityId: req.params.id as string,
        before: mapClubRow(existing),
      });
      res.json({ message: "Club deleted successfully" });
    } catch (err: any) {
      console.error("Club delete error:", err);
      res.status(500).json({ error: err.message || "Failed to delete club" });
    }
  }
);

// GET /api/clubs/:id/teams
clubsRouter.get("/:id/teams", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pgDb.query(`SELECT * FROM teams WHERE club_id = $1 ORDER BY name ASC`, [req.params.id]);
    const teams = result.rows.map((t: any) => ({
      id: t.id,
      name: t.name,
      clubId: t.club_id,
      competitionId: t.competition_id,
      seasonId: t.season_id,
      divisionId: t.division_id,
      squadNumber: t.squad_number,
      coachId: t.coach_id,
      status: t.status,
      createdAt: t.created_at ? new Date(t.created_at).getTime() : Date.now(),
    }));
    res.json({ teams });
  } catch (err: any) {
    console.error("Clubs GET teams error:", err);
    res.status(500).json({ error: "Failed to fetch club teams" });
  }
});

// GET /api/clubs/:id/players
clubsRouter.get("/:id/players", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pgDb.query(
      `SELECT p.*, pr.squad_number, pr.status as registration_status, pr.license_number
       FROM players p
       JOIN player_registrations pr ON pr.player_id = p.id
       WHERE pr.club_id = $1 AND pr.status = 'active'
       ORDER BY p.first_name ASC`,
      [req.params.id]
    );

    const players = result.rows.map((p: any) => ({
      id: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      dateOfBirth: p.date_of_birth ? new Date(p.date_of_birth).toISOString().split("T")[0] : "",
      nationality: p.nationality,
      position: p.position,
      photoUrl: p.photo_url,
      phone: p.phone,
      email: p.email,
      idDocumentType: p.id_document_type,
      idDocumentNumber: p.id_document_number,
      status: p.status,
      address: p.address,
      height: p.height ? Number(p.height) : undefined,
      weight: p.weight ? Number(p.weight) : undefined,
      preferredFoot: p.preferred_foot,
      currentClubId: p.current_club_id,
      currentClubName: p.current_club_name,
      jerseyNumber: p.jersey_number ?? p.squad_number,
      registrationStatus: p.registration_status,
      licenseNumber: p.license_number,
      createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
      updatedAt: p.updated_at ? new Date(p.updated_at).getTime() : Date.now(),
    }));

    res.json({ players, count: players.length });
  } catch (err: any) {
    console.error("Clubs GET players error:", err);
    res.status(500).json({ error: "Failed to fetch club players" });
  }
});
