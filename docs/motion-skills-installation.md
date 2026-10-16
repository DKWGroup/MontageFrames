# Skille motion design — instalacja 2026-10-14

Zainstalowane globalnie w `/Users/wskopek/.codex/skills/` oraz `/Users/wskopek/.claude/skills/`. Obie kopie mają identyczne pliki robocze. `INSTALL_SOURCE.json` w każdym skillu zapisuje repozytorium i revision.

| Skill | Zastosowanie | Instalacja |
|---|---|---|
| onetake | Ciągłe animacje, przyczynowość ruchu, biblioteka mierzonych przejść | Oryginalny SKILL.md, biblioteki, skrypty, referencje i materiały |
| lemo-opuscar | Krótkie filmy w określonym stylu wizualnym | Oryginalny plugin skill; `scripts/setup.sh` pobiera bibliotekę stylów przy użyciu |
| claude-animation-base | Malarska animacja 2D i gra postaci | Lokalny SKILL.md kierujący do oryginalnego ANIMATION_GUIDE.md, kompletny starter MIT |
| gbro-collage-broll | Kolażowe przebitki editorial/halftone | Oryginalny skill, skrypty i referencje; generowanie wideo wymaga konfiguracji Gemini |

OneTake ma licencję PolyForm Noncommercial. Użytkowniczka potwierdziła niekomercyjny charakter SkyClass. Przy innych klientach oceniać warunki dla danego projektu. Skille nie włączają automatycznie płatnych API. gbro w Claude Code wymaga odpowiednika generatora obrazów lub dostarczonej klatki, zgodnie z instrukcją upstream.

ClaudeAnimationBase nie zawiera upstream SKILL.md; adapter został zwalidowany `quick_validate.py`. Kompletność bibliotek OneTake i skryptów pozostałych pakietów sprawdzona, pliki w obu aplikacjach porównane SHA-256. Po nowej turze Codex może odkryć skille; Claude Code po odświeżeniu/nowej sesji.

## Wersje źródeł

- onetake: [415758128aa4](https://github.com/feitangyuan/onetake/commit/415758128aa45cc54340df40d8109363447f582e)
- lemo-opuscar: [fdc46d7f0e20](https://github.com/lemomo-ai/lemo-opuscar/commit/fdc46d7f0e20cc953a71d56241a92d1b4cb7298e)
- claude-animation-base: [0ac8bf2b3194](https://github.com/JohnHeibel/ClaudeAnimationBase/commit/0ac8bf2b31942376cb6b8c4074715595d512acd2)
- gbro-collage-broll: [a1a4ee2e2abf](https://github.com/pyang5166/gbro-collage-broll/commit/a1a4ee2e2abf7d44e460026b706d0c72c2cf8a91)
