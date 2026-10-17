# Skaner brandingu — spike B0 i odbiór

2026-10-17. Implementacja: `scripts/branding-network.mjs`, `scripts/branding-scan.mjs`.

## Potwierdzone

- Istniejący Chromium Remotion 4.0.532 udostępnia CDP. Osobny profil tymczasowy, bez sesji użytkownika; po skanie profil i proces są zamykane.
- Test rzeczywiście uruchomionego Chromium: skrypt zmienił treść `Before` na `JavaScript executed`; CSS dał kolor `#124f81` i rodzinę Poppins. Żądanie obrazka do `169.254.169.254` zostało odrzucone przed połączeniem, fetch do localhost blokuje CSP.
- Rzeczywisty publiczny odczyt `https://example.com`: tytuł `Example Domain`, tekst strony, `system-ui`, 2540 bajtów, bez ostrzeżeń. To dowód odczytu zewnętrznego, niezależny od fixture.
- `BRANDING_BROWSER_TEST=1 node --test scripts/branding-network.test.mjs scripts/branding-scan.test.mjs`: 8 testów, 8 zaliczonych. Zwykły przebieg pomija tylko test uruchomienia przeglądarki, wymagający dostępu systemowego do Chromium.
- ESLint czterech plików skanera: zaliczony.

## Model sieci i danych

Chromium nie ma bezpośredniego dostępu do sieci: martwy proxy, resolver DNS wyłączony, QUIC wyłączony, WebRTC bez bezpośredniego UDP. CDP wstrzymuje żądania strony; Node obsługuje tylko GET publicznego HTTP(S), bez danych logowania i cookies. Każde rozwiązanie DNS (wszystkie odpowiedzi) i przekierowanie przechodzi kontrolę IPv4/IPv6, następnie połączenie korzysta z zatwierdzonego, przypiętego IP. Prywatne, link-local, mapped IPv6, NAT64 i zastrzeżone adresy są odrzucane. CSP blokuje ramki, workery, obiekty, formularze i fetch/WebSocket. Console strony nie trafia do logu operatora.

Limit: do 5 dokumentów wybranych przez linki tej samej witryny (strona główna oraz o nas/oferta/kontakt), 30 sekund na stronę, 5 MiB na zasób, 50 MiB i 100 zasobów na stronę. Rezerwacja bajtów obejmuje równoległe pobrania. Filmów nie pobiera.

Job jest atomowo utrwalany w `klienci/<id>/branding/research/<scanId>.json`. Restart oznacza utracony aktywny job jako `interrupted`; ponowienie tworzy nowe ID. Anulowanie zatrzymuje pobrania, proces Chromium i CLI. Skan nie zapisuje aktywnego profilu, nie importuje obrazów ani fontów. Wynik `suggestions` zawiera `{value, sourceRefs}` per pole. Źródła to rzeczywiste URL-e i odczytany tekst. Usage jest zapisany przed walidacją odpowiedzi AI przez istniejący adapter QuickContent.

## Ograniczenia jawne

- To ograniczony odczyt publicznej strony, bez logowania, akceptowania cookies ani klikania formularzy. SPA wymagająca fetch/XHR, service workera, iframe lub interakcji może dać niepełny wynik; UI otrzymuje ostrzeżenia. Zewnętrzne JS/CSS/fonty/obrazy mogą być odczytane przez zabezpieczony transport.
- Próbki kolorów i nazw fontów są propozycjami z obliczonych stylów, nie gwarancją pełnej księgi marki. Nazwa fontu nie oznacza automatycznego importu pliku ani licencji.
- Semantyczne porządkowanie korzysta wyłącznie z wybranego konta Codex/Claude przez istniejący adapter. Nie dodano płatnego API ani fallbacku. Błąd konta zachowuje deterministyczny wynik i źródła; pełna ścieżka konta AI nie jest potwierdzona tym spike.
- Adapter CDP używa wewnętrznego modułu przypiętej wersji Remotion; po jej aktualizacji wymagany jest powtórny test przeglądarkowy.
- Publiczny example.com nie jest pełnym odbiorem GUI ani całego panelu brandingu.
