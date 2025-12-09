"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountAbstraction = void 0;
const ethers_1 = require("ethers");
const config_1 = require("./config");
/**
 * Light-weight error logger used inside this module.
 * Keeps a single place to change logging behaviour if needed later.
 *
 * @param msg - Human readable message describing the context
 * @param err - Original error object
 */
function logError(msg, err) {
    console.error(msg, err);
}
/** Minimal ABI for the EntryPoint contract (only the pieces we use). */
const ENTRY_POINT_ABI = [
    "function getNonce(address sender, uint192 key) view returns (uint256)",
    "function handleOps((address sender,uint256 nonce,bytes initCode,bytes callData,bytes32 accountGasLimits,uint256 preVerificationGas,bytes32 gasFees,bytes paymasterAndData,bytes signature)[] ops, address payable beneficiary)",
    // For verifyTransaction:
    "event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost, uint256 actualGasUsed)",
    "event UserOperationRevertReason(bytes32 indexed userOpHash, address sender, uint256 nonce, bytes revertReason)",
];
/** Minimal ABI for the SmartAccount contract (only the execute function). */
const SMART_ACCOUNT_ABI = [
    "function execute(address target, uint256 value, bytes data)",
];
/**
 * EIP-712 domain parameters for ERC-4337 user operations.
 * These values must match the EntryPoint implementation.
 */
const DOMAIN_NAME = "ERC4337";
const DOMAIN_VERSION = "1";
/**
 * Builds the EIP-712 domain for signing packed user operations.
 *
 * @param entryPoint - Address of the EntryPoint contract
 * @param chainId - Current chain identifier
 * @returns Typed data domain structure for ethers.js
 */
function getErc4337TypedDataDomain(entryPoint, chainId) {
    return {
        name: DOMAIN_NAME,
        version: DOMAIN_VERSION,
        chainId,
        verifyingContract: entryPoint,
    };
}
/**
 * Returns the EIP-712 type definition for packed user operations.
 *
 * @returns Mapping from type name to list of typed fields
 */
function getErc4337TypedDataTypes() {
    return {
        PackedUserOperation: [
            { name: "sender", type: "address" },
            { name: "nonce", type: "uint256" },
            { name: "initCode", type: "bytes" },
            { name: "callData", type: "bytes" },
            { name: "accountGasLimits", type: "bytes32" },
            { name: "preVerificationGas", type: "uint256" },
            { name: "gasFees", type: "bytes32" },
            { name: "paymasterAndData", type: "bytes" },
        ],
    };
}
/**
 * Packs paymaster details into the `paymasterAndData` field
 * expected by the EntryPoint contract.
 *
 * @param paymaster - Address of the paymaster contract
 * @param paymasterVerificationGasLimit - Gas limit for the validation phase
 * @param postOpGasLimit - Gas limit for the post-operation phase
 * @param paymasterData - Optional opaque payload interpreted by the paymaster
 * @returns Encoded `paymasterAndData` byte string
 */
function packPaymasterData(paymaster, paymasterVerificationGasLimit, postOpGasLimit, paymasterData) {
    return ethers_1.ethers.concat([
        paymaster,
        ethers_1.ethers.zeroPadValue(ethers_1.ethers.toBeHex(paymasterVerificationGasLimit), 16),
        ethers_1.ethers.zeroPadValue(ethers_1.ethers.toBeHex(postOpGasLimit), 16),
        paymasterData,
    ]);
}
/**
 * Helper for constructing and sending ERC-4337 user operations.
 *
 * This class intentionally uses minimal ABIs and plain ethers.js
 * contracts so it stays independent from the original SDK and can be
 * used directly by the HTTP gateway.
 */
class AccountAbstraction {
    /**
     * Creates a new account abstraction helper.
     *
     * @param provider - JSON-RPC provider used to query fees and send transactions
     * @param signer - Wallet that signs user operations and pays for handleOps
     */
    constructor(provider, signer) {
        this.provider = provider;
        this.signer = signer;
        this.entryPoint = new ethers_1.ethers.Contract(config_1.ENTRY_POINT_ADDRESS, ENTRY_POINT_ABI, provider);
    }
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
    async createUserOp({ sender, target, value, data, initCode = "0x", }) {
        const accountContract = new ethers_1.ethers.Contract(sender, SMART_ACCOUNT_ABI, this.provider);
        const callData = accountContract.interface.encodeFunctionData("execute", [
            target,
            value,
            data,
        ]);
        // Cast to any to avoid strict typing issues on ABI-dynamic function
        const nonce = await this.entryPoint.getNonce(sender, 0);
        const feeData = await this.provider.getFeeData();
        const userOp = {
            sender,
            nonce,
            initCode,
            callData,
            // Static gas limits tuned for local development; can be adjusted later.
            callGasLimit: BigInt(1000000),
            verificationGasLimit: BigInt(5000000),
            preVerificationGas: BigInt(500000),
            maxFeePerGas: feeData.maxFeePerGas || BigInt(2000000000),
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || BigInt(1000000000),
            paymaster: config_1.PAYMASTER_ADDRESS,
            paymasterVerificationGasLimit: BigInt(2000000),
            paymasterPostOpGasLimit: BigInt(2000000),
            paymasterData: "0x",
            signature: "0x",
        };
        return userOp;
    }
    /**
     * Signs a user operation using EIP-712 typed data.
     *
     * @param userOp - Unsigned user operation
     * @returns Copy of the operation with the `signature` field filled in
     */
    async signUserOp(userOp) {
        const packedUserOp = this.packUserOp(userOp);
        const signature = await this.signer.signTypedData(getErc4337TypedDataDomain(config_1.ENTRY_POINT_ADDRESS, config_1.CHAIN_ID), getErc4337TypedDataTypes(), packedUserOp);
        return { ...userOp, signature };
    }
    /**
     * Packs a full user operation into the compact structure expected
     * by the EntryPoint contract.
     *
     * @param userOp - Full user operation
     * @returns Packed representation ready for `handleOps`
     */
    packUserOp(userOp) {
        const accountGasLimits = ethers_1.ethers.solidityPacked(["uint128", "uint128"], [userOp.callGasLimit, userOp.verificationGasLimit]);
        const gasFees = ethers_1.ethers.solidityPacked(["uint128", "uint128"], [userOp.maxPriorityFeePerGas, userOp.maxFeePerGas]);
        const paymasterAndData = packPaymasterData(userOp.paymaster, userOp.paymasterVerificationGasLimit, userOp.paymasterPostOpGasLimit, userOp.paymasterData);
        return {
            sender: userOp.sender,
            nonce: userOp.nonce,
            initCode: userOp.initCode,
            callData: userOp.callData,
            accountGasLimits,
            preVerificationGas: userOp.preVerificationGas,
            gasFees,
            paymasterAndData,
            signature: userOp.signature,
        };
    }
    /**
     * Signs and submits one or more user operations via EntryPoint.handleOps.
     *
     * @param userOps - Array of user operations to include in the batch
     * @param beneficiary - Address that will receive the collected gas fees
     * @returns Transaction response for the handleOps call
     * @throws Propagates any error returned by ethers.js or the EntryPoint
     */
    async executeUserOps(userOps, beneficiary) {
        try {
            const packedUserOps = await Promise.all(userOps.map(async (op) => {
                const signed = await this.signUserOp(op);
                return this.packUserOp(signed);
            }));
            // Cast to any so TS does not complain about ABI-dynamic method
            const ep = this.entryPoint.connect(this.signer);
            const tx = await ep.handleOps(packedUserOps, beneficiary);
            return tx;
        }
        catch (error) {
            logError("Error sending batch user operations:", error);
            throw error;
        }
    }
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
    verifyTransaction(receipt, targetContract) {
        const entryPoint = this.entryPoint;
        if (!receipt || !receipt.logs) {
            throw new Error("No receipt or logs found in transaction receipt.");
        }
        // Filter logs that look like UserOperationEvent
        const userOpEvents = receipt.logs.filter((log) => {
            try {
                const parsedLog = entryPoint.interface.parseLog(log);
                return parsedLog?.name === "UserOperationEvent";
            }
            catch {
                return false;
            }
        });
        if (userOpEvents.length === 0) {
            throw new Error("No UserOperationEvent found in transaction logs.");
        }
        let parsedUserOpEvent;
        try {
            const firstUserOpLog = userOpEvents[0];
            if (!firstUserOpLog) {
                throw new Error("No UserOperationEvent found in transaction logs.");
            }
            parsedUserOpEvent = entryPoint.interface.parseLog(firstUserOpLog);
        }
        catch (e) {
            throw new Error("Failed to parse UserOperationEvent log: " +
                (e instanceof Error ? e.message : String(e)));
        }
        if (!parsedUserOpEvent?.args) {
            throw new Error("UserOperationEvent log missing args.");
        }
        const success = parsedUserOpEvent.args.success;
        if (!success) {
            // Look for revert reason events
            const revertEvents = receipt.logs.filter((log) => {
                try {
                    const parsedLog = entryPoint.interface.parseLog(log);
                    return parsedLog?.name === "UserOperationRevertReason";
                }
                catch {
                    return false;
                }
            });
            if (revertEvents.length === 0) {
                throw new Error("UserOperation failed but no UserOperationRevertReason found in logs.");
            }
            let parsedRevertEvent;
            try {
                const firstRevertLog = revertEvents[0];
                if (!firstRevertLog) {
                    throw new Error("UserOperation failed but no UserOperationRevertReason found in logs.");
                }
                parsedRevertEvent = entryPoint.interface.parseLog(firstRevertLog);
            }
            catch (e) {
                throw new Error("Failed to parse UserOperationRevertReason log: " +
                    (e instanceof Error ? e.message : String(e)));
            }
            if (!parsedRevertEvent?.args) {
                throw new Error("UserOperationRevertReason log missing args.");
            }
            const revertData = parsedRevertEvent.args.revertReason;
            const decodedError = targetContract.interface.parseError(revertData);
            if (decodedError) {
                throw new Error(`UserOperation reverted with custom error: ${decodedError.name}, args: ${JSON.stringify(decodedError.args)}`);
            }
            else {
                throw new Error("UserOperation reverted with unknown custom error.");
            }
        }
    }
}
exports.AccountAbstraction = AccountAbstraction;
//# sourceMappingURL=AccountAbstraction.js.map