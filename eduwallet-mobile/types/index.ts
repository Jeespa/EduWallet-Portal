// eduwallet-mobile/types/index.ts

/**
 * Mobile app type exports.
 *
 * The core gateway response types live in shared/apiTypes.ts so the gateway,
 * browser extension, and mobile app agree on the same JSON shapes. This file is
 * kept as a small mobile-facing barrel so app imports can stay short.
 */
export type {
  CredentialsResponse,
  PermissionStatus,
  ErrorResponse,
  AllPermissionsForStudent,
} from "../../shared/apiTypes";
