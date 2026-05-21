// scripts/bootstrapPortalDemo.ts

import { ethers } from "hardhat";
import { mkdirSync, writeFileSync } from "node:fs";
import { pbkdf2Sync } from "node:crypto";
import path from "node:path";

import { registerStudent, enrollStudent, evaluateStudent } from "../sdk/dist";

const NTNU_ORG_NUMBER = "974767880";
const NORDIC_HIRING_ORG_NUMBER = "999888777";

// Local development keys only. Never use these outside local Hardhat testing.
const NTNU_PRIVATE_KEY =
  "0x1111111111111111111111111111111111111111111111111111111111111111";

const NORDIC_HIRING_PRIVATE_KEY =
  "0x2222222222222222222222222222222222222222222222222222222222222222";

function deriveStudentOwnerPrivateKey(
  password: string,
  studentId: string,
): string {
  const derivedKey = pbkdf2Sync(
    password,
    studentId,
    100000,
    32,
    "sha256",
  ).toString("hex");

  return "0x" + derivedKey;
}

async function main() {
  console.log("Bootstrapping EduWallet portal demo blockchain...");

  const [deployer] = await ethers.getSigners();

  console.log("Deployer:", deployer.address);

  // ---------------------------------------------------------------------------
  // 1. Deploy contracts in the same order expected by sdk/src/conf.ts
  // ---------------------------------------------------------------------------
  const EntryPointFactory = await ethers.getContractFactory("EntryPoint");
  const entryPoint = await EntryPointFactory.deploy();
  await entryPoint.waitForDeployment();

  const StudentDeployerFactory = await ethers.getContractFactory(
    "StudentDeployer",
  );
  const studentDeployer = await StudentDeployerFactory.deploy();
  await studentDeployer.waitForDeployment();

  const UniversityDeployerFactory = await ethers.getContractFactory(
    "UniversityDeployer",
  );
  const universityDeployer = await UniversityDeployerFactory.deploy();
  await universityDeployer.waitForDeployment();

  const StudentsRegisterFactory = await ethers.getContractFactory(
    "StudentsRegister",
  );
  const studentsRegister = await StudentsRegisterFactory.deploy(
    await studentDeployer.getAddress(),
    await universityDeployer.getAddress(),
    await entryPoint.getAddress(),
  );
  await studentsRegister.waitForDeployment();

  const PaymasterFactory = await ethers.getContractFactory("Paymaster");
  const paymaster = await PaymasterFactory.deploy(
    await entryPoint.getAddress(),
  );
  await paymaster.waitForDeployment();

  await (
    await entryPoint.depositTo(await paymaster.getAddress(), {
      value: ethers.parseEther("1000000"),
    })
  ).wait();

  console.log("Contracts deployed:");
  console.log("EntryPoint:      ", await entryPoint.getAddress());
  console.log("StudentDeployer: ", await studentDeployer.getAddress());
  console.log("UniversityDepl.: ", await universityDeployer.getAddress());
  console.log("StudentsRegister:", await studentsRegister.getAddress());
  console.log("Paymaster:       ", await paymaster.getAddress());

  // ---------------------------------------------------------------------------
  // 2. Create fixed organization wallets
  // ---------------------------------------------------------------------------
  const ntnuWallet = new ethers.Wallet(NTNU_PRIVATE_KEY, ethers.provider);
  const nordicHiringWallet = new ethers.Wallet(
    NORDIC_HIRING_PRIVATE_KEY,
    ethers.provider,
  );

  // Fund org wallets so they can interact with local chain.
  await (
    await deployer.sendTransaction({
      to: ntnuWallet.address,
      value: ethers.parseEther("10000"),
    })
  ).wait();

  await (
    await deployer.sendTransaction({
      to: nordicHiringWallet.address,
      value: ethers.parseEther("10000"),
    })
  ).wait();

  // ---------------------------------------------------------------------------
  // 3. Subscribe NTNU and Nordic Hiring as on-chain organization accounts
  // ---------------------------------------------------------------------------
  await (
    await studentsRegister.subscribe(
      ntnuWallet.address,
      "NTNU University",
      "Norway",
      "NTNU",
    )
  ).wait();

  await (
    await studentsRegister.subscribe(
      nordicHiringWallet.address,
      "Nordic Hiring AS",
      "Norway",
      "NH",
    )
  ).wait();

  console.log("Organizations subscribed:");
  console.log("NTNU EOA:         ", ntnuWallet.address);
  console.log("Nordic Hiring EOA:", nordicHiringWallet.address);

  const ntnuSmartAccountAddress = await studentsRegister
    .connect(ntnuWallet)
    .getUniversityAccount();

  const nordicHiringSmartAccountAddress = await studentsRegister
    .connect(nordicHiringWallet)
    .getUniversityAccount();

  console.log("NTNU smart account:         ", ntnuSmartAccountAddress);
  console.log("Nordic Hiring smart account:", nordicHiringSmartAccountAddress);

  // ---------------------------------------------------------------------------
  // 4. Register a real EduWallet student through NTNU
  // ---------------------------------------------------------------------------
  const anna = await registerStudent(ntnuWallet as any, {
    name: "Anna",
    surname: "Berg",
    birthDate: "2000-04-12",
    birthPlace: "Trondheim",
    country: "Norway",
  });

  console.log("Student registered:");
  console.log("Student ID:       ", anna.id);
  console.log("Student password: ", anna.password);
  console.log("Student SCA:      ", anna.academicWalletAddress);

  const annaOwnerPrivateKey = deriveStudentOwnerPrivateKey(
    anna.password,
    anna.id,
  );

  const annaOwnerWallet = new ethers.Wallet(
    annaOwnerPrivateKey,
    ethers.provider,
  );

  await (
    await deployer.sendTransaction({
      to: annaOwnerWallet.address,
      value: ethers.parseEther("10000"),
    })
  ).wait();

  console.log("Student owner EOA:", annaOwnerWallet.address);
  console.log("Student owner EOA funded for local demo transactions.");

  // ---------------------------------------------------------------------------
  // 5. Add real course data on-chain
  // ---------------------------------------------------------------------------
  await enrollStudent(ntnuWallet as any, anna.academicWalletAddress, [
    {
      code: "IDATT2104",
      name: "Network Programming",
      degreeCourse: "Computer Science",
      ects: 7.5,
    },
    {
      code: "TDT4100",
      name: "Object-Oriented Programming",
      degreeCourse: "Computer Science",
      ects: 7.5,
    },
  ]);

  await evaluateStudent(ntnuWallet as any, anna.academicWalletAddress, [
    {
      code: "IDATT2104",
      grade: "A",
      evaluationDate: "2025-05-20",
    },
  ]);

  await evaluateStudent(ntnuWallet as any, anna.academicWalletAddress, [
    {
      code: "TDT4100",
      grade: "B",
      evaluationDate: "2025-06-02",
    },
  ]);

  console.log("Courses and grades written to EduWallet.");

  // ---------------------------------------------------------------------------
  // 6. Write generated local demo files
  // ---------------------------------------------------------------------------
  const demoOutput = {
    organizations: {
      ntnu: {
        organizationNumber: NTNU_ORG_NUMBER,
        name: "NTNU University",
        privateKey: NTNU_PRIVATE_KEY,
        address: ntnuWallet.address,
        smartAccountAddress: ntnuSmartAccountAddress,
      },
      nordicHiring: {
        organizationNumber: NORDIC_HIRING_ORG_NUMBER,
        name: "Nordic Hiring AS",
        privateKey: NORDIC_HIRING_PRIVATE_KEY,
        address: nordicHiringWallet.address,
        smartAccountAddress: nordicHiringSmartAccountAddress,
      },
    },
    students: [
      {
        studentId: anna.id,
        password: anna.password,
        studentSca: anna.academicWalletAddress,
        ownerAddress: annaOwnerWallet.address,
        name: "Anna Berg",
        homeInstitution: "NTNU University",
        permissionStatus: "write",
      },
    ],
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
    `EDUWALLET_ORG_PRIVATE_KEYS={"${NTNU_ORG_NUMBER}":"${NTNU_PRIVATE_KEY}","${NORDIC_HIRING_ORG_NUMBER}":"${NORDIC_HIRING_PRIVATE_KEY}"}`,
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
    `STUDENTS_REGISTER_ADDRESS=${await studentsRegister.getAddress()}`,
    `ENTRY_POINT_ADDRESS=${await entryPoint.getAddress()}`,
    `PAYMASTER_ADDRESS=${await paymaster.getAddress()}`,
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
  console.log("");
  console.log(
    "Copy the contents of portal-backend/.env.demo-chain into portal-backend/.env",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
