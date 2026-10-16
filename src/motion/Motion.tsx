import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  continueRender,
  delayRender,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { MotionData } from "./schema.mjs";
import { loadFonts } from '../fonts';
import { cancelRender } from 'remotion';
const brandFont = (data: MotionData) => data.font ? 'MotionBrand_' + [...data.font].reduce((h,c)=>(Math.imul(h,31)+c.charCodeAt(0))>>>0,0).toString(36) : 'Nunito';
export type MotionProps = { data: MotionData; draft?: boolean };
const Shot = ({
  shot,
  data,
  draft,
}: {
  shot: MotionData["shots"][number];
  data: MotionData;
  draft: boolean;
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const portrait = height > width;
  const enter = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 150, mass: 0.8 },
  });
  const font = Math.min(width * 0.078, height * 0.095);
  const shortWords = (s: string) =>
    s.replace(/\b([aiouwz]|do|na|od|po|za|ze|we) /gi, "$1\u00a0");
  return (
    <AbsoluteFill
      style={{
        background: "#1A0F08",
        color: "#FFF6EE",
        fontFamily: brandFont(data) + ', sans-serif',
        padding: `${height * 0.14}px ${width * 0.085}px ${height * 0.25}px`,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 24,
          alignItems: "center",
          fontSize: width * 0.033,
          fontWeight: 800,
          color: "rgba(255,246,238,0.7)",
        }}
      >
        {data.logo && (
          <Img
            src={staticFile(data.logo)}
            style={{
              width: width * 0.12,
              height: height * 0.055,
              objectFit: "contain",
            }}
          />
        )}
        {data.brand}
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: portrait ? "column" : "row",
          alignItems: portrait ? "stretch" : "center",
          justifyContent: "center",
          gap: height * 0.03,
          transform: `translateY(${(1 - enter) * 60}px)`,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: height * 0.025,
          }}
        >
          <div
            style={{
              width: width * 0.14,
              height: 8,
              background: data.accent,
              transform: `scaleX(${enter})`,
              transformOrigin: "left",
            }}
          />
          <h1
            style={{
              fontSize: font,
              lineHeight: 1.07,
              letterSpacing: "-0.035em",
              margin: 0,
              fontWeight: 900,
              overflowWrap: "break-word",
            }}
          >
            {shortWords(shot.title)}
          </h1>
          <p
            style={{
              fontSize: font * 0.44,
              lineHeight: 1.4,
              margin: 0,
              maxWidth: "32em",
            }}
          >
            {shortWords(shot.body)}
          </p>
        </div>
        {shot.asset && (
          <Img
            src={staticFile(shot.asset)}
            style={{
              width: portrait ? "100%" : "44%",
              maxHeight: height * (portrait ? 0.24 : 0.48),
              objectFit: "contain",
              borderRadius: 24,
            }}
          />
        )}
      </div>
      {draft && (
        <div
          style={{
            position: "absolute",
            bottom: height * 0.1,
            left: width * 0.085,
            fontSize: width * 0.025,
            color: "#FF6B1A",
          }}
        >
          Szkic • niezatwierdzony
        </div>
      )}
    </AbsoluteFill>
  );
};
export const Motion: React.FC<MotionProps> = (props) => <MotionFrames key={props.data.name + ':' + props.data.font} {...props} />;
const MotionFrames: React.FC<MotionProps> = ({ data, draft = true }) => {
  const [handle] = useState(() => delayRender('Font marki / Nunito'));
  const fontPath = data.font;
  const family = brandFont(data);
  useEffect(() => {
    (async () => {
      await loadFonts();
      if(fontPath) {
        const f = await new FontFace(family, `url(${staticFile(fontPath)})`).load();
        document.fonts.add(f);
      }
      continueRender(handle);
    })().catch(e => cancelRender(e));
  }, [fontPath, family, handle]);
  return (
    <AbsoluteFill>
      {data.shots.map((s, i) => (
        <Sequence
          key={i}
          name={`${s.state}: ${s.title}`}
          from={Math.round(s.start * data.fps)}
          durationInFrames={
            Math.round(s.end * data.fps) - Math.round(s.start * data.fps)
          }
        >
          <Shot shot={s} data={data} draft={draft} />
        </Sequence>
      ))}
      {data.music && <Audio src={staticFile(data.music)} />}
    </AbsoluteFill>
  );
};
