export function isStorageObjectNotFoundResponse(
  status: number,
  detail: string,
) {
  if (status === 404) {
    return true;
  }

  if (status !== 400 || !detail.trim()) {
    return false;
  }

  try {
    const payload = JSON.parse(detail) as {
      statusCode?: number | string;
      code?: string;
      error?: string;
      message?: string;
    };

    return (
      String(payload.statusCode ?? "") === "404"
      || payload.code === "NoSuchKey"
    );
  } catch {
    return false;
  }
}
