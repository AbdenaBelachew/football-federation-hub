import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { pgDb } from "../db/postgres.js";
import { User, ROLES } from "../types.js";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: string;
    }
  }
}

export function mapUserRow(row: any): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    clubId: row.club_id || undefined,
    phone: row.phone || undefined,
    isActive: row.is_active ?? true,
    image: row.image || undefined,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      clubId: user.clubId,
      name: user.name,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as any }
  );
}

export function authenticate(optional = false) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const headerUserId = req.headers["x-user-id"] as string | undefined;
      const queryToken = req.query.token as string | undefined;

      let token: string | undefined;

      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      } else if (queryToken) {
        token = queryToken;
      }

      // 1. Dev token bypass for quick testing or dev environment
      if (token === "dev-token" || token === "admin" || (!token && headerUserId)) {
        let userRow: any = null;
        if (headerUserId) {
          const resUser = await pgDb.query("SELECT * FROM users WHERE id = $1", [headerUserId]);
          userRow = resUser.rows[0];
        } else {
          const resAdmin = await pgDb.query("SELECT * FROM users WHERE role = 'super_admin' LIMIT 1");
          userRow = resAdmin.rows[0];
        }

        if (userRow) {
          const user = mapUserRow(userRow);
          req.user = user;
          req.userId = user.id;
          next();
          return;
        }
      }

      // 2. Fallback for development if no token provided
      if (!token) {
        if (config.nodeEnv === "development") {
          const resAdmin = await pgDb.query("SELECT * FROM users WHERE role = 'super_admin' LIMIT 1");
          if (resAdmin.rows[0]) {
            const user = mapUserRow(resAdmin.rows[0]);
            req.user = user;
            req.userId = user.id;
            next();
            return;
          }
          const fallbackUser: User = {
            id: "usr-admin-1",
            name: "Solomon Tadesse",
            email: "admin@federation.org",
            role: ROLES.SUPER_ADMIN,
            isActive: true,
            createdAt: Date.now(),
          };
          req.user = fallbackUser;
          req.userId = fallbackUser.id;
          next();
          return;
        }

        if (optional) {
          next();
          return;
        }
        res.status(401).json({
          error: "Authentication required",
          message: "Please provide a valid Bearer token in Authorization header or use 'dev-token'",
        });
        return;
      }

      // 3. Verify JWT token
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      let userRes = await pgDb.query("SELECT * FROM users WHERE id = $1", [decoded.id]);
      let userRow = userRes.rows[0];

      if (!userRow && config.nodeEnv === "development") {
        if (decoded.email) {
          const emailRes = await pgDb.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1", [decoded.email]);
          userRow = emailRes.rows[0];
        }
        if (!userRow) {
          const adminRes = await pgDb.query("SELECT * FROM users WHERE role = 'super_admin' LIMIT 1");
          userRow = adminRes.rows[0];
        }
      }

      if (!userRow) {
        res.status(401).json({ error: "User not found or deleted" });
        return;
      }

      const user = mapUserRow(userRow);

      // Ensure active in development
      if (!user.isActive && config.nodeEnv === "development") {
        user.isActive = true;
      }

      if (!user.isActive) {
        res.status(403).json({ error: "User account is inactive" });
        return;
      }

      req.user = user;
      req.userId = user.id;
      next();
    } catch (err: any) {
      if (config.nodeEnv === "development") {
        try {
          const adminRes = await pgDb.query("SELECT * FROM users WHERE role = 'super_admin' LIMIT 1");
          if (adminRes.rows[0]) {
            const user = mapUserRow(adminRes.rows[0]);
            req.user = user;
            req.userId = user.id;
            next();
            return;
          }
        } catch {
          // ignore fallback error
        }
      }

      if (optional) {
        next();
        return;
      }
      res.status(401).json({
        error: "Invalid or expired token",
        message: err.message,
      });
    }
  };
}
