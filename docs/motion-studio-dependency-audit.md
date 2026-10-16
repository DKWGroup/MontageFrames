# Audyt istniejących zależności — Motion Studio

Wykonany przed integracją modułu: `npm audit --json --registry=https://registry.npmjs.org --fetch-retries=0 --fetch-timeout=15000`.

Wynik: 10 pozycji high, 0 critical, 0 moderate. Pierwsza próba z domyślną konfiguracją rejestru timeout45s; powyższe ponowienie zwróciło rzeczywisty raport.

Łańcuch zgłoszeń: braces → micromatch → fast-glob → @typescript-eslint/typescript-estree/utils/parser/type-utils → typescript-eslint/eslint-plugin → @remotion/eslint-config-flat. Nie należy traktować tych 10 nazw jako 10 niezależnych błędów nowej funkcji.

Źródłowe advisory braces: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm — stack-exhaustion DoS przy głęboko zagnieżdżonych wzorcach. Raport obejmuje braces <=3.0.3 i wskazuje fixAvailable:false dla części łańcucha, w tym Remotion ESLint config. Oddzielna aktualizacja zależności wymaga sprawdzenia zgodności z przypiętym Remotion4.0.532; nie wykonywano npm audit fix, npm update ani migracji istniejącego projektu.

Nowe wejścia aplikacji nie powinny pozwalać na dowolne wzorce glob przekazywane do tych bibliotek. Aplikacja pozostaje lokalna na127.0.0.1; to nie równoznaczne z pełnym audytem bezpieczeństwa ani z usunięciem podatności. Przed publicznym udostępnianiem potrzebny osobny zakres hardeningu i aktualizacji.
