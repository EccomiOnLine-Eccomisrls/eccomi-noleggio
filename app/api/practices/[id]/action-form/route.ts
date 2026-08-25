import { POST as performPracticeAction } from "../action/route";

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
    const operation = text(form.get("operation"), 40).toLowerCase();
    const body: Record<string, unknown> = {};

    if (operation === "status") {
      body.status = text(form.get("status"), 40);
      body.note = text(form.get("note"), 2000);
    } else if (operation === "priority") {
      body.priority = text(form.get("priority"), 20);
    } else if (operation === "assignment") {
      body.assignedTo = text(form.get("assignedTo"), 160);
    } else if (operation === "note") {
      body.note = text(form.get("note"), 2000);
    } else if (operation === "trash") {
      body.trashAction = "TRASH";
      body.deleteReason = text(form.get("deleteReason"), 500);
    } else {
      return redirectBack(request, id, false, "Azione CEO non riconosciuta.");
    }

    const headers = new Headers(request.headers);
    headers.set("content-type", "application/json");

    const forwarded = new Request(
      new URL(`/api/practices/${encodeURIComponent(id)}/action`, request.url),
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      },
    );

    const response = await performPracticeAction(forwarded, {
      params: Promise.resolve({ id }),
    });

    const payload = await response.json().catch(() => ({})) as {
      error?: string;
      label?: string;
      assignedTo?: string | null;
      priority?: string;
      trashed?: boolean;
      noteAdded?: boolean;
    };

    if (!response.ok) {
      return redirectBack(
        request,
        id,
        false,
        payload.error || "Operazione non riuscita.",
      );
    }

    let message = payload.label
      ? `Operazione completata: ${payload.label}.`
      : "Operazione completata.";

    if (payload.noteAdded) message = "Nota operativa salvata.";
    if (payload.trashed) message = "Pratica spostata nel cestino.";
    if (operation === "priority") message = "Priorità aggiornata.";
    if (operation === "assignment") {
      message = payload.assignedTo
        ? `Pratica assegnata a ${payload.assignedTo}.`
        : "Assegnazione rimossa.";
    }

    return redirectBack(request, id, true, message);
  } catch (error) {
    return redirectBack(
      request,
      id,
      false,
      error instanceof Error ? error.message : "Operazione non riuscita.",
    );
  }
}
