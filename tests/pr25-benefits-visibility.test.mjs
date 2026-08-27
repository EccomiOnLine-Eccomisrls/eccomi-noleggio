import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const files = [
  "app/lib/server/shopify-editorial.ts",
  "app/lib/server/shopify-safe-update.ts",
];

for (const file of files) {
  test(`PR25 keeps benefit cards readable in ${file}`, async () => {
    const source = await readFile(file, "utf8");
    assert.match(source, /data-eccomi-noleggio-benefits-fix/);
    assert.match(source, /\.multicolumn-card__info h3/);
    assert.match(source, /\.multicolumn-card__info \.rte/);
    assert.match(source, /color:#10253e!important/);
    assert.match(source, /BENEFITS_VISIBILITY_STYLE/);
  });
}
