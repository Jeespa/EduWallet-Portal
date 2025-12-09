// src/utils/conf.ts

/**
 * Configuration for IPFS storage.
 * Defines parameters needed to retrieve certificates.
 */
interface IpfsStorageConfig {
  /** Gateway URL for retrieving IPFS content */
  gatewayUrl: string;
}

/**
 * IPFS storage configuration.
 */
export const ipfsConfig: IpfsStorageConfig = {
  /** IPFS gateway url. */
  gatewayUrl: "https://ipfs.io/ipfs/",
};

/**
 * Debug mode flag. When true, logs errors to the console.
 * Set to false in production to minimize console output.
 */
export const DEBUG = true;

/**
 * Conditionally logs errors to the console based on the DEBUG flag.
 * @param message - The error message
 * @param error - The actual error object
 */
export function logError(message: string, error: unknown): void {
  if (!DEBUG) return;

  if (error instanceof Error) {
    console.error(message, error.message, error.stack);
  } else {
    console.error(message, error);
  }
}
