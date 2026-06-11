import { University__factory } from "../../../typechain-types/factories/contracts/University__factory";
import { provider } from "../blockchain/provider";

export type UniversityMetadata = {
  name: string;
  country: string;
  shortName: string;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const EMPTY_UNIVERSITY_METADATA: UniversityMetadata = {
  name: "",
  country: "",
  shortName: "",
};

function isContractAddress(value: string | undefined): value is string {
  return Boolean(value && value !== ZERO_ADDRESS && value.startsWith("0x"));
}

/**
 * Fetches metadata for university smart accounts.
 *
 * Metadata failures are logged and skipped, so one bad university address does
 * not break the whole student login or permission overview response.
 */
export async function fetchUniversitiesMeta(
  addresses: string[],
): Promise<Map<string, UniversityMetadata>> {
  const uniqueAddresses = Array.from(new Set(addresses.filter(isContractAddress)));

  const map = new Map<string, UniversityMetadata>();

  for (const address of uniqueAddresses) {
    try {
      const universityContract = University__factory.connect(address, provider as any);
      const info = await universityContract.getUniversityInfo();

      map.set(address, {
        name: info.name,
        country: info.country,
        shortName: info.shortName,
      });
    } catch (err) {
      console.error("Failed to fetch university info for", address, err);
    }
  }

  return map;
}
