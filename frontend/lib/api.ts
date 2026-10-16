import type {
  Club,
  Player,
  Season,
  Division,
  Competition,
  PlayerRegistration,
  Contract,
  EligibilityResult,
  Transfer,
  Match,
  MatchEvent,
  DisciplinaryCase,
  Document,
  AuditEntry,
  StandingRow,
  DashboardStats,
  User,
  Team,
} from "./types";

const API_BASE = "/api";

function getToken(): string | null {
  try {
    return localStorage.getItem("ff_token");
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem("ff_token", token);
    } else {
      localStorage.removeItem("ff_token");
    }
  } catch (err) {
    console.error("Failed to update token in storage", err);
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error) errorMessage = errorData.error;
      else if (errorData.message) errorMessage = errorData.message;
    } catch {
      // fallback to status text
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

export const api = {
  auth: {
    login: (credentials: { email: string; password?: string }) =>
      request<{ message: string; user: User; token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      }),

    register: (userData: Partial<User> & { password?: string }) =>
      request<{ message: string; user: User; token: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(userData),
      }),

    me: () => request<{ user: User }>("/auth/me"),

    getDemoAccounts: () =>
      request<{ accounts: Array<{ id: string; name: string; email: string; role: string }> }>(
        "/auth/demo-accounts"
      ),
  },

  dashboard: {
    getStats: () => request<DashboardStats>("/dashboard/stats"),
  },

  players: {
    list: (params?: { clubId?: string; status?: string; search?: string; eligibility?: string }) => {
      const q = new URLSearchParams();
      if (params?.clubId) q.set("clubId", params.clubId);
      if (params?.status) q.set("status", params.status);
      if (params?.search) q.set("search", params.search);
      if (params?.eligibility) q.set("eligibility", params.eligibility);
      const qs = q.toString() ? `?${q.toString()}` : "";
      return request<{ players: Player[]; total: number }>(`/players${qs}`);
    },
    get: (id: string) =>
      request<{
        player: Player;
        eligibility?: EligibilityResult;
        registrations?: PlayerRegistration[];
        contracts?: Contract[];
        transfers?: Transfer[];
        disciplinary?: DisciplinaryCase[];
        cards?: any[];
        documents?: Document[];
      }>(`/players/${id}`),
    getEligibility: (id: string) =>
      request<{ eligibility: EligibilityResult; player: Player }>(`/players/${id}/eligibility`),
    stats: () =>
      request<{
        totalPlayers: number;
        activePlayers: number;
        suspendedPlayers: number;
        retiredPlayers: number;
        inactivePlayers: number;
        fullyEligible: number;
        conditional: number;
        ineligible: number;
      }>("/players/stats"),
    create: (data: Partial<Player> & { initialContract?: any; registerLicense?: boolean }) =>
      request<{ message: string; player: Player }>("/players", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Player>) =>
      request<{ message: string; player: Player }>(`/players/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/players/${id}`, {
        method: "DELETE",
      }),
  },

  contracts: {
    list: (params?: { playerId?: string; clubId?: string; status?: string; contractType?: string }) => {
      const q = new URLSearchParams();
      if (params?.playerId) q.set("playerId", params.playerId);
      if (params?.clubId) q.set("clubId", params.clubId);
      if (params?.status) q.set("status", params.status);
      if (params?.contractType) q.set("contractType", params.contractType);
      const qs = q.toString() ? `?${q.toString()}` : "";
      return request<{ contracts: Contract[]; total: number }>(`/contracts${qs}`);
    },
    get: (id: string) =>
      request<{ contract: Contract; player?: Player; club?: Club }>(`/contracts/${id}`),
    create: (data: Partial<Contract>) =>
      request<{ message: string; contract: Contract }>("/contracts", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    approve: (id: string, notes?: string) =>
      request<{ message: string; contract: Contract }>(`/contracts/${id}/approve`, {
        method: "PUT",
        body: JSON.stringify({ notes }),
      }),
    terminate: (id: string, reason?: string) =>
      request<{ message: string; contract: Contract }>(`/contracts/${id}/terminate`, {
        method: "PUT",
        body: JSON.stringify({ reason }),
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/contracts/${id}`, {
        method: "DELETE",
      }),
    stats: () =>
      request<{
        totalContracts: number;
        activeContracts: number;
        pendingContracts: number;
        expiredContracts: number;
        totalMonthlyWage: number;
      }>("/contracts/stats"),
  },


  clubs: {
    list: (params?: { status?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set("status", params.status);
      if (params?.search) q.set("search", params.search);
      const qs = q.toString() ? `?${q.toString()}` : "";
      return request<{ clubs: Club[]; total: number }>(`/clubs${qs}`);
    },
    get: (id: string) => request<Club>(`/clubs/${id}`),
    create: (data: Partial<Club>) =>
      request<Club>("/clubs", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Club>) =>
      request<Club>(`/clubs/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/clubs/${id}`, {
        method: "DELETE",
      }),
    bulkCreate: (clubs: Partial<Club>[]) =>
      request<{ message: string; count: number; clubs: Club[] }>("/clubs/bulk", {
        method: "POST",
        body: JSON.stringify({ clubs }),
      }),
  },

  competitions: {
    list: (params?: { seasonId?: string; isActive?: boolean }) => {
      const q = new URLSearchParams();
      if (params?.seasonId) q.set("seasonId", params.seasonId);
      if (params?.isActive !== undefined) q.set("isActive", String(params.isActive));
      const qs = q.toString() ? `?${q.toString()}` : "";
      return request<{ competitions: Competition[]; total: number }>(`/competitions${qs}`);
    },
    get: (id: string) => request<Competition>(`/competitions/${id}`),
    create: (data: Partial<Competition>) =>
      request<Competition>("/competitions", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getStandings: (competitionId: string) =>
      request<{ standings: StandingRow[]; competitionName?: string }>(
        `/competitions/${competitionId}/standings`
      ),
  },

  seasons: {
    list: () => request<{ seasons: Season[]; total: number }>("/seasons"),
    create: (data: Partial<Season>) =>
      request<Season>("/seasons", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    setActive: (id: string) =>
      request<Season>(`/seasons/${id}/set-active`, {
        method: "PATCH",
      }),
  },

  divisions: {
    list: (seasonId?: string) => {
      const qs = seasonId ? `?seasonId=${seasonId}` : "";
      return request<{ divisions: Division[]; total: number }>(`/divisions${qs}`);
    },
    create: (data: Partial<Division>) =>
      request<Division>("/divisions", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  teams: {
    list: (params?: { clubId?: string; competitionId?: string; seasonId?: string }) => {
      const q = new URLSearchParams();
      if (params?.clubId) q.set("clubId", params.clubId);
      if (params?.competitionId) q.set("competitionId", params.competitionId);
      if (params?.seasonId) q.set("seasonId", params.seasonId);
      const qs = q.toString() ? `?${q.toString()}` : "";
      return request<{ items: Team[]; total: number }>(`/teams${qs}`);
    },
    create: (data: { clubId: string; name?: string; competitionId?: string; divisionId?: string; seasonId?: string; moveDivision?: boolean }) =>
      request<{ message: string; team: Team }>("/teams", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/teams/${id}`, {
        method: "DELETE",
      }),
  },

  matches: {
    list: (params?: { competitionId?: string; seasonId?: string; status?: string; gameweek?: number }) => {
      const q = new URLSearchParams();
      if (params?.competitionId) q.set("competitionId", params.competitionId);
      if (params?.seasonId) q.set("seasonId", params.seasonId);
      if (params?.status) q.set("status", params.status);
      if (params?.gameweek) q.set("gameweek", String(params.gameweek));
      const qs = q.toString() ? `?${q.toString()}` : "";
      return request<{ matches: Match[]; total: number }>(`/matches${qs}`);
    },
    get: (id: string) => request<Match>(`/matches/${id}`),
    create: (data: Partial<Match>) =>
      request<Match>("/matches", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateScore: (id: string, homeScore: number, awayScore: number, status?: string) =>
      request<Match>(`/matches/${id}/score`, {
        method: "PATCH",
        body: JSON.stringify({ homeScore, awayScore, status }),
      }),
    addEvent: (matchId: string, eventData: Partial<MatchEvent>) =>
      request<MatchEvent>(`/matches/${matchId}/events`, {
        method: "POST",
        body: JSON.stringify(eventData),
      }),
  },

  registrations: {
    list: (params?: { status?: string; clubId?: string; seasonId?: string }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set("status", params.status);
      if (params?.clubId) q.set("clubId", params.clubId);
      if (params?.seasonId) q.set("seasonId", params.seasonId);
      const qs = q.toString() ? `?${q.toString()}` : "";
      return request<{ registrations: PlayerRegistration[]; total: number }>(`/registrations${qs}`);
    },
    create: (data: Partial<PlayerRegistration>) =>
      request<PlayerRegistration>("/registrations", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    review: (id: string, action: "approve" | "reject", notes?: string) =>
      request<PlayerRegistration>(`/registrations/${id}/${action}`, {
        method: "POST",
        body: JSON.stringify({ notes }),
      }),
  },

  transfers: {
    list: (params?: { status?: string; playerId?: string; clubId?: string }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set("status", params.status);
      if (params?.playerId) q.set("playerId", params.playerId);
      if (params?.clubId) q.set("clubId", params.clubId);
      const qs = q.toString() ? `?${q.toString()}` : "";
      return request<{ transfers: Transfer[]; total: number }>(`/transfers${qs}`);
    },
    request: (data: Partial<Transfer>) =>
      request<Transfer>("/transfers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    review: (id: string, action: "approve" | "reject" | "complete", notes?: string) =>
      request<Transfer>(`/transfers/${id}/${action}`, {
        method: "POST",
        body: JSON.stringify({ reviewNotes: notes }),
      }),
  },

  disciplinary: {
    list: (params?: { status?: string; entityType?: string }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set("status", params.status);
      if (params?.entityType) q.set("entityType", params.entityType);
      const qs = q.toString() ? `?${q.toString()}` : "";
      return request<{ cases: DisciplinaryCase[]; total: number }>(`/disciplinary${qs}`);
    },
    create: (data: Partial<DisciplinaryCase>) =>
      request<DisciplinaryCase>("/disciplinary", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateStatus: (id: string, status: string, notes?: string) =>
      request<DisciplinaryCase>(`/disciplinary/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, notes }),
      }),
  },

  documents: {
    list: (params?: { ownerType?: string; ownerId?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.ownerType) q.set("ownerType", params.ownerType);
      if (params?.ownerId) q.set("ownerId", params.ownerId);
      if (params?.status) q.set("status", params.status);
      const qs = q.toString() ? `?${q.toString()}` : "";
      return request<{ documents: Document[]; total: number }>(`/documents${qs}`);
    },
    create: (data: Partial<Document>) =>
      request<Document>("/documents", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    verify: (id: string, status: "verified" | "rejected") =>
      request<Document>(`/documents/${id}/verify`, {
        method: "POST",
        body: JSON.stringify({ status }),
      }),
  },

  audit: {
    list: (limit = 50) =>
      request<{ auditLog: AuditEntry[]; total: number }>(`/audit?limit=${limit}`),
  },

  users: {
    list: (params?: { role?: string; search?: string; clubId?: string }) => {
      const q = new URLSearchParams();
      if (params?.role) q.set("role", params.role);
      if (params?.search) q.set("search", params.search);
      if (params?.clubId) q.set("clubId", params.clubId);
      const qs = q.toString() ? `?${q.toString()}` : "";
      return request<{ users: User[]; total: number }>(`/users${qs}`);
    },
    get: (id: string) => request<{ user: User }>(`/users/${id}`),
    create: (data: {
      name: string;
      email: string;
      password?: string;
      role: string;
      clubId?: string;
      phone?: string;
    }) =>
      request<{ message: string; user: User }>("/users", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<User> & { password?: string }) =>
      request<{ message: string; user: User }>(`/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    updateRole: (id: string, role: string) =>
      request<{ message: string; user: User }>(`/users/${id}/role`, {
        method: "PUT",
        body: JSON.stringify({ role }),
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/users/${id}`, {
        method: "DELETE",
      }),
  },

  system: {
    resetSeed: () => request<{ message: string }>("/system/reset-seed", { method: "POST" }),
  },
};
