import { describeCause } from "../_lib/causeCatalog.js";

function publicSeason(season) {
  return {
    id: season.id,
    name: season.name,
    startsAt: season.starts_at,
    endsAt: season.ends_at,
    finalizedAt: season.finalized_at,
    isActive: Boolean(season.is_active),
    combatTrackingStartedAt: season.combat_tracking_started_at ?? null
  };
}

function round(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  const factor = 10 ** digits;
  return Math.round(number * factor) / factor;
}

const LATEST_NAMES_CTE = `
  WITH appearances AS (
    SELECT
      killer_steam_id AS steam_id,
      killer_name AS username,
      received_at,
      event_id
    FROM kill_events
    WHERE season_id = ?1
      AND killer_steam_id IS NOT NULL
      AND trim(killer_steam_id) <> ''

    UNION ALL

    SELECT
      victim_steam_id AS steam_id,
      victim_name AS username,
      received_at,
      event_id
    FROM kill_events
    WHERE season_id = ?1
      AND victim_steam_id IS NOT NULL
      AND trim(victim_steam_id) <> ''
  ),
  latest_names AS (
    SELECT steam_id, username
    FROM (
      SELECT
        steam_id,
        CASE
          WHEN username IS NULL OR trim(username) = '' THEN 'Unknown'
          ELSE username
        END AS username,
        ROW_NUMBER() OVER (
          PARTITION BY steam_id
          ORDER BY received_at DESC, event_id DESC
        ) AS rn
      FROM appearances
    )
    WHERE rn = 1
  )
`;

const RIVALRY_COUNTS_CTE = `
  , pair_counts AS (
    SELECT
      killer_steam_id AS killer_id,
      victim_steam_id AS victim_id,
      COUNT(*) AS kills
    FROM kill_events
    WHERE season_id = ?1
      AND killer_steam_id IS NOT NULL
      AND trim(killer_steam_id) <> ''
      AND victim_steam_id IS NOT NULL
      AND trim(victim_steam_id) <> ''
      AND killer_steam_id <> victim_steam_id
      AND COALESCE(is_suicide, 0) = 0
    GROUP BY killer_steam_id, victim_steam_id
  ),
  victim_tops AS (
    SELECT victim_id, MAX(kills) AS top_kills
    FROM pair_counts
    GROUP BY victim_id
  ),
  contender_counts AS (
    SELECT
      pc.victim_id,
      vt.top_kills,
      COUNT(*) AS contender_count
    FROM pair_counts pc
    JOIN victim_tops vt
      ON vt.victim_id = pc.victim_id
      AND vt.top_kills = pc.kills
    GROUP BY pc.victim_id, vt.top_kills
  )
`;

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const steamId = (url.searchParams.get("steamId") ?? "").trim();
    const seasonId = url.searchParams.get("season");

    if (!/^\d{15,20}$/.test(steamId)) {
      return Response.json(
        { ok: false, error: "invalid_steam_id" },
        { status: 400 }
      );
    }

    const seasonsResult = await context.env.DB.prepare(`
      SELECT
        id,
        name,
        starts_at,
        ends_at,
        finalized_at,
        is_active,
        combat_tracking_started_at
      FROM seasons
      ORDER BY starts_at DESC, id DESC
    `).all();

    const seasons = seasonsResult.results ?? [];
    const season = seasonId
      ? seasons.find((item) => String(item.id) === seasonId)
      : seasons.find((item) => item.is_active) ?? seasons[0];

    if (!season) {
      return Response.json(
        { ok: false, error: seasonId ? "season_not_found" : "no_seasons" },
        { status: 404 }
      );
    }

    const identity = await context.env.DB.prepare(`${LATEST_NAMES_CTE}
      SELECT username
      FROM latest_names
      WHERE steam_id = ?2
      LIMIT 1
    `).bind(season.id, steamId).first();

    if (!identity) {
      return Response.json({
        ok: true,
        found: false,
        steamId,
        season: publicSeason(season),
        seasons: seasons.map(publicSeason)
      });
    }

    const summary = await context.env.DB.prepare(`
      SELECT
        SUM(CASE
          WHEN killer_steam_id = ?2
            AND victim_steam_id IS NOT NULL
            AND killer_steam_id <> victim_steam_id
            AND COALESCE(is_suicide, 0) = 0
          THEN 1 ELSE 0 END) AS kills,
        SUM(CASE WHEN victim_steam_id = ?2 THEN 1 ELSE 0 END) AS deaths,
        SUM(CASE
          WHEN killer_steam_id = ?2
            AND victim_steam_id IS NOT NULL
            AND killer_steam_id <> victim_steam_id
            AND COALESCE(is_suicide, 0) = 0
            AND COALESCE(is_headshot, 0) = 1
          THEN 1 ELSE 0 END) AS headshots,
        SUM(CASE
          WHEN victim_steam_id = ?2
            AND COALESCE(is_suicide, 0) = 1
          THEN 1 ELSE 0 END) AS suicides,
        SUM(CASE
          WHEN victim_steam_id = ?2
            AND COALESCE(is_suicide, 0) = 1
            AND COALESCE(is_falling, 0) = 1
          THEN 1 ELSE 0 END) AS bellyflops,
        SUM(CASE
          WHEN killer_steam_id = ?2
            AND victim_steam_id IS NOT NULL
            AND killer_steam_id <> victim_steam_id
            AND COALESCE(is_suicide, 0) = 0
            AND COALESCE(is_melee, 0) = 1
          THEN 1 ELSE 0 END) AS melee_kills,
        SUM(CASE
          WHEN killer_steam_id = ?2
            AND victim_steam_id IS NOT NULL
            AND killer_steam_id <> victim_steam_id
            AND COALESCE(is_suicide, 0) = 0
            AND COALESCE(is_roadkill, 0) = 1
          THEN 1 ELSE 0 END) AS roadkills,
        SUM(CASE
          WHEN killer_steam_id = ?2
            AND victim_steam_id IS NOT NULL
            AND killer_steam_id <> victim_steam_id
            AND COALESCE(is_suicide, 0) = 0
            AND COALESCE(is_vehicle_explosion, 0) = 1
          THEN 1 ELSE 0 END) AS vehicle_explosion_kills,
        SUM(CASE
          WHEN killer_steam_id = ?2
            AND victim_steam_id IS NOT NULL
            AND killer_steam_id <> victim_steam_id
            AND COALESCE(is_suicide, 0) = 0
            AND COALESCE(is_penetration, 0) = 1
          THEN 1 ELSE 0 END) AS penetration_kills,
        SUM(CASE
          WHEN killer_steam_id = ?2
            AND victim_steam_id IS NOT NULL
            AND killer_steam_id <> victim_steam_id
            AND COALESCE(is_suicide, 0) = 0
            AND COALESCE(is_ricochet, 0) = 1
          THEN 1 ELSE 0 END) AS ricochet_kills,
        MAX(CASE
          WHEN killer_steam_id = ?2
            AND victim_steam_id IS NOT NULL
            AND killer_steam_id <> victim_steam_id
            AND COALESCE(is_suicide, 0) = 0
          THEN distance_cm END) AS longest_kill_cm,
        AVG(CASE
          WHEN killer_steam_id = ?2
            AND victim_steam_id IS NOT NULL
            AND killer_steam_id <> victim_steam_id
            AND COALESCE(is_suicide, 0) = 0
          THEN distance_cm END) AS average_kill_cm,
        COUNT(DISTINCT CASE
          WHEN killer_steam_id = ?2
            AND victim_steam_id IS NOT NULL
            AND killer_steam_id <> victim_steam_id
            AND COALESCE(is_suicide, 0) = 0
          THEN victim_steam_id END) AS unique_victims,
        COUNT(DISTINCT CASE
          WHEN victim_steam_id = ?2
            AND killer_steam_id IS NOT NULL
            AND killer_steam_id <> victim_steam_id
            AND COALESCE(is_suicide, 0) = 0
          THEN killer_steam_id END) AS unique_killers,
        COUNT(DISTINCT CASE
          WHEN (killer_steam_id = ?2 OR victim_steam_id = ?2)
            AND match_id IS NOT NULL
            AND trim(match_id) <> ''
          THEN match_id END) AS matches_with_combat,
        MIN(received_at) AS first_event_at,
        MAX(received_at) AS last_event_at
      FROM kill_events
      WHERE season_id = ?1
        AND (killer_steam_id = ?2 OR victim_steam_id = ?2)
    `).bind(season.id, steamId).first();

    const nemesisCandidatesResult = await context.env.DB.prepare(`${LATEST_NAMES_CTE}${RIVALRY_COUNTS_CTE}
      SELECT
        pc.killer_id AS steamId,
        COALESCE(ln.username, 'Unknown') AS username,
        pc.kills AS killsAgainstPlayer,
        vt.top_kills AS topKills,
        cc.contender_count AS contenderCount
      FROM pair_counts pc
      JOIN victim_tops vt
        ON vt.victim_id = pc.victim_id
      JOIN contender_counts cc
        ON cc.victim_id = pc.victim_id
      LEFT JOIN latest_names ln
        ON ln.steam_id = pc.killer_id
      WHERE pc.victim_id = ?2
        AND pc.kills = vt.top_kills
        AND vt.top_kills >= 2
      ORDER BY username COLLATE NOCASE ASC, steamId ASC
    `).bind(season.id, steamId).all();

    const nemesisCandidates = (nemesisCandidatesResult.results ?? []).map((row) => ({
      steamId: String(row.steamId),
      username: row.username ?? "Unknown",
      killsAgainstPlayer: Number(row.killsAgainstPlayer ?? 0)
    }));

    // A nemesis must be the single outright top killer against this player.
    // Ties do not produce a nemesis.
    const nemesis = nemesisCandidates.length === 1
      ? { status: "sole", topKills: nemesisCandidates[0].killsAgainstPlayer, contender: nemesisCandidates[0] }
      : { status: "none", topKills: 0, contender: null };

    const nemesisOfResult = await context.env.DB.prepare(`${LATEST_NAMES_CTE}${RIVALRY_COUNTS_CTE}
      SELECT
        pc.victim_id AS steamId,
        COALESCE(ln.username, 'Unknown') AS username,
        pc.kills AS timesKilled
      FROM pair_counts pc
      JOIN victim_tops vt
        ON vt.victim_id = pc.victim_id
      JOIN contender_counts cc
        ON cc.victim_id = pc.victim_id
      LEFT JOIN latest_names ln
        ON ln.steam_id = pc.victim_id
      WHERE pc.killer_id = ?2
        AND pc.kills = vt.top_kills
        AND vt.top_kills >= 2
        AND cc.contender_count = 1
      ORDER BY
        pc.kills DESC,
        username COLLATE NOCASE ASC,
        steamId ASC
    `).bind(season.id, steamId).all();

    const nemesisOf = (nemesisOfResult.results ?? []).map((row) => ({
      steamId: String(row.steamId),
      username: row.username ?? "Unknown",
      timesKilled: Number(row.timesKilled ?? 0)
    }));

    const favoriteVictim = await context.env.DB.prepare(`${LATEST_NAMES_CTE}
      SELECT
        ke.victim_steam_id AS steamId,
        COALESCE(ln.username, 'Unknown') AS username,
        COUNT(*) AS timesKilled
      FROM kill_events ke
      LEFT JOIN latest_names ln
        ON ln.steam_id = ke.victim_steam_id
      WHERE ke.season_id = ?1
        AND ke.killer_steam_id = ?2
        AND ke.victim_steam_id IS NOT NULL
        AND ke.killer_steam_id <> ke.victim_steam_id
        AND COALESCE(ke.is_suicide, 0) = 0
      GROUP BY ke.victim_steam_id, ln.username
      ORDER BY timesKilled DESC, username COLLATE NOCASE ASC, steamId ASC
      LIMIT 1
    `).bind(season.id, steamId).first();

    const topWeapons = await context.env.DB.prepare(`
      SELECT
        COALESCE(NULLIF(trim(cause), ''), 'Unknown') AS cause,
        COUNT(*) AS kills,
        SUM(CASE WHEN COALESCE(is_headshot, 0) = 1 THEN 1 ELSE 0 END) AS headshots,
        MAX(distance_cm) AS longest_kill_cm
      FROM kill_events
      WHERE season_id = ?1
        AND killer_steam_id = ?2
        AND victim_steam_id IS NOT NULL
        AND killer_steam_id <> victim_steam_id
        AND COALESCE(is_suicide, 0) = 0
      GROUP BY COALESCE(NULLIF(trim(cause), ''), 'Unknown')
      ORDER BY kills DESC, cause COLLATE NOCASE ASC
      LIMIT 10
    `).bind(season.id, steamId).all();

    const mapPerformance = await context.env.DB.prepare(`
      SELECT
        COALESCE(NULLIF(trim(map_name), ''), 'Unknown') AS mapName,
        SUM(CASE
          WHEN killer_steam_id = ?2
            AND victim_steam_id IS NOT NULL
            AND killer_steam_id <> victim_steam_id
            AND COALESCE(is_suicide, 0) = 0
          THEN 1 ELSE 0 END) AS kills,
        SUM(CASE WHEN victim_steam_id = ?2 THEN 1 ELSE 0 END) AS deaths
      FROM kill_events
      WHERE season_id = ?1
        AND (killer_steam_id = ?2 OR victim_steam_id = ?2)
      GROUP BY COALESCE(NULLIF(trim(map_name), ''), 'Unknown')
      ORDER BY kills DESC, deaths ASC, mapName COLLATE NOCASE ASC
    `).bind(season.id, steamId).all();

    const recentCombat = await context.env.DB.prepare(`
      SELECT
        event_id AS eventId,
        received_at AS receivedAt,
        map_name AS mapName,
        killer_name AS killerName,
        killer_steam_id AS killerSteamId,
        victim_name AS victimName,
        victim_steam_id AS victimSteamId,
        cause,
        distance_cm AS distanceCm,
        is_headshot AS isHeadshot,
        is_penetration AS isPenetration,
        is_ricochet AS isRicochet,
        is_melee AS isMelee,
        is_vehicle_explosion AS isVehicleExplosion,
        is_roadkill AS isRoadkill,
        is_falling AS isFalling,
        is_suicide AS isSuicide
      FROM kill_events
      WHERE season_id = ?1
        AND (killer_steam_id = ?2 OR victim_steam_id = ?2)
      ORDER BY received_at DESC, event_id DESC
      LIMIT 25
    `).bind(season.id, steamId).all();

    const kills = Number(summary?.kills ?? 0);
    const deaths = Number(summary?.deaths ?? 0);
    const headshots = Number(summary?.headshots ?? 0);

    return Response.json({
      ok: true,
      found: true,
      player: {
        steamId,
        username: identity.username ?? "Unknown"
      },
      season: publicSeason(season),
      seasons: seasons.map(publicSeason),
      summary: {
        kills,
        deaths,
        kd: deaths === 0 ? kills : round(kills / deaths, 2),
        headshots,
        headshotRate: kills > 0 ? round((headshots / kills) * 100, 1) : 0,
        suicides: Number(summary?.suicides ?? 0),
        bellyflops: Number(summary?.bellyflops ?? 0),
        meleeKills: Number(summary?.melee_kills ?? 0),
        roadkills: Number(summary?.roadkills ?? 0),
        vehicleExplosionKills: Number(summary?.vehicle_explosion_kills ?? 0),
        penetrationKills: Number(summary?.penetration_kills ?? 0),
        ricochetKills: Number(summary?.ricochet_kills ?? 0),
        longestKillMeters: round(Number(summary?.longest_kill_cm ?? 0) / 100, 1),
        averageKillDistanceMeters: round(Number(summary?.average_kill_cm ?? 0) / 100, 1),
        uniqueVictims: Number(summary?.unique_victims ?? 0),
        uniqueKillers: Number(summary?.unique_killers ?? 0),
        matchesWithCombat: Number(summary?.matches_with_combat ?? 0),
        nemesisCount: nemesisOf.length,
        firstEventAt: summary?.first_event_at ?? null,
        lastEventAt: summary?.last_event_at ?? null
      },
      nemesis,
      nemesisOf,
      favoriteVictim: favoriteVictim ?? null,
      topWeapons: (topWeapons.results ?? []).map((row) => {
        const cause = describeCause(row.cause);

        return {
          cause: row.cause,
          causeName: cause.name,
          causeCategory: cause.category,
          causeIdentified: cause.identified,
          kills: Number(row.kills ?? 0),
          headshots: Number(row.headshots ?? 0),
          longestKillMeters: round(Number(row.longest_kill_cm ?? 0) / 100, 1)
        };
      }),
      mapPerformance: (mapPerformance.results ?? []).map((row) => ({
        mapName: row.mapName,
        kills: Number(row.kills ?? 0),
        deaths: Number(row.deaths ?? 0),
        kd: Number(row.deaths ?? 0) === 0
          ? Number(row.kills ?? 0)
          : round(Number(row.kills ?? 0) / Number(row.deaths ?? 0), 2)
      })),
      recentCombat: (recentCombat.results ?? []).map((row) => {
        const cause = describeCause(row.cause);

        return {
          ...row,
          rawCause: row.cause ?? null,
          cause: cause.name,
          causeCategory: cause.category,
          causeIdentified: cause.identified
        };
      })
    }, {
      headers: {
        "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=60"
      }
    });
  } catch (error) {
    console.error("Player stats error:", error);

    return Response.json(
      { ok: false, error: "player_stats_unavailable" },
      { status: 502 }
    );
  }
}
