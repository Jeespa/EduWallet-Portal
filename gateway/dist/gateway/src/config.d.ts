import "dotenv/config";
/**
 * Port used by the HTTP gateway.
 * Defaults to 3000 to match the original prototype when PORT is unset.
 */
export declare const GATEWAY_PORT: number;
/**
 * JSON-RPC endpoint for the Ethereum node backing EduWallet.
 * Typically points at a local Hardhat/Anvil instance in development.
 */
export declare const RPC_URL: string;
/**
 * Address of the StudentsRegister contract.
 * This registry is used to look up student and university smart accounts.
 */
export declare const STUDENTS_REGISTER_ADDRESS: string;
/**
 * Address of the ERC-4337 EntryPoint contract.
 * All user operations are ultimately routed through this contract.
 */
export declare const ENTRY_POINT_ADDRESS: string;
/**
 * Address of the Paymaster contract used by the account abstraction flow.
 * In the current prototype this paymaster sponsors gas for student-initiated
 * permission changes.
 */
export declare const PAYMASTER_ADDRESS: string;
/**
 * Chain identifier for the Ethereum network used by EduWallet.
 * Defaults to 31337, which is the common ID for local development chains.
 */
export declare const CHAIN_ID: number;
//# sourceMappingURL=config.d.ts.map