# QuickContent — research OpusClip

Data weryfikacji: **2026-10-14**. Zakres: oficjalna dokumentacja `help.opus.pro` i materiały `opus.pro`. Ten dokument jest załącznikiem do założeń funkcji i planu wdrożenia; nie opisuje działającej implementacji QuickContent.

## Potwierdzone funkcje OpusClip

| Obszar | Ustalenie | Bezpośrednie źródło |
|---|---|---|
| Źródło filmu | Import z linku YouTube oraz pliku lokalnego. Link musi być publiczny lub niepubliczny; film prywatny jest niedostępny. Dokumentacja podaje limit lokalnego uploadu 30 GB dla Pro. | [Video Sources Supported](https://help.opus.pro/docs/article/video-sources-supported) |
| Formularz analizy | Wybór modelu, opcjonalnego gatunku i promptu przed rozpoczęciem. ClipAnything przyjmuje opis naturalnym językiem dotyczący scen, emocji i tematów. ClipBasic używa słów kluczowych obecnych w wypowiedzi/transkrypcji. | [How to use ClipAnything](https://help.opus.pro/docs/article/how-to-use-clipanything), [Use Prompts](https://help.opus.pro/docs/article/select-keywords) |
| Preferowana długość | Oficjalny schemat API wymienia zakresy **0–30, 30–60, 60–90 i 90–180 s**, domyślnie 0–90 s. Potwierdza zakres docelowy, a nie gwarancję dokładnej długości klipu. | [Curation preferences](https://help.opus.pro/api-reference/schemas/curation-preferences) |
| Ponowna analiza | Na stronie wyników można wpisać nowy prompt i wygenerować kolejne klipy, dostępne w osobnej zakładce. Dokumentacja potwierdza reprompt w ClipAnything i ClipBasic, jeden prompt naraz. | [Reprompt and regenerate](https://help.opus.pro/docs/article/clipanything-qa-9) |
| Wyniki | Wygenerowane tytuły i opisy, transkrypcje, ocena, edytor i eksport. Dostępne sortowanie według oceny lub czasu w źródle oraz polubienie/odrzucenie klipu. | [Result Page Walkthrough](https://help.opus.pro/docs/article/get-clips-faq-1) |
| Ocena | Virality Score ma skalę 0–99. Dokumentacja opisuje ocenę hooka, logicznego przebiegu i zakończenia, wartości/emocji oraz trendów; przy ClipAnything również zgodności z promptem. Funkcja jest dostępna w Starter/Pro. | [Virality Score](https://help.opus.pro/docs/article/virality-score) |
| Branding | Szablony obejmują kolory, fonty, logo/CTA, napisy, pozycje, animacje, layout i intro/outro. Wygląd można podglądać, a szablon wybrać w procesie importu. | [Brand Template](https://help.opus.pro/docs/article/how-to-add-a-brand-template) |
| Edytor | Poprawianie słów/zdań transkrypcji, usuwanie samych napisów albo napisów z wideo, przycinanie na timeline i dodawanie fragmentów z pełnej transkrypcji. Dokumentacja mówi o braku zbiorczej edycji napisów wielu klipów. | [Change or Remove Captions](https://help.opus.pro/docs/article/change-captions) |
| Obraz i kadrowanie | ClipAnything deklaruje analizę sygnałów wizualnych, audio i emocji. Reframe Anything śledzi ważne obiekty i akcje oraz kadruje do 9:16, 1:1 lub 16:9. To deklaracja produktu, a nie niezależny benchmark jakości. | [What is ClipAnything](https://help.opus.pro/docs/article/9947095-clip-anything) |
| Proces asynchroniczny | Schemat API projektu udostępnia etapy `PENDING`, `QUEUED`, `IMPORT`, `CURATE`, `REFINE`, `RENDER`, `UPLOAD`, `COMPLETE`, `STALLED`. | [Project representation](https://help.opus.pro/api-reference/schemas/project-representation) |
| Eksport 4K | Eksport 4K wymaga rzeczywistego źródła 4K; funkcja nie jest podnoszeniem rozdzielczości. Pobranie jest dostępne z wyników, szczegółów klipu, zbiorczego eksportu i edytora. | [Download and Post in 4K](https://help.opus.pro/docs/article/download-and-post-in-4k) |

### Liczba propozycji w OpusClip

Dokumentacja uzależnia liczbę od długości źródła i modelu. Podaje orientacyjne przedziały:

| Długość źródła | Liczba klipów według dokumentacji |
|---|---:|
| 0–3 min | 1–2 |
| 3–10 min | 3–14 |
| 10–30 min | 5–21 |
| 30–60 min | 23–32 |
| 60–120 min | 32–42 |
| Ponad 120 min | 42–55 |

To wartości opisujące OpusClip, **nie zobowiązanie ilościowe QuickContent**. W naszym produkcie liczba wyników musi zależeć od jakości, kompletności i różnorodności materiału. Źródło: [How Many Clips Can I Get?](https://help.opus.pro/docs/article/how-many-clips).

## Wymagania QuickContent pochodzące od użytkowniczki

Poniższe wymagania należy wdrożyć jako własny kontrakt QuickContent. Nie ma podstaw, by opisywać je jako wierną kopię potwierdzonego zachowania OpusClip:

1. Osobne pobranie obrazu 1080p/4K i najlepszego dostępnego audio, pobranie tytułu, następnie scalenie przez FFmpeg i zapis lokalnego mastera w przestrzeni klienta albo przestrzeni roboczej.
2. Dwa odrębne etapy: **propozycje fragmentów i podglądy → zaznaczenie przez użytkowniczkę → montaż wybranych rolek** według szablonu i preferencji klienta.
3. Przycisk **„Znajdź więcej”**, który zachowuje dotychczasowe wyniki, unika duplikatów i zgłasza, że nie znalazł już kolejnych sensownych historii.
4. Maksymalna sensowna liczba propozycji: samodzielny przekaz od początku do zakończenia, bez urwania kontekstu dla sztywnego czasu lub założonej liczby wyników.
5. Każda propozycja ma opis tematu, charakter wypowiedzi, uzasadnienie oceny i ewentualne ryzyko braku kontekstu, np. „mocne zdanie o…”.
6. Postęp montażu, licznik **„zmontowane X/Y”**, mierzalny procent, status **„Zmontowane”** na konkretnej propozycji i zachowanie wyniku po ponownym otwarciu panelu.
7. Wejście w rolkę, podgląd, poprawa transkrypcji, chat do poprawek, pobranie oraz rozróżnienie wersji przed i po zmianach.

OpusClip opisuje generowanie klipów z ustawieniami marki już w pierwszym przetwarzaniu; jego ogólny przepływ nie potwierdza wymaganej przez użytkowniczkę bramki selekcji przed montażem. Źródła: [How to use ClipAnything](https://help.opus.pro/docs/article/how-to-use-clipanything), [Brand Template](https://help.opus.pro/docs/article/how-to-add-a-brand-template), [Result Page Walkthrough](https://help.opus.pro/docs/article/get-clips-faq-1).

## Braki potwierdzenia i granice researchu

- Nie znaleziono w sprawdzonej oficjalnej dokumentacji potwierdzenia **chatu do poprawek konkretnego klipu** w edytorze OpusClip. Nie oznacza to dowodu nieistnienia funkcji; do planu należy wpisać ją jako wymaganie QuickContent.
- API potwierdza etapy pracy, ale sprawdzone materiały nie potwierdzają konkretnego sposobu prezentacji **procentu i licznika montowanych klipów w GUI**. Nie kopiować domniemanych wartości procentowych.
- Dokumentacja opisuje kryteria Virality Score, lecz nie potwierdza, że GUI pokazuje **pełne tekstowe uzasadnienie każdego składnika oceny**. QuickContent ma dostarczać własne uzasadnienia.
- Reprompt jest potwierdzony; nie potwierdzono kontraktu **„Znajdź więcej” bez duplikatów i z zachowaniem zatwierdzonych wyników**.
- Oficjalna strona [Select your Clip Length](https://help.opus.pro/docs/article/select-clip-length) była dostępna jako strona, ale bez treści artykułu podczas tej weryfikacji. Zakresy czasu podano z oficjalnego schematu API; nie uznawać ich za potwierdzenie identycznej zawartości aktualnego selektora GUI.
- Nie zweryfikowano własnego mechanizmu pobierania audio/wideo używanego wewnętrznie przez OpusClip. Sekwencja download → FFmpeg → zapis mastera jest wymaganiem naszego systemu.
- Research obejmuje publiczną dokumentację, bez przeglądu zalogowanego konta produktu i bez niezależnego testu jakości selekcji.

## Wnioski dla planu

- Zachować znany schemat obsługi: **źródło → klient/szablon → Auto albo temat → długość → przetwarzanie w tle → biblioteka fragmentów → edycja/eksport**.
- Dodać jawną selekcję przed montażem, zgodnie z wymaganiem użytkowniczki. Pierwsze wyniki są kandydatami i podglądami, nie gotowymi rolkami z animacjami.
- Oddzielić transkrypcję od analizy redakcyjnej: Whisper dostarcza tekst i czasy, a osobny moduł odpowiada za wyszukiwanie, kompletność historii, ocenę i opisy. Jest to wniosek projektowy, nie opis architektury OpusClip.
- Kadrowanie poziomego wideo do pionu jest osobnym zadaniem, szczególnie dla rozmów wielu osób. Nie utożsamiać poprawnej transkrypcji z poprawnym kadrowaniem lub analizą wizualną.
- Ocena QuickContent powinna być jawną wskazówką redakcyjną. Bez własnych danych o wynikach publikacji nie przedstawiać jej jako statystycznej prognozy wyświetleń.
