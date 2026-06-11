import { RequestHandler } from "express";
import type { PortalRole } from "../types/express";

export function requireRole(allowedRoles: PortalRole[]): RequestHandler {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({
        error: "Missing auth context.",
      });
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({
        error: "You do not have permission to perform this action.",
      });
    }

    return next();
  };
}
