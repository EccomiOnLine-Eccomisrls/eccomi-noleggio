import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../app/api/practices/[id]/action-form/route.ts", import.meta.url),
  "utf8",
);

test("PR11 intercetta un doppio invio dello stesso stato", () => {
  assert.match(
    source,
    /\^Passaggio da \(\[A-Z0-9_\]\+\) a \\\\1 non consentito/,
  );
  assert.match(source, /sameStatusAlreadyApplied\(payload\.error\)/);
});

test("PR11 restituisce feedback positivo senza seconda modifica", () => {
  assert.match(source, /Stato già aggiornato:/);
  assert.match(source, /Nessuna seconda modifica eseguita\./);
  assert.match(source, /redirectBack\([\s\S]*?request,[\s\S]*?id,[\s\S]*?true,[\s\S]*?`Stato già aggiornato:/);
});
