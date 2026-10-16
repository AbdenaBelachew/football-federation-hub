import { Router, Request, Response } from "express";
import { pgDb } from "../db/postgres.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole, MATCH_OFFICER_ROLES } from "../middleware/rbac.js";
import { logAudit } from "../middleware/audit.js";

export const matchesRouter = Router();

// GET /api/matches
matchesRouter.get("/", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const { competitionId, seasonId, status, teamId, limit = "50", offset = "0" } = req.query;
    const params: any[] = [];
    const whereClauses: string[] = [];
    let idx = 1;
    if (competitionId) { whereClauses.push(`m.competition_id = $${idx}`); params.push(competitionId); idx++; }
    if (seasonId) { whereClauses.push(`m.season_id = $${idx}`); params.push(seasonId); idx++; }
    if (status) { whereClauses.push(`m.status = $${idx}`); params.push(status); idx++; }
    if (teamId) { whereClauses.push(`(m.home_team_id = $${idx} OR m.away_team_id = $${idx})`); params.push(teamId); idx++; }
    const where = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const query = `
      SELECT m.*,
        ht.name AS home_team_name, at.name AS away_team_name,
        hc.logo_url AS home_club_logo, ac.logo_url AS away_club_logo,
        comp.name AS competition_name
      FROM matches m
      LEFT JOIN teams ht ON ht.id = m.home_team_id
      LEFT JOIN teams at ON at.id = m.away_team_id
      LEFT JOIN clubs hc ON hc.id = ht.club_id
      LEFT JOIN clubs ac ON ac.id = at.club_id
      LEFT JOIN competitions comp ON comp.id = m.competition_id
      ${where}
      ORDER BY m.match_date DESC
      LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(parseInt(limit as string, 10));
    params.push(parseInt(offset as string, 10));

    const result = await pgDb.query(query, params);
    // Map snake_case columns to camelCase for frontend compatibility
    const matches = result.rows.map((row: any) => ({
      ...row,
      id: row.id,
      homeTeamId: row.home_team_id,
      awayTeamId: row.away_team_id,
      competitionId: row.competition_id,
      seasonId: row.season_id,
      matchDate: row.match_date,
      homeScore: row.home_score,
      awayScore: row.away_score,
      refereeId: row.referee_id,
      refereeName: row.referee_name,
      homeTeamName: row.home_team_name || "Home Team",
      awayTeamName: row.away_team_name || "Away Team",
      homeClubLogo: row.home_club_logo,
      awayClubLogo: row.away_club_logo,
      competitionName: row.competition_name || "Competition",
      createdAt: row.created_at,
    }));
    res.json({ matches, items: matches, total: matches.length });
  } catch (err) {
    console.error("GET /api/matches error:", err);
    res.status(500).json({ error: "Failed to fetch matches" });
  }
});

// GET /api/matches/stats
matchesRouter.get("/stats", authenticate(true), async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pgDb.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
        COUNT(*) FILTER (WHERE status = 'scheduled')::int AS scheduled,
        COUNT(*) FILTER (WHERE status = 'in_progress')::int AS "inProgress",
        COUNT(*) FILTER (WHERE status = 'postponed')::int AS postponed
      FROM matches
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /api/matches/stats error:", err);
    res.status(500).json({ error: "Failed to fetch match stats" });
  }
});

// GET /api/matches/:id
matchesRouter.get("/:id", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const matchRes = await pgDb.query(`
      SELECT m.*,
        ht.name AS home_team_name, at.name AS away_team_name,
        hc.logo_url AS home_club_logo, ac.logo_url AS away_club_logo,
        comp.name AS competition_name
      FROM matches m
      LEFT JOIN teams ht ON ht.id = m.home_team_id
      LEFT JOIN teams at ON at.id = m.away_team_id
      LEFT JOIN clubs hc ON hc.id = ht.club_id
      LEFT JOIN clubs ac ON ac.id = at.club_id
      LEFT JOIN competitions comp ON comp.id = m.competition_id
      WHERE m.id = $1
    `, [id]);

    if (matchRes.rowCount === 0) {
      res.status(404).json({ error: "Match not found" });
      return;
    }
    const row = matchRes.rows[0];
    const match = {
      ...row,
      homeTeamId: row.home_team_id,
      awayTeamId: row.away_team_id,
      competitionId: row.competition_id,
      seasonId: row.season_id,
      matchDate: row.match_date,
      homeScore: row.home_score,
      awayScore: row.away_score,
      refereeId: row.referee_id,
      refereeName: row.referee_name,
      homeTeamName: row.home_team_name,
      awayTeamName: row.away_team_name,
      homeClubLogo: row.home_club_logo,
      awayClubLogo: row.away_club_logo,
      competitionName: row.competition_name,
    };

    const eventsRes = await pgDb.query(
      "SELECT * FROM match_events WHERE match_id = $1 ORDER BY minute ASC",
      [id]
    );
    const events = eventsRes.rows.map((e: any) => ({
      ...e,
      matchId: e.match_id,
      eventType: e.event_type,
      playerId: e.player_id,
      playerName: e.player_name,
      assistedByPlayerId: e.assisted_by_player_id,
      assistedByPlayerName: e.assisted_by_player_name,
      teamId: e.team_id,
      teamName: e.team_name,
    }));

    res.json({ match, events });
  } catch (err) {
    console.error("GET /api/matches/:id error:", err);
    res.status(500).json({ error: "Failed to fetch match" });
  }
});

// POST /api/matches (Schedule fixture)
matchesRouter.post(
  "/",
  authenticate(false),
  requireRole(MATCH_OFFICER_ROLES),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { homeTeamId, awayTeamId, competitionId, seasonId, matchDate, venue, refereeId, round, notes } = req.body;
      if (!homeTeamId || !awayTeamId || !competitionId || !seasonId || !matchDate) {
        res.status(400).json({ error: "homeTeamId, awayTeamId, competitionId, seasonId, and matchDate are required" });
        return;
      }
      if (homeTeamId === awayTeamId) {
        res.status(400).json({ error: "Home and Away teams must be different" });
        return;
      }

      const refereeResult = refereeId ? await pgDb.query("SELECT * FROM users WHERE id = $1", [refereeId]) : null;
      const referee = refereeResult?.rows?.[0] ?? null;

      const matchId = `match-${Date.now()}`;
      const insertQuery = `
        INSERT INTO matches (id, home_team_id, away_team_id, competition_id, season_id, match_date, venue, status, referee_id, referee_name, round, notes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        RETURNING *`;
      const values = [
        matchId,
        homeTeamId,
        awayTeamId,
        competitionId,
        seasonId,
        matchDate,
        venue,
        "scheduled",
        refereeId || null,
        referee?.name || null,
        round,
        notes,
      ];
      const result = await pgDb.query(insertQuery, values);
      const match = result.rows[0];

      logAudit(req, {
        action: "match.create",
        entityType: "match",
        entityId: match.id,
        after: match,
      });

      res.status(201).json({ message: "Match scheduled successfully", match });
    } catch (err) {
      console.error("POST /api/matches error:", err);
      res.status(500).json({ error: "Failed to create match" });
    }
  }
);

// PATCH /api/matches/:id/score (Update match score and optionally status)
matchesRouter.patch(
  "/:id/score",
  authenticate(false),
  requireRole(MATCH_OFFICER_ROLES),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { homeScore, awayScore, status } = req.body as { homeScore?: number; awayScore?: number; status?: string };
      const existingRes = await pgDb.query("SELECT * FROM matches WHERE id = $1", [id]);
      if (existingRes.rowCount === 0) {
        res.status(404).json({ error: "Match not found" });
        return;
      }
      const existing = existingRes.rows[0];
      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;
      if (homeScore !== undefined) { fields.push(`home_score = $${idx}`); values.push(homeScore); idx++; }
      if (awayScore !== undefined) { fields.push(`away_score = $${idx}`); values.push(awayScore); idx++; }
      if (status) { fields.push(`status = $${idx}`); values.push(status); idx++; }
      if (fields.length === 0) {
        res.status(400).json({ error: "No fields to update" });
        return;
      }
      fields.push(`updated_at = NOW()`);
      values.push(id);
      const updateQuery = `UPDATE matches SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`;
      const updatedRes = await pgDb.query(updateQuery, values);
      const updated = updatedRes.rows[0];
      logAudit(req, {
        action: "match.updateScore",
        entityType: "match",
        entityId: id as string,
        before: existing,
        after: updated,
      });
      res.json({ message: "Match score updated", match: updated });
    } catch (err) {
      console.error("PATCH /api/matches/:id/score error:", err);
      res.status(500).json({ error: "Failed to update match score" });
    }
  }
);

// POST /api/matches/:id/events (Record match event: goals, cards, subs)
matchesRouter.post(
  "/:id/events",
  authenticate(false),
  requireRole(MATCH_OFFICER_ROLES),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const matchRes = await pgDb.query("SELECT * FROM matches WHERE id = $1", [id]);
      if (matchRes.rowCount === 0) {
        res.status(404).json({ error: "Match not found" });
        return;
      }
      const match = matchRes.rows[0];

      const { eventType, playerId, assistedByPlayerId, teamId, minute, description } = req.body;
      if (!eventType) {
        res.status(400).json({ error: "eventType is required" });
        return;
      }

      const playerRes = playerId ? await pgDb.query("SELECT * FROM players WHERE id = $1", [playerId]) : null;
      const player = playerRes?.rows?.[0] ?? null;
      const assistedRes = assistedByPlayerId ? await pgDb.query("SELECT * FROM players WHERE id = $1", [assistedByPlayerId]) : null;
      const assisted = assistedRes?.rows?.[0] ?? null;
      const teamRes = teamId ? await pgDb.query("SELECT * FROM teams WHERE id = $1", [teamId]) : null;
      const team = teamRes?.rows?.[0] ?? null;

      const eventId = `evt-${Date.now()}`;
      const eventInsert = `
        INSERT INTO match_events (id, match_id, minute, event_type, team_id, team_name, player_id, player_name, assisted_by_player_id, assisted_by_player_name, description, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        RETURNING *`;
      const eventValues = [
        eventId,
        id,
        minute ? Number(minute) : 0,
        eventType,
        teamId || null,
        team?.name || null,
        playerId || null,
        player ? `${player.first_name} ${player.last_name}` : null,
        assistedByPlayerId || null,
        assisted ? `${assisted.first_name} ${assisted.last_name}` : null,
        description || null,
      ];
      const eventResult = await pgDb.query(eventInsert, eventValues);
      const event = eventResult.rows[0];

      // Auto-update match score if event is a goal
      if (eventType === "goal" || eventType === "penalty_scored") {
        const scoreField = teamId === match.home_team_id ? "home_score" : "away_score";
        await pgDb.query(
          `UPDATE matches SET ${scoreField} = ${scoreField} + 1, status = CASE WHEN status = 'scheduled' THEN 'in_progress'::match_status ELSE status END, updated_at = NOW() WHERE id = $1`,
          [id]
        );
      }

      // Auto-track cards in card_accumulations & disciplinary_cases
      if (eventType === "yellow_card" || eventType === "red_card" || eventType === "second_yellow") {
        if (playerId) {
          // Find or create card accumulation
          const accRes = await pgDb.query(
            "SELECT * FROM card_accumulations WHERE player_id = $1 AND competition_id = $2",
            [playerId, match.competition_id]
          );
          let acc = accRes.rows[0];
          if (!acc) {
            const accId = `card-acc-${Date.now()}`;
            const accInsert = await pgDb.query(
              `INSERT INTO card_accumulations (id, player_id, player_name, competition_id, season_id, yellow_cards, red_cards, total_suspension_matches, updated_at)
               VALUES ($1, $2, $3, $4, $5, 0, 0, 0, NOW()) RETURNING *`,
              [accId, playerId, player ? `${player.first_name} ${player.last_name}` : null, match.competition_id, match.season_id]
            );
            acc = accInsert.rows[0];
          }

          const isYellow = eventType === "yellow_card";
          const isRed = eventType === "red_card" || eventType === "second_yellow";
          const newYellows = isYellow ? acc.yellow_cards + 1 : acc.yellow_cards;
          const newReds = isRed ? acc.red_cards + 1 : acc.red_cards;
          const suspensionMatches = isRed ? 1 : Math.floor(newYellows / 3);

          await pgDb.query(
            `UPDATE card_accumulations SET yellow_cards = $1, red_cards = $2, total_suspension_matches = $3, updated_at = NOW() WHERE id = $4`,
            [newYellows, newReds, suspensionMatches, acc.id]
          );

          // Create a disciplinary case if red card or 3 yellows
          if (isRed || newYellows % 3 === 0) {
            const discId = `disc-${Date.now()}`;
            await pgDb.query(
              `INSERT INTO disciplinary_cases (id, player_id, player_name, competition_id, match_id, offense, card_type, match_minute, suspension_matches, fine, status, notes, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
              [
                discId,
                playerId,
                player ? `${player.first_name} ${player.last_name}` : null,
                match.competition_id,
                match.id,
                isRed ? `Match red card (${eventType})` : `Accumulation of ${newYellows} yellow cards`,
                isYellow ? "yellow" : "red",
                minute ? Number(minute) : null,
                Math.max(1, suspensionMatches),
                isRed ? 10000 : 5000,
                "open",
                description || "Automatically logged from match event",
              ]
            );
          }
        }
      }

      res.status(201).json({ message: "Match event recorded", event });
    } catch (err) {
      console.error("POST /api/matches/:id/events error:", err);
      res.status(500).json({ error: "Failed to record match event" });
    }
  }
);
