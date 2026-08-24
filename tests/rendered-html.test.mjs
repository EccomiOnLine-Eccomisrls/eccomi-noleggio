import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

function testEnvironment(overrides = {}) {
  return {
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 }),
    },
    ...overrides,
  };
}

const testContext = {
  waitUntil() {},
  passThroughOnException() {},
};

test("renders development preview metadata", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html", host: "localhost" },
    }),
    testEnvironment(),
    testContext,
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("renders a clientless PR demo with real dashboard, promotion and editor links", async () => {
  const worker = await loadWorker();
  const previewHost = "eccomi-noleggio-pr-3.onrender.com";
  const render = async (pathname) => {
    const response = await worker.fetch(
      new Request(`https://${previewHost}${pathname}`, {
        headers: {
          accept: "text/html",
          host: previewHost,
          "x-forwarded-proto": "https",
        },
      }),
      testEnvironment(),
      testContext,
    );
    assert.equal(response.status, 200);
    return response.text();
  };

  const dashboard = await render("/");
  assert.match(dashboard, /data-eccomi-clientless-preview="true"/);
  assert.match(dashboard, /href="\/?\?view=promotions"/);
  assert.match(dashboard, /PREVIEW CLIENTLESS ATTIVA/);
  assert.match(dashboard, /PEUGEOT/);
  assert.doesNotMatch(dashboard, /Verifica accesso/);

  const promotions = await render("/?view=promotions");
  assert.match(promotions, /<h1>Promozioni<\/h1>/);
  assert.match(promotions, /3008 Hybrid 145 e-DCS6 Allure Business/);
  assert.match(promotions, /href="\/?\?view=promotions&amp;edit=preview-peugeot-3008"/);

  const editor = await render(
    "/?view=promotions&edit=preview-peugeot-3008",
  );
  assert.match(editor, /id="ec-preview-editor-form"/);
  assert.match(editor, /data-eccomi-preview-editor-runtime="true"/);
  assert.match(editor, /id="ec-preview-brand"/);
  assert.match(editor, /id="ec-preview-valid-until"/);
  assert.match(editor, /SIMULA SALVATAGGIO/);
});

test("sends the public noleggio domain to the Shopify page", async () => {
  const worker = await loadWorker();
  const destination = "https://eccomionline.com/pages/eccomi-noleggio";

  for (const pathname of ["/", "/offerte", "/offerte/"]) {
    const response = await worker.fetch(
      new Request(`https://noleggio.eccomionline.com${pathname}`),
      testEnvironment({ PUBLIC_SHOWROOM_BASE_URL: destination }),
      testContext,
    );

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), destination);
  }
});

test("keeps the guided rental request on the operational application", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://noleggio.eccomionline.com/richiesta?promozione=test"),
    testEnvironment({
      PUBLIC_SHOWROOM_BASE_URL: "https://eccomionline.com/pages/eccomi-noleggio",
    }),
    testContext,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
});

test("protects the ECCOMI HUB KPI endpoint", async () => {
  const worker = await loadWorker();
  const unconfigured = await worker.fetch(
    new Request("https://eccomi-noleggio.example/api/internal/hub-summary"),
    testEnvironment(),
    testContext,
  );
  assert.equal(unconfigured.status, 503);

  const denied = await worker.fetch(
    new Request("https://eccomi-noleggio.example/api/internal/hub-summary", {
      headers: { authorization: "Bearer wrong-secret" },
    }),
    testEnvironment({ HUB_READ_SECRET: "correct-long-random-secret" }),
    testContext,
  );
  assert.equal(denied.status, 401);
});
