// eduwallet-mobile/types/index.ts
import type {
  CredentialsResponse as SharedCredentialsResponse,
  PermissionStatus,
  ErrorResponse,
  AllPermissionsForStudent,
} from "../../shared/apiTypes";

/**
 * Mobile login response.
 *
 * The gateway still returns the normal shared CredentialsResponse payload, but
 * newer versions also include a temporary student session token. The token lets
 * the mobile app refresh permissions and approve/revoke access during the
 * current session without asking the student to enter their password again.
 */
export type CredentialsResponse = SharedCredentialsResponse & {
  sessionToken?: string;
  sessionExpiresAt?: string;
};

export type {
  PermissionStatus,
  ErrorResponse,
  AllPermissionsForStudent,
};
