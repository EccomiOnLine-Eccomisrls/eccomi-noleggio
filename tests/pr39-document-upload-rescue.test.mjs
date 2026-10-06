import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("PR39 firma upload Storage lato server senza esporre service role al browser", async () => {
  const storage = await read("app/lib/server/practice-storage.ts");
  const client = await read("app/richiesta/request-client.tsx");

  assert.match(
    storage,
    /object\/upload\/sign/,
  );
  assert.match(
    storage,
    /createPracticeDocumentSignedUpload/,
  );
  assert.match(
    storage,
    /authorization: `Bearer \${serviceRoleKey}`/,
  );
  assert.doesNotMatch(
    client,
    /SUPABASE_SERVICE_ROLE_KEY|serviceRoleKey/,
  );
});

test("PR39 sposta i byte fuori da Render e usa signed URL diretta", async () => {
  const client = await read("app/richiesta/request-client.tsx");

  assert.match(
    client,
    /document-upload\/prepare/,
  );
  assert.match(
    client,
    /preparePayload\.signedUrl/,
  );
  assert.match(
    client,
    /method: "PUT"/,
  );
  assert.match(
    client,
    /directBody\.append\("", input\.file, input\.file\.name\)/,
  );
  assert.doesNotMatch(
    client,
    /\/document`,[\s\S]{0,160}body: uploadBody/,
  );
});

test("PR39 prepara upload solo per pratiche che accettano documenti", async () => {
  const route = await read(
    "app/api/public/applications/[id]/document-upload/prepare/route.ts",
  );

  assert.match(route, /UPLOAD_IN_PROGRESS/);
  assert.match(route, /UPLOAD_ERROR/);
  assert.match(route, /practiceDocuments\.id/);
  assert.match(route, /alreadyComplete: true/);
  assert.match(route, /createPracticeDocumentSignedUpload/);
});

test("PR39 preview prepare resta isolata prima di DB e Storage", async () => {
  const route = await read(
    "app/api/public/applications/[id]/document-upload/prepare/route.ts",
  );

  const preview = route.indexOf(
    "isRenderPullRequestPreview(request)",
  );
  const schema = route.indexOf(
    "await ensurePracticeSchema()",
  );
  const storage = route.indexOf(
    "await createPracticeDocumentSignedUpload",
  );

  assert.ok(preview >= 0);
  assert.ok(schema > preview);
  assert.ok(storage > preview);
  assert.match(route, /signedUrl: null/);
});

test("PR39 finalizza metadati solo dopo verifica oggetto Storage", async () => {
  const route = await read(
    "app/api/public/applications/[id]/document-upload/complete/route.ts",
  );

  const info = route.indexOf(
    "await getPracticeDocumentObjectInfo(objectKey)",
  );
  const insert = route.indexOf(
    ".insert(practiceDocuments)",
  );

  assert.ok(info >= 0);
  assert.ok(insert > info);
  assert.match(route, /stored\.sizeBytes/);
  assert.match(route, /stored\.mimeType/);
  assert.match(route, /storageBucket: stored\.bucket/);
  assert.match(route, /storageKey: stored\.objectKey/);
});

test("PR39 complete preview resta isolata prima di DB e Storage", async () => {
  const route = await read(
    "app/api/public/applications/[id]/document-upload/complete/route.ts",
  );

  const preview = route.indexOf(
    "isRenderPullRequestPreview(request)",
  );
  const schema = route.indexOf(
    "await ensurePracticeSchema()",
  );
  const info = route.indexOf(
    "await getPracticeDocumentObjectInfo(objectKey)",
  );

  assert.ok(preview >= 0);
  assert.ok(schema > preview);
  assert.ok(info > preview);
  assert.match(route, /preview: true/);
});

test("PR39 retry e finalize sono idempotenti", async () => {
  const client = await read("app/richiesta/request-client.tsx");
  const complete = await read(
    "app/api/public/applications/[id]/document-upload/complete/route.ts",
  );

  assert.match(
    client,
    /documentUploadIds = useRef/,
  );
  assert.match(
    client,
    /for \(let attempt = 0; attempt < 2; attempt \+= 1\)/,
  );
  assert.match(
    client,
    /if \(preparePayload\.alreadyComplete\)/,
  );
  assert.match(
    client,
    /if \(preparePayload\.alreadyUploaded\)/,
  );
  assert.match(
    client,
    /const completed = await finalize\(\)/,
  );

  assert.match(
    complete,
    /onConflictDoNothing\(\)/,
  );
  assert.match(
    complete,
    /duplicate: inserted\.length === 0/,
  );
});

test("PR39 valida tipo e dimensione prima di firmare upload", async () => {
  const validation = await read(
    "app/lib/server/practice-document-upload.ts",
  );

  assert.match(
    validation,
    /PRACTICE_DOCUMENT_MAX_BYTES = 10 \* 1024 \* 1024/,
  );
  assert.match(
    validation,
    /application\/pdf/,
  );
  assert.match(
    validation,
    /image\/jpeg/,
  );
  assert.match(
    validation,
    /image\/png/,
  );
  assert.match(
    validation,
    /PRACTICE_DOCUMENT_TYPES\.has\(documentType\)/,
  );
});

test("PR39 usa chiave oggetto deterministica per retry della stessa selezione", async () => {
  const storage = await read("app/lib/server/practice-storage.ts");
  const client = await read("app/richiesta/request-client.tsx");

  assert.match(
    storage,
    /practiceDocumentObjectKey/,
  );
  assert.match(
    storage,
    /input\.uploadId/,
  );
  assert.match(
    client,
    /documentUploadIds\.current\.get\(fingerprint\)/,
  );
  assert.match(
    client,
    /documentUploadIds\.current\.set/,
  );
});
