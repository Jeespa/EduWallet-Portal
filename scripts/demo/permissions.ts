import type { Wallet } from "ethers";
import { ethers, network } from "hardhat";

import { askForPermission, PermissionType } from "../../sdk/dist";
import { STUDENT_PERMISSION_ABI } from "./constants";
import type { PermissionLevel } from "./types";

/**
 * Seeds an already-approved permission directly on a student smart account.
 *
 * This uses Hardhat impersonation because the demo needs fixed starting access
 * states without requiring a student UI interaction for every seeded student.
 */
export async function grantPermissionLocally(input: {
  studentSca: string;
  organizationSmartAccount: string;
  permission: Exclude<PermissionLevel, "none">;
}) {
  const permissionRole =
    input.permission === "write" ? ethers.id("WRITER_ROLE") : ethers.id("READER_ROLE");

  await network.provider.send("hardhat_setBalance", [
    input.studentSca,
    ethers.toQuantity(ethers.parseEther("10000")),
  ]);

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [input.studentSca],
  });

  try {
    const studentAsSelfSigner = await ethers.getSigner(input.studentSca);

    const studentContract = await ethers.getContractAt(
      STUDENT_PERMISSION_ABI,
      input.studentSca,
      studentAsSelfSigner,
    );

    await (
      await studentContract.grantPermission(permissionRole, input.organizationSmartAccount)
    ).wait();
  } finally {
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [input.studentSca],
    });
  }
}

/**
 * Seeds a pending access request using the same SDK flow as a portal organization.
 * The student still has to approve the request in the mobile app.
 */
export async function requestPermissionLocally(input: {
  studentSca: string;
  organizationWallet: Wallet;
  permission: Exclude<PermissionLevel, "none">;
}) {
  const permissionType = input.permission === "write" ? PermissionType.Write : PermissionType.Read;

  await askForPermission(input.organizationWallet as any, input.studentSca, permissionType);
}
