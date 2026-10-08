import assert from "node:assert/strict";
import test from "node:test";
import { chatPrompt, describeEvent, fileName, inside, isName, maskKey, montagePrompt, operatorCommand, prepLine, renderProgress } from "./lib.mjs";

test("nazwy rolek i klientów: tylko slug", () => {
  assert.ok(isName("lot-na-cypr"));
  assert.ok(!isName("../etc"));
  assert.ok(!isName("Lot"));
  assert.ok(!isName(""));
});

test("ścieżki: zostają w korzeniu, ../ i ścieżki bezwzględne odpadają", () => {
  assert.equal(inside("/r", "klienci/a/Render/x.mp4"), "/r/klienci/a/Render/x.mp4");
  assert.equal(inside("/r", "../etc/passwd"), null);
  assert.equal(inside("/r", "/etc/passwd"), null);
});

test("nazwa wgrywanego pliku: bez folderów i ukrytych plików", () => {
  assert.equal(fileName("../../rolka 1.MP4"), "rolka 1.MP4");
  assert.equal(fileName(".env"), null);
  assert.equal(fileName(""), null);
});

test("operator: konto nie dziedziczy klucza z otoczenia, klucz API trafia do env", () => {
  const env = { PATH: "/bin", ANTHROPIC_API_KEY: "z-otoczenia" };
  const acc = operatorCommand({ operator: "claude-account" }, "zrób", null, env);
  assert.equal(acc.cmd, "claude");
  assert.deepEqual(acc.args.slice(0, 2), ["-p", "zrób"]);
  assert.ok(acc.args.includes("stream-json") && acc.args.includes("auto"));
  assert.equal(acc.env.ANTHROPIC_API_KEY, undefined);
  assert.equal(acc.env.PATH, "/bin");

  const key = operatorCommand({ operator: "claude-api-key", apiKey: "sk-test", model: "opus" }, "zrób", "sesja-1", env);
  assert.equal(key.env.ANTHROPIC_API_KEY, "sk-test");
  assert.deepEqual(key.args.slice(-4), ["--resume", "sesja-1", "--model", "opus"]);
});

test("zdarzenia operatora po polsku", () => {
  assert.equal(describeEvent({ type: "system", subtype: "init", model: "claude-opus-5-5" }), "Operator gotowy (claude-opus-5-5)");
  assert.equal(
    describeEvent({ type: "assistant", message: { content: [{ type: "tool_use", name: "Bash", input: { command: "npx remotion still demo /tmp/f.png --frame=30" } }] } }),
    "Kontrola klatki: npx remotion still demo /tmp/f.png --frame=30",
  );
  assert.equal(
    describeEvent({ type: "assistant", message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: "/x/MontageFrames/public/reels/demo/reel.json" } }] } }),
    "Edycja public/reels/demo/reel.json",
  );
  assert.equal(describeEvent({ type: "system", subtype: "api_retry" }), null);
  assert.match(describeEvent({ type: "result", is_error: true, result: "Failed to authenticate: OAuth session expired" }), /claude auth login/);
  assert.match(describeEvent({ type: "result", is_error: false, duration_ms: 61000, total_cost_usd: 0.5 }), /^Gotowe w 61 s/);
});

test("postęp renderu z wyjścia Remotion CLI", () => {
  assert.equal(renderProgress("Bundling 65%"), 7);
  assert.equal(renderProgress("Rendered 30/60, time remaining: 2s"), 53);
  assert.equal(renderProgress("Encoded 60/60"), 100);
  assert.equal(renderProgress("Composition          demo"), null);
});

test("prompty: klient, przebitki i render tylko gdy trzeba", () => {
  const p = montagePrompt({ reel: "lot", client: "skyclass", render: true, out: "klienci/skyclass/Render/lot.mp4" });
  assert.match(p, /klienci\/skyclass\/PREFERENCJE\.md/);
  assert.match(p, /npx remotion render lot "klienci\/skyclass\/Render\/lot\.mp4"/);
  assert.match(montagePrompt({ reel: "demo", client: null, render: false }), /Nie renderuj/);
  assert.match(chatPrompt({ reel: "demo", client: null, message: "napisy niżej" }), /napisy niżej/);
});

test("wyjście prepa po ludzku: bez surowego JSON i podpowiedzi z terminala", () => {
  assert.match(prepLine("npm warn exec The following package was not found and will be installed: hyperframes@0.8.140"), /Pobieram/);
  assert.equal(prepLine('{"type":"progress","phase":"transcription","status":"started"}'), null);
  assert.equal(prepLine('{"type":"progress","phase":"transcription","status":"completed"}'), "Transkrypcja gotowa");
  assert.equal(prepLine('{"type":"words","words":[]}'), null);
  assert.equal(prepLine('Podgląd: npm run dev  |  Render: npx remotion render x "out/x.mp4"'), null);
  assert.equal(prepLine("x: 14.5s -> 12.1s (po cięciu ciszy), 3 ujęć, 7 grup napisów"), "x: 14.5s -> 12.1s (po cięciu ciszy), 3 ujęć, 7 grup napisów");
});

test("klucz API nigdy nie wraca w całości", () => {
  assert.equal(maskKey("sk-ant-1234abcd"), "••••abcd");
  assert.equal(maskKey(""), "");
});
