import type { Credentials } from "../models/student";
import type {
  CredentialsResponse,
  PermissionStatus,
  AllPermissionsForStudent,
} from "../../../shared/apiTypes";
import { createGatewayClient } from "../../../shared/clientApi";

/**
 * Base URL for the EduWallet HTTP gateway as seen from the browser
 * extension. Read from Vite config but falls back to localhost to
 * match the original prototype.
 */
export const GATEWAY_BASE_URL =
  import.meta.env.VITE_GATEWAY_BASE_URL ?? "http://localhost:3000";

/**
 * Thin HTTP client shared between extension and mobile app.
 * All functions below are small wrappers that adapt from the
 * extension's internal models to the shared gateway types.
 */
const client = createGatewayClient(GATEWAY_BASE_URL);

// -------- Low-level HTTP helpers (no React / no models) --------

/**
 * Logs in a student via the gateway using their credentials.
 *
 * This replaces the original on-chain login flow that reconstructed
 * the wallet directly in the browser extension.
 *
 * @param credentials - Student ID and password
 * @returns Structured login response including profile, results and
 *          optionally the multi-university permissions snapshot
 */
export async function gatewayLogIn(
  credentials: Credentials
): Promise<CredentialsResponse> {
  // Just adapt from Credentials → (id, password)
  return client.logIn(credentials.id, credentials.password);
}

/**
 * Retrieves the multi-university permissions view for a student.
 *
 * This is mainly a fallback helper – in the current design the
 * extension typically uses the `allPermissions` snapshot returned
 * at login instead of calling this endpoint again.
 *
 * @param studentSca - Smart contract account address of the student
 * @param id - Student identifier used for login
 * @param password - Student password used to reconstruct the wallet
 * @returns AllPermissionsForStudent structure with one entry per university
 */
export async function gatewayGetPermissions(
  studentSca: string,
  id: string,
  password: string
): Promise<AllPermissionsForStudent> {
  return client.getPermissions(studentSca, id, password);
}

/**
 * Revokes this university's permission on the student's smart account.
 *
 * The gateway reconstructs the student wallet from id + password and
 * sends an ERC-4337 user operation that calls Student.revokePermission.
 *
 * @param studentSca - Student smart account address
 * @param id - Student identifier
 * @param password - Student password
 * @param universityAddress - Optional specific university to revoke; if
 *                            omitted, the gateway may fall back to a
 *                            default university (not recommended)
 * @returns Updated per-university permission status as seen by the gateway
 */
export async function gatewayRevokePermissions(
  studentSca: string,
  id: string,
  password: string,
  universityAddress?: string
): Promise<PermissionStatus> {
  return client.revokePermission(studentSca, id, password, universityAddress);
}

/**
 * Accepts a pending permission request (read or write) for this student.
 *
 * The gateway again acts as the student by reconstructing the wallet
 * and sending a user operation to Student.grantPermission.
 *
 * @param studentSca - Student smart account address
 * @param id - Student identifier
 * @param password - Student password
 * @param type - Permission type to grant ("read" or "write")
 * @param universityAddress - Optional explicit university to grant to
 * @returns Updated per-university permission status
 */
export async function gatewayGrantPermission(
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
