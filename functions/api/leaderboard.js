const BISECT_SERVER_ID = "6c162067-7032-4d2c-8431-e2e2bf36be4f";
const BISECT_BASE_URL = `https://games.bisecthosting.com/api/client/servers/${BISECT_SERVER_ID}/player`;

const SEASON = {
  number: 1,
  name: "Season 1",
  endsAt: "2026-10-15T00:00:00Z"
};

async function fetchPage(apiKey, page) {
  const response = await fetch(`${BISECT_BASE_URL}?page=${page}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Bisect API returned ${response.status} on page ${page}`);
  }

  return response.json();
}

function sanitizePlayer(player) {
  const attributes = player?.attributes ?? {};
  const stats = attributes.stats ?? {};

  const kills = Number(stats.kills ?? 0);
  const deaths = Number(stats.deaths ?? 0);
  const cash = Number(stats.cash ?? 0);

  return {
    username: String(attributes.username ?? "Unknown"),
    uuid: String(attributes.uuid ?? ""),
    status: String(attributes.status ?? "offline"),
    lastSeen: attributes.last_seen ?? null,
    kills,
    deaths,
    kd: deaths === 0 ? kills : Number((kills / deaths).toFixed(2)),
    cash,
    faction: String(stats.faction ?? "Unknown")
  };
}

export async function onRequestGet(context) {
  try {
    const apiKey = context.env.BISECT_API_KEY;

    if (!apiKey) {
      return Response.json(
        { ok: false, error: "missing_api_key" },
        { status: 500 }
      );
    }

    const firstPage = await fetchPage(apiKey, 1);

    const totalPages = Number(
      firstPage?.meta?.pagination?.total_pages ?? 1
    );

    const players = Array.isArray(firstPage?.data)
      ? [...firstPage.data]
      : [];

    for (let page = 2; page <= totalPages; page++) {
      const payload = await fetchPage(apiKey, page);

      if (Array.isArray(payload?.data)) {
        players.push(...payload.data);
      }
    }

    const leaderboard = players
      .map(sanitizePlayer)
      .sort((a, b) =>
        b.kills - a.kills ||
        b.kd - a.kd ||
        b.cash - a.cash
      );

    return Response.json(
      {
        ok: true,
        season: SEASON,
        totalPlayers: leaderboard.length,
        players: leaderboard
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