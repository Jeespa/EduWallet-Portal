import { ethers } from "ethers";
/**
 * Internal representation of a full user operation as used by this helper.
 * Closely mirrors the ERC-4337 structure but keeps separate fields
 * for easier manipulation before packing.
 */
interface UserOperation {
    sender: string;
    nonce: bigint;
    initCode: string;
    callData: string;
    callGasLimit: bigint;
    verificationGasLimit: bigint;
    preVerificationGas: bigint;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
    paymaster: string;
    paymasterVerificationGasLimit: bigint;
    paymasterPostOpGasLimit: bigint;
    paymasterData: string;
    signature: string;
}
/**
 * Packed representation of a user operation as expected by
 * EntryPoint.handleOps. Several gas related fields are compressed
 * into two 32-byte values.
 */
interface PackedUserOperation {
    sender: string;
    nonce: bigint;
    initCode: string;
    callData: string;
    accountGasLimits: string;
    preVerificationGas: bigint;
    gasFees: string;
    paymasterAndData: string;
    signature: string;
}
/**
 * Helper for constructing and sending ERC-4337 user operations.
 *
 * This class intentionally uses minimal ABIs and plain ethers.js
 * contracts so it stays independent from the original SDK and can be
 * used directly by the HTTP gateway.
 */
export declare class AccountAbstraction {
    private provider;
    private entryPoint;
    private signer;
    /**
     * Creates a new account abstraction helper.
     *
     * @param provider - JSON-RPC provider used to query fees and send transactions
     * @param signer - Wallet that signs user operations and pays for handleOps
     */
    constructor(provider: ethers.Provider, signer: ethers.Wallet);
    /**
     * Builds an unsigned user operation that calls `execute` on a student smart account.
     *
     * @param params.sender - Address of the smart account (student SCA)
     * @param params.target - Contract that should be called via `execute`
     * @param params.value - Ether value forwarded to the target
     * @param params.data - ABI encoded function data for the target call
     * @param params.initCode - Optional deployment code for the account (unused here)
     * @returns Fully populated user operation with a dummy signature
     */
    createUserOp({ sender, target, value, data, initCode, }: {
        sender: string;
        target: string;
        value: bigint;
        data: string;
        initCode?: string;
    }): Promise<UserOperation>;
    /**
     * Signs a user operation using EIP-712 typed data.
     *
     * @param userOp - Unsigned user operation
     * @returns Copy of the operation with the `signature` field filled in
     */
    signUserOp(userOp: UserOperation): Promise<UserOperation>;
    /**
     * Packs a full user operation into the compact structure expected
     * by the EntryPoint contract.
     *
     * @param userOp - Full user operation
     * @returns Packed representation ready for `handleOps`
     */
    packUserOp(userOp: UserOperation): PackedUserOperation;
    /**
     * Signs and submits one or more user operations via EntryPoint.handleOps.
     *
     * @param userOps - Array of user operations to include in the batch
     * @param beneficiary - Address that will receive the collected gas fees
     * @returns Transaction response for the handleOps call
     * @throws Propagates any error returned by ethers.js or the EntryPoint
     */
    executeUserOps(userOps: UserOperation[], beneficiary: string): Promise<ethers.TransactionResponse>;
    /**
     * Verifies that a handleOps transaction succeeded and tries to decode
     * revert reasons if it failed.
     *
     * This mirrors the logic from the original project and is mainly used
     * during development and debugging.
     *
     * @param receipt - Transaction receipt returned by ethers.js
     * @param targetContract - Contract interface used to parse custom errors
     * @throws {Error} If the user operation failed or logs cannot be interpreted
     */
    verifyTransaction(receipt: ethers.TransactionReceipt, targetContract: ethers.BaseContract): void;
}
export {};
//# sourceMappingURL=AccountAbstraction.d.ts.map