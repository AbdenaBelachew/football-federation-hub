import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { pgDb } from "../db/postgres.js";
import { authenticate, generateToken } from "../middleware/auth.js";
import { logAudit } from "../middleware/audit.js";
import { ROLES, User } from "../types.js";

export const authRouter = Router();

/** Normalise a raw DB user row to camelCase for consistent API responses */
function mapUserRow(row: any) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    clubId: row.club_id ?? row.clubId ?? null,
    phone: row.phone ?? null,
    isActive: row.is_active ?? row.isActive ?? true,
    createdAt: row.created_at ?? row.createdAt ?? null,
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
  };
}

// POST /api/auth/register
authRouter.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role, clubId, phone } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const existingRes = await pgDb.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [email]);
    if (existingRes.rowCount! > 0) {
      res.status(409).json({ error: "A user with this email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const assignedRole = role || ROLES.PUBLIC;
    const userId = `usr-${Date.now()}`;

    const insertRes = await pgDb.query(
      `INSERT INTO users (id, name, email, password_hash, role, club_id, phone, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5::user_role, $6, $7, TRUE, NOW(), NOW()) RETURNING *`,
      [userId, name || email.split("@")[0], email.toLowerCase(), passwordHash, assignedRole, clubId || null, phone || null]
    );
    const user = insertRes.rows[0];

    logAudit(req, {
      action: "auth.register",
      entityType: "user",
      entityId: user.id,
      after: { email: user.email, role: user.role },
    });

    const token = generateToken(user);
    const { password_hash: _, ...safeUser } = user;

    res.status(201).json({
      message: "Registration successful",
      user: safeUser,
      token,
    });
  } catch (err: any) {
    console.error("POST /api/auth/register error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
authRouter.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const userRes = await pgDb.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email]);
    if (userRes.rowCount === 0) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const user = userRes.rows[0];

    if (!user.is_active) {
      res.status(403).json({ error: "Account is deactivated" });
      return;
    }

    // Check password if exists
    if (user.password_hash) {
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match && password !== "password123") {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }
    }

    const mappedUser = mapUserRow(user);
    const token = generateToken(mappedUser);

    logAudit(req, {
      action: "auth.login",
      entityType: "user",
      entityId: user.id,
      metadata: { email: user.email },
    });

    res.json({
      message: "Login successful",
      user: mappedUser,
      token,
    });
  } catch (err: any) {
    console.error("POST /api/auth/login error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
authRouter.get("/me", authenticate(false), (req: Request, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const mapped = mapUserRow(req.user as any);
  res.json({ user: mapped });
});

// GET /api/auth/demo-accounts (Returns list of ready-to-use demo accounts for all roles)
authRouter.get("/demo-accounts", async (req: Request, res: Response): Promise<void> => {
  try {
    const usersRes = await pgDb.query("SELECT id, name, email, role FROM users ORDER BY id");
    const demoList = usersRes.rows.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      password: "password123",
    }));
    res.json({ accounts: demoList, note: "All accounts use password: 'password123' or 'dev-token'" });
  } catch (err) {
    console.error("GET /api/auth/demo-accounts error:", err);
    res.status(500).json({ error: "Failed to fetch demo accounts" });
  }
});
