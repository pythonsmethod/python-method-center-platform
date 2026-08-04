import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Asking Postgres for a column that does not exist.
//
// It is not a type error and not a build error: the query object is
// perfectly well-typed, and the failure arrives at runtime as a message
// nobody sees unless it is printed. The review panel asked
// uploaded_documents for a mime_type column that has never existed, and
// the whole feature answered "не удалось получить список документов" on a
// case that plainly had four of them.
//
// This reads the column names out of the migrations and checks every
// simple .from(...).select(...) against them. Selects with a nested join —
// profiles(email, full_name) — are skipped: their shape needs a real
// parser, and they are not where this class of mistake happens.

const ROOTS = ["app", "components", "lib"];
const MIGRATIONS = "supabase/migrations";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);

    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }

  return out;
}

// table -> columns, assembled from create table and later add column.
function readSchema(): Map<string, Set<string>> {
  const schema = new Map<string, Set<string>>();
  const files = readdirSync(MIGRATIONS).filter((name) => name.endsWith(".sql")).sort();

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS, file), "utf8");

    const creates = sql.matchAll(
      /create table (?:if not exists )?public\.(\w+)\s*\(([\s\S]*?)\n\);/g
    );

    for (const [, table, body] of creates) {
      const columns = schema.get(table) ?? new Set<string>();

      for (const line of body.split("\n")) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith("--")) continue;
        // Table-level constraints, not columns.
        if (/^(primary key|unique|foreign key|constraint|check)\b/i.test(trimmed)) continue;

        const name = trimmed.match(/^(\w+)\s/);
        if (name) columns.add(name[1]);
      }

      schema.set(table, columns);
    }

    const adds = sql.matchAll(
      /alter table public\.(\w+)\s+add column (?:if not exists )?(\w+)/g
    );

    for (const [, table, column] of adds) {
      const columns = schema.get(table) ?? new Set<string>();
      columns.add(column);
      schema.set(table, columns);
    }
  }

  return schema;
}

type Selection = { file: string; table: string; columns: string[] };

function findSelections(files: string[]): Selection[] {
  const found: Selection[] = [];
  // .from("table")  …  .select("a, b, c")   — the select must follow the
  // from with nothing but whitespace and chained calls between them.
  const pattern =
    /\.from\(\s*["'`](\w+)["'`]\s*\)[\s\S]{0,200}?\.select\(\s*["'`]([^"'`]+)["'`]/g;

  for (const file of files) {
    const source = readFileSync(file, "utf8");

    for (const [, table, columnList] of source.matchAll(pattern)) {
      // Nested joins need a real parser; skip them rather than guess.
      if (columnList.includes("(")) continue;
      if (columnList.trim() === "*") continue;

      found.push({
        file,
        table,
        columns: columnList
          .split(",")
          .map((column) => column.trim().split(/[\s:]/)[0])
          .filter(Boolean)
      });
    }
  }

  return found;
}

describe("every column a query asks for", () => {
  const schema = readSchema();
  const selections = findSelections(ROOTS.flatMap((root) => walk(root)));

  it("has a schema to check against", () => {
    expect(schema.size).toBeGreaterThan(10);
    expect(schema.get("uploaded_documents")?.has("storage_path")).toBe(true);
    // The column whose absence started this.
    expect(schema.get("uploaded_documents")?.has("mime_type")).toBe(false);
  });

  it("finds the queries it is meant to be checking", () => {
    expect(selections.length).toBeGreaterThan(10);
  });

  it("exists in the migrations", () => {
    const problems: string[] = [];

    for (const selection of selections) {
      const columns = schema.get(selection.table);

      // A table this test cannot see (a view, or one made outside the
      // migrations) is not evidence of a mistake.
      if (!columns) continue;

      for (const column of selection.columns) {
        if (!columns.has(column)) {
          problems.push(
            `${selection.file}: ${selection.table}.${column} does not exist`
          );
        }
      }
    }

    expect(problems).toEqual([]);
  });
});
