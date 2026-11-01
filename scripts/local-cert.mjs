import { mkdir, writeFile } from "node:fs/promises";
import selfsigned from "selfsigned";

const result = await selfsigned.generate(
  [{ name: "commonName", value: "localhost" }],
  {
    keySize: 2048,
    algorithm: "sha256",
    extensions: [
      { name: "basicConstraints", cA: true },
      {
        name: "keyUsage",
        keyCertSign: true,
        digitalSignature: true,
        keyEncipherment: true,
      },
      { name: "extKeyUsage", serverAuth: true },
      {
        name: "subjectAltName",
        altNames: [
          { type: 2, value: "localhost" },
          { type: 7, ip: "127.0.0.1" },
        ],
      },
    ],
  },
);
await mkdir(".local-tls", { recursive: true });
await writeFile(".local-tls/cert.pem", result.cert);
await writeFile(".local-tls/key.pem", result.private, { mode: 0o600 });
console.log(
  "Local test certificate generated. Not a public certificate; do not deploy or commit it.",
);
