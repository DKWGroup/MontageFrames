import { spawn } from "node:child_process";
function size(width, height) {
  if (
    ![width, height].every((n) => Number.isSafeInteger(n) && n > 0 && n <= 4096)
  )
    throw Error("Nieprawidłowy rozmiar rastra");
  return width * height * 4;
}
export function alphaBounds(rgba, width, height) {
  if (rgba.length !== size(width, height))
    throw Error("Nieprawidłowy rozmiar danych RGBA");
  let left = width,
    top = height,
    right = -1,
    bottom = -1,
    pixels = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (rgba[(y * width + x) * 4 + 3] > 0) {
        pixels++;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
  return pixels
    ? {
        x: left,
        y: top,
        width: right - left + 1,
        height: bottom - top + 1,
        pixels,
        touchesEdge:
          left === 0 ||
          top === 0 ||
          right === width - 1 ||
          bottom === height - 1,
      }
    : null;
}
export async function decodePngRgba(png, width, height, { signal } = {}) {
  const expected = size(width, height);
  if (
    !Buffer.isBuffer(png) ||
    png.length < 24 ||
    !png
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    png.readUInt32BE(16) !== width ||
    png.readUInt32BE(20) !== height
  )
    throw Error("PNG ma inne wymiary niż render kontrolny");
  return new Promise((resolve, reject) => {
    const child = spawn(
      "ffmpeg",
      [
        "-v",
        "error",
        "-xerror",
        "-i",
        "pipe:0",
        "-frames:v",
        "1",
        "-threads",
        "1",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgba",
        "pipe:1",
      ],
      { signal, stdio: ["pipe", "pipe", "pipe"] },
    );
    const chunks = [];
    let bytes = 0,
      error = "";
    child.on("error", reject);
    child.stdin.on("error", () => {});
    child.stdout.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > expected) {
        child.kill();
        reject(Error("Nadmierny rozmiar rastra"));
      } else chunks.push(chunk);
    });
    child.stderr.on("data", (chunk) => {
      error = (error + chunk.toString()).slice(-4096);
    });
    const timer = setTimeout(() => {
      child.kill();
      reject(Error("Przekroczono czas dekodowania maski"));
    }, 30000);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 || bytes !== expected)
        reject(Error("Nie można odczytać rastra: " + error));
      else resolve(Buffer.concat(chunks));
    });
    child.stdin.end(png);
  });
}
