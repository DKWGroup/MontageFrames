import {
  Audio,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AMERYKA } from "./ameryka";
import {
  kineticCaptions,
  kineticOverlay,
  type OverlayProps,
  type Theme,
} from "./bisanz";

// Vital Hormone (vital-hormone.pl): silnik ruchu Bisanza, klucz Montserrat 800 zapisem zdaniowym
// na limonkowym zaokrąglonym zakreślaczu, małe słowa Plus Jakarta 700. Grafiki jak sekcje strony:
// ciemne fioletowe i jasne „laboratoryjne” karty z radiusem 24 px, limonka jako jedyny akcent
// (nigdy na jasnym tle). Zasady, kontrasty i compliance: klienci/vital-hormone/PREFERENCJE.md
const VIOLET = "#230C4A";
const VIOLET2 = "#2C1651";
const PAPER = "#F8F9FA";
const INK = "#1A1C1D";
const LIME = "#D9F99D"; // fiolet na limonce 14,71:1
const MUTED = "#B9B3C9"; // opisy na fiolecie
const MUTED_L = "#49454F"; // opisy na jasnych kartach
const LAVENDER = "#F3F0F9";
const LINE = "rgba(217,249,157,0.18)";
const MONT = "Montserrat, sans-serif";
const JAKARTA = "'Plus Jakarta Sans', sans-serif";

export const VITAL: Theme = {
  ...AMERYKA,
  font: JAKARTA,
  keyFont: MONT,
  keySpacing: "-0.02em",
  keyCase: "none",
  markerRadius: "0.22em",
  label: { font: JAKARTA, size: 26, spacing: "0.12em" },
  text: PAPER,
  accent: LIME,
  onAccent: VIOLET,
  glow: "217,249,157",
  shade: "26,28,29",
  card: VIOLET,
  cardText: PAPER,
  cardBorder: LINE,
  cardLine: "rgba(248,249,250,0.12)",
  pill: VIOLET,
  pillText: PAPER,
  labelShadow: "0 2px 10px rgba(26,28,29,0.85)",
  keyWeight: 800,
  smallWeight: 700,
  keySize: 112,
  smallSize: 52,
  inlineKey: 88,
  inlineSmall: 52,
  shadow: "0 6px 22px rgba(26,28,29,0.6), 0 2px 4px rgba(26,28,29,0.7)",
  y: 0.73,
  // Karty stoją dolną krawędzią na 0,75 i mają do ~0,29 kadru, więc napis nad kartą kończy się na 0,44.
  yRaised: 0.44,
  radius: 24,
  ctaRadius: 100,
  marker: {
    key: [LIME, VIOLET],
    hl: [VIOLET2, PAPER],
    hlWeight: 700, // `hl` przejeżdża od lewej zamiast wyskakiwać (PREFERENCJE: mniej pop out)
  },
  raisedScale: 0.8, // napis nad kartą pod twarzą — mniejszy, żeby oba zmieściły się pod brodą
};

export const Vital = kineticCaptions(VITAL);
const Base = kineticOverlay(VITAL);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const BOTTOM = 0.75;

// Miękka sprężyna z małym przeregulowaniem („medycznie”), wyjście szybsze od wejścia.
const useMotion = (dur: number) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: f,
    fps,
    config: { damping: 16, stiffness: 120, mass: 0.9 },
  });
  const exit = interpolate(f, [dur - 8, dur], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  return { f, fps, enter, exit };
};
const ease = (f: number, fps: number, t: number, len = 0.45) =>
  interpolate(f, [t * fps, (t + len) * fps], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.exp),
  });
const pop = (f: number, fps: number, t: number) =>
  spring({
    frame: f - Math.round(t * fps),
    fps,
    config: { damping: 10, stiffness: 180 },
  });
// Elementy z `at` (czas słowa w źródle) wchodzą, gdy padają; bez `at` co `step` s.
const timed = (o: OverlayProps["o"], at: OverlayProps["at"], step = 0.1) =>
  (o.items ?? []).map((it, i) =>
    typeof it === "string"
      ? { text: it, t: 0.3 + i * step }
      : { ...it, t: it.at != null ? at(it.at) : 0.3 + i * step },
  );

const Eyebrow: React.FC<{ children: React.ReactNode; color: string }> = ({
  children,
  color,
}) => (
  <div
    style={{
      fontFamily: JAKARTA,
      fontWeight: 700,
      fontSize: 26,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color,
      marginBottom: 16,
    }}
  >
    {children}
  </div>
);

const Source: React.FC<{ children: React.ReactNode; light?: boolean }> = ({
  children,
  light,
}) => (
  <div
    style={{
      marginTop: 14,
      fontFamily: JAKARTA,
      fontWeight: 400,
      fontSize: 21,
      color: light ? MUTED_L : MUTED,
    }}
  >
    Źródło: {children}
  </div>
);

// Kółko ✓: na jasnej karcie fioletowe z limonkowym znakiem, na ciemnej odwrotnie.
const Check: React.FC<{ p: number; light: boolean }> = ({ p, light }) => (
  <div
    style={{
      width: 52,
      height: 52,
      borderRadius: 26,
      background: light ? VIOLET : LIME,
      display: "grid",
      placeItems: "center",
      flexShrink: 0,
      transform: `scale(${p})`,
    }}
  >
    <svg width={28} height={28} viewBox="0 0 24 24">
      <path
        d="M4 12.5l5 5L20 6.5"
        fill="none"
        stroke={light ? LIME : VIOLET}
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={26}
        strokeDashoffset={26 * (1 - Math.min(1, p))}
      />
    </svg>
  </div>
);

// Karta na dole (dolna krawędź 0,75) albo na wysokości `y`; jasna („wydruk z laboratorium”) lub ciemna.
const Card: React.FC<{
  o: OverlayProps["o"];
  enter: number;
  exit: number;
  light?: boolean;
  src: OverlayProps["src"];
  children: React.ReactNode;
}> = ({ o, enter, exit, light, src, children }) => {
  const { width, height } = useVideoConfig();
  return (
    <div
      style={{
        position: "absolute",
        left: (o.x ?? 0.5) * width,
        ...(o.y != null
          ? { top: o.y * height }
          : { bottom: height * (1 - BOTTOM) }),
        width: width * 0.8,
        transform: `translate(-50%, ${o.y != null ? -50 : 0}%) translateY(${(1 - enter) * 70 + exit * 30}px) scale(${0.95 + 0.05 * enter})`,
        opacity: Math.min(enter * 1.4, 1 - exit),
        background: light ? PAPER : "rgba(35,12,74,0.95)",
        border: light ? undefined : `1px solid ${LINE}`,
        borderRadius: 24,
        boxShadow: light
          ? "0 30px 70px rgba(35,12,74,0.35)"
          : "0 30px 70px rgba(26,28,29,0.45)",
        padding: "30px 38px",
        boxSizing: "border-box",
        color: light ? INK : PAPER,
        fontFamily: JAKARTA,
      }}
    >
      {o.sfx && <Audio src={src(o.sfx)} volume={o.sfxVolume ?? 0.3} />}
      {children}
      {o.source && <Source light={light}>{o.source}</Source>}
    </div>
  );
};

// `labs`: jasna karta badań (tone "dark" = ciemna) — wiersze `nazwa · opis` z ✓, wchodzą przy `at`.
const Labs: React.FC<OverlayProps> = ({ o, dur, at, src }) => {
  const { f, fps, enter, exit } = useMotion(dur);
  const light = o.tone !== "dark";
  return (
    <Card o={o} enter={enter} exit={exit} light={light} src={src}>
      {o.title && <Eyebrow color={light ? VIOLET : LIME}>{o.title}</Eyebrow>}
      {timed(o, at).map((it, i) => {
        const p = ease(f, fps, it.t);
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              padding: "12px 18px",
              marginTop: i ? 8 : 0,
              borderRadius: 16,
              background: light ? LAVENDER : VIOLET2,
              opacity: p,
              transform: `translateY(${(1 - p) * 24}px)`,
              filter: p < 0.95 ? `blur(${(1 - p) * 6}px)` : undefined,
            }}
          >
            <Check p={pop(f, fps, it.t + 0.12)} light={light} />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: MONT,
                  fontWeight: 700,
                  fontSize: 40,
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  color: light ? VIOLET : PAPER,
                }}
              >
                {it.text}
              </div>
              {it.sub && (
                <div
                  style={{
                    fontWeight: 400,
                    fontSize: 25,
                    marginTop: 4,
                    color: light ? MUTED_L : MUTED,
                  }}
                >
                  {it.sub}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </Card>
  );
};

// `steps`: kroki jak „Trzy kroki” na stronie — limonkowe kółka z numerami, linia rysuje się w dół.
const Steps: React.FC<OverlayProps> = ({ o, dur, at, src }) => {
  const { f, fps, enter, exit } = useMotion(dur);
  const items = timed(o, at, 0.35);
  return (
    <Card o={o} enter={enter} exit={exit} src={src}>
      {o.title && <Eyebrow color={LIME}>{o.title}</Eyebrow>}
      {items.map((it, i) => {
        const p = ease(f, fps, it.t);
        const more = i + 1 < items.length;
        return (
          <div key={i} style={{ display: "flex", gap: 28 }}>
            <div style={{ position: "relative", width: 64, flexShrink: 0 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  background: LIME,
                  color: VIOLET,
                  fontFamily: MONT,
                  fontWeight: 800,
                  fontSize: 32,
                  display: "grid",
                  placeItems: "center",
                  transform: `scale(${pop(f, fps, it.t)})`,
                }}
              >
                {i + 1}
              </div>
              {more && (
                <div
                  style={{
                    position: "absolute",
                    left: 30,
                    top: 72,
                    bottom: 8,
                    width: 4,
                    borderRadius: 2,
                    background: LIME,
                    opacity: 0.6,
                    transform: `scaleY(${ease(f, fps, it.t + 0.2, 0.6)})`,
                    transformOrigin: "top",
                  }}
                />
              )}
            </div>
            <div
              style={{
                paddingBottom: more ? 24 : 0,
                opacity: p,
                transform: `translateX(${(1 - p) * 30}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: MONT,
                  fontWeight: 800,
                  fontSize: 40,
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                }}
              >
                {it.text}
              </div>
              {it.sub && (
                <div style={{ fontSize: 26, color: MUTED, marginTop: 6 }}>
                  {it.sub}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </Card>
  );
};

// `process`: pełny kadr na fiolecie — łańcuch ogniw z góry na dół, ogniwa wchodzą przy `at`,
// łączniki się rysują, ostatnie ogniwo (wynik) na limonce.
const Process: React.FC<OverlayProps> = ({ o, dur, at, src }) => {
  const { f, fps, enter, exit } = useMotion(dur);
  const { width, height } = useVideoConfig();
  const items = timed(o, at, 0.6);
  const top = 0.2 * height;
  const stepH = 0.14 * height;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(35,12,74,0.96)",
        opacity: Math.min(enter * 1.5, 1 - exit),
        color: PAPER,
        fontFamily: JAKARTA,
      }}
    >
      {o.sfx && <Audio src={src(o.sfx)} volume={o.sfxVolume ?? 0.3} />}
      {o.title && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: top - 90,
            textAlign: "center",
            opacity: ease(f, fps, 0.1),
          }}
        >
          <Eyebrow color={LIME}>{o.title}</Eyebrow>
        </div>
      )}
      {items.map((it, i) => {
        const p = ease(f, fps, it.t);
        const y = top + i * stepH;
        const last = i === items.length - 1;
        return (
          <div key={i}>
            {i > 0 && (
              <div
                style={{
                  position: "absolute",
                  left: width / 2 - 2,
                  top: y - stepH + 118,
                  width: 4,
                  height: (stepH - 128) * ease(f, fps, it.t - 0.3, 0.35),
                  background: LIME,
                  borderRadius: 2,
                }}
              />
            )}
            <div
              style={{
                position: "absolute",
                left: width / 2,
                top: y,
                transform: `translateX(-50%) translateY(${(1 - p) * 30}px) scale(${0.9 + 0.1 * p})`,
                opacity: p,
                filter: p < 0.95 ? `blur(${(1 - p) * 8}px)` : undefined,
                padding: "20px 40px",
                borderRadius: 24,
                background: last ? LIME : VIOLET2,
                color: last ? VIOLET : PAPER,
                border: last ? undefined : `1px solid ${LINE}`,
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              <div
                style={{
                  fontFamily: MONT,
                  fontWeight: 800,
                  fontSize: 56,
                  letterSpacing: "-0.02em",
                }}
              >
                {it.text}
              </div>
              {it.sub && (
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 400,
                    marginTop: 2,
                    color: last ? VIOLET : MUTED,
                  }}
                >
                  {it.sub}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {o.source && (
        <div
          style={{
            position: "absolute",
            left: width * 0.08,
            right: width * 0.14,
            top: top + items.length * stepH - 20,
            textAlign: "center",
            opacity: ease(f, fps, 0.6),
          }}
        >
          <Source>{o.source}</Source>
        </div>
      )}
    </div>
  );
};

// `mythfact`: MIT (cytat kursywą na #2C1651, przekreślany limonkową kreską) → FAKT (ciemna karta, limonkowy obrys).
const MythFact: React.FC<OverlayProps> = ({ o, dur, at, src }) => {
  const { f, fps, enter, exit } = useMotion(dur);
  const [myth, fact] = timed(o, at, 1.2);
  const strike = ease(f, fps, fact.t - 0.35, 0.5);
  const pf = spring({
    frame: f - Math.round(fact.t * fps),
    fps,
    config: { damping: 14, stiffness: 140 },
  });
  const tag = (text: string, on: boolean) => (
    <span
      style={{
        display: "inline-block",
        padding: "6px 16px",
        borderRadius: 100,
        background: on ? LIME : VIOLET,
        color: on ? VIOLET : LIME,
        fontWeight: 700,
        fontSize: 24,
        letterSpacing: "0.12em",
        marginBottom: 10,
      }}
    >
      {text}
    </span>
  );
  return (
    <Card o={o} enter={enter} exit={exit} src={src}>
      <div
        style={{
          background: VIOLET2,
          borderRadius: 20,
          padding: "18px 24px",
          opacity: 1 - 0.4 * strike,
        }}
      >
        {tag("MIT", false)}
        <div
          style={{
            position: "relative",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: 36,
            lineHeight: 1.25,
          }}
        >
          <span style={{ color: LIME }}>„</span>
          {myth.text}
          <span style={{ color: LIME }}>”</span>
          <div
            style={{
              position: "absolute",
              left: -6,
              right: -6,
              top: "50%",
              height: 5,
              borderRadius: 3,
              background: LIME,
              transform: `scaleX(${strike}) rotate(-2deg)`,
              transformOrigin: "left",
            }}
          />
        </div>
      </div>
      <div
        style={{
          marginTop: 12,
          border: `2px solid ${LIME}`,
          borderRadius: 20,
          padding: "18px 24px",
          opacity: Math.min(1, pf * 1.5),
          transform: `translateY(${(1 - pf) * 30}px) scale(${0.92 + 0.08 * pf})`,
        }}
      >
        {tag("FAKT", true)}
        <div
          style={{
            fontFamily: MONT,
            fontWeight: 800,
            fontSize: 40,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}
        >
          {fact.text}
        </div>
      </div>
    </Card>
  );
};

// `quote`: zdanie kluczowe mówcy — Plus Jakarta 700 italic, limonkowy cudzysłów, na ciemnej karcie.
const Quote: React.FC<OverlayProps> = ({ o, dur, src }) => {
  const { f, fps, enter, exit } = useMotion(dur);
  return (
    <Card o={o} enter={enter} exit={exit} src={src}>
      <div
        style={{
          fontStyle: "italic",
          fontWeight: 700,
          fontSize: o.size ?? 64,
          lineHeight: 1.15,
          opacity: ease(f, fps, 0.15),
        }}
      >
        <span
          style={{
            color: LIME,
            display: "inline-block",
            transform: `scale(${pop(f, fps, 0.12)})`,
          }}
        >
          „
        </span>
        {o.text}
        <span style={{ color: LIME }}>”</span>
      </div>
      {o.label && (
        <div
          style={{
            marginTop: 18,
            fontSize: 26,
            fontWeight: 400,
            color: MUTED,
            opacity: ease(f, fps, 0.4),
          }}
        >
          {o.label}
        </div>
      )}
    </Card>
  );
};

// Tytuł-hak: Montserrat 800 zapisem zdaniowym, fragment `hl` na limonkowym zakreślaczu (pigułka).
const Title: React.FC<OverlayProps> = ({ o, dur }) => {
  const { f, fps, enter, exit } = useMotion(dur);
  const { width, height } = useVideoConfig();
  const [before, ...rest] = o.hl ? o.text!.split(o.hl) : [o.text!];
  const sweep = ease(f, fps, 0.3, 0.5);
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: (o.y ?? 0.5) * height,
        width: width * 0.8,
        transform: `translate(-50%, calc(-50% + ${(1 - enter) * 50 + exit * 20}px))`,
        opacity: Math.min(enter * 1.5, 1 - exit),
        filter: enter < 0.95 ? `blur(${(1 - enter) * 10}px)` : undefined,
        textAlign: "center",
        fontFamily: MONT,
        fontWeight: 800,
        fontSize: o.size ?? 104,
        lineHeight: 1.12,
        letterSpacing: "-0.02em",
        color: PAPER,
        textShadow: VITAL.shadow,
      }}
    >
      {before}
      {o.hl && (
        <span
          style={{
            display: "inline-block",
            position: "relative",
            padding: "0 0.18em",
          }}
        >
          {o.hl}
          <span
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              padding: "0 0.18em",
              borderRadius: "0.22em",
              background: LIME,
              color: VIOLET,
              textShadow: "none",
              clipPath: `inset(0 ${(1 - sweep) * 100}% 0 0)`,
            }}
          >
            {o.hl}
          </span>
        </span>
      )}
      {rest.join(o.hl ?? "")}
    </div>
  );
};

// CTA: limonkowa pigułka z fioletowym tekstem jak przycisk na stronie + opcjonalny `label` (adres).
const Cta: React.FC<OverlayProps> = ({ o, dur, src }) => {
  const { f, fps, enter, exit } = useMotion(dur);
  const { width, height } = useVideoConfig();
  const press =
    1 +
    0.04 * Math.sin(Math.min(1, Math.max(0, (f - 0.6 * fps) / 10)) * Math.PI);
  return (
    <div
      style={{
        position: "absolute",
        left: width / 2,
        top: (o.y ?? 0.5) * height,
        transform: `translate(-50%, -50%) translateY(${(1 - enter) * 60 + exit * 30}px)`,
        opacity: Math.min(enter * 1.5, 1 - exit),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 22,
      }}
    >
      {o.sfx && <Audio src={src(o.sfx)} volume={o.sfxVolume ?? 0.3} />}
      <div
        style={{
          background: LIME,
          color: VIOLET,
          fontFamily: JAKARTA,
          fontWeight: 700,
          fontSize: 54,
          padding: "26px 52px",
          borderRadius: 100,
          whiteSpace: "nowrap",
          transform: `scale(${press})`,
          boxShadow: "0 18px 44px rgba(35,12,74,0.55)",
        }}
      >
        {o.text}
      </div>
      {o.label && (
        <div
          style={{
            fontFamily: JAKARTA,
            fontWeight: 400,
            fontSize: 32,
            color: PAPER,
            textShadow: VITAL.labelShadow,
          }}
        >
          {o.label}
        </div>
      )}
    </div>
  );
};

export const VitalOverlay: React.FC<OverlayProps> = (props) => {
  switch (props.o.type) {
    case "title":
      return <Title {...props} />;
    case "labs":
      return <Labs {...props} />;
    case "steps":
      return <Steps {...props} />;
    case "process":
      return <Process {...props} />;
    case "mythfact":
      return <MythFact {...props} />;
    case "quote":
      return <Quote {...props} />;
    case "cta":
      return <Cta {...props} />;
    default:
      // ponytail: media/counter/bars/line z silnika Bisanza; range/checklist/price z profilu, gdy rolka ich użyje
      return <Base {...props} />;
  }
};
