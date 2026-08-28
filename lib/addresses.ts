import { project } from "../config/project";

const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

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

export function isLikelyEvmAddress(address: string): boolean {
  return EVM_ADDRESS_PATTERN.test(address);
}

export function getExplorerAddressUrl(address: string): string {
  return `${project.explorerUrl}/address/${encodeURIComponent(address)}`;
}

export function getExplorerTransactionUrl(signature: string): string {
  return `${project.explorerUrl}/tx/${encodeURIComponent(signature)}`;
}
