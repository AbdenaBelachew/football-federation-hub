import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole, COMPETITION_ROLES } from "../middleware/rbac.js";
import { logAudit } from "../middleware/audit.js";
import { pgDb } from "../db/postgres.js";
import { mapClubRow } from "./clubs.routes.js";

export const competitionsRouter = Router();

export function mapCompetitionRow(c: any): any {
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    seasonId: c.season_id,
    divisionId: c.division_id,
    description: c.description,
    rules: c.rules,
    registrationDeadline: c.registration_deadline instanceof Date ? c.registration_deadline.toISOString().split("T")[0] : (c.registration_deadline || null),
    isActive: Boolean(c.is_active),
    seasonName: c.season_name,
    divisionName: c.division_name,
    createdAt: c.created_at ? new Date(c.created_at).getTime() : Date.now(),
  };
}

// GET /api/competitions
competitionsRouter.get("/", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const { seasonId, type, divisionId } = req.query;
    const whereClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (seasonId) {
      whereClauses.push(`c.season_id = $${idx++}`);
      params.push(seasonId);
    }
    if (type) {
      whereClauses.push(`c.type = $${idx++}`);
      params.push(type);
    }
    if (divisionId) {
      whereClauses.push(`c.division_id = $${idx++}`);
      params.push(divisionId);
    }

    const where = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const query = `
      SELECT 
        c.*,
        s.name as season_name,
        d.name as division_name
      FROM competitions c
      LEFT JOIN seasons s ON s.id = c.season_id
      LEFT JOIN divisions d ON d.id = c.division_id
      ${where}
      ORDER BY c.name ASC
    `;

    const result = await pgDb.query(query, params);
    const comps = result.rows.map(mapCompetitionRow);

    // Fetch teams and clubs for each competition
    const teamClubRes = await pgDb.query(`
      SELECT t.competition_id, cl.*
      FROM teams t
      JOIN clubs cl ON cl.id = t.club_id
    `);

    const enriched = comps.map((c) => {
      const clubsForComp = teamClubRes.rows
        .filter((tc: any) => tc.competition_id === c.id)
        .map(mapClubRow);

      const uniqueClubs: any[] = [];
      const seen = new Set<string>();
      for (const cl of clubsForComp) {
        if (!seen.has(cl.id)) {
          seen.add(cl.id);
          uniqueClubs.push(cl);
        }
      }

      return {
        ...c,
        clubs: uniqueClubs,
        clubCount: uniqueClubs.length,
      };
    });

    res.json({ total: enriched.length, count: enriched.length, items: enriched, competitions: enriched });
  } catch (err: any) {
    console.error("Competitions GET error:", err);
    res.status(500).json({ error: "Failed to fetch competitions" });
  }
});

// GET /api/competitions/:id
competitionsRouter.get("/:id", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const compRes = await pgDb.query(
      `SELECT c.*, s.name as season_name, d.name as division_name
       FROM competitions c
       LEFT JOIN seasons s ON s.id = c.season_id
       LEFT JOIN divisions d ON d.id = c.division_id
       WHERE c.id = $1`,
      [req.params.id]
    );

    if (!compRes.rows[0]) {
      res.status(404).json({ error: "Competition not found" });
      return;
    }

    const competition = mapCompetitionRow(compRes.rows[0]);
    const seasonRes = await pgDb.query("SELECT * FROM seasons WHERE id = $1", [competition.seasonId]);
    const divisionRes = competition.divisionId
      ? await pgDb.query("SELECT * FROM divisions WHERE id = $1", [competition.divisionId])
      : { rows: [] };

    res.json({
      competition,
      season: seasonRes.rows[0] || null,
      division: divisionRes.rows[0] || null,
    });
  } catch (err: any) {
    console.error("Competition GET by id error:", err);
    res.status(500).json({ error: "Failed to fetch competition" });
  }
});

// GET /api/competitions/:id/standings
competitionsRouter.get("/:id/standings", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const compRes = await pgDb.query("SELECT * FROM competitions WHERE id = $1", [req.params.id]);
    if (!compRes.rows[0]) {
      res.status(404).json({ error: "Competition not found" });
      return;
    }
    const competition = mapCompetitionRow(compRes.rows[0]);

    // Get all completed matches for this competition
    const matchesRes = await pgDb.query(
      `SELECT * FROM matches 
       WHERE competition_id = $1 AND status = 'completed' AND home_score IS NOT NULL AND away_score IS NOT NULL`,
      [competition.id]
    );
    const matches = matchesRes.rows;

    interface StandingRow {
      teamId: string;
      teamName: string;
      clubId: string;
      clubName: string;
      played: number;
      won: number;
      drawn: number;
      lost: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDifference: number;
      points: number;
      form: ("W" | "D" | "L")[];
    }

    const tableMap = new Map<string, StandingRow>();

    // Ensure all registered teams in competition are included
    const teamsRes = await pgDb.query(
      `SELECT t.*, c.name as club_name
       FROM teams t
       LEFT JOIN clubs c ON c.id = t.club_id
       WHERE t.competition_id = $1`,
      [competition.id]
    );

    for (const t of teamsRes.rows) {
      tableMap.set(t.id, {
        teamId: t.id,
        teamName: t.name,
        clubId: t.club_id,
        clubName: t.club_name || t.name,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        form: [],
      });
    }

    // Calculate match stats
    for (const m of matches) {
      const homeScore = Number(m.home_score);
      const awayScore = Number(m.away_score);

      if (!tableMap.has(m.home_team_id)) {
        tableMap.set(m.home_team_id, {
          teamId: m.home_team_id,
          teamName: "Home Team",
          clubId: "",
          clubName: "Home Team",
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
          form: [],
        });
      }

      if (!tableMap.has(m.away_team_id)) {
        tableMap.set(m.away_team_id, {
          teamId: m.away_team_id,
          teamName: "Away Team",
          clubId: "",
          clubName: "Away Team",
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
          form: [],
        });
      }

      const home = tableMap.get(m.home_team_id)!;
      const away = tableMap.get(m.away_team_id)!;

      home.played++;
      away.played++;
      home.goalsFor += homeScore;
      home.goalsAgainst += awayScore;
      away.goalsFor += awayScore;
      away.goalsAgainst += homeScore;

      if (homeScore > awayScore) {
        home.won++;
        home.points += 3;
        home.form.push("W");
        away.lost++;
        away.form.push("L");
      } else if (homeScore < awayScore) {
        away.won++;
        away.points += 3;
        away.form.push("W");
        home.lost++;
        home.form.push("L");
      } else {
        home.drawn++;
        away.drawn++;
        home.points += 1;
        away.points += 1;
        home.form.push("D");
        away.form.push("D");
      }
    }

    // Calculate goal differences and sort standings
    const standings = Array.from(tableMap.values()).map((row) => ({
      ...row,
      goalDifference: row.goalsFor - row.goalsAgainst,
      form: row.form.slice(-5),
    }));

    standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.teamName.localeCompare(b.teamName);
    });

    const ranked = standings.map((item, index) => ({
      rank: index + 1,
      ...item,
    }));

    res.json({
      competition,
      totalTeams: ranked.length,
      standings: ranked,
    });
  } catch (err: any) {
    console.error("Standings GET error:", err);
    res.status(500).json({ error: "Failed to fetch standings" });
  }
});

// GET /api/competitions/:id/fixtures
competitionsRouter.get("/:id/fixtures", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const matchesRes = await pgDb.query(
      `SELECT 
        m.*,
        ht.name as home_team_name,
        at.name as away_team_name,
        hc.logo_url as home_club_logo,
        ac.logo_url as away_club_logo
       FROM matches m
       LEFT JOIN teams ht ON ht.id = m.home_team_id
       LEFT JOIN teams at ON at.id = m.away_team_id
       LEFT JOIN clubs hc ON hc.id = ht.club_id
       LEFT JOIN clubs ac ON ac.id = at.club_id
       WHERE m.competition_id = $1
       ORDER BY m.match_date ASC`,
      [req.params.id]
    );

    const fixtures = matchesRes.rows.map((m: any) => ({
      id: m.id,
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
      competitionId: m.competition_id,
      seasonId: m.season_id,
      matchDate: m.match_date ? new Date(m.match_date).toISOString() : "",
      venue: m.venue,
      status: m.status,
      homeScore: m.home_score,
      awayScore: m.away_score,
      round: m.round,
      gameweek: m.gameweek,
      notes: m.notes,
      homeTeamName: m.home_team_name || "Home Team",
      awayTeamName: m.away_team_name || "Away Team",
      homeClubLogo: m.home_club_logo,
      awayClubLogo: m.away_club_logo,
    }));

    res.json({ fixtures });
  } catch (err: any) {
    console.error("Fixtures GET error:", err);
    res.status(500).json({ error: "Failed to fetch fixtures" });
  }
});

// POST /api/competitions
competitionsRouter.post(
  "/",
  authenticate(false),
  requireRole(COMPETITION_ROLES),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, type = "league", seasonId, divisionId, description, rules, registrationDeadline } = req.body;
      if (!name || !seasonId) {
        res.status(400).json({ error: "name and seasonId are required" });
        return;
      }

      const id = req.body.id || `comp-${Date.now()}`;
      const insertRes = await pgDb.query(
        `INSERT INTO competitions (id, name, type, season_id, division_id, description, rules, registration_deadline, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
         RETURNING *`,
        [
          id,
          name,
          type,
          seasonId,
          divisionId || null,
          description || null,
          rules || null,
          registrationDeadline || null,
        ]
      );

      const competition = mapCompetitionRow(insertRes.rows[0]);

      logAudit(req, {
        action: "competition.create",
        entityType: "competition",
        entityId: competition.id,
        after: competition,
      });

      res.status(201).json({ message: "Competition created successfully", competition, ...competition });
    } catch (err: any) {
      console.error("Competition create error:", err);
      res.status(500).json({ error: err.message || "Failed to create competition" });
    }
  }
);

// PUT /api/competitions/:id
competitionsRouter.put(
  "/:id",
  authenticate(false),
  requireRole(COMPETITION_ROLES),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const existingRes = await pgDb.query("SELECT * FROM competitions WHERE id = $1", [id]);
      if (!existingRes.rows[0]) {
        res.status(404).json({ error: "Competition not found" });
        return;
      }
      const existing = mapCompetitionRow(existingRes.rows[0]);

      const { name, type, seasonId, divisionId, description, rules, registrationDeadline, isActive } = req.body;
      const setClauses: string[] = [];
      const values: any[] = [id];
      let idx = 2;

      if (name !== undefined) { setClauses.push(`name = $${idx++}`); values.push(name); }
      if (type !== undefined) { setClauses.push(`type = $${idx++}`); values.push(type); }
      if (seasonId !== undefined) { setClauses.push(`season_id = $${idx++}`); values.push(seasonId); }
      if (divisionId !== undefined) { setClauses.push(`division_id = $${idx++}`); values.push(divisionId); }
      if (description !== undefined) { setClauses.push(`description = $${idx++}`); values.push(description); }
      if (rules !== undefined) { setClauses.push(`rules = $${idx++}`); values.push(rules); }
      if (registrationDeadline !== undefined) { setClauses.push(`registration_deadline = $${idx++}`); values.push(registrationDeadline); }
      if (isActive !== undefined) { setClauses.push(`is_active = $${idx++}`); values.push(Boolean(isActive)); }

      if (setClauses.length === 0) {
        res.json({ message: "No updates provided", competition: existing });
        return;
      }

      const updateRes = await pgDb.query(
        `UPDATE competitions SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`,
        values
      );
      const updated = mapCompetitionRow(updateRes.rows[0]);

      logAudit(req, {
        action: "competition.update",
        entityType: "competition",
        entityId: id,
        before: existing,
        after: updated,
      });

      res.json({ message: "Competition updated successfully", competition: updated });
    } catch (err: any) {
      console.error("Competition update error:", err);
      res.status(500).json({ error: err.message || "Failed to update competition" });
    }
  }
);

// DELETE /api/competitions/:id
competitionsRouter.delete(
  "/:id",
  authenticate(false),
  requireRole(COMPETITION_ROLES),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const existingRes = await pgDb.query("SELECT * FROM competitions WHERE id = $1", [id]);
      if (!existingRes.rows[0]) {
        res.status(404).json({ error: "Competition not found" });
        return;
      }
      const existing = mapCompetitionRow(existingRes.rows[0]);

      await pgDb.query("DELETE FROM competitions WHERE id = $1", [id]);

      logAudit(req, {
        action: "competition.delete",
        entityType: "competition",
        entityId: id,
        before: existing,
      });

      res.json({ message: "Competition deleted successfully" });
    } catch (err: any) {
      console.error("Competition delete error:", err);
      res.status(500).json({ error: err.message || "Failed to delete competition" });
    }
  }
);
