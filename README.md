# SWGOH Guild Bot — MVP

Pierwszy etap niezależnego bota Discord dla jednej gildii SWGOH, z architekturą pozwalającą później rozdzielić dane wielu gildii.

## Stan
- Import Comlink: sprawdzony wcześniej w GitHub Actions na 48 członkach i 17 070 jednostkach rosterów.
- Import odrzuca niekompletne dane.
- Rosterów nie zapisujemy do logów, artefaktów ani repozytorium.
- Worker Cloudflare przyjmuje wyłącznie uwierzytelnione importy i zapisuje roster jako wersjonowany snapshot w D1.
- Wskaźnik aktywnego snapshotu zmienia się dopiero po walidacji i sprawdzeniu liczby zapisanych rekordów.
- Interfejs Discord i właściwy optymalizator ROTE są kolejnymi etapami.

## Uruchomienie importu w chmurze
1. Otwórz **Actions** i włącz workflows, jeśli GitHub o to poprosi.
2. Wybierz **Import guild rosters (Comlink)** → **Run workflow**.
3. Wpisz Ally Code dowolnego członka docelowej gildii.
4. Workflow uruchomi Comlink, pobierze listę członków i roster każdego gracza oraz sprawdzi kompletność.
5. Log pokaże wyłącznie nazwę gildii, liczbę członków i łączną liczbę jednostek. Roster pozostaje na tymczasowym runnerze i jest usuwany po zakończeniu.

## Bezpieczeństwo i trwałość danych
Nie zapisujemy pełnych rosterów w publicznym repozytorium ani nie publikujemy ich jako artefaktów GitHub Actions. Import trafia do D1 przez Worker wymagający tokena. Każdy import jest osobnym snapshotem; dopiero po sprawdzeniu kompletności Worker przełącza aktywny snapshot. Konfiguracja krok po kroku znajduje się w `docs/cloudflare-setup.md`.

## Układ
- `src/import_guild_rosters.py` — importer Comlink z walidacją.
- `.github/workflows/import-guild-rosters.yml` — uruchamianie w chmurze.
- `storage/schema.sql` — schemat trwałego magazynu D1, z izolacją gildii.
- `tests/` — testy normalizacji i walidacji podstawowych danych.
- `docs/next-steps.md` — kolejność kolejnych etapów.
