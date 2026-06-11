import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  NORDIC_HIRING_ORG_NUMBER,
  NORDIC_HIRING_PRIVATE_KEY,
  NTNU_ORG_NUMBER,
  NTNU_PRIVATE_KEY,
  TBS_ORG_NUMBER,
  TRONDHEIM_BUSINESS_SCHOOL_PRIVATE_KEY,
  UIO_ORG_NUMBER,
  UIO_PRIVATE_KEY,
} from "./constants";
import type {
  GeneratedStudent,
  OrganizationSmartAccounts,
  OrganizationWallets,
} from "./types";

export async function writeDemoFiles(input: {
  generatedStudents: GeneratedStudent[];
  organizationWallets: OrganizationWallets;
  organizationSmartAccounts: OrganizationSmartAccounts;
  studentsRegisterAddress: string;
  entryPointAddress: string;
  paymasterAddress: string;
}) {
  const demoOutput = {
    organizations: {
      ntnu: {
        organizationNumber: NTNU_ORG_NUMBER,
        name: "NTNU University",
        privateKey: NTNU_PRIVATE_KEY,
        address: input.organizationWallets.ntnuWallet.address,
        smartAccountAddress:
          input.organizationSmartAccounts.ntnuSmartAccountAddress,
      },
      nordicHiring: {
        organizationNumber: NORDIC_HIRING_ORG_NUMBER,
        name: "Nordic Hiring AS",
        privateKey: NORDIC_HIRING_PRIVATE_KEY,
        address: input.organizationWallets.nordicHiringWallet.address,
        smartAccountAddress:
          input.organizationSmartAccounts.nordicHiringSmartAccountAddress,
      },
      trondheimBusinessSchool: {
        organizationNumber: TBS_ORG_NUMBER,
        name: "Trondheim Business School",
        privateKey: TRONDHEIM_BUSINESS_SCHOOL_PRIVATE_KEY,
        address: input.organizationWallets.tbsWallet.address,
        smartAccountAddress:
          input.organizationSmartAccounts.tbsSmartAccountAddress,
      },
      uio: {
        organizationNumber: UIO_ORG_NUMBER,
        name: "University of Oslo",
        privateKey: UIO_PRIVATE_KEY,
        address: input.organizationWallets.uioWallet.address,
        smartAccountAddress:
          input.organizationSmartAccounts.uioSmartAccountAddress,
      },
    },
    students: input.generatedStudents,
    testPlan: {
      nordicHiring: {
        requestReadAccess: "Anna Berg",
        verifyExistingResult: "Jonas Holm",
      },
      ntnu: {
        requestWriteAccess: "Emil Nilsen",
        issueResult: "Sara Lund",
      },
      backup: {
        verification: "Nora Solheim",
        mobileAppTest: "Maya Eide",
        mobilePendingRequest: "NTNU University view request for Maya Eide",
      },
    },
  };

  const portalDemoDir = path.join(
    process.cwd(),
    "portal-backend",
    "src",
    "demo",
  );
  mkdirSync(portalDemoDir, { recursive: true });

  writeFileSync(
    path.join(portalDemoDir, "portalDemoBlockchain.json"),
    JSON.stringify(demoOutput, null, 2),
  );

  const envSnippet = [
    `EDUWALLET_ORG_PRIVATE_KEYS={"${NTNU_ORG_NUMBER}":"${NTNU_PRIVATE_KEY}","${NORDIC_HIRING_ORG_NUMBER}":"${NORDIC_HIRING_PRIVATE_KEY}","${UIO_ORG_NUMBER}":"${UIO_PRIVATE_KEY}"}`,
    `PORTAL_DEMO_STUDENTS_FILE=src/demo/portalDemoBlockchain.json`,
    "",
  ].join("\n");

  writeFileSync(
    path.join(process.cwd(), "portal-backend", ".env.demo-chain"),
    envSnippet,
  );

  const gatewayEnvSnippet = [
    "PORT=3001",
    "RPC_URL=http://127.0.0.1:8545",
    `STUDENTS_REGISTER_ADDRESS=${input.studentsRegisterAddress}`,
    `ENTRY_POINT_ADDRESS=${input.entryPointAddress}`,
    `PAYMASTER_ADDRESS=${input.paymasterAddress}`,
    "CHAIN_ID=31337",
    "",
  ].join("\n");

  writeFileSync(
    path.join(process.cwd(), "gateway", ".env.demo-chain"),
    gatewayEnvSnippet,
  );

  console.log("");
  console.log("Generated:");
  console.log("portal-backend/src/demo/portalDemoBlockchain.json");
  console.log("portal-backend/.env.demo-chain");
  console.log("gateway/.env.demo-chain");
}

export function printDemoSummary() {
  console.log("");
  console.log("Recommended test students:");
  console.log("Nordic Hiring request read access: Anna Berg");
  console.log("Nordic Hiring verify result:       Jonas Holm");
  console.log("NTNU request write access:         Emil Nilsen");
  console.log("NTNU issue result:                 Sara Lund");
  console.log("Backup verification:               Nora Solheim");
  console.log("Mobile app test:                   Maya Eide");
  console.log("Mobile pending request:            NTNU view request for Maya Eide");
  console.log("");
  console.log("Expected portal statuses:");
  console.log(
    "NTNU: Anna write, Jonas write, Emil none, Sara write, Nora read, Maya pending read",
  );
  console.log(
    "Nordic Hiring: Anna none, Jonas read, Emil none, Sara none, Nora read, Maya none",
  );
  console.log("UiO: Maya write");
  console.log(
    "Maya Eide is registered by University of Oslo and reserved for mobile testing.",
  );
  console.log("");
  console.log(
    "Copy the contents of portal-backend/.env.demo-chain into portal-backend/.env",
  );
}
