# F1 — kontrakty i inwentaryzacja korpusu

Data: 2026-10-18. **Kod F1 i inwentaryzacja wdrożone i sprawdzone. Korpus mediów nie jest odebrany; pełna bramka F1 pozostaje otwarta i nie odblokowuje automatycznego wydawania filmów.** [Plan](../../plan-wdrozenia-Serwer.md), [korpus](corpus.md).

## Wdrożony zakres

- Kompilator wybiera regułę po `scope+id`: klient > branding > ogólne > domyślne, potem data i jawna kolejność korekty z tego samego dnia. Różne wartości na tej samej najwyższej pozycji blokują publikację. Nieznany klient reguły i niezgodny snapshot są odrzucane.
- Kanoniczny hash obejmuje reguły, pochodzenie, klienta, styl i wersję brandingu. Wynik nie zależy od kolejności kluczy w obiekcie, reguł wejścia ani ustawień locale.
- Nowy zapis brandingu kompiluje kontrakt po stronie serwera; nie ufa kontraktowi odesłanemu przez formularz. Snapshot przenosi zapisany kontrakt i sprawdza jego hash/przypięcie. Starsza wersja bez kontraktu pozostaje czytelna i nie jest zmieniana.
- Ręczne mapowanie części reguł 7 klientów, hashe sekcji, wybrany wygląd oraz niezmienniki SkyClass/Bisanz. Brakujące i nieskodyfikowane PREFERENCJE pozostają krytycznym `unknown` do przeglądu, bez fałszywego potwierdzenia.
- Zmiana skodyfikowanego akapitu wymaga ponownego sprawdzenia mapowania. Całkowicie własne preferencje pozostają edytowalne jako częściowy kontrakt; własny styl Herod nie dziedziczy ograniczeń ruchu rodzimego presetu.
- Kontrola planowanej migracji na zachowanie pełnej wypowiedzi wymaga mastera i transkrypcji. Nie uruchamia ASR/AI ani nie wykonuje samej migracji.
- 90 odrębnych opisanych przypadków, po 10 dla 8 rodzimych profili i własnego stylu; przypisanie mediów i odbiór pending. Prywatna inwentaryzacja 38 draftów bez ich zmiany.

## Weryfikacja

Testy RED→GREEN: pierwszeństwo klienta, data/kolejność, konflikt, hash, migracja SkyClass, wersje legacy, zmieniony akapit, profil bez Markdown, własne preferencje i własny styl. Testy wersjonowania, QC i zwykłych rolek sprawdzają przeniesienie tego samego snapshotu. Nowy katalog testów jest częścią `npm test`.

| Sprawdzenie | Wynik |
| --- | --- |
| Końcowe `npm test` | 481 testów: 480 PASS, 1 SKIP, 0 FAIL; kod 0 |
| `npm run lint` | ESLint/TypeScript PASS, kod 0 |
| `npm run build:panel` | PASS, kod 0; wcześniejsze ostrzeżenie rozmiaru paczek |
| Testy wskazane w planie przed dodatkową regresją review | 21/21 PASS |
| Aktualne preferencje klientów | 7/7 mapowanych rodzimych profili skompilowanych read-only, hashe zapisane w prywatnym baseline |
| Niezależny review | 1 Important: poprawny klient `constructor` kolidował z prototypem obiektu; naprawiony testem rzeczywistego zapisu RED→GREEN, potem zielona pełna suite |
| Dokumentacja / diff | lokalne odnośniki poprawne, `git diff --check` bez błędów |

Pierwsza pełna suite wykryła brak kompatybilności z całkowicie własnym dokumentem klienta; naprawa również potwierdzona RED→GREEN. Pominięty test dotyczy izolowanego Chromium w skanowaniu strony brandingu; nie jest dowodem wykonania tego skanowania. Nie powtarzano pełnego odbioru GUI ani obrazu, ponieważ F1 zmienia kontrakt zapisu i nie wprowadza nowego ekranu.

Logi lokalne: `/private/tmp/montage-f1-tests.log`, `/private/tmp/montage-f1-lint.log`, `/private/tmp/montage-f1-panel.log`, `/private/tmp/montage-f1-review-red.log`, `/private/tmp/montage-f1-review-green.log`. Nowe testy uruchamiają się w zwykłym `npm test`. Zmiany transkrypcji obecne przed F1 pozostawiono nienaruszone.

Review nie oceniał mediów/odsłuchu, rzeczywistej rozłączności jeszcze nieprzypisanego holdout, kompletności nieskodyfikowanych reguł, wykonania migracji F3 ani serwera. Te zakresy pozostają jawnie nieodebrane, zamiast przyjmować je na podstawie zielonych testów danych.

## Ograniczenia i następny krok

Nie wykonano nowych płatnych wywołań, renderów ani odsłuchu w F1. Kontrakt jest deklaracją i niepełnym mapowaniem, nie nowym silnikiem oceny obrazu. Własne profile i konto CLI nie dostały ograniczeń pakietu SaaS.

Nadal potrzebne: prywatne przypisanie/adnotacje/odbiór próbek korpusu, pełniejsza kodyfikacja zasad i weryfikacja konfliktów poza mapowanymi sekcjami. Źródłem pozostają PREFERENCJE; nie zmieniono źródła prawdy na panel. Automatyczna kontrola geometrii/assetów, pełne operacje i migracje oraz tracking mają osobne fazy F2–F4. Dopóki braki korpusu pozostają, F1 nie jest pełnym odbiorem jakości klientów.
