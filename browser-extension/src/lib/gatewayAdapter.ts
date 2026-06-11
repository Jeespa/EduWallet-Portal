// src/gatewayAdapter.ts

/**
 * Browser extension adapter for the EduWallet HTTP gateway.
 *
 * This module replaces the earlier direct on chain integration. It:
 *  - Calls the gateway for login and permission changes.
 *  - Translates JSON responses into the existing `StudentModel` and `Permission` models.
 *  - Keeps the original extension code largely unchanged while using the new architecture.
 */

import type { Credentials } from "../models/student";
import { StudentModel } from "../models/student";
import UniversityModel from "../models/university";
import { logError } from "../utils/conf";
import { Permission, PermissionType } from "../models/permissions";
import { gatewayLogIn, gatewayRevokePermissions, gatewayGrantPermission } from "./api";

// ---------------- Permission helpers (adapter) ----------------

/**
 * Extracts permissions from the snapshot attached to the login response.
 *
 * The gateway attaches a multi university permissions view as
 * `allPermissions` on the login payload. That snapshot is stored on
 * `StudentModel` as `__rawFromGateway`. This function converts that
 * snapshot into the extension's `Permission[]` model.
 *
 * If the snapshot is missing for some reason, the function returns an
 * empty array instead of making additional HTTP calls.
 *
 * @param student - Authenticated student model that holds raw gateway data.
 * @returns List of permissions in the extension's internal format.
 * @throws {Error} If the student smart account address is missing.
 */
async function getRawPermissions(student: StudentModel): Promise<Permission[]> {
  const sca = student.accountAddress;
  if (!sca) {
    throw new Error("Student account address is missing");
  }

  const raw = (student as any).__rawFromGateway;
  const all = raw?.allPermissions;

  if (!all || !Array.isArray(all.permissions)) {
    // No permissions snapshot, treat as “no permissions”.
    return [];
  }

  const perms: Permission[] = [];

  for (const entry of all.permissions) {
    const uniLabel =
      entry.universityName && entry.universityShortName
        ? `${entry.universityName} (${entry.universityShortName})`
        : entry.universityShortName || entry.universityName || entry.universityAddress;

    // Attach the on chain address on a best effort basis so that revoke/grant
    // calls can target a specific university. The Permission model does not
    // explicitly include this field, so we store it via `as any`.
    if (entry.read) {
      perms.push({
        university: uniLabel,
        type: PermissionType.Read,
        request: false,
        universityAddress: entry.universityAddress,
      } as any);
    }
    if (entry.write) {
      perms.push({
        university: uniLabel,
        type: PermissionType.Write,
        request: false,
        universityAddress: entry.universityAddress,
      } as any);
    }
    if (entry.readRequested) {
      perms.push({
        university: uniLabel,
        type: PermissionType.Read,
        request: true,
        universityAddress: entry.universityAddress,
      } as any);
    }
    if (entry.writeRequested) {
      perms.push({
        university: uniLabel,
        type: PermissionType.Write,
        request: true,
        universityAddress: entry.universityAddress,
      } as any);
    }
  }

  return perms;
}

/**
 * Very simple university lookup for the extension.
 *
 * After the gateway changes, the `Permission.university` field already
 * contains a human readable label such as
 * "Norwegian University of Science and Technology (NTNU)".
 *
 * The extension's UI expects a `UniversityModel`, so this function
 * wraps the label into that class. Country and address fields are kept
 * as placeholders since the extension does not use them.
 *
 * @param label - Human readable university label.
 * @param _student - Unused, kept for backward compatibility.
 * @returns A UniversityModel instance suitable for the existing UI.
 */
async function getUniversity(label: string, _student?: StudentModel): Promise<UniversityModel> {
  return new UniversityModel(
    label, // name
    "Unknown country", // country (not used in the current UI)
    label, // shortName
    label, // "address"/id (also not used anymore)
  );
}

/**
 * Replacement for the previous on chain revokePermission call.
 *
 * The extension now calls the gateway endpoint
 * `POST /students/:sca/permissions/revoke` instead. The adapter extracts
 * the university smart account address from the Permission object when
 * possible and passes it through.
 *
 * @param student - Authenticated student model.
 * @param permission - Permission that should be revoked.
 * @param id - Student ID used for gateway authentication.
 * @param password - Student password used for gateway authentication.
 * @throws {Error} If the student account address is missing or the gateway call fails.
 */
async function revokePermission(
  student: StudentModel,
  permission: Permission,
  id: string,
  password: string,
): Promise<void> {
  const sca = student.accountAddress;
  if (!sca) {
    throw new Error("Student account address is missing");
  }

  const universityAddress = (permission as any).universityAddress as string | undefined;

  await gatewayRevokePermissions(sca, id, password, universityAddress);
}

/**
 * Replacement for the previous on chain grantPermission call.
 *
 * The extension now calls the gateway endpoint
 * `POST /students/:sca/permissions/grant`. The adapter maps the
 * PermissionType enum to string literals "read" or "write" and passes
 * the underlying university address when it is available.
 *
 * @param student - Authenticated student model.
 * @param permission - Permission that should be granted or accepted.
 * @param id - Student ID used for gateway authentication.
 * @param password - Student password used for gateway authentication.
 * @throws {Error} If the student account address is missing or the gateway call fails.
 */
async function grantPermission(
  student: StudentModel,
  permission: Permission,
  id: string,
  password: string,
): Promise<void> {
  const sca = student.accountAddress;
  if (!sca) {
    throw new Error("Student account address is missing");
  }

  const type: "read" | "write" = permission.type === PermissionType.Write ? "write" : "read";

  const universityAddress = (permission as any).universityAddress as string | undefined;

  await gatewayGrantPermission(sca, id, password, type, universityAddress);
}

// ---------------- Public API used by the React app ----------------

/**
 * Logs a student in via the EduWallet gateway and builds the StudentModel
 * that the existing browser extension UI expects.
 *
 * The function:
 *  - Calls `gatewayLogIn` with credentials.
 *  - Constructs a new StudentModel from the returned identifiers.
 *  - Stores the raw login payload on `__rawFromGateway` for later access.
 *  - Copies personal information to the StudentModel.
 *  - Flattens results so that the UI can keep using string based fields.
 *
 * @param credentials - Object containing student ID and password.
 * @returns A populated StudentModel instance ready for use in the extension.
 * @throws {Error} If credentials are missing or the gateway call fails.
 */
export async function logIn(credentials: Credentials): Promise<StudentModel> {
  try {
    if (!credentials || !credentials.id || !credentials.password) {
      throw new Error("Invalid credentials: Missing ID or password");
    }

    // Use the gateway instead of direct blockchain calls
    const { id, studentSca, student, allPermissions } = await gatewayLogIn(credentials);

    // Build the StudentModel the UI already expects
    const studentModel = new StudentModel(id, studentSca);

    // Keep full login response around (includes allPermissions)
    (studentModel as any).__rawFromGateway = {
      id,
      studentSca,
      student,
      allPermissions,
    };

    // Basic info
    studentModel.name = student.name;
    studentModel.surname = student.surname;
    studentModel.birthDate = student.birthDate;
    studentModel.birthPlace = student.birthPlace;
    studentModel.country = student.country;

    // Flatten results so the existing UI (which expects strings) keeps working
    (studentModel as any).results = (student.results || []).map((r: any) => ({
      ...r,
      // Keep the full object but also expose the string the old UI expects
      university: r.university?.shortName ?? r.university?.name ?? "Unknown",

      // Compatibility: the old extension likely uses `date`
      // while the gateway uses `evaluationDate`
      date: (r as any).date ?? (r as any).evaluationDate ?? "",
    }));

    return studentModel;
  } catch (error) {
    logError("Student login via gateway failed: ", error);
    if (`${error}`.includes("Authentication failed")) {
      throw new Error("Authentication failed. Check your credentials.");
    }
    throw new Error(error instanceof Error ? error.message : "Connection issues. Try again.");
  }
}

/**
 * Retrieves all universities associated with the permissions.
 *
 * After the gateway migration, `Permission.university` already contains
 * a human readable label. The extension expects a `UniversityModel[]`,
 * so this function wraps each label into such a model.
 *
 * @param student - Authenticated student model.
 * @param universitiesLabels - List of university labels taken from Permission objects.
 * @returns List of UniversityModel instances.
 * @throws {Error} If the student is not properly authenticated.
 */
export async function getUniversities(
  student: StudentModel,
  universitiesLabels: string[],
): Promise<UniversityModel[]> {
  try {
    if (!student) {
      throw new Error("Student not properly authenticated");
    }

    if (!universitiesLabels || universitiesLabels.length === 0) {
      return [];
    }

    const universities: UniversityModel[] = [];
    for (let i = 0; i < universitiesLabels.length; ++i) {
      try {
        const uni = await getUniversity(universitiesLabels[i], student);
        universities.push(uni);
      } catch (universityError) {
        logError(`Failed to fetch university at index ${i}:`, universityError);
      }
    }

    return universities;
  } catch (error) {
    logError("Universities retrieval failed:", error);
    throw new Error("Failed to retrieve universities. Please try again later.");
  }
}

/**
 * Retrieves all permissions for a student based on the gateway snapshot.
 *
 * This is the primary method used by the extension to populate the
 * permissions list. It hides the details of how the snapshot is stored
 * on the StudentModel.
 *
 * @param student - Authenticated student model.
 * @returns List of Permission objects representing read/write and request states.
 * @throws {Error} If the student is not properly authenticated.
 */
export async function getPermissions(student: StudentModel): Promise<Permission[]> {
  try {
    if (!student) {
      throw new Error("Student not properly authenticated");
    }

    return await getRawPermissions(student);
  } catch (error) {
    logError("Failed to fetch permissions:", error);
    throw new Error("Could not retrieve permission information");
  }
}

/**
 * Performs an action on a permission entry.
 *
 * Behaviour:
 *  - If `permission.request` is true, this is treated as a pending request
 *    and the function calls `grantPermission` via the gateway.
 *  - Otherwise, the function calls `revokePermission` via the gateway.
 *
 * The caller must supply the student ID and password so that the gateway
 * can reconstruct the student wallet and submit an account abstraction
 * operation on chain.
 *
 * @param student - Authenticated student model.
 * @param permission - Permission entry selected in the UI.
 * @param id - Student ID used for gateway authentication.
 * @param password - Student password used for gateway authentication.
 * @throws {Error} If the input is incomplete or the gateway call fails.
 */
export async function performAction(
  student: StudentModel,
  permission: Permission,
  id: string,
  password: string,
): Promise<void> {
  try {
    if (!student) {
      throw new Error("Student not properly authenticated");
    }

    if (!permission) {
      throw new Error("Permission object is required");
    }

    if (!permission.university) {
      throw new Error("University label is missing in permission");
    }

    if (!id || !password) {
      throw new Error("Student ID and password are required to modify permissions");
    }

    if (permission.request) {
      // Pending request -> accept (grant)
      await grantPermission(student, permission, id, password);
    } else {
      // Existing permission -> revoke
      await revokePermission(student, permission, id, password);
    }
  } catch (error) {
    logError("Failed to perform permission action:", error);
    const action = permission?.request ? "grant" : "revoke";
    throw new Error(`Could not ${action} permission. Please try again later.`);
  }
}
