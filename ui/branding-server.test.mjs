import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { Readable } from "node:stream";
import { brandingRoute } from "./branding-server.mjs";
test("branding HTTP persists a draft, requires revision and preserves it on conflict", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "branding-http-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "klienci/test"), { recursive: true });
  const request = async (method, body, revision) => {
    const req = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
    req.method = method;
    req.headers = { "if-match": revision };
    const response = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) {
        this.headers[k] = v;
      },
      end(v) {
        this.body = JSON.parse(v);
      },
    };
    await brandingRoute(
      root,
      req,
      response,
      new URL("http://panel/branding/clients/test"),
    );
    return response;
  };
  const initial = await request("GET");
  assert.equal(initial.body.profile.revision, 0);
  assert.equal(initial.body.ready, false);
  await assert.rejects(
    request("PUT", initial.body.profile),
    (e) => e.status === 428,
  );
  const saved = await request("PUT", initial.body.profile, "0");
  assert.equal(saved.body.revision, 1);
  await assert.rejects(
    request(
      "PUT",
      {
        ...saved.body.profile,
        palette: {
          maxColors: 4,
          colors: Array.from({ length: 5 }, (_, i) => ({
            id: `c${i}`,
            role: "accent",
            hex: "#123456",
          })),
        },
      },
      "1",
    ),
    (e) => e.status === 400,
  );
  await assert.rejects(
    request("PUT", { ...initial.body.profile, notes: "wrong" }, "0"),
    (e) => e.status === 409,
  );
  assert.equal((await request("GET")).body.profile.notes, "");
});
