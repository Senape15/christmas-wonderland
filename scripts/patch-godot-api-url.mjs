/**
 * Corregge `public/village/index.pck` in modo idempotente.
 *
 * Il progetto Godot chiama HTTPRequest.request("/api/village", ...): Godot 4.7
 * rifiuta gli URL relativi (scene/main/http_request.cpp), quindi il villaggio
 * resta vuoto. Questa patch sostituisce solo la costante stringa nel file
 * `api.gdc` del PCK con un URL assoluto che usa un host segnaposto; lo shim in
 * `public/village/index.html` riscrive quell'host sull'origin corrente.
 *
 * Per non alterare gli offset degli altri file, il nuovo `api.gdc` viene
 * accodato al PCK e viene riscritta solo la directory (puntata dall'header).
 * Aggiornare `fileSizes["index.pck"]` in index.html con la dimensione stampata.
 * Eseguire dopo ogni riesportazione da Godot:
 *   node scripts/patch-godot-api-url.mjs [pckSorgente]
 */

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const TARGET = path.join(import.meta.dirname, "..", "public/village/index.pck");
const SOURCE = process.argv[2] ? path.resolve(process.argv[2]) : TARGET;

const OLD_URL = "/api/village";
const NEW_URL = "http://wonderland.invalid/api/village";
const VARIANT_STRING = 4; // encode_variant: STRING
const FILE_BASE = 112;
const DIR_OFFSET_FIELD = 32;

const u32 = (value) => {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value, 0);
  return buffer;
};

function parsePck(buffer) {
  if (buffer.toString("ascii", 0, 4) !== "GDPC") {
    throw new Error("File PCK non valido");
  }
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const version = view.getUint32(4, true);
  if (version !== 4) {
    throw new Error(`Formato PCK non supportato: ${version}`);
  }
  const fileBase = Number(view.getBigUint64(24, true));
  const dirOffset = Number(view.getBigUint64(DIR_OFFSET_FIELD, true));
  if (fileBase !== FILE_BASE) {
    throw new Error(`Base file inattesa: ${fileBase}`);
  }

  let cursor = dirOffset;
  const count = view.getUint32(cursor, true);
  cursor += 4;
  const files = [];
  for (let i = 0; i < count; i += 1) {
    const nameLength = view.getUint32(cursor, true);
    cursor += 4;
    const name = buffer.toString("utf8", cursor, cursor + nameLength).replace(/\0+$/, "");
    cursor += Math.ceil(nameLength / 4) * 4;
    const offset = Number(view.getBigUint64(cursor, true));
    cursor += 8;
    const size = Number(view.getBigUint64(cursor, true));
    cursor += 8;
    const md5 = Buffer.from(buffer.subarray(cursor, cursor + 16));
    cursor += 16;
    const flags = view.getUint32(cursor, true);
    cursor += 4;
    files.push({ name, offset, size, md5, flags });
  }
  return files;
}

function patchApiScript(data) {
  if (data.toString("ascii", 0, 4) !== "GDSC") {
    throw new Error("api.gdc non e' un buffer di token GDScript");
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const version = view.getUint32(4, true);
  if (version !== 101) {
    throw new Error(`Versione token GDScript non supportata: ${version}`);
  }
  const contents = zlib.zstdDecompressSync(data.subarray(12));

  const before = Buffer.concat([
    u32(VARIANT_STRING),
    u32(OLD_URL.length),
    Buffer.from(OLD_URL, "utf8"),
  ]);
  const after = Buffer.concat([
    u32(VARIANT_STRING),
    u32(NEW_URL.length),
    Buffer.from(NEW_URL, "utf8"),
  ]);
  let patched = contents;
  const index = contents.indexOf(before);
  if (index >= 0) {
    if (contents.indexOf(before, index + 1) !== -1) {
      throw new Error("La costante URL non e' univoca in api.gdc");
    }
    patched = Buffer.concat([
      contents.subarray(0, index),
      after,
      contents.subarray(index + before.length),
    ]);
  } else if (contents.indexOf(after) < 0) {
    throw new Error("Nessuna costante URL trovata in api.gdc");
  }

  // `decompressed_size === 0` indica a Godot che il buffer e' gia' in chiaro:
  // evita di dover ricomprimere con zstd e di indovinare i parametri del frame.
  const header = Buffer.alloc(12);
  header.write("GDSC", 0, "ascii");
  header.writeUInt32LE(version, 4);
  header.writeUInt32LE(0, 8);
  return Buffer.concat([header, patched]);
}

function buildDirectory(files) {
  const size = files.reduce(
    (total, file) => total + 4 + Math.ceil(file.name.length / 4) * 4 + 8 + 8 + 16 + 4,
    4,
  );
  const directory = Buffer.alloc(size);
  directory.writeUInt32LE(files.length, 0);
  let cursor = 4;
  for (const file of files) {
    directory.writeUInt32LE(file.name.length, cursor);
    cursor += 4;
    directory.write(file.name, cursor, "utf8");
    cursor += Math.ceil(file.name.length / 4) * 4;
    directory.writeBigUInt64LE(BigInt(file.offset), cursor);
    cursor += 8;
    directory.writeBigUInt64LE(BigInt(file.size), cursor);
    cursor += 8;
    file.md5.copy(directory, cursor);
    cursor += 16;
    directory.writeUInt32LE(file.flags, cursor);
    cursor += 4;
  }
  return directory;
}

const source = fs.readFileSync(SOURCE);
const files = parsePck(source);
const api = files.find((file) => file.name === "api.gdc");
if (!api) {
  throw new Error("api.gdc assente dal PCK");
}

// Evita di accodare copie inutili se il file e' gia' stato corretto.
const current = source.subarray(FILE_BASE + api.offset, FILE_BASE + api.offset + api.size);
const alreadyPatched = current.toString("ascii", 0, 4) === "GDSC"
  && zlib.zstdDecompressSync(current.subarray(12)).includes(Buffer.from(NEW_URL));
const patchedApi = alreadyPatched ? current : patchApiScript(current);

const dataOffset = source.length;
const directoryOffset = dataOffset + patchedApi.length;
const directory = buildDirectory(
  files.map((file) => file.name === "api.gdc"
    ? {
      ...file,
      offset: dataOffset - FILE_BASE,
      size: patchedApi.length,
      md5: createHash("md5").update(patchedApi).digest(),
    }
    : file),
);

const output = Buffer.alloc(directoryOffset + directory.length);
source.copy(output, 0);
patchedApi.copy(output, dataOffset);
directory.copy(output, directoryOffset);
output.writeBigUInt64LE(BigInt(directoryOffset), DIR_OFFSET_FIELD);
fs.writeFileSync(TARGET, output);

console.log(`Scritto ${path.relative(process.cwd(), TARGET)} (${output.length} byte)`);
console.log(`Dimensione da indicare in fileSizes: ${output.length}`);
