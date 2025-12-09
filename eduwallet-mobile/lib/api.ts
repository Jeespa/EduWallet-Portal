// app/lib/api.ts
import type {
  CredentialsResponse,
  PermissionStatus,
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

// --- login helper -------------------------------------------------

/**
 * Perform a student login against the gateway.
 *
 * The gateway reconstructs the student wallet from id + password and
 * returns profile data, course results and optionally a permissions snapshot.
 *
 * @param id - Student identifier as used during registration
 * @param password - Student password
 * @returns Structured login response from the gateway
 */
export async function login(
  id: string,
  password: string
): Promise<CredentialsResponse> {
  return client.logIn(id, password);
}

// --- permissions helpers ------------------------------------------

/**
 * Retrieve the multi-university permissions view for a student.
 *
 * In the mobile app this is usually called after a change to refresh
 * the list, or as a fallback if the login snapshot is missing.
 *
 * @param studentSca - Student smart contract account address
 * @param id - Student identifier
 * @param password - Student password
 * @returns AllPermissionsForStudent structure for the given student
 */
export async function getPermissions(
  studentSca: string,
  id: string,
  password: string
): Promise<AllPermissionsForStudent> {
  return client.getPermissions(studentSca, id, password);
}

/**
 * Revoke this university's permission on the student's smart account.
 *
 * The gateway acts as the student by reconstructing the wallet and
 * sending an ERC-4337 user operation to Student.revokePermission.
 *
 * @param studentSca - Student smart account address
 * @param id - Student identifier
 * @param password - Student password
 * @param universityAddress - Optional explicit university address to revoke
 * @returns Updated per-university permission status
 */
export async function revokePermission(
  studentSca: string,
  id: string,
  password: string,
  universityAddress?: string
): Promise<PermissionStatus> {
  return client.revokePermission(studentSca, id, password, universityAddress);
}

/**
 * Accept a pending permission request (read or write) for this student.
 *
 * The gateway reconstructs the student's wallet and calls
 * Student.grantPermission with the requested role.
 *
 * @param studentSca - Student smart account address
 * @param id - Student identifier
 * @param password - Student password
 * @param type - Permission type to grant ("read" or "write")
 * @param universityAddress - Optional explicit university address to grant to
 * @returns Updated per-university permission status
 */
export async function grantPermission(
  studentSca: string,
  id: string,
  password: string,
  type: "read" | "write",
  universityAddress?: string
): Promise<PermissionStatus> {
  return client.grantPermission(
    studentSca,
    id,
    password,
    type,
    universityAddress
  );
}
