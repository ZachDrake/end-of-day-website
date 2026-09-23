function hasTag(tags, name) {
  return tags.some(
    (tag) =>
      typeof tag === "string" &&
      (tag === name || tag.endsWith(`.${name}`))
  );
}

function asText(value) {
  return value == null ? null : String(value);
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export async function onRequestPost(context) {
  try {
    const expectedToken = context.env.WARDOGS_FEED_TOKEN;

    if (!expectedToken) {
      console.error("WARDOGS_FEED_TOKEN is not configured");

      return Response.json(
        { ok: false, error: "server_configuration_error" },
        { status: 500 }
      );
    }

    const authorization =
      context.request.headers.get("Authorization") ?? "";

    if (authorization !== `Bearer ${expectedToken}`) {
      return Response.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const payload = await context.request.json();

    const serverInstanceId = asText(payload?.serverId);
    const serverName = asText(payload?.serverName);

    const events = Array.isArray(payload?.events)
      ? payload.events
      : [];

    if (events.length === 0) {
      return Response.json({
        ok: true,
        received: 0,
        inserted: 0
      });
    }

    const season = await context.env.DB.prepare(`
      SELECT id
      FROM seasons
      WHERE is_active = 1
      LIMIT 1
    `).first();

    if (!season) {
      console.error("Kill feed received with no active season");

      return Response.json(
        { ok: false, error: "no_active_season" },
        { status: 503 }
      );
    }

    const statements = [];

    for (const event of events) {
      if (
        event?.type !== "killed" ||
        !event?.eventId
      ) {
        continue;
      }

      const tags = Array.isArray(event.contextTags)
        ? event.contextTags.filter(
            (tag) => typeof tag === "string"
          )
        : [];

      statements.push(
        context.env.DB.prepare(`
          INSERT OR IGNORE INTO kill_events (
            event_id,
            season_id,
            server_instance_id,
            server_name,
            match_id,
            event_time,
            map_name,
            killer_name,
            killer_steam_id,
            victim_name,
            victim_steam_id,
            cause,
            distance_cm,
            is_headshot,
            is_penetration,
            is_ricochet,
            is_melee,
            is_vehicle_explosion,
            is_roadkill,
            is_falling,
            is_suicide,
            context_tags
          )
          VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7,
            ?8, ?9, ?10, ?11, ?12, ?13,
            ?14, ?15, ?16, ?17, ?18, ?19,
            ?20, ?21, ?22
          )
        `).bind(
          String(event.eventId),
          season.id,
          serverInstanceId,
          serverName,
          asText(event.matchId),
          asNumber(event.eventTime),
          asText(event.mapName),
          asText(event.killerName),
          asText(event.killerSteamId),
          asText(event.victimName),
          asText(event.victimSteamId),
          asText(event.cause),
          asNumber(event.distance),
          hasTag(tags, "Headshot") ? 1 : 0,
          hasTag(tags, "Penetration") ? 1 : 0,
          hasTag(tags, "Ricochet") ? 1 : 0,
          hasTag(tags, "WeaponMelee") ? 1 : 0,
          hasTag(tags, "VehicleExplosion") ? 1 : 0,
          hasTag(tags, "RoadKill") ? 1 : 0,
          hasTag(tags, "Falling") ? 1 : 0,
          hasTag(tags, "Suicide") ? 1 : 0,
          JSON.stringify(tags)
        )
      );
    }

    if (statements.length === 0) {
      return Response.json({
        ok: true,
        received: events.length,
        inserted: 0
      });
    }

    await context.env.DB.batch(statements);

    await context.env.DB.prepare(`
      UPDATE seasons
      SET combat_tracking_started_at =
        COALESCE(combat_tracking_started_at, CURRENT_TIMESTAMP)
      WHERE id = ?1
    `)
      .bind(season.id)
      .run();

    return Response.json({
      ok: true,
      received: events.length,
      processed: statements.length
    });
  } catch (error) {
    console.error("WARDOGS kill-feed ingest failed:", error);

    return Response.json(
      {
        ok: false,
        error: "ingest_failed"
      },
      { status: 500 }
    );
  }
}

export async function onRequestGet() {
  return Response.json(
    {
      ok: false,
      error: "method_not_allowed"
    },
    {
      status: 405,
      headers: {
        Allow: "POST"
      }
    }
  );
}