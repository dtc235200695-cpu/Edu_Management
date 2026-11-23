import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

test("production accepts only an explicit HTTPS Google OAuth callback", () => {
  const moduleUrl = new URL("./config.js", import.meta.url).href;
  const script =
    `import(${JSON.stringify(moduleUrl)}).then(({ config, missingOAuthSettings }) => ` +
    `console.log(JSON.stringify({ redirectUri: config.redirectUri, missing: missingOAuthSettings })))`;
  const loadConfig = (redirectUri) =>
    JSON.parse(
      execFileSync(process.execPath, ["--input-type=module", "-e", script], {
        encoding: "utf8",
        env: {
          ...process.env,
          NODE_ENV: "production",
          GOOGLE_REDIRECT_URI: redirectUri,
        },
      }),
    );

  const valid = loadConfig("https://auth.example.test/auth/google/callback");
  assert.equal(valid.redirectUri, "https://auth.example.test/auth/google/callback");
  assert.ok(!valid.missing.includes("GOOGLE_REDIRECT_URI"));

  const invalid = loadConfig("http://localhost:8787/auth/google/callback");
  assert.equal(invalid.redirectUri, "");
  assert.ok(invalid.missing.includes("GOOGLE_REDIRECT_URI"));
});
