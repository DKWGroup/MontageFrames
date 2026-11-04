export type FontRef = {
  id: string;
  family: string;
  file: string;
  weight: string;
  style: "normal" | "italic";
  sha256: string;
  source: "local" | "upload" | "google" | "bundled";
  licenseFile?: string;
};
export type AssetRef = {
  id: string;
  kind: "logo" | "image" | "video";
  file: string;
  originalName: string;
  description: string;
  mime: string;
  bytes: number;
  sha256: string;
};
export type BrandingSnapshot = {
  schemaVersion: 1;
  styleId?:
    | "brand"
    | "persona"
    | "skyclass"
    | "herod"
    | "bisanz"
    | "ameryka"
    | "glowup"
    | "vital"
    | "happynews"
    | "fitnessiq"
    | "oskar";
  clientId: string;
  revision: number;
  qualityContract?: ClientContract;
  palette: {
    maxColors: 4 | 5 | 6;
    colors: {
      id: string;
      hex: string;
      role:
        | "accent"
        | "text"
        | "background"
        | "highlight"
        | "secondary"
        | "muted";
    }[];
  };
  fonts: { primary: FontRef | null; emphasis?: FontRef | null };
  captions: {
    presetId: "plain" | "kinetic" | "pop";
    emphasis: "none" | "color" | "underline";
    emojiEnabled: boolean;
    size: number;
    position: number;
  };
  logo: {
    assetId?: string;
    enabled: boolean;
    position: "top-left" | "top-right";
    size: number;
  };
  assets: AssetRef[];
};
export type ClientContract = {
  version: 1;
  hash: string;
  clientId: string | null;
  brandingRevision: number;
  styleId: NonNullable<BrandingSnapshot["styleId"]>;
  coverage: "partial";
  rules: {
    id: string;
    scope:
      | "reel"
      | "captions"
      | "camera"
      | "graphics"
      | "audio"
      | "publication";
    value: unknown;
    checkKind: "data" | "geometry" | "semantic" | "human";
    severity: "critical" | "advisory";
    source: {
      path: string;
      section: string;
      date: string;
      order: number;
      level: "default" | "general" | "branding" | "client";
      clientId?: string;
      sha256?: string;
    };
  }[];
};
export type BrandingProfile = BrandingSnapshot & {
  name: string;
  websiteUrl: string;
  businessDescription: string;
  audience: string;
  tone: string;
  notes: string;
  updatedAt?: string;
  websiteResearch?: {
    lastScanId?: string;
    acceptedFields?: string[];
    sourceRefs?: string[];
  };
};
