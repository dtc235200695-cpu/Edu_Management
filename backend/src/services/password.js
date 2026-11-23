import crypto from "node:crypto";
import { promisify } from "node:util";
import { config } from "../config.js";

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;

export function validPassword(password) {
  return typeof password === "string" && password.length >= 8 && password.length <= 128;
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const derived = await scrypt(password, salt, KEY_LENGTH, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${salt}$${Buffer.from(derived).toString("base64url")}`;
}

export async function verifyPassword(password, storedHash) {
  if (typeof password !== "string" || typeof storedHash !== "string") return false;
  const [algorithm, salt, expectedText, ...extra] = storedHash.split("$");
  if (
    algorithm !== "scrypt" ||
    !salt ||
    !expectedText ||
    extra.length > 0 ||
    !/^[A-Za-z0-9_-]+$/.test(salt) ||
    !/^[A-Za-z0-9_-]+$/.test(expectedText)
  ) {
    return false;
  }
  const expected = Buffer.from(expectedText, "base64url");
  if (expected.length !== KEY_LENGTH) return false;
  const actual = Buffer.from(
    await scrypt(password, salt, KEY_LENGTH, {
      N: 16384,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    }),
  );
  return crypto.timingSafeEqual(actual, expected);
}

export function createTemporaryPassword() {
  return crypto.randomBytes(18).toString("base64url");
}

export function createResetCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashResetCode(userId, code) {
  return crypto
    .createHmac("sha256", config.sessionSecret)
    .update(`${userId}:${code}`)
    .digest("hex");
}

export function validResetCode(code) {
  return typeof code === "string" && /^\d{6}$/.test(code);
}
