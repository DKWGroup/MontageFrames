import test from "node:test";
import assert from "node:assert/strict";
import { isPublicAddress, validatePublicURL } from "./branding-network.mjs";
test("blocks private, mapped, reserved and metadata addresses", () => {
  for (const ip of [
    "127.0.0.1",
    "10.0.0.2",
    "172.16.0.2",
    "192.168.1.1",
    "169.254.169.254",
    "0.0.0.0",
    "::1",
    "::ffff:7f00:1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
  ])
    assert.equal(isPublicAddress(ip), false, ip);
  for (const ip of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])
    assert.equal(isPublicAddress(ip), true, ip);
});
test("validates every DNS answer, credentials and protocol", async () => {
  for (const url of [
    "file:///etc/passwd",
    "http://user:pass@example.com",
    "http://localhost",
    "http://2130706433",
  ])
    await assert.rejects(validatePublicURL(url));
  await assert.rejects(
    validatePublicURL("https://example.com", {
      lookup: async () => [{ address: "8.8.8.8" }, { address: "127.0.0.1" }],
    }),
  );
  assert.equal(
    (
      await validatePublicURL("https://example.com", {
        lookup: async () => [{ address: "8.8.8.8", family: 4 }],
      })
    ).address,
    "8.8.8.8",
  );
});

test("pins public DNS and revalidates redirect destination", async () => {
  const https = (await import("node:https")).default;
  const { Readable } = await import("node:stream");
  const { EventEmitter } = await import("node:events");
  const { guardedGet } = await import("./branding-network.mjs");
  const original = https.get;
  let count = 0;
  https.get = (url, options, callback) => {
    count++;
    options.lookup("example.com", {}, (error, address) => {
      assert.equal(error, null);
      assert.equal(address, "8.8.8.8");
    });
    const response = Readable.from([]);
    response.statusCode = 302;
    response.headers = { location: "http://169.254.169.254/latest/meta-data" };
    globalThis.queueMicrotask(() => callback(response));
    return new EventEmitter();
  };
  try {
    await assert.rejects(
      guardedGet("https://example.com", {
        lookup: async () => [{ address: "8.8.8.8", family: 4 }],
      }),
      /prywatny/,
    );
    assert.equal(count, 1);
  } finally {
    https.get = original;
  }
});
test("DNS lookup respects cancellation", async () => {
  const controller = new AbortController();
  const pending = validatePublicURL("https://example.com", {
    signal: controller.signal,
    lookup: () => new Promise(() => {}),
  });
  controller.abort(new Error("cancelled"));
  await assert.rejects(pending, /cancelled/);
});
