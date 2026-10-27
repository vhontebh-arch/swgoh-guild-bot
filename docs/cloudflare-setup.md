# Konfiguracja Cloudflare D1

Ten etap zapisuje roster do prywatnej bazy D1 przez uwierzytelnionego Workera. Nie uruchamiaj importu przed wykonaniem całej konfiguracji.

## 1. Utwórz bazę D1
1. Zaloguj się do Cloudflare i otwórz **Storage & Databases → D1 SQL Database**.
2. Utwórz bazę o nazwie `swgoh-guild-data`.
3. Skopiuj identyfikator bazy (Database ID).

## 2. Uzupełnij konfigurację Workera
W pliku `cloudflare/wrangler.toml` zastąp `REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID` identyfikatorem z poprzedniego kroku. Pozostaw nazwę bindingu `DB` bez zmian.

## 3. Utwórz tabele
W panelu D1 otwórz **Console** i wykonaj zawartość pliku `storage/schema.sql` w całości. To tworzy tabele dla wersjonowanych importów. Nie wykonuj starego `storage/staging-schema.sql`; ten schemat został zastąpiony przez wersjonowany model.

## 4. Wdróż Worker
Najprostsza ścieżka to Cloudflare Dashboard → **Workers & Pages** → **Create** → **Worker**, następnie edytuj kod, używając pliku `cloudflare/worker.js`. Ustaw binding D1:
- Variable name: `DB`
- D1 database: `swgoh-guild-data`

Ustaw Worker secret o nazwie `IMPORT_TOKEN` na długi losowy sekret. Nie zapisuj go w repozytorium ani nie wysyłaj w czacie.

Worker musi być dostępny pod ścieżkami `/health` i `/import`. Skopiuj jego publiczny adres bazowy, np. adres kończący się na `.workers.dev`; nie dopisuj `/health` do sekretu URL.

## 5. Dodaj sekrety GitHub
Repozytorium → **Settings → Secrets and variables → Actions → New repository secret**:
- `D1_IMPORT_URL` — pełny URL Workera zakończony na `/import`.
- `D1_IMPORT_TOKEN` — dokładnie ten sam token co Worker secret `IMPORT_TOKEN`.

Nie wpisuj wartości sekretów do issue, commitów, plików ani czatu.

## 6. Sprawdź i uruchom
1. Otwórz adres Workera z końcówką `/health`; oczekiwana odpowiedź to `{"ok":true,"service":"swgoh-guild-roster-import"}`.
2. Dopiero po tym uruchom workflow **Actions → Import guild rosters (Comlink) → Run workflow** i wpisz Ally Code członka gildii.
3. Udany import pokaże tylko liczbę członków i jednostek. Roster nie jest publikowany jako artefakt.

## Ochrona danych
Worker waliduje import, zapisuje pełny snapshot pod nowym `import_id`, sprawdza liczbę zapisanych członków i jednostek, a dopiero potem zmienia wskaźnik aktywnego importu. Jeśli zapis nie powiedzie się przed aktywacją, poprzedni aktywny snapshot pozostaje wybrany. Tabele zawierają dane rosteru, więc dostęp do bazy i Workera powinien być ograniczony.

Uwaga: to jest warstwa importu i trwałego przechowywania, nie gotowy bot Discord. Komendy ROTE i autoryzacja ról oficerskich są osobnym etapem.
