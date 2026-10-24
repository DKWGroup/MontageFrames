export type Isolation = {
  id?: string;
  status: "measured" | "unknown";
  issues: string[];
  width?: number;
  height?: number;
};
export function isolateGeometryElement(input: { id: string }): Isolation;
export function restoreGeometryIsolation(): void;
