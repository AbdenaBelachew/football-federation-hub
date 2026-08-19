import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// ─── RBAC Roles ───────────────────────────────────────────────────
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  FEDERATION_ADMIN: "federation_admin",
  COMPETITION_ADMIN: "competition_admin",
  REGISTRATION_OFFICER: "registration_officer",
  TRANSFER_OFFICER: "transfer_officer",
  CLUB_ADMIN: "club_admin",
  REFEREE: "referee",
  DISCIPLINARY_OFFICER: "disciplinary_officer",
  PLAYER: "player",
  PUBLIC: "public",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.SUPER_ADMIN),
  v.literal(ROLES.FEDERATION_ADMIN),
  v.literal(ROLES.COMPETITION_ADMIN),
  v.literal(ROLES.REGISTRATION_OFFICER),
  v.literal(ROLES.TRANSFER_OFFICER),
  v.literal(ROLES.CLUB_ADMIN),
  v.literal(ROLES.REFEREE),
  v.literal(ROLES.DISCIPLINARY_OFFICER),
  v.literal(ROLES.PLAYER),
  v.literal(ROLES.PUBLIC),
);
export type Role = Infer<typeof roleValidator>;

// ─── Status Validators ────────────────────────────────────────────
export const playerStatusValidator = v.union(
  v.literal("active"),
  v.literal("inactive"),
  v.literal("suspended"),
  v.literal("retired"),
);

export const registrationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("expired"),
  v.literal("transferred"),
  v.literal("rejected"),
  v.literal("cancelled"),
);

export const clubStatusValidator = v.union(
  v.literal("active"),
  v.literal("inactive"),
  v.literal("suspended"),
  v.literal("pending"),
);

export const transferStatusValidator = v.union(
  v.literal("requested"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("cancelled"),
  v.literal("completed"),
);

export const documentTypeValidator = v.union(
  v.literal("passport"),
  v.literal("national_id"),
  v.literal("birth_certificate"),
  v.literal("medical_certificate"),
  v.literal("transfer_agreement"),
  v.literal("license"),
  v.literal("photo"),
  v.literal("other"),
);

export const documentStatusValidator = v.union(
  v.literal("pending"),
  v.literal("verified"),
  v.literal("rejected"),
  v.literal("expired"),
);

// ─── Schema ───────────────────────────────────────────────────────
const schema = defineSchema(
  {
    // Auth tables (do not modify)
    ...authTables,

    // Users — extends auth user with federation role & club association
    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(roleValidator),
      clubId: v.optional(v.id("clubs")),
      phone: v.optional(v.string()),
      isActive: v.optional(v.boolean()),
    }).index("email", ["email"])
      .index("by_role", ["role"]),

    // ─── Players ───
    players: defineTable({
      firstName: v.string(),
      lastName: v.string(),
      dateOfBirth: v.string(),
      nationality: v.string(),
      position: v.optional(v.string()),
      photoUrl: v.optional(v.string()),
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
      idDocumentType: v.optional(v.string()),
      idDocumentNumber: v.optional(v.string()),
      status: playerStatusValidator,
      address: v.optional(v.string()),
      height: v.optional(v.number()),
      weight: v.optional(v.number()),
      preferredFoot: v.optional(v.union(v.literal("left"), v.literal("right"), v.literal("both"))),
      createdAt: v.number(),
      updatedAt: v.number(),
      _creationTime: v.number(),
    })
      .index("by_name", ["lastName", "firstName"])
      .index("by_status", ["status"])
      .index("by_nationality", ["nationality"]),

    // ─── Clubs ───
    clubs: defineTable({
      name: v.string(),
      shortName: v.optional(v.string()),
      foundedYear: v.optional(v.number()),
      city: v.optional(v.string()),
      country: v.string(),
      logoUrl: v.optional(v.string()),
      contactEmail: v.optional(v.string()),
      contactPhone: v.optional(v.string()),
      address: v.optional(v.string()),
      registrationNumber: v.optional(v.string()),
      status: clubStatusValidator,
      president: v.optional(v.string()),
      secretary: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_name", ["name"])
      .index("by_status", ["status"])
      .index("by_country", ["country"]),

    // ─── Seasons ───
    seasons: defineTable({
      name: v.string(),
      startDate: v.string(),
      endDate: v.string(),
      isActive: v.boolean(),
      description: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_active", ["isActive"]),

    // ─── Divisions ───
    divisions: defineTable({
      name: v.string(),
      tier: v.number(),
      seasonId: v.id("seasons"),
      description: v.optional(v.string()),
      maxClubs: v.optional(v.number()),
      promotionSlots: v.optional(v.number()),
      relegationSlots: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_season", ["seasonId"])
      .index("by_tier", ["tier"]),

    // ─── Competitions ───
    competitions: defineTable({
      name: v.string(),
      type: v.union(v.literal("league"), v.literal("cup"), v.literal("youth"), v.literal("friendly")),
      seasonId: v.id("seasons"),
      divisionId: v.optional(v.id("divisions")),
      description: v.optional(v.string()),
      rules: v.optional(v.string()),
      registrationDeadline: v.optional(v.string()),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_season", ["seasonId"])
      .index("by_type", ["type"]),

    // ─── Teams ───
    teams: defineTable({
      name: v.string(),
      clubId: v.id("clubs"),
      competitionId: v.id("competitions"),
      seasonId: v.id("seasons"),
      divisionId: v.optional(v.id("divisions")),
      squadNumber: v.number(),
      coachId: v.optional(v.id("users")),
      status: v.union(v.literal("active"), v.literal("inactive")),
      createdAt: v.number(),
    })
      .index("by_club", ["clubId"])
      .index("by_competition", ["competitionId"])
      .index("by_season", ["seasonId"]),

    // ─── Player Registrations ───
    playerRegistrations: defineTable({
      playerId: v.id("players"),
      clubId: v.id("clubs"),
      teamId: v.id("teams"),
      competitionId: v.id("competitions"),
      seasonId: v.id("seasons"),
      status: registrationStatusValidator,
      licenseNumber: v.optional(v.string()),
      licenseExpiry: v.optional(v.string()),
      registrationDate: v.string(),
      expiryDate: v.optional(v.string()),
      squadNumber: v.optional(v.number()),
      notes: v.optional(v.string()),
      reviewedBy: v.optional(v.id("users")),
      reviewedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_player", ["playerId"])
      .index("by_club", ["clubId"])
      .index("by_season", ["seasonId"])
      .index("by_status", ["status"])
      .index("by_competition", ["competitionId"])
      .index("by_player_season", ["playerId", "seasonId"]),

    // ─── Transfers ───
    transfers: defineTable({
      playerId: v.id("players"),
      fromClubId: v.id("clubs"),
      toClubId: v.id("clubs"),
      fromRegistrationId: v.id("playerRegistrations"),
      toRegistrationId: v.optional(v.id("playerRegistrations")),
      status: transferStatusValidator,
      transferDate: v.optional(v.string()),
      reason: v.optional(v.string()),
      reviewedBy: v.optional(v.id("users")),
      reviewedAt: v.optional(v.number()),
      reviewNotes: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_player", ["playerId"])
      .index("by_status", ["status"])
      .index("from_club", ["fromClubId"])
      .index("to_club", ["toClubId"]),

    // ─── Documents ───
    documents: defineTable({
      fileName: v.string(),
      fileType: v.string(),
      fileSize: v.number(),
      documentType: documentTypeValidator,
      ownerType: v.union(v.literal("player"), v.literal("club"), v.literal("registration")),
      ownerId: v.string(),
      url: v.optional(v.string()),
      status: documentStatusValidator,
      verifiedBy: v.optional(v.id("users")),
      verifiedAt: v.optional(v.number()),
      expiryDate: v.optional(v.string()),
      uploadedBy: v.id("users"),
      createdAt: v.number(),
    })
      .index("by_owner", ["ownerType", "ownerId"])
      .index("by_status", ["status"])
      .index("by_type", ["documentType"]),

    // ─── Audit Log ───
    auditLog: defineTable({
      actorId: v.id("users"),
      actorName: v.optional(v.string()),
      action: v.string(),
      entityType: v.string(),
      entityId: v.string(),
      before: v.optional(v.any()),
      after: v.optional(v.any()),
      metadata: v.optional(v.any()),
      timestamp: v.number(),
    })
      .index("by_entity", ["entityType", "entityId"])
      .index("by_actor", ["actorId"])
      .index("by_timestamp", ["timestamp"])
      .index("by_action", ["action"]),

    // ─── Match Fixtures ───
    matches: defineTable({
      homeTeamId: v.id("teams"),
      awayTeamId: v.id("teams"),
      competitionId: v.id("competitions"),
      seasonId: v.id("seasons"),
      matchDate: v.string(),
      venue: v.optional(v.string()),
      status: v.union(
        v.literal("scheduled"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("postponed"),
        v.literal("cancelled"),
      ),
      homeScore: v.optional(v.number()),
      awayScore: v.optional(v.number()),
      refereeId: v.optional(v.id("users")),
      notes: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_competition", ["competitionId"])
      .index("by_season", ["seasonId"])
      .index("by_date", ["matchDate"]),

    // ─── Match Events (goals, cards, substitutions) ───
    matchEvents: defineTable({
      matchId: v.id("matches"),
      eventType: v.union(
        v.literal("goal"),
        v.literal("own_goal"),
        v.literal("yellow_card"),
        v.literal("red_card"),
        v.literal("second_yellow"),
        v.literal("substitution"),
        v.literal("penalty_scored"),
        v.literal("penalty_missed"),
      ),
      playerId: v.optional(v.id("players")),
      assistedByPlayerId: v.optional(v.id("players")),
      teamId: v.optional(v.id("teams")),
      minute: v.optional(v.number()),
      description: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_match", ["matchId"])
      .index("by_player", ["playerId"]),

    // ─── Disciplinary Cases ───
    disciplinaryCases: defineTable({
      playerId: v.id("players"),
      matchId: v.optional(v.id("matches")),
      clubId: v.optional(v.id("clubs")),
      competitionId: v.optional(v.id("competitions")),
      offense: v.string(),
      cardType: v.union(v.literal("yellow"), v.literal("red"), v.literal("second_yellow")),
      matchMinute: v.optional(v.number()),
      suspensionMatches: v.number(),
      suspensionStart: v.optional(v.string()),
      suspensionEnd: v.optional(v.string()),
      fine: v.optional(v.number()),
      status: v.union(
        v.literal("open"),
        v.literal("suspended"),
        v.literal("served"),
        v.literal("appealed"),
        v.literal("dismissed"),
      ),
      notes: v.optional(v.string()),
      reviewedBy: v.optional(v.id("users")),
      reviewedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_player", ["playerId"])
      .index("by_status", ["status"])
      .index("by_club", ["clubId"]),

    // ─── Yellow Card Accumulation Tracking ───
    cardAccumulations: defineTable({
      playerId: v.id("players"),
      competitionId: v.id("competitions"),
      seasonId: v.id("seasons"),
      yellowCards: v.number(),
      redCards: v.number(),
      totalSuspensionMatches: v.number(),
      updatedAt: v.number(),
    })
      .index("by_player", ["playerId"])
      .index("by_player_competition", ["playerId", "competitionId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
