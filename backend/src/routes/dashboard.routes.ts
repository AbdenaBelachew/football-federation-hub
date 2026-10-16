import { Router, Request, Response } from "express";
import { pgDb } from "../db/postgres.js";
import { authenticate } from "../middleware/auth.js";

export const dashboardRouter = Router();

// GET /api/dashboard/stats
dashboardRouter.get("/stats", authenticate(true), async (_req: Request, res: Response): Promise<void> => {
  try {
    const [clubsRes, playersRes, compsRes, matchesRes, regsRes, trfRes, discRes, scorersRes, auditRes] = await Promise.all([
      pgDb.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'active')::int AS active FROM clubs`),
      pgDb.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'active')::int AS active FROM players`),
      pgDb.query(`SELECT COUNT(*) FILTER (WHERE is_active = TRUE)::int AS active FROM competitions`),
      pgDb.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'completed')::int AS completed, COUNT(*) FILTER (WHERE status = 'scheduled')::int AS scheduled FROM matches`),
      pgDb.query(`SELECT COUNT(*) FILTER (WHERE status = 'pending')::int AS pending FROM player_registrations`),
      pgDb.query(`SELECT COUNT(*) FILTER (WHERE status = 'requested')::int AS pending FROM transfers`),
      pgDb.query(`SELECT COUNT(*) FILTER (WHERE status = 'open')::int AS open FROM disciplinary_cases`),
      pgDb.query(`
        SELECT me.player_id, me.player_name, p.current_club_name AS club_name, COUNT(*)::int AS goals
        FROM match_events me
        LEFT JOIN players p ON p.id = me.player_id
        WHERE me.event_type IN ('goal', 'penalty_scored') AND me.player_id IS NOT NULL
        GROUP BY me.player_id, me.player_name, p.current_club_name
        ORDER BY goals DESC LIMIT 5
      `),
      pgDb.query(`SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 10`),
    ]);

    const clubs = clubsRes.rows[0];
    const players = playersRes.rows[0];
    const comps = compsRes.rows[0];
    const matches = matchesRes.rows[0];
    const regs = regsRes.rows[0];
    const trf = trfRes.rows[0];
    const disc = discRes.rows[0];

    res.json({
      kpis: {
        totalClubs: clubs.total,
        activeClubs: clubs.active,
        totalPlayers: players.total,
        activePlayers: players.active,
        activeCompetitions: comps.active,
        totalMatches: matches.total,
        completedMatches: matches.completed,
        scheduledMatches: matches.scheduled,
        pendingRegistrations: regs.pending,
        pendingTransfers: trf.pending,
        openDisciplinaryCases: disc.open,
      },
      topScorers: scorersRes.rows.map((s: any) => ({
        playerId: s.player_id,
        name: s.player_name,
        clubName: s.club_name,
        goals: s.goals,
      })),
      recentActivity: auditRes.rows,
    });
  } catch (err) {
    console.error("GET /api/dashboard/stats error:", err);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});
