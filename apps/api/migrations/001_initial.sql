-- LIEND initial schema.
--
-- Scope is deliberately limited to what the product genuinely needs today:
-- authentication, sessions, extension pairing and paired devices. There are
-- no tables for loans, positions, liquidity or activity, because the LIEND
-- on-chain program does not exist and inventing empty tables for it would
-- imply infrastructure that is not there.
--
-- Nothing in this schema references a hostname, so moving from Vercel URLs to
-- a custom domain has no effect on the database.

-- ---------------------------------------------------------------------------
-- Wallet authentication challenges
-- ---------------------------------------------------------------------------
-- One row per issued challenge. `consumed_at` is the replay guard: a nonce can
-- transition NULL -> timestamp exactly once, enforced by a conditional UPDATE
-- rather than a read-then-write.
CREATE TABLE IF NOT EXISTS auth_challenges (
  nonce        TEXT PRIMARY KEY,
  address      TEXT        NOT NULL,
  message      TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ
);

-- Supports expiry sweeps without scanning the table.
CREATE INDEX IF NOT EXISTS auth_challenges_expires_at_idx
  ON auth_challenges (expires_at);

-- ---------------------------------------------------------------------------
-- App user sessions (browser, cookie-backed)
-- ---------------------------------------------------------------------------
-- The cookie carries an opaque id plus an HMAC tag; the id is stored here and
-- the wallet address is resolved server-side. No claims live in the cookie, so
-- a client cannot edit its own identity.
CREATE TABLE IF NOT EXISTS sessions (
  session_id  TEXT PRIMARY KEY,
  address     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS sessions_address_idx ON sessions (address);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);

-- ---------------------------------------------------------------------------
-- Extension pairing requests
-- ---------------------------------------------------------------------------
-- Lifecycle: pending -> approved -> consumed, with rejected/expired as
-- alternative terminal states. `request_id` is opaque and high-entropy; it is
-- NOT a credential and grants nothing without an authenticated approval.
CREATE TABLE IF NOT EXISTS pairing_requests (
  request_id   TEXT PRIMARY KEY,
  user_code    TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','rejected','expired','consumed')),
  -- Set at approval time. A pairing is always bound to the wallet that approved it.
  approved_by  TEXT,
  approved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ,
  device_id    TEXT,
  -- An approved request must carry the wallet that approved it.
  CONSTRAINT pairing_approved_has_wallet
    CHECK (status <> 'approved' OR approved_by IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS pairing_requests_expires_at_idx
  ON pairing_requests (expires_at);

-- ---------------------------------------------------------------------------
-- Paired extension devices
-- ---------------------------------------------------------------------------
-- `credential_hash` is a SHA-256 of the device credential. The credential
-- itself is shown to the extension exactly once and is never stored, so a
-- database disclosure does not yield usable device credentials.
--
-- Metadata is deliberately minimal: a label and an extension version. This is
-- not a browser fingerprint and no browsing information is recorded.
CREATE TABLE IF NOT EXISTS devices (
  device_id        TEXT PRIMARY KEY,
  address          TEXT        NOT NULL,
  label            TEXT        NOT NULL,
  extension_version TEXT,
  credential_hash  TEXT        NOT NULL UNIQUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at     TIMESTAMPTZ,
  revoked_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS devices_address_idx ON devices (address);

-- ---------------------------------------------------------------------------
-- Short-lived extension API sessions
-- ---------------------------------------------------------------------------
-- Issued by presenting a device credential. Stored as a hash for the same
-- reason as above. Short TTL bounds the damage window; revoking the parent
-- device invalidates these too (see the revoke query, which cascades).
CREATE TABLE IF NOT EXISTS extension_sessions (
  token_hash  TEXT PRIMARY KEY,
  device_id   TEXT        NOT NULL REFERENCES devices (device_id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS extension_sessions_device_id_idx
  ON extension_sessions (device_id);
CREATE INDEX IF NOT EXISTS extension_sessions_expires_at_idx
  ON extension_sessions (expires_at);
