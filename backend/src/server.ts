import express, { Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.routes.js";
import { clubsRouter } from "./routes/clubs.routes.js";
import { playersRouter } from "./routes/players.routes.js";
import { seasonsRouter } from "./routes/seasons.routes.js";
import { divisionsRouter } from "./routes/divisions.routes.js";
import { competitionsRouter } from "./routes/competitions.routes.js";
import { teamsRouter } from "./routes/teams.routes.js";
import { registrationsRouter } from "./routes/registrations.routes.js";
import { contractsRouter } from "./routes/contracts.routes.js";
import { transfersRouter } from "./routes/transfers.routes.js";
import { matchesRouter } from "./routes/matches.routes.js";
import { disciplinaryRouter } from "./routes/disciplinary.routes.js";
import { documentsRouter } from "./routes/documents.routes.js";
import { auditRouter } from "./routes/audit.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { usersRouter } from "./routes/users.routes.js";
import { getApiDocumentationHtml } from "./docs/apiHtml.js";
import { notFoundHandler, globalErrorHandler } from "./middleware/errorHandler.js";

const app = express();

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    return callback(null, true); // Permissive in dev for convenience
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-user-id"],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// ─── Root & Documentation ───────────────────────────────────────────────────
app.get("/", (_req: Request, res: Response) => {
  res.send(getApiDocumentationHtml());
});

app.get("/docs", (_req: Request, res: Response) => {
  res.send(getApiDocumentationHtml());
});

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "football-federation-api",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: "connected",
  });
});

// ─── API Routes ─────────────────────────────────────────────────────────────
const api = express.Router();

// Root API discovery map
api.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "Football Federation Hub REST API",
    version: "1.0.0",
    description: "Full backend API for Football Federation Hub",
    documentation: "/docs",
    healthCheck: "/health",
    resources: {
      auth: "/api/auth (login, register, me, demo-accounts)",
      clubs: "/api/clubs (CRUD, stats, teams, players)",
      players: "/api/players (CRUD, stats, history)",
      seasons: "/api/seasons (CRUD, active toggle)",
      divisions: "/api/divisions (CRUD by season)",
      competitions: "/api/competitions (CRUD, standings, fixtures)",
      teams: "/api/teams (CRUD, squad)",
      registrations: "/api/registrations (CRUD, approve, reject)",
      contracts: "/api/contracts (CRUD, approve, terminate, salary/buyout registry)",
      transfers: "/api/transfers (CRUD, approve, complete)",
      matches: "/api/matches (CRUD, live events, score calculation)",
      disciplinary: "/api/disciplinary (CRUD, card accumulations)",
      documents: "/api/documents (CRUD, verify)",
      audit: "/api/audit (system audit trail)",
      dashboard: "/api/dashboard/stats (federation KPIs & top scorers)",
      users: "/api/users (user administration & RBAC)",
    },
  });
});

api.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// System endpoints
api.post("/system/reset-seed", (_req: Request, res: Response) => {
  res.json({ message: "PostgreSQL federation-db is the active persistent database" });
});

// Mount module routers
api.use("/auth", authRouter);
api.use("/clubs", clubsRouter);
api.use("/players", playersRouter);
api.use("/seasons", seasonsRouter);
api.use("/divisions", divisionsRouter);
api.use("/competitions", competitionsRouter);
api.use("/teams", teamsRouter);
api.use("/registrations", registrationsRouter);
api.use("/contracts", contractsRouter);
api.use("/transfers", transfersRouter);
api.use("/matches", matchesRouter);
api.use("/disciplinary", disciplinaryRouter);
api.use("/documents", documentsRouter);
api.use("/audit", auditRouter);
api.use("/dashboard", dashboardRouter);
api.use("/users", usersRouter);

// Mount /api
app.use(config.apiPrefix, api);

// ─── Error Handlers ─────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ─── Start Server ───────────────────────────────────────────────────────────
const server = app.listen(config.port, () => {
  console.log(`
  ⚽ ======================================================== ⚽
     FOOTBALL FEDERATION HUB — REST API BACKEND
  ⚽ ======================================================== ⚽
     ➜  Server Running at: http://localhost:${config.port}
     ➜  API Base URL:      http://localhost:${config.port}${config.apiPrefix}
     ➜  API Interactive:   http://localhost:${config.port}/docs
     ➜  Health Check:      http://localhost:${config.port}/health
     ➜  Dev Token:         'dev-token'
  ⚽ ======================================================== ⚽
  `);
});

export default app;
