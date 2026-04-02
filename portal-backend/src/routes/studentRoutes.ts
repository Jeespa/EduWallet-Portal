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
      const result = await searchStudents(String(req.query.q ?? ""));

      return res.json(result);
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        error: "Internal server error.",
      });
    }
  }
);