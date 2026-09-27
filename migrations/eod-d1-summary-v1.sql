-- EOD D1 combat summary migration v1
-- Keeps kill_events as the raw source of truth while maintaining small
-- summary tables for cheap leaderboard reads.

DROP TRIGGER IF EXISTS trg_kill_events_summary_player_killer;
DROP TRIGGER IF EXISTS trg_kill_events_summary_player_victim;
DROP TRIGGER IF EXISTS trg_kill_events_summary_weapon;
DROP TRIGGER IF EXISTS trg_kill_events_summary_cause;
DROP TRIGGER IF EXISTS trg_kill_events_summary_season;

CREATE TABLE IF NOT EXISTS combat_player_stats (
  season_id INTEGER NOT NULL,
  steam_id TEXT NOT NULL,
  username TEXT NOT NULL DEFAULT 'Unknown',
  kills INTEGER NOT NULL DEFAULT 0,
  deaths INTEGER NOT NULL DEFAULT 0,
  headshots INTEGER NOT NULL DEFAULT 0,
  longest_kill_cm REAL NOT NULL DEFAULT 0,
  first_event_at TEXT,
  last_event_at TEXT,
  PRIMARY KEY (season_id, steam_id)
);

CREATE TABLE IF NOT EXISTS combat_weapon_stats (
  season_id INTEGER NOT NULL,
  steam_id TEXT NOT NULL,
  cause TEXT NOT NULL,
  kills INTEGER NOT NULL DEFAULT 0,
  headshots INTEGER NOT NULL DEFAULT 0,
  longest_kill_cm REAL NOT NULL DEFAULT 0,
  first_kill_at TEXT,
  last_kill_at TEXT,
  PRIMARY KEY (season_id, steam_id, cause)
);

CREATE TABLE IF NOT EXISTS combat_cause_stats (
  season_id INTEGER NOT NULL,
  cause TEXT NOT NULL,
  kills INTEGER NOT NULL DEFAULT 0,
  headshots INTEGER NOT NULL DEFAULT 0,
  longest_kill_cm REAL NOT NULL DEFAULT 0,
  first_kill_at TEXT,
  last_kill_at TEXT,
  PRIMARY KEY (season_id, cause)
);

CREATE TABLE IF NOT EXISTS combat_season_stats (
  season_id INTEGER PRIMARY KEY,
  events_recorded INTEGER NOT NULL DEFAULT 0,
  pvp_kills INTEGER NOT NULL DEFAULT 0,
  first_event_at TEXT,
  last_event_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_combat_player_stats_season_kills
  ON combat_player_stats (season_id, kills DESC);
CREATE INDEX IF NOT EXISTS idx_combat_player_stats_season_deaths
  ON combat_player_stats (season_id, deaths DESC);
CREATE INDEX IF NOT EXISTS idx_combat_weapon_stats_season_cause
  ON combat_weapon_stats (season_id, cause, kills DESC);
CREATE INDEX IF NOT EXISTS idx_combat_weapon_stats_season_player
  ON combat_weapon_stats (season_id, steam_id);
CREATE INDEX IF NOT EXISTS idx_combat_cause_stats_season_kills
  ON combat_cause_stats (season_id, kills DESC);

DELETE FROM combat_player_stats;
DELETE FROM combat_weapon_stats;
DELETE FROM combat_cause_stats;
DELETE FROM combat_season_stats;

-- Backfill one row per player per season.
WITH
appearances AS (
  SELECT season_id, killer_steam_id AS steam_id, killer_name AS username,
         received_at, event_id
  FROM kill_events
  WHERE killer_steam_id IS NOT NULL AND trim(killer_steam_id) <> ''
  UNION ALL
  SELECT season_id, victim_steam_id AS steam_id, victim_name AS username,
         received_at, event_id
  FROM kill_events
  WHERE victim_steam_id IS NOT NULL AND trim(victim_steam_id) <> ''
),
latest_names AS (
  SELECT season_id, steam_id, username
  FROM (
    SELECT season_id, steam_id,
      CASE WHEN username IS NULL OR trim(username) = '' THEN 'Unknown'
           ELSE username END AS username,
      ROW_NUMBER() OVER (
        PARTITION BY season_id, steam_id
        ORDER BY received_at DESC, event_id DESC
      ) AS rn
    FROM appearances
  )
  WHERE rn = 1
),
appearance_times AS (
  SELECT season_id, steam_id,
         MIN(received_at) AS first_event_at,
         MAX(received_at) AS last_event_at
  FROM appearances
  GROUP BY season_id, steam_id
),
kill_stats AS (
  SELECT season_id, killer_steam_id AS steam_id,
         COUNT(*) AS kills,
         SUM(CASE WHEN COALESCE(is_headshot, 0) = 1 THEN 1 ELSE 0 END) AS headshots,
         MAX(COALESCE(distance_cm, 0)) AS longest_kill_cm
  FROM kill_events
  WHERE killer_steam_id IS NOT NULL
    AND victim_steam_id IS NOT NULL
    AND trim(killer_steam_id) <> ''
    AND trim(victim_steam_id) <> ''
    AND killer_steam_id <> victim_steam_id
    AND COALESCE(is_suicide, 0) = 0
  GROUP BY season_id, killer_steam_id
),
death_stats AS (
  SELECT season_id, victim_steam_id AS steam_id, COUNT(*) AS deaths
  FROM kill_events
  WHERE victim_steam_id IS NOT NULL AND trim(victim_steam_id) <> ''
  GROUP BY season_id, victim_steam_id
),
ids AS (
  SELECT DISTINCT season_id, steam_id FROM appearances
)
INSERT INTO combat_player_stats (
  season_id, steam_id, username, kills, deaths, headshots,
  longest_kill_cm, first_event_at, last_event_at
)
SELECT ids.season_id,
       ids.steam_id,
       COALESCE(latest_names.username, 'Unknown'),
       COALESCE(kill_stats.kills, 0),
       COALESCE(death_stats.deaths, 0),
       COALESCE(kill_stats.headshots, 0),
       COALESCE(kill_stats.longest_kill_cm, 0),
       appearance_times.first_event_at,
       appearance_times.last_event_at
FROM ids
LEFT JOIN latest_names
  ON latest_names.season_id = ids.season_id
 AND latest_names.steam_id = ids.steam_id
LEFT JOIN appearance_times
  ON appearance_times.season_id = ids.season_id
 AND appearance_times.steam_id = ids.steam_id
LEFT JOIN kill_stats
  ON kill_stats.season_id = ids.season_id
 AND kill_stats.steam_id = ids.steam_id
LEFT JOIN death_stats
  ON death_stats.season_id = ids.season_id
 AND death_stats.steam_id = ids.steam_id;

-- Backfill per-player weapon stats.
INSERT INTO combat_weapon_stats (
  season_id, steam_id, cause, kills, headshots, longest_kill_cm,
  first_kill_at, last_kill_at
)
SELECT season_id,
       killer_steam_id,
       COALESCE(NULLIF(trim(cause), ''), '<UNKNOWN>'),
       COUNT(*),
       SUM(CASE WHEN COALESCE(is_headshot, 0) = 1 THEN 1 ELSE 0 END),
       MAX(COALESCE(distance_cm, 0)),
       MIN(received_at),
       MAX(received_at)
FROM kill_events
WHERE killer_steam_id IS NOT NULL
  AND victim_steam_id IS NOT NULL
  AND trim(killer_steam_id) <> ''
  AND trim(victim_steam_id) <> ''
  AND killer_steam_id <> victim_steam_id
  AND COALESCE(is_suicide, 0) = 0
GROUP BY season_id, killer_steam_id,
         COALESCE(NULLIF(trim(cause), ''), '<UNKNOWN>');

-- Backfill season-wide cause stats.
INSERT INTO combat_cause_stats (
  season_id, cause, kills, headshots, longest_kill_cm,
  first_kill_at, last_kill_at
)
SELECT season_id,
       COALESCE(NULLIF(trim(cause), ''), '<UNKNOWN>'),
       COUNT(*),
       SUM(CASE WHEN COALESCE(is_headshot, 0) = 1 THEN 1 ELSE 0 END),
       MAX(COALESCE(distance_cm, 0)),
       MIN(received_at),
       MAX(received_at)
FROM kill_events
WHERE killer_steam_id IS NOT NULL
  AND victim_steam_id IS NOT NULL
  AND trim(killer_steam_id) <> ''
  AND trim(victim_steam_id) <> ''
  AND killer_steam_id <> victim_steam_id
  AND COALESCE(is_suicide, 0) = 0
GROUP BY season_id, COALESCE(NULLIF(trim(cause), ''), '<UNKNOWN>');

-- Backfill cheap season metadata.
INSERT INTO combat_season_stats (
  season_id, events_recorded, pvp_kills, first_event_at, last_event_at
)
SELECT season_id,
       COUNT(*),
       SUM(CASE
             WHEN killer_steam_id IS NOT NULL
              AND victim_steam_id IS NOT NULL
              AND trim(killer_steam_id) <> ''
              AND trim(victim_steam_id) <> ''
              AND killer_steam_id <> victim_steam_id
              AND COALESCE(is_suicide, 0) = 0
             THEN 1 ELSE 0
           END),
       MIN(received_at),
       MAX(received_at)
FROM kill_events
GROUP BY season_id;

-- Future events: update killer-side player totals.
CREATE TRIGGER trg_kill_events_summary_player_killer
AFTER INSERT ON kill_events
WHEN NEW.killer_steam_id IS NOT NULL AND trim(NEW.killer_steam_id) <> ''
BEGIN
  INSERT INTO combat_player_stats (
    season_id, steam_id, username, kills, deaths, headshots,
    longest_kill_cm, first_event_at, last_event_at
  )
  VALUES (
    NEW.season_id,
    NEW.killer_steam_id,
    CASE WHEN NEW.killer_name IS NULL OR trim(NEW.killer_name) = ''
         THEN 'Unknown' ELSE NEW.killer_name END,
    CASE WHEN NEW.victim_steam_id IS NOT NULL
               AND trim(NEW.victim_steam_id) <> ''
               AND NEW.killer_steam_id <> NEW.victim_steam_id
               AND COALESCE(NEW.is_suicide, 0) = 0
         THEN 1 ELSE 0 END,
    0,
    CASE WHEN NEW.victim_steam_id IS NOT NULL
               AND trim(NEW.victim_steam_id) <> ''
               AND NEW.killer_steam_id <> NEW.victim_steam_id
               AND COALESCE(NEW.is_suicide, 0) = 0
               AND COALESCE(NEW.is_headshot, 0) = 1
         THEN 1 ELSE 0 END,
    CASE WHEN NEW.victim_steam_id IS NOT NULL
               AND trim(NEW.victim_steam_id) <> ''
               AND NEW.killer_steam_id <> NEW.victim_steam_id
               AND COALESCE(NEW.is_suicide, 0) = 0
         THEN COALESCE(NEW.distance_cm, 0) ELSE 0 END,
    NEW.received_at,
    NEW.received_at
  )
  ON CONFLICT(season_id, steam_id) DO UPDATE SET
    username = CASE
      WHEN NEW.killer_name IS NULL OR trim(NEW.killer_name) = ''
      THEN combat_player_stats.username ELSE NEW.killer_name END,
    kills = combat_player_stats.kills + excluded.kills,
    headshots = combat_player_stats.headshots + excluded.headshots,
    longest_kill_cm = MAX(combat_player_stats.longest_kill_cm,
                          excluded.longest_kill_cm),
    first_event_at = CASE
      WHEN combat_player_stats.first_event_at IS NULL THEN excluded.first_event_at
      WHEN excluded.first_event_at IS NULL THEN combat_player_stats.first_event_at
      ELSE MIN(combat_player_stats.first_event_at, excluded.first_event_at) END,
    last_event_at = CASE
      WHEN combat_player_stats.last_event_at IS NULL THEN excluded.last_event_at
      WHEN excluded.last_event_at IS NULL THEN combat_player_stats.last_event_at
      ELSE MAX(combat_player_stats.last_event_at, excluded.last_event_at) END;
END;

-- Future events: update victim-side player totals.
CREATE TRIGGER trg_kill_events_summary_player_victim
AFTER INSERT ON kill_events
WHEN NEW.victim_steam_id IS NOT NULL AND trim(NEW.victim_steam_id) <> ''
BEGIN
  INSERT INTO combat_player_stats (
    season_id, steam_id, username, kills, deaths, headshots,
    longest_kill_cm, first_event_at, last_event_at
  )
  VALUES (
    NEW.season_id,
    NEW.victim_steam_id,
    CASE WHEN NEW.victim_name IS NULL OR trim(NEW.victim_name) = ''
         THEN 'Unknown' ELSE NEW.victim_name END,
    0, 1, 0, 0, NEW.received_at, NEW.received_at
  )
  ON CONFLICT(season_id, steam_id) DO UPDATE SET
    username = CASE
      WHEN NEW.victim_name IS NULL OR trim(NEW.victim_name) = ''
      THEN combat_player_stats.username ELSE NEW.victim_name END,
    deaths = combat_player_stats.deaths + 1,
    first_event_at = CASE
      WHEN combat_player_stats.first_event_at IS NULL THEN excluded.first_event_at
      WHEN excluded.first_event_at IS NULL THEN combat_player_stats.first_event_at
      ELSE MIN(combat_player_stats.first_event_at, excluded.first_event_at) END,
    last_event_at = CASE
      WHEN combat_player_stats.last_event_at IS NULL THEN excluded.last_event_at
      WHEN excluded.last_event_at IS NULL THEN combat_player_stats.last_event_at
      ELSE MAX(combat_player_stats.last_event_at, excluded.last_event_at) END;
END;

-- Future valid PvP kills: update per-player weapon totals.
CREATE TRIGGER trg_kill_events_summary_weapon
AFTER INSERT ON kill_events
WHEN NEW.killer_steam_id IS NOT NULL
 AND NEW.victim_steam_id IS NOT NULL
 AND trim(NEW.killer_steam_id) <> ''
 AND trim(NEW.victim_steam_id) <> ''
 AND NEW.killer_steam_id <> NEW.victim_steam_id
 AND COALESCE(NEW.is_suicide, 0) = 0
BEGIN
  INSERT INTO combat_weapon_stats (
    season_id, steam_id, cause, kills, headshots, longest_kill_cm,
    first_kill_at, last_kill_at
  )
  VALUES (
    NEW.season_id,
    NEW.killer_steam_id,
    COALESCE(NULLIF(trim(NEW.cause), ''), '<UNKNOWN>'),
    1,
    CASE WHEN COALESCE(NEW.is_headshot, 0) = 1 THEN 1 ELSE 0 END,
    COALESCE(NEW.distance_cm, 0),
    NEW.received_at,
    NEW.received_at
  )
  ON CONFLICT(season_id, steam_id, cause) DO UPDATE SET
    kills = combat_weapon_stats.kills + 1,
    headshots = combat_weapon_stats.headshots + excluded.headshots,
    longest_kill_cm = MAX(combat_weapon_stats.longest_kill_cm,
                          excluded.longest_kill_cm),
    first_kill_at = CASE
      WHEN combat_weapon_stats.first_kill_at IS NULL THEN excluded.first_kill_at
      WHEN excluded.first_kill_at IS NULL THEN combat_weapon_stats.first_kill_at
      ELSE MIN(combat_weapon_stats.first_kill_at, excluded.first_kill_at) END,
    last_kill_at = CASE
      WHEN combat_weapon_stats.last_kill_at IS NULL THEN excluded.last_kill_at
      WHEN excluded.last_kill_at IS NULL THEN combat_weapon_stats.last_kill_at
      ELSE MAX(combat_weapon_stats.last_kill_at, excluded.last_kill_at) END;
END;

-- Future valid PvP kills: update season-wide cause totals.
CREATE TRIGGER trg_kill_events_summary_cause
AFTER INSERT ON kill_events
WHEN NEW.killer_steam_id IS NOT NULL
 AND NEW.victim_steam_id IS NOT NULL
 AND trim(NEW.killer_steam_id) <> ''
 AND trim(NEW.victim_steam_id) <> ''
 AND NEW.killer_steam_id <> NEW.victim_steam_id
 AND COALESCE(NEW.is_suicide, 0) = 0
BEGIN
  INSERT INTO combat_cause_stats (
    season_id, cause, kills, headshots, longest_kill_cm,
    first_kill_at, last_kill_at
  )
  VALUES (
    NEW.season_id,
    COALESCE(NULLIF(trim(NEW.cause), ''), '<UNKNOWN>'),
    1,
    CASE WHEN COALESCE(NEW.is_headshot, 0) = 1 THEN 1 ELSE 0 END,
    COALESCE(NEW.distance_cm, 0),
    NEW.received_at,
    NEW.received_at
  )
  ON CONFLICT(season_id, cause) DO UPDATE SET
    kills = combat_cause_stats.kills + 1,
    headshots = combat_cause_stats.headshots + excluded.headshots,
    longest_kill_cm = MAX(combat_cause_stats.longest_kill_cm,
                          excluded.longest_kill_cm),
    first_kill_at = CASE
      WHEN combat_cause_stats.first_kill_at IS NULL THEN excluded.first_kill_at
      WHEN excluded.first_kill_at IS NULL THEN combat_cause_stats.first_kill_at
      ELSE MIN(combat_cause_stats.first_kill_at, excluded.first_kill_at) END,
    last_kill_at = CASE
      WHEN combat_cause_stats.last_kill_at IS NULL THEN excluded.last_kill_at
      WHEN excluded.last_kill_at IS NULL THEN combat_cause_stats.last_kill_at
      ELSE MAX(combat_cause_stats.last_kill_at, excluded.last_kill_at) END;
END;

-- Future events: update cheap season metadata.
CREATE TRIGGER trg_kill_events_summary_season
AFTER INSERT ON kill_events
BEGIN
  INSERT INTO combat_season_stats (
    season_id, events_recorded, pvp_kills, first_event_at, last_event_at
  )
  VALUES (
    NEW.season_id,
    1,
    CASE WHEN NEW.killer_steam_id IS NOT NULL
               AND NEW.victim_steam_id IS NOT NULL
               AND trim(NEW.killer_steam_id) <> ''
               AND trim(NEW.victim_steam_id) <> ''
               AND NEW.killer_steam_id <> NEW.victim_steam_id
               AND COALESCE(NEW.is_suicide, 0) = 0
         THEN 1 ELSE 0 END,
    NEW.received_at,
    NEW.received_at
  )
  ON CONFLICT(season_id) DO UPDATE SET
    events_recorded = combat_season_stats.events_recorded + 1,
    pvp_kills = combat_season_stats.pvp_kills + excluded.pvp_kills,
    first_event_at = CASE
      WHEN combat_season_stats.first_event_at IS NULL THEN excluded.first_event_at
      WHEN excluded.first_event_at IS NULL THEN combat_season_stats.first_event_at
      ELSE MIN(combat_season_stats.first_event_at, excluded.first_event_at) END,
    last_event_at = CASE
      WHEN combat_season_stats.last_event_at IS NULL THEN excluded.last_event_at
      WHEN excluded.last_event_at IS NULL THEN combat_season_stats.last_event_at
      ELSE MAX(combat_season_stats.last_event_at, excluded.last_event_at) END;
END;
