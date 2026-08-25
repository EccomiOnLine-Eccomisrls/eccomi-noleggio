import { POST as sendPracticeToPartner } from "../send-to-partner/route";

function text(value: FormDataEntryValue | null, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function redirectBack(request: Request, id: string, ok: boolean, message: string) {
  const target = new URL(`/ceo/practices/${encodeURIComponent(id)}`, request.url);
  target.searchParams.set("ceoAction", ok ? "ok" : "error");
  target.searchParams.set("message", message.slice(0, 240));
  return Response.redirect(target, 303);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const form = await request.formData();
    const recipientEmail = text(form.get("recipientEmail"), 160);
    const subject = text(form.get("subject"), 180);
    const message = text(form.get("message"), 3000);
    const saveRecipient = form.get("saveRecipient") === "true";

    const headers = new Headers(request.headers);
    headers.delete("content-length");
    headers.set("content-type", "application/json");

    const forwarded = new Request(
      new URL(`/api/practices/${encodeURIComponent(id)}/send-to-partner`, request.url),
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          recipientEmail,
          subject,
          message,
          saveRecipient,
        }),
      },
    );

    const response = await sendPracticeToPartner(forwarded, {
      params: Promise.resolve({ id }),
    });

    const payload = await response.json().catch(() => ({})) as {
      error?: string;
      recipientEmail?: string;
    };

    if (!response.ok) {
      return redirectBack(
        request,
        id,
        false,
        payload.error || "Invio al partner non riuscito.",
      );
    }

    return redirectBack(
      request,
      id,
      true,
      `Pratica inviata al partner: ${payload.recipientEmail || recipientEmail}.`,
    );
  } catch (error) {
    return redirectBack(
      request,
      id,
      false,
      error instanceof Error ? error.message : "Invio al partner non riuscito.",
    );
  }
}
