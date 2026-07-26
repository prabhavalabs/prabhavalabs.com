CREATE TABLE IF NOT EXISTS subscribers (
  email TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscription_rate_limits (
  rate_key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscription_rate_limits_expires_at
  ON subscription_rate_limits(expires_at);
