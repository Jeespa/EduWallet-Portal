/**
 * EduWalletClient
 *
 * This module provides a high level TypeScript wrapper around the EduWallet
 * smart contracts for use by the HTTP gateway. It reconstructs the student's
 * owner wallet from ID and password, reads on chain data via the student
 * smart account, and performs permission changes via account abstraction.
 */
import { Wallet } from "ethers";
import type { CredentialsResponse, AllPermissionsForStudent } from "./types";
type PermissionGrantKind = "read" | "write";
/**
 * High level client used by the HTTP gateway to interact with EduWallet.
 *
 * This class:
 *  - Reconstructs the student owner wallet from ID and password.
 *  - Looks up the student smart account via StudentsRegister.
 *  - Reads student data via `executeViewCall` on the student account.
 *  - Performs permission changes via account abstraction user operations.
 */
export declare class EduWalletClient {
    /**
     * Reads full student information via the student smart account
     * as the student owner.
     *
     * Internally encodes a call to `getStudentInfo` and wraps it in
     * `executeViewCall` on the Student contract. This does not depend
     * on any university permissions.
     *
     * @param studentWallet - Wallet reconstructed from student credentials.
     * @param studentSca - Address of the student smart account.
     * @returns Basic student information and the list of raw course results.
     * @throws {Error} If the smart account address is invalid or the call fails.
     */
    private readStudentInfoAsOwner;
    /**
     * Reads all permission sets for a student via `getPermissions` calls
     * on the student smart account as the student owner.
     *
     * This method uses `executeViewCall` to query:
     *  - R roles (read)
     *  - W roles (write)
     *  - read applicants
     *  - write applicants
     *
     * @param studentWallet - Wallet reconstructed from student credentials.
     * @param studentSca - Address of the student smart account.
     * @returns Arrays of university addresses grouped by permission type.
     * @throws {Error} If the smart account address is invalid or the calls fail.
     */
    private readAllPermissionsAsOwner;
    /**
     * Returns a full multi university view of permissions for a student.
     *
     * The method:
     *  - Reconstructs the student's owner wallet from ID and password.
     *  - Reads role based permission lists via `readAllPermissionsAsOwner`.
     *  - Fetches university metadata for all distinct addresses.
     *  - Produces an `AllPermissionsForStudent` payload for the HTTP API.
     *
     * @param id - Student identifier used in the credential scheme.
     * @param password - Student password used to derive the owner key.
     * @param studentSca - Address of the student smart account.
     * @returns Multi university permissions view for the student.
     * @throws {Error} If credentials are missing or blockchain calls fail.
     */
    getAllPermissionsAsStudent(id: string, password: string, studentSca: string): Promise<AllPermissionsForStudent>;
    /**
     * Reconstructs the student's externally owned wallet from ID and password.
     *
     * This uses the same PBKDF2 based derivation as the original EduWallet
     * implementation so that the owner key is deterministic for a given
     * (id, password) pair.
     *
     * @param id - Student identifier as issued by the university.
     * @param password - Secret credential chosen or assigned to the student.
     * @returns A Wallet instance that can sign user operations for the student.
     * @throws {Error} If either parameter is missing.
     */
    getStudentWalletFromCredentials(id: string, password: string): Wallet;
    /**
     * Authenticates a student and loads their academic data.
     *
     * Steps:
     *  1. Derive the student owner wallet from ID and password.
     *  2. Look up the student smart account via StudentsRegister.
     *  3. Read the student's basic information and results via `executeViewCall`.
     *  4. Map on chain tuples into a normalized `CredentialsResponse` payload.
     *
     * This method is called by the HTTP gateway in the `/auth/login` endpoint.
     *
     * @param id - Student identifier.
     * @param password - Student password.
     * @returns Normalized credentials and student data for use by clients.
     * @throws {Error} If the student smart account is not found or calls fail.
     */
    loginStudent(id: string, password: string): Promise<CredentialsResponse>;
    /**
     * Grants read or write permission to a specific university on a student's
     * smart account by acting as the student.
     *
     * This method:
     *  - Reconstructs the student owner wallet from ID and password.
     *  - Encodes a `grantPermission` call on the Student contract.
     *  - Wraps it in an ERC-4337 style user operation and submits it.
     *
     * The target university address must be provided explicitly, which allows
     * the gateway to remain stateless with respect to "current university".
     *
     * @param id - Student identifier.
     * @param password - Student password.
     * @param studentSCA - Address of the student smart account.
     * @param kind - Permission kind to grant (`"read"` or `"write"`).
     * @param targetUniversity - University smart account address that should receive the permission.
     * @throws {Error} If inputs are missing or the on chain transaction fails.
     */
    grantPermissionAsStudent(id: string, password: string, studentSCA: string, kind: PermissionGrantKind, targetUniversity: string | undefined): Promise<void>;
    /**
     * Revokes a university's permission on a student's smart account
     * by acting as the student.
     *
     * This method:
     *  - Reconstructs the student owner wallet from ID and password.
     *  - Encodes a `revokePermission` call on the Student contract.
     *  - Wraps it in an ERC-4337 style user operation and submits it.
     *
     * The university to revoke must be provided explicitly.
     *
     * @param id - Student identifier.
     * @param password - Student password.
     * @param studentSCA - Address of the student smart account.
     * @param targetUniversity - University smart account address whose permission should be revoked.
     * @throws {Error} If inputs are missing or the on chain transaction fails.
     */
    revokePermissionAsStudent(id: string, password: string, studentSCA: string, targetUniversity: string | undefined): Promise<void>;
}
export {};
//# sourceMappingURL=eduwalletClient.d.ts.map