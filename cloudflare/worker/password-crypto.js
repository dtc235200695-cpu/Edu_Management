import scryptPackage from "scrypt-js";

const KEY_LENGTH = 64;
const encoder = new TextEncoder();
const { scrypt } = scryptPackage;

function encodeBase64Url(bytes) {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value) {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function hashPassword(password) {
    const salt = encodeBase64Url(crypto.getRandomValues(new Uint8Array(16)));
    const derived = await scrypt(
        encoder.encode(password),
        encoder.encode(salt),
        16384,
        8,
        1,
        KEY_LENGTH,
    );
    return `scrypt$${salt}$${encodeBase64Url(derived)}`;
}

export async function verifyPassword(password, storedHash) {
    if (typeof password !== "string" || typeof storedHash !== "string") return false;
    const [algorithm, saltText, expectedText, ...extra] = storedHash.split("$");
    if (
        algorithm !== "scrypt" ||
        !saltText ||
        !expectedText ||
        extra.length > 0 ||
        !/^[A-Za-z0-9_-]+$/.test(saltText) ||
        !/^[A-Za-z0-9_-]+$/.test(expectedText)
    ) {
        return false;
    }

    try {
        const salt = encoder.encode(saltText);
        const expected = decodeBase64Url(expectedText);
        if (expected.length !== KEY_LENGTH) return false;
        const actual = await scrypt(
            encoder.encode(password),
            salt,
            16384,
            8,
            1,
            KEY_LENGTH,
        );
        let difference = 0;
        for (let index = 0; index < KEY_LENGTH; index += 1) {
            difference |= actual[index] ^ expected[index];
        }
        return difference === 0;
    } catch {
        return false;
    }
}
