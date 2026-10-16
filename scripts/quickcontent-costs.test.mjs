import test from "node:test";
import assert from "node:assert/strict";
import { usageReceipt, summarizeCosts } from "./quickcontent-costs.mjs";
test("prices measured standard token categories without double counting cached input or reasoning", () => {
  const r = usageReceipt(
    {
      id: "resp1",
      model: "gpt-6-luna",
      usage: {
        input_tokens: 1000,
        input_tokens_details: { cached_tokens: 400, cache_write_tokens: 100 },
        output_tokens: 200,
        output_tokens_details: { reasoning_tokens: 50 },
      },
    },
    "gpt-6-luna",
  );
  assert.equal(r.costMicroUsd, 166.5);
  assert.equal(r.inputTokens, 1000);
  assert.equal(r.outputTokens, 200);
  assert.equal(
    usageReceipt({ usage: { input_tokens: 10, output_tokens: 5 } }, "unknown")
      .costMicroUsd,
    null,
  );
  assert.equal(usageReceipt({}, "gpt-6-luna").costMicroUsd, null);
});
test("project costs preserve unknown historic analysis and separate montage from chat including failed attempts", () => {
  const r = { costMicroUsd: 200, inputTokens: 10, outputTokens: 20 };
  const s = summarizeCosts([
    { kind: "process", status: "completed" },
    { kind: "montage", payload: {}, usage: [r, r], status: "failed" },
    {
      kind: "montage",
      payload: { action: "chat" },
      usage: [r],
      status: "completed",
    },
  ]);
  assert.equal(s.analysis.missing, 1);
  assert.equal(s.montage.costMicroUsd, 400);
  assert.equal(s.chat.costMicroUsd, 200);
  assert.equal(s.montage.requests, 2);
  assert.equal(summarizeCosts([]).montage.requests, 0);
});

test("account CLI requests have no separate API charge and remain distinguishable from API usage", () => {
  const s = summarizeCosts([
    {
      kind: "montage",
      status: "completed",
      usage: [
        {
          billingKind: "subscription",
          provider: "codex",
          costMicroUsd: 0,
          inputTokens: 100,
          outputTokens: 20,
        },
      ],
    },
  ]);
  assert.equal(s.montage.costMicroUsd, 0);
  assert.equal(s.montage.subscriptionRequests, 1);
  assert.equal(s.montage.missing, 0);
});

test("description API charges stay separate even in render-only jobs and deduplicate file receipts", () => {
  const receipt = {
    purpose: "description",
    provider: "openai",
    responseId: "desc1",
    at: "now",
    costMicroUsd: 12,
    inputTokens: 20,
    outputTokens: 20,
  };
  const s = summarizeCosts(
    [
      {
        kind: "montage",
        payload: { action: "render" },
        status: "completed",
        usage: [receipt],
      },
    ],
    [receipt],
  );
  assert.equal(s.description.costMicroUsd, 12);
  assert.equal(s.description.requests, 1);
  assert.equal(s.montage.requests, 0);
});

test("per-film cost includes only that film, retries, chat and description without charging shared analysis", async () => {
  const { summarizeCandidateCosts } = await import("./quickcontent-costs.mjs");
  const receipt = {
    provider: "codex",
    responseId: "montage1",
    billingKind: "subscription",
    costMicroUsd: 0,
    inputTokens: 100,
    outputTokens: 20,
  };
  const costs = summarizeCandidateCosts(
    [
      {
        kind: "process",
        usage: [{ costMicroUsd: 500, inputTokens: 1000, outputTokens: 30 }],
      },
      {
        kind: "montage",
        candidateId: "one",
        usage: [receipt],
        status: "failed",
      },
      {
        kind: "montage",
        candidateId: "one",
        usage: [receipt],
        status: "completed",
      },
      {
        kind: "montage",
        candidateId: "two",
        usage: [{ ...receipt, responseId: "other", inputTokens: 900 }],
      },
      {
        kind: "montage",
        candidateId: "one",
        payload: { action: "chat" },
        usage: [{ ...receipt, responseId: "chat1", inputTokens: null }],
      },
    ],
    "one",
    [],
  );
  assert.equal(costs.montage.inputTokens, 100);
  assert.equal(costs.montage.outputTokens, 20);
  assert.equal(costs.analysis.requests, 0);
  assert.equal(costs.chat.missingTokenMeasurements, 1);
  assert.equal(costs.montage.subscriptionRequests, 1);
});
