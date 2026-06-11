/**
 * High-level wrapper used by the HTTP gateway.
 *
 * The class keeps the public API expected by the route handlers, while the
 * actual blockchain reads, permission operations, and mapping helpers live in
 * smaller service modules.
 */

import type { CredentialsResponse, AllPermissionsForStudent } from "./types";
import { getStudentWalletFromCredentials } from "./auth/studentWallet";
import {
  getStudentSmartAccount,
  mapStudentPayload,
  readStudentInfoAsOwner,
} from "./services/studentReader";
import {
  getAllPermissionsForStudent,
  grantPermissionAsStudent,
  revokePermissionAsStudent,
} from "./services/permissionService";
import type { PermissionGrantKind } from "./contracts/studentContractAbis";

export { InvalidCredentialsError } from "./errors";

/**
 * High-level client used by route handlers to interact with EduWallet.
 */
export class EduWalletClient {
  /**
   * Reconstructs the student's externally owned wallet from ID and password.
   */
  getStudentWalletFromCredentials = getStudentWalletFromCredentials;

  /**
   * Authenticates a student and loads their academic data.
   */
  async loginStudent(id: string, password: string): Promise<CredentialsResponse> {
    const studentWallet = this.getStudentWalletFromCredentials(id, password);
    const studentSca = await getStudentSmartAccount(studentWallet);
    const rawStudentInfo = await readStudentInfoAsOwner(studentWallet, studentSca);
    const student = await mapStudentPayload(rawStudentInfo);

    return {
      id,
      studentSca,
      student,
    };
  }

  /**
   * Returns the student's full multi-university permission view.
   */
  async getAllPermissionsAsStudent(
    id: string,
    password: string,
    studentSca: string,
  ): Promise<AllPermissionsForStudent> {
    if (!id || !password) {
      throw new Error("id and password are required");
    }

    if (!studentSca) {
      throw new Error("studentSca is required");
    }

    const studentWallet = this.getStudentWalletFromCredentials(id, password);
    return getAllPermissionsForStudent(studentWallet, studentSca);
  }

  /**
   * Grants view or update/write access to a university.
   */
  async grantPermissionAsStudent(
    id: string,
    password: string,
    studentSca: string,
    kind: PermissionGrantKind,
    targetUniversity: string | undefined,
  ): Promise<void> {
    if (!id || !password) {
      throw new Error("id and password are required");
    }

    const studentWallet = this.getStudentWalletFromCredentials(id, password);

    await grantPermissionAsStudent(studentWallet, studentSca, kind, targetUniversity);
  }

  /**
   * Revokes a university's access to the student smart account.
   */
  async revokePermissionAsStudent(
    id: string,
    password: string,
    studentSca: string,
    targetUniversity: string | undefined,
  ): Promise<void> {
    if (!id || !password) {
      throw new Error("id and password are required");
    }

    const studentWallet = this.getStudentWalletFromCredentials(id, password);

    await revokePermissionAsStudent(studentWallet, studentSca, targetUniversity);
  }
}
