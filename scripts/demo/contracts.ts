import { ethers } from "hardhat";

export type DeployedDemoContracts = {
  entryPoint: any;
  studentDeployer: any;
  universityDeployer: any;
  studentsRegister: any;
  paymaster: any;
};

export async function deployDemoContracts(): Promise<DeployedDemoContracts> {
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

  return {
    entryPoint,
    studentDeployer,
    universityDeployer,
    studentsRegister,
    paymaster,
  };
}
