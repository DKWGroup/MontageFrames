# QuickContent — specyfikacja GUI

Data projektu: 2026-10-14. Stan2026-10-15: **GUI zaimplementowane, pełny odbiór trwa** — dowody w [acceptance.md](acceptance.md). Makiety i ich liczby, tematy, tytuły oraz oceny są wyłącznie przykładami. Kontrakt funkcji: [zalozenia-funkcji-QuickContent.md](../../zalozenia-funkcji-QuickContent.md). Kolejność prac i kryteria wdrożenia: [plan-wdrozenia-QuickContent.md](../../plan-wdrozenia-QuickContent.md).

## Cel i granice

Użytkowniczka dodaje źródło, wybiera klienta i szablon, określa temat oraz długość. Przetwarzanie w tle kończy się propozycjami. Dopiero przycisk **„Zmontuj zaznaczone”** rozpoczyna montaż. Następnie użytkowniczka otwiera konkretną rolkę, poprawia tekst lub przekazuje poprawkę przez czat i pobiera aktualny wynik.

Inspiracją jest kolejność działań znana z OpusClip. GUI używa języka, tokenów i istniejącego edytora MontageFrames; nie odtwarza pikselowo cudzych ekranów. Ocena propozycji oznacza ocenę redakcyjną wynikającą z analizy materiału, a nie prawdopodobieństwo wyświetleń lub obietnicę viralowości.

## Nawigacja i trwałość widoku

W bocznej nawigacji, obok istniejących modułów, pojawia się „QuickContent”. Wejście pokazuje zapisane projekty oraz akcję „Nowy projekt”. Nowy projekt otwiera formularz importu. Po utworzeniu projektu każda dalsza czynność odbywa się w jego kontekście.

| Adres | Widok |
|---|---|
| `#qc/<projectId>` | Źródło, ustawienia, postęp lub lista propozycji danego projektu |
| `#qc/<projectId>/<candidateId>` | Szczegóły propozycji; po montażu istniejący edytor powiązanej rolki |
| `#<reelname>` | Dotychczasowy edytor rolki, zachowany bez zmiany zachowania |

Parser sprawdza prefiks `qc/` przed interpretacją adresu jako nazwy rolki. Brakujący projekt albo propozycja pokazuje trwały komunikat z powrotem do listy projektów. Przyciski „Wróć do propozycji” i systemowe Wstecz działają przewidywalnie, również po bezpośrednim otwarciu adresu. Widok Motion Studio pozostaje osobnym modułem.

Po odświeżeniu strony panel odczytuje projekt, trwałe zaznaczenia, zadania i ich ostatnie zdarzenia. Formularz utworzonego projektu oraz selekcja nie mogą istnieć wyłącznie w `useState` lub `localStorage`. Lokalny stan przechowuje tylko chwilowy input, focus i otwarcie paneli. Lista propozycji zachowuje scroll oraz sortowanie podczas wejścia do rolki i powrotu.

## Formularz importu

Układ formularza odpowiada kolejności decyzji:

1. Źródło: zakładki **„Link YouTube”** / **„Plik z komputera”**. Pole z widoczną etykietą „Link do filmu” albo upload pojedynczego filmu, z nazwą, wielkością i możliwością zmiany pliku.
2. Klient: istniejący klient albo **„Bez klienta — przestrzeń robocza”**. QuickContent nie wymaga tworzenia klienta, aby przetworzyć materiał. Założenie nowego klienta korzysta z istniejącego formularza klientów, jeżeli użytkowniczka wybierze tę akcję.
3. Branding/szablon: lista zgodna z klientem, z nazwą i krótkim podglądem. Dla przestrzeni roboczej dostępny szablon bazowy. Wybór klienta i wybór szablonu są oddzielnymi wartościami; brak kompletnego profilu klienta pokazuje „Profil wymaga uzupełnienia”, zamiast obiecywać gotowy branding.
4. Tryb: **„Auto”** / **„Własne wskazówki”**. Auto szuka pełnych, interesujących myśli w całym materiale. W drugim trybie pojawia się textarea „Na czym mamy się skupić?” z przykładem: „Mocne opinie o prowadzeniu firmy, błędy początkujących, historie z konkretną puentą”. Puste wskazówki w tym trybie blokują przetwarzanie i pokazują błąd przy polu.
5. Długość: domyślnie **„30–60 s”**; pełna lista presetów to **„15–30 s”**, **„30–60 s”**, **„60–90 s”**, **„90–180 s”**, **„Auto — 15–180 s”** oraz **„Własny zakres — 10–300 s”**. Własny zakres ma jawne pola **„Minimum (s)”** / **„Maksimum (s)”**, których wartości muszą mieścić się w 10–300 s. Preset wpisuje wartości; Auto pozwala dobrać długość do kompletnej myśli w granicach 15–180 s. Maksimum nie może być mniejsze od minimum; ograniczenia wynikają z kontraktu API, nie z ukrytej logiki formularza. Pomocniczy tekst: „Fragment musi mieć zrozumiały początek i koniec. Jeśli nie mieści się w tym zakresie, nie dodamy go na siłę”.
6. Dla YouTube: **„1080p”** / **„4K, jeśli dostępne”**. Krótki opis: „Obraz i najlepsze dostępne audio pobieramy osobno, a następnie łączymy”. Przy niedostępnej jakości proces używa najlepszej dostępnej niższej rozdzielczości i pokazuje trwałe, jawne ostrzeżenie, np. „4K niedostępne — pobrano 1080p”. Nie wymaga dodatkowego potwierdzenia, nie skaluje źródła w górę i nie oznacza niższej rozdzielczości jako 4K.
7. Główna akcja **„Przetwarzaj”** i zdanie „Najpierw otrzymasz propozycje. Montaż uruchomisz po ich wybraniu”.

Domyślnym trybem focus jest Auto, a domyślną jakością YouTube 1080p. Po rozpoznaniu źródła nagłówek projektu pokazuje prawdziwy tytuł, miniaturę, długość i wybraną jakość. Dla pliku lokalnego punktem wyjścia jest nazwa pliku. Materiał master pozostaje niezmiennym źródłem; podgląd, wycięte propozycje i montaż nie nadpisują go. Wynik montażu ma 1080×1920 px, niezależnie od rozdzielczości źródła. Formularz nie zawiera danych wynikowych, których proces jeszcze nie ustalił.

### Makieta importu — przykład, desktop

```text
MontageFrames      QuickContent  /  Nowy projekt
┌──────────────┐   ┌──────────────────────────────────────────────────────────┐
│ Nowa rolka   │   │ Z długiego filmu wybierz gotowe pomysły na rolki         │
│ QuickContent│   │ [Link YouTube] [Plik z komputera]                        │
│ Motion Studio│  │ Link do filmu                                           │
│              │  │ [https://www.youtube.com/watch?v=…                     ] │
│ Klienci      │  │ Klient                     Branding/szablon              │
│ …            │  │ [Bez klienta             v] [Bazowy — persona         v]│
│              │  │ Na czym mamy się skupić?                                 │
│              │  │ [● Auto] [○ Własne wskazówki]                             │
│              │  │ Preferowana długość                                      │
│              │  │ [30–60 s v]  Minimum [30] s  Maksimum [60] s              │
│ Ustawienia   │  │ Jakość obrazu [●1080p] [○4K, jeśli dostępne]              │
└──────────────┘   │ Najpierw propozycje; potem wybierasz, co zmontować.        │
                   │                                         [Przetwarzaj]   │
                   └──────────────────────────────────────────────────────────┘
```

Przy zapisie i wysyłaniu przycisk pokazuje rzeczywistą czynność i jest zabezpieczony przed podwójnym kliknięciem. Błędy pozostają przy polach; ogólny toast nie zastępuje błędu formularza. Awaria wysyłania nie kasuje klienta, szablonu, wskazówek ani zakresu czasu.

## Przetwarzanie i postęp

Po starcie formularz zastępuje karta projektu z etapami. Panel pozwala przejść do innego projektu; ponowne otwarcie odtwarza stan z backendu. Nie wymaga utrzymania otwartej zakładki.

| Etap | Informacja widoczna dla użytkowniczki |
|---|---|
| Wysyłanie lokalnego pliku | Zmierzone `%` wysłanych bajtów oraz nazwa pliku |
| Pobieranie YouTube | Osobne „Obraz” i „Audio”, wybrana jakość, zmierzony postęp/rozmiar; tytuł po ustaleniu |
| Łączenie i sprawdzanie źródła | Nazwa etapu; `%` tylko jeśli proces raportuje postęp względem znanej długości |
| Whisper — transkrypcja | Postęp faktycznie przetworzonych zakresów lub „Transkrypcja trwa”, gdy brak takiej miary |
| Analiza fragmentów | Liczba przeanalizowanych części `X/Y`, jeżeli dostępna; bez udawanego czasu lub procentu tokenów |
| Sprawdzanie sensu i powtórzeń | Etap walidacji i liczba sprawdzonych propozycji, gdy jest znana |
| Gotowe propozycje | Rzeczywista liczba przyjętych fragmentów i przyczyny odrzucenia, jeżeli przydatne |

Ostatnio ukończony etap jest odznaczony tekstem „Gotowe”. Aktywny etap ma tekst „W trakcie”. Przyszłe etapy mają „Oczekuje”. Nie łączymy kilku różnych miar w pozornie dokładny globalny procent. Status przetwarzania i log techniczny są rozdzielone: najpierw krótki komunikat, szczegóły po rozwinięciu „Szczegóły zadania”.

```text
QuickContent / Rozmowa o prowadzeniu firmy      [Przykładowy projekt]
Klient: bez klienta · Szablon: bazowy · 30–60 s

Obraz                    Gotowe, 1080p
Audio                    Gotowe
Łączenie i kontrola       Gotowe
Transkrypcja Whisper      W trakcie: 18:20 / 42:00
Analiza fragmentów       Oczekuje
Sprawdzenie propozycji   Oczekuje

[Szczegóły zadania]                         [Anuluj przetwarzanie]
Możesz wrócić do projektu później. Postęp zapisuje się na tym komputerze.
```

Anulowanie kończy aktywny proces w kontrolowany sposób i zachowuje kompletne artefakty. Panel odróżnia „Anulowano” od „Przerwano po restarcie”. Wznowienie korzysta z ostatniego poprawnego etapu; użytkowniczka nie wybiera ręcznie plików pomocniczych.

## Lista propozycji

Nagłówek pokazuje źródło, ustawienia analizy i liczbę wyników. Domyślne sortowanie: ocena redakcyjna malejąco, z trwałą kolejnością dla równych ocen. Możliwe sortowanie po czasie źródła. Zmiana sortowania nie zmienia zaznaczeń ani numeracji identyfikatorów.

Karta propozycji zawiera:

- Checkbox z etykietą „Wybierz do montażu: [tytuł]”. Checkbox i akcja otwarcia są oddzielnymi celami; kliknięcie „Obejrzyj” nie zaznacza propozycji.
- Miniaturę prawdziwego surowego fragmentu, z zachowaniem proporcji źródła i przyciskiem odtworzenia. Miniatura nie symuluje gotowej rolki ani brandingu.
- Tytuł redakcyjny, zakres w źródle, długość i opis 1–2 zdania: o czym mówi osoba i jaki jest przekaz fragmentu.
- Typ: np. „Mocne zdanie”, „Historia”, „Praktyczna rada”, „Kontrargument”. Kontrowersyjność nie jest automatycznie synonimem wysokiej jakości.
- **„Ocena redakcyjna: 82/100”**, z rozwinięciem „Dlaczego?”. Uzasadnienie wskazuje rzeczywistą wypowiedź, kompletność myśli i powód zainteresowania. Tekst „Ocena nie przewiduje zasięgu” jest dostępny przy etykiecie oceny.
- Widoczny stan: „Propozycja”, „W kolejce”, „Montaż”, „Render”, „Zmontowane”, „Błąd” lub „Wymaga aktualnego renderu”. Stan opisuje bieżącą rewizję i nie wynika wyłącznie z obecności starszego MP4.
- Akcję „Obejrzyj fragment”, a po montażu „Otwórz edytor”.

Opisy i oceny nie przypisują rozmówcy mocniejszych słów, niż wypowiedział. Fragment zależny od wcześniejszego kontekstu nie otrzymuje etykiety kompletnego przekazu bez poprawienia granic lub odrzucenia przez walidację.

### Makieta wyników — wszystkie dane przykładowe

```text
QuickContent / Rozmowa o prowadzeniu firmy                  [Źródło i ustawienia]
Znaleziono 12 sensownych propozycji
[Wszystkie] [Zmontowane] [Wymagają uwagi]     Sortuj: [Ocena redakcyjna v]

┌────────────────────────────────┐  ┌────────────────────────────────┐
│ [x] Propozycja                 │  │ [ ] Zmontowane                 │
│ [Prawdziwa miniatura · ▶]      │  │ [Prawdziwa miniatura · ▶]      │
│ Dlaczego tani klient kosztuje  │  │ Pierwszy zespół i jedna zmiana  │
│ najwięcej                      │  │ 09:42–10:35 · 53 s             │
│ 03:15–04:01 · 46 s             │  │ Historia                       │
│ Mocne zdanie                   │  │ Ocena redakcyjna: 78/100       │
│ Ocena redakcyjna: 82/100        │  │ Opis pełnej myśli…             │
│ Opis pełnej myśli…             │  │ Aktualny render · rewizja 2    │
│ [Dlaczego?] [Obejrzyj fragment]│  │ [Dlaczego?] [Otwórz edytor]   │
└────────────────────────────────┘  └────────────────────────────────┘
…
[Znajdź więcej]

╔══════════════════════════════════════════════════════════════════════════╗
║ Zaznaczono 3 propozycje     [Wyczyść zaznaczenie] [Zmontuj zaznaczone (3)]║
╚══════════════════════════════════════════════════════════════════════════╝
```

Dolny pasek selekcji jest przyklejony i zawiera rzeczywistą liczbę zaznaczonych propozycji. Przy `0` akcja montażu jest wyłączona z tekstem „Zaznacz propozycje do montażu”. Zbiorczy montaż obejmuje jawnie zaznaczone identyfikatory; filtrowanie nie odznacza niewidocznych kart. Jeżeli część selekcji jest poza filtrem, pasek pokazuje np. „3 zaznaczone, w tym 1 poza tym widokiem”.

Zaznaczenie jest zapisywane do projektu. W razie błędu zapisu karta i pasek pokazują stan „Nie zapisano wyboru — ponów”; montaż nie korzysta z niepotwierdzonego zaznaczenia. Klik „Zmontuj zaznaczone” pokazuje wybrany zestaw i uruchamia jeden idempotentny batch. Ponowny klik podczas wysyłania nie dodaje drugiego zadania. Gotowe aktualne rendery nie są po cichu montowane ponownie; wymuszona nowa wersja jest oddzielną, jawną akcją w edytorze.

### „Znajdź więcej”

Przycisk uruchamia kolejne wyszukiwanie w tym samym źródle. Istniejące karty, opisy, identyfikatory, zaznaczenia, granice oraz ręczne poprawki pozostają. Panel pokazuje etap wyszukiwania nad listą, a wyniki dopisuje po zakończeniu z tekstem „Dodano 4 nowe propozycje” i możliwością przejścia do nich.

Podczas tego procesu kolejne kliknięcie jest zablokowane. Nowe propozycje nie są automatycznie zaznaczane ani montowane. Brak nowych wyników pokazuje „Nie znaleziono kolejnych pełnych fragmentów dla tych ustawień”. Po wyczerpaniu materiału stan `exhausted` zamienia akcję na komunikat; użytkowniczka może zmienić focus/zakres w ustawieniach analizy jako jawny nowy przebieg, identyfikowany przez `analysisRunId`, z zachowaniem wcześniejszych wyników. Każdy przebieg zachowuje własne ustawienia. Zmiana długości lub focus nie zmienia wcześniej utworzonych fragmentów, ich oceny, selekcji ani montażu. Lista może wskazywać „Przebieg 1: Auto, 30–60 s” i „Przebieg 2: Historie klientów, Auto 15–180 s”. Proces nie obniża progu sensowności tylko po to, by zwiększyć liczbę kart.

## Montaż zaznaczonych propozycji

Lista pozostaje dostępna. Nad nią pojawia się karta zbiorczego postępu:

```text
Montaż wybranych propozycji                              [Dane przykładowe]
Zmontowane 2 z 5 — 40% · W kolejce 2 · W trakcie 1 · Błędy 0

1  Dlaczego tani klient…       Zmontowane · aktualny render
2  Historia pierwszego zespołu Zmontowane · aktualny render
3  Granice z klientem          Render 64%  [████████░░░░]
4  Jak przygotować brief       W kolejce
5  Jeden błąd w wycenie         W kolejce

[Szczegóły zadania]                                  [Anuluj pozostałe]
```

`Gotowe X/Y` oznacza propozycje z poprawnym końcowym renderem aktualnej rewizji, nie liczbę rozpoczętych operatorów. **Procent ukończenia partii to `ukończone aktualne rendery / wszystkie wybrane rolki × 100`**, np. „Zmontowane 2/5 — 40%”. To postęp policzonych wyników, nie szacowany czas pracy. Osobno pokazujemy liczbę błędów i oczekujących; błędna pozycja nie zwiększa procentu ukończenia. Dla montażu semantycznego pokazujemy etapy, np. „Redakcja napisów”, „Branding i grafiki”, „Kontrola klatek”, z `progress: null`. Obok postępu partii pokazujemy rzeczywisty postęp bieżącego renderu, np. „Bieżąca rolka: render 64%”. Procent renderu pochodzi z rzeczywistych zdarzeń renderera; nie jest estymacją procentu decyzji AI. Mierzalny render nie może być schowany w niestrukturyzowanym logu operatora.

Znaczek **„Zmontowane”** pojawia się po powodzeniu kontroli, renderu i sprawdzeniu pliku. Częściowy błąd nie ukrywa gotowych rolek: „Gotowe 4/5, jedna rolka wymaga ponowienia”. „Ponów nieudane” ponawia tylko błędne lub przerwane pozycje. Anulowanie pozostałych zachowuje gotowe rendery i dopisuje stan anulowania do tych, które nie zostały skończone.

## Szczegóły propozycji i edytor

Przed montażem adres propozycji pokazuje odtwarzacz surowego zakresu, opis, ocenę z uzasadnieniem oraz checkbox selekcji. Odtwarzacz ma ręczny start, kontrolki, informację „Surowy fragment — bez montażu” i powrót. Nie tworzymy drugiego, konkurencyjnego edytora napisów.

Po utworzeniu rolki ten sam adres otwiera istniejący player, timeline oraz zakładki **Napisy / Kadr / Grafiki / Operator AI / Render**; „Kadr” rozszerza obecny inspector. Nagłówek dodaje kontekst: nazwa projektu, tytuł propozycji, źródłowy zakres oraz „Wróć do propozycji”. Montaż i poprawki korzystają z instrukcji wybranego klienta.

Ustawienia **„Kadr”** w istniejącym inspectorze udostępniają `fit` („Pokaż cały obraz”) i `crop` („Wypełnij pionowy kadr”) oraz ręczne przesunięcie obrazu w poziomie/pionie, z resetem. Dla źródła poziomego domyślny `fit` zachowuje pełną zawartość; dla pionowego domyślne `cover` wypełnia 1080×1920. Przełącznik i przesunięcie aktualizują player przed renderem, działają także klawiaturą i zapisują rewizję. Nie obiecujemy automatycznego śledzenia twarzy w pierwszej wersji. Zmiana kadru również unieważnia aktualność wcześniejszego MP4.

W szczegółach pokazujemy dwa różne konteksty czasu: „W filmie źródłowym: 03:15–04:01” oraz oś wyciętej rolki od `00:00`. Legacy `reel.json` nadal operuje na czasie lokalnego klipu będącego źródłem rolki; `origin.json` zachowuje powiązanie i granice w masterze. Korekta słowa lub przesunięcie grafiki nie może pomylić tych osi. Po montażu odtwarzacz i timeline pokazują oś wynikową według istniejącego mapowania cięć.

Ręczna korekta tekstu jest zawsze łatwa do znalezienia: domyślnie otwarta zakładka „Napisy”, instrukcja „Kliknij słowo, aby poprawić tekst”, automatyczny zapis i czytelny status. Korekta zmienia tekst, słowo-klucz lub akcent, zachowując czasy słów. Błąd zapisu pozostaje widoczny; cofnięcie korzysta z obecnej historii. Operator blokuje ręczną edycję tylko konkretnej rolki, nad którą pracuje, a nie całej listy projektów.

Po każdej zapisanej zmianie, której nie zawiera ostatni MP4:

- Player pokazuje aktualny projekt montażu.
- Nagłówek oraz karta propozycji pokazują **„Wymaga aktualnego renderu”**.
- Główne pobranie aktualnej wersji jest wyłączone; obok jest **„Wyrenderuj aktualną wersję”**.
- Starszy plik pozostaje w historii, z etykietą „Poprzedni render — rewizja 2”; jego pobranie wymaga wyboru właśnie tego pliku.
- Jeżeli trwa render starszej rewizji, pokazujemy „Renderuje wersję sprzed ostatniej zmiany”; jego zakończenie nie nadaje nowej rewizji znaczka „Zmontowane”.

Czat przyjmuje poprawkę do konkretnej rolki i zapisuje kontekst w trwałej historii. Nie zaznacza nowych fragmentów i nie uruchamia montażu innych propozycji. Po poprawce użytkowniczka widzi wynik w playerze oraz stan aktualności MP4. Pobranie nazywa plik czytelnie i wskazuje klienta albo przestrzeń roboczą; domyślnie udostępnia tylko zweryfikowany aktualny render.

## Stany brzegowe i błędy

| Stan | Zachowanie GUI i następna czynność |
|---|---|
| Niepoprawny link | Błąd przy polu, zachowanie pozostałych ustawień; „Przetwarzaj” wyłączone |
| Film niedostępny / wymaga dostępu | Zrozumiały komunikat przy źródle; możliwość podania innego linku albo lokalnego pliku; brak pustego projektu udającego wynik |
| Brak wybranej jakości | Automatycznie najlepsza niższa, trwałe ostrzeżenie z faktyczną jakością, bez dodatkowego potwierdzenia i bez skalowania mastera w górę |
| Przerwany upload | Nazwa pliku i zachowane ustawienia, ponowienie; `.part` nie jest gotowym źródłem |
| Błąd narzędzia, brak programu/modelu/miejsca | Etap, krótka przyczyna i „Ponów”; szczegóły rozwijane, bez sekretów w logu |
| Zero sensownych propozycji | Pełny stan pusty: „Nie znaleziono pełnych fragmentów w tym zakresie”; źródło pozostaje, można zmienić focus lub długość. Brak kart z wymyślonym tekstem |
| Materiał wyczerpany | „Nie znaleziono kolejnych pełnych fragmentów”; zachowanie selekcji i wyników, „Znajdź więcej” nie uruchamia bez końca tej samej analizy |
| Częściowy błąd batcha | Gotowe karty dostępne; liczba błędów i retry tylko nieudanych |
| Restart serwera podczas pracy | Po ponownym odczycie trwałego zadania „Przerwano po restarcie”; „Wznów”/„Ponów” od poprawnego checkpointu. Nie pokazywać stale „W trakcie” dla martwego procesu |
| Brak połączenia z panelem | Baner „Utracono połączenie — ostatni stan…”, brak resetu selekcji; po powrocie odczyt stanu. Awaria połączenia nie oznacza anulowania pracy |
| Zmiana na innym ekranie/operator | Konflikt rewizji, zachowanie wpisanego tekstu i odczyt bieżącej wersji; bez nadpisania nowszego projektu |
| Ręczna poprawka po renderze | Status nieaktualnego MP4 i akcja renderu; starszy plik dostępny jawnie jako archiwalny |

## Responsywność i dostępność

Źródłem tokenów GUI jest [ui/panel.css](../../ui/panel.css), a nie tokeny napisów filmu z `frame.md`. Bez zmiany fontu lub palety istniejącego panelu:

| Token | Wartość obecnego panelu | Rola QuickContent |
|---|---|---|
| `--bg` | `#0b1020` | Tło ekranu |
| `--surface` / `--raised` | `#121a30` / `#182241` | Karty, pola i aktywne powierzchnie |
| `--line` / `--line-strong` | `#243049` / `#33416a` | Obramowania i hover |
| `--text` / `--muted` | `#eef1fb` / `#a3aec6` | Treść i etykiety pomocnicze |
| `--accent` / `--accent-ink` | `#7c8cff` / `#0b1020` | Wybrana opcja i główna akcja |
| `--hot` / `--danger` | `#ff7a2f` / `#ff6b7d` | Uwaga i błąd, zawsze także tekst |
| Font | Lokalny Fustat 200–800 | Interfejs; font klienta wyłącznie w materiale |

QuickContent używa własnych klas `qc-*` i dziedziczy tokeny. Nagłówek 24–28 px, tekst formularza i opisów 16 px/1,5, metadane 13–14 px; żadnych istotnych opisów poniżej 12 px. Skala odstępów 8/12/16/24/32 px. Karty mają zarezerwowane miejsce na miniatury, a video jest ładowane dopiero przy otwarciu/odtworzeniu. Brak autoplay i równoległego odtwarzania wielu kart.

| Szerokość testowa | Układ |
|---|---|
| **375 px** | Jedna kolumna, margines 16 px, nawigacja w otwieranym panelu. Formularz pionowy. Pola min/max mogą być obok siebie tylko gdy etykiety i błędy mieszczą się. Jedna karta w rzędzie. Pasek selekcji dwa wiersze, pełna szerokość głównego przycisku, padding safe-area. W edytorze player nad zakładkami; powrót widoczny |
| **768 px** | Nawigacja zwijana, formularz max 720 px; klient/szablon w dwóch kolumnach. Dwie karty tylko przy zachowaniu co najmniej ~320 px szerokości każdej, inaczej jedna. Pasek selekcji może zawijać tekst. Edytor zachowuje obecny układ poniżej 900 px |
| **1024 px** | Sidebar ok. 216 px, reszta przeznaczona na moduł, dwie karty w rzędzie. Formularz w dwóch kolumnach dla krótkich pól; focus textarea na całą szerokość. Szczegóły propozycji w jednym ekranie, bez poziomego scrolla |
| **1440 px** | Sidebar 248 px, treść z max-width ok. 1200 px i marginesami 24–32 px. Do trzech kart w rzędzie. Istniejący edytor po montażu wraca do playera i inspectora, zamiast wciskać listę kart jako dodatkową czwartą kolumnę |

Całość jest obsługiwana klawiaturą; fokus po zamknięciu modal/panel wraca do przycisku otwierającego. Checkboxy, przyciski, pola i wideo mają widoczne etykiety. Dotykowe cele co najmniej 44×44 px, odstępy między odrębnymi akcjami co najmniej 8 px. Focus korzysta z obecnego `:focus-visible`. Sticky pasek nie zasłania przycisku ani pola z fokusem: przestrzeń na końcu listy, `scroll-padding` i `scroll-margin` uwzględniają jego rzeczywistą wysokość. Przy powiększeniu 200% treść się zawija.

Status etapu jest komunikowany przez `role=status`/`aria-live=polite`, ale logi nie odczytują każdej linii. `progressbar` z `aria-valuenow` występuje wyłącznie przy mierzalnym postępie, z nazwą etapu. Stan wyboru, błędu i ukończenia nie zależy od koloru. Ikony to SVG lub istniejące proste elementy, bez emoji zastępujących etykiety. Obowiązuje `prefers-reduced-motion`; mikroprzejścia 150–200 ms mają wyjaśniać zmianę stanu i nie zmieniają kolejności kart podczas wyboru.

## GUI ↔ API — punkty integracji

Poniższe ścieżki są projektowanym kontraktem QuickContent. Metody i szczegóły payloadów należy utrwalić w schematach przed implementacją obu stron. Nie opisują obecnego API.

| Czynność GUI | Projektowany endpoint |
|---|---|
| Lista/utworzenie projektu i jego ustawienia | `GET/POST /api/quickcontent/projects`, `GET /api/quickcontent/projects/:id` |
| Upload pliku bez obowiązkowego klienta | `POST /api/quickcontent/uploads` — strumieniowo; odpowiedź zawiera identyfikator gotowego uploadu |
| Szablony zgodne z klientem | `GET /api/quickcontent/templates` |
| Start analizy | `POST /api/quickcontent/projects/:id/process` |
| Znajdź kolejne fragmenty | `POST /api/quickcontent/projects/:id/find-more` — dokładnie `{expectedRevision, focus?, duration?}`; odpowiedź `{jobId, analysisRunId}`. Backend deduplikuje przez aktywny job i klucz ustawień, bez dodatkowego pola idempotencji w żądaniu |
| Zapis zaznaczeń | `PUT /api/quickcontent/projects/:id/selection` — zestaw `candidateIds` i `expectedRevision`; idempotentnie |
| Zmontuj zaznaczone | `POST /api/quickcontent/projects/:id/montage` — potwierdzone `candidateIds`, `expectedRevision` i klucz idempotencji |
| Odczyt trwałego zadania | `GET /api/quickcontent/jobs/:jobId` — etap, stan, zdarzenia/cursor, checkpoint, policzone postępy |
| Anulowanie / ponowienie | `POST /api/quickcontent/jobs/:jobId/cancel`, `POST /api/quickcontent/jobs/:jobId/retry` |
| Surowy podgląd | `GET /api/quickcontent/projects/:id/media/proxy` — pełne wspólne MP4 projektu z HTTP Range; GUI odtwarza tylko zakres wybranej propozycji |
| Miniatura propozycji | `GET /api/quickcontent/projects/:id/media/thumbnails/:candidateId` — prawdziwa miniatura przypisana do projektu i propozycji |
| Edycja utworzonej rolki | Obecne `GET/PUT /api/reel/:name`, z kontrolą rewizji i synchronizacją stanu propozycji |
| Czat do utworzonej rolki | Adapter obecnego operatora, zdarzenia przypisane do trwałego zadania QuickContent |
| Aktualny render do pobrania | Zweryfikowana referencja z projektu, przez kontrolowany endpoint pliku; status odpowiada konkretnej rewizji |

Odpowiedź projektu zawiera trwałe ID propozycji, `analysisRunId`, powiązane `reelName` dopiero po utworzeniu rolki, `editRevision`, `renderRevision` oraz dostępność zweryfikowanego pliku. Rewizja całego projektu `revision` jest czym innym niż `editRevision` konkretnej rolki. Mutacje selekcji, szukania dalszych wyników i montażu przesyłają `expectedRevision`; konflikt nie może po cichu nadpisać nowszego stanu. Frontend nie rozpoznaje ukończenia po nazwie MP4 lub ostatnim logu Claude. Klient nie przesyła dowolnej ścieżki dysku ani dowolnego URL do proxy. Proxy jest jednym wspólnym plikiem projektu; GUI ustawia start na `sourceStart`, ogranicza seek do zakresu i zatrzymuje odtwarzanie na `sourceEnd`. HTTP Range dotyczy bajtów pliku i nie zastępuje tych granic czasowych. Zakres filmu nie jest mylony z osią po montażu.

Na początek wystarcza polling wzorowany na obecnym panelu: bieżące zadanie około raz na sekundę, lista projektów rzadziej. Polling kończy się po ukończeniu, ma cleanup po zmianie projektu i backoff przy utracie połączenia. Nowa subskrypcja nie resetuje trwałego wyboru i nie dopisuje powtórnych zdarzeń. SSE/WebSocket, konta wielu użytkowników, automatyczna publikacja oraz nowy edytor wideo nie są wymagane do tego przepływu.

Dla utworzonej rolki z `origin.json` most backendu przekierowuje wszystkie istniejące akcje `/api/job/:name` (montaż/czat/render, status i stop) do trwałego workera QuickContent. Dotyczy to także wejścia przez dawny adres `#<reelname>` i dotychczasowego przycisku Render. Prośba o render na czacie korzysta z tego samego kontrolowanego, wersjonowanego pipeline, a częściowe zmiany operatora po błędzie lub zatrzymaniu również zmieniają rewizję. GUI nie może ominąć tych reguł przez stary edytor.

## Kryteria odbioru GUI

- Wklejenie linku lub upload lokalny, opcjonalny klient, szablon, Auto/focus i min/max prowadzą do jednego projektu; do momentu zaznaczenia i montażu nie powstają gotowe zmontowane rolki.
- Wyniki przedstawiają surowe, kompletne fragmenty, opis, typ i wyjaśnioną ocenę. Dane w realnym panelu pochodzą z procesu, nigdy z tej makiety.
- Odświeżenie, powrót, sortowanie i „Znajdź więcej” zachowują selection, opis oraz poprawki istniejących propozycji.
- Batch montuje dokładnie potwierdzone propozycje, raportuje `X/Y` i procent ukończonych aktualnych renderów względem wybranego zestawu, prawdziwe etapy AI z `progress: null` oraz odrębny zmierzony render%. Obsługuje częściowy błąd, retry i restart.
- Po montażu można wejść do istniejącego edytora, poprawić tekst bez zmiany czasów, dopasować kadr `fit/crop` i przesunięcie, użyć czatu, wrócić do projektu i pobrać aktualny wynik 1080×1920.
- Poprawka unieważnia aktualność starszego MP4; render poprzedniej rewizji nie przywraca nieprawdziwego statusu „Zmontowane”.
- Zero wyników i wyczerpanie materiału są pełnoprawnymi stanami; nie dodają fikcyjnych propozycji.
- Scenariusz działa z klawiaturą, przy 200% powiększeniu i w widokach 375/768/1024/1440 px; sticky UI nie zasłania fokusu i akcje nie wymagają hover.

## Podstawa projektowania

Specyfikacja wynika z obecnych `ui/App.tsx`, `ui/Dialogs.tsx`, `ui/Inspector.tsx`, `ui/api.ts`, `ui/server.mjs`, `ui/panel.css` i `PANEL.md`. Wykorzystuje Ponytail: istniejący player, edytor, klient, operator i tokeny zamiast nowych odpowiedników.

Zastosowano UI/UX Pro Max do wyszukania zasad widocznego fokusu, niezaciemniania go przez sticky UI oraz porządkowania efektów React. Dwa zapytania o pełny system wizualny zwróciły układy marketingowe, więc nie uznano ich palety, fontów ani hero za trafne dla tego modułu; zastosowano obecne tokeny repo i ogólne zasady dostępności skilla. Plik jest specyfikacją: makiety nie zostały uruchomione w przeglądarce i nie stanowią dowodu działającego GUI.
