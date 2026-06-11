import type { Wallet } from "ethers";
import { ethers } from "hardhat";

import { enrollStudent, evaluateStudent, registerStudent } from "../../sdk/dist";
import { deriveStudentOwnerPrivateKey } from "./crypto";
import { grantPermissionLocally, requestPermissionLocally } from "./permissions";
import type { AccessOrganization, GeneratedStudent, PermissionLevel, StudentSeed } from "./types";

function fullName(student: StudentSeed) {
  return `${student.name} ${student.surname}`;
}

function getSeededPermissions(
  permissions: Partial<Record<AccessOrganization, PermissionLevel>> = {},
): AccessOrganization[] {
  return Object.keys(permissions) as AccessOrganization[];
}

/**
 * Registers one demo student and prepares the on-chain state needed by the test
 * plan: course results, initial access, and pending access requests.
 */
export async function createDemoStudent(input: {
  student: StudentSeed;
  issuerWallet: Wallet;
  deployerSendTransaction: (tx: {
    to: string;
    value: bigint;
  }) => Promise<{ wait: () => Promise<unknown> }>;
  organizationSmartAccounts: Record<AccessOrganization, string>;
  organizationWallets: Record<AccessOrganization, Wallet>;
}): Promise<GeneratedStudent> {
  const created = await registerStudent(input.issuerWallet as any, {
    name: input.student.name,
    surname: input.student.surname,
    birthDate: input.student.birthDate,
    birthPlace: input.student.birthPlace,
    country: input.student.country,
  });

  const ownerPrivateKey = deriveStudentOwnerPrivateKey(created.password, created.id);

  const ownerWallet = new ethers.Wallet(ownerPrivateKey, ethers.provider);

  // The generated owner EOA is funded so the student account can participate in
  // local account-abstraction flows during the mobile app access test.
  await (
    await input.deployerSendTransaction({
      to: ownerWallet.address,
      value: ethers.parseEther("10000"),
    })
  ).wait();

  await enrollStudent(
    input.issuerWallet as any,
    created.academicWalletAddress,
    input.student.courses.map((course) => ({
      code: course.code,
      name: course.name,
      degreeCourse: course.degreeCourse,
      ects: course.ects,
    })),
  );

  await evaluateStudent(
    input.issuerWallet as any,
    created.academicWalletAddress,
    input.student.courses.map((course) => ({
      code: course.code,
      grade: course.grade,
      evaluationDate: course.evaluationDate,
    })),
  );

  for (const organization of getSeededPermissions(input.student.initialAccess)) {
    const permission = input.student.initialAccess?.[organization];

    if (!permission || permission === "none") {
      continue;
    }

    await grantPermissionLocally({
      studentSca: created.academicWalletAddress,
      organizationSmartAccount: input.organizationSmartAccounts[organization],
      permission,
    });
  }

  for (const organization of getSeededPermissions(input.student.initialRequests)) {
    const permission = input.student.initialRequests?.[organization];

    if (!permission || permission === "none") {
      continue;
    }

    await requestPermissionLocally({
      studentSca: created.academicWalletAddress,
      organizationWallet: input.organizationWallets[organization],
      permission,
    });
  }

  console.log("");
  console.log("Student registered:");
  console.log("Name:             ", fullName(input.student));
  console.log("Registered by:    ", input.student.registeredBy);
  console.log("Student ID:       ", created.id);
  console.log("Student password: ", created.password);
  console.log("Student SCA:      ", created.academicWalletAddress);
  console.log("Owner EOA:        ", ownerWallet.address);
  console.log("Test purpose:     ", input.student.testPurpose);

  return {
    studentId: created.id,
    password: created.password,
    studentSca: created.academicWalletAddress,
    ownerAddress: ownerWallet.address,
    name: fullName(input.student),
    homeInstitution: input.student.homeInstitution,
    registeredBy: input.student.registeredBy,
    testPurpose: input.student.testPurpose,
  };
}
