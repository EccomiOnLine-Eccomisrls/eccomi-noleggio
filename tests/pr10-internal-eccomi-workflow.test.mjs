import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

function testEnvironment() {
  return {
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 }),
    },
  };
}

const testContext = {
  waitUntil() {},
  passThroughOnException() {},
};

const previewHost = "eccomi-noleggio-pr-10.onrender.com";

function previewRequest(path) {
  return new Request(`https://${previewHost}${path}`, {
    headers: {
      accept: "text/html",
      host: previewHost,
      "x-forwarded-proto": "https",
      "user-agent": "Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 CriOS/140.0 Mobile/15E148 Safari/604.1",
    },
  });
}

test("PR10 preview exposes direct internal ECCOMI quote action with human labels", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    previewRequest("/pr10-eccomi-demo"),
    testEnvironment(),
    testContext,
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /data-pr10-demo-ready="true"/);
  assert.match(html, /In verifica ECCOMI/);
  assert.match(html, /Preventivo predisposto/);
  assert.match(html, /Struttura interna ECCOMI/);
  assert.doesNotMatch(html, />ECCOMI_REVIEW</);
  assert.doesNotMatch(html, />ECCOMI REVIEW</);
});

test("PR10 preview advances from ECCOMI review to quote without partner stages", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    previewRequest("/pr10-eccomi-demo?demoAction=status&status=QUOTE"),
    testEnvironment(),
    testContext,
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /PREVIEW PR10 · Preventivo predisposto simulato/);
  assert.match(html, /Stato corrente:[\s\S]*Preventivo predisposto/);
  assert.match(html, /Contratto acquisito/);
  assert.doesNotMatch(html, /Invia al partner/);
  assert.doesNotMatch(html, /Segna presa in carico partner/);
});

test("backend guards the direct quote transition to CEO plus internal ECCOMI", async () => {
  const source = await readFile(
    new URL("../app/api/practices/[id]/action/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /actor\.role === "CEO"/);
  assert.match(source, /internalEccomi/);
  assert.match(source, /practice\.status === "ECCOMI_REVIEW"/);
  assert.match(source, /nextStatus === "QUOTE"/);
  assert.match(source, /!possible\.includes\(nextStatus\) && !internalDirectQuote/);
});
