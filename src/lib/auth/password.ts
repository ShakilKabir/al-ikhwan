/**
 * Password hashing with scrypt (built into Node), using OWASP's recommended
 * cost. The parameters are stored with each hash, so they can be raised later
 * without breaking existing passwords.
 */
import { randomBytes, randomInt, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const COST = { N: 2 ** 17, r: 8, p: 1 };
const KEY_LENGTH = 64;
// N=2^17, r=8 needs 128 MiB; Node's default limit is 32 MiB.
const MAX_MEMORY = 256 * 1024 * 1024;

function derive(password: string, salt: Buffer, keyLength: number, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, keyLength, { ...options, maxmem: MAX_MEMORY }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

/** Returns "scrypt$N$r$p$salt$hash" (salt and hash in base64). */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, KEY_LENGTH, COST);
  return ["scrypt", COST.N, COST.r, COST.p, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, N, r, p, salt, hash] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await derive(password, Buffer.from(salt, "base64"), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  });
  return timingSafeEqual(actual, expected);
}

/** A readable random password for new accounts and resets, e.g. "k7qm-x2fp-9hwe". */
export function temporaryPassword() {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const group = () => Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("");
  return [group(), group(), group()].join("-");
}
