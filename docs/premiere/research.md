# Premiere Pro — research integracji (UXP, OTIO)

Data: 2026-10-15. Status: research do planu. Elementy „niezweryfikowane” sprawdzamy w spike'u P0 na wersji Premiere użytkowniczki.

## 1. UXP w Premiere Pro

- **UXP oficjalnie od Premiere 25.6** (changelog Adobe opisuje 25.6.0 jako oficjalne wydanie rozszerzalności UXP i mówi o zbliżaniu się do parytetu z CEP/ExtendScript). Publiczna beta od 25.2.0 (2024-12-04). Źródła: [UXP changelog](https://developer.adobe.com/premiere-pro/uxp/changelog), [Adobe: UXP Migration Update](https://www.adobevideopartner.com/customer-stories/extensibility-update/).
- **CEP/ExtendScript:** Adobe zapowiadało wsparcie CEP przez co najmniej jeden kolejny duży cykl po UXP 1.0 (cel, nie zobowiązanie). Data końca ExtendScript „wrzesień 2026” krąży na forum — **niezweryfikowana**. Wniosek: budujemy wyłącznie na UXP, bez CEP. Źródła: [Adobe Community](https://community.adobe.com/questions-729/extendscript-to-uxp-for-premiere-pro-1553924), [Creative Cloud Developer Forums](https://forums.creativeclouddeveloper.com/t/uxp-vs-cep-for-premiere-pro-after-effects-which-should-i-use/10364).

### Obszary API widoczne w oficjalnym panelu przykładowym Adobe

Repozytorium `AdobeDocs/uxp-premiere-pro-samples`, panel `premiere-api` ([README](https://github.com/AdobeDocs/uxp-premiere-pro-samples/blob/main/sample-panels/premiere-api/README.md)) zawiera moduły m.in.:

| Moduł | Co pokazuje | Użycie w MontageFrames |
|---|---|---|
| `import.ts` | import plików, sekwencji, komponentów AE | import pakietu, overlayów, SFX |
| `sequence.ts` | tworzenie sekwencji, ścieżek, in/out, fps, ustawienia | nowa sekwencja wyniku |
| `sequenceEditor.ts` | overwrite/insert elementów osi, wstawianie MOGRT, klonowanie i usuwanie | cięcia natywne, plansze |
| `markers.ts` | tworzenie/przesuwanie/usuwanie markerów, kolory | rozdziały |
| `effects.ts`, `keyframe.ts` | dodawanie efektów, keyframy i interpolacja | zoomy (Motion), głośność |
| `transition.ts` | przejścia na początku/końcu klipu | crossfade na cięciach |
| `transcript.ts` | eksport i import transkryptów | napisy edytowalne |
| `projectConverter.ts` | eksport AAF, Final Cut Pro XML, OpenTimelineIO | odczyt ręcznych zmian (P4) |
| `projectPanel.ts`, `metadata.ts` | elementy projektu, ścieżki mediów, XMP | ścieżka źródła, oznaczanie wyników |
| `export.ts`, `encoderManager.ts` | eksport klatek/sekwencji, Media Encoder | opcjonalny eksport finalny |
| `eventManager.ts` | zdarzenia projektu i encodera | odświeżanie panelu |
| `dragAndDrop.ts` | przeciąganie lokalnych mediów do projektu/osi (tylko `file://`) | ręczne wstawianie assetów |

- Większość API zwraca Promise. Zapisy idą przez transakcje (`executeTransaction`); jeden autor raportuje limit ok. 50 akcji na transakcję — **niezweryfikowane**, sprawdzamy w P0. Wczesne wątki (2025) mówiły o braku `insertClip` w UXP; nowszy panel przykładowy ma insert/overwrite — sygnatury potwierdzamy na zainstalowanej wersji. Źródła: [forum: dodawanie klipów](https://forums.creativeclouddeveloper.com/t/how-to-add-clips-to-a-sequence-using-premiere-pro-uxp-api/8977), [Adobe Community: insertClip](https://community.adobe.com/t5/premiere-pro-discussions/how-to-insertclip-in-uxp-plugin/m-p/15097904), [blog o UXP w produkcji](https://samabr85.github.io/blog/uxp-production-guide/).
- `ProjectConverter`: eksport sekwencji do FCP XML i OTIO. Źródło: [ProjectConverter reference](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/projectconverter).

## 2. Sieć z panelu do lokalnego serwera

- Domyślnie wtyczka UXP nie ma sieci; domeny deklaruje się w `manifest.json` → `requiredPermissions.network.domains` (Manifest v5, Premiere ≥ 25.6). Źródła: [Network recipe (Premiere)](https://developer.adobe.com/premiere-pro/uxp/resources/recipes/network), [UXP network guide](https://developer.adobe.com/uxp/guides/how-to/recipes/network/).
- **macOS ogranicza niezaszyfrowane `http://`** w UXP. Forum: `localhost` i `127.0.0.1` nie są wymienne, protokół i port muszą się zgadzać dokładnie, `ws:`/`wss:` to osobne wpisy; jeden deweloper musiał użyć lokalnego proxy. Źródło: [forum: network permission](https://forums.creativeclouddeveloper.com/t/network-permission-issue-attn-adobe-manifest-domain-entry-not-granting-fetch-access/11230).
- **Wniosek:** spike P0 testuje kolejno (1) `https://127.0.0.1:<port>` z lokalnym certyfikatem zaufanym w pęku kluczy, (2) `wss://`, (3) wymianę plików przez folder (`requiredPermissions.localFileSystem`) jako bezsieciowy fallback. Wybieramy pierwszy działający.

## 3. OpenTimelineIO jako most (bez pluginu)

- Premiere ≥ 25.6 importuje `.otio` (File → Import, potem Link Media dla offline). Starsze: `otioconvert -i timeline.otio -o timeline.xml -O fcp_xml` (pakiety `OpenTimelineIO` + `otio-fcp-adapter`). Źródło: [Remotion — Export to OpenTimelineIO](https://www.remotion.dev/docs/export-opentimeline).
- Remotion traktuje eksport kompozycji do OTIO jako pracę agenta (niedeterministyczną), bo kompozycja to kod. MontageFrames ma deterministyczne dane (`reel.json`), więc generuje OTIO bezpośrednio: cięcia natywne, animacje jako ProRes 4444 alfa.
- Narzędzie do FCP7 XML/FCPXML/OTIO w Node bez FFmpeg: [@chatoctopus/timeline](https://github.com/ChatOctopus/timeline) (licencja i jakość do oceny; v1 pisze OTIO JSON samodzielnie).

## 4. Dystrybucja

- Instalacja wtyczek UXP: pakiet `.ccx`; UXP Developer Tool (UDT) do wersji deweloperskiej. Źródło: [Install a UXP plugin](https://developer.adobe.com/premiere-pro/uxp/plugins/distribution/install).
- Marketplace Adobe Exchange — dopiero przy udostępnianiu innym (poza zakresem do odwołania).

## 5. Ryzyka

| Ryzyko | Ograniczenie |
|---|---|
| API UXP niekompletne lub zmienne między wersjami | spike P0 na wersji użytkowniczki; każda funkcja z fallbackiem przez pakiet OTIO |
| Sieć localhost blokowana | HTTPS z lokalnym certyfikatem → `wss` → wymiana plików |
| Duże overlaye ProRes 4444 (GB na minutę) | render tylko zakresów z efektami, nie całej osi; sprzątanie cache po imporcie (z potwierdzeniem) |
| Dryf czasu (fps źródła vs sekwencji, VFR) | konwersja w jednym module z testami; VFR → proxy CFR do analizy i ostrzeżenie |
| Ręczne zmiany kolidują z ponownym zastosowaniem planu | P4: zawsze nowa wersja sekwencji, diff przed nadpisaniem |
