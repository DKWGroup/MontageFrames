# MontageFrames — research i propozycja pricingu

Data weryfikacji: 2026-10-17. Odbiorcy potwierdzeni przez właścicielkę: twórcy i małe agencje. Ceny MontageFrames poniżej są propozycją w PLN, nie działającym abonamentem. Brak checkoutu, obsługi płatności i egzekwowania limitów w obecnej aplikacji.

## Oficjalne oferty konkurencji

| Produkt | Miesięcznie, USD | Limit / jednostka | Wniosek dla MontageFrames |
|---|---:|---|---|
| Submagic Starter | 19 | 15 filmów, do 2 min | Jasna liczba filmów jest łatwiejsza do zakupu niż sam portfel tokenów. |
| Submagic Pro | 39 | 40 filmów, do 5 min | To bliższy punkt odniesienia dla automatycznego montażu. |
| Submagic Business | 69 | 100 filmów, do 30 min | Istotna konkurencja wolumenowa; nie wystarczy sprzedawać samych napisów. |
| Captions Max | 24,99 | 500 kredytów / mies. | Kredyty zależą od rodzaju operacji; nie są liczbą rolek. |
| Captions Frontier | 69,99 | 1400 kredytów / mies. | Wyższe progi 139,99 / 279,99 USD obejmują 2800 / 5600 kredytów. |
| OpusClip Starter | 15 | 150 kredytów / mies. | Rozliczanie przetwarzania długich źródeł, nie obietnica 150 gotowych rolek. |
| OpusClip Pro | 29 | 300 kredytów / mies. | Alternatywa roczna to 174 USD z góry, ekwiwalent 14,50 USD/mies.; nie porównywać tego z elastycznym planem miesięcznym. |

Źródła: [Submagic — pricing](https://www.submagic.co/pricing), [Captions — pricing](https://captions.ai/pricing), [Captions — zależność ceny od platformy i kraju](https://help.captions.ai/docs/subscriptions), [OpusClip — pricing](https://www.opus.pro/pricing). Captions zastrzega, że publiczne ceny i funkcje na stronie dotyczą planów iOS. Ceny końcowe, promocje, podatki i lokalizacja mogą się różnić. Nie przeliczam USD po wymyślonym kursie i nie stawiam znaku równości między kredytami różnych produktów. Tabele cech Submagic zawierają miejscami różne wartości szablonów i jakości; nie używać tych niejednoznacznych szczegółów jako przewagi w reklamie.

## Co sprzedawać

Nie pozycjonować jako „tańsze napisy”. Sprzedawać odzyskaną pracę: wgranie nagrania + profil klienta → transkrypcja, propozycja cięć, napisy i oprawa → kontrola → gotowy plik. Profile klientów, poprawki opisane zdaniem i lokalne źródła to konkretniejszy wyróżnik niż obietnica viralowości.

Dla zwykłej rolki automatyzacja startuje po wybraniu nagrania i klienta. QuickContent zachowuje jawny wybór propozycji, a LongForm akceptację cięć i planu — landing nie może obiecywać automatycznej publikacji lub braku wszelkich decyzji.

## Proponowane pakiety planowanej usługi

| Pakiet | Cena miesięczna PLN | Gotowe rolki | Tokeny do poprawek AI | Cena / rolkę przy pełnym użyciu |
|---|---:|---:|---:|---:|
| Solo | 129 | 15 | 250 000 | 8,60 zł |
| Creator | 299 | 50 | 1 000 000 | 5,98 zł |
| Studio | 699 | 150 | 3 000 000 | 4,66 zł |

Rekomendacja: Creator jako środkowy plan. Solo pozwala zacząć bez dużego zobowiązania; Studio sprzedaje wolumen, a nie sztucznie ukryte funkcje. Nie obiecywać zespołowych ról, SLA lub pełnego SaaS, których jeszcze nie wdrożono. Oznaczenie ceny końcowej i podatków wymaga ustalenia modelu sprzedaży przed uruchomieniem checkoutu; liczby tutaj są propozycją cen dla odbiorcy, nie ofertą księgową.

Dodatki do przetestowania: 10 rolek za 69 zł; 1 mln tokenów poprawek za 49 zł. To hipotezy do policzenia po zebraniu rzeczywistego kosztu, nie arbitralna gwarancja marży. Nie włączać automatycznych dopłat. Plan roczny dopiero po potwierdzeniu retencji; ewentualna zniżka 15–20% to eksperyment, nie domyślna obietnica na stronie.

## Reguły rozliczania

- 1 rolka = pierwszy sprawdzony render jednej unikalnej rolki do 90 s. Błąd zadania nie zużywa limitu. Dłuższe filmy i LongForm wyceniać osobno.
- Ponowny render po zmianie kadru/rozdzielczości i ręczna korekta napisów nie zużywają kolejnej rolki ani tokenów AI.
- Pierwszy montaż w cenie rolki. Osobna pula tokenów służy do poleceń poprawek i ponownej redakcji, nie do karania użytkownika za retry renderu.
- Dla zarządzanego API mierzyć rzeczywiste input+output w ramach zdefiniowanej listy modeli. Cache nie może być naliczany jak ponowna pełna redakcja. Zmiana modelu o innym koszcie wymaga jawnej polityki, nie cichej zmiany wartości tokena.
- Nie sprzedawać określonej liczby poprawek za 1 mln tokenów: długość filmu i kontekstu zmieniają zużycie. Pokazać koszt przed zleceniem, stan puli po zadaniu, a przy nieznanym zużyciu — brak danych.
- Tryb własnego konta CLI: zużycie i limity dostawcy są zewnętrzne. Pula API aplikacji nie jest limitem subskrypcji ChatGPT/Claude i nie może być podwójnie odejmowana. Wersja lokalna nie ma jeszcze limitów abonamentu.
- Brak limitu konta lub logowania nigdy nie uruchamia płatnego API. Opisy publikacji można jawnie przełączyć na CLI; wcześniej API było jedyną ścieżką.
- Pula miesięczna odnawia się wraz z okresem; bez obietnicy rollover na etapie premiery. Dodatkowe tokeny można planować z terminem ważności 12 miesięcy dopiero po wdrożeniu trwałego ledgeru billingowego.

## Ekonomia i walidacja przed sprzedażą

Docelowy koszt zmienny = ASR + redakcja + poprawki + opis + render + przechowanie/transfer + obsługa płatności. Aktualna lokalna aplikacja przenosi render i ASR na komputer użytkownika; chmurowy SaaS ma inne koszty. Nie zakładać, że subskrypcja jednego operatora pokryje pracę wszystkich klientów SaaS. Lokalny klient używa własnego konta, zgodnie z jego dostępem i warunkami dostawcy.

Dla docelowej marży zmiennej 70% maksymalne koszty miesięczne na pełne konto wynoszą 38,70 / 89,70 / 209,70 zł przed rozdzieleniem podatków i kosztów stałych. To próg projektowy, nie wynik finansowy. Daje odpowiednio 2,58 / 1,79 / 1,40 zł kosztu zmiennego na rolkę, jeśli cały budżet przypisać rolkom; rzeczywiste poprawki i support obniżą dostępny budżet. Jeśli pomiary przekroczą próg, zmienić cenę, limity lub model wykonania przed premierą.

Zebrać 30–50 prawdziwych zadań z różną długością i dźwiękiem: aktywny czas ręczny, aktywny przegląd AI, całkowity czas renderu, input/output/cached tokeny i koszt każdej próby. Osobno testować oferty 249/299/349 zł dla planu Creator oraz zrozumiałość „tokenów”. Nie wdrażać całego billingowego systemu na podstawie samej strony sprzedażowej.

## Jak mówić o oszczędności czasu

„Wgrywasz rolkę. Montaż wykonuje program. Ty sprawdzasz efekt.” Kalkulator używa własnych założeń użytkownika, np. 30 min ręcznej pracy i 5 min przeglądu na 20 rolek daje 8 h 20 min mniej pracy ręcznej. To arytmetyka scenariusza, nie benchmark, prognoza czasu renderu ani gwarancja. Brak obietnic przyrostu zasięgów.

## Twierdzenia i roadmapa

**96% polskich napisów**: liczba podana przez właścicielkę; warunek: dźwięk wyraźny i zrozumiały dla ludzkich uszu. Brak opublikowanego benchmarku w repo. Na landingu napisać „deklarowana trafność”, a w objaśnieniu rozdzielić deklarację od badania. Przed szeroką reklamą opublikować próbę, definicję poprawnego słowa, WER (z podstawieniami/usunięciami/dodaniami) oraz zakres materiału. Nie twierdzić, że wykonano ten test.

**Claude Code / Codex**: integracja lokalna z własnym kontem; odrębny koszt i limity subskrypcji, nie obowiązek klucza API. Zwykły panel i Motion mają dziś Claude Code, QC/LongForm także Codex; Codex jako agent terminalowy potrafi pracować na repo. Nie sugerować wspólnego abonamentu dla wielu użytkowników SaaS.

**Hermes / głos / Dysk Google**: przyszła integracja. Docelowo agent z uprawnieniem do wybranego folderu Drive przyjmie komendę głosową i zleci montaż. Samo podpięcie Drive dziś tego nie uruchamia; potrzebny connector, delegowanie zadań, zgody dostępu i raportowanie wyniku. Na stronie „Wkrótce”, bez wymyślonej daty premiery.
