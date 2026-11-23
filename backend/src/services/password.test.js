import assert from "node:assert/strict";
import test from "node:test";
import {
  hashPassword,
  hashResetCode,
  validPassword,
  validResetCode,
  verifyPassword,
} from "./password.js";

test("password policy accepts 8 to 128 characters", () => {
  assert.equal(validPassword("a".repeat(7)), false);
  assert.equal(validPassword("a".repeat(8)), true);
  assert.equal(validPassword("a".repeat(128)), true);
  assert.equal(validPassword("a".repeat(129)), false);
});

test("scrypt hashes verify only the matching password", async () => {
  const hash = await hashPassword("correct-horse-battery");
  assert.match(hash, /^scrypt\$/);
  assert.equal(await verifyPassword("correct-horse-battery", hash), true);
  assert.equal(await verifyPassword("incorrect-password", hash), false);
});

test("reset codes require six digits and are bound to an account", () => {
  assert.equal(validResetCode("012345"), true);
  assert.equal(validResetCode("12345"), false);
  assert.notEqual(hashResetCode("user-a", "012345"), hashResetCode("user-b", "012345"));
});
