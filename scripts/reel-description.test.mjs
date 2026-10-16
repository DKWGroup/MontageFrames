import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  generateReelDescription,
  readReelDescription,
} from "./reel-description.mjs";

const copy = {
  hook: "Co zmienia dobra podróż?",
  body: "Zobacz, jak zaplanować podróż z głową.",
  hashtags: ["#podróże", "#planowanie", "#wakacje", "#porady", "#wyjazd"],
};
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "description-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const dir = path.join(root, "public/reels/demo");
  await fs.mkdir(dir, { recursive: true });
  const reel = {
    segments: [{ start: 2, end: 4, zoom: 1 }],
    captions: [
      {
        words: [
          { text: "Wycięte", start: 0, end: 1 },
          { text: "Dobra", start: 2, end: 2.5 },
          { text: "podróż.", start: 3, end: 3.5 },
          { text: "Urwane", start: 3.9, end: 4.5 },
        ],
      },
      { words: [{ text: "Dobra", start: 2, end: 2.5 }] },
    ],
  };
  const save = () =>
    fs.writeFile(path.join(dir, "reel.json"), JSON.stringify(reel));
  await save();
  await fs.writeFile(path.join(dir, "source.mp4"), "unchanged-video");
  return { root, dir, reel, save };
}
test("uses only complete included words, fixed API model, and reuses after camera edits", async (t) => {
  const f = await fixture(t);
  let calls = 0;
  const ctx = {
    root: f.root,
    aiProvider: "codex",
    aiModel: "other",
    requestAI: async ({ prompt }, requestCtx) => {
      calls++;
      assert.equal(requestCtx.aiProvider, "openai");
      assert.equal(requestCtx.aiModel, "gpt-6-luna");
      if (calls === 1) assert.ok(prompt.includes("Dobra podróż."));
      assert.ok(!prompt.includes("Wycięte"));
      assert.ok(!prompt.includes("Urwane"));
      return copy;
    },
  };
  assert.equal((await generateReelDescription("demo", ctx)).status, "ready");
  f.reel.segments[0].zoom = 1.3;
  f.reel.framing = { scale: 2 };
  await f.save();
  assert.equal((await generateReelDescription("demo", ctx)).status, "ready");
  assert.equal(calls, 1);
  assert.equal(
    await fs.readFile(path.join(f.dir, "publication.txt"), "utf8"),
    `${copy.hook}\n\n${copy.body}\n\n${copy.hashtags.join(" ")}\n`,
  );
  f.reel.captions[0].words[1].text = "Nowa";
  await f.save();
  const stale = await readReelDescription("demo", f.root);
  assert.equal(stale.status, "stale");
  assert.equal(stale.text, undefined);
  await generateReelDescription("demo", ctx);
  assert.equal(calls, 2);
});
test("invalid hashtags preserve durable usage before validation and leave video untouched", async (t) => {
  const f = await fixture(t);
  const forwarded = [];
  const result = await generateReelDescription("demo", {
    root: f.root,
    recordUsage: (r) => forwarded.push(r),
    requestAI: async (_, ctx) => {
      await ctx.recordUsage({
        model: "gpt-6-luna",
        costMicroUsd: 12,
        inputTokens: 10,
      });
      const persisted = JSON.parse(
        await fs.readFile(path.join(f.dir, "publication.json"), "utf8"),
      );
      assert.equal(persisted.usage[0].costMicroUsd, 12);
      return { ...copy, hashtags: ["#x", "#x", "#z", "#a", "#b"] };
    },
  });
  assert.equal(result.status, "failed");
  assert.equal(result.usage[0].costMicroUsd, 12);
  assert.equal(forwarded[0].purpose, "description");
  assert.equal((await readReelDescription("demo", f.root)).status, "failed");
  assert.equal(
    await fs.readFile(path.join(f.dir, "source.mp4"), "utf8"),
    "unchanged-video",
  );
  await assert.rejects(fs.stat(path.join(f.dir, "publication.txt")), {
    code: "ENOENT",
  });
});
test("failed regeneration keeps prior ready data separately and does not expose stale text", async (t) => {
  const f = await fixture(t);
  await generateReelDescription("demo", {
    root: f.root,
    requestAI: async () => copy,
  });
  f.reel.captions[0].words[1].text = "Inna";
  await f.save();
  const result = await generateReelDescription("demo", {
    root: f.root,
    requestAI: async (_, ctx) => {
      await ctx.recordUsage({ costMicroUsd: 3 });
      throw new Error("secret detail");
    },
  });
  assert.equal(result.status, "failed");
  assert.equal(result.text, undefined);
  assert.ok(!result.error.includes("secret"));
  const saved = JSON.parse(
    await fs.readFile(path.join(f.dir, "publication.json"), "utf8"),
  );
  assert.equal(saved.previousReady.hook, copy.hook);
  assert.equal(saved.usage.length, 1);
  await assert.rejects(fs.stat(path.join(f.dir, "publication.txt")), {
    code: "ENOENT",
  });
});

test("Responses API uses gpt-6-luna even with conflicting env and persists malformed response usage", async (t) => {
  const f = await fixture(t);
  await fs.writeFile(
    path.join(f.root, ".env"),
    "OPENAI_API_KEY=test-only-key\nQUICKCONTENT_AI_MODEL=other-model\nQUICKCONTENT_AI_PROVIDER=codex\n",
  );
  const result = await generateReelDescription("demo", {
    root: f.root,
    fetch: async (url, options) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      const body = JSON.parse(options.body);
      assert.equal(body.model, "gpt-6-luna");
      assert.equal(body.store, false);
      assert.equal(body.text.format.strict, true);
      assert.equal(
        body.text.format.schema.properties.hashtags.items.pattern,
        undefined,
      );
      assert.equal(body.text.format.schema.properties.hashtags.minItems, 5);
      assert.equal(body.text.format.schema.properties.hashtags.maxItems, 5);
      return {
        ok: true,
        json: async () => ({
          id: "response-description",
          status: "completed",
          usage: { input_tokens: 20, output_tokens: 5 },
          output: [
            {
              type: "message",
              content: [{ type: "output_text", text: "malformed JSON" }],
            },
          ],
        }),
      };
    },
  });
  assert.equal(result.status, "failed");
  assert.equal(result.usage[0].responseId, "response-description");
  assert.equal(result.usage[0].purpose, "description");
});

test("simultaneous requests share one paid generation", async (t) => {
  const f = await fixture(t);
  let calls = 0;
  const ctx = {
    root: f.root,
    requestAI: async () => {
      calls++;
      return copy;
    },
  };
  const results = await Promise.all([
    generateReelDescription("demo", ctx),
    generateReelDescription("demo", ctx),
  ]);
  assert.equal(calls, 1);
  assert.deepEqual(results[0], results[1]);
});

test("raw transcript retains spoken graphic numbers and caption ASR corrections win", async (t) => {
  const f = await fixture(t);
  f.reel.captions = [
    {
      words: [
        { text: "Kosztuje", start: 2, end: 2.3 },
        { text: "złotych.", start: 3, end: 3.5 },
      ],
    },
  ];
  await f.save();
  const raw = [
    { text: "Wycięte", start: 0, end: 1 },
    { text: "Kosztóje", start: 2, end: 2.3 },
    { text: "500", start: 2.4, end: 2.8 },
    { text: "złotych.", start: 3, end: 3.5 },
    { text: "Urwane", start: 3.9, end: 4.5 },
  ];
  for (const transcript of [
    raw,
    { words: raw },
    { segments: [{ words: raw }] },
  ]) {
    await fs.writeFile(
      path.join(f.dir, "transcript.json"),
      JSON.stringify(transcript),
    );
    await fs.rm(path.join(f.dir, "publication.json"), { force: true });
    const result = await generateReelDescription("demo", {
      root: f.root,
      requestAI: async ({ prompt }) => {
        assert.ok(prompt.includes("Kosztuje 500 złotych."));
        assert.ok(!prompt.includes("Kosztóje"));
        assert.ok(!prompt.includes("Wycięte"));
        assert.ok(!prompt.includes("Urwane"));
        return copy;
      },
    });
    assert.equal(result.status, "ready");
  }
  f.reel.captions[0].words[0].text = "Zapłacisz";
  await f.save();
  assert.equal((await readReelDescription("demo", f.root)).status, "stale");
});

test("read exposes generating during a live request and failed only after it settles", async (t) => {
  const f = await fixture(t);
  let release, entered;
  const started = new Promise((resolve) => {
    entered = resolve;
  });
  const waiting = new Promise((resolve) => {
    release = resolve;
  });
  const pending = generateReelDescription("demo", {
    root: f.root,
    requestAI: async () => {
      entered();
      await waiting;
      return copy;
    },
  });
  await started;
  const live = await readReelDescription("demo", f.root);
  assert.equal(live.status, "generating");
  assert.equal(live.error, undefined);
  assert.equal(live.text, undefined);
  release();
  assert.equal((await pending).status, "ready");
  assert.equal((await readReelDescription("demo", f.root)).status, "ready");
  f.reel.captions[0].words[1].text = "Inna";
  await f.save();
  await generateReelDescription("demo", {
    root: f.root,
    requestAI: async () => {
      throw new Error("failure");
    },
  });
  assert.equal((await readReelDescription("demo", f.root)).status, "failed");
});

test("render snapshot rejects changed speech before API and leaves existing copy untouched", async (t) => {
  const f = await fixture(t);
  let calls = 0;
  const ctx = {
    root: f.root,
    requestAI: async () => {
      calls++;
      return copy;
    },
  };
  await generateReelDescription("demo", ctx);
  const previous = await fs.readFile(
    path.join(f.dir, "publication.json"),
    "utf8",
  );
  const snapshot = JSON.parse(JSON.stringify(f.reel));
  f.reel.captions[0].words[1].text = "Zmieniona";
  await f.save();
  const result = await generateReelDescription("demo", {
    ...ctx,
    renderedData: snapshot,
  });
  assert.equal(result.status, "stale");
  assert.equal(result.text, undefined);
  assert.equal(calls, 1);
  assert.equal(
    await fs.readFile(path.join(f.dir, "publication.json"), "utf8"),
    previous,
  );
  f.reel.captions[0].words[1].text = "Dobra";
  f.reel.segments[0].zoom = 1.4;
  await f.save();
  assert.equal(
    (await generateReelDescription("demo", { ...ctx, renderedData: snapshot }))
      .status,
    "ready",
  );
  assert.equal(calls, 1);
});

test("local validation rejects hashtag spaces and punctuation despite permissive provider schema", async (t) => {
  for (const invalid of ["#dwa słowa", "#podróże!", "bezHasha"]) {
    const f = await fixture(t);
    const result = await generateReelDescription("demo", {
      root: f.root,
      requestAI: async () => ({
        ...copy,
        hashtags: [invalid, ...copy.hashtags.slice(1)],
      }),
    });
    assert.equal(result.status, "failed");
    await assert.rejects(fs.stat(path.join(f.dir, "publication.txt")), {
      code: "ENOENT",
    });
  }
});

test("instructions persist before publication and affect prompt/cache without API on save", async (t) => {
  const f = await fixture(t);
  const { saveReelDescriptionInstructions } =
    await import("./reel-description.mjs");
  assert.equal(typeof saveReelDescriptionInstructions, "function");
  const saved = await saveReelDescriptionInstructions(
    "demo",
    "Krótko, z pytaniem na końcu.",
    f.root,
  );
  assert.equal(saved.status, "missing");
  assert.equal(saved.instructions, "Krótko, z pytaniem na końcu.");
  let calls = 0;
  const ctx = {
    root: f.root,
    requestAI: async ({ prompt }) => {
      calls++;
      assert.ok(prompt.includes("pierwszej osobie"));
      assert.ok(prompt.includes("Krótko, z pytaniem na końcu."));
      return copy;
    },
  };
  assert.equal((await generateReelDescription("demo", ctx)).status, "ready");
  await generateReelDescription("demo", ctx);
  assert.equal(calls, 1);
  assert.equal(
    (await saveReelDescriptionInstructions("demo", "Inna puenta", f.root))
      .status,
    "stale",
  );
});

test("manual text edit is free, verbatim, durable and preserves paid receipts", async (t) => {
  const f = await fixture(t);
  const { saveReelDescriptionText } = await import("./reel-description.mjs");
  assert.equal(typeof saveReelDescriptionText, "function");
  await generateReelDescription("demo", {
    root: f.root,
    requestAI: async (_, ctx) => {
      await ctx.recordUsage({ responseId: "paid-once", costMicroUsd: 2 });
      return copy;
    },
  });
  const before = await readReelDescription("demo", f.root);
  const edited = await saveReelDescriptionText(
    "demo",
    "Mój własny opis.\n\n#polski",
    f.root,
  );
  assert.equal(edited.text, "Mój własny opis.\n\n#polski");
  assert.equal(edited.contentHash, before.contentHash);
  assert.deepEqual(edited.usage, before.usage);
  assert.equal(
    await fs.readFile(path.join(f.dir, "publication.txt"), "utf8"),
    "Mój własny opis.\n\n#polski\n",
  );
  assert.equal((await readReelDescription("demo", f.root)).text, edited.text);
  f.reel.captions[0].words[1].text = "Nowa";
  await f.save();
  await assert.rejects(saveReelDescriptionText("demo", "Nowy opis", f.root), {
    status: 409,
  });
});

test("project instructions persist as fallback while explicit reel instructions take precedence", async (t) => {
  const f = await fixture(t);
  const { saveReelDescriptionInstructions } =
    await import("./reel-description.mjs");
  const result = await generateReelDescription("demo", {
    root: f.root,
    descriptionInstructions: "Projekt bez emoji",
    requestAI: async ({ prompt }) => {
      assert.ok(prompt.includes("Projekt bez emoji"));
      return copy;
    },
  });
  assert.equal(result.status, "ready");
  assert.equal(
    (await readReelDescription("demo", f.root)).instructions,
    "Projekt bez emoji",
  );
  assert.equal(
    (
      await readReelDescription("demo", f.root, {
        descriptionInstructions: "Zmiana projektu",
      })
    ).status,
    "stale",
  );
  await saveReelDescriptionInstructions("demo", "Moje własne wytyczne", f.root);
  const own = await generateReelDescription("demo", {
    root: f.root,
    descriptionInstructions: "Zmiana projektu",
    requestAI: async ({ prompt }) => {
      assert.ok(prompt.includes("Moje własne wytyczne"));
      assert.ok(!prompt.includes("Zmiana projektu"));
      return copy;
    },
  });
  assert.equal(own.status, "ready");
  assert.equal(
    (
      await readReelDescription("demo", f.root, {
        descriptionInstructions: "Kolejna zmiana",
      })
    ).status,
    "ready",
  );
});
