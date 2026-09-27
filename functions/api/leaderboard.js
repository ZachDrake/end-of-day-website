import { describeCause } from "../_lib/causeCatalog.js";

const SORT_COLUMNS = {
  kills: "kills",
  deaths: "deaths",
  kd: "kd",
  headshots: "headshots",
  longest: "longest_distance_cm"
};

function positiveInteger(value, fallback, maximum) {
  if (!value || !/^\d+$/.test(value)) return fallback;

  const number = Number(value);

  return Number.isSafeInteger(number) && number > 0
    ? Math.min(number, maximum)
    : fallback;
}

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

function playerCte(filterCauseIds = []) {
  const filterActive = filterCauseIds.length > 0;

  if (!filterActive) {
    return `
      WITH player_stats AS (
        SELECT
          steam_id,
          username,
          kills,
          deaths,
          headshots,
          longest_kill_cm AS longest_distance_cm,
          ROUND(CAST(longest_kill_cm AS REAL) / 100.0, 1) AS longestKillMeters,
          CASE
            WHEN deaths = 0 THEN kills
            ELSE ROUND(CAST(kills AS REAL) / deaths, 2)
          END AS kd,
          CASE
            WHEN deaths = 0 THEN kills
            ELSE CAST(kills AS REAL) / deaths
          END AS kd_exact
        FROM combat_player_stats
        WHERE season_id = ?1
      )
    `;
  }

  const causePlaceholders = filterCauseIds
    .map((_, index) => `?${index + 2}`)
    .join(", ");

  return `
    WITH filtered_kills AS (
      SELECT
        steam_id,
        SUM(kills) AS kills,
        SUM(headshots) AS headshots,
        MAX(longest_kill_cm) AS longest_distance_cm
      FROM combat_weapon_stats
      WHERE season_id = ?1
        AND cause IN (${causePlaceholders})
      GROUP BY steam_id
    ),
    player_stats AS (
      SELECT
        players.steam_id,
        players.username,
        COALESCE(filtered_kills.kills, 0) AS kills,
        players.deaths,
        COALESCE(filtered_kills.headshots, 0) AS headshots,
        COALESCE(filtered_kills.longest_distance_cm, 0) AS longest_distance_cm,
        ROUND(
          CAST(COALESCE(filtered_kills.longest_distance_cm, 0) AS REAL) / 100.0,
          1
        ) AS longestKillMeters,
        CASE
          WHEN players.deaths = 0 THEN COALESCE(filtered_kills.kills, 0)
          ELSE ROUND(
            CAST(COALESCE(filtered_kills.kills, 0) AS REAL) / players.deaths,
            2
          )
        END AS kd,
        CASE
          WHEN players.deaths = 0 THEN COALESCE(filtered_kills.kills, 0)
          ELSE CAST(COALESCE(filtered_kills.kills, 0) AS REAL) / players.deaths
        END AS kd_exact
      FROM combat_player_stats AS players
      LEFT JOIN filtered_kills
        ON filtered_kills.steam_id = players.steam_id
      WHERE players.season_id = ?1
    )
  `;
}

function normalizeWeaponOptions(rows) {
  return (rows ?? []).map((row) => {
    const description = describeCause(row.cause);

    return {
      rawCause: row.cause,
      name: description.name,
      category: description.category,
      identified: description.identified,
      kills: Number(row.kills ?? 0)
    };
  });
}

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const query = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
    const requestedOrder = url.searchParams.get("order") === "asc" ? "asc" : "desc";
    const order = requestedOrder;
    const direction = order === "asc" ? "ASC" : "DESC";
    const pageSize = positiveInteger(url.searchParams.get("pageSize"), 100, 100);
    const requestedPage = positiveInteger(
      url.searchParams.get("page"),
      1,
      1000000
    );
    const seasonId = url.searchParams.get("season");
    const requestedCategory = (url.searchParams.get("category") ?? "")
      .trim()
      .slice(0, 80);
    const requestedWeapon = (url.searchParams.get("weapon") ?? "")
      .trim()
      .slice(0, 200);

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

    const causesResult = await context.env.DB.prepare(`
      SELECT
        cause,
        kills
      FROM combat_cause_stats
      WHERE season_id = ?1
        AND cause <> '<UNKNOWN>'
        AND kills > 0
      ORDER BY kills DESC, cause ASC
    `).bind(season.id).all();

    const weaponOptions = normalizeWeaponOptions(causesResult.results);
    const byCause = new Map(
      weaponOptions.map((weaponOption) => [weaponOption.rawCause, weaponOption])
    );
    const categoryTotals = new Map();

    for (const weaponOption of weaponOptions) {
      categoryTotals.set(
        weaponOption.category,
        (categoryTotals.get(weaponOption.category) ?? 0) + weaponOption.kills
      );
    }

    const categoryOptions = [...categoryTotals.entries()]
      .map(([name, kills]) => ({ name, kills }))
      .sort((a, b) => a.name.localeCompare(b.name));

    let weapon = byCause.has(requestedWeapon) ? requestedWeapon : "";
    let category = categoryTotals.has(requestedCategory) ? requestedCategory : "";

    if (weapon) {
      category = byCause.get(weapon).category;
    }

    const filterCauseIds = weapon
      ? [weapon]
      : category
        ? weaponOptions
            .filter((item) => item.category === category)
            .map((item) => item.rawCause)
        : [];

    const filterActive = filterCauseIds.length > 0;
    const cte = playerCte(filterCauseIds);
    const searchParameter = filterCauseIds.length + 2;
    const pageSizeParameter = searchParameter + 1;
    const offsetParameter = searchParameter + 2;
    const eligibility = filterActive ? "kills > 0" : "1 = 1";

    const allowedSorts = filterActive
      ? new Set(["kills", "headshots", "longest"])
      : new Set(["kills", "deaths", "kd"]);
    const requestedSort = url.searchParams.get("sort") ?? "kills";
    const sort = allowedSorts.has(requestedSort) ? requestedSort : "kills";

    const count = await context.env.DB.prepare(`${cte}
      SELECT
        COUNT(*) AS total,
        COALESCE(
          SUM(
            CASE
              WHEN ${eligibility}
                AND instr(lower(username), lower(?${searchParameter})) > 0
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS matched
      FROM player_stats
    `).bind(season.id, ...filterCauseIds, query).first();

    const totalPlayers = Number(count?.total ?? 0);
    const filteredPlayers = Number(count?.matched ?? 0);
    const totalPages = Math.max(1, Math.ceil(filteredPlayers / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const offset = (page - 1) * pageSize;

    const infiniteFlag = "CASE WHEN deaths = 0 AND kills > 0 THEN 1 ELSE 0 END";
    const kdOrder = `${infiniteFlag} ${direction}, kd_exact ${direction}`;
    const primaryOrder = sort === "kd"
      ? kdOrder
      : `${SORT_COLUMNS[sort]} ${direction}`;
    const rankingOrder = filterActive
      ? `${primaryOrder}, kills DESC, headshots DESC, longest_distance_cm DESC, username COLLATE NOCASE ASC, steam_id ASC`
      : `${primaryOrder}, kills DESC, ${infiniteFlag} DESC, kd_exact DESC, deaths ASC, username COLLATE NOCASE ASC, steam_id ASC`;

    const leaderboardResult = await context.env.DB.prepare(`${cte}
      , ranked AS (
        SELECT
          ROW_NUMBER() OVER (ORDER BY ${rankingOrder}) AS rank,
          steam_id AS steamId,
          username,
          kills,
          deaths,
          kd,
          headshots,
          longestKillMeters
        FROM player_stats
        WHERE ${eligibility}
      )
      SELECT *
      FROM ranked
      WHERE instr(lower(username), lower(?${searchParameter})) > 0
      ORDER BY rank
      LIMIT ?${pageSizeParameter} OFFSET ?${offsetParameter}
    `).bind(
      season.id,
      ...filterCauseIds,
      query,
      pageSize,
      offset
    ).all();

    const leaderOrder = filterActive
      ? sort === "headshots"
        ? "headshots DESC, kills DESC, longest_distance_cm DESC, username COLLATE NOCASE ASC, steam_id ASC"
        : sort === "longest"
          ? "longest_distance_cm DESC, kills DESC, headshots DESC, username COLLATE NOCASE ASC, steam_id ASC"
          : "kills DESC, headshots DESC, longest_distance_cm DESC, username COLLATE NOCASE ASC, steam_id ASC"
      : `kills DESC, ${infiniteFlag} DESC, kd_exact DESC, deaths ASC, username COLLATE NOCASE ASC, steam_id ASC`;

    const leaders = await context.env.DB.prepare(`${cte}
      SELECT
        steam_id AS steamId,
        username,
        kills,
        deaths,
        kd,
        headshots,
        longestKillMeters
      FROM player_stats
      WHERE ${eligibility}
      ORDER BY ${leaderOrder}
      LIMIT 3
    `).bind(season.id, ...filterCauseIds).all();

    const eventMeta = await context.env.DB.prepare(`
      SELECT
        events_recorded,
        first_event_at,
        last_event_at
      FROM combat_season_stats
      WHERE season_id = ?1
    `).bind(season.id).first();

    const selectedWeapon = weapon ? byCause.get(weapon) : null;
    const filterLabel = selectedWeapon?.name ?? category ?? "Entire season";

    return Response.json({
      ok: true,
      season: publicSeason(season),
      seasons: seasons.map(publicSeason),
      totalPlayers,
      filteredPlayers,
      players: leaderboardResult.results ?? [],
      leaders: leaders.results ?? [],
      pagination: { page, pageSize, totalPages },
      filters: {
        q: query,
        sort,
        order,
        category,
        weapon,
        filterActive,
        filterLabel
      },
      weaponOptions,
      categoryOptions,
      meta: {
        eventsRecorded: Number(eventMeta?.events_recorded ?? 0),
        firstEventAt: eventMeta?.first_event_at ?? null,
        lastEventAt: eventMeta?.last_event_at ?? null,
        trackingStartedAt: season.combat_tracking_started_at ?? null
      }
    }, {
      headers: {
        "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=60"
      }
    });
  } catch (error) {
    console.error("Leaderboard error:", error);

    return Response.json(
      { ok: false, error: "leaderboard_unavailable" },
      { status: 502 }
    );
  }
}
