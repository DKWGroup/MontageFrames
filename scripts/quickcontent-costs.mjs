// USD per million tokens, Standard/short context, checked 2026-10-15.
export const PRICE_SOURCE = "https://developers.openai.com/api/docs/pricing";
const prices = {
  "gpt-6-luna": { input: 0.1, cached: 0.01, write: 0.125, output: 0.5 },
};
const count = (n) => (Number.isSafeInteger(n) && n >= 0 ? n : null);
export function usageReceipt(payload, model) {
  const u = payload.usage ?? {},
    inputTokens = count(u.input_tokens),
    outputTokens = count(u.output_tokens);
  const cachedTokens = count(u.input_tokens_details?.cached_tokens ?? 0);
  const cacheWriteTokens = count(
    u.input_tokens_details?.cache_write_tokens ?? 0,
  );
  const price = prices[model];
  const valid =
    price &&
    [inputTokens, outputTokens, cachedTokens, cacheWriteTokens].every(
      (n) => n !== null,
    ) &&
    cachedTokens + cacheWriteTokens <= inputTokens &&
    inputTokens <= 128000 &&
    !["priority", "fast", "flex", "ultrafast"].includes(payload.service_tier);
  return {
    provider: "openai",
    model,
    responseId: payload.id ?? null,
    inputTokens,
    outputTokens,
    cachedTokens,
    cacheWriteTokens,
    costMicroUsd: valid
      ? (inputTokens - cachedTokens - cacheWriteTokens) * price.input +
        cachedTokens * price.cached +
        cacheWriteTokens * price.write +
        outputTokens * price.output
      : null,
    pricingDate: "2026-10-15",
    priceSource: PRICE_SOURCE,
    at: new Date().toISOString(),
  };
}
export function summarizeCosts(jobs, extraUsage = []) {
  const result = Object.fromEntries(
    ["analysis", "montage", "chat", "description"].map((k) => [
      k,
      {
        costMicroUsd: 0,
        requests: 0,
        missing: 0,
        inputTokens: 0,
        outputTokens: 0,
        subscriptionRequests: 0,
        missingTokenMeasurements: 0,
      },
    ]),
  );
  const seen = new Set();
  for (const job of [
    ...jobs,
    { kind: "description", usage: extraUsage, payload: { action: "render" } },
  ]) {
    const key = ["process", "find-more"].includes(job.kind)
      ? "analysis"
      : job.payload?.action === "chat"
        ? "chat"
        : "montage";
    const renderOnly = job.payload?.action === "render";
    const row = result[key];
    if (
      !renderOnly &&
      !job.usage?.length &&
      ["completed", "failed", "interrupted", "cancelled"].includes(job.status)
    )
      row.missing++;
    for (const usage of job.usage ?? []) {
      if (renderOnly && usage.purpose !== "description") continue;
      const receiptKey = usage.responseId
        ? `${usage.provider}:${usage.responseId}`
        : usage.at
          ? `${usage.provider}:${usage.at}:${usage.purpose}`
          : null;
      if (receiptKey && seen.has(receiptKey)) continue;
      if (receiptKey) seen.add(receiptKey);
      const row =
        usage.purpose === "description" ? result.description : result[key];
      row.requests++;
      if (usage.billingKind === "subscription") row.subscriptionRequests++;
      if (usage.costMicroUsd === null) row.missing++;
      else row.costMicroUsd += usage.costMicroUsd;
      if (usage.inputTokens == null || usage.outputTokens == null)
        row.missingTokenMeasurements++;
      row.inputTokens += usage.inputTokens ?? 0;
      row.outputTokens += usage.outputTokens ?? 0;
    }
  }
  return result;
}

export function summarizeCandidateCosts(jobs, candidateId, extraUsage = []) {
  return summarizeCosts(
    jobs.filter((j) => j.candidateId === candidateId),
    extraUsage,
  );
}
