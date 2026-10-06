import {
  getPracticeDocumentObjectInfo,
} from "../../../lib/server/practice-storage";

const TEST_TOKEN =
  "pr40-real-notfound-20261006-2d65f1e0";
const OBJECT_KEY =
  "PR40-NOTFOUND-TEST/IDENTITY/this-object-must-not-exist.pdf";

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (url.searchParams.get("token") !== TEST_TOKEN) {
    return Response.json(
      { ok: false, error: "PR40 test non autorizzato." },
      { status: 403 },
    );
  }

  try {
    const result =
      await getPracticeDocumentObjectInfo(
        OBJECT_KEY,
      );

    return Response.json({
      ok: result === null,
      objectKey: OBJECT_KEY,
      classifiedAsMissing: result === null,
    }, {
      status: result === null ? 200 : 500,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        objectKey: OBJECT_KEY,
        classifiedAsMissing: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    );
  }
}
