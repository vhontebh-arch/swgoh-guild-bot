import test from "node:test";
import assert from "node:assert/strict";
import { validate } from "../cloudflare/worker.js";

const good = () => ({
  schema_version: 1,
  import_complete: true,
  guild: { guild_id: "g1", name: "Guild", member_count: 1 },
  members: [{
    player_id: "p1", name: "Player", guild_id: "g1",
    roster_unit_count: 1,
    units: [{ unit_id: "UNIT_A", current_rarity: 7, current_level: 85, current_tier: 13, relic_tier: 0 }],
  }],
});

test("accepts a complete, internally consistent roster", () => {
  assert.deepEqual(validate(good()), { guildId: "g1", memberCount: 1, totalUnits: 1 });
});

test("rejects an incomplete import", () => {
  const payload = good();
  payload.import_complete = false;
  assert.throws(() => validate(payload), /top-level validation/);
});

test("rejects a member count mismatch", () => {
  const payload = good();
  payload.guild.member_count = 2;
  assert.throws(() => validate(payload), /top-level validation/);
});

test("rejects a member assigned to another guild", () => {
  const payload = good();
  payload.members[0].guild_id = "other";
  assert.throws(() => validate(payload), /member failed roster validation/);
});

test("rejects duplicate member IDs", () => {
  const payload = good();
  payload.guild.member_count = 2;
  payload.members.push({ ...payload.members[0] });
  assert.throws(() => validate(payload), /Duplicate member/);
});

test("rejects duplicate unit IDs for one member", () => {
  const payload = good();
  payload.members[0].units.push({ unit_id: "UNIT_A" });
  payload.members[0].roster_unit_count = 2;
  assert.throws(() => validate(payload), /Duplicate unit/);
});
