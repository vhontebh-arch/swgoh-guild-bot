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
