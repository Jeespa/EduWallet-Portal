"use strict";
// gateway/src/contracts/studentsRegisterContract.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.STUDENTS_REGISTER_ABI = void 0;
/**
 * Minimal ABI for the StudentsRegister contract,
 * only with the functions the gateway actually needs.
 */
exports.STUDENTS_REGISTER_ABI = [
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
];
//# sourceMappingURL=studentsRegisterContract.js.map