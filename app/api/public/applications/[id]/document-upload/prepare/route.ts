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
  createPracticeDocumentSignedUpload,
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
        objectKey:
          `preview/${input.documentType}/${input.uploadId}`,
        signedUrl: null,
        alreadyComplete: false,
      },
      200,
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
        storageKey: practiceDocuments.storageKey,
        originalName: practiceDocuments.originalName,
      })
      .from(practiceDocuments)
      .where(eq(practiceDocuments.id, input.documentId))
      .limit(1);

    if (existing) {
      return jsonWithCors(
        {
          ok: true,
          documentId: existing.id,
          objectKey: existing.storageKey,
          originalName: existing.originalName,
          alreadyComplete: true,
        },
        200,
        origin,
      );
    }

    const upload =
      await createPracticeDocumentSignedUpload({
        practiceCode: id,
        documentType: input.documentType,
        uploadId: input.uploadId,
        originalName: input.originalName,
      });

    return jsonWithCors(
      {
        ok: true,
        documentId: input.documentId,
        objectKey: upload.objectKey,
        signedUrl: upload.signedUrl,
        alreadyComplete: false,
      },
      201,
      origin,
    );
  } catch (error) {
    console.error("[PRACTICE_DIRECT_UPLOAD_PREPARE] failed", {
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
            : "Preparazione upload non riuscita.",
      },
      500,
      origin,
    );
  }
}
