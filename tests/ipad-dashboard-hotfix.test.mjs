import assert from "node:assert/strict";
import test from "node:test";

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

const previewHost = "eccomi-noleggio-pr-99.onrender.com";

function dashboardRequest(userAgent) {
  return new Request(`https://${previewHost}/ceo`, {
    headers: {
      accept: "text/html",
      host: previewHost,
      "x-forwarded-proto": "https",
      ...(userAgent ? { "user-agent": userAgent } : {}),
    },
  });
}

test("serves the lightweight server dashboard to Chrome on iPad", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    dashboardRequest(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1",
    ),
    testEnvironment(),
    testContext,
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /data-ipad-safe-dashboard="true"/);
  assert.match(html, /MODALITÀ COMPATIBILITÀ IPAD/);
  assert.match(html, /href="\/ceo\/promotions"/);
  assert.doesNotMatch(html, /data-server-dashboard-ready="true"/);
});

test("keeps the full CEO dashboard for non-iPad browsers", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    dashboardRequest(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36",
    ),
    testEnvironment(),
    testContext,
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /data-server-dashboard-ready="true"/);
  assert.doesNotMatch(html, /data-ipad-safe-dashboard="true"/);
});
