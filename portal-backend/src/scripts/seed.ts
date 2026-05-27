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
    update: {
      name: "NTNU University",
    },
    create: {
      name: "NTNU University",
      organizationNumber: "974767880",
    },
  });

  const nordicHiring = await prisma.organization.upsert({
    where: {
      organizationNumber: "999888777",
    },
    update: {
      name: "Nordic Hiring AS",
    },
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
    update: {
      name: "Ingrid Hansen",
      passwordHash: defaultPasswordHash,
    },
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
    update: {
      name: "Marius Olsen",
      passwordHash: defaultPasswordHash,
    },
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
    update: {
      name: "Sofie Berg",
      passwordHash: defaultPasswordHash,
    },
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
    update: {
      name: "Lars Nilsen",
      passwordHash: defaultPasswordHash,
    },
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
    update: {
      name: "Emma Johansen",
      passwordHash: defaultPasswordHash,
    },
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
    update: {
      name: "Oliver Strand",
      passwordHash: defaultPasswordHash,
    },
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
    update: {
      role: "ADMIN",
    },
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
    update: {
      role: "REQUESTER",
    },
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
    update: {
      role: "VERIFIER",
    },
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
    update: {
      role: "ISSUER",
    },
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
    update: {
      role: "ADMIN",
    },
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
    update: {
      role: "VERIFIER",
    },
    create: {
      organizationId: nordicHiring.id,
      userId: oliver.id,
      role: "VERIFIER",
    },
  });

  // -------------------------
  // Reset portal-side demo logs
  // -------------------------
  // These records are generated during actual portal use.
  // Do not seed static request/verification/issuance data here, because local
  // Hardhat student smart-account addresses change whenever the demo blockchain
  // is bootstrapped.
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

  console.log("Seed complete");
  console.log("");
  console.log("Portal users:");
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
  console.log("");
  console.log(
    "Portal-side request, verification, and issuance logs were cleared.",
  );
  console.log(
    "Student metadata is loaded from portalDemoBlockchain.json, while course data and permissions come from EduWallet.",
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });