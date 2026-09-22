const SERVER_ID = "cf23650f-0f49-4d1f-8306-89d1152f77a2";
const UPSTREAM = `https://api.wardogservers.com/v1/history/servers/${SERVER_ID}?window=24h`;

export async function onRequestGet() {
  try {
    const response = await fetch(UPSTREAM, {
      headers: { "User-Agent": "playendofday.com server-status/1.0" },
      cf: { cacheTtl: 180, cacheEverything: true }
    });

    if (!response.ok) {
      return Response.json({ ok: false, error: "upstream_unavailable" }, { status: 502 });
    }

    const payload = await response.json();
    const data = payload?.data ?? {};
    const players = Array.isArray(data.players) ? data.players : [];
    const peak = Array.isArray(data.peak) ? data.peak : [];
    const capacity = Array.isArray(data.capacity) ? data.capacity : [];
    const maps = Array.isArray(data.map) ? data.map : [];
    const timestamps = Array.isArray(data.t) ? data.t : [];
    const online = Array.isArray(data.online) ? data.online : [];
    const last = Math.max(0, timestamps.length - 1);

    const result = {
      ok: true,
      server: {
        id: data.server?.serverId ?? SERVER_ID,
        name: data.server?.name ?? "END OF DAY | US | COMMUNITY",
        region: data.server?.region ?? "na-central",
        live: Boolean(data.server?.live),
        players: Number(players[last] ?? 0),
        capacity: Number(capacity[last] ?? 100),
        map: maps[last] ?? "Unknown",
        online: Number(online[last] ?? 0) > 0,
        peak24h: peak.length ? Math.max(...peak.map(Number)) : 0,
        lastSeen: data.server?.lastSeen ?? null
      },
      history: timestamps.map((t, i) => ({
        t: Number(t),
        players: Number(players[i] ?? 0),
        peak: Number(peak[i] ?? players[i] ?? 0),
        online: Number(online[i] ?? 0)
      })),
      meta: {
        fetchedAt: payload?.meta?.fetchedAt ?? null,
        refreshSeconds: Number(payload?.meta?.refreshSeconds ?? 180),
        stale: Boolean(payload?.meta?.stale)
      }
    };

    return Response.json(result, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=180, stale-while-revalidate=300"
      }
    });
  } catch {
    return Response.json({ ok: false, error: "server_status_unavailable" }, { status: 502 });
  }
}
