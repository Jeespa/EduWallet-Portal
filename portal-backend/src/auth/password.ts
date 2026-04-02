import argon2 from "argon2";

export async function verifyPassword(
  plainPassword: string,
  passwordHash: string
) {
  return argon2.verify(passwordHash, plainPassword);
}