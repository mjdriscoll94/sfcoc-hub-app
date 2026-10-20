BEGIN;

CREATE TABLE IF NOT EXISTS congregation_sources (
  id BIGSERIAL PRIMARY KEY,
  congregation_id BIGINT NOT NULL REFERENCES congregations(id),
  url TEXT NOT NULL,
  source_type TEXT NOT NULL,
  is_official BOOLEAN NOT NULL,
  fields_supported TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (congregation_id, url)
);

CREATE TABLE IF NOT EXISTS proposed_changes (
  id BIGSERIAL PRIMARY KEY,
  congregation_id BIGINT NOT NULL REFERENCES congregations(id),
  field_name TEXT NOT NULL,
  current_value JSONB,
  proposed_value JSONB,
  source_url TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS proposed_changes_review_queue_idx
  ON proposed_changes (status, created_at);

CREATE TABLE IF NOT EXISTS candidate_congregations (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state CHAR(2) NOT NULL,
  zip_code VARCHAR(10),
  phone TEXT,
  email TEXT,
  website TEXT,
  facebook TEXT,
  source_url TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  possible_match_id BIGINT REFERENCES congregations(id),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'merged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

ALTER TABLE research_urls
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS congregation_id BIGINT REFERENCES congregations(id),
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'research_urls_status_check'
      AND conrelid = 'research_urls'::regclass
  ) THEN
    ALTER TABLE research_urls ADD CONSTRAINT research_urls_status_check
      CHECK (status IN ('pending', 'processing', 'matched', 'possible_new', 'manual_review', 'invalid', 'complete'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS research_urls_pending_idx
  ON research_urls (status, id);

CREATE TABLE IF NOT EXISTS mcp_oauth_authorization_codes (
  code_hash TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  resource TEXT NOT NULL,
  scopes TEXT[] NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
