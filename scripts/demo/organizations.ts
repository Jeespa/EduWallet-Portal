import type { Wallet } from "ethers";
import { ethers } from "hardhat";

import {
  NORDIC_HIRING_PRIVATE_KEY,
  NTNU_PRIVATE_KEY,
  TRONDHEIM_BUSINESS_SCHOOL_PRIVATE_KEY,
  UIO_PRIVATE_KEY,
} from "./constants";
import type {
  AccessOrganization,
  OrganizationSmartAccounts,
  OrganizationWallets,
  RegisteringOrganization,
} from "./types";

export type PreparedOrganizations = OrganizationWallets &
  OrganizationSmartAccounts & {
    organizationSmartAccounts: Record<AccessOrganization, string>;
    organizationWallets: Record<AccessOrganization, Wallet>;
    issuerWallets: Record<RegisteringOrganization, Wallet>;
  };

/**
 * Registers the demo organizations on-chain and returns the wallets needed by
 * later bootstrap steps.
 *
 * NTNU, Trondheim Business School, and UiO act as registering institutions.
 * NTNU and Nordic Hiring also act as access-requesting portal organizations.
 */
export async function prepareDemoOrganizations(input: {
  deployer: {
    sendTransaction: (tx: {
      to: string;
      value: bigint;
    }) => Promise<{ wait: () => Promise<unknown> }>;
  };
  studentsRegister: any;
}): Promise<PreparedOrganizations> {
  const ntnuWallet = new ethers.Wallet(NTNU_PRIVATE_KEY, ethers.provider);
  const nordicHiringWallet = new ethers.Wallet(NORDIC_HIRING_PRIVATE_KEY, ethers.provider);
  const tbsWallet = new ethers.Wallet(TRONDHEIM_BUSINESS_SCHOOL_PRIVATE_KEY, ethers.provider);
  const uioWallet = new ethers.Wallet(UIO_PRIVATE_KEY, ethers.provider);

  // The wallets are deterministic demo identities. They are funded from the
  // Hardhat deployer account so they can register organizations and write data.
  for (const wallet of [ntnuWallet, nordicHiringWallet, tbsWallet, uioWallet]) {
    await (
      await input.deployer.sendTransaction({
        to: wallet.address,
        value: ethers.parseEther("10000"),
      })
    ).wait();
  }

  await (
    await input.studentsRegister.subscribe(ntnuWallet.address, "NTNU University", "Norway", "NTNU")
  ).wait();

  await (
    await input.studentsRegister.subscribe(
      nordicHiringWallet.address,
      "Nordic Hiring AS",
      "Norway",
      "NH",
    )
  ).wait();

  await (
    await input.studentsRegister.subscribe(
      tbsWallet.address,
      "Trondheim Business School",
      "Norway",
      "TBS",
    )
  ).wait();

  await (
    await input.studentsRegister.subscribe(uioWallet.address, "University of Oslo", "Norway", "UiO")
  ).wait();

  console.log("");
  console.log("Organizations subscribed:");
  console.log("NTNU EOA:                     ", ntnuWallet.address);
  console.log("Nordic Hiring EOA:            ", nordicHiringWallet.address);
  console.log("Trondheim Business School EOA:", tbsWallet.address);
  console.log("University of Oslo EOA:       ", uioWallet.address);

  const ntnuSmartAccountAddress = await input.studentsRegister
    .connect(ntnuWallet)
    .getUniversityAccount();

  const nordicHiringSmartAccountAddress = await input.studentsRegister
    .connect(nordicHiringWallet)
    .getUniversityAccount();

  const tbsSmartAccountAddress = await input.studentsRegister
    .connect(tbsWallet)
    .getUniversityAccount();

  const uioSmartAccountAddress = await input.studentsRegister
    .connect(uioWallet)
    .getUniversityAccount();

  console.log("NTNU smart account:                     ", ntnuSmartAccountAddress);
  console.log("Nordic Hiring smart account:            ", nordicHiringSmartAccountAddress);
  console.log("Trondheim Business School smart account:", tbsSmartAccountAddress);
  console.log("University of Oslo smart account:       ", uioSmartAccountAddress);

  const organizationSmartAccounts: Record<AccessOrganization, string> = {
    ntnu: ntnuSmartAccountAddress,
    nordicHiring: nordicHiringSmartAccountAddress,
  };

  const organizationWallets: Record<AccessOrganization, Wallet> = {
    ntnu: ntnuWallet,
    nordicHiring: nordicHiringWallet,
  };

  const issuerWallets: Record<RegisteringOrganization, Wallet> = {
    ntnu: ntnuWallet,
    tbs: tbsWallet,
    uio: uioWallet,
  };

  return {
    ntnuWallet,
    nordicHiringWallet,
    tbsWallet,
    uioWallet,
    ntnuSmartAccountAddress,
    nordicHiringSmartAccountAddress,
    tbsSmartAccountAddress,
    uioSmartAccountAddress,
    organizationSmartAccounts,
    organizationWallets,
    issuerWallets,
  };
}
