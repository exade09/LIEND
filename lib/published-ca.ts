import "server-only"

import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { connection } from "next/server"

import { isLikelySolanaAddress } from "@/lib/addresses"
import { parsePublishedCa, type PublishedCa } from "@/lib/ca"

const KV_KEY = "liend:published-ca"
const FILE_NAME = "published-ca.json"
const REMOTE_TIMEOUT_MS = 8_000

export type CaStoreKind = "kv" | "postgres" | "local"

type PgClient = {
  query: <T>(text: string, params?: readonly unknown[]) => Promise<T[]>
}

let pgClient: PgClient | null = null
let postgresReady = false

function filePath(): string {
  return path.join(process.cwd(), "data", FILE_NAME)
}

function envMint(): string | null {
  const mint = process.env.NEXT_PUBLIC_LIEND_TOKEN_MINT?.trim() || null
  return mint && isLikelySolanaAddress(mint) ? mint : null
}

function envSeed(): PublishedCa {
  return { mint: envMint(), updatedAt: null }
}

function kvConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url?.trim() || !token?.trim()) return null
  return { url: url.trim().replace(/\/$/, ""), token: token.trim() }
}

function databaseUrl(): string | null {
  return process.env.DATABASE_URL?.trim() || null
}

export function storeKind(): CaStoreKind {
  if (kvConfig()) return "kv"
  if (databaseUrl()) return "postgres"
  return "local"
}

async function readFileStore(): Promise<PublishedCa | null> {
  try {
    const raw = await readFile(filePath(), "utf8")
    return parsePublishedCa(JSON.parse(raw))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
    throw error
  }
}

async function writeFileStore(value: PublishedCa): Promise<void> {
  await mkdir(path.dirname(filePath()), { recursive: true })
  await writeFile(filePath(), `${JSON.stringify(value, null, 2)}\n`, "utf8")
}

async function readKv(): Promise<PublishedCa | null> {
  const kv = kvConfig()
  if (!kv) return null
  const response = await fetch(`${kv.url}/get/${encodeURIComponent(KV_KEY)}`, {
    headers: { Authorization: `Bearer ${kv.token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(REMOTE_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`CA KV read failed: ${response.status}`)
  const body = (await response.json()) as { result?: unknown }
  if (body.result === null || body.result === undefined || body.result === "") return null
  if (typeof body.result !== "string") throw new Error("CA KV returned an invalid payload")
  return parsePublishedCa(JSON.parse(body.result))
}

async function writeKv(value: PublishedCa): Promise<void> {
  const kv = kvConfig()
  if (!kv) throw new Error("CA KV is not configured")
  const response = await fetch(kv.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${kv.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(["SET", KV_KEY, JSON.stringify(value)]),
    cache: "no-store",
    signal: AbortSignal.timeout(REMOTE_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`CA KV write failed: ${response.status}`)
}

async function postgres(): Promise<PgClient | null> {
  const url = databaseUrl()
  if (!url) return null
  if (pgClient) return pgClient

  const pg = await import("pg")
  const Pool = pg.default?.Pool ?? pg.Pool
  const pool = new Pool({
    connectionString: url,
    max: 2,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ssl: url.includes("sslmode=disable") ? false : { rejectUnauthorized: true },
  })

  pgClient = {
    async query<T>(text: string, params: readonly unknown[] = []) {
      const result = await pool.query(text, params as unknown[])
      return result.rows as T[]
    },
  }
  return pgClient
}

async function ensurePostgres(client: PgClient): Promise<void> {
  if (postgresReady) return
  await client.query(`
    CREATE TABLE IF NOT EXISTS landing_published_ca (
      id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      mint TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  postgresReady = true
}

async function readPostgres(): Promise<PublishedCa | null> {
  const client = await postgres()
  if (!client) return null
  await ensurePostgres(client)
  const rows = await client.query<{ mint: string | null; updated_at: Date | string }>(
    "SELECT mint, updated_at FROM landing_published_ca WHERE id = 1",
  )
  const row = rows[0]
  if (!row) return null
  return {
    mint: row.mint?.trim() || null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  }
}

async function writePostgres(value: PublishedCa): Promise<void> {
  const client = await postgres()
  if (!client) throw new Error("CA Postgres is not configured")
  await ensurePostgres(client)
  await client.query(
    `INSERT INTO landing_published_ca (id, mint, updated_at)
     VALUES (1, $1, $2)
     ON CONFLICT (id) DO UPDATE
     SET mint = EXCLUDED.mint, updated_at = EXCLUDED.updated_at`,
    [value.mint, value.updatedAt ?? new Date().toISOString()],
  )
}

async function readConfiguredStore(): Promise<PublishedCa | null> {
  switch (storeKind()) {
    case "kv":
      return readKv()
    case "postgres":
      return readPostgres()
    default:
      return readFileStore()
  }
}

async function writeConfiguredStore(value: PublishedCa): Promise<void> {
  switch (storeKind()) {
    case "kv":
      return writeKv(value)
    case "postgres":
      return writePostgres(value)
    default:
      return writeFileStore(value)
  }
}

export async function getPublishedCa(): Promise<PublishedCa> {
  await connection()
  try {
    const stored = await readConfiguredStore()
    return stored ?? envSeed()
  } catch {
    return envSeed()
  }
}

export async function setPublishedCa(mint: string | null): Promise<PublishedCa> {
  const value: PublishedCa = {
    mint,
    updatedAt: new Date().toISOString(),
  }
  await writeConfiguredStore(value)
  return value
}
