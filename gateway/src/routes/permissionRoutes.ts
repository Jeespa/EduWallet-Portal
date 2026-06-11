import { Router } from "express";
import { EduWalletClient } from "../eduwalletClient";
import {
  getStudentCredentialsFromRequest,
  getStudentSession,
} from "../sessions/studentSessionStore";

export function createPermissionRouter(client: EduWalletClient) {
  const router = Router();

  /**
   * GET /students/:studentSca/permissions
   *
   * Token-based permissions view used by the mobile app after login.
   */
  router.get("/students/:studentSca/permissions", async (req, res) => {
    try {
      const { studentSca } = req.params;

      if (!studentSca) {
        return res.status(400).json({ error: "studentSca is required" });
      }

      const session = getStudentSession(req, studentSca);

      if (!session) {
        return res.status(401).json({
          error:
            "Student session is missing, expired, or does not match this student",
        });
      }

      const payload = await client.getAllPermissionsAsStudent(
        session.id,
        session.password,
        studentSca,
      );

      res.json(payload);
    } catch (err: any) {
      console.error("Failed to get ALL permissions", err);
      res.status(500).json({
        error: err?.message || "Failed to get complete permission information",
      });
    }
  });

  /**
   * POST /students/:studentSca/permissions
   *
   * Backwards-compatible permissions view. It accepts either id/password in
   * the body or Authorization: Bearer <sessionToken>.
   */
  router.post("/students/:studentSca/permissions", async (req, res) => {
    try {
      const { studentSca } = req.params;

      if (!studentSca) {
        return res.status(400).json({ error: "studentSca is required" });
      }

      const credentials = getStudentCredentialsFromRequest(req, studentSca);

      if (!credentials) {
        return res.status(401).json({
          error:
            "Student credentials or a valid student session token are required",
        });
      }

      const payload = await client.getAllPermissionsAsStudent(
        credentials.id,
        credentials.password,
        studentSca,
      );

      res.json(payload);
    } catch (err: any) {
      console.error("Failed to get ALL permissions", err);
      res.status(500).json({
        error: err?.message || "Failed to get complete permission information",
      });
    }
  });

  /**
   * POST /students/:studentSca/permissions/revoke
   *
   * Revokes a specific university's permission on the student smart account.
   * Frontends should refresh the full permissions list afterwards.
   */
  router.post("/students/:studentSca/permissions/revoke", async (req, res) => {
    try {
      const { studentSca } = req.params;
      const { universityAddress } = req.body as {
        universityAddress?: string;
      };

      if (!studentSca) {
        return res.status(400).json({ error: "studentSca is required" });
      }

      const credentials = getStudentCredentialsFromRequest(req, studentSca);

      if (!credentials) {
        return res.status(401).json({
          error:
            "Student credentials or a valid student session token are required to revoke permission",
        });
      }

      await client.revokePermissionAsStudent(
        credentials.id,
        credentials.password,
        studentSca,
        universityAddress,
      );

      res.json({ status: "ok" });
    } catch (err: any) {
      console.error("Failed to revoke permission", err);
      res
        .status(500)
        .json({ error: err?.message || "Failed to revoke permission" });
    }
  });

  /**
   * POST /students/:studentSca/permissions/grant
   *
   * Accepts a pending permission request or grants a new permission for a
   * university on the student smart account. Frontends should refresh the full
   * permissions list afterwards.
   */
  router.post("/students/:studentSca/permissions/grant", async (req, res) => {
    try {
      const { studentSca } = req.params;
      const { type, universityAddress } = req.body as {
        type?: "read" | "write";
        universityAddress?: string;
      };

      if (!studentSca) {
        return res.status(400).json({ error: "studentSca is required" });
      }

      const credentials = getStudentCredentialsFromRequest(req, studentSca);

      if (!credentials) {
        return res.status(401).json({
          error:
            "Student credentials or a valid student session token are required to grant permission",
        });
      }

      if (type !== "read" && type !== "write") {
        return res
          .status(400)
          .json({ error: "type must be 'read' or 'write'" });
      }

      await client.grantPermissionAsStudent(
        credentials.id,
        credentials.password,
        studentSca,
        type,
        universityAddress,
      );

      res.json({ status: "ok" });
    } catch (err: any) {
      console.error("Failed to grant permission", err);
      res
        .status(500)
        .json({ error: err?.message || "Failed to grant permission" });
    }
  });

  return router;
}
