import assert from "node:assert/strict";
import test from "node:test";
import app from "./app.js";
import { config } from "./config.js";
import worker from "../../cloudflare/worker/index.js";

async function withServer(callback) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const address = server.address();
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

test("admin and R2 APIs reject requests without an authenticated session", async () => {
  await withServer(async (baseUrl) => {
    const adminResponse = await fetch(`${baseUrl}/api/admin/users`);
    const studentsResponse = await fetch(`${baseUrl}/api/students?limit=50`);
    const storageResponse = await fetch(`${baseUrl}/api/data/import-history`);
    assert.equal(adminResponse.status, 401);
    assert.equal(studentsResponse.status, 401);
    assert.equal(storageResponse.status, 401);
  });
});

test("state-changing API calls reject missing and foreign origins", async () => {
  await withServer(async (baseUrl) => {
    for (const origin of [undefined, "https://attacker.example"]) {
      const headers = { "Content-Type": "application/json" };
      if (origin) headers.Origin = origin;
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers,
        body: JSON.stringify({ identifier: "student@example.test", password: "password" }),
      });
      assert.equal(response.status, 403);
    }
  });
});

test("login and password-reset routes return JSON instead of an HTML route-not-found page", async () => {
  await withServer(async (baseUrl) => {
    for (const route of ["/api/auth/login", "/api/auth/forgot-password"]) {
      const response = await fetch(`${baseUrl}${route}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: config.appOrigin,
        },
        body: JSON.stringify({ identifier: "", password: "" }),
      });
      assert.notEqual(response.status, 404, `${route} must be registered`);
      assert.match(response.headers.get("content-type") || "", /application\/json/);
    }
  });
});

test("Worker internal D1 and R2 routes require the backend secret", async () => {
  const response = await worker.fetch(
    new Request("https://worker.example/internal/users"),
    {},
  );
  assert.equal(response.status, 401);
});
