export type EstablishedStyleMetadata = {
  description: string;
  fonts: string[];
  colors: string[];
  requiredFonts: string[];
  position: number;
  size: number;
  emojiEnabled: boolean;
};
export const establishedStyles: Record<
  | "persona"
  | "skyclass"
  | "herod"
  | "bisanz"
  | "ameryka"
  | "glowup"
  | "vital"
  | "happynews",
  EstablishedStyleMetadata
>;
