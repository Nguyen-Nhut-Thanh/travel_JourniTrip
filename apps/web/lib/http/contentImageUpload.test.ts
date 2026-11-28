import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { CONTENT_IMAGE_ENDPOINTS, uploadContentImage } from "./contentImageUpload";

function browserSession(t: TestContext, token: string | null = "upload-test-token") {
  for (const [name, value] of Object.entries({
    window: {}, localStorage: { getItem: () => token },
  })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, name, previous);
      else Reflect.deleteProperty(globalThis, name);
    });
  }
}

test("each content category sends the unchanged file to its own endpoint", async t => {
  browserSession(t);
  const bytes = new Uint8Array([0xff, 0xd8, 0x01, 0x02, 0x03, 0xff, 0xd9]);
  const file = new File([bytes], "original.jpg", { type: "image/jpeg" });
  const requests: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    requests.push(new URL(url, "http://localhost:3000").pathname);
    assert.equal(init.method, "POST");
    assert.deepEqual(init.headers, { Authorization: "Bearer upload-test-token" });
    const uploaded = (init.body as FormData).get("file") as File;
    assert.equal(uploaded.name, file.name);
    assert.equal(uploaded.type, file.type);
    assert.deepEqual(new Uint8Array(await uploaded.arrayBuffer()), bytes);
    return Response.json({ url: "https://example.test/original.jpg" });
  });
  for (const resource of Object.keys(CONTENT_IMAGE_ENDPOINTS) as (keyof typeof CONTENT_IMAGE_ENDPOINTS)[]) {
    assert.deepEqual(await uploadContentImage(resource, file), { url: "https://example.test/original.jpg" });
    assert.equal(requests.at(-1)?.endsWith(CONTENT_IMAGE_ENDPOINTS[resource]), true);
    assert.equal(requests.at(-1)?.includes("upload-avatar"), false);
  }
  assert.equal(requests.length, 6);
});

test("invalid image types and files over 5 MB never reach the upload endpoint", async t => {
  browserSession(t);
  t.mock.method(globalThis, "fetch", () => { assert.fail("Invalid files must not be uploaded"); });
  await assert.rejects(uploadContentImage("tour", new File(["text"], "image.svg", { type: "image/svg+xml" })), /PNG, JPG hoặc WebP/);
  await assert.rejects(uploadContentImage("voucher", new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" })), /5 MB/);
});

test("content uploads require a signed-in session", async t => {
  browserSession(t, null);
  t.mock.method(globalThis, "fetch", () => { assert.fail("Anonymous files must not be uploaded"); });
  await assert.rejects(uploadContentImage("location", new File(["image"], "image.png", { type: "image/png" })), /đăng nhập/);
});
