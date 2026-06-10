/**
 * EduWallet HTTP gateway entry point.
 *
 * This module sets up an Express server that exposes a small REST API
 * on top of the EduWallet smart contracts. It delegates all blockchain
 * interactions to `EduWalletClient`, so that browser and mobile clients
 * can use a simple JSON interface instead of embedding the SDK.
 */

import express from "express";
import cors from "cors";
import { randomBytes } from "node:crypto";
import { EduWalletClient, InvalidCredentialsError } from "./eduwalletClient";

// shared types
import type { CredentialsResponse } from "./types";
import { GATEWAY_PORT } from "./config";

const app = express();
const PORT = GATEWAY_PORT || 3000;

// Global middleware
app.use(cors());
app.use(express.json());

/**
 * Single shared instance of the EduWallet blockchain client.
 * All HTTP handlers use this object to talk to the contracts.
 */
const client = new EduWalletClient();

// ---------------------------------------------------------------------------
// Student gateway sessions
// ---------------------------------------------------------------------------

type StudentGatewaySession = {
  id: string;
  password: string;
  studentSca: string;
  expiresAt: number;
};

const STUDENT_SESSION_TTL_MS = Number(
  process.env.STUDENT_SESSION_TTL_MS ?? 2 * 60 * 60 * 1000,
);

const studentSessions = new Map<string, StudentGatewaySession>();

function createStudentSession(input: {
  id: string;
  password: string;
  studentSca: string;
}) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + STUDENT_SESSION_TTL_MS;

  studentSessions.set(token, {
    id: input.id,
    password: input.password,
    studentSca: input.studentSca,
    expiresAt,
  });

  return {
    token,
    expiresAt,
  };
}

function getBearerToken(req: express.Request) {
  const header = req.header("authorization");

  if (!header) return null;

  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function getStudentSession(
  req: express.Request,
  expectedStudentSca?: string,
): StudentGatewaySession | null {
  const token = getBearerToken(req);

  if (!token) return null;

  const session = studentSessions.get(token);

  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    studentSessions.delete(token);
    return null;
  }

  if (
    expectedStudentSca &&
    session.studentSca.toLowerCase() !== expectedStudentSca.toLowerCase()
  ) {
    return null;
  }

  return session;
}

function getStudentCredentialsFromRequest(
  req: express.Request,
  expectedStudentSca: string,
):
  | {
      id: string;
      password: string;
      studentSca: string;
      source: "session" | "body";
    }
  | null {
  const session = getStudentSession(req, expectedStudentSca);

  if (session) {
    return {
      id: session.id,
      password: session.password,
      studentSca: session.studentSca,
      source: "session",
    };
  }

  const { id, password } = (req.body || {}) as {
    id?: string;
    password?: string;
  };

  if (id && password) {
    return {
      id,
      password,
      studentSca: expectedStudentSca,
      source: "body",
    };
  }

  return null;
}

/**
 * Simple health check endpoint for monitoring and local debugging.
 * Returns a JSON object with a status field and a service identifier.
 */
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "eduwallet-gateway" });
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * POST /auth/login
 *
 * Authenticates a student by ID and password, reconstructs their smart account,
 * and returns a `CredentialsResponse` payload. On success, it also tries to
 * attach a full multi university permissions snapshot as `allPermissions`.
 *
 * On successful login the gateway also returns a temporary session token.
 * Mobile clients can use that token for permissions refresh / grant / revoke
 * during the current session instead of asking the student for the password
 * for every permission action.
 *
 * Request body:
 *   {
 *     "id": "student-id",
 *     "password": "secret"
 *   }
 *
 * Response body on success:
 *   CredentialsResponse (+ optional allPermissions)
 *   {
 *     ...credentials,
 *     "sessionToken": "temporary-token",
 *     "sessionExpiresAt": "2026-06-03T12:00:00.000Z"
 *   }
 */
app.post("/auth/login", async (req, res) => {
  try {
    const { id, password } = req.body || {};

    if (!id || !password) {
      return res.status(400).json({ error: "Missing id or password" });
    }

    // First: normal student login
    const payload: CredentialsResponse = await client.loginStudent(
      id,
      password,
    );

    // Attach all permissions for this student once at login time.
    // Clients may still refresh this later via /students/:sca/permissions.
    try {
      const allPermissions = await client.getAllPermissionsAsStudent(
        id,
        password,
        payload.studentSca,
      );
      (payload as any).allPermissions = allPermissions;
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

    // Hide internal details from clients; keep them in logs only.
    return res.status(500).json({
      error: "Login failed due to an internal error. Please try again later.",
    });
  }
});

// ---------------------------------------------------------------------------
// Permissions: multi university view and student actions
// ---------------------------------------------------------------------------

/**
 * GET /students/:studentSca/permissions
 *
 * Token-based version used by the mobile app after login.
 *
 * Request headers:
 *   Authorization: Bearer <sessionToken>
 *
 * Response body on success:
 *   AllPermissionsForStudent
 */
app.get("/students/:studentSca/permissions", async (req, res) => {
  try {
    const { studentSca } = req.params;

    if (!studentSca) {
      return res.status(400).json({ error: "studentSca is required" });
    }

    const session = getStudentSession(req, studentSca);

    if (!session) {
      return res.status(401).json({
        error: "Student session is missing, expired, or does not match this student",
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
 * Returns a full multi university permissions view for a given student.
 *
 * This endpoint remains backwards compatible with existing clients that post
 * id/password in the body. It also accepts Authorization: Bearer <sessionToken>,
 * which is the preferred mobile-app flow after login.
 *
 * Request params:
 *   :studentSca  Student smart account address
 *
 * Request body, legacy mode:
 *   {
 *     "id": "student-id",
 *     "password": "secret"
 *   }
 *
 * Response body on success:
 *   AllPermissionsForStudent
 */
app.post("/students/:studentSca/permissions", async (req, res) => {
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
 *
 * This endpoint remains backwards compatible with existing clients that post
 * id/password in the body. It also accepts Authorization: Bearer <sessionToken>,
 * which is the preferred mobile-app flow after login.
 *
 * Request params:
 *   :studentSca  Student smart account address
 *
 * Request body, legacy mode:
 *   {
 *     "id": "student-id",
 *     "password": "secret",
 *     "universityAddress": "0x..."
 *   }
 *
 * Request body, session-token mode:
 *   {
 *     "universityAddress": "0x..."
 *   }
 *
 * Response body on success:
 *   { "status": "ok" }
 *
 * Frontends are expected to refresh the full permissions list afterwards.
 */
app.post("/students/:studentSca/permissions/revoke", async (req, res) => {
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

    // Frontends re-fetch permissions via /students/:sca/permissions, so we just acknowledge.
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
 * Accepts a pending permission request or grants a new permission
 * for a university on the student smart account. The gateway acts
 * as the student and submits a `grantPermission` call via account abstraction.
 *
 * This endpoint remains backwards compatible with existing clients that post
 * id/password in the body. It also accepts Authorization: Bearer <sessionToken>,
 * which is the preferred mobile-app flow after login.
 *
 * Request params:
 *   :studentSca  Student smart account address
 *
 * Request body, legacy mode:
 *   {
 *     "id": "student-id",
 *     "password": "secret",
 *     "type": "read" | "write",
 *     "universityAddress": "0x..."
 *   }
 *
 * Request body, session-token mode:
 *   {
 *     "type": "read" | "write",
 *     "universityAddress": "0x..."
 *   }
 *
 * Response body on success:
 *   { "status": "ok" }
 *
 * Frontends are expected to refresh the full permissions list afterwards.
 */
app.post("/students/:studentSca/permissions/grant", async (req, res) => {
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

    // Frontends re-fetch permissions via /students/:sca/permissions, so we just acknowledge.
    res.json({ status: "ok" });
  } catch (err: any) {
    console.error("Failed to grant permission", err);
    res
      .status(500)
      .json({ error: err?.message || "Failed to grant permission" });
  }
});

/**
 * Starts the HTTP server on the configured port.
 */
app.listen(PORT, () => {
  console.log(`Gateway running on http://localhost:${PORT}`);
});
