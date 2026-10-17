# Publikacja MontageFrames na Vercelu

Konfiguracja z 2026-10-17. `vercel.json` ustawia osobny build publicznej strony.

## Ustawienia na ekranie New Project

Po przesłaniu sprawdzonych zmian kodu do repo GitHub, w imporcie `DKWGroup/MontageFrames` ustaw:

| Pole | Wartość |
|---|---|
| Root Directory | `./` — główny katalog repo |
| Application / Framework Preset | `Vite` |
| Build Command | `npm run build:site` |
| Output Directory | `dist-site` |
| Install Command | `npm ci --ignore-scripts` |
| Node.js | `22.x` |
| Environment Variables | Żadne nie są potrzebne dla publicznej strony |

Rozwiń **Build and Output Settings** i sprawdź powyższe wartości, następnie **Deploy**. Wersja na GitHub musi zawierać `vercel.json`, `vite.site.config.mjs`, `site/index.html`, `ui/public-main.tsx` i nowy skrypt package.json. Zmiany istniejące tylko na komputerze nie trafią do importu GitHub.

Nie używaj `npm run build`: to polecenie bundluje silnik Remotion. Nie używaj `npm run build:panel` do publicznego wdrożenia: lokalny panel kopiuje materiały `public/`, w tym filmy klientów. Publiczny build celowo kopiuje tylko dwa jawnie dozwolone fonty i kod landingu.

Nie dodawaj `.env`, tokenów operatora, kluczy API, katalogów klientów ani materiałów wideo do Vercela. `npm ci --ignore-scripts` pomija lokalny bootstrap rejestru filmów i aktualizatora; publiczny build ich nie potrzebuje. `.vercelignore` dodatkowo wyklucza dane prywatne przy użyciu CLI.

## Co działa po publikacji

Landing, jego animacje, kalkulator i publiczne informacje. Przejście do `/panel` wyświetla instrukcję uruchomienia panelu lokalnego oraz link do `http://127.0.0.1:3100/panel` na komputerze odwiedzającego. Build strony nie zawiera lokalnego App ani jego API.

Pełny edytor i montaż pozostają lokalne: serwer Vite udostępnia API, trwałe pliki, FFmpeg, Chromium, CoreText oraz konta Codex/Claude CLI. Vercel Functions mają ograniczony czas i nietrwały obszar zapisu; nie zastępują tego procesu. Wersja całkowicie internetowa wymaga osobnego backendu/workerów, trwałego storage i logowania — to osobne wdrożenie, którego ten plan nie wykonuje.

## Sprawdzenie przed Deploy

```sh
npm run build:site
```

W `dist-site` powinny być wyłącznie `index.html`, zasoby JS/CSS oraz `fonts/Fustat.ttf` i `fonts/CabinetGrotesk-Variable.woff2`. Żadnych rolek, logo klientów ani plików preferencji. Domyślny publiczny adres Vercela jest wystarczający; domenę można podłączyć później w Settings → Domains.

Po powiązaniu z GitHub następne push'e na skonfigurowaną gałąź produkcyjną (na zrzucie `main`) wywołują nowe wdrożenie. Push gałęzi roboczej daje preview według ustawień projektu; nie zmienia automatycznie main. W tej sesji agent nie wykonał push, merge ani Deploy.

Źródła: [Vite na Vercelu](https://vercel.com/docs/frameworks/frontend/vite), [konfiguracja builda](https://vercel.com/docs/builds/configure-a-build), [runtime i system plików](https://vercel.com/docs/functions/runtimes), [limity Functions](https://vercel.com/docs/functions/limitations).
