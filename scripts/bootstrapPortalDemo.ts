// scripts/bootstrapPortalDemo.ts
import type { Wallet } from "ethers";
import { ethers, network } from "hardhat";
import { mkdirSync, writeFileSync } from "node:fs";
import { pbkdf2Sync } from "node:crypto";
import path from "node:path";

import { registerStudent, enrollStudent, evaluateStudent } from "../sdk/dist";

const NTNU_ORG_NUMBER = "974767880";
const NORDIC_HIRING_ORG_NUMBER = "999888777";
const TBS_ORG_NUMBER = "123456789";

// Local development keys only. Never use these outside local Hardhat testing.
const NTNU_PRIVATE_KEY =
  "0x1111111111111111111111111111111111111111111111111111111111111111";

const NORDIC_HIRING_PRIVATE_KEY =
  "0x2222222222222222222222222222222222222222222222222222222222222222";

const TRONDHEIM_BUSINESS_SCHOOL_PRIVATE_KEY =
  "0x3333333333333333333333333333333333333333333333333333333333333333";

const STUDENT_PERMISSION_ABI = [
  "function grantPermission(bytes32 permissionType, address university)",
];

type PermissionLevel = "none" | "read" | "write";
type RegisteringOrganization = "ntnu" | "tbs";
type AccessOrganization = "ntnu" | "nordicHiring";

type CourseSeed = {
  code: string;
  name: string;
  degreeCourse: string;
  ects: number;
  grade: string;
  evaluationDate: string;
};

type StudentSeed = {
  name: string;
  surname: string;
  birthDate: string;
  birthPlace: string;
  country: string;
  homeInstitution: string;
  registeredBy: RegisteringOrganization;
  initialAccess?: Partial<Record<AccessOrganization, PermissionLevel>>;
  courses: CourseSeed[];
  testPurpose: string;
};

type GeneratedStudent = {
  studentId: string;
  password: string;
  studentSca: string;
  ownerAddress: string;
  name: string;
  homeInstitution: string;
  registeredBy: RegisteringOrganization;
  testPurpose: string;
};

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

function fullName(student: StudentSeed) {
  return `${student.name} ${student.surname}`;
}

async function grantPermissionLocally(input: {
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

async function createDemoStudent(input: {
  student: StudentSeed;
  issuerWallet: Wallet;
  deployerSendTransaction: (tx: {
    to: string;
    value: bigint;
  }) => Promise<{ wait: () => Promise<unknown> }>;
  organizationSmartAccounts: Record<AccessOrganization, string>;
}): Promise<GeneratedStudent> {
  const created = await registerStudent(input.issuerWallet as any, {
    name: input.student.name,
    surname: input.student.surname,
    birthDate: input.student.birthDate,
    birthPlace: input.student.birthPlace,
    country: input.student.country,
  });

  const ownerPrivateKey = deriveStudentOwnerPrivateKey(
    created.password,
    created.id,
  );

  const ownerWallet = new ethers.Wallet(ownerPrivateKey, ethers.provider);

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

  for (const organization of Object.keys(
    input.student.initialAccess ?? {},
  ) as AccessOrganization[]) {
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
  const paymaster = await PaymasterFactory.deploy(await entryPoint.getAddress());
  await paymaster.waitForDeployment();

  await (
    await entryPoint.depositTo(await paymaster.getAddress(), {
      value: ethers.parseEther("1000000"),
    })
  ).wait();

  console.log("Contracts deployed:");
  console.log("EntryPoint:       ", await entryPoint.getAddress());
  console.log("StudentDeployer:  ", await studentDeployer.getAddress());
  console.log("UniversityDepl.:  ", await universityDeployer.getAddress());
  console.log("StudentsRegister: ", await studentsRegister.getAddress());
  console.log("Paymaster:        ", await paymaster.getAddress());

  // ---------------------------------------------------------------------------
  // 2. Create fixed organization wallets
  // ---------------------------------------------------------------------------
  const ntnuWallet = new ethers.Wallet(NTNU_PRIVATE_KEY, ethers.provider);
  const nordicHiringWallet = new ethers.Wallet(
    NORDIC_HIRING_PRIVATE_KEY,
    ethers.provider,
  );
  const tbsWallet = new ethers.Wallet(
    TRONDHEIM_BUSINESS_SCHOOL_PRIVATE_KEY,
    ethers.provider,
  );

  for (const wallet of [ntnuWallet, nordicHiringWallet, tbsWallet]) {
    await (
      await deployer.sendTransaction({
        to: wallet.address,
        value: ethers.parseEther("10000"),
      })
    ).wait();
  }

  // ---------------------------------------------------------------------------
  // 3. Subscribe organizations as on-chain organization accounts
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

  await (
    await studentsRegister.subscribe(
      tbsWallet.address,
      "Trondheim Business School",
      "Norway",
      "TBS",
    )
  ).wait();

  console.log("");
  console.log("Organizations subscribed:");
  console.log("NTNU EOA:                    ", ntnuWallet.address);
  console.log("Nordic Hiring EOA:           ", nordicHiringWallet.address);
  console.log("Trondheim Business School EOA:", tbsWallet.address);

  const ntnuSmartAccountAddress = await studentsRegister
    .connect(ntnuWallet)
    .getUniversityAccount();

  const nordicHiringSmartAccountAddress = await studentsRegister
    .connect(nordicHiringWallet)
    .getUniversityAccount();

  const tbsSmartAccountAddress = await studentsRegister
    .connect(tbsWallet)
    .getUniversityAccount();

  console.log("NTNU smart account:                    ", ntnuSmartAccountAddress);
  console.log("Nordic Hiring smart account:           ", nordicHiringSmartAccountAddress);
  console.log("Trondheim Business School smart account:", tbsSmartAccountAddress);

  const organizationSmartAccounts: Record<AccessOrganization, string> = {
    ntnu: ntnuSmartAccountAddress,
    nordicHiring: nordicHiringSmartAccountAddress,
  };

  // ---------------------------------------------------------------------------
  // 4. Register students for the user test
  // ---------------------------------------------------------------------------
  const studentSeeds: StudentSeed[] = [
    {
      name: "Anna",
      surname: "Berg",
      birthDate: "2000-04-12",
      birthPlace: "Trondheim",
      country: "Norway",
      homeInstitution: "NTNU University",
      registeredBy: "ntnu",
      initialAccess: {
        nordicHiring: "none",
      },
      testPurpose: "Nordic Hiring task: request read access.",
      courses: [
        {
          code: "IDATT2104",
          name: "Network Programming",
          degreeCourse: "Computer Science",
          ects: 7.5,
          grade: "A",
          evaluationDate: "2025-05-20",
        },
        {
          code: "TDT4100",
          name: "Object-Oriented Programming",
          degreeCourse: "Computer Science",
          ects: 7.5,
          grade: "B",
          evaluationDate: "2025-06-02",
        },
      ],
    },
    {
      name: "Jonas",
      surname: "Holm",
      birthDate: "1999-09-03",
      birthPlace: "Oslo",
      country: "Norway",
      homeInstitution: "NTNU University",
      registeredBy: "ntnu",
      initialAccess: {
        nordicHiring: "read",
      },
      testPurpose: "Nordic Hiring task: verify an existing course result.",
      courses: [
        {
          code: "TDT4100",
          name: "Object-Oriented Programming",
          degreeCourse: "Computer Science",
          ects: 7.5,
          grade: "C",
          evaluationDate: "2025-06-05",
        },
        {
          code: "TDT4140",
          name: "Software Engineering",
          degreeCourse: "Computer Science",
          ects: 7.5,
          grade: "B",
          evaluationDate: "2025-05-28",
        },
      ],
    },
    {
      name: "Emil",
      surname: "Nilsen",
      birthDate: "2000-11-22",
      birthPlace: "Stavanger",
      country: "Norway",
      homeInstitution: "Trondheim Business School",
      registeredBy: "tbs",
      initialAccess: {
        ntnu: "none",
        nordicHiring: "none",
      },
      testPurpose: "NTNU task: request write access.",
      courses: [
        {
          code: "TDT4180",
          name: "Human-Computer Interaction",
          degreeCourse: "Information Systems",
          ects: 7.5,
          grade: "B",
          evaluationDate: "2025-05-25",
        },
        {
          code: "TDT4100",
          name: "Object-Oriented Programming",
          degreeCourse: "Information Systems",
          ects: 7.5,
          grade: "D",
          evaluationDate: "2025-06-04",
        },
      ],
    },
    {
      name: "Sara",
      surname: "Lund",
      birthDate: "2001-01-18",
      birthPlace: "Bergen",
      country: "Norway",
      homeInstitution: "NTNU University",
      registeredBy: "ntnu",
      initialAccess: {
        nordicHiring: "none",
      },
      testPurpose: "NTNU task: issue a new academic result.",
      courses: [
        {
          code: "IDATT2104",
          name: "Network Programming",
          degreeCourse: "Computer Science",
          ects: 7.5,
          grade: "B",
          evaluationDate: "2025-05-19",
        },
        {
          code: "TDT4120",
          name: "Algorithms and Data Structures",
          degreeCourse: "Computer Science",
          ects: 7.5,
          grade: "C",
          evaluationDate: "2025-06-10",
        },
      ],
    },
    {
      name: "Nora",
      surname: "Solheim",
      birthDate: "1998-07-30",
      birthPlace: "Tromsø",
      country: "Norway",
      homeInstitution: "Trondheim Business School",
      registeredBy: "tbs",
      initialAccess: {
        ntnu: "read",
        nordicHiring: "read",
      },
      testPurpose:
        "Backup verification student. Both NTNU and Nordic Hiring have read access.",
      courses: [
        {
          code: "IDATT2104",
          name: "Network Programming",
          degreeCourse: "Information Systems",
          ects: 7.5,
          grade: "C",
          evaluationDate: "2025-05-22",
        },
        {
          code: "TDT4100",
          name: "Object-Oriented Programming",
          degreeCourse: "Information Systems",
          ects: 7.5,
          grade: "A",
          evaluationDate: "2025-06-01",
        },
      ],
    },
    {
      name: "Maya",
      surname: "Eide",
      birthDate: "2002-02-14",
      birthPlace: "Ålesund",
      country: "Norway",
      homeInstitution: "Trondheim Business School",
      registeredBy: "tbs",
      initialAccess: {
        ntnu: "none",
        nordicHiring: "none",
      },
      testPurpose: "Student reserved for the EduWallet mobile app test.",
      courses: [
        {
          code: "TDT4160",
          name: "Computers and Digital Design",
          degreeCourse: "Information Systems",
          ects: 7.5,
          grade: "B",
          evaluationDate: "2025-05-30",
        },
        {
          code: "TDT4240",
          name: "Software Architecture",
          degreeCourse: "Information Systems",
          ects: 7.5,
          grade: "A",
          evaluationDate: "2025-06-07",
        },
      ],
    },
  ];

  const generatedStudents: GeneratedStudent[] = [];

  for (const student of studentSeeds) {
    const issuerWallet = student.registeredBy === "ntnu" ? ntnuWallet : tbsWallet;

    const generatedStudent = await createDemoStudent({
      student,
      issuerWallet,
      deployerSendTransaction: (tx) => deployer.sendTransaction(tx),
      organizationSmartAccounts,
    });

    generatedStudents.push(generatedStudent);
  }

  console.log("");
  console.log("All demo students registered and course data written.");

  // ---------------------------------------------------------------------------
  // 5. Write generated local demo files
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
      trondheimBusinessSchool: {
        organizationNumber: TBS_ORG_NUMBER,
        name: "Trondheim Business School",
        privateKey: TRONDHEIM_BUSINESS_SCHOOL_PRIVATE_KEY,
        address: tbsWallet.address,
        smartAccountAddress: tbsSmartAccountAddress,
      },
    },
    students: generatedStudents,
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
  console.log("Recommended test students:");
  console.log("Nordic Hiring request read access: Anna Berg");
  console.log("Nordic Hiring verify result:       Jonas Holm");
  console.log("NTNU request write access:         Emil Nilsen");
  console.log("NTNU issue result:                 Sara Lund");
  console.log("Backup verification:               Nora Solheim");
  console.log("Mobile app test:                   Maya Eide");
  console.log("");
  console.log("Expected portal statuses:");
  console.log("NTNU: Anna write, Jonas write, Emil none, Sara write, Nora read, Maya none");
  console.log("Nordic Hiring: Anna none, Jonas read, Emil none, Sara none, Nora read, Maya none");
  console.log("");
  console.log(
    "Copy the contents of portal-backend/.env.demo-chain into portal-backend/.env",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});