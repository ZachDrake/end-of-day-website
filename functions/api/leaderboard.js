const BISECT_SERVER_ID = "6c162067-7032-4d2c-8431-e2e2bf36be4f";
const BISECT_BASE_URL =
  `https://games.bisecthosting.com/api/client/servers/${BISECT_SERVER_ID}/player`;

export async function onRequestGet(context) {
  try {
    const apiKey = context.env.BISECT_API_KEY;

    if (!apiKey) {
      return Response.json(
        { ok: false, error: "missing_api_key" },
        { status: 500 }
      );
    }

    const response = await fetch(`${BISECT_BASE_URL}?page=1`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      return Response.json(
        {
          ok: false,
          error: "bisect_api_error",
          status: response.status
        },
        { status: 502 }
      );
    }

    const payload = await response.json();

    const players = (payload.data ?? []).map((player) => {
      const attributes = player.attributes ?? {};
      const stats = attributes.stats ?? {};

      return {
        username: attributes.username ?? "Unknown",
        uuid: attributes.uuid ?? "",
        status: attributes.status ?? "offline",
        lastSeen: attributes.last_seen ?? null,
        kills: Number(stats.kills ?? 0),
        deaths: Number(stats.deaths ?? 0),
        cash: Number(stats.cash ?? 0),
        faction: stats.faction ?? "Unknown"
      };
    });

    return Response.json({
      ok: true,
      season: 1,
      test: "page-1-only",
      totalPlayersInBisect:
        Number(payload?.meta?.pagination?.total ?? 0),
      totalPages:
        Number(payload?.meta?.pagination?.total_pages ?? 0),
      players
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: "leaderboard_unavailable",
        detail: String(error)
      },
      { status: 502 }
    );
  }
}