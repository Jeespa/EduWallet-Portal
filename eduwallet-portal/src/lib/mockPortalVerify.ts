import type { VerifyInput, VerifyResult } from "../types/portal";

export function mockVerifyCertificate(input: VerifyInput): VerifyResult {
  const normalizedSca = input.studentSca.trim().toLowerCase();
  const normalizedCid = input.certificateCid?.trim();
  const normalizedCourseCode = input.courseCode?.trim().toUpperCase();

  if (!normalizedSca.startsWith("0x") || normalizedSca.length < 10) {
    return {
      valid: false,
      message: "Invalid student smart-account address format.",
      onChainMatch: false,
      ipfsReachable: false,
    };
  }

  if (!normalizedCid && !normalizedCourseCode) {
    return {
      valid: false,
      message: "Provide either a certificate CID or a course code.",
      onChainMatch: false,
      ipfsReachable: false,
    };
  }

  // Mock success case
  return {
    valid: true,
    message: "Certificate verified successfully against the mock portal backend.",
    issuerName: "NTNU University",
    courseName: "Distributed Systems",
    courseCode: normalizedCourseCode || "IDATT2104",
    grade: "A",
    certificateCid: normalizedCid || "bafybeigdyrmockcertificatecid123456789",
    onChainMatch: true,
    ipfsReachable: true,
  };
}
