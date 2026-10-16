// ─── Football Federation Hub Domain Types & RBAC ───────────────────

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
  passwordHash?: string;
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
  updatedAt: number;
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
  updatedAt: number;
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
  updatedAt: number;
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
  updatedAt: number;
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
  refereeName?: string;
  round?: string;
  notes?: string;
  createdAt: number;
}

export interface MatchEvent {
  id: string;
  matchId: string;
  eventType: MatchEventType;
  playerId?: string;
  playerName?: string;
  assistedByPlayerId?: string;
  assistedByPlayerName?: string;
  teamId?: string;
  teamName?: string;
  minute?: number;
  description?: string;
  createdAt: number;
}

export interface DisciplinaryCase {
  id: string;
  playerId: string;
  playerName?: string;
  matchId?: string;
  clubId?: string;
  competitionId?: string;
  offense: string;
  cardType: CardType;
  matchMinute?: number;
  suspensionMatches: number;
  suspensionStart?: string;
  suspensionEnd?: string;
  fine?: number;
  status: DisciplinaryStatus;
  notes?: string;
  reviewedBy?: string;
  reviewedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface CardAccumulation {
  id: string;
  playerId: string;
  playerName?: string;
  competitionId: string;
  seasonId: string;
  yellowCards: number;
  redCards: number;
  totalSuspensionMatches: number;
  updatedAt: number;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: any;
  after?: any;
  metadata?: any;
  timestamp: number;
}
