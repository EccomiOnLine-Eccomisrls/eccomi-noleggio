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

test("renders the isolated PR fixture with its hydration guard before the client entry", async () => {
  const worker = await loadWorker();
  const previewHost = "eccomi-noleggio-pr-3.onrender.com";
  const response = await worker.fetch(
    new Request(`https://${previewHost}/`, {
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
  const html = await response.text();
  const guardPosition = html.indexOf(
    'data-eccomi-preview-hydration-guard="true"',
  );
  const clientEntryPosition = html.indexOf('id="_R_"');

  assert.ok(guardPosition >= 0, "preview hydration guard is missing");
  assert.ok(
    clientEntryPosition > guardPosition,
    "preview hydration guard must execute before the client entry",
  );
  assert.match(html, /PEUGEOT/);
  assert.match(html, /3008 Hybrid 145 e-DCS6 Allure Business/);
  assert.doesNotMatch(html, /Verifica accesso/);
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
