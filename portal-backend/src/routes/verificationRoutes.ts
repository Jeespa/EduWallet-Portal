import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth/requireAuth";
import { requireRole } from "../auth/requireRole";
import { createAcademicVerification, listVerifications } from "../services/verificationService";

export const verificationRoutes = Router();

const verifySchema = z.object({
  studentId: z.string().trim().optional(),
  studentSca: z.string().trim().min(1),
  certificateCid: z.string().trim().optional(),
  courseCode: z.string().trim().optional(),
});

verificationRoutes.post(
  "/",
  requireAuth,
  requireRole(["ADMIN", "REQUESTER", "VERIFIER", "ISSUER"]),
  async (req, res) => {
    try {
      const parsed = verifySchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid request body.",
          details: parsed.error.issues,
        });
      }

      if (!req.auth) {
        return res.status(401).json({
          error: "Missing auth context.",
        });
      }

      const { studentId, studentSca, certificateCid, courseCode } = parsed.data;

      const result = await createAcademicVerification({
        studentId,
        studentSca,
        certificateCid,
        courseCode,
        organizationId: req.auth.organizationId,
        createdByUserId: req.auth.userId,
      });

      return res.status(result.statusCode).json({
        verification: result.verification,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        error: "Internal server error.",
      });
    }
  },
);

verificationRoutes.get(
  "/",
  requireAuth,
  requireRole(["ADMIN", "REQUESTER", "VERIFIER", "ISSUER"]),
  async (req, res) => {
    try {
      if (!req.auth) {
        return res.status(401).json({
          error: "Missing auth context.",
        });
      }

      const result = await listVerifications({
        organizationId: req.auth.organizationId,
        q: String(req.query.q ?? ""),
        verificationType: String(req.query.verificationType ?? ""),
      });

      return res.json(result);
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        error: "Internal server error.",
      });
    }
  },
);
