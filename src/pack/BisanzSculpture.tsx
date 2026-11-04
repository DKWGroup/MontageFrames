import React, { useId } from "react";

type SculptureProps = { variant: "orbit" | "ribbon"; t: number };

// One asymmetric, softly inflated surface; its aperture is deliberately off axis.
const orbit =
  "M 1640 114 C 1895 76 2096 282 2071 563 C 2047 847 1835 1057 1569 1010 C 1334 968 1154 777 1174 520 C 1192 301 1389 151 1640 114 Z M 1637 327 C 1518 332 1414 419 1405 542 C 1394 679 1482 777 1586 774 C 1710 769 1814 654 1820 512 C 1826 385 1746 313 1637 327 Z";

/** Transparent, deterministic studio artwork. t is elapsed time in seconds. */
export const BisanzSculpture: React.FC<SculptureProps> = ({ variant, t }) => {
  const id = `bisanz-${useId().replace(/:/g, "")}`;
  const ref = (name: string) => `url(#${id}-${name})`;
  const drift = Math.sin(t * 0.65) * 12;
  const rotation = -11 + Math.sin(t * 0.43) * 3;

  return (
    <svg
      viewBox="0 0 1920 1080"
      width="1920"
      height="1080"
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "hidden" }}
    >
      <defs>
        <linearGradient id={`${id}-depth`} x1="0" y1="0" x2="0.85" y2="1">
          <stop stopColor="#0C56BA" />
          <stop offset="0.42" stopColor="#002962" />
          <stop offset="0.77" stopColor="#001737" />
          <stop offset="1" stopColor="#03499C" />
        </linearGradient>
        <linearGradient id={`${id}-body`} x1="0.12" y1="0.05" x2="0.84" y2="0.94">
          <stop stopColor="#86BCFF" />
          <stop offset="0.14" stopColor="#3A96FF" />
          <stop offset="0.35" stopColor="#066FED" />
          <stop offset="0.58" stopColor="#0457CF" />
          <stop offset="0.8" stopColor="#063782" />
          <stop offset="1" stopColor="#001E50" />
        </linearGradient>
        <radialGradient id={`${id}-light`} cx="0.24" cy="0.2" r="0.72">
          <stop stopColor="#C3DEFF" stopOpacity="0.8" />
          <stop offset="0.29" stopColor="#64ABFF" stopOpacity="0.3" />
          <stop offset="0.65" stopColor="#066FED" stopOpacity="0" />
          <stop offset="1" stopColor="#00132E" stopOpacity="0.6" />
        </radialGradient>
        <linearGradient id={`${id}-cavity`} x1="0.1" y1="0.05" x2="0.85" y2="0.9">
          <stop stopColor="#00152F" />
          <stop offset="0.38" stopColor="#02295F" />
          <stop offset="0.78" stopColor="#107AF3" />
          <stop offset="1" stopColor="#8BC5FF" />
        </linearGradient>
        <linearGradient id={`${id}-satin`} x1="0.16" y1="0" x2="0.88" y2="1">
          <stop stopColor="#033E95" />
          <stop offset="0.19" stopColor="#0877F8" />
          <stop offset="0.36" stopColor="#70B5FF" />
          <stop offset="0.47" stopColor="#238AFF" />
          <stop offset="0.64" stopColor="#066FED" />
          <stop offset="0.85" stopColor="#02449E" />
          <stop offset="1" stopColor="#001D47" />
        </linearGradient>
        <linearGradient id={`${id}-fold`} x1="0" y1="0.1" x2="0.9" y2="1">
          <stop stopColor="#00172F" />
          <stop offset="0.32" stopColor="#00377C" />
          <stop offset="0.69" stopColor="#066FED" />
          <stop offset="1" stopColor="#4CA2FF" />
        </linearGradient>
        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#B6D9FF" stopOpacity="0.8" />
          <stop offset="0.5" stopColor="#6EB5FF" stopOpacity="0.3" />
          <stop offset="1" stopColor="#066FED" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g transform={`translate(0 ${drift}) rotate(${rotation} 1640 550)`}>
        {variant === "orbit" ? (
          <>
            <path d={orbit} fill={ref("depth")} fillRule="evenodd" transform="translate(19 31)" />
            <path d={orbit} fill={ref("body")} fillRule="evenodd" />
            <path d={orbit} fill={ref("light")} fillRule="evenodd" />
            <path
              d="M 1637 327 C 1518 332 1414 419 1405 542 C 1394 679 1482 777 1586 774 C 1710 769 1814 654 1820 512 C 1826 385 1746 313 1637 327 Z M 1645 354 C 1741 344 1796 405 1787 519 C 1776 644 1692 741 1585 749 C 1491 755 1428 671 1438 550 C 1447 442 1535 360 1645 354 Z"
              fill={ref("cavity")}
              fillRule="evenodd"
            />
            <path d="M 1196 501 C 1222 302 1408 157 1645 128 C 1792 110 1928 178 2003 294" fill="none" stroke={ref("edge")} strokeWidth="2.5" />
          </>
        ) : (
          <>
            {/* Rear return of the same ribbon, sinking into the central fold. */}
            <path d="M 1822 106 C 2030 209 2107 365 1994 495 C 1920 583 1700 617 1577 680 L 1395 504 C 1541 433 1753 420 1810 337 C 1855 271 1785 205 1716 165 Z" fill={ref("fold")} />
            {/* Broad face: two smooth inflections, with an inflated rolled edge. */}
            <path d="M 1822 106 C 1686 36 1478 89 1344 223 C 1213 353 1234 492 1395 580 C 1506 642 1721 699 1777 801 C 1830 899 1696 999 1530 1047 L 1779 1115 C 1994 1030 2045 876 1952 737 C 1861 601 1627 541 1511 467 C 1416 406 1437 327 1524 261 C 1617 190 1724 166 1822 191 Z" fill={ref("depth")} transform="translate(14 20)" />
            <path d="M 1822 106 C 1686 36 1478 89 1344 223 C 1213 353 1234 492 1395 580 C 1506 642 1721 699 1777 801 C 1830 899 1696 999 1530 1047 L 1779 1115 C 1994 1030 2045 876 1952 737 C 1861 601 1627 541 1511 467 C 1416 406 1437 327 1524 261 C 1617 190 1724 166 1822 191 Z" fill={ref("satin")} />
            <path d="M 1822 106 C 1686 36 1478 89 1344 223 C 1213 353 1234 492 1395 580 C 1506 642 1721 699 1777 801" fill="none" stroke={ref("edge")} strokeWidth="3" />
            <path d="M 1511 467 C 1627 541 1861 601 1952 737 C 1997 805 2011 875 1980 943 C 1951 815 1812 737 1669 669 C 1547 611 1453 551 1395 504 C 1432 514 1474 495 1511 467 Z" fill={ref("fold")} opacity="0.44" />
          </>
        )}
      </g>
    </svg>
  );
};
