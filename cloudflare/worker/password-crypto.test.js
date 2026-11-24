import assert from "node:assert/strict";
import { scrypt as nativeScrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import test from "node:test";
import { hashPassword, verifyPassword } from "./password-crypto.js";

const scrypt = promisify(nativeScrypt);

test("Worker password hashing stays compatible with existing Node scrypt hashes", async () => {
    const password = "correct horse battery staple";
    const salt = randomBytes(16).toString("base64url");
    const hash = Buffer.from(
        await scrypt(password, salt, 64, {
            N: 16384,
            r: 8,
            p: 1,
            maxmem: 64 * 1024 * 1024,
        }),
    ).toString("base64url");
    assert.equal(await verifyPassword(password, `scrypt$${salt}$${hash}`), true);
    assert.equal(await verifyPassword("wrong password", `scrypt$${salt}$${hash}`), false);
});

test("Worker password hashes can be verified by Node's native scrypt", async () => {
    const password = "a-long-enough-password";
    const encoded = await hashPassword(password);
    const [, salt, expected] = encoded.split("$");
    const actual = Buffer.from(
        await scrypt(password, salt, 64, {
            N: 16384,
            r: 8,
            p: 1,
            maxmem: 64 * 1024 * 1024,
        }),
    ).toString("base64url");
    assert.equal(actual, expected);
});
