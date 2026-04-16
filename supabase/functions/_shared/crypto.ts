// supabase/functions/_shared/crypto.ts
// AES-256-GCM Decryption for Deno Edge Functions
// Compatible with the logic in lib/encryption.ts (Node.js)

import { decodeHex } from "https://deno.land/std@0.207.0/encoding/hex.ts";

/**
 * Decrypts hex-encoded ciphertext using AES-256-GCM.
 * The authentication tag is expected as a separate hex string.
 */
export async function decrypt(
  encryptedHex: string,
  ivHex: string,
  authTagHex: string,
  masterKeyHex: string
): Promise<string> {
  try {
    const keyData    = decodeHex(masterKeyHex);
    const iv         = decodeHex(ivHex);
    const authTag    = decodeHex(authTagHex);
    const ciphertext = decodeHex(encryptedHex);

    // Deno Web Crypto expects the tag to be appended to the ciphertext
    const data = new Uint8Array(ciphertext.length + authTag.length);
    data.set(ciphertext);
    data.set(authTag, ciphertext.length);

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      "AES-GCM",
      false,
      ["decrypt"]
    );

    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
        tagLength: 128,
      },
      key,
      data
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    throw new Error(`Decryption failed: ${err.message}`);
  }
}
