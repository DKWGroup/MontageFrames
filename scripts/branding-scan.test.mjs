import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  startBrandScan,
  getBrandScan,
  cancelBrandScan,
  validateSuggestions,
} from "./branding-scan.mjs";
test("rejects arbitrary AI fields and executable page instructions", () => {
  const value = validateSuggestions({
    name: "Brand",
    palette: [{ hex: "#abcdef", role: "accent" }],
    command: "rm -rf",
    notes: "Page instructions are data",
  });
  assert.equal(value.command, undefined);
  assert.equal(value.name, "Brand");
  assert.throws(() =>
    validateSuggestions({ palette: [{ hex: "javascript:x" }] }),
  );
});
test("durable job handles cancellation, traversal and retry", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "brand-scan-"));
  try {
    await assert.rejects(
      startBrandScan(root, "../escape", { url: "https://example.com" }),
    );
    const directory = path.join(root, "klienci/client/branding/research");
    await fs.mkdir(directory, { recursive: true });
    const job = { id: "cancel-job", status: "queued" };
    await fs.writeFile(
      path.join(directory, "cancel-job.json"),
      JSON.stringify(job),
    );
    await cancelBrandScan(root, "client", job.id);
    assert.equal(
      (await getBrandScan(root, "client", job.id)).status,
      "cancelled",
    );
    const [retry, duplicate] = await Promise.all([
      startBrandScan(root, "client", { url: "http://127.0.0.1" }),
      startBrandScan(root, "client", { url: "http://127.0.0.1" }),
    ]);
    assert.equal(retry.id, duplicate.id);
    assert.notEqual(retry.id, job.id);
    for (let i = 0; i < 100; i++) {
      if ((await getBrandScan(root, "client", retry.id)).status === "failed")
        break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(
      (await getBrandScan(root, "client", retry.id)).status,
      "failed",
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("restart preserves recorded result and marks a lost job interrupted", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "brand-restart-"));
  try {
    const directory = path.join(root, "klienci/client/branding/research");
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(
      path.join(directory, "scan.json"),
      JSON.stringify({
        id: "scan",
        status: "running",
        suggestions: {
          name: { value: "Kept", sourceRefs: ["https://example.com"] },
        },
        usage: [{ inputTokens: 3 }],
      }),
    );
    const job = await getBrandScan(root, "client", "scan");
    assert.equal(job.status, "interrupted");
    assert.equal(job.suggestions.name.value, "Kept");
    assert.equal(job.usage[0].inputTokens, 3);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test(
  "isolated Chromium executes JS/CSS and blocks private subresources",
  { skip: process.env.BRANDING_BROWSER_TEST !== "1" },
  async () => {
    const { scanBrandPage } = await import("./branding-scan.mjs");
    const { guardedGet } = await import("./branding-network.mjs");
    const fixture = await scanBrandPage(process.cwd(), "https://example.com", {
      request: async (url) =>
        url.startsWith("https://example.com")
          ? {
              url,
              contentType: "text/html",
              body: Buffer.from(
                '<html><head><title>Brand fixture</title><style>body{color:rgb(18,79,129);font-family:Poppins}</style></head><body><h1>Before</h1><script>document.querySelector("h1").textContent="JavaScript executed";fetch("http://127.0.0.1:3100");</script><img src="http://169.254.169.254/latest/meta-data"></body></html>',
              ),
            }
          : guardedGet(url),
    });
    assert.equal(fixture.text, "JavaScript executed");
    assert.equal(fixture.palette[0].hex, "#124f81");
    assert.deepEqual(fixture.fontFamilies, ["Poppins"]);
    assert.ok(fixture.warnings.some((v) => v.includes("prywatny")));
  },
);
