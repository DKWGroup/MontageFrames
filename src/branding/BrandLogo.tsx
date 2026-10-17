import { Img, staticFile, useVideoConfig } from "remotion";
import type { BrandingSnapshot } from "./types";
export const BrandLogo: React.FC<{ branding?: BrandingSnapshot }> = ({
  branding,
}) => {
  const { width } = useVideoConfig();
  const logo = branding?.logo.enabled
    ? branding.assets.find((a) => a.id === branding.logo.assetId)
    : null;
  if (!logo || !branding) return null;
  return (
    <Img
      src={staticFile(logo.file)}
      style={{
        position: "absolute",
        top: "14%",
        ...(branding.logo.position === "top-right"
          ? { right: "14%" }
          : { left: "8%" }),
        width: width * branding.logo.size,
        maxHeight: width * 0.25,
        objectFit: "contain",
      }}
    />
  );
};
