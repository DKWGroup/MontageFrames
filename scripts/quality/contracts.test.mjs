import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  compileClientContract,
  assertContractMigration,
} from "./contracts.mjs";
import { contractForBranding } from "./client-rules.mjs";
import { defaultBranding } from "../../src/branding/schema.mjs";

const snapshot = { clientId: "skyclass", revision: 1, styleId: "skyclass" };
const rule = (value, level = "general", date = "2026-10-03", order = 0) => ({
  id: "keep-silence",
  scope: "audio",
  value,
  checkKind: "data",
  severity: "critical",
  source: {
    path:
      level === "client" ? "klienci/skyclass/PREFERENCJE.md" : "PREFERENCJE.md",
    section: "Aktualne poprawki",
    level,
    date,
    order,
    ...(level === "client" ? { clientId: "skyclass" } : {}),
  },
});
const compile = (rules) =>
  compileClientContract({
    clientId: "skyclass",
    brandingSnapshot: snapshot,
    rules,
  });

test("client overrides general even when the general rule has a later date", () => {
  const c = compile([
    rule(false, "general", "2026-10-18"),
    rule(true, "client"),
  ]);
  assert.equal(c.rules.length, 1);
  assert.equal(c.rules[0].value, true);
  assert.equal(c.rules[0].source.path, "klienci/skyclass/PREFERENCJE.md");
});
test("latest same-scope rule wins, including ordered corrections from the same day", () => {
  const a = rule(false, "client", "2026-10-03"),
    b = rule(true, "client", "2026-10-15"),
    c = rule(false, "client", "2026-10-15", 1);
  assert.equal(compile([b, a, c]).rules[0].value, false);
  assert.deepEqual(compile([a, b, c]), compile([c, b, a]));
});
test("unresolved equal-priority conflicts block publication independent of array order", () => {
  assert.throws(() => compile([rule(true), rule(false)]), /konflikt/i);
  assert.throws(() => compile([rule(false), rule(true)]), /konflikt/i);
  assert.throws(
    () =>
      compileClientContract({
        clientId: "other",
        brandingSnapshot: { clientId: "other", revision: 1 },
        rules: [rule(true, "client")],
      }),
    /klient/i,
  );
});
test("hash freezes provenance and values, not object insertion order or mutable input", () => {
  const r = rule({ b: 2, a: 1 });
  const c = compile([r]);
  assert.equal(c.version, 1);
  assert.match(c.hash, /^[a-f0-9]{64}$/);
  assert.equal(c.hash, compile([rule({ a: 1, b: 2 })]).hash);
  r.value.a = 9;
  assert.equal(c.rules[0].value.a, 1);
  assert.notEqual(c.hash, compile([r]).hash);
});
test("SkyClass migration requires retained master and transcription to restore speech", () => {
  const to = compile([rule(true, "client")]);
  const from = compile([rule(false, "client")]);
  assert.throws(
    () =>
      assertContractMigration({
        before: from,
        after: to,
        retainedMaster: false,
        retainedTranscript: true,
      }),
    /master/i,
  );
  assert.throws(
    () =>
      assertContractMigration({
        before: from,
        after: to,
        retainedMaster: true,
        retainedTranscript: false,
      }),
    /transkrypc/i,
  );
  assert.deepEqual(
    assertContractMigration({
      before: from,
      after: to,
      retainedMaster: true,
      retainedTranscript: true,
    }),
    { restoreSpeech: true },
  );
  assert.deepEqual(assertContractMigration({ before: to, after: to }), {
    restoreSpeech: false,
  });
});
test("corpus inventories ten separate cases per registered profile without invented approval", async () => {
  const corpus = JSON.parse(
    await fs.readFile(
      new URL("../../docs/quality/corpus.json", import.meta.url),
    ),
  );
  const registry = JSON.parse(
    await fs.readFile(
      new URL("../../src/quickcontent/templates.json", import.meta.url),
    ),
  );
  for (const id of [...registry.map((t) => t.id), "brand"]) {
    const cases = corpus.cases.filter((c) => c.profile === id);
    assert.equal(cases.length, 10, id);
    assert.equal(new Set(cases.map((c) => c.id)).size, 10);
    assert.deepEqual([...new Set(cases.map((c) => c.split))].sort(), [
      "holdout",
      "prompt",
      "tuning",
    ]);
    assert(
      cases.every(
        (c) =>
          c.review === "pending" &&
          c.mediaRef === null &&
          c.expected.length > 0,
      ),
    );
  }
  assert.equal(
    new Set(corpus.cases.map((c) => c.id)).size,
    corpus.cases.length,
  );
});
test("a changed curated paragraph blocks a new contract instead of silently retaining an obsolete rule", async () => {
  const content = await fs.readFile(
    new URL("../../klienci/skyclass/PREFERENCJE.md", import.meta.url),
    "utf8",
  );
  const profile = {
    ...defaultBranding("skyclass", "SkyClass"),
    styleId: "skyclass",
    revision: 1,
  };
  const read = async (p) => (p.startsWith("klienci/") ? content : "General");
  const c = await contractForBranding(profile, read);
  assert.equal(c.rules.find((r) => r.id === "keep-silence").value, true);
  const changed = content.replace(
    "Wycinanie ciszy jest na razie wyłączone",
    "Wycinanie ciszy jest już włączone",
  );
  assert.notEqual(changed, content);
  await assert.rejects(
    contractForBranding(profile, async (p) =>
      p.startsWith("klienci/") ? changed : "General",
    ),
    /Wytyczne.*zmieniły/i,
  );
});
test("renderer speech and camera invariants remain explicit even without a client Markdown file", async () => {
  for (const [styleId, id, scope, value] of [
    ["skyclass", "keep-silence", "audio", true],
    ["bisanz", "camera-scale", "camera", 1],
  ]) {
    const c = await contractForBranding(
      { ...defaultBranding("new-client", "New"), styleId, revision: 1 },
      async () => null,
    );
    assert.equal(
      c.rules.find((r) => r.id === id && r.scope === scope)?.value,
      value,
    );
  }
});
test("a wholly custom client document stays an editable partial contract, never a mapped native profile", async () => {
  const c = await contractForBranding(
    {
      ...defaultBranding("kacper-bisanz", "Custom"),
      styleId: "brand",
      revision: 1,
    },
    async () => "# My custom preferences",
  );
  assert.equal(c.coverage, "partial");
  assert.equal(c.rules.find((r) => r.id === "camera-scale").value, 1);
  assert.equal(
    c.rules.some((r) => r.id === "caption-readability"),
    false,
  );
  assert.equal(
    c.rules.find((r) => r.id === "client-preferences-review").value.status,
    "unknown",
  );
});
test("an explicitly selected custom style does not inherit Herod native caption motion and line count", async () => {
  const content = await fs.readFile(
    new URL("../../klienci/magdalena-herod/PREFERENCJE.md", import.meta.url),
    "utf8",
  );
  const c = await contractForBranding(
    {
      ...defaultBranding("magdalena-herod", "Own"),
      styleId: "brand",
      revision: 1,
    },
    async (p) => (p.startsWith("klienci/") ? content : "General"),
  );
  assert.equal(
    c.rules.some((r) =>
      ["caption-lines", "caption-motion", "card-position"].includes(r.id),
    ),
    false,
  );
  assert.equal(
    c.rules.find((r) => r.id === "appearance").value.captions.presetId,
    "kinetic",
  );
});
