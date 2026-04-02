import type { PortalStudentReference } from "../../../shared/portalApiTypes";

export function getStudentPermissionStatus(
  student: PortalStudentReference | null | undefined
) {
  return student?.permissionStatus ?? "none";
}

export function canReadStudent(
  student: PortalStudentReference | null | undefined
) {
  const status = getStudentPermissionStatus(student);
  return status === "read" || status === "write";
}

export function canWriteStudent(
  student: PortalStudentReference | null | undefined
) {
  const status = getStudentPermissionStatus(student);
  return status === "write";
}