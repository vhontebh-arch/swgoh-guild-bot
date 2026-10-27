PRAGMA foreign_keys = ON;

-- Each import is an immutable snapshot. The active pointer is switched only
-- after every member and unit has been written and row counts are verified.
CREATE TABLE IF NOT EXISTS guilds (
  guild_id TEXT PRIMARY KEY,
  guild_name TEXT NOT NULL,
  member_count INTEGER NOT NULL DEFAULT 0,
  last_imported_at TEXT,
  import_status TEXT NOT NULL DEFAULT 'never',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roster_imports (
  import_id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  guild_name TEXT NOT NULL,
  expected_members INTEGER NOT NULL,
  expected_units INTEGER NOT NULL,
  imported_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('staging', 'active', 'failed')),
  FOREIGN KEY (guild_id) REFERENCES guilds(guild_id)
);

CREATE TABLE IF NOT EXISTS active_guild_imports (
  guild_id TEXT PRIMARY KEY,
  import_id TEXT NOT NULL UNIQUE,
  activated_at TEXT NOT NULL,
  FOREIGN KEY (guild_id) REFERENCES guilds(guild_id),
  FOREIGN KEY (import_id) REFERENCES roster_imports(import_id)
);

CREATE TABLE IF NOT EXISTS guild_members (
  import_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  ally_code TEXT,
  player_name TEXT NOT NULL,
  galactic_power INTEGER,
  roster_unit_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (import_id, player_id),
  FOREIGN KEY (import_id) REFERENCES roster_imports(import_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roster_units (
  import_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  current_rarity INTEGER,
  current_level INTEGER,
  current_tier INTEGER,
  relic_tier INTEGER,
  unit_json TEXT NOT NULL,
  PRIMARY KEY (import_id, player_id, unit_id),
  FOREIGN KEY (import_id, player_id) REFERENCES guild_members(import_id, player_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS import_runs (
  import_id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL,
  expected_members INTEGER,
  imported_members INTEGER,
  total_roster_units INTEGER,
  error_summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_members_import_gp
  ON guild_members(import_id, galactic_power DESC);
CREATE INDEX IF NOT EXISTS idx_roster_import_unit
  ON roster_units(import_id, unit_id);
CREATE INDEX IF NOT EXISTS idx_roster_import_guild_player
  ON roster_units(import_id, guild_id, player_id);
