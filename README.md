# SWGOH Guild Bot — MVP

Pierwszy etap niezależnego bota Discord dla jednej gildii SWGOH, z architekturą pozwalającą później rozdzielić dane wielu gildii.

## Stan
- Import Comlink: sprawdzony wcześniej w GitHub Actions na 48 członkach i 17 070 jednostkach rosterów.
- Import odrzuca niekompletne dane.
- Rosterów nie zapisujemy do logów, artefaktów ani repozytorium.
- Schemat Cloudflare D1 przygotowany do trwałego przechowywania.
- Interfejs Discord i właściwy optymalizator ROTE są kolejnymi etapami.

## Uruchomienie importu w chmurze
1. Otwórz **Actions** i włącz workflows, jeśli GitHub o to poprosi.
2. Wybierz **Import guild rosters (Comlink)** → **Run workflow**.
3. Wpisz Ally Code dowolnego członka docelowej gildii.
4. Workflow uruchomi Comlink, pobierze listę członków i roster każdego gracza oraz sprawdzi kompletność.
5. Log pokaże wyłącznie nazwę gildii, liczbę członków i łączną liczbę jednostek. Roster pozostaje na tymczasowym runnerze i jest usuwany po zakończeniu.

## Bezpieczeństwo i trwałość danych
Nie należy zapisywać pełnych rosterów w publicznym repozytorium ani publikować ich jako artefaktów GitHub Actions. Schemat `storage/schema.sql` tworzy tabele rozdzielone identyfikatorem gildii. W kolejnym kroku należy skonfigurować Cloudflare D1 i dodać uwierzytelniony zapis importer → D1; celowo nie ma jeszcze tokenów ani danych dostępowych w repozytorium.

## Układ
- `src/import_guild_rosters.py` — importer Comlink z walidacją.
- `.github/workflows/import-guild-rosters.yml` — uruchamianie w chmurze.
- `storage/schema.sql` — schemat trwałego magazynu D1, z izolacją gildii.
- `tests/` — testy normalizacji i walidacji podstawowych danych.
- `docs/next-steps.md` — kolejność kolejnych etapów.
