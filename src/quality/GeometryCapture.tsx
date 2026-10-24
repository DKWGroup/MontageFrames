import { useLayoutEffect, type ReactNode } from "react";
import { useCurrentFrame, useDelayRender } from "remotion";
import {
  isolateGeometryElement,
  restoreGeometryIsolation,
} from "./geometry-raster.mjs";
import { collectGeometryFrame } from "./geometry-dom.mjs";
import type { GeometryItem } from "./geometry-plan.mjs";

export const GeometryScope: React.FC<{
  enabled: boolean;
  id: string;
  role: string;
  children: ReactNode;
}> = ({ enabled, id, role, children }) =>
  enabled ? (
    <div
      data-quality-id={id}
      data-quality-role={role}
      style={{ display: "contents" }}
    >
      {children}
    </div>
  ) : (
    <>{children}</>
  );

export const GeometryCapture: React.FC<{
  signature: string;
  expected: GeometryItem[];
  ready: boolean;
  rasterTarget?: string;
}> = ({ signature, expected, ready, rasterTarget }) => {
  const frame = useCurrentFrame(),
    { delayRender, continueRender, cancelRender } = useDelayRender();
  const encoded = JSON.stringify(expected);
  useLayoutEffect(() => {
    if (!ready) return;
    let active = true,
      raf = 0;
    const handle = delayRender("Pomiar geometrii");
    document.fonts.ready
      .then(() => {
        if (!active) return;
        raf = requestAnimationFrame(() => {
          raf = requestAnimationFrame(() => {
            if (!active) return;
            try {
              const result = collectGeometryFrame({
                frame,
                expected: JSON.parse(encoded),
              });
              console.log(
                "MF_GEOMETRY:" +
                  JSON.stringify({
                    manifestSignature: signature,
                    ...result,
                    ...(rasterTarget
                      ? {
                          isolation: isolateGeometryElement({
                            id: rasterTarget,
                          }),
                        }
                      : {}),
                  }),
              );
              continueRender(handle);
            } catch (e) {
              cancelRender(e instanceof Error ? e : new Error(String(e)));
            }
          });
        });
      })
      .catch((e) => {
        if (active) cancelRender(e);
      });
    return () => {
      active = false;
      restoreGeometryIsolation();
      cancelAnimationFrame(raf);
      continueRender(handle);
    };
  }, [
    signature,
    rasterTarget,
    encoded,
    frame,
    ready,
    delayRender,
    continueRender,
    cancelRender,
  ]);
  return null;
};
