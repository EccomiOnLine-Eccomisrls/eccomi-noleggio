import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function loadClassifier() {
  const source = await readFile(
    new URL(
      "../app/lib/server/storage-response.ts",
      import.meta.url,
    ),
    "utf8",
  );

  const transpiled = ts.transpileModule(
    source,
    {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;

  return import(
    `data:text/javascript;base64,${Buffer.from(
      transpiled,
      "utf8",
    ).toString("base64")}`
  );
}

test("PR40 riproduce la risposta reale Supabase HTTP 400 + NoSuchKey come oggetto assente", async () => {
  const {
    isStorageObjectNotFoundResponse,
  } = await loadClassifier();

  const realSupabasePayload = JSON.stringify({
    statusCode: "404",
    error: "not_found",
    message: "Object not found",
    code: "NoSuchKey",
  });

  assert.equal(
    isStorageObjectNotFoundResponse(
      400,
      realSupabasePayload,
    ),
    true,
  );
});

test("PR40 conserva il normale HTTP 404 come oggetto assente", async () => {
  const {
    isStorageObjectNotFoundResponse,
  } = await loadClassifier();

  assert.equal(
    isStorageObjectNotFoundResponse(404, ""),
    true,
  );
});

test("PR40 accetta sia statusCode 404 sia code NoSuchKey su HTTP 400", async () => {
  const {
    isStorageObjectNotFoundResponse,
  } = await loadClassifier();

  assert.equal(
    isStorageObjectNotFoundResponse(
      400,
      JSON.stringify({
        statusCode: 404,
        error: "not_found",
      }),
    ),
    true,
  );

  assert.equal(
    isStorageObjectNotFoundResponse(
      400,
      JSON.stringify({
        code: "NoSuchKey",
      }),
    ),
    true,
  );
});

test("PR40 non nasconde altri errori Storage HTTP 400", async () => {
  const {
    isStorageObjectNotFoundResponse,
  } = await loadClassifier();

  assert.equal(
    isStorageObjectNotFoundResponse(
      400,
      JSON.stringify({
        statusCode: "400",
        error: "invalid_request",
        message: "Invalid bucket",
      }),
    ),
    false,
  );

  assert.equal(
    isStorageObjectNotFoundResponse(
      400,
      "not-json",
    ),
    false,
  );
});

test("PR40 integra il classificatore prima dell'errore fatale di verifica Storage", async () => {
  const storage = await readFile(
    new URL(
      "../app/lib/server/practice-storage.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    storage,
    /isStorageObjectNotFoundResponse/,
  );

  const classifierUse = storage.indexOf(
    "isStorageObjectNotFoundResponse(",
  );
  const fatalError = storage.indexOf(
    "Impossibile verificare il documento caricato",
    classifierUse,
  );

  assert.ok(classifierUse >= 0);
  assert.ok(fatalError > classifierUse);
  assert.match(
    storage,
    /isStorageObjectNotFoundResponse\(\s*response\.status,\s*detail/,
  );
});
