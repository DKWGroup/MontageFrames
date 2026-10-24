# Pomiar modeli i kosztów F3

2026-10-18. Benchmark płatnych modeli **niewykonany**. Brak uzgodnionego budżetu; implementacja nie uruchamia API w celu testowania.

## Pomiar lokalny

Prywatny raport `.quickcontent/quality/f3-request-size.json`: ten sam szkic `pokazowka`, pusty template, polecenie „Popraw literówkę”; porównane `full`, `captions`, `operations`. Wynik: full 5534 znaki, captions 2190, operations 4081. Mierzymy liczbę znaków JS, nie tokeny ani koszt. Długie ID v3 mają narzut; mniejszy zakres uprawnień nie oznacza automatycznie najmniejszego promptu. Pełne preferencje klienta nadal zwiększają wejście.

## Właściwa próba przed ofertą

Użyć zatwierdzonego zamkniętego korpusu i tej samej wersji kontraktu/runtime; minimum 3 próby na model/zadanie. Osobno pierwszy montaż, poprawka jednego słowa, hook, grupowanie, odrzucona odpowiedź i retry. Zapisać wszystkie próby, input/output/cache tokeny, narzut transportu, koszt znany/unknown, czas, błędy walidacji, eskalacje i ocenę człowieka. Usage utrwalić przed parsowaniem odpowiedzi; nie zerować nieudanej próby.

Mierzyć osobno koszt AI, renderu, przesyłu i przeglądu. Retry samego renderu/opisu nie może ponawiać redakcji. Porównanie kont CLI z API wymaga oddzielnego raportu; subskrypcja nie jest nieograniczonym darmowym limitem. Progi i budżet ustalić przed płatnym uruchomieniem.
