import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const loadModule = createRequire(import.meta.url);
const { getRootDirs } = loadModule("@next/eslint-plugin-next/dist/utils/get-root-dirs.js");

describe("Next lint root-directory discovery with the reviewed glob replacement", () => {
  it("preserves the default root and discovers only directories for string/array globs", () => {
    const root = mkdtempSync(path.join(tmpdir(), "pmc-lint-"));
    try {
      const first = path.join(root, "apps", "one");
      const second = path.join(root, "apps", "два with space");
      mkdirSync(first, { recursive: true });
      mkdirSync(second, { recursive: true });
      writeFileSync(path.join(root, "apps", "not-a-directory"), "synthetic");
      const normalize = (values: string[]) => values.map(value => path.resolve(value)).sort();
      const context = (rootDir?: string | string[]) => ({ cwd: root, settings: { next: { rootDir } } });
      expect(getRootDirs(context())).toEqual([root]);
      const discovered = getRootDirs(context(path.join(root, "apps", "*")));
      expect(normalize(discovered)).toEqual([first, second].sort());
      expect(normalize(getRootDirs(context([first, second])))).toEqual([first, second].sort());
      expect(getRootDirs(context(path.join(root, "missing", "*")))).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
