import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth/requireAuth";
import { requireRole } from "../auth/requireRole";
import {
  createIssuanceDraft,
  listIssuanceDrafts,
  submitIssuanceDraft,
} from "../services/issuanceService";

export const issuanceRoutes = Router();

const createIssuanceDraftSchema = z.object({
  studentId: z.string().trim().optional(),
  studentSca: z.string().trim().min(1),
  courseCode: z.string().trim().min(1),
  courseName: z.string().trim().min(1),
  degreeCourse: z.string().trim().optional(),
  ects: z.string().trim().min(1),
  grade: z.string().trim().min(1),
  evaluationDate: z.string().trim().min(1),
  certificateCid: z.string().trim().optional(),
});

issuanceRoutes.post(
  "/drafts",
  requireAuth,
  requireRole(["ADMIN", "ISSUER"]),
  async (req, res) => {
    try {
      const parsed = createIssuanceDraftSchema.safeParse(req.body);

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

      const {
        studentId,
        studentSca,
        courseCode,
        courseName,
        degreeCourse,
        ects,
        grade,
        evaluationDate,
        certificateCid,
      } = parsed.data;

      const result = await createIssuanceDraft({
        studentId,
        studentSca,
        courseCode,
        courseName,
        degreeCourse,
        ects,
        grade,
        evaluationDate,
        certificateCid,
        organizationId: req.auth.organizationId,
        createdByUserId: req.auth.userId,
      });

      if ("error" in result) {
        return res.status(result.statusCode).json({
          error: result.error,
        });
      }

      return res.status(result.statusCode).json({
        draft: result.draft,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        error: "Internal server error.",
      });
    }
  }
);

issuanceRoutes.get(
  "/drafts",
  requireAuth,
  requireRole(["ADMIN", "ISSUER"]),
  async (req, res) => {
    try {
      if (!req.auth) {
        return res.status(401).json({
          error: "Missing auth context.",
        });
      }

      const result = await listIssuanceDrafts({
        organizationId: req.auth.organizationId,
        q: String(req.query.q ?? ""),
        status: String(req.query.status ?? ""),
      });

      return res.json(result);
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        error: "Internal server error.",
      });
    }
  }
);

issuanceRoutes.post(
  "/drafts/:id/submit",
  requireAuth,
  requireRole(["ADMIN", "ISSUER"]),
  async (req, res) => {
    try {
      if (!req.auth) {
        return res.status(401).json({ error: "Missing auth context." });
      }

      const draftId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!draftId) {
        return res.status(400).json({
          error: "Missing draft id.",
        });
      }

      const result = await submitIssuanceDraft({
        draftId,
        organizationId: req.auth.organizationId,
      });

      if ("error" in result) {
        return res.status(result.statusCode).json({
          error: result.error,
        });
      }

      return res.json({
        draft: result.draft,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        error: "Internal server error.",
      });
    }
  }
);