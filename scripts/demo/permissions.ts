import type { Wallet } from "ethers";
import { ethers, network } from "hardhat";

import { askForPermission, PermissionType } from "../../sdk/dist";
import { STUDENT_PERMISSION_ABI } from "./constants";
import type { PermissionLevel } from "./types";

export async function grantPermissionLocally(input: {
  studentSca: string;
  organizationSmartAccount: string;
  permission: Exclude<PermissionLevel, "none">;
}) {
  const permissionRole =
    input.permission === "write"
      ? ethers.id("WRITER_ROLE")
      : ethers.id("READER_ROLE");

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
      await studentContract.grantPermission(
        permissionRole,
        input.organizationSmartAccount,
      )
    ).wait();
  } finally {
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [input.studentSca],
    });
  }
}

export async function requestPermissionLocally(input: {
  studentSca: string;
  organizationWallet: Wallet;
  permission: Exclude<PermissionLevel, "none">;
}) {
  const permissionType =
    input.permission === "write" ? PermissionType.Write : PermissionType.Read;

  await askForPermission(
    input.organizationWallet as any,
    input.studentSca,
    permissionType,
  );
}
