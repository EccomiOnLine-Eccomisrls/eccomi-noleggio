import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import {
  leads,
  practiceDocuments,
  promotions,
} from "../../../../db/schema";
import { ensurePracticeSchema } from "../../../lib/server/practice-schema";
import {
  createPracticeDocumentSignedUpload,
  getPracticeDocumentObjectInfo,
} from "../../../lib/server/practice-storage";

const TEST_TOKEN =
  "pr39-real-storage-20261006-approved-8f2c7a41d9e6";
const TEST_PRACTICE_ID = "ECN-PR39-STORAGE-TEST";
const TEST_DOCUMENT_ID =
  "ECD-pr39realstorage20261006";
const TEST_UPLOAD_ID =
  "pr39realstorage20261006";
const TEST_FILE_NAME = "pr39-storage-7mb.pdf";
const TEST_MIME = "application/pdf";
const TEST_SIZE = 7 * 1024 * 1024;

function storageConfig() {
  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL
    || process.env.SUPABASE_URL
    || ""
  ).replace(/\/$/, "");
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_KEY
    || "";
  const bucket =
    process.env.SUPABASE_NOLEGGIO_DOCUMENT_BUCKET
    || "noleggio-documenti";

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Configurazione Supabase incompleta per il test PR39.",
    );
  }

  return { url, serviceRoleKey, bucket };
}

async function removeStorageObject(objectKey: string) {
  if (!objectKey) return { ok: true, skipped: true };

  const { url, serviceRoleKey, bucket } =
    storageConfig();

  const response = await fetch(
    `${url}/storage/v1/object/${encodeURIComponent(bucket)}`,
    {
      method: "DELETE",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        prefixes: [objectKey],
      }),
    },
  );

  const detail = await response.text().catch(() => "");

  return {
    ok: response.ok,
    status: response.status,
    detail: detail.slice(0, 240),
  };
}

async function cleanup(objectKey: string) {
  const db = getDb();
  const cleanupReport: Record<string, unknown> = {};

  try {
    await db
      .delete(practiceDocuments)
      .where(
        eq(practiceDocuments.id, TEST_DOCUMENT_ID),
      );
    cleanupReport.documentRowDeleted = true;
  } catch (error) {
    cleanupReport.documentRowDeleted = false;
    cleanupReport.documentDeleteError =
      error instanceof Error
        ? error.message
        : String(error);
  }

  try {
    await db
      .delete(leads)
      .where(eq(leads.id, TEST_PRACTICE_ID));
    cleanupReport.practiceDeleted = true;
  } catch (error) {
    cleanupReport.practiceDeleted = false;
    cleanupReport.practiceDeleteError =
      error instanceof Error
        ? error.message
        : String(error);
  }

  try {
    cleanupReport.storageDelete =
      await removeStorageObject(objectKey);
  } catch (error) {
    cleanupReport.storageDelete = {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }

  return cleanupReport;
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (url.searchParams.get("token") !== TEST_TOKEN) {
    return Response.json(
      { error: "Test PR39 non autorizzato." },
      { status: 403 },
    );
  }

  await ensurePracticeSchema();
  const db = getDb();

  let objectKey = "";
  const report: Record<string, unknown> = {
    test: "PR39_REAL_STORAGE",
    fileSizeBytes: TEST_SIZE,
    fileSizeMb: TEST_SIZE / 1024 / 1024,
  };

  try {
    // Rimuove eventuali residui di un tentativo precedente.
    const staleDocument = await db
      .select({
        storageKey: practiceDocuments.storageKey,
      })
      .from(practiceDocuments)
      .where(
        eq(practiceDocuments.id, TEST_DOCUMENT_ID),
      )
      .limit(1);

    if (staleDocument[0]?.storageKey) {
      await removeStorageObject(
        staleDocument[0].storageKey,
      );
    }

    await db
      .delete(practiceDocuments)
      .where(
        eq(practiceDocuments.id, TEST_DOCUMENT_ID),
      );
    await db
      .delete(leads)
      .where(eq(leads.id, TEST_PRACTICE_ID));

    const [promotion] = await db
      .select({
        id: promotions.id,
        partnerId: promotions.partnerId,
        status: promotions.status,
      })
      .from(promotions)
      .where(eq(promotions.status, "ONLINE"))
      .limit(1);

    if (!promotion) {
      throw new Error(
        "Nessuna promozione ONLINE disponibile per il test.",
      );
    }

    const now = new Date().toISOString();

    await db.insert(leads).values({
      id: TEST_PRACTICE_ID,
      promotionId: promotion.id,
      partnerId: promotion.partnerId,
      firstName: "PR39",
      lastName: "Storage Test",
      phone: "0000000000",
      email: "pr39-storage-test@eccomi.local",
      province: "RM",
      customerType: "PRIVATE",
      status: "UPLOAD_IN_PROGRESS",
      documentStatus: "UPLOADING",
      emailVerificationStatus: "NOT_REQUIRED",
      privacyVersion: "PR39_TEST",
      privacyAcceptedAt: now,
      marketingConsent: false,
      submissionKey:
        "pr39_real_storage_test_20261006",
      source: "PR39_REAL_STORAGE_TEST",
      assignedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    report.practiceCreated = true;
    report.promotionId = promotion.id;

    const signed =
      await createPracticeDocumentSignedUpload({
        practiceCode: TEST_PRACTICE_ID,
        documentType: "IDENTITY",
        uploadId: TEST_UPLOAD_ID,
        originalName: TEST_FILE_NAME,
      });

    objectKey = signed.objectKey;
    report.signedUploadCreated = true;
    report.objectKey = objectKey;

    const bytes = new Uint8Array(TEST_SIZE);
    const header = new TextEncoder().encode(
      "%PDF-1.4\n% PR39 STORAGE TEST\n",
    );
    bytes.set(header, 0);

    const blob = new Blob([bytes], {
      type: TEST_MIME,
    });

    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append("", blob, TEST_FILE_NAME);

    const uploadStartedAt = Date.now();
    const uploadResponse = await fetch(
      signed.signedUrl,
      {
        method: "PUT",
        headers: {
          "x-upsert": "false",
        },
        body: form,
      },
    );
    const uploadDetail =
      await uploadResponse.text().catch(() => "");

    report.storageUploadStatus =
      uploadResponse.status;
    report.storageUploadMs =
      Date.now() - uploadStartedAt;

    if (!uploadResponse.ok) {
      throw new Error(
        `Upload firmato fallito (${uploadResponse.status}): ${uploadDetail.slice(0, 240)}`,
      );
    }

    const stored =
      await getPracticeDocumentObjectInfo(
        objectKey,
      );

    if (!stored) {
      throw new Error(
        "Oggetto Storage non trovato dopo l'upload.",
      );
    }

    report.storageObjectVerified = true;
    report.storageSizeBytes = stored.sizeBytes;
    report.storageMimeType = stored.mimeType;

    if (
      stored.sizeBytes !== null
      && stored.sizeBytes !== TEST_SIZE
    ) {
      throw new Error(
        `Dimensione Storage inattesa: ${stored.sizeBytes}`,
      );
    }

    const firstInsert = await db
      .insert(practiceDocuments)
      .values({
        id: TEST_DOCUMENT_ID,
        leadId: TEST_PRACTICE_ID,
        documentType: "IDENTITY",
        originalName: TEST_FILE_NAME,
        mimeType:
          stored.mimeType || TEST_MIME,
        sizeBytes:
          stored.sizeBytes ?? TEST_SIZE,
        storageBucket: stored.bucket,
        storageKey: stored.objectKey,
        status: "UPLOADED",
        uploadedBy: "CUSTOMER",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning({
        id: practiceDocuments.id,
      });

    report.metadataFirstInsert =
      firstInsert.length === 1;

    const retryInsert = await db
      .insert(practiceDocuments)
      .values({
        id: TEST_DOCUMENT_ID,
        leadId: TEST_PRACTICE_ID,
        documentType: "IDENTITY",
        originalName: TEST_FILE_NAME,
        mimeType:
          stored.mimeType || TEST_MIME,
        sizeBytes:
          stored.sizeBytes ?? TEST_SIZE,
        storageBucket: stored.bucket,
        storageKey: stored.objectKey,
        status: "UPLOADED",
        uploadedBy: "CUSTOMER",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning({
        id: practiceDocuments.id,
      });

    report.retryWasIdempotent =
      retryInsert.length === 0;

    const [saved] = await db
      .select({
        id: practiceDocuments.id,
        leadId: practiceDocuments.leadId,
        sizeBytes: practiceDocuments.sizeBytes,
        storageKey: practiceDocuments.storageKey,
        status: practiceDocuments.status,
      })
      .from(practiceDocuments)
      .where(
        and(
          eq(
            practiceDocuments.id,
            TEST_DOCUMENT_ID,
          ),
          eq(
            practiceDocuments.leadId,
            TEST_PRACTICE_ID,
          ),
        ),
      )
      .limit(1);

    report.metadataVerified =
      Boolean(
        saved
        && saved.sizeBytes === TEST_SIZE
        && saved.storageKey === objectKey
        && saved.status === "UPLOADED",
      );

    if (!report.metadataVerified) {
      throw new Error(
        "Metadati documento non coerenti.",
      );
    }

    report.bypass413Verified =
      TEST_SIZE > 6 * 1024 * 1024
      && uploadResponse.ok;

    report.result = "PASS";
  } catch (error) {
    report.result = "FAIL";
    report.error =
      error instanceof Error
        ? error.message
        : String(error);
  } finally {
    const cleanupReport =
      await cleanup(objectKey);

    report.cleanup = cleanupReport;

    try {
      const [remainingPractice] = await db
        .select({ id: leads.id })
        .from(leads)
        .where(eq(leads.id, TEST_PRACTICE_ID))
        .limit(1);

      const [remainingDocument] = await db
        .select({ id: practiceDocuments.id })
        .from(practiceDocuments)
        .where(
          eq(
            practiceDocuments.id,
            TEST_DOCUMENT_ID,
          ),
        )
        .limit(1);

      const remainingObject =
        objectKey
          ? await getPracticeDocumentObjectInfo(
              objectKey,
            ).catch(() => null)
          : null;

      report.cleanupVerified =
        !remainingPractice
        && !remainingDocument
        && !remainingObject;
    } catch (error) {
      report.cleanupVerified = false;
      report.cleanupVerificationError =
        error instanceof Error
          ? error.message
          : String(error);
    }
  }

  return Response.json(
    report,
    {
      status:
        report.result === "PASS"
        && report.cleanupVerified === true
          ? 200
          : 500,
    },
  );
}
