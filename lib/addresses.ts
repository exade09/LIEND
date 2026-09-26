import { project } from "../config/project";

const SOLANA_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function shortenAddress(
  address: string,
  leading = 4,
  trailing = 4,
): string {
  if (!address || address.length <= leading + trailing + 3) {
    return address;
  }

  return `${address.slice(0, leading)}...${address.slice(-trailing)}`;
}

export const formatAddress = shortenAddress;

export function isLikelySolanaAddress(address: string): boolean {
  return SOLANA_ADDRESS_PATTERN.test(address);
}

export function getExplorerAddressUrl(address: string): string {
  return `${project.explorerUrl}/account/${encodeURIComponent(address)}`;
}

export function getExplorerTransactionUrl(signature: string): string {
  return `${project.explorerUrl}/tx/${encodeURIComponent(signature)}`;
}
