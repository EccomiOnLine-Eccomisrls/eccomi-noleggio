import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("app/ceo/commissions/page.tsx", "utf8");

test("PR33 chiarisce i KPI economici senza cambiare i filtri di stato", () => {
  assert.match(source, /DA FATTURARE · IMPONIBILE/);
  assert.match(source, /DA INCASSARE · IMPONIBILE/);
  assert.match(source, /INCASSATE · IMPONIBILE/);

  assert.match(source, /item\.status === "ACCRUED"/);
  assert.match(source, /item\.status === "INVOICED"/);
  assert.match(source, /item\.status === "PAID"/);
});
