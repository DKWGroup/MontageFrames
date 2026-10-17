import { useEffect, useState } from "react";
import { Player } from "@remotion/player";
import { AbsoluteFill, useDelayRender, OffthreadVideo } from "remotion";
import type { BrandingSnapshot } from "./types";
import { Brand } from "../styles/brand";
import { BrandLogo } from "./BrandLogo";
import { loadBrandFonts } from "./fonts";

const SAMPLE = ["Twoja", "marka.", "Twój", "własny", "styl."];
export const BrandPreviewScene: React.FC<{
  branding: BrandingSnapshot;
  source?: string;
}> = ({ branding, source }) => {
  const [ready, setReady] = useState(false);
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  useEffect(() => {
    let active = true;
    setReady(false);
    const handle = delayRender("Fonty brandingu");
    const pending = branding.fonts.primary
      ? loadBrandFonts(branding)
      : Promise.resolve();
    pending
      .then(() => {
        if (active) setReady(true);
        continueRender(handle);
      })
      .catch((e) => {
        if (active) cancelRender(e);
        else continueRender(handle);
      });
    return () => {
      active = false;
    };
  }, [branding, delayRender, continueRender, cancelRender]);
  const words = SAMPLE.map((text, i) => ({
    text,
    start: i * 0.4,
    end: i * 0.4 + 0.35,
    at: i * 0.4,
    key: i === 1,
    hl: i === 1,
  }));
  return (
    <AbsoluteFill style={{ backgroundColor: "#26364D" }}>
      {source && (
        <OffthreadVideo
          src={source}
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
      <div
        style={{
          position: "absolute",
          top: "24%",
          left: "12%",
          right: "12%",
          color: "#FFFFFF",
          fontFamily: "sans-serif",
          fontSize: 34,
          lineHeight: 1.5,
          textAlign: "center",
        }}
      >
        Podgląd brandingu
        <br />
        Tekst przykładowy
      </div>
      {ready && (
        <>
          <BrandLogo branding={branding} />
          <Brand
            branding={branding}
            group={{ words, key: 1 }}
            words={words}
            raised={false}
            durationInFrames={120}
          />
        </>
      )}
    </AbsoluteFill>
  );
};
export const BrandPreview: React.FC<{
  branding: BrandingSnapshot;
  source?: string;
  autoPlay?: boolean;
}> = (props) => (
  <Player
    component={BrandPreviewScene}
    inputProps={props}
    durationInFrames={120}
    fps={30}
    compositionWidth={1080}
    compositionHeight={1920}
    controls
    autoPlay={props.autoPlay}
    loop
    errorFallback={({ error }) => (
      <p role="alert">
        Nie udało się wczytać podglądu: {error.message}. Sprawdź wybrany font
        lub materiał.
      </p>
    )}
    style={{ width: "100%", aspectRatio: "9 / 16" }}
  />
);
