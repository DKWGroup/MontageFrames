---
name: MontageFrames — rolki
canvas: { width: 1080, height: 1920, fps: 30, background: "footage" }
colors:
  accent: "#FF6B1A" # jedyny akcent: pomarańcz
  glow: "rgba(255,107,26,0.55)" # poświata akcentu (paski, łuk, linia, znaczniki)
  ink: "#1A0F08" # tekst na pomarańczu
  paper: "#FFF6EE" # tekst — ciepła biel, nigdy czyste #FFF
  muted: "rgba(255,246,238,0.7)" # etykiety, „było”, wartości drugoplanowe
  faint: "rgba(255,246,238,0.16)" # tory pasków, linie bazowe, separatory
glass: # karta liquid glass pod każdą grafiką z danymi
  background: "linear-gradient(155deg, rgba(42,31,24,0.55), rgba(14,10,7,0.68))"
  backdrop: "blur(36px) saturate(165%) brightness(0.62)" # wideo pod kartą rozmyte i przyciemnione
  border: "1.5px solid rgba(255,255,255,0.16)"
  highlight: "inset 0 1.5px 0 rgba(255,255,255,0.32) + radialny połysk z lewego górnego rogu"
  shadow: "0 30px 80px rgba(0,0,0,0.4)"
  radius: 48
typography:
  sans: { family: "MADE Tommy Soft, Nunito", weights: [700, 800, 900], role: "wszystko: napisy, liczby (900), treść (800), etykiety (700, muted)" }
  alt: { family: "Fustat", weights: "200–800", role: "w bazie, do nowych stylów" }
  sizes: { caption-key: 190, caption-small: 64, number-hero: 180, value: 58, label: 38-52, title: 92 }
  tracking: { display: "-0.03em" }
spacing: { graphic-width: 0.84, graphic-bottom: 0.79, card-padding: 48, caption-y: 0.64, caption-raised-bottom: 0.59 }
motion:
  card: { spring: "damping 16, stiffness 150, mass 0.8", from: "dół (porównanie: z boków)", extra: "połysk przelatuje po szkle po wejściu" }
  content: { reveal: "wsunięcie + rozmycie 8px → 0", stagger: "0.15–0.18 s" }
  marks: { spring: "damping 10, stiffness 190 (pop z lekkim odbiciem)" }
  bars: { spring: "damping 18, stiffness 110" }
  numbers: { ease: "cubic-bezier(0.25,1,0.5,1)", duration: 1.3 }
  draw: { ease: "cubic-bezier(0.65,0,0.35,1)", duration: 0.6-1.4 }
  exit: { ease: "cubic-bezier(0.5,0,0.75,0)", duration: 0.3 }
---

# Język wizualny rolek

Czysto, ale żywo. Dane stoją na ciemnych kartach z efektem liquid glass, jeden pomarańczowy akcent świeci tam, gdzie ma trafić oko. Wiedza z: frontend-design, hyperframes-creative (house style, video composition, data in motion, typography, motion principles), ui-ux-pro-max, dataviz, liquid-glass-design.

## Zasady

- **Liquid glass pod danymi.** Licznik, paski, pierścień, wykres, lista i porównanie stoją na szklanej karcie: przyciemnionej, z mocnym rozmyciem wideo pod spodem, lekko podbitą saturacją, jasną krawędzią i połyskiem. Tytuł-hak i emoji bez karty.
- **Przezroczystość tylko na samej karcie.** Rodzic z `opacity < 1` albo `filter` wyłącza rozmycie tła (backdrop root) — animuj kartę, nie jej kontener.
- **Jeden akcent z poświatą.** Pomarańcz: wyróżniony pasek, łuk, linia i głowica wykresu, znaczniki listy, „jest”, marker w tytule, przekreślenie „było”. Reszta w `paper`/`muted`. Bez czerwieni, zieleni i żółtego.
- **Jeden krój.** Ten sam bezszeryf co napisy; hierarchia wagą, wielkością i jasnością (900 liczby, 800 treść, 700 etykiety przygaszone). Bez Times New Roman.
- **Animacje mają życie:** karta wjeżdża sprężyście z połyskiem, treść wsuwa się z rozmyciem, liczby się odliczają, paski rosną sprężyście, znaczniki robią pop, linie się rysują. Ale bez przesady: żadnego ciągłego migania, wyjście szybsze niż wejście.
- **Dane bez szumu:** bez siatek, podziałek, legend i wykresów kołowych. Wartość przy końcu linii (pomarańczowa pigułka) lub przy pasku.
- **Pozycja:** grafiki na dole, pod napisami (dolna krawędź 0,79 wysokości). Napis stoi wtedy tuż nad grafiką. Twarz zawsze odsłonięta.

## Nie

Żółty, czysta biel `#FFF`, czysta czerń `#000`, Times New Roman, gradientowy tekst, siatki wykresów, wykresy kołowe, rozrzucone słowa, opacity na kontenerze szklanej karty.
