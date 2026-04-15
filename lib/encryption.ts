// lib/encryption.ts — SERVER-SIDE ONLY (never import in client components)
// AES-256-GCM using Node.js native crypto module.

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? "";



export function encrypt(plaintext: string): {
  encrypted: string;
  iv: string;
  authTag: string;
} {
  const key    = Buffer.from(ENCRYPTION_KEY, "hex");
  const iv     = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    encrypted: encrypted.toString("hex"),
    iv:        iv.toString("hex"),
    authTag:   authTag.toString("hex"),
  };
}

export function decrypt(
  encryptedHex: string,
  ivHex:        string,
  authTagHex:   string
): string {
  const key      = Buffer.from(ENCRYPTION_KEY, "hex");
  const iv       = Buffer.from(ivHex, "hex");
  const authTag  = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}
