import "dotenv/config";
import argon2 from "argon2";
import { prisma } from "../lib/prisma";

async function main() {
  const defaultPasswordHash = await argon2.hash("password123");

  // -------------------------
  // Organizations
  // -------------------------
  const ntnu = await prisma.organization.upsert({
    where: {
      organizationNumber: "974767880",
    },
    update: {},
    create: {
      name: "NTNU University",
      organizationNumber: "974767880",
    },
  });

  const nordicHiring = await prisma.organization.upsert({
    where: {
      organizationNumber: "999888777",
    },
    update: {},
    create: {
      name: "Nordic Hiring AS",
      organizationNumber: "999888777",
    },
  });

  // -------------------------
  // Users
  // -------------------------
  const ingrid = await prisma.portalUser.upsert({
    where: {
      email: "ingrid@ntnu.no",
    },
    update: {},
    create: {
      name: "Ingrid Hansen",
      email: "ingrid@ntnu.no",
      passwordHash: defaultPasswordHash,
    },
  });

  const marius = await prisma.portalUser.upsert({
    where: {
      email: "marius@ntnu.no",
    },
    update: {},
    create: {
      name: "Marius Olsen",
      email: "marius@ntnu.no",
      passwordHash: defaultPasswordHash,
    },
  });

  const sofie = await prisma.portalUser.upsert({
    where: {
      email: "sofie@ntnu.no",
    },
    update: {},
    create: {
      name: "Sofie Berg",
      email: "sofie@ntnu.no",
      passwordHash: defaultPasswordHash,
    },
  });

  const lars = await prisma.portalUser.upsert({
    where: {
      email: "lars@ntnu.no",
    },
    update: {},
    create: {
      name: "Lars Nilsen",
      email: "lars@ntnu.no",
      passwordHash: defaultPasswordHash,
    },
  });

  const emma = await prisma.portalUser.upsert({
    where: {
      email: "emma@nordichiring.no",
    },
    update: {},
    create: {
      name: "Emma Johansen",
      email: "emma@nordichiring.no",
      passwordHash: defaultPasswordHash,
    },
  });

  const oliver = await prisma.portalUser.upsert({
    where: {
      email: "oliver@nordichiring.no",
    },
    update: {},
    create: {
      name: "Oliver Strand",
      email: "oliver@nordichiring.no",
      passwordHash: defaultPasswordHash,
    },
  });

  // -------------------------
  // Memberships - NTNU
  // -------------------------
  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: ntnu.id,
        userId: ingrid.id,
      },
    },
    update: {},
    create: {
      organizationId: ntnu.id,
      userId: ingrid.id,
      role: "ADMIN",
    },
  });

  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: ntnu.id,
        userId: marius.id,
      },
    },
    update: {},
    create: {
      organizationId: ntnu.id,
      userId: marius.id,
      role: "REQUESTER",
    },
  });

  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: ntnu.id,
        userId: sofie.id,
      },
    },
    update: {},
    create: {
      organizationId: ntnu.id,
      userId: sofie.id,
      role: "VERIFIER",
    },
  });

  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: ntnu.id,
        userId: lars.id,
      },
    },
    update: {},
    create: {
      organizationId: ntnu.id,
      userId: lars.id,
      role: "ISSUER",
    },
  });

  // -------------------------
  // Memberships - Nordic Hiring
  // -------------------------
  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: nordicHiring.id,
        userId: emma.id,
      },
    },
    update: {},
    create: {
      organizationId: nordicHiring.id,
      userId: emma.id,
      role: "ADMIN",
    },
  });

  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: nordicHiring.id,
        userId: oliver.id,
      },
    },
    update: {},
    create: {
      organizationId: nordicHiring.id,
      userId: oliver.id,
      role: "VERIFIER",
    },
  });

  // -------------------------
  // Reset demo data per org
  // -------------------------
  await prisma.permissionRequestLog.deleteMany({
    where: {
      organizationId: {
        in: [ntnu.id, nordicHiring.id],
      },
    },
  });

  await prisma.verificationLog.deleteMany({
    where: {
      organizationId: {
        in: [ntnu.id, nordicHiring.id],
      },
    },
  });

  await prisma.issuanceDraft.deleteMany({
    where: {
      organizationId: {
        in: [ntnu.id, nordicHiring.id],
      },
    },
  });

  // -------------------------
  // Permission requests
  // -------------------------
  await prisma.permissionRequestLog.createMany({
    data: [
      {
        studentId: "s123456",
        studentSca: "0x7A1B2C3D4E5F6789012345678901234567890ABC",
        permissionType: "READ",
        status: "PENDING",
        reason: "Need access to verify academic records for recruitment.",
        organizationId: ntnu.id,
        createdByUserId: marius.id,
      },
      {
        studentId: "s654321",
        studentSca: "0x1234567890ABCDEF1234567890ABCDEF12345678",
        permissionType: "WRITE",
        status: "APPROVED",
        reason: "Need write access to register a new academic result.",
        organizationId: ntnu.id,
        createdByUserId: ingrid.id,
      },
      {
        studentId: "s654321",
        studentSca: "0x1234567890ABCDEF1234567890ABCDEF12345678",
        permissionType: "READ",
        status: "PENDING",
        reason: "Need access to review candidate transcript.",
        organizationId: nordicHiring.id,
        createdByUserId: emma.id,
      },
    ],
  });

  // -------------------------
  // Verification logs
  // -------------------------
  await prisma.verificationLog.createMany({
    data: [
      {
        verificationType: "ACADEMIC",
        studentId: "s654321",
        studentSca: "0x1234567890ABCDEF1234567890ABCDEF12345678",
        certificateCid: "bafy-demo-certificate-001",
        courseCode: "IDATT2104",
        valid: true,
        message: "Verification completed successfully.",
        organizationId: ntnu.id,
        createdByUserId: sofie.id,
      },
      {
        verificationType: "ACADEMIC",
        studentId: "s777888",
        studentSca: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
        certificateCid: "bafy-demo-certificate-002",
        courseCode: "TDT4100",
        valid: false,
        message: "Organization does not have read access for this student.",
        organizationId: ntnu.id,
        createdByUserId: sofie.id,
      },
      {
        verificationType: "ACADEMIC",
        studentId: "s654321",
        studentSca: "0x1234567890ABCDEF1234567890ABCDEF12345678",
        certificateCid: "bafy-demo-certificate-003",
        courseCode: "TDT4136",
        valid: true,
        message: "Verification completed successfully.",
        organizationId: nordicHiring.id,
        createdByUserId: oliver.id,
      },
    ],
  });

  // -------------------------
  // Issuance drafts
  // -------------------------
  await prisma.issuanceDraft.createMany({
    data: [
      {
        studentId: "s123456",
        studentSca: "0x7A1B2C3D4E5F6789012345678901234567890ABC",
        courseCode: "IDATT2104",
        courseName: "Distributed Systems",
        degreeCourse: "Computer Science",
        ects: "7.5",
        grade: "A",
        evaluationDate: "2026-05-20",
        certificateCid: "bafy-demo-issuance-001",
        status: "DRAFT",
        organizationId: ntnu.id,
        createdByUserId: lars.id,
      },
      {
        studentId: "s123456",
        studentSca: "0x7A1B2C3D4E5F6789012345678901234567890ABC",
        courseCode: "TDT4136",
        courseName: "Introduction to Artificial Intelligence",
        degreeCourse: "Computer Science",
        ects: "7.5",
        grade: "B",
        evaluationDate: "2026-06-10",
        certificateCid: "bafy-demo-issuance-002",
        status: "READY",
        organizationId: ntnu.id,
        createdByUserId: lars.id,
      },
    ],
  });

  console.log("Seed complete");
  console.log("");
  console.log("NTNU users:");
  console.log("  ingrid@ntnu.no / password123   (ADMIN)");
  console.log("  marius@ntnu.no / password123   (REQUESTER)");
  console.log("  sofie@ntnu.no / password123    (VERIFIER)");
  console.log("  lars@ntnu.no / password123     (ISSUER)");
  console.log("");
  console.log("Nordic Hiring users:");
  console.log("  emma@nordichiring.no / password123    (ADMIN)");
  console.log("  oliver@nordichiring.no / password123  (VERIFIER)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });