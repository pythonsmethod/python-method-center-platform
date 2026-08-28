import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const targetDir = resolve(root, "public", "stockfish");

await mkdir(targetDir, { recursive: true });
const engine = await readFile(resolve(root, "node_modules", "stockfish.js", "stockfish.js"), "utf8");
await writeFile(resolve(targetDir, "stockfish.js"), `/* eslint-disable */\n${engine}`, "utf8");
