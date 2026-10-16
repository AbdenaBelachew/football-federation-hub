import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { authenticate, mapUserRow } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/rbac.js";
import { logAudit } from "../middleware/audit.js";
import { pgDb } from "../db/postgres.js";
import { ROLES } from "../types.js";

export const usersRouter = Router();

// GET /api/users
usersRouter.get("/", authenticate(false), requireAdmin(), async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, search, clubId } = req.query;
    const whereClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (role) {
      whereClauses.push(`role = $${idx++}::user_role`);
      params.push(role);
    }
    if (clubId) {
      whereClauses.push(`club_id = $${idx++}`);
      params.push(clubId);
    }
    if (search) {
      const q = `%${(search as string).toLowerCase()}%`;
      whereClauses.push(`(LOWER(name) LIKE $${idx} OR LOWER(email) LIKE $${idx})`);
      params.push(q);
      idx++;
    }

    const where = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const result = await pgDb.query(`SELECT * FROM users ${where} ORDER BY created_at DESC`, params);
    const safeUsers = result.rows.map((r: any) => {
      const { passwordHash, ...safe } = mapUserRow(r);
      return safe;
    });

    res.json({ total: safeUsers.length, count: safeUsers.length, items: safeUsers, users: safeUsers });
  } catch (err: any) {
    console.error("Users GET error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// GET /api/users/:id
usersRouter.get("/:id", authenticate(false), requireAdmin(), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id as string;
    const result = await pgDb.query("SELECT * FROM users WHERE id = $1", [userId]);
    if (!result.rows[0]) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const { passwordHash, ...safeUser } = mapUserRow(result.rows[0]);
    res.json({ user: safeUser });
  } catch (err: any) {
    console.error("User GET by id error:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// POST /api/users - Super Admin creates user (e.g. Club Leader / Official)
usersRouter.post("/", authenticate(false), requireAdmin(), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, clubId, phone } = req.body;

    if (!email || !name) {
      res.status(400).json({ error: "Name and email are required" });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingRes = await pgDb.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [cleanEmail]);
    if (existingRes.rowCount! > 0) {
      res.status(409).json({ error: "A user with this email address already exists" });
      return;
    }

    const assignedRole = role || ROLES.CLUB_ADMIN;
    if (!Object.values(ROLES).includes(assignedRole)) {
      res.status(400).json({ error: "Invalid role specified" });
      return;
    }

    const rawPassword = password || "password123";
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const userId = `usr-${Date.now()}`;

    const insertRes = await pgDb.query(
      `INSERT INTO users (id, name, email, password_hash, role, club_id, phone, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5::user_role, $6, $7, TRUE, NOW(), NOW()) RETURNING *`,
      [userId, name.trim(), cleanEmail, passwordHash, assignedRole, clubId || null, phone || null]
    );

    const createdUser = insertRes.rows[0];
    const { passwordHash: _, ...safeUser } = mapUserRow(createdUser);

    logAudit(req, {
      action: "user.create",
      entityType: "user",
      entityId: userId,
      after: { email: safeUser.email, role: safeUser.role, clubId: safeUser.clubId },
    });

    res.status(201).json({
      message: "User created successfully",
      user: safeUser,
    });
  } catch (err: any) {
    console.error("POST /api/users error:", err);
    res.status(500).json({ error: err.message || "Failed to create user" });
  }
});

// PUT /api/users/:id - Update user details (role, club, active status, etc.)
usersRouter.put("/:id", authenticate(false), requireAdmin(), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id as string;
    const existingRes = await pgDb.query("SELECT * FROM users WHERE id = $1", [userId]);
    if (!existingRes.rows[0]) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const existing = mapUserRow(existingRes.rows[0]);

    const { name, email, role, clubId, phone, isActive, password } = req.body;
    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      params.push(name.trim());
    }
    if (email !== undefined) {
      updates.push(`email = $${idx++}`);
      params.push(email.toLowerCase().trim());
    }
    if (role !== undefined) {
      if (!Object.values(ROLES).includes(role)) {
        res.status(400).json({ error: "Invalid role specified" });
        return;
      }
      updates.push(`role = $${idx++}::user_role`);
      params.push(role);
    }
    if (clubId !== undefined) {
      updates.push(`club_id = $${idx++}`);
      params.push(clubId || null);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${idx++}`);
      params.push(phone || null);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${idx++}`);
      params.push(Boolean(isActive));
    }
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${idx++}`);
      params.push(passwordHash);
    }

    if (updates.length === 0) {
      const { passwordHash: _, ...safe } = existing;
      res.json({ message: "No updates provided", user: safe });
      return;
    }

    updates.push(`updated_at = NOW()`);
    params.push(userId);

    const updateRes = await pgDb.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
      params
    );
    const updated = mapUserRow(updateRes.rows[0]);

    logAudit(req, {
      action: "user.update",
      entityType: "user",
      entityId: userId,
      before: { name: existing.name, role: existing.role, clubId: existing.clubId },
      after: { name: updated.name, role: updated.role, clubId: updated.clubId },
    });

    const { passwordHash: _, ...safe } = updated;
    res.json({ message: "User updated successfully", user: safe });
  } catch (err: any) {
    console.error("PUT /api/users/:id error:", err);
    res.status(500).json({ error: err.message || "Failed to update user" });
  }
});

// PUT /api/users/:id/role
usersRouter.put(
  "/:id/role",
  authenticate(false),
  requireAdmin(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.id as string;
      const existingRes = await pgDb.query("SELECT * FROM users WHERE id = $1", [userId]);
      if (!existingRes.rows[0]) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      const existing = mapUserRow(existingRes.rows[0]);

      const { role } = req.body;
      if (!role || !Object.values(ROLES).includes(role)) {
        res.status(400).json({ error: "Invalid role specified" });
        return;
      }

      const updateRes = await pgDb.query(
        "UPDATE users SET role = $1::user_role, updated_at = NOW() WHERE id = $2 RETURNING *",
        [role, userId]
      );
      const updated = mapUserRow(updateRes.rows[0]);

      logAudit(req, {
        action: "user.role_change",
        entityType: "user",
        entityId: userId,
        before: { role: existing.role },
        after: { role },
      });

      const { passwordHash, ...safe } = updated;
      res.json({ message: "Role updated", user: safe });
    } catch (err: any) {
      console.error("User role update error:", err);
      res.status(500).json({ error: err.message || "Failed to update user role" });
    }
  }
);

// DELETE /api/users/:id
usersRouter.delete("/:id", authenticate(false), requireAdmin(), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id as string;
    const existingRes = await pgDb.query("SELECT * FROM users WHERE id = $1", [userId]);
    if (!existingRes.rows[0]) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const existing = mapUserRow(existingRes.rows[0]);

    await pgDb.query("DELETE FROM users WHERE id = $1", [userId]);

    logAudit(req, {
      action: "user.delete",
      entityType: "user",
      entityId: userId,
      before: { email: existing.email, role: existing.role },
    });

    res.json({ message: "User deleted successfully" });
  } catch (err: any) {
    console.error("DELETE /api/users/:id error:", err);
    res.status(500).json({ error: err.message || "Failed to delete user" });
  }
});

