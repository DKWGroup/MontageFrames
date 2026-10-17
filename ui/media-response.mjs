import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { pipeline } from "node:stream/promises";
const qcError = (message, status) =>
  Object.assign(new Error(message), { status });
export function parseRange(value, size) {
  const m = String(value ?? "").match(/^bytes=(\d*)-(\d*)$/);
  if (!m || (!m[1] && !m[2])) throw qcError("Nieprawidłowy zakres filmu", 416);
  const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2])),
    end = m[1]
      ? m[2]
        ? Math.min(size - 1, Number(m[2]))
        : size - 1
      : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start >= size ||
    end < start
  )
    throw qcError("Zakres poza filmem", 416);
  return { start, end };
}
export async function serveMedia(req, res, file, type) {
  const st = await fs.stat(file);
  res.setHeader("Content-Type", type);
  res.setHeader("Accept-Ranges", "bytes");
  let range;
  if (req.headers.range) {
    try {
      range = parseRange(req.headers.range, st.size);
    } catch {
      res.statusCode = 416;
      res.setHeader("Content-Range", `bytes */${st.size}`);
      res.end();
      return true;
    }
    res.statusCode = 206;
    res.setHeader(
      "Content-Range",
      `bytes ${range.start}-${range.end}/${st.size}`,
    );
  }
  res.setHeader(
    "Content-Length",
    range ? range.end - range.start + 1 : st.size,
  );
  if (req.method === "HEAD") {
    res.end();
    return true;
  }
  await pipeline(createReadStream(file, range), res);
  return true;
}
