# Panel brandingu klientów — research

Data: 2026-10-17. Dokument zachowuje ustalenia researchu. Kod panelu i integracji jest już dostępny; rzeczywiste dowody i pozostałe ograniczenia opisuje [odbiór](acceptance.md).

## Rekomendacja

Osobny moduł „Branding klientów” w istniejącym panelu React/Vite. Dane lokalne, współdzielone przez zwykłe rolki i QuickContent. Formularz zapisuje profil, a Remotion interpretuje sprawdzone ustawienia; agent nie generuje kodu stylu z treści strony. Nie potrzeba nowego serwisu SaaS ani nowego płatnego API.

Dokładny zakres, model danych, etapy i odbiór: [specyfikacja](../superpowers/specs/2026-10-17-client-branding-design.md).

## Co już istnieje w repo

| Obszar | Stan i konsekwencja |
|---|---|
| Klienci | `ui/server.mjs`: `newClient()` tworzy katalog i PREFERENCJE.md; `library()` odczytuje listę. Rozszerzyć, bez drugiego rejestru tożsamości klientów. |
| Materiały | `ui/upload.mjs` obsługuje surowe/przebitki, bez nadpisania i z publikacją ukończonego pliku. Reużywać wzorca; brakuje kategorii logo/zdjęcie/font, limitów i walidacji zawartości pod te typy. |
| Wygląd | `src/Reel.tsx`: zamknięty rejestr ośmiu stylów. `src/styles/*` mają własne tokeny i zachowania. Sama zmiana JSON klienta nie zmieni dziś fontu i animacji tych stylów. |
| Fonty | `src/fonts.ts`: stała lista plików i ładowanie FontFace. Potrzebny dynamiczny manifest fontów profilu, oczekiwanie przed pomiarem i renderem oraz błąd zamiast cichej podmiany wybranego fontu. |
| QuickContent | `src/quickcontent/templates.json` to statyczny katalog. `scripts/quickcontent-store.mjs` sprawdza pliki stylu i zapisuje `templateSnapshot` z preferencjami i hashem stylu. Nowy klient nie dostaje automatycznie szablonu. |
| Zgodność snapshotu | `scripts/quickcontent-adapter.mjs` zapisuje hash snapshotu. To dobry punkt integracji wersji profilu; nie jest pełnym archiwum dawnego kodu silnika. |
| Aktualność renderów | `scripts/quickcontent-render.mjs` hashuje m.in. całe `public/fonts` i `public/Brandings`. Dodanie cudzych plików może unieważniać niezwiązane rendery. Wymagany dokładny wykaz użytych zasobów dla nowych profili i test izolacji. |
| Nawigacja | `ui/panel-navigation.mjs`, `ui/page-route.mjs`, `ui/App.tsx`. Dodać przestrzeń `#branding`, żeby adres nie został uznany za nazwę rolki. |
| UI | `ui/panel.css`: jasny panel, Fustat, niebieskie akcje i wspólne tokeny. Rozszerzyć ten język; kolory klienta stosować w podglądzie, nie w całej aplikacji. |

Repo ma wiele wcześniejszych niezacommitowanych zmian. Research ich nie cofa. Stan planów w AGENTS.md nie wystarcza do określenia implementacji: na dysku są już także moduły LongForm, ale ten zakres nie wymaga ich zmiany.

## Fonty: lokalne, upload i Google Fonts

### Lokalne — dwie możliwe drogi

**Przez przeglądarkę:** `queryLocalFonts()` udostępnia rodziny, odmiany i dane binarne przez `FontData.blob()`, ale ma ograniczoną zgodność i wymaga uprawnienia. Nie nadaje się jako jedyny fundament automatycznej listy fontów w dowolnej przeglądarce. [MDN: Local Font Access](https://developer.mozilla.org/en-US/docs/Web/API/Local_Font_Access_API).

**Przez lokalny backend Maca — rekomendowane dla tej aplikacji:** mały helper CoreText zwraca dostępne fonty oraz metadane wskazanego pliku. CoreText ma kolekcję dostępnych fontów i atrybut URL. W panelu widać rodzinę/odmianę; backend używa niejawnego identyfikatora, nie przyjmuje dowolnej ścieżki z UI. To propozycja architektury, wymagająca spike'a na docelowym Macu. [Apple: kolekcja fontów](https://developer.apple.com/documentation/coretext/ctfontcollectioncreatefromavailablefonts(_:)), [atrybuty](https://developer.apple.com/documentation/coretext/font-attributes).

Po wyborze font kopiowany/importowany do lokalnych zasobów profilu. Jeśli plik jest niedostępny albo format nieobsługiwany (np. kolekcja TTC bez ekstrakcji), pokazać to i zaoferować upload. Nie wyświetlać niedziałającego „wybranego” fontu. Systemowy dostęp nie oznacza automatycznie prawa do pakowania pliku — nie pobierać komercyjnych fontów z przypadkowych stron. Nie oferować Times New Roman, zgodnie z preferencjami projektu.

### Google Fonts

Są dwa rozsądne warianty:

- Developer API: gotowe metadane rodzin, odmian, skryptów i plików; wymaga klucza. [Dokumentacja Google](https://developers.google.com/fonts/docs/developer_api).
- Oficjalne repo `google/fonts`: pliki rodzin, `METADATA.pb` i licencje. **Rekomendacja bez nowego klucza:** lokalny, wersjonowany indeks nazw do ścieżek z tego repo, aktualizowany jawnie i cache'owany. Pobranie dopiero wybranej rodziny/odmian, po dokładnym dopasowaniu nazwy. Nie klonować całego repo i nie pobierać całej biblioteki. [Repo Google](https://github.com/google/fonts/blob/main/README.md), [metadane](https://googlefonts.github.io/gf-guide/metadata.html).

Pobranie po wpisaniu nazwy oznacza znalezienie w katalogu, a nie zgadywanie URL i pliku przez AI. Brak rodziny: komunikat i upload; bez pozorowanego sukcesu. Przechowywać źródło, konkretną rewizję, hash oraz licencję obok fontu. Zweryfikować polskie znaki „Zażółć gęślą jaźń”, faktyczne wagi, kursywę i osie variable font. Katalog offline korzysta z cache; import niezapisanego pliku wymaga sieci.

### Remotion

W obu odtwarzaczach i renderze ładować te same, lokalne pliki. Można rozwinąć obecny FontFace zamiast dodawać zależność. Blokada renderu obowiązuje przed pomiarem napisów i pierwszą klatką; błędy wybranego pliku są jawne. [Oficjalna dokumentacja Remotion](https://www.remotion.dev/docs/fonts).

## Skan strony — wygląd i wiedza to dwa różne wyniki

1. Użytkowniczka podaje publiczny URL i uruchamia „Przeanalizuj stronę”. Proponowany budżet: strona główna i do czterech podstron tej samej domeny, bez logowania i obchodzenia blokad.
2. Treść: tytuł, opis, nagłówki, widoczny tekst, podstawowe dane produktów/usług. Każda informacja ma adres źródła, czas i fragment dowodowy. Z samej nazwy marki agent nie dopisuje faktów.
3. Wygląd: z wyrenderowanej strony próbki kolorów i deklaracji fontów nagłówka, treści i przycisków, kandydaci logo i screenshot. Same regexy HTML nie wystarczą do stron opartych na JavaScript. `getComputedStyle()` daje wartości po zastosowaniu CSS, ale lista `font-family` nie dowodzi jeszcze, który plik faktycznie wyrenderował znak. [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle), [Playwright: środowisko strony](https://playwright.dev/docs/evaluating).
4. Normalizacja oddziela kolory marki od banera cookies, zdjęć i bieli/czerni; wynik to propozycje 4–6 kolorów z rolami, nie zrzut wszystkich znalezionych wartości.
5. Obecny operator Codex/Claude przez konto porządkuje wynik w walidowany JSON. Brak konta/limitu = błąd i retry, bez płatnego fallbacku. Pobranie i analiza deterministyczna nie wymagają LLM.
6. Panel pokazuje „Znalezione na stronie” obok ręcznych ustawień. Dopiero „Zastosuj zaznaczone” zmienia draft. Ponowny skan nie nadpisuje ręcznych pól; przerwany skan nie usuwa profilu.

Silnik skanowania działa w osobnym kontekście bez profilu i cookies użytkowniczki. Preferować już dostępne Chromium Remotion po spike'u jego API; jeżeli nie pozwoli niezawodnie pobrać potrzebnych danych, jedną uzasadnioną zależnością jest Playwright. Narzędzie przeglądarkowe tego czatu służy do weryfikacji, nie jest zależnością aplikacji.

Nie importować automatycznie fontów, zdjęć ani filmów z cudzej witryny. Wskazanie znalezionych zasobów nie jest zgodą na ich użycie. Własny upload pozostaje podstawą biblioteki klienta.

## Granice techniczne do uwzględnienia od początku

- URL skanera: tylko HTTP(S), bez poświadczeń; blokada localhost, sieci prywatnych i link-local, także IPv6, po DNS i po każdym redirect. Walidacja wszystkich zasobów i żądań przeglądarki, w tym ramek, workerów i websocketów; limit czasu, rozmiaru i liczby zasobów. Sama kontrola URL wejściowego nie wystarcza. [OWASP SSRF](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).
- Dane strony są niezaufanymi danymi, nie instrukcjami operatora. Odpowiedź AI nie może wskazywać komend, ścieżek docelowych ani kodu JSX/CSS.
- Upload sprawdza zawartość, nie tylko rozszerzenie; limity po stronie strumienia; bez nadpisania. SVG tylko po bezpiecznej rasteryzacji/oczyszczeniu; MP4/MOV/WebM przez ffprobe, fonty przez parser; błędny plik usuwa się z tymczasowego obszaru.
- Pełne informacje klienta i wyniki skanowania poza `public/`. Do `public/Brandings` tylko jawnie wybrane pliki do renderowania; backend pozostaje na 127.0.0.1.
- Profile wersjonowane, zapis atomowy i kontrola rewizji. Render odczytuje zamrożone ustawienia i użyte pliki, nigdy zmienny profil w trakcie pracy.

## Co sprawdzono, a co wymaga spike'a

Sprawdzono kod wymienionych integracji i oficjalne źródła powyżej. Panel na `http://127.0.0.1:3100/panel` został otwarty i odczytany przez przeglądarkę w tej karcie. Port zajmował już działający Vite; druga próba uruchomienia zakończyła się bez jego wyłączania.

Nie wdrożono formularza ani skanera. Nie wykonano realnego importu fontu, eksportu CoreText, skanu strony klienta ani renderu z nowym profilem. Potwierdzenie tych rzeczy jest częścią etapu B0 i odbioru, nie wynikiem samego researchu.
