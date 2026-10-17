# Macierz gotowości — 17.10.2026

Kod, test automatyczny i odbiór pełnego przepływu to osobne stany. Poniżej stan po [poprawkach audytu](audits/2026-10-17/fixes.md); szczegóły wcześniejszego stanu w [audycie](audits/2026-10-17/audyt.md).

| Obszar | Kod i testy | Rzeczywisty odbiór / następny krok |
|---|---|---|
| Zwykłe rolki: upload i zapis | Kolizje źródeł, równoległy zapis, rewizje/409, zachowanie draftu i blokowanie renderu po błędzie — testy PASS | Biblioteka i filtry sprawdzone w przeglądarce. Pełny świeży upload → ASR → operator → korekta w GUI pozostaje do odbioru. |
| Zwykłe rolki: wynik | Snapshot, ffprobe, wersje i podpis, anulowanie przygotowania — testy PASS | Dwa rzeczywiste neutralne rendery 720p; pierwszy zachowany. Nie testowano ponownie każdego profilu klienta. |
| QuickContent | Zachowany worker, wybór, rewizje, checkpointy, koszty, kadrowanie; poprawione podpisy i archiwalne wyniki | [Odbiór QC](quickcontent/acceptance.md) pozostaje otwarty: prawdziwe YouTube/pliki, SkyClass z czasu >0 z odsłuchem, retry/restart i wyczerpanie propozycji. |
| Media | Wspólny streaming GET/HEAD/Range, 206/416 — PASS | Dostępne dla zwykłych plików, QC i Motion. |
| Motion Studio | Wersjonowane artefakty i rezerwacje, bramka evidence, walidacja MP4 — PASS | Neutralne preview ×2 i draft 1:1 sprawdzone. Wszystkie formaty, prawdziwe assety, miks i restart nadal otwarte według [checklisty](motion-studio-acceptance.md). |
| Landing / biblioteka | Czytelność, mobilna tabela, wyszukiwanie, tytuły i statusy | Przeglądarka i zrzuty 390/768/1440 px; brak publicznego filmu klienta. Demo pozostaje jawnie schematyczne. |
| Release | Testy, lint, Remotion bundle i panel build w CI | Lokalne oba buildy PASS. Rzeczywiste wydanie, instalacja, zachowanie profilu i rollback na drugiej kopii nadal nieodebrane. |
| LongForm | Istnieje częściowa implementacja; szczegóły w audycie | Całość poprawek wyłączona z obecnego zlecenia. Nie zmieniano kodu ani nie zamykano znanych usterek. |
| Premiere | Bazowy eksport OTIO istnieje; plugin jest planem | Spike API i import w prawdziwym Premiere nieodebrane. |
| Abonamenty / głos / Hermes / Dysk | Treści oferty i zapowiedzi | Brak aktywnego billing/integracji; wymagają osobnego wdrożenia i odbioru. |

Końcowa regresja: 400/400, lint/typy i oba buildy PASS. Nie uruchamiano nowego płatnego AI ani analizy prywatnych materiałów w tym zakresie.
