import { Router, Request, Response } from "express";
import { pgDb } from "../db/postgres.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole, REGISTRATION_ROLES } from "../middleware/rbac.js";
import { logAudit } from "../middleware/audit.js";
import { ROLES, Player } from "../types.js";

export const playersRouter = Router();

export async function computePlayerEligibility(player: any) {
  const now = Date.now();

  const discRes = await pgDb.query(
    "SELECT * FROM disciplinary_cases WHERE player_id = $1",
    [player.id]
  );
  const disciplinary = discRes.rows;
  const activeSuspensions = disciplinary.filter(
    (d: any) =>
      (d.status === "open" || d.status === "suspended") &&
      (d.suspension_matches > 0 || (d.suspension_end && new Date(d.suspension_end).getTime() > now))
  );

  const regRes = await pgDb.query(
    "SELECT * FROM player_registrations WHERE player_id = $1",
    [player.id]
  );
  const registrations = regRes.rows;
  const activeReg = registrations.find(
    (r: any) => r.status === "active" && (!r.expiry_date || new Date(r.expiry_date).getTime() > now)
  );

  const docRes = await pgDb.query(
    "SELECT * FROM documents WHERE owner_id = $1 AND document_type = 'medical_certificate' AND status = 'verified'",
    [player.id]
  );
  const hasMedical = docRes.rowCount! > 0;

  const hasNationalId = !!(player.national_id || player.id_document_number || player.nationalId || player.idDocumentNumber);
  const hasBirthPlace = !!(player.birth_place || player.birthPlace || player.address);
  const hasPhoto = !!(player.photo_url || player.photoUrl);

  // Age calculation
  let age = 0;
  const dob = player.date_of_birth || player.dateOfBirth;
  if (dob) {
    const dobDate = new Date(dob);
    const diff = Date.now() - dobDate.getTime();
    age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  }
  let ageCategory = "Senior";
  if (age < 17) ageCategory = "Under-17 (Youth)";
  else if (age < 20) ageCategory = "Under-20";
  else if (age <= 23) ageCategory = "Under-23";

  const nat = (player.nationality || "").toLowerCase();
  const isDomestic = nat.includes("ethiopia");

  const reasons: string[] = [];
  if (player.status === "suspended") reasons.push("Player status is marked Suspended in registry");
  if (player.status === "retired") reasons.push("Player is officially retired");
  if (player.status === "inactive") reasons.push("Player status is currently Inactive");
  if (activeSuspensions.length > 0) {
    activeSuspensions.forEach((s: any) =>
      reasons.push(`Active suspension: ${s.offense} (${s.suspension_matches} match ban)`)
    );
  }
  if (!activeReg) reasons.push("No active season registration license found");
  if (!hasMedical) reasons.push("Medical clearance certificate missing or expired");
  if (!hasNationalId) reasons.push("National ID number not verified on file");

  const checks = {
    identityVerified: hasNationalId && hasBirthPlace && hasPhoto,
    activeLicense: !!activeReg,
    disciplinaryClearance: activeSuspensions.length === 0 && player.status !== "suspended",
    medicalClearance: hasMedical,
    validContract: true,
    ageCategory: `${ageCategory} (${age} years)`,
    quotaStatus: isDomestic ? ("domestic" as const) : ("foreign" as const),
  };

  const totalChecks = 5;
  let passed = 0;
  if (checks.identityVerified) passed++;
  if (checks.activeLicense) passed++;
  if (checks.disciplinaryClearance) passed++;
  if (checks.medicalClearance) passed++;
  if (checks.validContract) passed++;

  const score = Math.round((passed / totalChecks) * 100);
  const overallStatus: "eligible" | "conditional" | "ineligible" =
    reasons.length === 0 ? "eligible" : score >= 60 ? "conditional" : "ineligible";

  const firstName = player.first_name || player.firstName;
  const lastName = player.last_name || player.lastName;

  return {
    playerId: player.id,
    playerName: `${firstName} ${lastName}`,
    isEligible: reasons.length === 0,
    score,
    overallStatus,
    checks,
    details: {
      nationalId: player.national_id || player.id_document_number || player.nationalId || player.idDocumentNumber || "Unregistered",
      birthPlace: player.birth_place || player.birthPlace || "Unspecified",
      licenseNumber: activeReg?.license_number,
      licenseExpiry: activeReg?.expiry_date,
      suspensionsCount: activeSuspensions.length,
      activeBans: activeSuspensions.map((s: any) => s.offense),
    },
    reasons,
  };
}

// Helper to map snake_case row to camelCase
function mapPlayerRow(row: any) {
  return {
    ...row,
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth,
    birthPlace: row.address || row.birth_place || null,
    nationalId: row.id_document_number,
    photoUrl: row.photo_url,
    nationality: row.nationality,
    position: row.position,
    jerseyNumber: row.jersey_number,
    preferredFoot: row.preferred_foot,
    height: row.height,
    weight: row.weight,
    currentClubId: row.current_club_id,
    currentClubName: row.current_club_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    status: row.status,
    idDocumentType: row.id_document_type,
    idDocumentNumber: row.id_document_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/players
playersRouter.get("/", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, position, nationality, clubId, search, eligibility, limit = "100", offset = "0" } = req.query;
    const params: any[] = [];
    const whereClauses: string[] = [];
    let idx = 1;

    if (status) { whereClauses.push(`status = $${idx}::player_status`); params.push(status); idx++; }
    if (position) { whereClauses.push(`LOWER(position) = LOWER($${idx})`); params.push(position); idx++; }
    if (nationality) { whereClauses.push(`LOWER(nationality) = LOWER($${idx})`); params.push(nationality); idx++; }
    if (clubId) { whereClauses.push(`current_club_id = $${idx}`); params.push(clubId); idx++; }
    if (search) {
      whereClauses.push(`(
        LOWER(first_name) LIKE LOWER($${idx}) OR
        LOWER(last_name) LIKE LOWER($${idx}) OR
        LOWER(COALESCE(id_document_number,'')) LIKE LOWER($${idx}) OR
        LOWER(COALESCE(email,'')) LIKE LOWER($${idx}) OR
        LOWER(COALESCE(current_club_name,'')) LIKE LOWER($${idx})
      )`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const query = `SELECT * FROM players ${where} ORDER BY last_name ASC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(parseInt(limit as string, 10));
    params.push(parseInt(offset as string, 10));

    const result = await pgDb.query(query, params);
    const players = result.rows.map(mapPlayerRow);

    // Compute eligibility for each player
    const enrichedPlayers = await Promise.all(
      players.map(async (p: any) => {
        const el = await computePlayerEligibility(p);
        return {
          ...p,
          eligibilityStatus: el.overallStatus,
          isEligible: el.isEligible,
          eligibilityScore: el.score,
          eligibilitySummary: el,
        };
      })
    );

    const finalPlayers = eligibility
      ? enrichedPlayers.filter((p: any) => p.eligibilityStatus === eligibility)
      : enrichedPlayers;

    res.json({
      total: finalPlayers.length,
      items: finalPlayers,
      players: finalPlayers,
    });
  } catch (err) {
    console.error("GET /api/players error:", err);
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

// GET /api/players/stats
playersRouter.get("/stats", authenticate(true), async (_req: Request, res: Response): Promise<void> => {
  try {
    const statsRes = await pgDb.query(`
      SELECT
        COUNT(*)::int AS "totalPlayers",
        COUNT(*) FILTER (WHERE status = 'active')::int AS "activePlayers",
        COUNT(*) FILTER (WHERE status = 'suspended')::int AS "suspendedPlayers",
        COUNT(*) FILTER (WHERE status = 'retired')::int AS "retiredPlayers",
        COUNT(*) FILTER (WHERE status = 'inactive')::int AS "inactivePlayers"
      FROM players
    `);
    res.json(statsRes.rows[0]);
  } catch (err) {
    console.error("GET /api/players/stats error:", err);
    res.status(500).json({ error: "Failed to fetch player stats" });
  }
});

// GET /api/players/:id/eligibility
playersRouter.get("/:id/eligibility", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pgDb.query("SELECT * FROM players WHERE id = $1", [req.params.id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Player not found" });
      return;
    }
    const player = mapPlayerRow(result.rows[0]);
    const eligibility = await computePlayerEligibility(player);
    res.json({ eligibility, player });
  } catch (err) {
    console.error("GET /api/players/:id/eligibility error:", err);
    res.status(500).json({ error: "Failed to fetch eligibility" });
  }
});

// GET /api/players/:id
playersRouter.get("/:id", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pgDb.query("SELECT * FROM players WHERE id = $1", [req.params.id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Player not found" });
      return;
    }
    const player = mapPlayerRow(result.rows[0]);

    const regsRes = await pgDb.query("SELECT * FROM player_registrations WHERE player_id = $1", [player.id]);
    const transfersRes = await pgDb.query("SELECT * FROM transfers WHERE player_id = $1", [player.id]);
    const discRes = await pgDb.query("SELECT * FROM disciplinary_cases WHERE player_id = $1", [player.id]);
    const cardsRes = await pgDb.query("SELECT * FROM card_accumulations WHERE player_id = $1", [player.id]);
    const docsRes = await pgDb.query("SELECT * FROM documents WHERE owner_id = $1", [player.id]);
    const eligibility = await computePlayerEligibility(player);

    res.json({
      player,
      eligibility,
      registrations: regsRes.rows,
      contracts: [],
      transfers: transfersRes.rows,
      disciplinary: discRes.rows,
      cards: cardsRes.rows,
      documents: docsRes.rows,
    });
  } catch (err) {
    console.error("GET /api/players/:id error:", err);
    res.status(500).json({ error: "Failed to fetch player" });
  }
});

// POST /api/players
playersRouter.post(
  "/",
  authenticate(false),
  requireRole(REGISTRATION_ROLES),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        firstName,
        lastName,
        dateOfBirth,
        birthPlace,
        nationalId,
        photoUrl,
        gender = "male",
        nationality = "Ethiopia",
        position = "Forward",
        secondaryPosition,
        jerseyNumber,
        preferredFoot = "right",
        height,
        weight,
        currentClubId,
        currentClubName,
        medicalClearanceDate,
        bloodGroup,
        phone,
        email,
        address,
        registerLicense = true,
      } = req.body;

      if (!firstName || !lastName || !dateOfBirth) {
        res.status(400).json({ error: "firstName, lastName, and dateOfBirth are required" });
        return;
      }

      const year = new Date().getFullYear();
      const playerId = `ply-${Date.now()}`;
      const docNumber = nationalId || `NID-${Math.floor(1000000 + Math.random() * 9000000)}`;

      let finalClubName = currentClubName;
      if (currentClubId && !finalClubName) {
        const clubRes = await pgDb.query("SELECT name FROM clubs WHERE id = $1", [currentClubId]);
        finalClubName = clubRes.rows[0]?.name;
      }

      const insertQuery = `
        INSERT INTO players (id, first_name, last_name, date_of_birth, nationality, position, photo_url, phone, email,
          id_document_type, id_document_number, status, address, height, weight, preferred_foot,
          current_club_id, current_club_name, jersey_number, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
        RETURNING *`;
      const values = [
        playerId,
        firstName,
        lastName,
        dateOfBirth,
        nationality,
        position,
        photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        phone || null,
        email || null,
        "national_id",
        docNumber,
        "active",
        address || birthPlace || "Unspecified",
        height ? Number(height) : null,
        weight ? Number(weight) : null,
        preferredFoot,
        currentClubId || null,
        finalClubName || null,
        jerseyNumber ? Number(jerseyNumber) : 10,
      ];
      const result = await pgDb.query(insertQuery, values);
      const playerRow = result.rows[0];
      const player = mapPlayerRow(playerRow);

      // Auto-create player license/registration for active season
      if (currentClubId && registerLicense) {
        const seasonRes = await pgDb.query("SELECT id FROM seasons WHERE is_active = TRUE LIMIT 1");
        const seasonId = seasonRes.rows[0]?.id || "season-2025-2026";
        const licenseNumber = `LIC-${year}-${Math.floor(10000 + Math.random() * 90000)}`;
        const regId = `reg-${Date.now()}`;
        await pgDb.query(
          `INSERT INTO player_registrations (id, player_id, club_id, season_id, status, license_number, license_expiry,
            registration_date, expiry_date, squad_number, notes, reviewed_by, reviewed_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(), NOW())`,
          [
            regId, playerId, currentClubId, seasonId, "active", licenseNumber,
            `${year + 1}-06-30`, new Date().toISOString().split("T")[0],
            `${year + 1}-06-30`, jerseyNumber ? Number(jerseyNumber) : 10,
            "Official registration issued upon player enrollment",
            req.user?.id || null,
          ]
        );
      }

      // Attach National ID Document record
      if (nationalId) {
        const docId = `doc-${Date.now()}`;
        await pgDb.query(
          `INSERT INTO documents (id, file_name, file_type, file_size, document_type, owner_type, owner_id, url, status, verified_by, verified_at, expiry_date, uploaded_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11, $12, NOW())`,
          [
            docId,
            `National_ID_${lastName}_${firstName}.pdf`,
            "application/pdf",
            245000,
            "national_id",
            "player",
            playerId,
            photoUrl || "/uploads/national-id.pdf",
            "verified",
            req.user?.id || null,
            `${year + 5}-12-31`,
            req.user?.id || "system",
          ]
        );
      }

      logAudit(req, {
        action: "player.register",
        entityType: "player",
        entityId: player.id,
        after: player,
      });

      const eligibility = await computePlayerEligibility(player);

      res.status(201).json({
        message: "Player registered into federation system successfully",
        player: { ...player, eligibilityStatus: eligibility.overallStatus, eligibility },
        ...player,
      });
    } catch (err) {
      console.error("POST /api/players error:", err);
      res.status(500).json({ error: "Failed to register player" });
    }
  }
);

// PUT /api/players/:id
playersRouter.put(
  "/:id",
  authenticate(false),
  requireRole(REGISTRATION_ROLES),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const existingRes = await pgDb.query("SELECT * FROM players WHERE id = $1", [id]);
      if (existingRes.rowCount === 0) {
        res.status(404).json({ error: "Player not found" });
        return;
      }
      const existing = mapPlayerRow(existingRes.rows[0]);

      // Build dynamic UPDATE
      const allowedFields: Record<string, string> = {
        firstName: "first_name", lastName: "last_name", dateOfBirth: "date_of_birth",
        nationality: "nationality", position: "position", photoUrl: "photo_url",
        phone: "phone", email: "email", address: "address", height: "height",
        weight: "weight", preferredFoot: "preferred_foot", currentClubId: "current_club_id",
        currentClubName: "current_club_name", jerseyNumber: "jersey_number",
        status: "status", idDocumentType: "id_document_type", idDocumentNumber: "id_document_number",
      };
      const fields: string[] = ["updated_at = NOW()"];
      const values: any[] = [];
      let idx = 1;
      for (const [camel, snake] of Object.entries(allowedFields)) {
        if (req.body[camel] !== undefined) {
          fields.push(`${snake} = $${idx}`);
          values.push(req.body[camel]);
          idx++;
        }
      }
      values.push(id);
      const updateQuery = `UPDATE players SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`;
      const updatedRes = await pgDb.query(updateQuery, values);
      const updated = mapPlayerRow(updatedRes.rows[0]);

      logAudit(req, {
        action: "player.update",
        entityType: "player",
        entityId: id as string,
        before: existing,
        after: updated,
      });

      const eligibility = await computePlayerEligibility(updated);
      res.json({
        message: "Player updated successfully",
        player: { ...updated, eligibility },
      });
    } catch (err) {
      console.error("PUT /api/players/:id error:", err);
      res.status(500).json({ error: "Failed to update player" });
    }
  }
);

// DELETE /api/players/:id
playersRouter.delete(
  "/:id",
  authenticate(false),
  requireRole([ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const existingRes = await pgDb.query("SELECT * FROM players WHERE id = $1", [id]);
      if (existingRes.rowCount === 0) {
        res.status(404).json({ error: "Player not found" });
        return;
      }
      await pgDb.query("DELETE FROM players WHERE id = $1", [id]);

      logAudit(req, {
        action: "player.delete",
        entityType: "player",
        entityId: id as string,
        before: existingRes.rows[0],
      });

      res.json({ message: "Player removed from registry" });
    } catch (err) {
      console.error("DELETE /api/players/:id error:", err);
      res.status(500).json({ error: "Failed to delete player" });
    }
  }
);
