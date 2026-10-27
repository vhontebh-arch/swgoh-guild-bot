PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS guilds (
  guild_id TEXT PRIMARY KEY,
  guild_name TEXT NOT NULL,
  member_count INTEGER NOT NULL DEFAULT 0,
  last_imported_at TEXT,
  import_status TEXT NOT NULL DEFAULT 'never',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guild_members (
  guild_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  ally_code TEXT,
  player_name TEXT NOT NULL,
  galactic_power INTEGER,
  roster_unit_count INTEGER NOT NULL DEFAULT 0,
  last_roster_imported_at TEXT,
  roster_status TEXT NOT NULL DEFAULT 'unknown',
  PRIMARY KEY (guild_id, player_id),
  FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roster_units (
  guild_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  current_rarity INTEGER,
  current_level INTEGER,
  current_tier INTEGER,
  relic_tier INTEGER,
  unit_json TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  PRIMARY KEY (guild_id, player_id, unit_id),
  FOREIGN KEY (guild_id, player_id) REFERENCES guild_members(guild_id, player_id) ON DELETE CASCADE
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
  error_summary TEXT,
  FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_members_guild_power
  ON guild_members(guild_id, galactic_power DESC);
CREATE INDEX IF NOT EXISTS idx_roster_units_unit
  ON roster_units(guild_id, unit_id);
CREATE INDEX IF NOT EXISTS idx_import_runs_guild
  ON import_runs(guild_id, started_at DESC);
