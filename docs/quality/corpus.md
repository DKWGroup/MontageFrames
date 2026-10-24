# Korpus jakości — inwentaryzacja F1

Data: 2026-10-18. **Stan: 90 opisanych przypadków do przypisania i odbioru; 0 przyjętych próbek w nowym korpusie.** [Lista maszynowa](corpus.json), [plan F1](../../plan-wdrozenia-Serwer.md). Nie jest to benchmark obrazu ani dowód naprawienia trackingu.

## Zakres i podział

| Profil | Klient | Przypadki | Podział prompt / tuning / holdout |
| --- | --- | --- | --- |
| persona | bez klienta | 10 | 3 / 3 / 4 |
| skyclass | skyclass | 10 | 3 / 3 / 4 |
| herod | magdalena-herod | 10 | 3 / 3 / 4 |
| bisanz | kacper-bisanz | 10 | 3 / 3 / 4 |
| ameryka | swieza-bryka-ameryka | 10 | 3 / 3 / 4 |
| glowup | glowup-nutrition | 10 | 3 / 3 / 4 |
| vital | vital-hormone | 10 | 3 / 3 / 4 |
| happynews | happy-news | 10 | 3 / 3 / 4 |
| brand | własny branding i nowe profile | 10 | 3 / 3 / 4 |

Każdy profil ma niezależne ID i oczekiwanie dla: bazowego wyglądu, długich napisów, źródła poziomego, ciszy, przebitki, liczby, hooka, emotki, korekty i starej wersji. Oczekiwania klientów są doprecyzowane osobno, np. SkyClass z mastera >0, Bisanz bez zoomu, Happy News duo z ekranem i zbliżenie bez panelu. Profile lokalne spoza rejestru korzystają z checklisty własnego brandingu; nazwy prywatnych testowych klientów nie są publikowane w korpusie.

`mediaRef=null` oznacza brak przypisanej oznaczonej próbki, nie twierdzenie, że żadne źródło nie istnieje. `review=pending` oznacza brak odbioru tego przypadku. Wcześniejsza aprobata pojedynczej rolki w PREFERENCJE nie jest automatycznie odbiorem wszystkich nowych przypadków.

Inwentaryzacja lokalna znalazła 38 draftów: SkyClass 2, Kacper Bisanz 15, Persona 3, GlowUp 1, Ameryka 1, styl Bisanz bez przypisanego klienta 1, Herod 8, Happy News 6, Vital 1. To kandydaci, nie 38 zatwierdzonych wzorców. Prywatny indeks ścieżek, dostępności źródeł i hashe kontraktów: `.quickcontent/quality/f1-baseline-2026-10-18.json` (poza Git). Żadnego nagrania ani draftu nie zmieniono podczas inwentaryzacji.

## Jak przypisywać próbki

1. Wybrać materiał i dokładny zakres klatek/czasu. Zachować hash źródła, mapę do mastera, klienta, kontrakt, branding i runtime; referencję przechować prywatnie pod ID przypadku.
2. Ręcznie oznaczyć oczekiwane słowa, cięcia, twarze, panel przebitki i istotne granice obrazu. Referencji nie generuje sam oceniany detektor/model.
3. Obejrzeć ruch i odsłuchać; wpisać co sprawdzono i którą rewizję. Dopiero wtedy zmienić stan przypadku. Brak klipu, wycięcia, adnotacji lub zgody ma osobną jawną przyczynę.
4. Materiały i warianty tej samej historii/trenowanej próbki nie mogą przenikać do holdout. Przed testem przypiąć listę/hash zbioru; holdout nie trafia do promptów i strojenia. Obecny podział ID jest planem podziału, nie dowodem rozłączności jeszcze nieprzypisanych mediów.
5. Przed porównaniem renderów zapisać tolerancje obrazu/audio, narzędzie i wersję pomiaru. Obecnie nie ma odebranych tolerancji ani wyników parity. Nie wybierać ich po zobaczeniu błędów.

## Reguły F1 i status automatyzacji

Nowe wersje zapisanych brandingów otrzymują `qualityContract` v1: hash, klienta, wersję brandingu, styl i reguły ze źródłem. `coverage=partial` i krytyczne reguły przeglądu PREFERENCJE jawnie oznaczają niepełną kodyfikację. `checkKind` określa wymagany rodzaj sprawdzenia, nie wykonany wynik kontroli.

Aktualne mapowanie obejmuje po kilka najważniejszych reguł wszystkich 7 klientów. Persona i własny styl otrzymują wybrane ustawienia wyglądu i niezmienniki silnika. Treści biznesowe/medyczne/prawne pozostają do przeglądu według preferencji; F1 nie jest ich automatycznym audytem.

Mapowanie jest utrzymywane ręcznie w `scripts/quality/client-rules.mjs`; hash skodyfikowanej sekcji w `client-rule-sources.json` zabezpiecza przed cichą publikacją starego znaczenia po zmianie akapitu. Aktualizacja wymaga przeczytania korekty, zmiany mapowania i testu, dopiero potem nowego hasha sekcji. Nie regenerować hashy w ciemno. Całkowicie własny dokument bez skodyfikowanych sekcji pozostaje edytowalny, ale ma nieznaną ocenę i nie dziedziczy rzekomej pełnej zgodności rodzimego profilu.

Starsze wersje brandingu i projekty bez kontraktu pozostają bez automatycznej migracji. Nowy zapis dodaje kontrakt tylko w nowej wersji; odczyt wcześniejszego snapshotu nie czyta ponownie aktualnych reguł. Ręczny wybór własnego stylu zachowuje konfigurację wyglądu. Pomocnicza kontrola migracji na pełną wypowiedź wymaga zachowanego mastera/transkrypcji; faktyczna migracja montażu i operacje są zakresem F3.

F1 nie dopisuje automatycznie kontraktu do istniejących projektów ani wszystkich historycznych szablonów bez zapisanego brandingu. Ujednolicenie tych wejść należy do F3. F2/F4 wykonają kontrolę zasobów i obrazu; nie oznaczać deklaracji reguły jako zaliczonego testu filmu.

## Częściowy dowód F4 — 2026-10-19

W debugowaniu lokalnym użyto istniejącej historii Happy News o trzmielach. Obraz źródła przy 0,32/0,40 s i pięć nowych klatek renderu 10–14 potwierdziły granicę zbliżenie→duo z przebitką na klatce 12. To materiał **tuning**, bez pełnego odsłuchu i bez akceptacji całego przypadku; nie zwiększa liczby przyjętych próbek. Nie używać tej historii w późniejszym holdout. Dokładny hash źródła i prywatne ścieżki są w `.quickcontent/quality/f4-detection-verified-2026-10-19/observations.json` i `f4-render-proof-2026-10-19/proof.json`. [Odbiór zakresu](f4-acceptance.md).

Przyrost rastra 2026-10-20: [dowód trzech masek klatki Happy News](f4-pixels-2026-10-20.md) pochodzi z tej samej wcześniej użytej próbki strojenia. Bez nowego holdout i bez przyjęcia pełnego filmu/korpusu; nie zwiększać licznika zaakceptowanych przypadków na podstawie tej próby.
