import { Router } from "express";
import { EduWalletClient, InvalidCredentialsError } from "../eduwalletClient";
import { createStudentSession } from "../sessions/studentSessionStore";
import type { CredentialsResponse } from "../types";

export function createAuthRouter(client: EduWalletClient) {
  const router = Router();

  /**
   * POST /auth/login
   *
   * Authenticates a student by ID and password, reconstructs their smart
   * account, and returns a CredentialsResponse payload. On success, the
   * gateway also returns a temporary session token for mobile permission
   * refresh / grant / revoke actions during the current session.
   */
  router.post("/auth/login", async (req, res) => {
    try {
      const { id, password } = req.body || {};

      if (!id || !password) {
        return res.status(400).json({ error: "Missing id or password" });
      }

      const payload: CredentialsResponse = await client.loginStudent(id, password);

      try {
        const allPermissions = await client.getAllPermissionsAsStudent(
          id,
          password,
          payload.studentSca,
        );
        payload.allPermissions = allPermissions;
      } catch (permErr) {
        console.error("Failed to load all permissions at login:", permErr);
        // The permissions snapshot is optional. The core login response is still valid.
      }

      const session = createStudentSession({
        id,
        password,
        studentSca: payload.studentSca,
      });

      res.json({
        ...payload,
        sessionToken: session.token,
        sessionExpiresAt: new Date(session.expiresAt).toISOString(),
      });
    } catch (err: any) {
      console.error("Error in /auth/login:", err);

      if (err instanceof InvalidCredentialsError) {
        return res.status(401).json({
          error: "Invalid ID or password, or student is not registered",
        });
      }

      return res.status(500).json({
        error: "Login failed due to an internal error. Please try again later.",
      });
    }
  });

  return router;
}
