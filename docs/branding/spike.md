# Branding — dowody B0 (2026-10-17)

Stan: częściowy spike i działające moduły danych/importu; ten dokument nie potwierdza odbioru całej funkcji. Integrację panelu, skaner i klatki Remotion dokumentuje odbiór funkcji.

## Fonty macOS

Helper `scripts/branding-fonts.swift` używa CoreText: `list`, `resolve <postScriptName>`, `inspect <backend-file>`. Backend wykonuje `swift -module-cache-path /tmp/montage-branding-swift ...`, ponieważ domyślny cache kompilatora w katalogu użytkowniczki jest poza sandboxem. `listFonts` usuwa ścieżkę systemową przed odpowiedzią HTTP. ID rozwiązywane są wyłącznie we własnym katalogu CoreText, nigdy jako ścieżka z żądania.

Potwierdzone rzeczywistymi wywołaniami:

- Font użytkowniczki `Ubuntu Light` z katalogu `Library/Fonts`: odczyt rodziny Ubuntu, odmiany normal, wagi 300 i komplet polskich glifów.
- Systemowa Helvetica: katalog zwraca TTC; UI otrzymuje `importable:false` i opis wymagający osobnego TTF/OTF. Kolekcja nie jest kopiowana ani wybierana przez cichy fallback.
- Własny Poppins Regular: import do katalogu tymczasowego dał prawdziwy TTF o SHA256 `707fdc5c8bab57a90061c6a8ed7b70d5ffb82fc810e994e79f90bace890c255a`. Nie instalowano fontu w systemie.
- Test Poppins Medium sprawdza rodzinę Poppins, wagę 500 oraz zapis pliku; Zapf Dingbats jest odrzucany za brak polskich glifów. Sprawdzany zestaw: `ĄĆĘŁŃÓŚŹŻąćęłńóśźż`.

Ograniczenia: TTC/dfont są jawnie odrzucane, bez próby ekstrakcji fontu z kolekcji. Brak Swift/CoreText daje błąd importu oraz pozostawia edycję profilu działającą; pełna walidacja plików fontów na innych systemach wymaga dodatkowego parsera. WOFF/WOFF2 przechodzą tylko jeżeli CoreText faktycznie je rozpozna i potwierdzi glify. Nie obiecujemy konwersji nieobsługiwanego pliku.

## Google Fonts

Rzeczywisty odczyt publicznego `https://fonts.google.com/metadata/fonts` i import Poppins 400 z oficjalnego `google/fonts` zakończyły się powodzeniem 2026-10-17. Sieć wymagała eskalacji odczytu poza sandbox: zwykły proces zwracał błąd DNS. Kod aplikacji zgłasza brak sieci po polsku i nie zastępuje pliku innym fontem.

Katalog jest pobierany raz do prywatnego `.branding/google-fonts.json`; odświeżenie jest jawne (`refresh:true`). Każda rodzina ma `id`, `family`, `source` i odmiany `{id,weight,style}`. Import pobiera tylko wybraną odmianę i licencję, nie całe repozytorium. Dla każdego TTF obliczany jest Git blob SHA1 z nagłówkiem `blob <bytes>\0`; wynik musi odpowiadać `sha` oficjalnego katalogu GitHub. To wiąże pobrany plik z konkretnym obiektem repozytorium. Lokalna tożsamość ma SHA256 treści.

Potwierdzony wynik Google Poppins 400:

- SHA256 TTF: `7e65201e9b79159e2300267cc885e16c8dcef2424cdfa09a29bfb0980a94a7ba`.
- SHA256 licencji OFL: `6be04893d770899a015649c7aa3b582f871b272f8747a92b78b17c3e5c8b2573`.
- Wynik `FontRef.source=google`, rodzina Poppins, waga 400, style normal, lokalne `file` i `licenseFile`.

## Kontrakt danych i materiały

`createBrandingStore(root)` udostępnia asynchroniczne `get`, `save`, `version`, `templates`. `save(...,expectedRevision)` używa rewizji 0 do utworzenia profilu, serializacji per klient i procesu, atomowego rename aktywnego profilu i niezmiennych wersji. Stara rewizja daje 409. Nie nadpisuje Markdown preferencji. Nieudana publikacja aktywnego pliku usuwa wyłącznie właśnie utworzoną nieopublikowaną wersję, aby retry pozostało możliwe.

Zasoby przechodzą kontrolę zawartości, rodzaju i rozszerzenia; obrazy/wideo także ffprobe. Limity 20 MiB obraz/font i 2 GiB film; przerwany upload sprząta `.part`. SVG jest odrzucany. Nazwa pliku wynika z SHA256; istniejącego pliku nie nadpisujemy. Ścieżki i każdy istniejący komponent są sprawdzane pod kątem symlinków. Profil nie może wskazywać zasobu innego klienta. Weryfikacja hashów zasobów jest strumieniowa, także dla dużego wideo.

Snapshot odrzuca brak fontu i uszkodzone referencje, usuwa wiedzę prywatną i nieużywane materiały (zachowuje jedynie aktywne logo). Fonty, paleta i ustawienia ruchu są kopiowane do wersji. `templates(null)` nie dodaje profili brandingu; `templates(undefined)` wylicza wszystkie profile.

Testy: `node --test scripts/branding-store.test.mjs scripts/branding-assets.test.mjs scripts/branding-fonts.test.mjs`; potwierdzają paletę i HEX, wersje/409/konkurencję, zachowanie PREFERENCJE, odmowę symlinka i obcych ścieżek, sprzątanie po błędzie publikacji, fałszywy upload i przerwanie, prawdziwy PNG i deduplikację oraz kontrolę fontów/glifów na macOS. To nie zastępuje klatki Remotion, pełnego filmu i odbioru GUI.

## Pozostały spike

Odczyt Chromium strony JS, kontrola wszystkich żądań skanera oraz rzeczywista klatka/MP4 fontu należą do integracji skanera i renderera. Nie są oznaczone jako sprawdzone w tym dokumencie.
