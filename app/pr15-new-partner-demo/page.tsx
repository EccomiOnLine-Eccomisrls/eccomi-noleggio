type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] || "" : value || ""; }

export default async function Pr15NewPartnerDemo({ searchParams }: Props) {
  const query = searchParams ? await searchParams : {};
  const created = first(query.created) === "1";
  const name = first(query.name) || "ECCOMI TEST PARTNER";
  return <main style={{ minHeight: "100vh", background: "#f3f7fb", padding: "28px", fontFamily: "Arial,sans-serif", color: "#10253e" }}>
    <div style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gap: 18 }}>
      <section style={{ padding: 28, borderRadius: 20, background: "linear-gradient(135deg,#075392,#1478bd)", color: "white" }}><small style={{ fontWeight: 800, letterSpacing: 1.1 }}>PREVIEW SICURA · PR15 · NUOVO PARTNER</small><h1 style={{ fontSize: 38, margin: "14px 0 8px" }}>Crea un Partner in autonomia</h1><p style={{ margin: 0, fontSize: 17 }}>Dashboard CEO → Partner Noleggio → + Nuovo Partner → salvataggio → scheda Partner → Invita Partner Admin.</p></section>

      {created ? <section style={{ padding: 18, border: "1px solid #b9e5c6", background: "#eaf9ef", borderRadius: 14 }}><strong>✓ Simulazione completata: {name}</strong><p style={{ marginBottom: 0 }}>In preview non è stato scritto nulla nel database. In produzione si aprirà la nuova scheda Partner.</p></section> : null}

      <section style={{ background: "white", border: "1px solid #d8e3ee", borderRadius: 18, padding: 24 }}><div><small style={{ fontWeight: 800, color: "#075392" }}>CEO · NUOVO PARTNER</small><h2 style={{ fontSize: 30, margin: "8px 0" }}>Dati della società</h2><p style={{ color: "#66768a" }}>La società nasce senza utenti, offerte o pratiche. Dopo il salvataggio si passa all'invito del Partner Admin.</p></div>
        <form method="get" action="/pr15-new-partner-demo" style={{ display: "grid", gap: 14 }}>
          <input type="hidden" name="created" value="1" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 12 }}>
            <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>Nome Partner<input name="name" required defaultValue="ECCOMI TEST PARTNER" style={{ minHeight: 46, padding: 10, borderRadius: 9, border: "1px solid #cbd8e6", fontSize: 16 }} /></label>
            <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>Ragione sociale<input required defaultValue="ECCOMI Test Partner S.r.l." style={{ minHeight: 46, padding: 10, borderRadius: 9, border: "1px solid #cbd8e6", fontSize: 16 }} /></label>
            <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>Referente<input defaultValue="Robin Test" style={{ minHeight: 46, padding: 10, borderRadius: 9, border: "1px solid #cbd8e6", fontSize: 16 }} /></label>
            <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>Email referente<input type="email" defaultValue="robin.test@eccomi.local" style={{ minHeight: 46, padding: 10, borderRadius: 9, border: "1px solid #cbd8e6", fontSize: 16 }} /></label>
            <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>Stato iniziale<select defaultValue="ACTIVE" style={{ minHeight: 46, padding: 10, borderRadius: 9, border: "1px solid #cbd8e6", fontSize: 16 }}><option value="ACTIVE">Attivo</option><option value="PAUSED">In pausa</option></select></label>
          </div>
          <div style={{ padding: 16, borderRadius: 12, background: "#edf8f1", border: "1px solid #c5e8d0" }}><strong>DOPO IL SALVATAGGIO</strong><p style={{ marginBottom: 0 }}>Si apre la scheda del Partner → Centro Accessi → Invita Partner Admin con Supabase Auth + Resend.</p></div>
          <button type="submit" style={{ minHeight: 48, border: 0, borderRadius: 10, background: "#1478bd", color: "white", fontSize: 16, fontWeight: 800 }}>＋ Simula Crea Partner</button>
        </form>
      </section>
      <section style={{ padding: 16, borderRadius: 12, background: "#e8f9ee", color: "#185b32", fontWeight: 800 }}>SERVER-SAFE · ZERO JS · La preview non crea Partner, utenti o dati in produzione.</section>
    </div>
  </main>;
}
