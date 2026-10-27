import pytest

from src.import_guild_rosters import normalize_player


def test_normalize_player_keeps_identity_and_roster_count():
    result = normalize_player({
        "playerId": "p1",
        "allyCode": 123456789,
        "name": "Test",
        "guildId": "g1",
        "guildName": "Guild",
        "galacticPower": 123,
        "rosterUnit": [
            {"definitionId": "UNIT_A", "currentRarity": 7, "currentLevel": 85, "currentTier": 13},
            {"definitionId": "UNIT_B", "currentRarity": 5, "currentLevel": 50, "currentTier": 7},
        ],
    })
    assert result["player_id"] == "p1"
    assert result["ally_code"] == "123456789"
    assert result["roster_unit_count"] == 2
    assert result["units"][0]["unit_id"] == "UNIT_A"


def test_normalize_player_does_not_invent_relic():
    result = normalize_player({
        "playerId": "p2",
        "rosterUnit": [{"definitionId": "UNIT_A", "currentTier": 13}],
    })
    assert result["units"][0]["relic_tier"] is None


def test_normalize_player_rejects_empty_roster():
    with pytest.raises(RuntimeError, match="rosterUnit"):
        normalize_player({"playerId": "p3", "rosterUnit": []})


def test_normalize_player_rejects_unit_without_id():
    with pytest.raises(RuntimeError, match="without an ID"):
        normalize_player({"playerId": "p4", "rosterUnit": [{"currentTier": 5}]})


def test_normalize_player_rejects_duplicate_units():
    with pytest.raises(RuntimeError, match="duplicate unit IDs"):
        normalize_player({"playerId": "p5", "rosterUnit": [
            {"definitionId": "UNIT_A"}, {"definitionId": "UNIT_A"}
        ]})
