import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
import { safePath } from "./quickcontent-ingest.mjs";
import { parseEnv } from "node:util";
import { operatorCommand } from "../ui/lib.mjs";
import { usageReceipt } from "./quickcontent-costs.mjs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

export async function readAccountPolicy(root) {
  const env = parseEnv(
    await fs.readFile(path.join(root, ".env"), "utf8").catch((e) => {
      if (e.code === "ENOENT") return "";
      throw e;
    }),
  );
  return {
    accountOnly: env.MONTAGEFRAMES_ACCOUNT_ONLY === "1",
    descriptionProvider: env.REEL_DESCRIPTION_PROVIDER,
  };
}

export async function requestQuickContentAI(
  { prompt, schema, name = "quickcontent" },
  ctx,
) {
  const env = parseEnv(
    await fs.readFile(path.join(ctx.root, ".env"), "utf8").catch((e) => {
      if (e.code === "ENOENT") return "";
      throw e;
    }),
  );
  const provider = (
    ctx.aiProvider ??
    env.QUICKCONTENT_AI_PROVIDER ??
    env.ANIMAFX_AI_PROVIDER ??
    "claude"
  ).toLowerCase();
  if (provider === "openai" && env.MONTAGEFRAMES_ACCOUNT_ONLY === "1")
    throw new Error(
      "Tryb tylko konta CLI (account-only): płatne API jest zablokowane.",
    );
  if (provider === "openai") {
    const key = env.OPENAI_API_KEY?.trim();
    if (!key) throw new Error("Brak OPENAI_API_KEY w lokalnym .env");
    const model =
      ctx.aiModel ??
      env.QUICKCONTENT_AI_MODEL ??
      env.ANIMAFX_AI_MODEL ??
      "gpt-6-luna";
    await ctx.report?.({
      runtimeLabel: `OpenAI · ${model}`,
      progressDetail: "Przetwarzanie treści przez model AI",
    });
    const signal = globalThis.AbortSignal.any([
      ...(ctx.signal ? [ctx.signal] : []),
      globalThis.AbortSignal.timeout(180000),
    ]);
    let response;
    try {
      response = await (ctx.fetch ?? globalThis.fetch)(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          signal,
          body: JSON.stringify({
            model,
            store: false,
            reasoning: { effort: "low" },
            max_output_tokens: 16384,
            input: prompt,
            text: {
              format: schema
                ? { type: "json_schema", name, strict: true, schema }
                : { type: "json_object" },
            },
          }),
        },
      );
    } catch {
      if (ctx.signal?.aborted) ctx.signal.throwIfAborted();
      throw new Error(
        signal.aborted
          ? "OpenAI: przekroczono czas odpowiedzi. Możesz ponowić analizę."
          : "Nie udało się połączyć z OpenAI.",
      );
    }
    if (!response.ok)
      throw new Error(
        [401, 403].includes(response.status)
          ? "OpenAI: klucz lub dostęp do modelu wymaga sprawdzenia."
          : `OpenAI nie przyjął żądania (HTTP ${response.status}).`,
      );
    const payload = await response.json();
    await ctx.recordUsage?.(usageReceipt(payload, model));
    if (payload.status !== "completed")
      throw new Error("OpenAI nie zakończył odpowiedzi. Ponów analizę.");
    const content = (payload.output ?? [])
      .filter((item) => item.type === "message")
      .flatMap((item) => item.content ?? []);
    if (content.some((p) => p.type === "refusal"))
      throw new Error("Model odmówił analizy tego materiału.");
    const texts = content
      .filter((p) => p.type === "output_text")
      .map((p) => p.text);
    if (texts.length !== 1)
      throw new Error("OpenAI zwrócił niejednoznaczny wynik JSON.");
    try {
      return JSON.parse(texts[0]);
    } catch {
      throw new Error("OpenAI zwrócił niepoprawny JSON.");
    }
  }
  if (provider === "codex") return requestCodex({ prompt, schema }, ctx);
  if (provider !== "claude")
    throw new Error("Nieobsługiwany operator QuickContent w .env");
  const settings =
    ctx.settings ??
    JSON.parse(
      await fs
        .readFile(path.join(ctx.root, ".panel.json"), "utf8")
        .catch((e) => {
          if (e.code === "ENOENT") return "{}";
          throw e;
        }),
    );
  await ctx.report?.({
    runtimeLabel: "Claude Code · konto CLI",
    progressDetail: "Redakcja przez zalogowane konto Claude Code",
  });
  const command = operatorCommand(
      { ...settings, operator: "claude-account" },
      prompt,
      null,
    ),
    args = command.args.slice();
  args[args.indexOf("--output-format") + 1] = "json";
  args[args.indexOf("--setting-sources") + 1] = "";
  args.push(
    "--tools",
    "",
    "--strict-mcp-config",
    "--mcp-config",
    JSON.stringify({ mcpServers: {} }),
  );
  if (schema) args.push("--json-schema", JSON.stringify(schema));
  const result = await ctx.runTool(await resolveCLI(command.cmd), args, {
    cwd: ctx.root,
    env: { ...command.env, ...accountEnv },
    maxOutputBytes: 16 * 1024 * 1024,
  });
  if (result.outputTruncated)
    throw new Error("Odpowiedź operatora przekroczyła limit danych");
  await ctx.recordUsage?.({
    provider: "claude",
    model: settings.model ?? "claude",
    responseId: null,
    inputTokens: null,
    outputTokens: null,
    cachedTokens: null,
    cacheWriteTokens: null,
    costMicroUsd: 0,
    billingKind: "subscription",
    pricingDate: "",
    priceSource: "",
    at: new Date().toISOString(),
  });
  return parseOperatorJSON(result.stdout);
}

export function parseOperatorJSON(stdout) {
  let parsed;
  try {
    parsed = JSON.parse(stdout.trim());
  } catch {
    const lines = stdout.trim().split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const p = JSON.parse(lines[i]);
        if (p.type === "result") {
          parsed = p;
          break;
        }
      } catch {
        /* stream log */
      }
    }
  }
  if (!parsed) throw new Error("Operator nie zwrócił poprawnego JSON");
  if (parsed.is_error) throw new Error(parsed.result || "Błąd operatora AI");
  if (parsed.structured_output) return parsed.structured_output;
  if (typeof parsed.result === "string") {
    try {
      return JSON.parse(
        parsed.result.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, ""),
      );
    } catch {
      throw new Error("Operator nie zwrócił danych strukturalnych");
    }
  }
  return parsed;
}

const accountEnv = {
  OPENAI_API_KEY: undefined,
  CODEX_API_KEY: undefined,
  ANTHROPIC_API_KEY: undefined,
  ANTHROPIC_AUTH_TOKEN: undefined,
  ANTHROPIC_BASE_URL: undefined,
  OPENAI_BASE_URL: undefined,
};
async function requestCodex({ prompt, schema }, ctx) {
  const rel = `.quickcontent/operator-jobs/${randomUUID()}`;
  const output = await safePath(ctx.root, rel + "/output.json", {
    create: true,
  });
  const args = [
    "exec",
    "--ephemeral",
    "--skip-git-repo-check",
    "--sandbox",
    "read-only",
    "--json",
    "--output-last-message",
    output,
    "--cd",
    path.dirname(output),
    "-c",
    'model_reasoning_effort="low"',
    "-c",
    "project_doc_max_bytes=0",
    "-c",
    'approval_policy="never"',
    "-c",
    'forced_login_method="chatgpt"',
    "-c",
    'model_provider="openai"',
    "-c",
    'web_search="disabled"',
    "--disable",
    "shell_tool",
    "--disable",
    "unified_exec",
    "--disable",
    "multi_agent",
  ];
  const config = await fs
    .readFile(
      path.join(
        process.env.CODEX_HOME ?? path.join(homedir(), ".codex"),
        "config.toml",
      ),
      "utf8",
    )
    .catch((error) => {
      if (error.code === "ENOENT") return "";
      throw error;
    });
  for (const override of await codexMcpOverrides(config))
    args.push("-c", override);
  if (schema) {
    const file = await safePath(ctx.root, rel + "/schema.json");
    await fs.writeFile(file, JSON.stringify(schema));
    args.push("--output-schema", file);
  }
  args.push(prompt);
  await ctx.report?.({
    runtimeLabel: "Codex · konto ChatGPT",
    progressDetail: "Redakcja przez zalogowane konto Codex",
  });
  const run = await ctx.runTool(await resolveCLI("codex"), args, {
    cwd: path.dirname(output),
    env: accountEnv,
    maxOutputBytes: 16 * 1024 * 1024,
  });
  if (run.outputTruncated)
    throw new Error(
      "Odpowiedź Codex przekroczyła limit. Pliki rolki zachowano.",
    );
  let usage = {};
  for (const line of (run.stdout ?? "").split("\n")) {
    try {
      const event = JSON.parse(line);
      if (event.type === "turn.completed") usage = event.usage ?? {};
    } catch {
      /* diagnostics */
    }
  }
  await ctx.recordUsage?.({
    provider: "codex",
    model: "konto ChatGPT",
    responseId: null,
    inputTokens: usage.input_tokens ?? null,
    outputTokens: usage.output_tokens ?? null,
    cachedTokens: usage.cached_input_tokens ?? null,
    cacheWriteTokens: 0,
    costMicroUsd: 0,
    billingKind: "subscription",
    pricingDate: "",
    priceSource: "",
    at: new Date().toISOString(),
  });
  let result;
  try {
    result = JSON.parse(await fs.readFile(output, "utf8"));
  } catch {
    throw new Error(
      "Codex nie zwrócił poprawnego JSON. Sprawdź logowanie poleceniem codex login status; aplikacja nie przełącza się na API.",
    );
  }
  return result;
}

export async function resolveCLI(
  name,
  { searchPath = process.env.PATH ?? "", fallbacks } = {},
) {
  for (const dir of searchPath.split(path.delimiter).filter(Boolean)) {
    try {
      await fs.access(path.join(dir, name), constants.X_OK);
      return name;
    } catch {
      /* next */
    }
  }
  const candidates = fallbacks ?? [
    path.join(homedir(), ".local/bin", name),
    ...(name === "codex" && process.platform === "darwin"
      ? [
          "/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex",
        ]
      : []),
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate, constants.X_OK);
      return candidate;
    } catch {
      /* next */
    }
  }
  throw Object.assign(
    new Error(
      `Nie znaleziono ${name}. Zainstaluj CLI i zaloguj konto w Terminalu; nie uruchomiono API.`,
    ),
    { code: "ENOENT" },
  );
}
export async function codexMcpOverrides(config) {
  const run = promisify(execFile);
  const parsing = run(
    "python3",
    [
      "-c",
      'import json,sys,tomllib; c=tomllib.loads(sys.stdin.read()); print(json.dumps({"mcp_servers":list(c.get("mcp_servers",{})),"plugins":list(c.get("plugins",{}))}))',
    ],
    {
      env: { ...process.env, PYTHONPATH: undefined, PYTHONHOME: undefined },
      maxBuffer: 1024 * 1024,
    },
  );
  parsing.child.stdin.end(config);
  let parsed;
  try {
    parsed = JSON.parse((await parsing).stdout);
  } catch {
    throw new Error(
      "Nie udało się bezpiecznie odczytać konfiguracji Codex. Nie uruchomiono operatora ani API.",
    );
  }
  return Object.entries(parsed).flatMap(([section, names]) =>
    names.map(
      (name) =>
        `${section}.${/^[A-Za-z0-9_-]+$/.test(name) ? name : JSON.stringify(name)}.enabled=false`,
    ),
  );
}
export async function operatorStatuses(root) {
  const run = promisify(execFile);
  const check = async (cmd, args, logged) => {
    try {
      const result = await run(await resolveCLI(cmd), args, {
        timeout: 5000,
        env: { ...process.env, ...accountEnv },
      });
      return {
        installed: true,
        loggedIn: logged(result.stdout + result.stderr),
      };
    } catch (error) {
      return { installed: error.code !== "ENOENT", loggedIn: false };
    }
  };
  const [codex, claude] = await Promise.all([
    check("codex", ["login", "status"], (s) =>
      /Logged in using ChatGPT/i.test(s),
    ),
    check("claude", ["auth", "status"], (s) => {
      try {
        return JSON.parse(s).loggedIn === true;
      } catch {
        return false;
      }
    }),
  ]);
  const env = parseEnv(
    await fs.readFile(path.join(root, ".env"), "utf8").catch(() => ""),
  );
  return {
    codex,
    claude,
    openai: { configured: Boolean(env.OPENAI_API_KEY?.trim()) },
  };
}
