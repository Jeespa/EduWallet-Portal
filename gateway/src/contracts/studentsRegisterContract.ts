// gateway/src/contracts/studentsRegisterContract.ts

/**
 * Minimal ABI for the StudentsRegister contract,
 * only with the functions the gateway actually needs.
 */
export const STUDENTS_REGISTER_ABI = [
  {
    inputs: [],
    name: "getStudentAccount",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getUniversityAccount",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
