export type MotionData = {
  version: 1;
  name: string;
  client: string | null;
  brand: string;
  product: string;
  url: string;
  reference: string;
  fps: 30 | 60;
  duration: number;
  formats: ("9:16" | "1:1" | "16:9")[];
  accent: string;
  logo?: string;
  font?: string;
  music?: string;
  beatGrid: { kind: "estimated"; bpm: number; offset: number };
  shots: {
    start: number;
    end: number;
    title: string;
    body: string;
    asset?: string;
    state: "hook" | "product" | "detail" | "cta";
  }[];
  reviews: {
    round: number;
    score: number;
    notes: string;
    phone: boolean;
    assets: boolean;
    timing: boolean;
  }[];
};
export function validateMotion(d: unknown): MotionData;
export function buildMotion(b: Record<string, unknown>): MotionData;
export function dimensions(f: string): [number, number];
export function productionReady(d: MotionData): boolean;
