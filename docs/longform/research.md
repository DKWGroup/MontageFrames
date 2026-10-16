# LongForm — research i źródła techniczne

Data: 2026-10-15. Status: research do planu; żadna z opisanych technologii nie jest jeszcze wpięta w LongForm. Twierdzenia oznaczone „niezweryfikowane” wymagają sprawdzenia w spike'u przed implementacją.

## 1. Co już mamy w repo (punkt wyjścia — reużywamy, nie piszemy od nowa)

| Potrzeba | Istniejący element | Uwaga |
|---|---|---|
| Import pliku/YouTube, master, proxy | `scripts/quickcontent-ingest.mjs` | YouTube: osobno obraz i audio, mux FFmpeg |
| ASR słowo po słowie | `scripts/quickcontent-transcribe.mjs` (Whisper), Parakeet przez `hyperframes transcribe` | Parakeet „rozlewa” końce słów na pauzy → cięcie ciszy z audio, nie z transkryptu (CLAUDE.md) |
| Cięcie ciszy | `scripts/prep.mjs` (`silencedetect`, `NOISE_DB`, `MIN_SILENCE`) | do wydzielenia jako funkcja wspólna |
| Trwałe joby, kolejka, postęp, koszty | `scripts/quickcontent-store.mjs`, `-worker.mjs`, `-progress.mjs`, `-costs.mjs` | ten sam wzorzec dla LongForm |
| Operator AI (Codex/Claude na koncie, OpenAI) | `scripts/quickcontent-ai.mjs`, `quickcontent-cli.mjs` | kontrakt JSON, walidacja przed zapisem |
| Twarz, mówca, cięcia kamer | `scripts/quickcontent-face.swift` (Apple Vision), `quickcontent-speaker.mjs`, `quickcontent-portrait.mjs` | baza dla `face-track` i maski osoby |
| Śledzenie kadru | `framing.tracking` w `src/quickcontent/framing.mjs` | interpolacja przez cięcia |
| Napisy kinetic i motywy klientów | `src/styles/*.tsx` (silnik `kineticCaptions(T)`) | potrzebny wariant tokenów 16:9 |
| Grafiki danych, liquid glass | `src/overlays.tsx` | `counter`, `bars`, `ring`, `line`, `list`, `compare`, `media`, `emoji` |
| Rewizje edycji, badge aktualności, wersje renderów | QuickContent (`X-Edit-Revision`, `renderRevision`) | ten sam kontrakt |
| Opis publikacji | `scripts/reel-description.mjs` | dopisać rozdziały YouTube |
| Efekty HTML/GSAP | skille HyperFrames w `.claude/skills/` | render do przezroczystego pliku → `media fit: overlay` |
| Klucz Pexels | `.env` → `PEXELS_API_KEY` (już jest; nie wypisywać) | brak jeszcze kodu klienta API |

Wymiar kompozycji: `calculateReelMetadata` w `src/Reel.tsx` zwraca dziś `fps` i `durationInFrames`; może zwrócić też `width/height` z `reel.json.format` — minimalna zmiana pod 16:9.

## 2. Wtrącenia („yyy”, „eee”) i transkrypcja dosłowna

- Standardowy Whisper ma tendencję do pomijania wtrąceń i niepłynności, więc samo ASR ich nie złapie.
- **CrisperWhisper** (INTERSPEECH 2024) — fine-tune Whispera do transkrypcji dosłownej z dokładnymi czasami słów i wtrąceń; raportuje lepsze F1 wykrywania wypełniaczy niż wcześniejszy model akustyczny i niższy WER/IER na AMI. **Licencja według agregatora CC‑BY‑NC‑4.0 (niezweryfikowane)** — przy pracy dla klientów sprawdzić w repo `nyrahealth/CrisperWhisper`. Trenowany głównie na EN/DE — jakość dla PL niezweryfikowana. Źródła: [arXiv 2408.16589](https://arxiv.org/abs/2408.16589v1), [PDF](https://arxiv.org/pdf/2408.16589), [Replicate (nieoficjalny)](https://replicate.com/collectiveai-team/crisperwhisper).
- **Decyzja planu (Ponytail):** v1 bez nowego modelu. Wtrącenia wykrywamy z (a) słów z leksykonu PL w transkrypcie, (b) „dziur” w transkrypcie, w których RMS audio pokazuje głos (dźwięczne wtrącenie bez słowa), (c) LLM dla wieloznacznych słów. Nowy model dopiero, gdy benchmark na 3 nagraniach PL pokaże, że (a)+(b) gubią > 20% wtrąceń.

## 3. Cenzura

- Brak gotowego, sprawdzonego leksykonu PL w repo → własny plik rdzeni z odmianami, testy na listach pozytywów i negatywów („kurek”, nazwy własne).
- Technika: `volume` z rampami w Remotion (`<Audio volume={(f) => …}>`) oraz filtr FFmpeg `volume=enable='between(t,a,b)':volume=0` dla ścieżki audio eksportowanej do Premiere.
- Dźwięk kruka: plik CC0 lub kupiony, z licencją zapisaną obok. Bez pobierania z nieznanych źródeł.

## 4. Segmentacja osoby (wycięcie, podmiana tła)

- **Apple Vision** (`VNGeneratePersonSegmentationRequest`) — lokalnie na Macu; Swift już jest w repo (`quickcontent-face.swift`). Maska per klatka (nie pełny matting włosów) → potrzebne wygładzenie czasowe (EMA maski) przeciw migotaniu. Jakość do zmierzenia w spike'u L4 (niezweryfikowane w tym researchu).
- **Robust Video Matting** — matting z rekurencją czasową (lepsza spójność między klatkami), bez trimapy; formaty PyTorch/ONNX/TF; **licencja GPL‑3.0** (ryzyko przy dystrybucji pluginu). Źródła: [arXiv 2108.11515](https://arxiv.org/pdf/2108.11515.pdf), [WACV 2022](https://openaccess.thecvf.com:443/content/WACV2022/papers/Lin_Robust_High-Resolution_Video_Matting_With_Temporal_Guidance_WACV_2022_paper.pdf), [mirror z licencją](https://sourceforge.net/projects/robust-video-matting.mirror/).
- **Decyzja planu:** v1 = Apple Vision + wygładzanie czasowe + jakość mierzona IoU na 50 ręcznie sprawdzonych klatkach. RVM tylko lokalnie (bez dystrybucji) i dopiero, gdy Vision nie spełni progu.

## 5. Przebitki Pexels

- Domyślny limit **200 zapytań/h i 20 000/mies.**; podniesienie bezpłatne po spełnieniu warunków (przykłady użycia z atrybucją). Obchodzenie limitu = odebranie dostępu. Nagłówki `X-Ratelimit-Remaining`/`X-Ratelimit-Reset` tylko przy odpowiedziach 2xx. Cache odpowiedzi rekomendowany na 24 h.
- Atrybucja: widoczny link do Pexels, w miarę możliwości autor + link do materiału.
- Wideo: osobna ścieżka API (`https://api.pexels.com/videos/…`), brak filtra długości — filtrujemy po stronie klienta.
- Źródła: [Pexels API docs](https://pexels.com/api/documentation/), [Pexels Help: limity](https://help.pexels.com/hc/en-us/articles/900005852323), [FAQ python-pexels](https://python-pexels.readthedocs.io/en/latest/faq.html).

## 6. Dramaturgia i hook

- Skille: `hook-engineer` (Tier 1: kontrast, contrarian, liczba, self-relevance, open loop; anti-cringe check; hook działa na wyciszonym telefonie; obietnica dowieziona; PL: rytm dwóch zdań) i `silnik-social-media` (struktura hook → zaciekawienie → konkrety → domknięcie; dowód zamiast obietnicy; zero guru-hype). Głos i zakazy klienta mają pierwszeństwo; ton Wiktorii nie przechodzi na klientów (PREFERENCJE.md 2026-10-15).
- „Pattern interrupt co 2–3 s” z `hook-engineer` stosujemy we **wstępie**; w rozdziałach rzadziej (5–10 s), bo long-form płaci za retencję i zrozumienie, nie za ciągłe bodźce.
- Rozdziały YouTube: lista znaczników w opisie, pierwszy `0:00`; minimalna liczba i długość rozdziałów (powszechnie: ≥ 3, każdy ≥ 10 s) — do potwierdzenia w aktualnej pomocy YouTube przed implementacją.
- Skill „marketingmax” wskazany w zleceniu nie jest zainstalowany w tym środowisku; odpowiedniki użyte w planie: `hook-engineer`, `silnik-social-media`, `marketing:content-creation`.

## 7. Wymiana z montażownią (most do Premiere)

- **OpenTimelineIO:** Premiere ≥ 25.6 importuje `.otio` (File → Import, potem Link Media). Remotion opisuje eksport projektu do OTIO jako pracę agenta: klipy wideo/audio/obrazy natywnie, a tekst/animacje jako przezroczyste ProRes 4444 nad nimi — eksport niedeterministyczny i może być niepełny. Starsze Premiere: `otioconvert … -O fcp_xml`. Źródło: [Remotion — Export to OpenTimelineIO](https://www.remotion.dev/docs/export-opentimeline).
- **Wniosek:** mamy deterministyczne dane (`reel.json`: segmenty, wyciszenia, overlaye w czasie źródła), więc OTIO generujemy bez zgadywania — cięcia natywne, overlaye renderowane osobno jako alfa. Biblioteka FCP7 XML/FCPXML/OTIO bez FFmpeg: [@chatoctopus/timeline](https://github.com/ChatOctopus/timeline) (licencja do oceny); v1 może pisać OTIO JSON samodzielnie — format jest prosty.

## 8. Ryzyka

| Ryzyko | Skutek | Ograniczenie |
|---|---|---|
| LLM wycina zdanie zmieniające sens | szkoda wizerunkowa klienta | walidator §4.3 założeń, „do decyzji” dla `repetition`, obowiązkowy przegląd |
| Czas renderu 20–30 min w 4K | godziny pracy | domyślnie 1080p, ciężkie efekty prerenderowane do alfa, równoległość Remotion |
| Migotanie maski | tani wygląd efektów H | wygładzanie czasowe, próg jakości, degradacja efektu |
| Licencje (CrisperWhisper NC, RVM GPL, SFX) | ryzyko prawne | sprawdzenie licencji przed integracją; assety tylko z plikiem licencji |
| Limity Pexels | brak przebitek | cache 24 h, kolejka, ponowne użycie wyników w projekcie |
