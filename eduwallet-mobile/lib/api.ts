// app/lib/api.ts
import type {
  CredentialsResponse,
  AllPermissionsForStudent,
} from "../types";
import { createGatewayClient } from "shared/clientApi";

/**
 * Base URL for the EduWallet HTTP gateway as seen from the mobile app.
 * Read from Expo config, with a localhost fallback for development.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_GATEWAY_BASE_URL ?? "http://localhost:3000";

/**
 * Thin HTTP client shared between browser extension and mobile app.
 * All functions below are simple wrappers around this client.
 */
const client = createGatewayClient(API_BASE_URL);

type GatewayActionStatus = {
  status: "ok";
};

// --- login helper -------------------------------------------------

/**
 * Perform a student login against the gateway.
 *
 * The gateway reconstructs the student wallet from id + password and
 * returns profile data, course results, optionally a permissions snapshot,
 * and a temporary student session token.
 *
 * The mobile app should use that session token for permission refresh,
 * approve, and revoke actions instead of asking for the password again.
 *
 * @param id - Student identifier as used during registration
 * @param password - Student password
 * @returns Structured login response from the gateway
 */
export async function login(
  id: string,
  password: string,
): Promise<CredentialsResponse> {
  return client.logIn(id, password);
}

// --- token-based permissions helpers ------------------------------

/**
 * Retrieve the multi-university permissions view using the temporary gateway
 * session token returned by login.
 *
 * @param studentSca - Student smart account address
 * @param sessionToken - Temporary gateway session token from login
 * @returns AllPermissionsForStudent structure for the given student
 */
export async function getPermissionsWithSession(
  studentSca: string,
  sessionToken: string,
): Promise<AllPermissionsForStudent> {
  return client.getPermissionsWithToken(studentSca, sessionToken);
}

/**
 * Revoke an organization's permission using the temporary gateway session token.
 *
 * @param studentSca - Student smart account address
 * @param sessionToken - Temporary gateway session token from login
 * @param universityAddress - Optional explicit organization smart account address to revoke
 * @returns Gateway acknowledgement
 */
export async function revokePermissionWithSession(
  studentSca: string,
  sessionToken: string,
  universityAddress?: string,
): Promise<GatewayActionStatus> {
  return client.revokePermissionWithToken(
    studentSca,
    sessionToken,
    universityAddress,
  );
}

/**
 * Accept a pending permission request using the temporary gateway session token.
 *
 * @param studentSca - Student smart account address
 * @param sessionToken - Temporary gateway session token from login
 * @param type - Permission type to grant ("read" or "write")
 * @param universityAddress - Optional explicit organization smart account address to grant to
 * @returns Gateway acknowledgement
 */
export async function grantPermissionWithSession(
  studentSca: string,
  sessionToken: string,
  type: "read" | "write",
  universityAddress?: string,
): Promise<GatewayActionStatus> {
  return client.grantPermissionWithToken(
    studentSca,
    sessionToken,
    type,
    universityAddress,
  );
}

// --- error handling ------------------------------------------------

function getRawErrorMessage(error: unknown): string {
  try {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === "string") {
      return error;
    }

    return JSON.stringify(error) ?? "";
  } catch {
    return "";
  }
}

/**
 * Convert technical gateway / blockchain / fetch errors into messages that
 * are readable for the mobile app user.
 */
export function getFriendlyApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const rawMessage = getRawErrorMessage(error);
  const message = rawMessage.toLowerCase();

  if (
    message.includes("network request failed") ||
    message.includes("failed to fetch") ||
    message.includes("fetch failed") ||
    message.includes("networkerror") ||
    message.includes("network")
  ) {
    return "Could not connect to EduWallet. Please check that the gateway is running.";
  }

  if (
    message.includes("student session") ||
    message.includes("session token") ||
    message.includes("session is missing") ||
    message.includes("session is invalid") ||
    message.includes("session expired") ||
    message.includes("expired")
  ) {
    return "Your EduWallet session has expired. Please log in again.";
  }

  if (
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("invalid credentials") ||
    message.includes("invalid student") ||
    message.includes("incorrect password") ||
    message.includes("wrong password") ||
    message.includes("authentication") ||
    message.includes("credential") ||
    message.includes("password") ||
    message.includes("signature") ||
    message.includes("execution reverted") ||
    message.includes("call exception") ||
    message.includes("failed to retrieve permissions") ||
    message.includes("failed to load permissions") ||
    message.includes("401") ||
    message.includes("403")
  ) {
    return "Incorrect password. Please try again.";
  }

  if (
    message.includes("sender doesn't have enough funds") ||
    message.includes("insufficient funds") ||
    message.includes("balance is: 0")
  ) {
    return "Could not complete the request because the local demo wallet has no funds. Restart the demo setup and try again.";
  }

  return fallback;
}
