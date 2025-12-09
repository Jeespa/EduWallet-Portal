// gateway/src/types.ts
// Local re-export of shared API types, so gateway code only imports from "./types"

export type {
  CourseResult,
  StudentPayload,
  CredentialsResponse,
  PermissionStatus,
  AllPermissionsForStudent,
  UniversityPermissionEntry,
} from "../../shared/apiTypes";
