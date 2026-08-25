import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  assert.match(editor, /data-eccomi-preview-native-form="true"/);
  assert.match(editor, /method="get"/);
  assert.match(
    editor,
    /<button(?=[^>]*name="previewAction")(?=[^>]*value="add7")[^>]*>/,
  );
  assert.match(editor, /id="ec-preview-brand"/);
  assert.match(editor, /id="ec-preview-valid-until"/);
  assert.match(editor, /id="ec-preview-km"[^>]*step="1"/);
  assert.doesNotMatch(editor, /id="ec-preview-km"[^>]*step="1000"/);
  assert.match(editor, /SIMULA SALVATAGGIO/);

  const extended = await render(
    "/?view=promotions&edit=preview-peugeot-3008&validUntil=2026-08-29&previewAction=add7",
  );
  assert.match(
    extended,
    /<input(?=[^>]*id="ec-preview-valid-until")(?=[^>]*value="2026-09-05")[^>]*>/,
  );
  assert.match(extended, /data-eccomi-preview-date-updated="true"/);
  assert.match(extended, /Nuova scadenza:[\s\S]{0,30}5 settembre 2026/);

  const saved = await render(
    "/?view=promotions&edit=preview-peugeot-3008&brand=PEUGEOT&model=3008&version=3008%203008%20Hybrid%20145&previewAction=save",
  );
  assert.match(saved, /PEUGEOT 3008 Hybrid 145/);
  assert.match(saved, /SIMULAZIONE COMPLETATA/);
  assert.match(saved, /Nessuna modifica salvata su Supabase o Shopify/);
});

test("accepts exact mileage values in the production promotion editor", async () => {
  const source = await readFile(
    new URL("../app/promotion-edit-controls.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /<input type="number" min="1" step="1" value=\{editor\.totalKm\}/,
  );
  assert.doesNotMatch(
    source,
    /<input type="number" min="1" step="1000" value=\{editor\.totalKm\}/,
  );
});

test("renders server-first CEO login and native iPad promotion management", async () => {
  const worker = await loadWorker();
  const previewHost = "eccomi-noleggio-pr-4.onrender.com";
  const request = async (pathname, init = {}) => worker.fetch(
    new Request(`https://${previewHost}${pathname}`, {
      ...init,
      headers: {
        accept: "text/html",
        host: previewHost,
        "x-forwarded-proto": "https",
        ...(init.headers || {}),
      },
    }),
    testEnvironment(),
    testContext,
  );

  const loginResponse = await request("/ceo?authPreview=1");
  assert.equal(loginResponse.status, 200);
  const login = await loginResponse.text();
  assert.match(login, /data-server-auth-ready="true"/);
  assert.match(login, /Entra in ECCOMI NOLEGGIO/);
  assert.doesNotMatch(login, /Verifica accesso/);

  const dashboardResponse = await request("/ceo");
  assert.equal(dashboardResponse.status, 200);
  const dashboard = await dashboardResponse.text();
  assert.match(dashboard, /data-server-dashboard-ready="true"/);
  assert.match(dashboard, /Gestione promozioni iPad/);
  assert.doesNotMatch(dashboard, /Verifica accesso/);

  const promotionsResponse = await request("/ceo/promotions");
  assert.equal(promotionsResponse.status, 200);
  const promotions = await promotionsResponse.text();
  assert.match(promotions, /data-server-promotions-ready="true"/);
  assert.match(promotions, /PEUGEOT/);
  assert.match(promotions, /href="\/ceo\/promotions\/preview-peugeot-3008"/);

  const editorResponse = await request(
    "/ceo/promotions/preview-peugeot-3008?dateAction=reactivate30",
  );
  assert.equal(editorResponse.status, 200);
  const editor = await editorResponse.text();
  assert.match(editor, /data-server-editor-ready="true"/);
  assert.match(editor, /method="post"/);
  assert.match(editor, /action="\/api\/promotions\/preview-peugeot-3008\/edit-form"/);
  assert.match(
    editor,
    /<input(?=[^>]*name="totalKm")(?=[^>]*step="1")[^>]*>/,
  );
  assert.match(editor, /SALVA E RIATTIVA|SIMULA SALVATAGGIO/);

  const form = new URLSearchParams({
    returnTo: "/ceo/promotions/preview-peugeot-3008",
    brand: "PEUGEOT",
    model: "3008",
    version: "Hybrid 145 e-DCS6 Allure Business",
    provider: "Partner demo ECCOMI",
    monthly: "561.13",
    deposit: "0.00",
    duration: "36",
    totalKm: "60000",
    validUntil: "2026-09-24",
    delivery: "22 settimane",
    fuel: "Hybrid",
    transmission: "Automatico e-DCS6",
    color: "Grigio",
    services: "Manutenzione ordinaria e straordinaria",
    warnings: "Immagine illustrativa",
    reactivate: "true",
  });
  const saveResponse = await request(
    "/api/promotions/preview-peugeot-3008/edit-form",
    {
      method: "POST",
      body: form,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      redirect: "manual",
    },
  );
  assert.equal(saveResponse.status, 303);
  assert.equal(
    saveResponse.headers.get("location"),
    `https://${previewHost}/ceo/promotions/preview-peugeot-3008?saved=1`,
  );
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
