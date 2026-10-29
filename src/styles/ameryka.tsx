import { fitText } from "@remotion/layout-utils";
import {
  Audio,
  Easing,
  Img,
  interpolate,
  random,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  BISANZ,
  kineticCaptions,
  kineticOverlay,
  type OverlayProps,
  type Theme,
} from "./bisanz";

// Świeża Bryka Ameryka (swiezabrykaameryka.pl): silnik ruchu Bisanza, Poppins 900/600/400,
// zakreślacz na całe słowo zamiast kreski, ciemne karty ze złotą krawędzią.
// Kontrasty i zasady: klienci/swieza-bryka-ameryka/PREFERENCJE.md
const GOLD = "#B79154"; // czarny tekst na złotym 7,1:1
const BLACK = "#020203";
const BURGUNDY = "#651E1E"; // kremowy tekst na bordo 10,8:1
const CREAM = "#F6F3EE"; // tekst ze strony klienta
const MUTED = "#9D948A"; // podpisy na czarnym 6,95:1

export const AMERYKA: Theme = {
  ...BISANZ,
  font: "Poppins, sans-serif",
  label: { font: "Poppins, sans-serif", size: 26, spacing: "0.3em" },
  text: CREAM,
  accent: GOLD,
  onAccent: BLACK,
  glow: "183,145,84",
  shade: "2,2,3",
  card: BLACK,
  cardText: CREAM,
  cardBorder: "rgba(183,145,84,0.45)",
  cardLine: "rgba(246,243,238,0.14)",
  pill: BLACK,
  pillText: CREAM,
  labelShadow: "0 2px 10px rgba(2,2,3,0.85)",
  keyWeight: 900,
  smallWeight: 600,
  titleStyle: "normal",
  ctaRadius: 18,
  keySize: 118,
  smallSize: 54,
  inlineKey: 92,
  inlineSmall: 54,
  shadow: "0 6px 22px rgba(2,2,3,0.6), 0 2px 4px rgba(2,2,3,0.7)",
  maxWidth: 0.8,
  y: 0.62, // 2026-10-20: 0,73 było za nisko
  yRaised: 0.63,
  radius: 24,
  marker: {
    key: [GOLD, BLACK],
    hl: [BURGUNDY, CREAM],
    hlWeight: 800,
    hlPop: true,
  },
};

export const Ameryka = kineticCaptions(AMERYKA);
const Base = kineticOverlay(AMERYKA);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Star: React.FC<{ size: number; color?: string }> = ({
  size,
  color = GOLD,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    style={{ display: "block" }}
  >
    <path
      d="M12 1.5l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.6 5.6 21.1 7 14l-5.3-5 7.2-.9z"
      fill={color}
    />
  </svg>
);

// Wyliczanka jak pasy flagi USA: pas (czerń/bordo) wjeżdża od lewej, złota gwiazdka wyskakuje
// z obrotem, numer w złocie, punkt WERSALIKAMI Poppins 900. Bez karty; dolna krawędź w strefie TikToka.
// Tabela stawek: punkt z `value` → pasy równej szerokości, `was` się przekreśla, `value` wyskakuje
// na złotym (czarny na złotym 7,1:1 na obu pasach); `sub` = podpis, `o.source` = źródło pod listą.
const FlagList: React.FC<OverlayProps> = ({ o, dur, at, src }) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const items = o.items ?? [];
  const table = items.some((it) => typeof it !== "string" && it.value);
  const exit = interpolate(f, [dur - 9, dur], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  const textBox = width * 0.8 - (table ? 400 : 230);
  return (
    <div
      style={{
        position: "absolute",
        left: width * 0.1,
        bottom: height * (1 - 0.75),
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: table ? 10 : 14,
        fontFamily: AMERYKA.font,
        opacity: 1 - exit,
        transform: `translateX(${exit * 80}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 6,
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const s = spring({
            frame: f - 2 - i * 3,
            fps,
            config: { damping: 10, stiffness: 200 },
          });
          return (
            <div
              key={i}
              style={{
                transform: `scale(${s}) rotate(${(1 - s) * -90}deg)`,
                filter: "drop-shadow(0 2px 6px rgba(2,2,3,0.7))",
              }}
            >
              <Star size={26} />
            </div>
          );
        })}
        {o.title && (
          <div
            style={{
              marginLeft: 12,
              fontWeight: 400,
              fontSize: 26,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: CREAM,
              textShadow: AMERYKA.labelShadow,
            }}
          >
            {o.title}
          </div>
        )}
      </div>
      {items.map((it, i) => {
        const { text, sub, value, was } =
          typeof it === "string" ? { text: it } : it;
        const t0 =
          typeof it !== "string" && it.at != null ? at(it.at) : 0.3 + i * 0.4;
        const lf = f - Math.round(t0 * fps);
        const go = (delay: number, damping: number, stiffness: number) =>
          lf < 0
            ? 0
            : spring({
                frame: lf - delay,
                fps,
                config: { damping, stiffness },
              });
        const band = go(0, 20, 170);
        const star = go(2, 8, 190);
        const rise = go(5, 18, 210);
        const rule = go(9, 20, 140);
        const strike = go(10, 20, 160);
        const pop = go(was ? 16 : 7, 9, 200);
        const size = Math.min(
          table ? 40 : 50,
          fitText({
            text: text.toUpperCase(),
            withinWidth: textBox,
            fontFamily: AMERYKA.font,
            fontWeight: 900,
            validateFontIsLoaded: false,
          }).fontSize,
        );
        return (
          <div
            key={i}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: table ? 18 : 22,
              padding: table ? "9px 28px 9px 24px" : "16px 34px 16px 26px",
              width: table ? width * 0.8 : undefined,
              boxSizing: "border-box",
              opacity: lf < 0 ? 0 : 1,
            }}
          >
            {o.sfx && (
              <Sequence
                from={Math.round(t0 * fps)}
                layout="none"
                showInTimeline={false}
              >
                <Audio src={src(o.sfx)} volume={o.sfxVolume ?? 0.3} />
              </Sequence>
            )}
            {/* pas flagi: skos jak pasy na masce muscle cara */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: i % 2 ? BURGUNDY : BLACK,
                transform: `skewX(-12deg) scaleX(${band})`,
                transformOrigin: "left",
                borderRadius: 6,
                boxShadow: "0 14px 34px rgba(2,2,3,0.35)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: 4,
                background: GOLD,
                transform: `skewX(-12deg) scaleX(${rule})`,
                transformOrigin: "left",
              }}
            />
            <div
              style={{
                position: "relative",
                transform: `scale(${star}) rotate(${(1 - star) * -144}deg)`,
              }}
            >
              <Star size={table ? 34 : 44} />
            </div>
            <div
              style={{
                position: "relative",
                fontWeight: 400,
                fontSize: 24,
                letterSpacing: "0.2em",
                color: GOLD,
                opacity: rise,
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </div>
            <div style={{ position: "relative", flex: table ? 1 : undefined }}>
              <div style={{ overflow: "hidden", padding: "0 4px" }}>
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: size,
                    lineHeight: 1.1,
                    letterSpacing: "-0.01em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    color: CREAM,
                    transform: `translateY(${(1 - rise) * 110}%)`,
                  }}
                >
                  {text}
                </div>
              </div>
              {sub && (
                <div
                  style={{
                    padding: "2px 4px 0",
                    fontWeight: 400,
                    fontSize: 24,
                    lineHeight: 1.2,
                    color: CREAM,
                    opacity: 0.88 * rule,
                    whiteSpace: "nowrap",
                  }}
                >
                  {sub}
                </div>
              )}
            </div>
            {was && (
              <div
                style={{
                  position: "relative",
                  fontWeight: 600,
                  fontSize: 36,
                  color: CREAM,
                  opacity: rise * (1 - 0.45 * strike),
                }}
              >
                {was}
                <div
                  style={{
                    position: "absolute",
                    left: -6,
                    right: -6,
                    top: "52%",
                    height: 4,
                    background: CREAM,
                    transform: `rotate(-8deg) scaleX(${strike})`,
                    transformOrigin: "left",
                  }}
                />
              </div>
            )}
            {value && (
              <div
                style={{
                  position: "relative",
                  minWidth: 112,
                  textAlign: "center",
                  fontWeight: 900,
                  fontSize: 46,
                  lineHeight: 1,
                  padding: "6px 12px",
                  borderRadius: 6,
                  background: GOLD,
                  color: BLACK,
                  fontVariantNumeric: "tabular-nums",
                  transform: `scale(${pop}) rotate(${(1 - pop) * -10}deg)`,
                }}
              >
                {value}
              </div>
            )}
          </div>
        );
      })}
      {o.source && (
        <div
          style={{
            maxWidth: width * 0.8,
            marginTop: 2,
            padding: "6px 12px",
            borderRadius: 6,
            background: BLACK,
            fontWeight: 400,
            fontSize: 22,
            lineHeight: 1.3,
            color: MUTED,
            opacity: interpolate(f, [12, 24], [0, 1], clamp),
          }}
        >
          Źródło: {o.source}
        </div>
      )}
    </div>
  );
};

// Auto z przebitki (przezroczysty PNG, media `fit: "overlay"`): czarna karta ze złotą krawędzią,
// auto wjeżdża z prawej z rozmyciem ruchu i hamuje, złota linia drogi, metka `text`; wyjeżdża w lewo.
const CarCard: React.FC<OverlayProps> = ({ o, dur, src }) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const h = o.size ?? 280;
  // karta obejmuje auto (aspect = wysokość/szerokość PNG), bez aspect szerokość karty z napisami
  const cardW = o.aspect
    ? Math.min(width * 0.8, h / o.aspect + 140)
    : width * 0.8;
  const card = spring({
    frame: f,
    fps,
    config: { damping: 18, stiffness: 150, mass: 0.8 },
  });
  // mało tłumienia = auto lekko przejeżdża środek i cofa się jak przy hamowaniu
  const drive = spring({
    frame: f - 4,
    fps,
    config: { damping: 13, stiffness: 90 },
  });
  const away = interpolate(f, [dur - 14, dur - 3], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  const fade = interpolate(f, [dur - 8, dur], [1, 0], clamp);
  const road = spring({
    frame: f - 10,
    fps,
    config: { damping: 20, stiffness: 140 },
  });
  const speed = Math.abs(1 - drive) + away;
  return (
    <div
      style={{
        position: "absolute",
        left: (o.x ?? 0.5) * width,
        top: (o.y ?? 0.23) * height,
        width: cardW,
        transform: `translate(-50%, -50%) translateY(${(1 - card) * -40}px) scale(${0.94 + 0.06 * card})`,
        opacity: Math.min(card, fade),
        background: BLACK,
        border: `2px solid ${AMERYKA.cardBorder}`,
        borderRadius: AMERYKA.radius,
        boxShadow: "0 24px 60px rgba(2,2,3,0.35)",
        padding: "24px 28px 20px",
        boxSizing: "border-box",
        overflow: "hidden",
        fontFamily: AMERYKA.font,
      }}
    >
      {o.sfx && <Audio src={src(o.sfx)} volume={o.sfxVolume ?? 0.3} />}
      {o.text && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontWeight: 400,
            fontSize: 26,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: GOLD,
            opacity: card,
          }}
        >
          <Star size={22} />
          {o.text}
        </div>
      )}
      <div style={{ position: "relative", height: h, marginTop: 10 }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 4,
            height: 3,
            background: GOLD,
            opacity: 0.8,
            transform: `scaleX(${road})`,
            transformOrigin: "right",
          }}
        />
        <Img
          src={src(o.src!)}
          style={{
            position: "absolute",
            left: "50%",
            bottom: 0,
            height: h,
            transform: `translateX(calc(-50% + ${(1 - drive) * cardW * 1.1 - away * cardW * 1.2}px)) skewX(${-(1 - drive) * 10 + away * 8}deg)`,
            filter: `blur(${Math.min(8, speed * 10)}px) drop-shadow(0 14px 16px rgba(2,2,3,0.7))`,
          }}
        />
      </div>
    </div>
  );
};

// Subtelny wysyp dolarów przy cenie (`dollars`): banknoty (krem, złota ramka, czarno-złota pieczęć)
// i złote monety z czarnym „$” wylatują zza napisu z ceną (x, y = start), łukiem opadają i gasną
// w ~1,3 s. Grafiki leżą pod napisami, więc liczba zostaje czytelna. `size` = liczba sztuk.
const Bill: React.FC = () => (
  <div
    style={{
      width: 78,
      height: 38,
      boxSizing: "border-box",
      borderRadius: 4,
      background: CREAM,
      border: `2px solid ${GOLD}`,
      boxShadow: "0 6px 14px rgba(2,2,3,0.45)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        background: BLACK,
        color: GOLD,
        fontWeight: 900,
        fontSize: 15,
        lineHeight: "22px",
        textAlign: "center",
      }}
    >
      $
    </div>
  </div>
);

const Coin: React.FC<{ flip: number }> = ({ flip }) => (
  <div
    style={{
      width: 44,
      height: 44,
      borderRadius: 22,
      background: GOLD,
      boxShadow:
        "inset 0 0 0 3px rgba(2,2,3,0.22), 0 6px 14px rgba(2,2,3,0.45)",
      color: BLACK,
      fontWeight: 900,
      fontSize: 26,
      lineHeight: "44px",
      textAlign: "center",
      transform: `scaleX(${flip})`,
    }}
  >
    $
  </div>
);

const Dollars: React.FC<OverlayProps> = ({ o, src }) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const x0 = (o.x ?? 0.5) * width;
  const y0 = (o.y ?? AMERYKA.y) * height;
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: AMERYKA.font }}>
      {o.sfx && <Audio src={src(o.sfx)} volume={o.sfxVolume ?? 0.3} />}
      {Array.from({ length: o.size ?? 8 }, (_, i) => {
        const r = (k: string) => random(`${o.start}-${i}-${k}`);
        const side = i % 2 ? 1 : -1;
        const delay = Math.floor(r("d") * 6);
        const t = (f - delay) / fps;
        if (t < 0) return null;
        // wybuch na boki z małym podbiciem (≤50 px — twarz nad napisem zostaje czysta), potem opadanie
        const x = x0 + side * (40 + r("o") * 80 + (220 + r("x") * 300) * t);
        const y = y0 + r("v") * 40 - (100 + r("y") * 160) * t + 350 * t * t;
        const life = 1.1 + r("l") * 0.35;
        const pop = spring({
          frame: f - delay,
          fps,
          config: { damping: 10, stiffness: 220 },
        });
        const fade = interpolate(t, [life - 0.35, life], [1, 0], clamp);
        const bill = i % 3 === 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: `translate(-50%, -50%) rotate(${side * (r("r") * 25 + t * (bill ? 90 : 30))}deg) scale(${pop * (0.8 + r("s") * 0.35)})`,
              opacity: 0.95 * fade,
            }}
          >
            {bill ? <Bill /> : <Coin flip={Math.cos(t * 9 + r("f") * 6)} />}
          </div>
        );
      })}
    </div>
  );
};

// Flaga USA (barwy Old Glory) falująca na wietrze: jeden rysunek w <defs>, pocięty na pionowe
// paski, każdy przesunięty po sinusie i przyciemniony na zboczu fali. Wjeżdża sprężyście, wychodzi szybciej.
const FlagUSA: React.FC<OverlayProps> = ({ o, src }) => {
  const f = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const W = o.size ?? 400;
  const H = (W * 10) / 19;
  const id = `flag-${o.start}`;
  const t = f / fps;
  const s = spring({ frame: f, fps, config: { damping: 12, stiffness: 160 } });
  const out = interpolate(
    f,
    [durationInFrames - 8, durationInFrames],
    [1, 0],
    clamp,
  );
  const N = 32;
  const sw = W / N;
  const amp = W * 0.035;
  const phase = (x: number) => (x / W) * Math.PI * 2.2 - t * 7;
  const stripe = H / 13;
  const canton = { w: W * 0.4, h: stripe * 7 };
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {o.sfx && <Audio src={src(o.sfx)} volume={o.sfxVolume ?? 0.3} />}
      <svg
        width={W}
        height={H + amp * 4}
        viewBox={`0 ${-amp * 2} ${W} ${H + amp * 4}`}
        style={{
          position: "absolute",
          left: (o.x ?? 0.5) * width - W / 2,
          top: (o.y ?? 0.75) * height - H / 2 - amp * 2,
          opacity: out,
          transform: `translateY(${(1 - s) * 80}px) rotate(${(1 - s) * -8}deg) scale(${0.7 + 0.3 * s})`,
          filter: "drop-shadow(0 10px 24px rgba(2,2,3,0.55))",
          overflow: "visible",
        }}
      >
        <defs>
          <g id={id}>
            {Array.from({ length: 13 }, (_, i) => (
              <rect
                key={i}
                y={i * stripe}
                width={W}
                height={stripe + 0.5}
                fill={i % 2 ? "#FFFFFF" : "#B22234"}
              />
            ))}
            <rect width={canton.w} height={canton.h} fill="#3C3B6E" />
            {Array.from({ length: 9 }, (_, r) =>
              Array.from({ length: r % 2 ? 5 : 6 }, (_, c) => (
                <circle
                  key={`${r}-${c}`}
                  cx={(canton.w / 12) * (c * 2 + (r % 2 ? 2 : 1))}
                  cy={(canton.h / 10) * (r + 1)}
                  r={stripe * 0.28}
                  fill="#FFFFFF"
                />
              )),
            )}
          </g>
          {Array.from({ length: N }, (_, i) => (
            <clipPath key={i} id={`${id}-${i}`}>
              <rect x={i * sw - 0.5} width={sw + 1} height={H} />
            </clipPath>
          ))}
        </defs>
        {Array.from({ length: N }, (_, i) => {
          const x = (i + 0.5) * sw;
          // przy drzewcu (lewo) flaga stoi, fala rośnie ku wolnemu końcowi
          const dy = Math.sin(phase(x)) * amp * (0.3 + (0.7 * x) / W);
          const shade = Math.cos(phase(x));
          return (
            <g key={i} transform={`translate(0 ${dy})`}>
              <use href={`#${id}`} clipPath={`url(#${id}-${i})`} />
              <rect
                x={i * sw - 0.5}
                width={sw + 1}
                height={H}
                fill={shade > 0 ? "#FFFFFF" : "#020203"}
                opacity={Math.abs(shade) * (shade > 0 ? 0.12 : 0.22)}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Pop/kasa przy tytule-haku i CTA (`sfx`); media `card` gra swój `sfx` w silniku Bisanza.
const WithSfx: React.FC<OverlayProps> = (props) => (
  <>
    {props.o.sfx && props.o.type !== "media" && (
      <Audio src={props.src(props.o.sfx)} volume={props.o.sfxVolume ?? 0.3} />
    )}
    <Base {...props} />
  </>
);

export const AmerykaOverlay: React.FC<OverlayProps> = (props) =>
  props.o.type === "list" ? (
    <FlagList {...props} />
  ) : props.o.type === "dollars" ? (
    <Dollars {...props} />
  ) : props.o.type === "flag" ? (
    <FlagUSA {...props} />
  ) : props.o.type === "media" &&
    props.o.fit === "overlay" &&
    /\.(png|webp)$/i.test(props.o.src ?? "") ? (
    <CarCard {...props} />
  ) : (
    <WithSfx {...props} />
  );
