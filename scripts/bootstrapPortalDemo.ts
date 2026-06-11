// scripts/bootstrapPortalDemo.ts
import { ethers } from "hardhat";

import { deployDemoContracts } from "./demo/contracts";
import { prepareDemoOrganizations } from "./demo/organizations";
import { printDemoSummary, writeDemoFiles } from "./demo/output";
import { STUDENT_SEEDS } from "./demo/studentSeeds";
import { createDemoStudent } from "./demo/students";
import type { GeneratedStudent } from "./demo/types";

async function main() {
  console.log("Bootstrapping EduWallet portal demo blockchain...");

  const [deployer] = await ethers.getSigners();

  console.log("Deployer:", deployer.address);

  const contracts = await deployDemoContracts();

  const organizations = await prepareDemoOrganizations({
    deployer,
    studentsRegister: contracts.studentsRegister,
  });

  const generatedStudents: GeneratedStudent[] = [];

  for (const student of STUDENT_SEEDS) {
    const issuerWallet = organizations.issuerWallets[student.registeredBy];

    const generatedStudent = await createDemoStudent({
      student,
      issuerWallet,
      deployerSendTransaction: (tx) => deployer.sendTransaction(tx),
      organizationSmartAccounts: organizations.organizationSmartAccounts,
      organizationWallets: organizations.organizationWallets,
    });

    generatedStudents.push(generatedStudent);
  }

  console.log("");
  console.log("All demo students registered and course data written.");

  await writeDemoFiles({
    generatedStudents,
    organizationWallets: {
      ntnuWallet: organizations.ntnuWallet,
      nordicHiringWallet: organizations.nordicHiringWallet,
      tbsWallet: organizations.tbsWallet,
      uioWallet: organizations.uioWallet,
    },
    organizationSmartAccounts: {
      ntnuSmartAccountAddress: organizations.ntnuSmartAccountAddress,
      nordicHiringSmartAccountAddress:
        organizations.nordicHiringSmartAccountAddress,
      tbsSmartAccountAddress: organizations.tbsSmartAccountAddress,
      uioSmartAccountAddress: organizations.uioSmartAccountAddress,
    },
    studentsRegisterAddress: await contracts.studentsRegister.getAddress(),
    entryPointAddress: await contracts.entryPoint.getAddress(),
    paymasterAddress: await contracts.paymaster.getAddress(),
  });

  printDemoSummary();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
