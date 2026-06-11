import { JsonRpcProvider } from "ethers";
import { RPC_URL } from "../config";

/**
 * Shared JSON-RPC provider for all gateway blockchain operations.
 */
export const provider = new JsonRpcProvider(RPC_URL);
