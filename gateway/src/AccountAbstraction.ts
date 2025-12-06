import { ethers } from "ethers";

/**
 * ---- Minimal config from env -----------------------------------
 * Re-use the same values as in the original project.
 */
const ENTRY_POINT_ADDRESS = process.env.ENTRY_POINT_ADDRESS ?? "";
const PAYMASTER_ADDRESS = process.env.PAYMASTER_ADDRESS ?? "";
const CHAIN_ID = Number(process.env.CHAIN_ID ?? "31337");

if (!ENTRY_POINT_ADDRESS) {
  throw new Error("ENTRY_POINT_ADDRESS is not set in environment");
}
if (!PAYMASTER_ADDRESS) {
  throw new Error("PAYMASTER_ADDRESS is not set in environment");
}

function logError(msg: string, err: unknown) {
  console.error(msg, err);
}

/** Minimal ABI for the EntryPoint contract (only what we use) */
const ENTRY_POINT_ABI = [
  "function getNonce(address sender, uint192 key) view returns (uint256)",
  "function handleOps((address sender,uint256 nonce,bytes initCode,bytes callData,bytes32 accountGasLimits,uint256 preVerificationGas,bytes32 gasFees,bytes paymasterAndData,bytes signature)[] ops, address payable beneficiary)",
  // for verifyTransaction:
  "event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost, uint256 actualGasUsed)",
  "event UserOperationRevertReason(bytes32 indexed userOpHash, address sender, uint256 nonce, bytes revertReason)",
];

/** Minimal ABI for the SmartAccount (only execute) */
const SMART_ACCOUNT_ABI = [
  "function execute(address target, uint256 value, bytes data)",
];

/**
 * EIP-712 domain + types for ERC-4337 user ops
 */
const DOMAIN_NAME = "ERC4337";
const DOMAIN_VERSION = "1";

function getErc4337TypedDataDomain(
  entryPoint: string,
  chainId: number
): ethers.TypedDataDomain {
  return {
    name: DOMAIN_NAME,
    version: DOMAIN_VERSION,
    chainId,
    verifyingContract: entryPoint,
  };
}

function getErc4337TypedDataTypes(): {
  [type: string]: ethers.TypedDataField[];
} {
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
 * Packs paymaster data for the user operation.
 */
function packPaymasterData(
  paymaster: string,
  paymasterVerificationGasLimit: number | bigint,
  postOpGasLimit: number | bigint,
  paymasterData: string
): string {
  return ethers.concat([
    paymaster,
    ethers.zeroPadValue(ethers.toBeHex(paymasterVerificationGasLimit), 16),
    ethers.zeroPadValue(ethers.toBeHex(postOpGasLimit), 16),
    paymasterData,
  ]);
}

/**
 * Internal UserOperation shape we work with.
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
 * Packed user op as expected by EntryPoint.handleOps
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
 * AccountAbstraction manager, now using ONLY ethers.Contract and minimal ABIs.
 */
export class AccountAbstraction {
  private provider: ethers.Provider;
  private entryPoint: ethers.Contract;
  private signer: ethers.Wallet;

  constructor(provider: ethers.Provider, signer: ethers.Wallet) {
    this.provider = provider;
    this.signer = signer;
    this.entryPoint = new ethers.Contract(
      ENTRY_POINT_ADDRESS,
      ENTRY_POINT_ABI,
      provider
    );
  }

  /**
   * Creates a user operation for a smart account call.
   */
  async createUserOp({
    sender,
    target,
    value,
    data,
    initCode = "0x",
  }: {
    sender: string;
    target: string;
    value: bigint;
    data: string;
    initCode?: string;
  }): Promise<UserOperation> {
    const accountContract = new ethers.Contract(
      sender,
      SMART_ACCOUNT_ABI,
      this.provider
    );
    const callData = accountContract.interface.encodeFunctionData("execute", [
      target,
      value,
      data,
    ]);

    const nonce: bigint = await this.entryPoint.getNonce(sender, 0);

    const feeData = await this.provider.getFeeData();

    const userOp: UserOperation = {
      sender,
      nonce,
      initCode,
      callData,
      callGasLimit: BigInt(1_000_000),
      verificationGasLimit: BigInt(5_000_000),
      preVerificationGas: BigInt(500_000),
      maxFeePerGas: feeData.maxFeePerGas || BigInt(2_000_000_000),
      maxPriorityFeePerGas:
        feeData.maxPriorityFeePerGas || BigInt(1_000_000_000),
      paymaster: PAYMASTER_ADDRESS,
      paymasterVerificationGasLimit: BigInt(2_000_000),
      paymasterPostOpGasLimit: BigInt(2_000_000),
      paymasterData: "0x",
      signature: "0x",
    };

    return userOp;
  }

  /**
   * Sign user op with EIP-712.
   */
  async signUserOp(userOp: UserOperation): Promise<UserOperation> {
    const packedUserOp = this.packUserOp(userOp);

    const signature = await this.signer.signTypedData(
      getErc4337TypedDataDomain(ENTRY_POINT_ADDRESS, CHAIN_ID),
      getErc4337TypedDataTypes(),
      packedUserOp
    );

    return { ...userOp, signature };
  }

  /**
   * Pack into the struct expected by EntryPoint.
   */
  packUserOp(userOp: UserOperation): PackedUserOperation {
    const accountGasLimits = ethers.solidityPacked(
      ["uint128", "uint128"],
      [userOp.callGasLimit, userOp.verificationGasLimit]
    );

    const gasFees = ethers.solidityPacked(
      ["uint128", "uint128"],
      [userOp.maxPriorityFeePerGas, userOp.maxFeePerGas]
    );

    const paymasterAndData = packPaymasterData(
      userOp.paymaster,
      userOp.paymasterVerificationGasLimit,
      userOp.paymasterPostOpGasLimit,
      userOp.paymasterData
    );

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
   * Execute user ops via EntryPoint.handleOps.
   */
  async executeUserOps(
    userOps: UserOperation[],
    beneficiary: string
  ): Promise<ethers.TransactionResponse> {
    try {
      const packedUserOps = await Promise.all(
        userOps.map(async (op) => {
          const signed = await this.signUserOp(op);
          return this.packUserOp(signed);
        })
      );

      const ep = this.entryPoint.connect(this.signer);
      // beneficiary cast to payable address is fine here
      return (await ep.handleOps(
        packedUserOps,
        beneficiary
      )) as ethers.TransactionResponse;
    } catch (error) {
      logError("Error sending batch user operations:", error);
      throw error;
    }
  }

  /**
   * Optional: verify transaction result (same logic as original).
   */
  verifyTransaction(
    receipt: ethers.TransactionReceipt,
    targetContract: ethers.BaseContract
  ): void {
    const entryPoint = this.entryPoint;

    if (!receipt || !receipt.logs) {
      throw new Error("No receipt or logs found in transaction receipt.");
    }

    const userOpEvents = receipt.logs.filter((log) => {
      try {
        const parsedLog = entryPoint.interface.parseLog(log);
        return parsedLog?.name === "UserOperationEvent";
      } catch {
        return false;
      }
    });

    if (userOpEvents.length === 0) {
      throw new Error("No UserOperationEvent found in transaction logs.");
    }

    let parsedUserOpEvent;
    try {
      parsedUserOpEvent = entryPoint.interface.parseLog(userOpEvents[0]);
    } catch (e) {
      throw new Error(
        "Failed to parse UserOperationEvent log: " +
          (e instanceof Error ? e.message : String(e))
      );
    }

    if (!parsedUserOpEvent?.args) {
      throw new Error("UserOperationEvent log missing args.");
    }

    const success = parsedUserOpEvent.args.success;

    if (!success) {
      const revertEvents = receipt.logs.filter((log) => {
        try {
          const parsedLog = entryPoint.interface.parseLog(log);
          return parsedLog?.name === "UserOperationRevertReason";
        } catch {
          return false;
        }
      });

      if (revertEvents.length === 0) {
        throw new Error(
          "UserOperation failed but no UserOperationRevertReason found in logs."
        );
      }

      let parsedRevertEvent;
      try {
        parsedRevertEvent = entryPoint.interface.parseLog(revertEvents[0]);
      } catch (e) {
        throw new Error(
          "Failed to parse UserOperationRevertReason log: " +
            (e instanceof Error ? e.message : String(e))
        );
      }

      if (!parsedRevertEvent?.args) {
        throw new Error("UserOperationRevertReason log missing args.");
      }

      const revertData = parsedRevertEvent.args.revertReason;

      const decodedError = targetContract.interface.parseError(revertData);
      if (decodedError) {
        throw new Error(
          `UserOperation reverted with custom error: ${
            decodedError.name
          }, args: ${JSON.stringify(decodedError.args)}`
        );
      } else {
        throw new Error("UserOperation reverted with unknown custom error.");
      }
    }
  }
}
