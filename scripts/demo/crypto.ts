import { pbkdf2Sync } from "node:crypto";

export function deriveStudentOwnerPrivateKey(
  password: string,
  studentId: string,
): string {
  const derivedKey = pbkdf2Sync(
    password,
    studentId,
    100000,
    32,
    "sha256",
  ).toString("hex");

  return "0x" + derivedKey;
}
