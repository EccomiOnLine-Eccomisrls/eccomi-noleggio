import {
  storageDelete,
  storageGet,
} from "../../../../lib/server/storage";

const CLEANUP_TOKEN =
  "pr39-cleanup-residue-20261006-4f19c7d8b2";
const OBJECT_KEY =
  "ECN-PR39-STORAGE-TEST/IDENTITY/pr39realstorage20261006.pdf";

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (
    url.searchParams.get("token") !== CLEANUP_TOKEN
    || url.searchParams.get("confirm") !== "1"
  ) {
    return Response.json(
      { ok: false, error: "Cleanup PR39 non autorizzato." },
      { status: 403 },
    );
  }

  try {
    await storageDelete(OBJECT_KEY);

    const remaining = await storageGet(OBJECT_KEY);

    if (remaining) {
      return Response.json(
        {
          ok: false,
          objectKey: OBJECT_KEY,
          deleted: false,
          error: "Oggetto ancora presente dopo la DELETE Storage API.",
        },
        { status: 500 },
      );
    }

    return Response.json({
      ok: true,
      objectKey: OBJECT_KEY,
      deleted: true,
      verifiedMissing: true,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        objectKey: OBJECT_KEY,
        deleted: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    );
  }
}
