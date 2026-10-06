import { eq } from "drizzle-orm";
import { getDb } from "../../../../../../../db";
import {
  leads,
  practiceDocuments,
} from "../../../../../../../db/schema";
import { ensurePracticeSchema } from "../../../../../../lib/server/practice-schema";
import {
  parsePracticeDocumentUploadBody,
} from "../../../../../../lib/server/practice-document-upload";
import {
  getPracticeDocumentObjectInfo,
  practiceDocumentObjectKey,
} from "../../../../../../lib/server/practice-storage";
import {
  corsHeaders,
  jsonWithCors,
  publicCorsOrigin,
} from "../../../../../../lib/server/public-origin";
import {
  isRenderPullRequestPreview,
} from "../../../../../../lib/server/preview-mode";

export async function OPTIONS(request: Request) {
  const origin = await publicCorsOrigin(request);

  if (!origin) {
    return jsonWithCors(
      { error: "Origine non autorizzata." },
      403,
      null,
    );
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const origin = await publicCorsOrigin(request);
  const { id } = await context.params;

  if (!origin) {
    return jsonWithCors(
      { error: "Origine non autorizzata." },
      403,
      null,
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonWithCors(
      { error: "Dati upload non validi." },
      400,
      origin,
    );
  }

  let input: ReturnType<
    typeof parsePracticeDocumentUploadBody
  >;

  try {
    input = parsePracticeDocumentUploadBody(body);
  } catch (error) {
    return jsonWithCors(
      {
        error:
          error instanceof Error
            ? error.message
            : "Dati upload non validi.",
      },
      422,
      origin,
    );
  }

  if (isRenderPullRequestPreview(request)) {
    if (id !== "ECN-PREVIEW-000001") {
      return jsonWithCors(
        { error: "Pratica preview non riconosciuta." },
        404,
        origin,
      );
    }

    return jsonWithCors(
      {
        ok: true,
        preview: true,
        documentId: input.documentId,
        duplicate: false,
      },
      201,
      origin,
    );
  }

  try {
    await ensurePracticeSchema();

    const db = getDb();
    const [practice] = await db
      .select({
        id: leads.id,
        status: leads.status,
      })
      .from(leads)
      .where(eq(leads.id, id))
      .limit(1);

    if (!practice) {
      return jsonWithCors(
        { error: "Pratica non trovata." },
        404,
        origin,
      );
    }

    if (
      !["UPLOAD_IN_PROGRESS", "UPLOAD_ERROR"].includes(
        practice.status,
      )
    ) {
      return jsonWithCors(
        {
          error:
            "La pratica non accetta nuovi documenti.",
        },
        409,
        origin,
      );
    }

    const [existing] = await db
      .select({
        id: practiceDocuments.id,
        leadId: practiceDocuments.leadId,
        originalName: practiceDocuments.originalName,
      })
      .from(practiceDocuments)
      .where(eq(practiceDocuments.id, input.documentId))
      .limit(1);

    if (existing) {
      if (existing.leadId !== id) {
        return jsonWithCors(
          {
            error:
              "Identificativo documento già utilizzato.",
          },
          409,
          origin,
        );
      }

      return jsonWithCors(
        {
          ok: true,
          documentId: existing.id,
          originalName: existing.originalName,
          duplicate: true,
        },
        200,
        origin,
      );
    }

    const objectKey = practiceDocumentObjectKey({
      practiceCode: id,
      documentType: input.documentType,
      uploadId: input.uploadId,
      originalName: input.originalName,
      mimeType: input.mimeType,
    });

    const stored =
      await getPracticeDocumentObjectInfo(objectKey);

    if (!stored) {
      return jsonWithCors(
        {
          error:
            "Il file non risulta ancora caricato. Riprova.",
        },
        409,
        origin,
      );
    }

    if (
      stored.sizeBytes !== null
      && stored.sizeBytes !== input.sizeBytes
    ) {
      return jsonWithCors(
        {
          error:
            "Dimensione del documento non coerente con l'upload.",
        },
        409,
        origin,
      );
    }

    if (
      stored.mimeType
      && stored.mimeType !== input.mimeType
    ) {
      return jsonWithCors(
        {
          error:
            "Formato del documento non coerente con l'upload.",
        },
        409,
        origin,
      );
    }

    const now = new Date().toISOString();

    const inserted = await db
      .insert(practiceDocuments)
      .values({
        id: input.documentId,
        leadId: id,
        documentType: input.documentType,
        originalName: input.originalName,
        mimeType: stored.mimeType || input.mimeType,
        sizeBytes: stored.sizeBytes ?? input.sizeBytes,
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

    if (!inserted.length) {
      const [raceExisting] = await db
        .select({
          id: practiceDocuments.id,
          leadId: practiceDocuments.leadId,
        })
        .from(practiceDocuments)
        .where(eq(practiceDocuments.id, input.documentId))
        .limit(1);

      if (!raceExisting || raceExisting.leadId !== id) {
        return jsonWithCors(
          {
            error:
              "Il documento è stato registrato da un'altra richiesta.",
          },
          409,
          origin,
        );
      }
    }

    await db
      .update(leads)
      .set({
        status: "UPLOAD_IN_PROGRESS",
        documentStatus: "UPLOADING",
        updatedAt: now,
      })
      .where(eq(leads.id, id));

    console.info("[PRACTICE_DIRECT_UPLOAD_COMPLETE] saved", {
      practiceCode: id,
      documentId: input.documentId,
      documentType: input.documentType,
      sizeBytes: stored.sizeBytes ?? input.sizeBytes,
    });

    return jsonWithCors(
      {
        ok: true,
        documentId: input.documentId,
        originalName: input.originalName,
        duplicate: inserted.length === 0,
      },
      inserted.length ? 201 : 200,
      origin,
    );
  } catch (error) {
    console.error("[PRACTICE_DIRECT_UPLOAD_COMPLETE] failed", {
      practiceCode: id,
      uploadId: input.uploadId,
      documentType: input.documentType,
      error,
    });

    return jsonWithCors(
      {
        error:
          error instanceof Error
            ? error.message
            : "Registrazione documento non riuscita.",
      },
      500,
      origin,
    );
  }
}
