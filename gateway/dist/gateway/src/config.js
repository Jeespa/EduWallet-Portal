"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHAIN_ID = exports.PAYMASTER_ADDRESS = exports.ENTRY_POINT_ADDRESS = exports.STUDENTS_REGISTER_ADDRESS = exports.RPC_URL = exports.GATEWAY_PORT = void 0;
require("dotenv/config");
/**
 * Reads a required environment variable and throws a descriptive error
 * if it is missing. Centralising this logic keeps configuration checks
 * consistent across the gateway.
 *
 * @param name - Name of the environment variable
 * @returns The non-empty value of the variable
 * @throws {Error} If the variable is not set
 */
function required(name) {
    const v = process.env[name];
    if (!v)
        throw new Error(`${name} is not set in environment`);
    return v;
}
/**
 * Port used by the HTTP gateway.
 * Defaults to 3000 to match the original prototype when PORT is unset.
 */
exports.GATEWAY_PORT = Number(process.env.PORT ?? "3000");
/**
 * JSON-RPC endpoint for the Ethereum node backing EduWallet.
 * Typically points at a local Hardhat/Anvil instance in development.
 */
exports.RPC_URL = required("RPC_URL");
/**
 * Address of the StudentsRegister contract.
 * This registry is used to look up student and university smart accounts.
 */
exports.STUDENTS_REGISTER_ADDRESS = required("STUDENTS_REGISTER_ADDRESS");
/**
 * Address of the ERC-4337 EntryPoint contract.
 * All user operations are ultimately routed through this contract.
 */
exports.ENTRY_POINT_ADDRESS = required("ENTRY_POINT_ADDRESS");
/**
 * Address of the Paymaster contract used by the account abstraction flow.
 * In the current prototype this paymaster sponsors gas for student-initiated
 * permission changes.
 */
exports.PAYMASTER_ADDRESS = required("PAYMASTER_ADDRESS");
/**
 * Chain identifier for the Ethereum network used by EduWallet.
 * Defaults to 31337, which is the common ID for local development chains.
 */
exports.CHAIN_ID = Number(process.env.CHAIN_ID ?? "31337");
//# sourceMappingURL=config.js.map