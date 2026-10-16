# QuickContent — operator terminalowy i naprawa montażu

2026-10-15. Autoryzacja: bieżące polecenie użytkowniczki.

1. Operator projektu: Codex CLI (domyślnie, zalogowany przez ChatGPT), Claude Code CLI lub OpenAI API. Żadnego automatycznego przejścia z konta CLI na płatny klucz. GUI pokazuje tryb i status logowania. Istniejące źródła, transkrypcje i wybór zostają.
2. CLI otrzymuje transkrypcję/brief i zwraca JSON bez narzędzi montujących pliki. Kod aplikacji zapisuje, sprawdza i renderuje. Brak osobnej opłaty API w trybie konta; limity/subskrypcja dostawcy nadal obowiązują.
3. Naprawa null: prompt QuickContent jest samowystarczalny, bez poleceń czytania plików lub uruchamiania innych programów. Ścisły schemat zmian napisów, segmentów i prostych grafik; niemodyfikowalne metadata pochodzą z oryginału. Walidacja przed zapisem i wersja historii.
4. Polecenie terminalowe do statusu, przetwarzania, montażu zaznaczonych i retry korzysta z tej samej trwałej kolejki. Może używać istniejącego panelu lub własnego workera, bez podwójnej pracy.
5. Odbiór: regresja data:null, kontrakty obu CLI i API, rozdzielenie kosztu konta od API, GUI, prawdziwa odpowiedź Codex, wznowienie jednego nieudanego montażu i sprawdzony MP4. Nie wznawiać anulowanych rolek samoczynnie.


### Operator terminalowy i naprawa montażu — 2026-10-15

- Wdrożono wybór Codex/Claude Code na koncie terminalowym oraz osobny jawny tryb OpenAI API. Domyślnie Codex; bez automatycznego fallbacku API. Limity i koszt subskrypcji konta pozostają. CLI działa ze wspólną kolejką również bez uruchomionego GUI i sprawdza tożsamość repozytorium panelu.
- Przyczyną błędu API było `data:null` po sprzecznym poleceniu pracy na plikach. Nowy kontrakt jest samowystarczalny, walidowany przed zapisem. Regresje obejmują null, zachowanie efektów/końców napisów SkyClass i wyłączenie skonfigurowanych MCP/pluginów dla procesu Codex.
- Prawdziwy nieudany job `job-6cf92703-a817-4f89-ad40-ca6e71be8db4` wznowiono przez Codex ChatGPT: ukończony, H264/AAC,1080×1920,42,581s. Sprawdzono klatki, aktualność w GUI i pobieranie HTTP200/45516375 bajtów. Źródła i transkrypcji nie przeliczano;6 zaznaczeń zachowano,5 anulowanych montaży nie wznowiono. [Pomiar](terminal-montage-proof.json), [GUI](assets/terminal-montage-ready.png).
- Codex:33160tokenów wejścia/3426wyjścia,0 osobnej opłaty API (subskrypcja). Historyczna opłata wcześniejszego błędnego API pozostaje w kosztach. [Krótki rzeczywisty test nowego kontraktu API](api-edit-proof.json) przeszedł; to nie dowód pełnego montażu przez API. Claude jest zainstalowany, ale niezalogowany — prawdziwego wywołania Claude nie potwierdzono.
- Regresja193/193PASS; lint/TypeScript0błędów,24 wcześniejsze ostrzeżenia. Testy procesów wymagają dostępu do ich tożsamości poza sandboxem. Nie wykonano odsłuchu ani pełnego odbioru wszystkich stylów; wcześniejsze otwarte uwagi całej aplikacji pozostają.
