const BISECT_SERVER_ID = "6c162067-7032-4d2c-8431-e2e2bf36be4f";
const BISECT_BASE_URL =
  `https://games.bisecthosting.com/api/client/servers/${BISECT_SERVER_ID}/player`;

const PER_PAGE = 100;
const SYNC_INTERVAL_MS = 30 * 60 * 1000;
const FETCH_BATCH_SIZE = 5;

async function fetchBisectPage(apiKey, page) {
  const response = await fetch(
    `${BISECT_BASE_URL}?page=${page}&per_page=${PER_PAGE}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json"
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Bisect API returned ${response.status} on page ${page}`);
  }

  return response.json();
}

function sanitizePlayer(player) {
  const attributes = player?.attributes ?? {};
  const stats = attributes.stats ?? {};

  return {
    uuid: String(attributes.uuid ?? ""),
    username: String(attributes.username ?? "Unknown"),
    status: String(attributes.status ?? "offline"),
    lastSeen: attributes.last_seen ?? null,
    kills: Number(stats.kills ?? 0),
    deaths: Number(stats.deaths ?? 0),
    cash: Number(stats.cash ?? 0),
    faction: String(stats.faction ?? "Unknown")
  };
}

async function fetchAllPlayers(apiKey) {
  const firstPage = await fetchBisectPage(apiKey, 1);

  const players = Array.isArray(firstPage?.data)
    ? [...firstPage.data]
    : [];

  const totalPages = Number(
    firstPage?.meta?.pagination?.total_pages ?? 1
  );

  for (let start = 2; start <= totalPages; start += FETCH_BATCH_SIZE) {
    const pages = [];

    for (
      let page = start;
      page < start + FETCH_BATCH_SIZE && page <= totalPages;
      page++
    ) {
      pages.push(fetchBisectPage(apiKey, page));
    }

    const results = await Promise.all(pages);

    for (const payload of results) {
      if (Array.isArray(payload?.data)) {
        players.push(...payload.data);
      }
    }
  }

const uniquePlayers = new Map();

for (const rawPlayer of players) {
  const player = sanitizePlayer(rawPlayer);

  if (!player.uuid) {
    continue;
  }

  const existing = uniquePlayers.get(player.uuid);

  if (!existing) {
    uniquePlayers.set(player.uuid, player);
    continue;
  }

  const existingTime = existing.lastSeen
    ? Date.parse(existing.lastSeen)
    : 0;

  const playerTime = player.lastSeen
    ? Date.parse(player.lastSeen)
    : 0;

  if (playerTime > existingTime) {
    uniquePlayers.set(player.uuid, player);
    continue;
  }

  if (playerTime === existingTime) {
    const existingScore =
      existing.kills +
      existing.deaths +
      existing.cash;

    const playerScore =
      player.kills +
      player.deaths +
      player.cash;

    if (playerScore > existingScore) {
      uniquePlayers.set(player.uuid, player);
    }
  }
}

return [...uniquePlayers.values()];
}

async function syncSeason(context, seasonId) {
  const apiKey = context.env.BISECT_API_KEY;

  if (!apiKey) {
    throw new Error("BISECT_API_KEY is not configured");
  }

  const players = await fetchAllPlayers(apiKey);
  const now = new Date().toISOString();

  const upsert = context.env.DB.prepare(`
    INSERT INTO season_player_stats (
      season_id,
      player_uuid,
      username,
      status,
      kills,
      deaths,
      cash,
      faction,
      last_seen,
      updated_at
    )
    SELECT
      ?1,
      CAST(json_extract(value, '$.uuid') AS TEXT),
      CAST(json_extract(value, '$.username') AS TEXT),
      CAST(json_extract(value, '$.status') AS TEXT),
      CAST(json_extract(value, '$.kills') AS INTEGER),
      CAST(json_extract(value, '$.deaths') AS INTEGER),
      CAST(json_extract(value, '$.cash') AS INTEGER),
      CAST(json_extract(value, '$.faction') AS TEXT),
      json_extract(value, '$.lastSeen'),
      ?3
    FROM json_each(?2)
    WHERE CAST(json_extract(value, '$.uuid') AS TEXT) <> ''
    ON CONFLICT(season_id, player_uuid) DO UPDATE SET
      username = excluded.username,
      status = excluded.status,
      kills = excluded.kills,
      deaths = excluded.deaths,
      cash = excluded.cash,
      faction = excluded.faction,
      last_seen = excluded.last_seen,
      updated_at = excluded.updated_at
    WHERE
      season_player_stats.username IS NOT excluded.username OR
      season_player_stats.status IS NOT excluded.status OR
      season_player_stats.kills IS NOT excluded.kills OR
      season_player_stats.deaths IS NOT excluded.deaths OR
      season_player_stats.cash IS NOT excluded.cash OR
      season_player_stats.faction IS NOT excluded.faction OR
      season_player_stats.last_seen IS NOT excluded.last_seen
  `);

  await upsert
    .bind(
      seasonId,
      JSON.stringify(players),
      now
    )
    .run();

  await context.env.DB.prepare(`
    INSERT INTO leaderboard_sync (
      season_id,
      last_synced_at,
      player_count
    )
    VALUES (?1, ?2, ?3)
    ON CONFLICT(season_id) DO UPDATE SET
      last_synced_at = excluded.last_synced_at,
      player_count = excluded.player_count
  `)
    .bind(seasonId, now, players.length)
    .run();

  return players.length;
}

export async function onRequestGet(context) {
  try {
    const season = await context.env.DB.prepare(`
      SELECT
        id,
        name,
        starts_at,
        ends_at,
        finalized_at,
        is_active
      FROM seasons
      WHERE is_active = 1
      LIMIT 1
    `).first();

    if (!season) {
      return Response.json(
        { ok: false, error: "no_active_season" },
        { status: 500 }
      );
    }

    const sync = await context.env.DB.prepare(`
      SELECT last_synced_at, player_count
      FROM leaderboard_sync
      WHERE season_id = ?1
    `)
      .bind(season.id)
      .first();

    const lastSyncMs =
      sync?.last_synced_at
        ? Date.parse(sync.last_synced_at)
        : 0;

    const shouldSync =
      !lastSyncMs ||
      Date.now() - lastSyncMs >= SYNC_INTERVAL_MS;

    let refreshed = false;
    let syncError = null;

    if (shouldSync) {
      try {
        await syncSeason(context, season.id);
        refreshed = true;
      } catch (error) {
        console.error("Leaderboard sync failed:", error);
        syncError = String(error);
      }
    }

    const countResult = await context.env.DB.prepare(`
      SELECT COUNT(*) AS total
      FROM season_player_stats
      WHERE season_id = ?1
    `)
      .bind(season.id)
      .first();

    const totalPlayers = Number(countResult?.total ?? 0);

    if (totalPlayers === 0 && syncError) {
      return Response.json(
        {
          ok: false,
          error: "leaderboard_sync_failed"
        },
        { status: 502 }
      );
    }

    const leaderboardResult = await context.env.DB.prepare(`
      SELECT
        username,
        status,
        kills,
        deaths,
        CASE
          WHEN deaths = 0 THEN kills
          ELSE ROUND(CAST(kills AS REAL) / deaths, 2)
        END AS kd,
        cash,
        faction,
        last_seen AS lastSeen
      FROM season_player_stats
      WHERE season_id = ?1
      ORDER BY kills DESC, kd DESC, cash DESC
      LIMIT 100
    `)
      .bind(season.id)
      .all();

    const latestSync = await context.env.DB.prepare(`
      SELECT last_synced_at, player_count
      FROM leaderboard_sync
      WHERE season_id = ?1
    `)
      .bind(season.id)
      .first();

    return Response.json(
      {
        ok: true,
        season: {
          id: season.id,
          name: season.name,
          startsAt: season.starts_at,
          endsAt: season.ends_at,
          finalizedAt: season.finalized_at
        },
        totalPlayers,
        players: leaderboardResult.results ?? [],
        meta: {
          lastSyncedAt: latestSync?.last_synced_at ?? null,
          refreshed,
          stale: Boolean(syncError)
        }
      },
      {
        headers: {
          "Cache-Control":
            "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
        }
      }
    );
  } catch (error) {
    console.error("Leaderboard error:", error);

    return Response.json(
      {
        ok: false,
        error: "leaderboard_unavailable"
      },
      { status: 502 }
    );
  }
}