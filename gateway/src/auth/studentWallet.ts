import { Wallet } from "ethers";
import { pbkdf2Sync } from "node:crypto";
import { provider } from "../blockchain/provider";

/**
 * Derives a deterministic Ethereum private key from a password and student ID.
 *
 * The fixed PBKDF2 parameters reproduce the original EduWallet credential
 * scheme. A production system should replace this with a stronger identity and
 * key-management model.
 */
export function derivePrivateKey(password: string, studentId: string): string {
  const iterations = 100000;
  const keyLength = 32;
  const derivedKey = pbkdf2Sync(
    password,
    studentId,
    iterations,
    keyLength,
    "sha256"
  ).toString("hex");

  return `0x${derivedKey}`;
}

/**
 * Reconstructs the student's externally owned wallet from ID and password.
 */
export function getStudentWalletFromCredentials(
  id: string,
  password: string
): Wallet {
  if (!id || !password) {
    throw new Error("Both id and password are required");
  }

  const privateKey = derivePrivateKey(password, id);
  return new Wallet(privateKey, provider);
}
