import {
  AbsoluteFill,
  Freeze,
  Img,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
} from "remotion";
import type { NewsLayout, Rect } from "./layout.mjs";
import {
  cropForFace,
  layoutAt,
  speakerWindowAt,
  steadyFaceRect,
} from "./layout.mjs";
import type { Framing } from "./framing.mjs";
import type { Segment } from "../Reel";

// All panes decode the same source time. Only the first pane carries audio.
export const HappyNewsSource: React.FC<{
  reel: string;
  source: string;
  segment: Segment;
  fps: number;
  framing: Framing;
}> = ({ reel, source, segment, fps, framing }) => {
  const frame = useCurrentFrame();
  const layout = layoutAt(framing, segment.start + frame / fps);
  if (!layout) return null;
  const ratio = framing.sourceAspect ?? 16 / 9;
  const pane = (
    rect: Rect,
    x: number,
    y: number,
    w: number,
    h: number,
    voice = false,
    contain = false,
  ) => {
    const cover = Math.max(w / (rect.width * ratio), h / rect.height);
    const draw = (factor: number, blur = false) => {
      const vw = ratio * factor,
        vh = factor;
      return (
        <div
          style={{
            position: "absolute",
            left: (w - rect.width * vw) / 2,
            top: (h - rect.height * vh) / 2,
            width: rect.width * vw,
            height: rect.height * vh,
            overflow: "hidden",
            filter: blur ? "blur(28px) brightness(.7)" : undefined,
            transform: blur ? "scale(1.12)" : undefined,
          }}
        >
          <OffthreadVideo
            src={staticFile(`reels/${reel}/${source}`)}
            trimBefore={Math.round(segment.start * fps)}
            muted={blur || !voice}
            toneMapped={false}
            style={{
              position: "absolute",
              maxWidth: "none",
              width: vw,
              height: vh,
              left: -rect.x * vw,
              top: -rect.y * vh,
            }}
          />
        </div>
      );
    };
    return (
      <div
        key={`${x}-${y}`}
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: w,
          height: h,
          overflow: "hidden",
        }}
      >
        {contain && draw(cover, true)}
        {draw(
          contain ? Math.min(w / (rect.width * ratio), h / rect.height) : cover,
        )}
      </div>
    );
  };
  const media = (l: NewsLayout, y: number, h: number) =>
    l.mediaSrc ? (
      <div
        style={{
          position: "absolute",
          left: 0,
          top: y,
          width: 1080,
          height: h,
          overflow: "hidden",
        }}
      >
        <Img
          src={staticFile(`reels/${reel}/${l.mediaSrc}`)}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "blur(28px) brightness(.7)",
            transform: "scale(1.12)",
          }}
        />
        <Img
          src={staticFile(`reels/${reel}/${l.mediaSrc}`)}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      </div>
    ) : (
      pane(l.media!, 0, y, 1080, h, false, true)
    );

  const person = (
    l: NewsLayout,
    i: number,
    x: number,
    y: number,
    w: number,
    h: number,
    voice = false,
  ) =>
    pane(
      cropForFace(
        steadyFaceRect(framing, l, i),
        w / h,
        ratio,
        l.kind === "duo" && i === 1 ? 0.4 : 0.48,
      ),
      x,
      y,
      w,
      h,
      voice,
    );
  if (layout.kind === "speaker") {
    const window = speakerWindowAt(framing, segment.start + frame / fps)!;
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Freeze
          frame={Math.max(
            0,
            Math.round((window.shotStart - segment.start) * fps),
          )}
        >
          <OffthreadVideo
            src={staticFile(`reels/${reel}/${source}`)}
            trimBefore={Math.round(segment.start * fps)}
            muted
            toneMapped={false}
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "blur(36px) brightness(.65)",
              transform: "scale(1.12)",
            }}
          />
        </Freeze>
        <div
          style={{
            position: "absolute",
            left: window.left,
            top: window.top,
            width: window.width,
            height: window.height,
            overflow: "hidden",
          }}
        >
          <OffthreadVideo
            src={staticFile(`reels/${reel}/${source}`)}
            trimBefore={Math.round(segment.start * fps)}
            toneMapped={false}
            style={{
              position: "absolute",
              maxWidth: "none",
              width: window.videoWidth,
              height: window.videoHeight,
              left: window.videoLeft,
              top: window.videoTop,
            }}
          />
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ background: "#0B0B0F" }}>
      {layout.kind === "duo" ? (
        <>
          {person(layout, 0, 0, 0, 1080, 960, true)}
          {person(layout, 1, 0, 960, 1080, 960)}
        </>
      ) : layout.kind === "duo-media" ? (
        <>
          {person(layout, 0, 0, 0, 540, 1152, true)}
          {person(layout, 1, 540, 0, 540, 1152)}
          {media(layout, 1152, 768)}
        </>
      ) : (
        <>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 1080,
              height: 960,
              overflow: "hidden",
            }}
          >
            <Freeze frame={0}>
              <OffthreadVideo
                src={staticFile(`reels/${reel}/${source}`)}
                trimBefore={Math.round(segment.start * fps)}
                muted
                toneMapped={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "blur(32px) brightness(.65)",
                  transform: "scale(1.12)",
                }}
              />
            </Freeze>
          </div>
          {person(layout, 0, 0, 280, 1080, 680, true)}
          {media(layout, 960, 960)}
        </>
      )}
    </AbsoluteFill>
  );
};
export const HappyNewsCredit = () => (
  <div
    style={{
      position: "absolute",
      top: 220,
      left: 64,
      width: 864,
      textAlign: "center",
      fontFamily: "Poppins",
      fontSize: 27.6,
      fontWeight: 800,
      color: "#fff",
      lineHeight: 1.25,
    }}
  >
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: "rgba(11,11,15,.94)",
        padding: "2px 7px",
      }}
    >
      <svg width="26" height="19" viewBox="0 0 30 22" aria-label="YouTube">
        <rect width="30" height="22" rx="5" fill="#FF0033" />
        <path d="M12 6 L22 11 L12 16 Z" fill="white" />
      </svg>
      Pełny materiał dostępny na
    </span>
    <br />
    <span
      style={{
        display: "inline-block",
        background: "rgba(11,11,15,.94)",
        padding: "2px 7px",
        fontSize: 31.2,
      }}
    >
      @ONLYHAPPYNEWS
    </span>
  </div>
);
