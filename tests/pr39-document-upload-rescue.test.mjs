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
    /const fingerprint = \[[\s\S]*newPracticeCode[\s\S]*requirement\.key/,
  );
  assert.match(
    client,
    /documentUploadIds\.current\.get\(fingerprint\)/,
  );
  assert.match(
    client,
    /documentUploadIds\.current\.set/,
  );
  assert.match(
    client,
    /createDocumentUploadId\(\s*fingerprint/,
  );
  assert.match(
    client,
    /browserCrypto\.subtle\.digest/,
  );
});


test("PR39 retry copre anche interruzioni prepare e finalize", async () => {
  const client = await read("app/richiesta/request-client.tsx");

  assert.match(
    client,
    /Connessione interrotta durante la preparazione/,
  );
  assert.match(
    client,
    /Connessione interrotta durante la registrazione/,
  );
  assert.match(
    client,
    /prepareResponse\.status >= 400[\s\S]*prepareResponse\.status < 500/,
  );
  assert.match(
    client,
    /if \(completed\.response\?\.ok\)/,
  );
});

test("PR39 prepare riconosce file già arrivato su Storage prima di firmarne un altro", async () => {
  const route = await read(
    "app/api/public/applications/[id]/document-upload/prepare/route.ts",
  );

  const info = route.indexOf(
    "await getPracticeDocumentObjectInfo(expectedObjectKey)",
  );
  const sign = route.indexOf(
    "await createPracticeDocumentSignedUpload",
  );

  assert.ok(info >= 0);
  assert.ok(sign > info);
  assert.match(route, /alreadyUploaded: true/);
  assert.match(route, /alreadyUploaded: false/);
});


test("PR39 prepare impedisce collisioni documentId tra pratiche diverse", async () => {
  const prepare = await read(
    "app/api/public/applications/[id]/document-upload/prepare/route.ts",
  );

  assert.match(
    prepare,
    /leadId: practiceDocuments\.leadId/,
  );
  assert.match(
    prepare,
    /if \(existing\.leadId !== id\)/,
  );
  assert.match(
    prepare,
    /Identificativo documento già utilizzato\./,
  );
});


test("PR39 hardening forza i vincoli anche sul bucket Storage esistente", async () => {
  const storage = await read(
    "app/lib/server/practice-storage.ts",
  );
  const policy = await read(
    "app/lib/server/practice-document-upload.ts",
  );

  assert.match(
    storage,
    /const current = await response\.json\(\)/,
  );
  assert.match(
    storage,
    /const needsHardening =/,
  );
  assert.match(
    storage,
    /current\.public !== false/,
  );
  assert.match(
    storage,
    /current\.file_size_limit[\s\S]*PRACTICE_DOCUMENT_MAX_BYTES/,
  );
  assert.match(
    storage,
    /current\.allowed_mime_types/,
  );
  assert.match(
    storage,
    /method: "PUT"/,
  );
  assert.match(
    storage,
    /public: false/,
  );
  assert.match(
    storage,
    /file_size_limit: PRACTICE_DOCUMENT_MAX_BYTES/,
  );
  assert.match(
    storage,
    /allowed_mime_types: desiredMimeTypes/,
  );

  assert.match(
    policy,
    /PRACTICE_DOCUMENT_MAX_BYTES = 10 \* 1024 \* 1024/,
  );
  assert.match(
    policy,
    /"application\/pdf"/,
  );
  assert.match(
    policy,
    /"image\/jpeg"/,
  );
  assert.match(
    policy,
    /"image\/png"/,
  );
});

test("PR39 hardening deriva l'estensione Storage dal MIME validato", async () => {
  const storage = await read(
    "app/lib/server/practice-storage.ts",
  );
  const policy = await read(
    "app/lib/server/practice-document-upload.ts",
  );
  const prepare = await read(
    "app/api/public/applications/[id]/document-upload/prepare/route.ts",
  );
  const complete = await read(
    "app/api/public/applications/[id]/document-upload/complete/route.ts",
  );

  assert.match(
    policy,
    /"application\/pdf": "pdf"/,
  );
  assert.match(
    policy,
    /"image\/jpeg": "jpg"/,
  );
  assert.match(
    policy,
    /"image\/png": "png"/,
  );
  assert.match(
    storage,
    /practiceDocumentExtensionForMime\(\s*input\.mimeType/,
  );
  assert.match(
    storage,
    /practiceDocumentExtensionForMime\(\s*input\.file\.type/,
  );
  assert.doesNotMatch(
    storage,
    /input\.originalName\.split\("\."\)/,
  );
  assert.match(
    prepare,
    /mimeType: input\.mimeType/,
  );
  assert.match(
    complete,
    /mimeType: input\.mimeType/,
  );
});
