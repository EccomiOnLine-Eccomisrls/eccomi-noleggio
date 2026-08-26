export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return Response.json({ error: "Richiesta non autorizzata." }, { status: 403 });
  }
  return Response.json({ ok: true }, {
    headers: {
      "set-cookie": "eccomi_partner_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
    },
  });
}
