import dns from "node:dns/promises";
import net from "node:net";
import http from "node:http";
import https from "node:https";

export function isPublicAddress(address) {
  let ip = address.toLowerCase().replace(/^\[|\]$/g, "");
  if (net.isIPv6(ip)) ip = new URL(`http://[${ip}]`).hostname.slice(1, -1);
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0 || b === 2)) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  // Only global unicast IPv6; reject transition, mapped, documentation and local ranges.
  return (
    net.isIPv6(ip) &&
    /^2|^3/.test(ip) &&
    !/^2001:(?:0:|db8:|10:|20:)/.test(ip) &&
    !ip.startsWith("2002:") &&
    !ip.startsWith("3fff:")
  );
}
export async function validatePublicURL(
  input,
  { lookup = dns.lookup, signal = globalThis.AbortSignal.timeout(30000) } = {},
) {
  signal.throwIfAborted();
  const url = new URL(input);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    !["", "80", "443"].includes(url.port)
  )
    throw new Error("Dozwolony jest publiczny adres HTTP/HTTPS bez logowania.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    (!host.includes(".") && !net.isIP(host))
  )
    throw new Error("Adres lokalny jest zablokowany.");
  const answers = net.isIP(host)
    ? [{ address: host, family: net.isIP(host) }]
    : await new Promise((resolve, reject) => {
        const abort = () => reject(signal.reason);
        signal.addEventListener("abort", abort, { once: true });
        Promise.resolve()
          .then(() => lookup(host, { all: true, verbatim: true }))
          .then(resolve, reject)
          .finally(() => signal.removeEventListener("abort", abort));
      });
  signal.throwIfAborted();
  if (!answers.length || answers.some((a) => !isPublicAddress(a.address)))
    throw new Error("Adres prywatny lub zastrzeżony jest zablokowany.");
  url.hash = "";
  return { url, ...answers[0] };
}
export async function guardedGet(
  input,
  {
    signal,
    maxBytes = 5 * 1024 * 1024,
    timeout = 30000,
    lookup,
    redirects = 5,
  } = {},
) {
  signal?.throwIfAborted();
  const combined = globalThis.AbortSignal.any([
    ...(signal ? [signal] : []),
    globalThis.AbortSignal.timeout(timeout),
  ]);
  const approved = await validatePublicURL(input, { lookup, signal: combined });
  const response = await new Promise((resolve, reject) => {
    const request = (approved.url.protocol === "https:" ? https : http).get(
      approved.url,
      {
        signal: combined,
        headers: {
          "User-Agent": "MontageFrames-Branding/1.0",
          "Accept-Encoding": "identity",
        },
        lookup: (_host, options, callback) =>
          callback(
            null,
            options.all
              ? [{ address: approved.address, family: approved.family }]
              : approved.address,
            approved.family,
          ),
      },
      (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          res.resume();
          resolve({ redirect: res.headers.location });
          return;
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          reject(new Error(`Strona zwróciła HTTP ${res.statusCode}.`));
          return;
        }
        if (Number(res.headers["content-length"]) > maxBytes) {
          res.destroy();
          reject(new Error("Dokument przekracza limit danych."));
          return;
        }
        const chunks = [];
        let bytes = 0;
        res.on("data", (chunk) => {
          bytes += chunk.length;
          if (bytes > maxBytes)
            res.destroy(new Error("Dokument przekracza limit danych."));
          else chunks.push(chunk);
        });
        res.on("error", reject);
        res.on("end", () =>
          resolve({
            url: approved.url.href,
            body: Buffer.concat(chunks),
            contentType:
              res.headers["content-type"] ?? "application/octet-stream",
          }),
        );
      },
    );
    request.on("error", reject);
  });
  if (response.redirect !== undefined) {
    if (!redirects || !response.redirect)
      throw new Error("Zbyt wiele przekierowań lub brak adresu.");
    return guardedGet(new URL(response.redirect, approved.url).href, {
      signal: combined,
      maxBytes,
      timeout,
      lookup,
      redirects: redirects - 1,
    });
  }
  return response;
}
