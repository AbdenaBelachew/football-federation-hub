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

export type Role = typeof ROLES[keyof typeof ROLES];

export type PlayerStatus = "active" | "inactive" | "suspended" | "retired";
export type RegistrationStatus = "pending" | "active" | "expired" | "transferred" | "rejected" | "cancelled";
export type ClubStatus = "active" | "inactive" | "suspended" | "pending";
export type TransferStatus = "requested" | "approved" | "rejected" | "cancelled" | "completed";
export type DocumentType = "passport" | "national_id" | "birth_certificate" | "medical_certificate" | "transfer_agreement" | "license" | "photo" | "other";
export type DocumentStatus = "pending" | "verified" | "rejected" | "expired";
export type CompetitionType = "league" | "cup" | "youth" | "friendly";
export type MatchStatus = "scheduled" | "in_progress" | "completed" | "postponed" | "cancelled";
export type MatchEventType = "goal" | "own_goal" | "yellow_card" | "red_card" | "second_yellow" | "substitution" | "penalty_scored" | "penalty_missed";
export type DisciplinaryStatus = "open" | "suspended" | "served" | "appealed" | "dismissed";
export type CardType = "yellow" | "red" | "second_yellow";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  clubId?: string;
  phone?: string;
  isActive: boolean;
  image?: string;
  createdAt: number;
}

export interface Club {
  id: string;
  name: string;
  shortName?: string;
  foundedYear?: number;
  city?: string;
  country: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  registrationNumber?: string;
  status: ClubStatus;
  president?: string;
  secretary?: string;
  stadium?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface EligibilityResult {
  playerId: string;
  playerName: string;
  isEligible: boolean;
  score: number;
  overallStatus: "eligible" | "conditional" | "ineligible";
  checks: {
    identityVerified: boolean;
    activeLicense: boolean;
    disciplinaryClearance: boolean;
    medicalClearance: boolean;
    validContract: boolean;
    ageCategory: string;
    quotaStatus: "domestic" | "foreign";
  };
  details: {
    nationalId: string;
    birthPlace: string;
    licenseNumber?: string;
    licenseExpiry?: string;
    suspensionsCount: number;
    activeBans: string[];
    medicalExpiry?: string;
    contractStatus?: string;
  };
  reasons: string[];
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  birthPlace?: string;
  nationalId?: string;
  gender?: "male" | "female" | "other";
  nationality: string;
  position?: "Goalkeeper" | "Defender" | "Midfielder" | "Forward" | string;
  secondaryPosition?: string;
  photoUrl?: string;
  phone?: string;
  email?: string;
  idDocumentType?: string;
  idDocumentNumber?: string;
  status: PlayerStatus;
  address?: string;
  height?: number;
  weight?: number;
  preferredFoot?: "left" | "right" | "both";
  currentClubId?: string;
  currentClubName?: string;
  jerseyNumber?: number;
  federationId?: string;
  medicalClearanceDate?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  createdAt: number;
  updatedAt?: number;
  // enriched & computed
  eligibilityStatus?: "eligible" | "conditional" | "ineligible";
  isEligible?: boolean;
  eligibilityScore?: number;
  eligibilitySummary?: EligibilityResult;
}


export interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  description?: string;
  createdAt: number;
}

export interface Division {
  id: string;
  name: string;
  tier: number;
  seasonId: string;
  description?: string;
  maxClubs?: number;
  promotionSlots?: number;
  relegationSlots?: number;
  createdAt: number;
  clubs?: Club[];
  competitions?: Competition[];
  clubCount?: number;
}

export interface Competition {
  id: string;
  name: string;
  type: CompetitionType;
  seasonId: string;
  divisionId?: string;
  description?: string;
  rules?: string;
  registrationDeadline?: string;
  isActive: boolean;
  createdAt: number;
  clubs?: Club[];
  clubCount?: number;
  seasonName?: string;
  divisionName?: string;
}

export interface Team {
  id: string;
  name: string;
  clubId: string;
  competitionId: string;
  seasonId: string;
  divisionId?: string;
  squadNumber: number;
  coachId?: string;
  status: "active" | "inactive";
  createdAt: number;
}

export interface PlayerRegistration {
  id: string;
  playerId: string;
  clubId: string;
  teamId?: string;
  competitionId?: string;
  seasonId: string;
  status: RegistrationStatus;
  licenseNumber?: string;
  licenseExpiry?: string;
  registrationDate: string;
  expiryDate?: string;
  squadNumber?: number;
  notes?: string;
  reviewedBy?: string;
  reviewedAt?: number;
  createdAt: number;
  updatedAt?: number;
  // enriched
  playerName?: string;
  clubName?: string;
  player?: Player;
  club?: Club;
}

export type ContractType = "professional" | "semi_professional" | "amateur" | "youth" | "loan";
export type ContractStatus = "active" | "pending_approval" | "expired" | "terminated";

export interface Contract {
  id: string;
  playerId: string;
  clubId: string;
  contractType: ContractType;
  startDate: string;
  endDate: string;
  salaryMonthly?: number;
  currency?: string;
  buyoutClause?: number;
  status: ContractStatus;
  agentName?: string;
  documentUrl?: string;
  notes?: string;
  approvedBy?: string;
  approvedAt?: number;
  createdAt: number;
  updatedAt?: number;
  // enriched
  playerName?: string;
  playerPhoto?: string;
  playerNationalId?: string;
  playerPosition?: string;
  clubName?: string;
  clubLogo?: string;
  player?: Player;
  club?: Club;
}

export interface Transfer {
  id: string;
  playerId: string;
  fromClubId: string;
  toClubId: string;
  fromRegistrationId?: string;
  toRegistrationId?: string;
  status: TransferStatus;
  transferFee?: number;
  transferDate?: string;
  reason?: string;
  reviewedBy?: string;
  reviewedAt?: number;
  reviewNotes?: string;
  createdAt: number;
  // enriched
  player?: Player;
  fromClub?: Club;
  toClub?: Club;
}

export interface Document {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  documentType: DocumentType;
  ownerType: "player" | "club" | "registration";
  ownerId: string;
  url?: string;
  status: DocumentStatus;
  verifiedBy?: string;
  verifiedAt?: number;
  expiryDate?: string;
  uploadedBy: string;
  createdAt: number;
}

export interface MatchEvent {
  id: string;
  matchId: string;
  minute: number;
  eventType: MatchEventType;
  teamId: string;
  playerId?: string;
  playerName?: string;
  assistPlayerId?: string;
  description?: string;
  createdAt: number;
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  competitionId: string;
  seasonId: string;
  matchDate: string;
  venue?: string;
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  refereeId?: string;
  round?: number;
  gameweek?: number;
  events?: MatchEvent[];
  createdAt: number;
  // enriched
  homeClubName?: string;
  awayClubName?: string;
}

export interface DisciplinaryCase {
  id: string;
  entityType: "player" | "coach" | "club" | "official";
  entityId: string;
  entityName?: string;
  competitionId?: string;
  matchId?: string;
  reason: string;
  incidentDate: string;
  cardType?: CardType;
  sanctionType?: "suspension" | "fine" | "warning" | "ban";
  suspensionMatches?: number;
  suspensionStartDate?: string;
  suspensionEndDate?: string;
  fineAmount?: number;
  status: DisciplinaryStatus;
  issuedBy: string;
  notes?: string;
  hearingDate?: string;
  createdAt: number;
}

export interface AuditEntry {
  id: string;
  userId?: string;
  userName?: string;
  role?: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: any;
  after?: any;
  metadata?: any;
  ip?: string;
  userAgent?: string;
  timestamp: number;
}

export interface StandingRow {
  position: number;
  teamId: string;
  teamName: string;
  clubId?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form?: string[];
}

export interface DashboardStats {
  kpis: {
    totalClubs: number;
    activeClubs: number;
    totalPlayers: number;
    activePlayers: number;
    activeCompetitions: number;
    totalMatches: number;
    completedMatches: number;
    scheduledMatches: number;
    pendingRegistrations: number;
    pendingTransfers: number;
    openDisciplinaryCases: number;
  };
  topScorers: Array<{
    playerId: string;
    name: string;
    clubName?: string;
    goals: number;
  }>;
  recentActivity: AuditEntry[];
}
