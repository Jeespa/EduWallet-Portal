/**
 * Represents permission types that can be granted to universities.
 * @author Diego Da Giau
 */
export enum PermissionType {
  Read,
  Write,
}

/**
 * Represents a permission granted to a university.
 * @author Diego Da Giau
 */
export interface Permission {
  /** Ethereum address of the university to which the permission applies */
  university: string;
  /** Type of permission granted (Read or Write) */
  type: PermissionType;
  /** Indicates if this is a pending request (true) or an approved permission (false) */
  request: boolean;
}
