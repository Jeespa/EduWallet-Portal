import { id } from "ethers";

/**
 * ABI for calling through the Student smart account as the student owner.
 */
export const STUDENT_OWNER_ABI = [
  "function executeViewCall(address target, bytes data) external view returns (bytes)",
  "function getStudentInfo() external view returns (tuple(tuple(string,string,uint256,string,string),tuple(string,string,address,string,uint16,string,uint256,string)[]))",
  "function getPermissions(bytes32 permissionType) external view returns (address[])",
];

/**
 * Minimal ABI for permission updates on the Student contract.
 */
export const STUDENT_PERMISSION_ABI = [
  "function revokePermission(address university)",
  "function grantPermission(bytes32 permissionType, address university)",
];

/**
 * Role identifiers used in the Student contract.
 */
export const ROLE_CODES = {
  readRequest: id("READER_APPLICANT"),
  writeRequest: id("WRITER_APPLICANT"),
  read: id("READER_ROLE"),
  write: id("WRITER_ROLE"),
};

export type PermissionGrantKind = "read" | "write";
