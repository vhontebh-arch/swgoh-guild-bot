#!/usr/bin/env python3
"""Fetch and validate all public rosters for the guild containing a seed Ally Code."""
from __future__ import annotations
import argparse
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def post_json(base_url: str, endpoint: str, payload: dict, retries: int = 3) -> dict:
    body = json.dumps({"payload": payload, "enums": False}).encode("utf-8")
    request = Request(
        base_url.rstrip("/") + "/" + endpoint.lstrip("/"),
        data=body,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    last_error = None
    for attempt in range(retries):
        try:
            with urlopen(request, timeout=90) as response:
                result = json.loads(response.read().decode("utf-8"))
            if not isinstance(result, dict):
                raise RuntimeError(f"/{endpoint} returned a non-object response")
            return result
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, RuntimeError) as exc:
            last_error = exc
            if attempt + 1 < retries:
                time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Comlink /{endpoint} failed after {retries} attempts: {last_error}")


def normalize_player(player: dict, expected_player_id: str | None = None) -> dict:
    player_id = player.get("playerId") or expected_player_id
    roster = player.get("rosterUnit") or []
    units = []
    for unit in roster:
        if not isinstance(unit, dict):
            continue
        units.append({
            "unit_id": unit.get("definitionId") or unit.get("unitId"),
            "definition_id": unit.get("definitionId"),
            "current_rarity": unit.get("currentRarity"),
            "current_level": unit.get("currentLevel"),
            "current_tier": unit.get("currentTier"),
            "relic_tier": unit.get("relic"),
            "gear": unit.get("equipment"),
            "skills": unit.get("skill"),
            "source": unit,
        })
    return {
        "player_id": player_id,
        "ally_code": str(player.get("allyCode") or ""),
        "name": player.get("name") or "",
        "guild_id": player.get("guildId"),
        "guild_name": player.get("guildName") or "",
        "galactic_power": player.get("galacticPower"),
        "roster_unit_count": len(units),
        "units": units,
    }


def fetch_guild_rosters(ally_code: str, comlink_url: str, workers: int = 6) -> dict:
    ally_code = "".join(ch for ch in ally_code if ch.isdigit())
    if len(ally_code) != 9:
        raise ValueError("Ally Code must contain exactly 9 digits.")
    seed = post_json(comlink_url, "player", {"allyCode": ally_code})
    guild_id = seed.get("guildId")
    if not guild_id:
        raise RuntimeError("Seed profile has no guildId; verify that the account belongs to a guild.")

    response = post_json(comlink_url, "guild", {
        "guildId": guild_id,
        "includeRecentGuildActivityInfo": True,
    })
    guild = response.get("guild") if isinstance(response.get("guild"), dict) else response
    members = guild.get("member") or []
    player_ids = list(dict.fromkeys(
        str(m["playerId"]) for m in members
        if isinstance(m, dict) and m.get("playerId")
    ))
    if not player_ids:
        print("Comlink response diagnostic: top-level keys:", sorted(guild.keys()), file=sys.stderr)
        print("Comlink response diagnostic: member type:", type(guild.get("member")).__name__, file=sys.stderr)
        raise RuntimeError("Guild response contains no member player IDs; refusing empty import.")

    players = []
    failures = []
    seed_player_id = seed.get("playerId")
    if seed_player_id in player_ids:
        players.append(normalize_player(seed, str(seed_player_id)))
    remaining = [pid for pid in player_ids if pid != seed_player_id]

    def fetch_member(player_id: str) -> dict:
        return post_json(comlink_url, "player", {"playerId": player_id})

    with ThreadPoolExecutor(max_workers=max(1, min(workers, 10))) as pool:
        futures = {pool.submit(fetch_member, pid): pid for pid in remaining}
        for future in as_completed(futures):
            pid = futures[future]
            try:
                player = future.result()
                if not player.get("rosterUnit"):
                    raise RuntimeError("profile response has no rosterUnit")
                players.append(normalize_player(player, pid))
                # Do not print player names or IDs in workflow logs.
                print(f"Fetched roster {len(players)}/{len(player_ids)}")
            except Exception as exc:
                failures.append({"player_id": pid, "error": str(exc)})
                print(f"Roster fetch failed for one member ({len(failures)} failure(s)); details withheld.", file=sys.stderr)

    if failures or len(players) != len(player_ids):
        raise RuntimeError(
            f"Import incomplete: {len(players)}/{len(player_ids)} profiles; "
            f"{len(failures)} failures. No output written."
        )
    output = {
        "schema_version": 1,
        "imported_at": datetime.now(timezone.utc).isoformat(),
        "guild": {
            "guild_id": guild_id,
            "name": (guild.get("profile") or {}).get("name") or guild.get("name") or seed.get("guildName") or "",
            "member_count": len(player_ids),
        },
        "source": {"service": "SWGOH Comlink", "seed_player_id": seed_player_id},
        "members": sorted(players, key=lambda p: (p["name"].casefold(), p["player_id"] or "")),
        "import_complete": True,
    }
    return output


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ally-code", default=os.environ.get("ROTE_ALLY_CODE", ""))
    parser.add_argument("--comlink-url", default=os.environ.get("COMLINK_URL", "http://127.0.0.1:3000"))
    parser.add_argument("--output", default="/tmp/rote_guild_rosters.json")
    parser.add_argument("--workers", type=int, default=6)
    args = parser.parse_args()
    try:
        data = fetch_guild_rosters(args.ally_code, args.comlink_url, args.workers)
    except Exception as exc:
        print(f"Import failed: {exc}", file=sys.stderr)
        return 2
    if not data.get("members") or data["guild"]["member_count"] != len(data["members"]):
        print("Import validation failed: empty or inconsistent guild data.", file=sys.stderr)
        return 2
    path = Path(args.output)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Import validated.")
    print("Guild:", data["guild"]["name"])
    print("Members:", data["guild"]["member_count"])
    print("Total roster units:", sum(m["roster_unit_count"] for m in data["members"]))
    print("Roster data was kept on the runner; no artifact was uploaded.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
