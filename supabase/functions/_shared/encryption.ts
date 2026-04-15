// Shared encryption helpers for Supabase Edge Functions (Deno / Web Crypto API)
// AES-256-GCM — ENCRYPTION_KEY must be a 64-char hex string (32 bytes)

const ENCRYPTION_KEY = Deno.env.get("ENCRYPTION_KEY") ?? "";

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function importKey(keyHex: string): Promise<CryptoKey> {
  const keyBytes = hexToBytes(keyHex);
  return crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encrypt(
  plaintext: string
): Promise<{ encrypted: string; iv: string; authTag: string }> {
  const key = await importKey(ENCRYPTION_KEY);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  // Web Crypto appends 16-byte auth tag to ciphertext
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  const encryptedBytes = new Uint8Array(encryptedBuffer);
  const ciphertext = encryptedBytes.slice(0, -16);
  const authTag = encryptedBytes.slice(-16);

  return {
    encrypted: bytesToHex(ciphertext),
    iv: bytesToHex(iv),
    authTag: bytesToHex(authTag),
  };
}

export async function decrypt(
  encryptedHex: string,
  ivHex: string,
  authTagHex: string
): Promise<string> {
  const key = await importKey(ENCRYPTION_KEY);
  const ciphertext = hexToBytes(encryptedHex);
  const authTag = hexToBytes(authTagHex);
  const iv = hexToBytes(ivHex);

  // Reassemble ciphertext + auth tag before decryption
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext);
  combined.set(authTag, ciphertext.length);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    combined
  );

  return new TextDecoder().decode(decrypted);
}
