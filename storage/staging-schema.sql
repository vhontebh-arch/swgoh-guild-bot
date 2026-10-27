-- Apply after storage/schema.sql. Staging data is private and keyed by import_id.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS staging_imports (
  import_id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  guild_name TEXT NOT NULL,
  expected_members INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('staging', 'completed'))
);

CREATE TABLE IF NOT EXISTS staging_members (
  import_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  ally_code TEXT,
  player_name TEXT NOT NULL,
  galactic_power INTEGER,
  roster_unit_count INTEGER NOT NULL,
  PRIMARY KEY (import_id, player_id),
  FOREIGN KEY (import_id) REFERENCES staging_imports(import_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS staging_roster_units (
  import_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  current_rarity INTEGER,
  current_level INTEGER,
  current_tier INTEGER,
  relic_tier INTEGER,
  unit_json TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  PRIMARY KEY (import_id, player_id, unit_id),
  FOREIGN KEY (import_id, player_id) REFERENCES staging_members(import_id, player_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_staging_members_import ON staging_members(import_id);
CREATE INDEX IF NOT EXISTS idx_staging_units_import ON staging_roster_units(import_id);
