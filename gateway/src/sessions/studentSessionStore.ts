/**
 * Temporary in-memory session store for student gateway sessions.
 *
 * The current EduWallet prototype still needs the student's password when it
 * reconstructs the owner wallet for account-abstraction operations. To avoid
 * asking the mobile user for the password for every permission action, the
 * gateway stores the password only in this process-local, expiring session map.
 *
 * This is suitable for the local thesis prototype, but it is not a production
 * authentication design. A production version should use a stronger session or
 * signing model where the gateway does not keep reusable student secrets.
 */

import { randomBytes } from "node:crypto";
import type { Request } from "express";

export type StudentGatewaySession = {
  id: string;
  password: string;
  studentSca: string;
  expiresAt: number;
};

export type StudentCredentials = {
  id: string;
  password: string;
  studentSca: string;
  source: "session" | "body";
};

const STUDENT_SESSION_TTL_MS = Number(process.env.STUDENT_SESSION_TTL_MS ?? 2 * 60 * 60 * 1000);

const STUDENT_SESSION_CLEANUP_MS = Number(process.env.STUDENT_SESSION_CLEANUP_MS ?? 10 * 60 * 1000);

const studentSessions = new Map<string, StudentGatewaySession>();

export function createStudentSession(input: { id: string; password: string; studentSca: string }) {
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

function getBearerToken(req: Request) {
  const header = req.header("authorization");

  if (!header) return null;

  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export function getStudentSession(
  req: Request,
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

  if (expectedStudentSca && session.studentSca.toLowerCase() !== expectedStudentSca.toLowerCase()) {
    return null;
  }

  return session;
}

export function getStudentCredentialsFromRequest(
  req: Request,
  expectedStudentSca: string,
): StudentCredentials | null {
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

export function cleanupExpiredStudentSessions(now = Date.now()) {
  for (const [token, session] of studentSessions.entries()) {
    if (now > session.expiresAt) {
      studentSessions.delete(token);
    }
  }
}

export function startStudentSessionCleanup(intervalMs = STUDENT_SESSION_CLEANUP_MS) {
  const timer = setInterval(() => {
    cleanupExpiredStudentSessions();
  }, intervalMs);

  if (typeof timer.unref === "function") {
    timer.unref();
  }

  return timer;
}
