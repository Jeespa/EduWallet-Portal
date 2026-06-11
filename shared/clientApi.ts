// shared/clientApi.ts

/**
 * Shared HTTP client for the EduWallet gateway.
 *
 * This module exports a small factory that creates a thin wrapper around the
 * REST API exposed by the Node.js gateway. Both the browser extension and
 * the mobile app use this client instead of duplicating fetch logic.
 */

import type {
  CredentialsResponse,
  PermissionStatus,
  AllPermissionsForStudent,
  ErrorResponse,
} from "./apiTypes";

type GatewayActionStatus = {
  status: "ok";
};

/**
 * Parses an HTTP response as JSON and throws a descriptive error
 * if the status code indicates failure.
 *
 * All gateway client methods delegate error handling to this helper so that
 * frontends receive consistent error messages.
 *
 * @param res - Fetch response from a gateway endpoint.
 * @param defaultMessage - Fallback error message if the response does not contain a JSON error payload.
 * @returns Parsed JSON body typed as `T`.
 * @throws {Error} If `res.ok` is false.
 */
async function parseJsonOrThrow<T>(res: Response, defaultMessage: string): Promise<T> {
  const json = (await res.json().catch(() => null)) as T | ErrorResponse | null;

  if (!res.ok) {
    throw new Error((json as ErrorResponse | null)?.error || defaultMessage);
  }

  return json as T;
}

function sessionHeaders(sessionToken: string) {
  return {
    Authorization: `Bearer ${sessionToken}`,
  };
}

/**
 * Factory that creates a gateway client bound to a specific base URL.
 *
 * The returned object provides high level methods that hide HTTP details:
 *  - `logIn` for student authentication.
 *  - `getPermissions` for the legacy password-based multi university permissions view.
 *  - `getPermissionsWithToken` for the session-token based permissions view.
 *  - `revokePermission` and `grantPermission` for legacy password-based permission changes.
 *  - `revokePermissionWithToken` and `grantPermissionWithToken` for session-token based permission changes.
 *
 * @param baseUrl - Base URL of the EduWallet gateway (without trailing slash).
 * @returns An object with typed methods for calling the gateway.
 */
export function createGatewayClient(baseUrl: string) {
  // Strip trailing slashes to avoid double slash in URLs
  const BASE = baseUrl.replace(/\/+$/, "");

  return {
    /**
     * Logs a student in via `/auth/login`.
     *
     * The gateway reconstructs the student owner wallet from `id` and `password`,
     * finds the student smart account, and returns normalized credentials and
     * course results.
     *
     * Newer gateway versions also include:
     *  - `sessionToken`
     *  - `sessionExpiresAt`
     *
     * The shared `CredentialsResponse` type is updated separately so older
     * clients can keep using this method without changing immediately.
     *
     * @param id - Student identifier.
     * @param password - Student password.
     * @returns Credentials and student data for use by the client.
     * @throws {Error} If authentication fails or the gateway returns an error.
     */
    async logIn(id: string, password: string): Promise<CredentialsResponse> {
      const res = await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password }),
      });

      return parseJsonOrThrow<CredentialsResponse>(res, `Login failed (${res.status})`);
    },

    /**
     * Returns a multi university permissions view using a temporary
     * student gateway session token returned by `/auth/login`.
     *
     * This is the preferred mobile-app flow because the app does not have to
     * ask for, store, or resend the student password for each permission action.
     *
     * @param studentSca - Address of the student smart account.
     * @param sessionToken - Temporary student session token from login.
     * @returns An `AllPermissionsForStudent` object with entries per university.
     * @throws {Error} If the gateway call fails or the session is invalid/expired.
     */
    async getPermissionsWithToken(
      studentSca: string,
      sessionToken: string,
    ): Promise<AllPermissionsForStudent> {
      const res = await fetch(`${BASE}/students/${studentSca}/permissions`, {
        method: "GET",
        headers: sessionHeaders(sessionToken),
      });

      return parseJsonOrThrow<AllPermissionsForStudent>(res, "Failed to fetch permissions");
    },

    /**
     * Returns a multi university permissions view for the given student.
     *
     * Calls `POST /students/{sca}/permissions` on the gateway, which uses the
     * student credentials to read all role based permissions directly from
     * the student smart account.
     *
     * This legacy method is kept for backwards compatibility. New mobile
     * clients should prefer `getPermissionsWithToken`.
     *
     * @param studentSca - Address of the student smart account.
     * @param id - Student identifier.
     * @param password - Student password.
     * @returns An `AllPermissionsForStudent` object with entries per university.
     * @throws {Error} If the gateway call fails or validation fails.
     */
    async getPermissions(
      studentSca: string,
      id: string,
      password: string,
    ): Promise<AllPermissionsForStudent> {
      const res = await fetch(`${BASE}/students/${studentSca}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password }),
      });

      return parseJsonOrThrow<AllPermissionsForStudent>(res, "Failed to fetch permissions");
    },

    /**
     * Revokes this university's permission on a student's smart account
     * using a temporary student gateway session token.
     *
     * @param studentSca - Address of the student smart account.
     * @param sessionToken - Temporary student session token from login.
     * @param universityAddress - Optional explicit university smart account address.
     * @returns `{ status: "ok" }` when the operation has been submitted.
     * @throws {Error} If the gateway call or on-chain transaction fails.
     */
    async revokePermissionWithToken(
      studentSca: string,
      sessionToken: string,
      universityAddress?: string,
    ): Promise<GatewayActionStatus> {
      const res = await fetch(`${BASE}/students/${studentSca}/permissions/revoke`, {
        method: "POST",
        headers: {
          ...sessionHeaders(sessionToken),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ universityAddress }),
      });

      return parseJsonOrThrow<GatewayActionStatus>(res, "Failed to revoke permission");
    },

    /**
     * Revokes this university's permission on a student's smart account.
     *
     * The gateway uses the provided student credentials to execute a
     * `revokePermission` call via account abstraction.
     *
     * This legacy method is kept for backwards compatibility. New mobile
     * clients should prefer `revokePermissionWithToken`.
     *
     * @param studentSca - Address of the student smart account.
     * @param id - Student identifier.
     * @param password - Student password.
     * @param universityAddress - Optional explicit university smart account address.
     * @returns Updated `PermissionStatus` for the relevant university.
     * @throws {Error} If the gateway call or on chain transaction fails.
     */
    async revokePermission(
      studentSca: string,
      id: string,
      password: string,
      universityAddress?: string,
    ): Promise<PermissionStatus> {
      const res = await fetch(`${BASE}/students/${studentSca}/permissions/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password, universityAddress }),
      });

      return parseJsonOrThrow<PermissionStatus>(res, "Failed to revoke permission");
    },

    /**
     * Accepts a pending permission request for this university or grants
     * a new permission on the student's smart account using a temporary
     * student gateway session token.
     *
     * @param studentSca - Address of the student smart account.
     * @param sessionToken - Temporary student session token from login.
     * @param type - Permission kind to grant (`"read"` or `"write"`).
     * @param universityAddress - Optional explicit university smart account address.
     * @returns `{ status: "ok" }` when the operation has been submitted.
     * @throws {Error} If the gateway call or on-chain transaction fails.
     */
    async grantPermissionWithToken(
      studentSca: string,
      sessionToken: string,
      type: "read" | "write",
      universityAddress?: string,
    ): Promise<GatewayActionStatus> {
      const res = await fetch(`${BASE}/students/${studentSca}/permissions/grant`, {
        method: "POST",
        headers: {
          ...sessionHeaders(sessionToken),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type, universityAddress }),
      });

      return parseJsonOrThrow<GatewayActionStatus>(res, "Failed to grant permission");
    },

    /**
     * Accepts a pending permission request for this university or grants
     * a new permission on the student's smart account.
     *
     * The gateway uses the student credentials to execute a
     * `grantPermission` call via account abstraction.
     *
     * This legacy method is kept for backwards compatibility. New mobile
     * clients should prefer `grantPermissionWithToken`.
     *
     * @param studentSca - Address of the student smart account.
     * @param id - Student identifier.
     * @param password - Student password.
     * @param type - Permission kind to grant (`"read"` or `"write"`).
     * @param universityAddress - Optional explicit university smart account address.
     * @returns Updated `PermissionStatus` for the relevant university.
     * @throws {Error} If the gateway call or on chain transaction fails.
     */
    async grantPermission(
      studentSca: string,
      id: string,
      password: string,
      type: "read" | "write",
      universityAddress?: string,
    ): Promise<PermissionStatus> {
      const res = await fetch(`${BASE}/students/${studentSca}/permissions/grant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password, type, universityAddress }),
      });

      return parseJsonOrThrow<PermissionStatus>(res, "Failed to grant permission");
    },
  };
}
