# Kolejne etapy

## 1. Repozytorium
Utworzyć puste `vhontebh-arch/swgoh-guild-bot` i wgrać pliki z paczki. Repozytorium nie powinno zawierać eksportów rosterów.

## 2. Trwały magazyn
- Utworzyć bazę Cloudflare D1.
- Zastosować `storage/schema.sql`.
- Dodać Cloudflare Worker z autoryzowanym endpointem przyjmującym import.
- Skonfigurować sekrety `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `D1_DATABASE_ID` i osobny token aplikacyjny.
- Importować tylko po pełnej walidacji; zapisywać w transakcji lub przez staging tables i atomowe zatwierdzenie.
- Nie publikować rosterów w artefaktach GitHub Actions ani logach.

## 3. ROTE
- Zdefiniować wersjonowane dane referencyjne wymagań Operacji i misji ROTE.
- Obliczać kandydatów do każdego slotu z identyfikatorów jednostek, gwiazdek i poziomów gear/relic.
- Zwracać braki i konflikty zamiast zgadywać.
- Plan pozostaje propozycją do zatwierdzenia przez oficera.

## 4. Discord
- Dodać aplikację/bota Discord i bezpieczne przechowywanie tokena.
- Pierwsze komendy: `/rote status`, `/rote braki`, `/rote moje`, `/rote planeta`, `/rote odśwież`.
- Dane zawsze filtrować po `guild_id`; autoryzować odświeżanie rolą oficera.

## Izolacja gildii
Każdy rekord operacyjny zawiera `guild_id`; nie używać nazw gildii jako klucza. Przy włączaniu wielu gildii trzeba dodać autoryzowane mapowanie Discord guild ID → SWGOH guild ID i testy braku dostępu między gildiami.
