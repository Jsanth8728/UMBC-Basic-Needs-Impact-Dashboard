import test from "node:test";
import assert from "node:assert/strict";
import { login, restoreSession } from "./auth.js";

const session = {
  user_id: "A001", role: "admin", token_type: "bearer", access_token: "signed-token",
  expires_at: new Date(Date.now() + 3600000).toISOString(),
};

test("login sends credentials to the proxied API and returns the session", async t => {
  t.mock.method(globalThis, "fetch", async (path, options) => {
    assert.equal(path, "/api/login");
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), { user_id: "A001", password: "admin123" });
    return Response.json(session);
  });
  assert.deepEqual(await login("A001", "admin123"), session);
});

test("failed authentication preserves the backend's explanation", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ detail: "Invalid ID or password." }, { status: 401 }));
  await assert.rejects(login("A001", "wrong"), /Invalid ID or password/);
});

test("network and non-JSON proxy failures have readable messages", async t => {
  const mock = t.mock.method(globalThis, "fetch", async () => { throw new TypeError("fetch failed"); });
  await assert.rejects(login("A001", "password"), /Unable to reach/);
  mock.mock.mockImplementation(async () => new Response("Bad Gateway", { status: 502 }));
  await assert.rejects(login("A001", "password"), /Login service unavailable/);
});

test("a malformed or expired response cannot create a session", async t => {
  const mock = t.mock.method(globalThis, "fetch", async () => Response.json({ ...session, access_token: null }));
  await assert.rejects(login("A001", "password"), /Invalid login response/);
  mock.mock.mockImplementation(async () => Response.json({ ...session, expires_at: "2000-01-01T00:00:00Z" }));
  await assert.rejects(login("A001", "password"), /Invalid login response/);
});

test("session restoration verifies the saved token with the backend", async t => {
  t.mock.method(globalThis, "fetch", async (path, options) => {
    assert.equal(path, "/api/me");
    assert.equal(options.headers.Authorization, "Bearer signed-token");
    return Response.json({ user_id: session.user_id, role: session.role, expires_at: session.expires_at });
  });
  assert.deepEqual(await restoreSession("signed-token"), session);
});
