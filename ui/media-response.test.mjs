import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { Writable } from "node:stream";
import { serveMedia, parseRange } from "./media-response.mjs";
test("media serves suffix range, HEAD and invalid range without buffering whole file", async (t) => {
  const root = await fs.mkdtemp("/tmp/media-response-");
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = root + "/video.mp4";
  await fs.writeFile(file, "abcdefghij");
  async function request(method, range) {
    let body = "";
    const headers = {};
    const res = new Writable({
      write(c, e, cb) {
        body += c;
        cb();
      },
    });
    res.setHeader = (k, v) => (headers[k] = v);
    res.statusCode = 200;
    await serveMedia(
      { method, headers: { ...(range ? { range } : {}) } },
      res,
      file,
      "video/mp4",
    );
    return { body, headers, status: res.statusCode };
  }
  const partial = await request("GET", "bytes=-3");
  assert.equal(partial.status, 206);
  assert.equal(partial.body, "hij");
  assert.equal(partial.headers["Content-Range"], "bytes 7-9/10");
  const head = await request("HEAD");
  assert.equal(head.body, "");
  assert.equal(head.headers["Content-Length"], 10);
  const invalid = await request("GET", "bytes=15-");
  assert.equal(invalid.status, 416);
  assert.equal(invalid.headers["Content-Range"], "bytes */10");
  assert.throws(() => parseRange("bytes=-0", 10));
});
