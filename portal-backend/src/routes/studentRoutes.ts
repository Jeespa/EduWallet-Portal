import { Router } from "express";
import { requireAuth } from "../auth/requireAuth";
import { requireRole } from "../auth/requireRole";
import { searchStudents } from "../services/studentLookupService";

export const studentRoutes = Router();

studentRoutes.get(
  "/search",
  requireAuth,
  requireRole(["ADMIN", "REQUESTER", "VERIFIER", "ISSUER"]),
  async (req, res) => {
    try {
      if (!req.auth) {
        return res.status(401).json({
          error: "Missing auth context.",
        });
      }

      const result = await searchStudents(String(req.query.q ?? ""), req.auth.organizationId);

      return res.json(result);
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        error: "Internal server error.",
      });
    }
  },
);
