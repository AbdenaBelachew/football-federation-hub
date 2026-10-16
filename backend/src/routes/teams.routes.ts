import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { logAudit } from "../middleware/audit.js";
import { pgDb } from "../db/postgres.js";
import { ROLES } from "../types.js";

export const teamsRouter = Router();

export function mapTeamRow(t: any): any {
  if (!t) return null;
  return {
    id: t.id,
    name: t.name,
    clubId: t.club_id,
    competitionId: t.competition_id,
    seasonId: t.season_id,
    divisionId: t.division_id,
    squadNumber: t.squad_number,
    coachId: t.coach_id,
    status: t.status,
    clubName: t.club_name || t.name,
    competitionName: t.competition_name || "Unknown Competition",
    seasonName: t.season_name || "Unknown Season",
    logoUrl: t.club_logo,
    createdAt: t.created_at ? new Date(t.created_at).getTime() : Date.now(),
  };
}

// GET /api/teams
teamsRouter.get("/", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const { clubId, competitionId, seasonId, status } = req.query;
    const whereClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (clubId) {
      whereClauses.push(`t.club_id = $${idx++}`);
      params.push(clubId);
    }
    if (competitionId) {
      whereClauses.push(`t.competition_id = $${idx++}`);
      params.push(competitionId);
    }
    if (seasonId) {
      whereClauses.push(`t.season_id = $${idx++}`);
      params.push(seasonId);
    }
    if (status) {
      whereClauses.push(`t.status = $${idx++}`);
      params.push(status);
    }

    const where = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const query = `
      SELECT 
        t.*,
        c.name as club_name,
        c.logo_url as club_logo,
        comp.name as competition_name,
        s.name as season_name
      FROM teams t
      LEFT JOIN clubs c ON c.id = t.club_id
      LEFT JOIN competitions comp ON comp.id = t.competition_id
      LEFT JOIN seasons s ON s.id = t.season_id
      ${where}
      ORDER BY t.name ASC
    `;

    const result = await pgDb.query(query, params);
    const enriched = result.rows.map(mapTeamRow);

    res.json({ total: enriched.length, count: enriched.length, items: enriched, teams: enriched });
  } catch (err: any) {
    console.error("Teams GET error:", err);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
});

// GET /api/teams/:id
teamsRouter.get("/:id", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const teamRes = await pgDb.query(
      `SELECT t.*, c.name as club_name, c.logo_url as club_logo, comp.name as competition_name, s.name as season_name
       FROM teams t
       LEFT JOIN clubs c ON c.id = t.club_id
       LEFT JOIN competitions comp ON comp.id = t.competition_id
       LEFT JOIN seasons s ON s.id = t.season_id
       WHERE t.id = $1`,
      [req.params.id]
    );

    const teamRow = teamRes.rows[0];
    if (!teamRow) {
      res.status(404).json({ error: "Team not found" });
      return;
    }

    const team = mapTeamRow(teamRow);

    const clubRes = await pgDb.query("SELECT * FROM clubs WHERE id = $1", [team.clubId]);
    const compRes = await pgDb.query("SELECT * FROM competitions WHERE id = $1", [team.competitionId]);

    const playersRes = await pgDb.query(
      `SELECT p.*, pr.squad_number, pr.status as registration_status, pr.license_number
       FROM players p
       JOIN player_registrations pr ON pr.player_id = p.id
       WHERE pr.team_id = $1 AND pr.status = 'active'`,
      [team.id]
    );

    const players = playersRes.rows.map((p: any) => ({
      id: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      position: p.position,
      photoUrl: p.photo_url,
      status: p.status,
      jerseyNumber: p.jersey_number ?? p.squad_number,
    }));

    res.json({
      team,
      club: clubRes.rows[0] || null,
      competition: compRes.rows[0] || null,
      squad: players,
      squadCount: players.length,
    });
  } catch (err: any) {
    console.error("Team GET by id error:", err);
    res.status(500).json({ error: "Failed to fetch team" });
  }
});

// POST /api/teams
teamsRouter.post(
  "/",
  authenticate(false),
  requireRole([ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN, ROLES.CLUB_ADMIN]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      let { name, clubId, competitionId, seasonId, divisionId, squadNumber = 25 } = req.body;
      if (!clubId) {
        res.status(400).json({ error: "clubId is required" });
        return;
      }

      const clubRes = await pgDb.query("SELECT * FROM clubs WHERE id = $1", [clubId]);
      const club = clubRes.rows[0];
      if (!club) {
        res.status(404).json({ error: "Club not found" });
        return;
      }

      if (!name) {
        name = `${club.name} Senior Team`;
      }

      // Auto-link division and competition if one is supplied
      if (competitionId && !divisionId) {
        const compRes = await pgDb.query("SELECT * FROM competitions WHERE id = $1", [competitionId]);
        const comp = compRes.rows[0];
        if (comp?.division_id) divisionId = comp.division_id;
        if (!seasonId && comp?.season_id) seasonId = comp.season_id;
      } else if (divisionId && !competitionId) {
        const compRes = await pgDb.query("SELECT * FROM competitions WHERE division_id = $1 LIMIT 1", [divisionId]);
        const comp = compRes.rows[0];
        if (comp) competitionId = comp.id;
        const divRes = await pgDb.query("SELECT * FROM divisions WHERE id = $1", [divisionId]);
        const div = divRes.rows[0];
        if (!seasonId && div?.season_id) seasonId = div.season_id;
      }

      if (!seasonId) {
        const seasonRes = await pgDb.query("SELECT * FROM seasons WHERE is_active = true LIMIT 1");
        const activeSeason = seasonRes.rows[0];
        if (activeSeason) {
          seasonId = activeSeason.id;
        } else {
          const anySeasonRes = await pgDb.query("SELECT * FROM seasons ORDER BY start_date DESC LIMIT 1");
          seasonId = anySeasonRes.rows[0]?.id || "season-2025-2026";
        }
      }

      // If still no competitionId, pick or create default for competition reference constraint
      if (!competitionId) {
        const anyCompRes = await pgDb.query("SELECT * FROM competitions WHERE season_id = $1 LIMIT 1", [seasonId]);
        competitionId = anyCompRes.rows[0]?.id || null;
      }

      // 1. Enforce: One club must be under only one division per season
      if (divisionId) {
        const existingInDivRes = await pgDb.query(
          "SELECT * FROM teams WHERE club_id = $1 AND season_id = $2 AND division_id IS NOT NULL LIMIT 1",
          [clubId, seasonId]
        );
        const existingInDivision = existingInDivRes.rows[0];

        if (existingInDivision) {
          if (existingInDivision.division_id === divisionId) {
            res.status(400).json({ error: `'${club.name}' is already enrolled in this division.` });
            return;
          }

          // Support moving/transferring division (Promotion / Relegation)
          if (req.body.moveDivision) {
            const oldDivRes = existingInDivision.division_id
              ? await pgDb.query("SELECT * FROM divisions WHERE id = $1", [existingInDivision.division_id])
              : { rows: [] };
            const oldDiv = oldDivRes.rows[0];

            let newCompId = existingInDivision.competition_id;
            const compForDiv = await pgDb.query("SELECT * FROM competitions WHERE division_id = $1 LIMIT 1", [divisionId]);
            if (compForDiv.rows[0]) newCompId = compForDiv.rows[0].id;

            const updatedRes = await pgDb.query(
              "UPDATE teams SET division_id = $1, competition_id = $2 WHERE id = $3 RETURNING *",
              [divisionId, newCompId, existingInDivision.id]
            );
            const updatedTeam = mapTeamRow(updatedRes.rows[0]);

            logAudit(req, {
              action: "team.moveDivision",
              entityType: "team",
              entityId: existingInDivision.id,
              before: { divisionId: oldDiv?.id },
              after: { divisionId },
            });

            const newDivRes = await pgDb.query("SELECT * FROM divisions WHERE id = $1", [divisionId]);
            res.json({
              message: `Club '${club.name}' moved from '${oldDiv?.name}' to '${newDivRes.rows[0]?.name}'.`,
              team: updatedTeam,
            });
            return;
          }

          const existingDivRes = existingInDivision.division_id
            ? await pgDb.query("SELECT * FROM divisions WHERE id = $1", [existingInDivision.division_id])
            : { rows: [] };
          const existingDiv = existingDivRes.rows[0];

          res.status(400).json({
            error: `Rule violation: '${club.name}' is already assigned to '${existingDiv?.name || "another division"}'. A club can only belong to one division at a time.`,
          });
          return;
        }
      }

      // 2. Duplicate check within competition
      if (competitionId) {
        const existingInComp = await pgDb.query(
          "SELECT * FROM teams WHERE club_id = $1 AND competition_id = $2 LIMIT 1",
          [clubId, competitionId]
        );
        if (existingInComp.rows[0]) {
          res.status(400).json({ error: `'${club.name}' is already enrolled in this competition.` });
          return;
        }
      }

      const teamId = req.body.id || `team-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

      const insertRes = await pgDb.query(
        `INSERT INTO teams (id, name, club_id, competition_id, season_id, division_id, squad_number, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         RETURNING *`,
        [
          teamId,
          name,
          clubId,
          competitionId,
          seasonId,
          divisionId || null,
          Number(squadNumber),
          "active",
        ]
      );

      const team = mapTeamRow(insertRes.rows[0]);

      logAudit(req, {
        action: "team.create",
        entityType: "team",
        entityId: team.id,
        after: team,
      });

      res.status(201).json({ message: `Club '${club.name}' successfully enrolled!`, team });
    } catch (err: any) {
      console.error("Team create error:", err);
      res.status(500).json({ error: err.message || "Failed to create team" });
    }
  }
);

// PUT /api/teams/:id
teamsRouter.put(
  "/:id",
  authenticate(false),
  requireRole([ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN, ROLES.CLUB_ADMIN]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const teamId = req.params.id as string;
      const existingRes = await pgDb.query("SELECT * FROM teams WHERE id = $1", [teamId]);
      const existing = existingRes.rows[0];
      if (!existing) {
        res.status(404).json({ error: "Team not found" });
        return;
      }

      const { name, squadNumber, status, coachId, divisionId, competitionId, seasonId } = req.body;
      const setClauses: string[] = [];
      const values: any[] = [teamId];
      let idx = 2;

      if (name !== undefined) { setClauses.push(`name = $${idx++}`); values.push(name); }
      if (squadNumber !== undefined) { setClauses.push(`squad_number = $${idx++}`); values.push(Number(squadNumber)); }
      if (status !== undefined) { setClauses.push(`status = $${idx++}`); values.push(status); }
      if (coachId !== undefined) { setClauses.push(`coach_id = $${idx++}`); values.push(coachId); }
      if (divisionId !== undefined) { setClauses.push(`division_id = $${idx++}`); values.push(divisionId); }
      if (competitionId !== undefined) { setClauses.push(`competition_id = $${idx++}`); values.push(competitionId); }
      if (seasonId !== undefined) { setClauses.push(`season_id = $${idx++}`); values.push(seasonId); }

      if (setClauses.length === 0) {
        res.json({ message: "No updates provided", team: mapTeamRow(existing) });
        return;
      }

      const updateRes = await pgDb.query(
        `UPDATE teams SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`,
        values
      );
      const updated = mapTeamRow(updateRes.rows[0]);

      logAudit(req, {
        action: "team.update",
        entityType: "team",
        entityId: teamId,
        before: mapTeamRow(existing),
        after: updated,
      });

      res.json({ message: "Team updated successfully", team: updated });
    } catch (err: any) {
      console.error("Team update error:", err);
      res.status(500).json({ error: err.message || "Failed to update team" });
    }
  }
);

// DELETE /api/teams/:id
teamsRouter.delete(
  "/:id",
  authenticate(false),
  requireRole([ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const teamId = req.params.id as string;
      const existingRes = await pgDb.query("SELECT * FROM teams WHERE id = $1", [teamId]);
      const existing = existingRes.rows[0];
      if (!existing) {
        res.status(404).json({ error: "Team not found" });
        return;
      }

      await pgDb.query("DELETE FROM teams WHERE id = $1", [teamId]);

      logAudit(req, {
        action: "team.delete",
        entityType: "team",
        entityId: teamId,
        before: mapTeamRow(existing),
      });

      res.json({ message: "Team deleted successfully" });
    } catch (err: any) {
      console.error("Team delete error:", err);
      res.status(500).json({ error: err.message || "Failed to delete team" });
    }
  }
);
