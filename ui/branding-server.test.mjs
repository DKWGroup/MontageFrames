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
test("GET defaults to native style, PUT keeps metadata, saved generic profile remains generic", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "branding-native-http-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "klienci/kacper-bisanz"), { recursive: true });
  await fs.writeFile(
    path.join(root, "klienci/kacper-bisanz/PREFERENCJE.md"),
    "# Kacper\nhttps://bisanz.pl",
  );
  async function request(method, body, revision) {
    const req = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
    Object.assign(req, { method, headers: { "if-match": revision } });
    const res = {
      setHeader() {},
      end(v) {
        this.body = JSON.parse(v);
      },
    };
    await brandingRoute(
      root,
      req,
      res,
      new URL("http://panel/branding/clients/kacper-bisanz"),
    );
    return res.body;
  }
  const initial = await request("GET");
  assert.equal(initial.profile.styleId, "bisanz");
  assert.equal(initial.established.profile.styleId, "bisanz");
  assert.equal(initial.preferences.content, "# Kacper\nhttps://bisanz.pl");
  assert.deepEqual(initial.materials, []);
  const saved = await request("PUT", initial.profile, "0");
  assert.equal(saved.profile.styleId, "bisanz");
  assert.deepEqual(saved.established, initial.established);
  assert.deepEqual(saved.preferences, initial.preferences);
  assert.deepEqual(saved.materials, initial.materials);
  const generic = { ...saved.profile };
  delete generic.styleId;
  await request("PUT", generic, "1");
  const loaded = await request("GET");
  assert(!Object.hasOwn(loaded.profile, "styleId"));
  assert.equal(loaded.established.profile.styleId, "bisanz");
});
test("curated materials stream bytes and HEAD/ranges while refusing foreign files and symlinks", async (t) => {
  const { Writable } = await import("node:stream");
  const root = await fs.mkdtemp(path.join(tmpdir(), "branding-material-http-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const logo = path.join(root, "klienci/kacper-bisanz/logo/a.png");
  await fs.mkdir(path.dirname(logo), { recursive: true });
  const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
  await fs.writeFile(logo, bytes);
  await fs.mkdir(path.join(root, "klienci/other/logo"), { recursive: true });
  await fs.writeFile(
    path.join(root, "klienci/other/logo/secret.png"),
    "private",
  );
  async function request(method, file, range) {
    const chunks = [];
    const headers = {};
    const res = new Writable({
      write(chunk, encoding, done) {
        chunks.push(Buffer.from(chunk));
        done();
      },
    });
    res.statusCode = 200;
    res.setHeader = (k, v) => (headers[k] = v);
    const req = { method, headers: { ...(range ? { range } : {}) } };
    await brandingRoute(
      root,
      req,
      res,
      new URL(
        `http://panel/branding/clients/kacper-bisanz/materials?file=${encodeURIComponent(file)}`,
      ),
    );
    return { bytes: Buffer.concat(chunks), headers, status: res.statusCode };
  }
  const file = "klienci/kacper-bisanz/logo/a.png";
  const full = await request("GET", file);
  assert.deepEqual(full.bytes, bytes);
  assert.equal(full.headers["Content-Type"], "image/png");
  assert.equal(full.headers["X-Content-Type-Options"], "nosniff");
  const head = await request("HEAD", file);
  assert.equal(head.bytes.length, 0);
  assert.equal(head.headers["Content-Length"], bytes.length);
  const partial = await request("GET", file, "bytes=0-3");
  assert.equal(partial.status, 206);
  assert.deepEqual(partial.bytes, bytes.subarray(0, 4));
  await assert.rejects(
    request("GET", "klienci/other/logo/secret.png"),
    (e) => e.status === 403,
  );
  await assert.rejects(
    request("GET", "../secret.png"),
    (e) => e.status === 403,
  );
  await assert.rejects(
    request("GET", "klienci/kacper-bisanz/logo/missing.png"),
    (e) => e.status === 403,
  );
  await fs.rm(logo);
  await fs.symlink(path.join(root, "klienci/other/logo/secret.png"), logo);
  await assert.rejects(
    request("GET", file),
    (e) => e.status === 400 || e.status === 403,
  );
});
