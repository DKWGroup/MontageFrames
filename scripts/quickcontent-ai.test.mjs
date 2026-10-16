import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { requestQuickContentAI } from "./quickcontent-ai.mjs";
const schema = {
  type: "object",
  properties: { ok: { type: "boolean" } },
  required: ["ok"],
  additionalProperties: false,
};
async function fixture(t, env = "") {
  const root = await fs.mkdtemp(path.join(tmpdir(), "qc-ai-"));
  await fs.writeFile(path.join(root, ".env"), env);
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
test("copied server env routes structured analysis to OpenAI without spawning Claude", async (t) => {
  const root = await fixture(
    t,
    "ANIMAFX_AI_PROVIDER=openai\nANIMAFX_AI_MODEL=gpt-6-luna\nOPENAI_API_KEY=test-private-key\n",
  );
  const result = await requestQuickContentAI(
    { prompt: "Zwróć JSON", schema, name: "qc_test" },
    {
      root,
      signal: new globalThis.AbortController().signal,
      runTool: () => {
        throw Error("Claude must not run");
      },
      fetch: async (url, options) => {
        assert.equal(url, "https://api.openai.com/v1/responses");
        assert.equal(options.headers.Authorization, "Bearer test-private-key");
        const body = JSON.parse(options.body);
        assert.equal(body.model, "gpt-6-luna");
        assert.equal(body.store, false);
        assert.equal(body.text.format.type, "json_schema");
        assert.equal(body.text.format.strict, true);
        return {
          ok: true,
          json: async () => ({
            status: "completed",
            output: [
              {
                type: "message",
                content: [{ type: "output_text", text: '{"ok":true}' }],
              },
            ],
          }),
        };
      },
    },
  );
  assert.deepEqual(result, { ok: true });
});
test("Claude fallback uses a valid explicit empty MCP registry", async (t) => {
  const root = await fixture(t);
  const result = await requestQuickContentAI(
    { prompt: "JSON", schema, name: "qc_test" },
    {
      root,
      runTool: async (exe, args) => {
        assert.equal(exe, "claude");
        assert.deepEqual(JSON.parse(args[args.indexOf("--mcp-config") + 1]), {
          mcpServers: {},
        });
        assert.equal(args[args.indexOf("--tools") + 1], "");
        return { stdout: '{"type":"result","structured_output":{"ok":true}}' };
      },
    },
  );
  assert.deepEqual(result, { ok: true });
});
test("provider failures and refusals never become results or disclose keys", async (t) => {
  const root = await fixture(
    t,
    "ANIMAFX_AI_PROVIDER=openai\nOPENAI_API_KEY=never-log-this-key\n",
  );
  for (const response of [
    {
      ok: false,
      status: 401,
      json: async () => ({ error: { message: "never-log-this-key" } }),
    },
    { ok: true, json: async () => ({ status: "incomplete", output: [] }) },
    {
      ok: true,
      json: async () => ({
        status: "completed",
        output: [
          { type: "message", content: [{ type: "refusal", refusal: "no" }] },
        ],
      }),
    },
  ]) {
    await assert.rejects(
      requestQuickContentAI(
        { prompt: "JSON", schema, name: "qc_test" },
        { root, fetch: async () => response },
      ),
      (e) => !e.message.includes("never-log-this-key"),
    );
  }
});
test("montage JSON uses the same OpenAI credentials and returns proposed edits", async (t) => {
  const root = await fixture(
    t,
    "ANIMAFX_AI_PROVIDER=openai\nOPENAI_API_KEY=test-key\n",
  );
  const output = await requestQuickContentAI(
    { prompt: "Zwróć pełny JSON rolki" },
    {
      root,
      fetch: async (_url, options) => {
        assert.equal(JSON.parse(options.body).text.format.type, "json_object");
        return {
          ok: true,
          json: async () => ({
            status: "completed",
            output: [
              {
                type: "message",
                content: [
                  {
                    type: "output_text",
                    text: '{"data":{"captions":[]},"summary":"Poprawiono"}',
                  },
                ],
              },
            ],
          }),
        };
      },
    },
  );
  assert.equal(output.summary, "Poprawiono");
  assert.deepEqual(output.data, { captions: [] });
});

test("usage is recorded before rejecting a paid incomplete result", async (t) => {
  const root = await fixture(
    t,
    "ANIMAFX_AI_PROVIDER=openai\nOPENAI_API_KEY=test-key\n",
  );
  let receipt;
  await assert.rejects(
    requestQuickContentAI(
      { prompt: "JSON" },
      {
        root,
        recordUsage: async (r) => {
          receipt = r;
        },
        fetch: async () => ({
          ok: true,
          json: async () => ({
            id: "response1",
            status: "incomplete",
            usage: { input_tokens: 100, output_tokens: 10 },
          }),
        }),
      },
    ),
  );
  assert.equal(receipt.responseId, "response1");
  assert.equal(receipt.costMicroUsd, 15);
});

test("explicit Codex account never uses API keys and reads structured output file", async (t) => {
  const root = await fixture(
    t,
    "ANIMAFX_AI_PROVIDER=openai\nOPENAI_API_KEY=secret\n",
  );
  const result = await requestQuickContentAI(
    { prompt: "JSON", schema },
    {
      root,
      aiProvider: "codex",
      fetch() {
        throw Error("No API");
      },
      runTool: async (exe, args, options) => {
        assert.equal(exe, "codex");
        assert.ok(args.includes("--sandbox"));
        assert.ok(args.includes("read-only"));
        assert.equal(options.env.OPENAI_API_KEY, undefined);
        assert.ok(args.includes("--ephemeral"));
        await fs.writeFile(
          args[args.indexOf("--output-last-message") + 1],
          '{"ok":true}',
        );
        return {
          stdout:
            '{"type":"turn.completed","usage":{"input_tokens":10,"output_tokens":5}}\n',
        };
      },
    },
  );
  assert.deepEqual(result, { ok: true });
});
test("explicit Claude account ignores paid panel key and does not fall back to API", async (t) => {
  const root = await fixture(
    t,
    "ANIMAFX_AI_PROVIDER=openai\nOPENAI_API_KEY=secret\n",
  );
  let receipt;
  const output = await requestQuickContentAI(
    { prompt: "JSON", schema },
    {
      root,
      aiProvider: "claude",
      settings: { operator: "claude-api-key", apiKey: "do-not-use" },
      recordUsage: async (r) => {
        receipt = r;
      },
      runTool: async (exe, args, options) => {
        assert.equal(exe, "claude");
        assert.equal(options.env.ANTHROPIC_API_KEY, undefined);
        return { stdout: '{"structured_output":{"ok":true}}' };
      },
    },
  );
  assert.deepEqual(output, { ok: true });
  assert.equal(receipt.billingKind, "subscription");
  assert.equal(receipt.costMicroUsd, 0);
});

test("Codex MCP overrides disable servers, never nested env tables", async () => {
  const { codexMcpOverrides } = await import("./quickcontent-ai.mjs");
  assert.deepEqual(
    await codexMcpOverrides(
      '[mcp_servers.node_repl] # comment\n[mcp_servers.node_repl.env]\n[mcp_servers."quoted.name"]\n',
    ),
    [
      "mcp_servers.node_repl.enabled=false",
      'mcp_servers."quoted.name".enabled=false',
    ],
  );
});

test("CLI resolver finds an executable outside server PATH", async (t) => {
  const { resolveCLI } = await import("./quickcontent-ai.mjs");
  const root = await fixture(t);
  const file = path.join(root, "codex");
  await fs.writeFile(file, "#!/bin/sh\nexit 0\n");
  await fs.chmod(file, 0o700);
  assert.equal(
    await resolveCLI("codex", { searchPath: "", fallbacks: [file] }),
    file,
  );
});

test('account-only odrzuca płatne API jeszcze przed fetch i nie robi fallbacku', async(t)=>{
  const root=await fixture(t,'MONTAGEFRAMES_ACCOUNT_ONLY=1\nOPENAI_API_KEY=test-key\n');
  await assert.rejects(requestQuickContentAI({prompt:'JSON',schema},{root,aiProvider:'openai',fetch(){throw Error('fetch must never run');}}),/tylko.*kont|account-only/i);
});
