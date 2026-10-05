// Browser-side crypto for the transcribe form (WebCrypto only, no libraries).
//
// token.enc.json: the GitHub token, AES-256-GCM encrypted with a key derived from the
//   passphrase (PBKDF2-SHA256, many iterations so offline guessing is slow).
// payload: the request (audio link, email, nid, note), encrypted so it never appears in
//   this public repo's run logs. A random AES-256-GCM key encrypts the JSON; that key is
//   encrypted with the RSA-OAEP-SHA256 public key in payload-key.pem. Only the private
//   repo holds the matching private key (secret PAYLOAD_PRIVATE_KEY).

const PBKDF2_ITER = 1000000;
const te = new TextEncoder(), td = new TextDecoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function passKey(passphrase, salt, iter) {
  const base = await crypto.subtle.importKey("raw", te.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

async function encryptToken(token, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await passKey(passphrase, salt, PBKDF2_ITER);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, te.encode(token));
  return { v: 1, kdf: "PBKDF2-SHA256", iter: PBKDF2_ITER, salt: b64(salt), iv: b64(iv), ct: b64(ct),
           made: new Date().toISOString().slice(0, 10) };
}

async function decryptToken(blob, passphrase) {
  const key = await passKey(passphrase, unb64(blob.salt), blob.iter);
  return td.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(blob.iv) }, key, unb64(blob.ct)));
}

async function encryptPayload(pem, obj) {
  const der = unb64(pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, ""));
  const pub = await crypto.subtle.importKey("spki", der, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
  const aes = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aes, te.encode(JSON.stringify(obj)));
  const k = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, pub, await crypto.subtle.exportKey("raw", aes));
  return btoa(JSON.stringify({ v: 1, k: b64(k), iv: b64(iv), ct: b64(ct) }));
}

if (typeof module !== "undefined") module.exports = { encryptToken, decryptToken, encryptPayload };
