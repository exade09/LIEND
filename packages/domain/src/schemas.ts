/**
 * Runtime schemas for every trust boundary.
 *
 * TypeScript types are erased at runtime and prove nothing about data that
 * arrived from a network, a URL, or a future extension message. Everything
 * crossing a boundary is parsed here first.
 */

import { z } from "zod"

/** Checksummed or lowercase EVM account/contract address. */
export const EvmAddress = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Not a valid EVM address")

/** Compatibility export for existing DTO field names during the chain migration. */
export const Base58Address = EvmAddress

/** Token amounts travel as integer strings in base units — never floats. */
export const BaseUnitAmount = z
  .string()
  .regex(/^\d+$/, "Amount must be an integer string in base units")

export const DeepLinkSourceSchema = z.enum(["pons", "landing", "extension"])

export const RobinhoodChainIdSchema = z.literal(4663)

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export const WalletIdentitySchema = z.object({
  address: EvmAddress,
  chainId: RobinhoodChainIdSchema,
  /** Wallet app name as reported by the EIP-1193 provider. Display only. */
  label: z.string().min(1).max(64).nullable(),
})

export const TokenIdentitySchema = z.object({
  mint: EvmAddress,
  symbol: z.string().min(1).max(32).nullable(),
  name: z.string().min(1).max(128).nullable(),
  decimals: z.number().int().min(0).max(18).nullable(),
  logoUri: z.string().url().nullable(),
})

/**
 * TokenContext — what a future extension content script may assert.
 *
 * Deliberately minimal. It carries identification only; no price, liquidity,
 * balance or eligibility, because a content script runs inside an untrusted
 * page and cannot be a source of financial truth.
 */
export const TokenContextSchema = z.object({
  source: DeepLinkSourceSchema,
  chain: z.literal("robinhood"),
  mint: EvmAddress,
  pageUrl: z.string().url(),
  detectedAt: z.number().int().positive(),
})

// ---------------------------------------------------------------------------
// Access
// ---------------------------------------------------------------------------

export const HolderEligibilitySchema = z.object({
  wallet: EvmAddress,
  mint: EvmAddress,
  balance: BaseUnitAmount,
  required: BaseUnitAmount.nullable(),
  eligible: z.boolean(),
  checkedAt: z.number().int().positive(),
})

export const WalletPositionSchema = z.object({
  mint: EvmAddress,
  symbol: z.string().min(1).max(32),
  name: z.string().min(1).max(128),
  decimals: z.number().int().min(0).max(18),
  /** Display amount, already decimal-adjusted. */
  amount: z.string().min(1).max(48),
  amountRaw: BaseUnitAmount,
  /** Null when no market price is available. */
  valueUsd: z.number().nonnegative().nullable(),
})

export const WalletPositionsResponseSchema = z.object({
  wallet: EvmAddress,
  asOf: z.number().int().positive(),
  ethUsd: z.number().positive().nullable(),
  positions: z.array(WalletPositionSchema),
})

export const UtilityAccessSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("disconnected") }),
  z.object({ state: z.literal("token-not-launched"), wallet: EvmAddress }),
  z.object({
    state: z.literal("holder-check-pending"),
    wallet: EvmAddress,
    mint: EvmAddress,
  }),
  z.object({
    state: z.literal("not-eligible"),
    wallet: EvmAddress,
    mint: EvmAddress,
    balance: BaseUnitAmount,
    required: BaseUnitAmount.nullable(),
  }),
  z.object({
    state: z.literal("eligible"),
    wallet: EvmAddress,
    mint: EvmAddress,
    balance: BaseUnitAmount,
    required: BaseUnitAmount.nullable(),
  }),
  z.object({
    state: z.literal("error"),
    wallet: EvmAddress.nullable(),
    reason: z.string(),
  }),
])

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const AuthChallengeRequestSchema = z.object({
  address: EvmAddress,
  chainId: RobinhoodChainIdSchema,
})

export const AuthChallengeSchema = z.object({
  nonce: z.string().min(32),
  /** Exact bytes the wallet must sign. Rendered to the user by the wallet. */
  message: z.string().min(1),
  expiresAt: z.number().int().positive(),
})

export const AuthVerifyRequestSchema = z.object({
  address: EvmAddress,
  nonce: z.string().min(32),
  /** EIP-191 signature produced by MetaMask. */
  signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/, "Not a valid EVM signature"),
})

// ---------------------------------------------------------------------------
// Extension pairing
// ---------------------------------------------------------------------------

export const PairingRequestSchema = z.object({
  /** Opaque. Not a credential — worthless without an authenticated approval. */
  requestId: z.string().min(16),
  /** Shown in BOTH extension and app so the user can confirm they match. */
  userCode: z.string().min(4).max(12),
  expiresAt: z.number().int().positive(),
  status: z.enum(["pending", "approved", "rejected", "expired", "consumed"]),
})

export const ExtensionDeviceSchema = z.object({
  deviceId: z.string().min(8),
  label: z.string().min(1).max(64),
  /** Privacy-conscious metadata only. This is not a browser fingerprint. */
  extensionVersion: z.string().max(32).nullable(),
  createdAt: z.number().int().positive(),
  lastSeenAt: z.number().int().positive().nullable(),
  status: z.enum(["active", "revoked"]),
})

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export const ApiErrorCodeSchema = z.enum([
  "bad_request",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "rate_limited",
  "utility_locked",
  "token_not_launched",
  "adapter_unavailable",
  "internal",
])

export const ApiErrorSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    /** Correlates a user report with server logs. Never contains secrets. */
    requestId: z.string().optional(),
  }),
})

export type WalletIdentity = z.infer<typeof WalletIdentitySchema>
export type TokenIdentity = z.infer<typeof TokenIdentitySchema>
export type TokenContext = z.infer<typeof TokenContextSchema>
export type HolderEligibility = z.infer<typeof HolderEligibilitySchema>
export type AuthChallenge = z.infer<typeof AuthChallengeSchema>
export type PairingRequest = z.infer<typeof PairingRequestSchema>
export type ExtensionDevice = z.infer<typeof ExtensionDeviceSchema>
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>
export type ApiError = z.infer<typeof ApiErrorSchema>
export type WalletPosition = z.infer<typeof WalletPositionSchema>
export type WalletPositionsResponse = z.infer<typeof WalletPositionsResponseSchema>
