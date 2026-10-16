import process from "node:process";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import { parseArgs } from "node:util";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { realpath } from "node:fs/promises";
import { Readable, Writable } from "node:stream";
import { setTimeout as pause } from "node:timers/promises";
import { createQuickContentService } from "../ui/quickcontent-server.mjs";
export function parseCLIArgs(args) {
  const parsed = parseArgs({
    args,
    allowPositionals: true,
    options: {
      operator: { type: "string" },
      client: { type: "string" },
      "output-resolution": { type: "string" },
      "source-resolution": { type: "string" },
      help: { type: "boolean" },
    },
  });
  if (
    parsed.values.operator &&
    !["codex", "claude", "openai"].includes(parsed.values.operator)
  )
    throw Error("Wybierz operator: codex, claude lub openai");
  return { positionals: parsed.positionals, options: parsed.values };
}
async function client(root) {
  const base = "http://127.0.0.1:3100/api/quickcontent";
  let attached = false;
  try {
    const response = await globalThis.fetch(base + "/instance", {
      signal: globalThis.AbortSignal.timeout(1500),
    });
    attached =
      response.ok && (await response.json()).root === (await realpath(root));
  } catch {
    /* standalone worker */
  }
  const service = attached ? null : createQuickContentService(root);
  return {
    attached,
    async request(method, route, body) {
      const streaming =
        body && typeof body[Symbol.asyncIterator] === "function";
      if (attached) {
        const response = await globalThis.fetch(base + route, {
          method,
          headers: {
            "X-Panel": "1",
            ...(!streaming ? { "Content-Type": "application/json" } : {}),
          },
          body:
            body === undefined
              ? undefined
              : streaming
                ? body
                : JSON.stringify(body),
          ...(streaming ? { duplex: "half" } : {}),
        });
        const result = await response.json();
        if (!response.ok)
          throw Error(
            result.error ?? result.message ?? `HTTP ${response.status}`,
          );
        return result;
      }
      const req = streaming
        ? body
        : Readable.from(body === undefined ? [] : [JSON.stringify(body)]);
      req.method = method;
      req.headers = { host: "127.0.0.1", "x-panel": "1" };
      let output = "";
      const res = new Writable({
        write(chunk, _, done) {
          output += chunk;
          done();
        },
      });
      res.setHeader = () => {};
      res.statusCode = 200;
      await service.route(
        req,
        res,
        new URL("/api/quickcontent" + route, "http://127.0.0.1"),
      );
      return output ? JSON.parse(output) : null;
    },
    close: async () => {
      if (service) await service.close();
    },
  };
}
export async function runCLI(
  args,
  root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
) {
  const {
    positionals: [command, id, selection],
    options,
  } = parseCLIArgs(args);
  if (options.help || !command) {
    process.stdout.write(
      "QuickContent: import <YouTube|plik> | list | status <projekt|job> | process <projekt> | more <projekt> | montage <projekt> [id1,id2] | retry <job>\nOpcje: --operator codex|claude|openai --client <slug> --output-resolution 720|1080|2160 --source-resolution 1080|2160\nDomyślnie Codex na koncie ChatGPT. Bez panelu CLI uruchamia własny worker; z panelem używa tej samej kolejki.\n",
    );
    return;
  }
  const api = await client(root),
    jobs = [];
  try {
    if (command === "list") {
      for (const p of await api.request("GET", "/projects"))
        process.stdout.write(`${p.id}\t${p.title}\t${p.aiProvider}\n`);
      return;
    }
    if (command === "status") {
      const value = await api.request(
        "GET",
        `/${id?.startsWith("job-") ? "jobs" : "projects"}/${id}`,
      );
      process.stdout.write(
        JSON.stringify(
          {
            id: value.id,
            title: value.title,
            status: value.status,
            stage: value.stage,
            progress: value.progress,
            error: value.error,
            aiProvider: value.aiProvider,
            selected: value.selectedCandidateIds,
            candidates: value.candidates?.length,
            costs: value.costs,
          },
          null,
          2,
        ) + "\n",
      );
      return;
    }
    if (command === "import") {
      if (!id) throw Error("Podaj link YouTube lub ścieżkę filmu");
      const youtube = /^https?:\/\//i.test(id);
      const upload = youtube
        ? null
        : await api.request(
            "POST",
            `/uploads?file=${encodeURIComponent(path.basename(id))}`,
            createReadStream(path.resolve(id)),
          );
      const templates = await api.request("GET", "/templates");
      const template = templates.find(
        (t) => t.clientId === (options.client ?? null),
      );
      if (!template) throw Error("Brak gotowego szablonu tego klienta");
      const p = await api.request("POST", "/projects", {
        sourceKind: youtube ? "youtube" : "upload",
        ...(youtube ? { url: id } : { uploadId: upload.uploadId }),
        clientId: options.client ?? null,
        templateId: template.id,
        aiProvider: options.operator ?? "codex",
        resolution: Number(options["source-resolution"] ?? 1080),
        outputResolution: Number(options["output-resolution"] ?? 1080),
      });
      process.stdout.write(`Projekt: ${p.id}\n`);
      jobs.push(
        (await api.request("POST", `/projects/${p.id}/process`, {})).jobId,
      );
    } else {
      if (!id) throw Error("Podaj identyfikator projektu lub zadania");
      const old =
        command === "retry" ? await api.request("GET", `/jobs/${id}`) : null;
      let p = await api.request("GET", `/projects/${old?.projectId ?? id}`);
      if (options.operator)
        p = await api.request("PUT", `/projects/${p.id}/operator`, {
          aiProvider: options.operator,
          expectedRevision: p.revision,
        });
      if (options["output-resolution"])
        p = await api.request("PUT", `/projects/${p.id}/output`, {
          outputResolution: Number(options["output-resolution"]),
          expectedRevision: p.revision,
        });
      if (command === "retry") {
        const j = await api.request("POST", `/jobs/${id}/retry`, {});
        jobs.push(j.jobId ?? j.id);
      } else if (command === "montage") {
        const ids = selection ? selection.split(",") : p.selectedCandidateIds;
        const batch = await api.request("POST", `/projects/${p.id}/montage`, {
          candidateIds: ids,
          expectedRevision: p.revision,
          idempotencyKey: randomUUID(),
        });
        jobs.push(...batch.jobIds);
      } else if (["process", "more"].includes(command))
        jobs.push(
          (
            await api.request(
              "POST",
              `/projects/${p.id}/${command === "more" ? "find-more" : "process"}`,
              { expectedRevision: p.revision },
            )
          ).jobId,
        );
      else throw Error("Nieznane polecenie. Użyj --help");
    }
    let last = "";
    for (;;) {
      const states = await Promise.all(
        jobs.map((j) => api.request("GET", `/jobs/${j}`)),
      );
      const summary = states
        .map(
          (j) =>
            `${j.id}: ${j.status} · ${j.stage}${j.progress === null ? "" : ` ${Math.round(j.progress * 100)}%`}${j.error ? ` · ${j.error}` : ""}`,
        )
        .join("\n");
      if (summary !== last) {
        process.stdout.write(summary + "\n");
        last = summary;
      }
      if (
        states.every((j) =>
          [
            "completed",
            "failed",
            "cancelled",
            "interrupted",
            "blocked",
          ].includes(j.status),
        )
      ) {
        if (states.some((j) => j.status !== "completed"))
          throw Error(
            "Nie wszystkie zadania ukończono. Wyniki i stan są zachowane; użyj retry.",
          );
        break;
      }
      await pause(1000);
    }
  } finally {
    await api.close();
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  runCLI(process.argv.slice(2)).catch((error) => {
    process.stderr.write(error.message + "\n");
    process.exitCode = 1;
  });
