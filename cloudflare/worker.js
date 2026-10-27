const MAX_BODY_BYTES = 90 * 1024 * 1024;
const MAX_MEMBERS = 1000;
const MAX_UNITS_PER_MEMBER = 1000;
const BATCH_SIZE = 80;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
function validText(value, max = 200) {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}
function safeInt(value, min = 0, max = 2147483647) {
  return Number.isInteger(value) && value >= min && value <= max;
}
function asText(value) {
  return value === null || value === undefined ? null : String(value);
}
function statements(db, sql, rows, mapper) {
  return rows.map((row) => db.prepare(sql).bind(...mapper(row)));
}
async function runBatches(db, list) {
  for (let i = 0; i < list.length; i += BATCH_SIZE) {
    await db.batch(list.slice(i, i + BATCH_SIZE));
  }
}
export function validate(data) {
  if (!data || data.schema_version !== 1 || data.import_complete !== true ||
      !data.guild || !validText(asText(data.guild.guild_id), 100) ||
      !validText(data.guild.name, 200) ||
      !Array.isArray(data.members) || data.members.length < 1 ||
      data.members.length > MAX_MEMBERS ||
      data.guild.member_count !== data.members.length) {
    throw new Error("Import payload failed top-level validation.");
  }
  const seenPlayers = new Set();
  let totalUnits = 0;
  for (const member of data.members) {
    if (!member || !validText(asText(member.player_id), 100) ||
        !validText(member.name, 200) ||
        asText(member.guild_id) !== asText(data.guild.guild_id) ||
        !Array.isArray(member.units) || member.units.length > MAX_UNITS_PER_MEMBER ||
        member.roster_unit_count !== member.units.length) {
      throw new Error("A member failed roster validation.");
    }
    const pid = String(member.player_id);
    if (seenPlayers.has(pid)) throw new Error("Duplicate member in import.");
    seenPlayers.add(pid);
    const seenUnits = new Set();
    for (const unit of member.units) {
      if (!unit || !validText(asText(unit.unit_id), 200)) {
        throw new Error("A roster unit has no valid unit ID.");
      }
      const uid = String(unit.unit_id);
      if (seenUnits.has(uid)) throw new Error("Duplicate unit for a member.");
      seenUnits.add(uid);
    }
    totalUnits += member.units.length;
  }
  if (!Number.isSafeInteger(totalUnits) || totalUnits < 1) {
    throw new Error("Import contains no roster units.");
  }
  return { guildId: String(data.guild.guild_id), memberCount: data.members.length, totalUnits };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "swgoh-guild-roster-import" });
    }
    if (request.method !== "POST" || url.pathname !== "/import") {
      return json({ error: "Not found." }, 404);
    }
    const token = env.IMPORT_TOKEN;
    if (!token || request.headers.get("authorization") !== `Bearer ${token}`) {
      return json({ error: "Unauthorized." }, 401);
    }
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) return json({ error: "Payload too large." }, 413);

    let data;
    try {
      // GitHub Actions sends gzip-compressed JSON to stay below Cloudflare's
      // request-body limit. Decompress inside the Worker before parsing.
      const encoding = (request.headers.get("content-encoding") || "identity").toLowerCase();
      if (encoding !== "identity" && encoding !== "gzip") {
        return json({ error: "Unsupported content encoding." }, 415);
      }
      const body = encoding === "gzip"
        ? request.body.pipeThrough(new DecompressionStream("gzip"))
        : request.body;
      const raw = await new Response(body).text();
      if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
        return json({ error: "Payload too large." }, 413);
      }
      data = JSON.parse(raw);
    } catch (error) {
      return json({ error: "Invalid or oversized JSON payload." }, 400);
    }

    let summary;
    try {
      summary = validate(data);
    } catch (error) {
      return json({ error: error.message }, 422);
    }

    const importId = crypto.randomUUID();
    const importedAt = validText(data.imported_at, 80) ? data.imported_at : new Date().toISOString();
    const guildName = data.guild.name;
    const db = env.DB;

    try {
      await db.prepare(
        "INSERT INTO roster_imports (import_id, guild_id, guild_name, expected_members, expected_units, imported_at, status) VALUES (?, ?, ?, ?, ?, ?, 'staging')"
      ).bind(importId, summary.guildId, guildName, summary.memberCount, summary.totalUnits, importedAt).run();

      const memberRows = data.members.map((m) => ({
        playerId: String(m.player_id), allyCode: asText(m.ally_code), name: m.name,
        gp: safeInt(m.galactic_power) ? m.galactic_power : null,
        count: m.units.length,
      }));
      await runBatches(db, statements(db,
        "INSERT INTO guild_members (import_id, guild_id, player_id, ally_code, player_name, galactic_power, roster_unit_count) VALUES (?, ?, ?, ?, ?, ?, ?)",
        memberRows, (m) => [importId, summary.guildId, m.playerId, m.allyCode, m.name, m.gp, m.count]));

      const unitRows = [];
      for (const member of data.members) {
        for (const unit of member.units) {
          unitRows.push({
            playerId: String(member.player_id), unitId: String(unit.unit_id),
            rarity: safeInt(unit.current_rarity, 0, 7) ? unit.current_rarity : null,
            level: safeInt(unit.current_level, 0, 100) ? unit.current_level : null,
            tier: safeInt(unit.current_tier, 0, 20) ? unit.current_tier : null,
            relic: safeInt(unit.relic_tier, 0, 10) ? unit.relic_tier : null,
            payload: JSON.stringify(unit),
          });
        }
      }
      await runBatches(db, statements(db,
        "INSERT INTO roster_units (import_id, guild_id, player_id, unit_id, current_rarity, current_level, current_tier, relic_tier, unit_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        unitRows, (u) => [importId, summary.guildId, u.playerId, u.unitId, u.rarity, u.level, u.tier, u.relic, u.payload]));

      const counts = await db.prepare(
        "SELECT (SELECT COUNT(*) FROM guild_members WHERE import_id = ?) AS members, (SELECT COUNT(*) FROM roster_units WHERE import_id = ?) AS units"
      ).bind(importId, importId).first();
      if (!counts || counts.members !== summary.memberCount || counts.units !== summary.totalUnits) {
        throw new Error("Stored row counts do not match validated import.");
      }

      // The active pointer changes only after all rows are persisted and verified.
      // Readers use active_guild_imports to select one complete immutable snapshot.
      await db.batch([
        db.prepare("INSERT INTO guilds (guild_id, guild_name, member_count, last_imported_at, import_status) VALUES (?, ?, ?, ?, 'ready') ON CONFLICT(guild_id) DO UPDATE SET guild_name=excluded.guild_name, member_count=excluded.member_count, last_imported_at=excluded.last_imported_at, import_status='ready'").bind(summary.guildId, guildName, summary.memberCount, importedAt),
        db.prepare("INSERT INTO active_guild_imports (guild_id, import_id, activated_at) VALUES (?, ?, ?) ON CONFLICT(guild_id) DO UPDATE SET import_id=excluded.import_id, activated_at=excluded.activated_at").bind(summary.guildId, importId, new Date().toISOString()),
        db.prepare("UPDATE roster_imports SET status='active', completed_at=? WHERE import_id=?").bind(new Date().toISOString(), importId),
      ]);
      return json({ ok: true, members: summary.memberCount, units: summary.totalUnits });
    } catch (error) {
      // Do not return private roster data or SQL payloads to callers.
      try {
        await db.prepare("UPDATE roster_imports SET status='failed', completed_at=? WHERE import_id=?").bind(new Date().toISOString(), importId).run();
      } catch {}
      return json({ error: "Import failed before activation; the previous active roster was preserved." }, 500);
    }
  },
};
