import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth/requireAuth";
import { requireRole } from "../auth/requireRole";
import { createPermissionRequest, listPermissionRequests } from "../services/requestService";

export const requestRoutes = Router();

const createRequestSchema = z.object({
  studentId: z.string().trim().optional(),
  studentSca: z.string().trim().min(1),
  permissionType: z.enum(["read", "write"]),
  reason: z.string().trim().min(1),
});

requestRoutes.post("/", requireAuth, requireRole(["ADMIN", "REQUESTER"]), async (req, res) => {
  try {
    const parsed = createRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid request body.",
        details: parsed.error.issues,
      });
    }

    const { studentId, studentSca, permissionType, reason } = parsed.data;

    if (!req.auth) {
      return res.status(401).json({
        error: "Missing auth context.",
      });
    }

    const request = await createPermissionRequest({
      studentId,
      studentSca,
      permissionType,
      reason,
      organizationId: req.auth.organizationId,
      createdByUserId: req.auth.userId,
    });

    return res.status(201).json({ request });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Internal server error.",
    });
  }
});

requestRoutes.get(
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

      const result = await listPermissionRequests({
        organizationId: req.auth.organizationId,
        q: String(req.query.q ?? ""),
        status: String(req.query.status ?? ""),
        permissionType: String(req.query.permissionType ?? ""),
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
