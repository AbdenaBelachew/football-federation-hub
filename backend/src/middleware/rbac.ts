import { Request, Response, NextFunction } from "express";
import { Role, ROLES } from "../types.js";
import { config } from "../config.js";

export const FEDERATION_ROLES: Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.FEDERATION_ADMIN,
  ROLES.COMPETITION_ADMIN,
  ROLES.REGISTRATION_OFFICER,
  ROLES.TRANSFER_OFFICER,
  ROLES.DISCIPLINARY_OFFICER,
];

// Roles permitted to create, register, or update players & licenses
export const REGISTRATION_ROLES: Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.FEDERATION_ADMIN,
  ROLES.REGISTRATION_OFFICER,
  ROLES.CLUB_ADMIN,
  ROLES.COMPETITION_ADMIN,
  ROLES.TRANSFER_OFFICER,
  ROLES.REFEREE,
  ROLES.DISCIPLINARY_OFFICER,
  ROLES.PUBLIC,
];

// Roles permitted to initiate or review transfers
export const TRANSFER_ROLES: Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.FEDERATION_ADMIN,
  ROLES.TRANSFER_OFFICER,
  ROLES.CLUB_ADMIN,
];

// Roles permitted to report or adjudicate disciplinary cases & fouls
export const DISCIPLINARY_ROLES: Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.FEDERATION_ADMIN,
  ROLES.DISCIPLINARY_OFFICER,
  ROLES.REFEREE,
  ROLES.COMPETITION_ADMIN,
];

// Roles permitted to create competitions, seasons, divisions & leagues
export const COMPETITION_ROLES: Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.FEDERATION_ADMIN,
  ROLES.COMPETITION_ADMIN,
];

// Roles permitted to schedule matches, enter scores & live match events
export const MATCH_OFFICER_ROLES: Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.FEDERATION_ADMIN,
  ROLES.COMPETITION_ADMIN,
  ROLES.REFEREE,
  ROLES.CLUB_ADMIN,
];

// Roles permitted to create & manage clubs
export const CLUB_MANAGEMENT_ROLES: Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.FEDERATION_ADMIN,
  ROLES.CLUB_ADMIN,
  ROLES.REGISTRATION_OFFICER,
  ROLES.COMPETITION_ADMIN,
];

export function requireRole(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // If user is authenticated, strictly enforce their permissions
    if (req.user) {
      if (req.user.role === ROLES.SUPER_ADMIN || req.user.role === ROLES.FEDERATION_ADMIN) {
        next();
        return;
      }

      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({
          error: "Insufficient permissions",
          message: `Role '${req.user.role}' is not authorized. Allowed roles: ${allowedRoles.join(", ")}`,
        });
        return;
      }

      next();
      return;
    }

    // In development mode with no token, allow bypass for convenience
    if (config.nodeEnv === "development") {
      next();
      return;
    }

    res.status(401).json({ error: "Authentication required" });
  };
}

export function requireAdmin() {
  return requireRole([ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN]);
}
