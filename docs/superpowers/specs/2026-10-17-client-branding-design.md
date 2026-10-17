# Branding klientów — projekt funkcji

Data: 2026-10-17. Stan: kod dostępny, odbiór całości pozostaje otwarty; [dowody i ograniczenia](../../branding/acceptance.md). [Research i źródła](../../branding/research.md).

Przegląd niezależnego agenta (2026-10-17): brak istotnych pytań blokujących przygotowanie planu; niewiadome techniczne przypisane do B0. Użytkowniczka potwierdziła wspólny profil zwykłych rolek i QuickContent oraz zachowanie wcześniejszych wersji wyglądu.

## Cel i ustalenia

Użytkowniczka tworzy klienta, dodaje jego materiały i wiedzę, ustawia wygląd napisów i od razu widzi rezultat. Profil działa lokalnie w obecnym React/Vite i Remotion. Materiały nie są wysyłane do nowego serwisu. Analiza przez obecnego operatora na koncie, bez automatycznego płatnego API.

Wprost z briefu: osobny panel, logo/zdjęcia/przebitki z opisami, analiza strony, paleta z limitem 4–6 kolorów, lokalne fonty/upload/Google Fonts, style napisów, podkreślenia, emotki i własne informacje.

Proponowane decyzje wykonawcze: wspólny profil dla zwykłych rolek i QuickContent; limit palety wybierany jako 4, 5 albo 6 (wolno zapisać mniej); jedna podstawowa i opcjonalnie druga rodzina fontu do wyróżnień; wersje profilu stosowane do nowych montaży; stare projekty zachowują swój snapshot. LongForm/Motion Studio nie są rozszerzane w tym wdrożeniu. Obecnych klientów i stylów nie migrujemy automatycznie.

## Ekran i działanie

Tryb Impeccable: **Operate**. Rozszerzenie istniejącego jasnego panelu, Fustat i niebieskich kontrolek. Nie projektujemy landingu. Design Taste wyklucza app screens: nie stosujemy tu wymogu wielu zdjęć, dużego hero ani animacji sekcji marketingowych. UI/UX Pro Max: semantyczne tokeny i jawne stany pól; brak zależności od shadcn/Tailwind, jeżeli istniejące komponenty wystarczą.

Nowa pozycja nawigacji **Branding klientów** → lista z wyszukiwaniem → **Dodaj klienta** / otwarcie istniejącego. Adresy `/panel#branding` i `/panel#branding/<clientId>` z poprawnym Wstecz i odświeżeniem. Utworzenie klienta reużywa obecnej tożsamości; nie tworzy drugiego klienta pod istniejącą nazwą.

Edytor: po lewej sekcje i formularz, po prawej podgląd 9:16. Na węższym ekranie podgląd jako osobna zakładka. Stała akcja **Zapisz branding**, stan zmian i walidacja przy polu; błędy nie kasują draftu. Brak ukrytych zapisów na każdej zmianie suwaka. Wyjście z niezapisanym draftem wymaga wyboru zapisu albo odrzucenia.

| Sekcja | Zawartość i zachowanie |
|---|---|
| Marka i wiedza | Nazwa, strona, opis działalności, odbiorcy, ton, własne informacje. Przycisk analizy; źródła i kandydaci do zastosowania. Własne informacje są zwykłym tekstem; agent nie wykonuje zawartych tam komend. |
| Materiały | Osobne typy logo, zdjęcie, przebitka. Upload wielu plików, miniatura/poster, oryginalna nazwa, rozmiar, opis, oznaczenie preferowanego logo i zasad użycia. Usunięcie z bieżącego profilu nie niszczy zasobu używanego przez dawny snapshot. |
| Kolory | Limit 4/5/6, próbki, picker i HEX. Role: akcent, tekst, tło, wyróżnienie oraz opcjonalne drugorzędne. Nie trzeba wypełniać wszystkich slotów. Błąd siódmego koloru także po stronie serwera. |
| Fonty | Wyszukiwarka z zakładkami „Na komputerze”, „Google Fonts”, „Własne pliki”. Podgląd polskich znaków i wag. Pobranie po dokładnej nazwie; nieznana nazwa nie uruchamia poszukiwania komercyjnego fontu w internecie. |
| Napisy | Przykłady odtwarzane na tej samej próbce: Zwykłe, Kinetic, Pop-out. Osobno wyróżnienie słów: brak/kolor/podkreślenie; emotki włącz/wyłącz; pozycja, wielkość i czytelny podgląd bezpiecznej strefy. Wszystkie widoczne opcje muszą mieć implementację w renderze. |

Podgląd używa **tego samego komponentu Remotion co wynik**, z draftem ustawień, a nie osobnej imitacji CSS. Domyślna próbka to jawnie przykładowe napisy na neutralnym tle; użytkowniczka może wskazać własny klip. Żadnych cudzych filmów jako automatycznych demo. Odtwarzanie i restart pozwalają ocenić ruch; prefers-reduced-motion ogranicza ruch panelu, nie zmienia wybranego efektu w pliku filmu.

Logo ma przełącznik użycia w rolce; sam upload nie oznacza obowiązkowego watermarka. Zdjęcia i przebitki są dostępne dla operatora, nie są losowo wstawiane do każdego filmu. Ich opisy informują o treści i dozwolonym kontekście.

## Kontrakt danych i zgodność

Nowy, walidowany schemat profilu zamiast wyciągania parametrów renderu z Markdown:

```text
schemaVersion, clientId, revision, updatedAt
name, websiteUrl, businessDescription, audience, tone, notes
palette: { maxColors: 4|5|6, colors: [{ id, hex, role }] }
fonts: { primary: FontRef, emphasis?: FontRef }
captions: { presetId, emphasis: none|color|underline, emojiEnabled,
            size, position }
logo: { assetId?, enabled, position, size }
assets: [{ id, kind, path, originalName, description, mime, bytes, sha256 }]
websiteResearch: { lastScanId?, acceptedFields, sourceRefs }
```

`FontRef` ma rodzinę, odmianę/wagę/osie, lokalny plik, hash, źródło i plik licencji, gdy dostępny. Nie zapisujemy wyłącznie `font-family`. Parametry rozmiaru/pozycji mają skończone zakresy i ograniczenia safe zone. Brak drugiego fontu dziedziczy pierwszy. Serwer kontroluje referencje zasobów należących do klienta.

Proponowane miejsca danych:

```text
klienci/<id>/branding/profile.json
klienci/<id>/branding/versions/vNNN.json
klienci/<id>/branding/research/<scanId>.json
public/Brandings/<id>/assets/<hash>.<ext>
public/Brandings/<id>/fonts/<hash>.<ext>
```

Istniejące ścieżki klientów zachować. Nazwy plików bazują na zweryfikowanym hashu; plik raz użyty przez wersję jest niezmienny. Snapshot w nowym `reel.json` zawiera wersję i pełne ustawienia oraz wykaz użytych zasobów; renderer nie pobiera najnowszego profilu. Wiedza i pełny research zostają po stronie backendu, nie w publicznym snapshotcie.

`PREFERENCJE.md` pozostaje źródłem specjalnych reguł montażowych klienta. Nie nadpisujemy go formularzem. Operator dostaje osobno ręczne reguły i zatwierdzone dane profilu. Konflikt między ręczną regułą a formularzem musi być widoczny przed użyciem: ręczna reguła ma pierwszeństwo, pole nie może udawać skutecznego ustawienia. Dla istniejącego klienta nowe opcje działają po jawnym wybraniu nowego konfigurowalnego szablonu; stary styl zachowuje dotychczasowe zachowanie i etykietę.

Konfigurowalny styl `brand` obsługuje trzy początkowe presety. Nie przerabiać naraz ośmiu stylów ani udawać, że wspierają dowolny font/podkreślenie. Nowe presety później dopisuje się do sprawdzanego rejestru z opisem możliwości. Nie generować plików TSX na żądanie użytkownika/strony.

QuickContent: rozszerzyć statyczny katalog o zapisane profile z jawnym `styleId: brand`, gotowością fontów i wersją. Utworzenie projektu zamraża zatwierdzoną wersję, ponowne przetwarzanie/retry ją zachowuje. Nie uruchamiać płatnej redakcji dla samej zmiany kolorów/fontów/efektu; jawne zastosowanie nowej wersji do starego projektu unieważnia właściwy render i uruchamia tylko niezbędne etapy. Emotki zależne od znaczenia wymagają przygotowania planu, samo ich ukrycie nie wymaga LLM.

Hashowanie renderu: nowe profile uwzględniają tylko wykorzystane pliki i zamrożone parametry; nie globalny katalog wszystkich klientów. Migrację dotychczasowego algorytmu traktować osobno, z dowodami zachowania aktualnych renderów. Zmiana zasobu klienta A nie może oznaczać nieaktualności projektu klienta B.

Zapis profilu jest atomowy i wymaga aktualnej rewizji, analogicznie do edytora QC. Konflikt 409 zachowuje draft. Opublikowanie wersji następuje dopiero po zapisaniu i sprawdzeniu wszystkich referencji; błąd uploadu nie zostawia gotowej wersji z brakującym fontem.

## Skanowanie i stany

Research zawiera mechanizm i zabezpieczenia. Skan jest trwałym zadaniem z etapami: pobieranie, odczyt wyglądu, analiza treści, gotowe do przejrzenia. Bez zmyślonych procentów i czasu. Retry reużywa ukończony odczyt, gdy wejście się nie zmieniło; ponowne pobranie wymaga jawnego odświeżenia.

Obsłużyć: pusta marka; częściowo uzupełniony profil; niezapisany draft; konflikt zapisu; brak sieci/katalogu Google; odmowa dostępu do fontów; font niedostępny/uszkodzony; brak polskich znaków; nieobsługiwany format; przerwany upload; strona blokująca skan; błąd/limit operatora; niepełny wynik strony; anulowanie i restart. Niepełny profil można zapisać jako draft, ale użycie do montażu wymaga sprawdzonego presetu i wszystkich wybranych zasobów.

## Proponowana kolejność wdrożenia

| Etap | Zmiana i dowód |
|---|---|
| B0 — spike | CoreText na Macu; import jednego lokalnego, własnego i Google fontu; odczyt HTML oraz strony JS w izolacji; test rzeczywistej klatki Remotion. Ustalić runtime skanera na podstawie wyniku. |
| B1 — profil i materiały | Schemat Zod, wersjonowanie, atomowy zapis/revision, uploady, walidacja i uprawnienia zasobów. Testy błędnego pliku, ścieżek, konkurencji i przerwania. |
| B2 — renderer | Styl `brand`, fonty z manifestu, trzy presety, podkreślenia i emotki, logo, snapshot i podpis zależności. Klatki i krótki render porównane z Playerem. |
| B3 — panel | Lista/edycja klientów, sekcje, podgląd Remotion, paleta, fonty, zapis i stany. Desktop/mobile, klawiatura, focus, etykiety, bez utraty draftu. |
| B4 — strona i wiedza | Trwały skan, izolacja żądań, źródła, operator konta i selektywne zastosowanie danych. Realna witryna statyczna/JS oraz odmowa dostępu. |
| B5 — integracja i odbiór | Wybór profilu w Nowej rolce i QC, zachowanie starych stylów i renderów, wznowienie jobów. `npm test`, `npm run lint`, build panelu, pełne dwa montaże i render bez sieci po zapisaniu zasobów. |

Przewidywane miejsca zmian (sprawdzić bieżący diff przed wdrożeniem): nowe moduły `ui/Branding.tsx`, `ui/branding*.mjs`, `ui/branding.css`, `src/branding/*`, `src/styles/brand.tsx`, helper CoreText i testy; integracje w `ui/App.tsx`, nawigacji, `ui/server.mjs`, `ui/api.ts`, `ui/Dialogs.tsx`, `src/Reel.tsx`, ładowaniu fontów oraz store/adapter/render/AI QuickContent i zwykłym prep/operatorze. Nie używać ogólnego endpointu zapisu dowolnego pliku.

## Kryteria odbioru

- Nowego klienta da się skonfigurować bez edycji plików i po odświeżeniu odczytać identyczne dane.
- Każda widoczna opcja napisów faktycznie działa w krótkim MP4 i podglądzie; polskie znaki i safe zone są poprawne. Timingi słów nie zmieniają się wskutek zmiany wyglądu.
- Font z każdego źródła ma rzeczywisty plik i jawny błąd przy braku; po imporcie render działa bez internetu.
- Paleta respektuje wybrany limit także w API; nie wymusza wykorzystania wszystkich kolorów.
- Skan pokazuje źródła i nie nadpisuje ręcznych danych; zewnętrzna treść nie steruje narzędziami ani ścieżkami.
- Zapis nowej wersji nie zmienia istniejącego projektu; retry renderuje jego snapshot; inne marki nie tracą aktualności po uploadzie.
- Zwykła rolka i wybrana propozycja QC korzystają z tego samego profilu. Wcześniejsze style i szczególne reguły SkyClass/Bisanz pozostają sprawdzone regresyjnie.
- Pliki, wiedza i historia klienta nie trafiają do git; błędy mają komunikaty po polsku i możliwość ponowienia bez kasowania pracy.

## Potwierdzenie i decyzje wykonawcze

Potwierdzone przez użytkowniczkę: wspólny profil zwykłych rolek i QuickContent oraz stare montaże z własną wersją. Limit palety wybierany 4/5/6 i odrębny konfigurowalny szablon są propozycjami wykonawczymi zgodnymi z briefem. Pozostałe wybory techniczne powyżej również są propozycją wykonawczą, nie osobno potwierdzonym wymaganiem użytkowniczki.
