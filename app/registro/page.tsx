"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Search } from "lucide-react";

type EventRow = {
  id: string;
  eventType: string;
  title: string;
  actorEmail: string;
  createdAt: string;
};

export default function RegisterPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/hub-events", { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) setEvents(payload.events || []);
      else window.alert(payload.error || "Impossibile caricare il registro.");
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("it");
    if (!normalized) return events;
    return events.filter((event) => `${event.title} ${event.eventType} ${event.actorEmail}`.toLocaleLowerCase("it").includes(normalized));
  }, [events, query]);

  const formatter = new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  });

  return (
    <main style={{ minHeight: "100vh", background: "#f4f7fb", padding: 28, color: "#102033", fontFamily: "Arial, sans-serif" }}>
      <section style={{ maxWidth: 1100, margin: "0 auto" }}>
        <a href="/ceo" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#073f73", textDecoration: "none", fontWeight: 800, marginBottom: 24 }}><ArrowLeft size={18} /> Torna alla dashboard</a>
        <header style={{ background: "#fff", border: "1px solid #dce6f1", borderRadius: 20, padding: 26, boxShadow: "0 14px 35px rgba(7,63,115,.08)" }}>
          <p style={{ margin: 0, color: "#0c5597", fontSize: 12, fontWeight: 900, letterSpacing: ".12em" }}>ECCOMI HUB</p>
          <h1 style={{ margin: "8px 0 6px", fontSize: 34 }}>Registro automatico</h1>
          <p style={{ margin: 0, color: "#5b6778" }}>Tutte le manovre effettuate sulle promozioni, in ordine cronologico.</p>
          <label style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 10, border: "1px solid #dce6f1", borderRadius: 12, padding: "11px 14px", maxWidth: 520 }}>
            <Search size={18} color="#5b6778" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca auto, azione o utente…" style={{ border: 0, outline: "none", flex: 1, fontSize: 15 }} />
          </label>
        </header>

        <section style={{ marginTop: 20, background: "#fff", border: "1px solid #dce6f1", borderRadius: 20, overflow: "hidden" }}>
          {loading ? <div style={{ padding: 24 }}>Caricamento…</div> : null}
          {!loading && !filtered.length ? <div style={{ padding: 34, textAlign: "center", color: "#5b6778" }}>Nessuna manovra trovata.</div> : null}
          {filtered.map((event, index) => (
            <article key={event.id} style={{ display: "grid", gridTemplateColumns: "38px 1fr auto", gap: 14, alignItems: "center", padding: "17px 20px", borderTop: index ? "1px solid #edf2f7" : 0 }}>
              <span style={{ width: 34, height: 34, borderRadius: 999, background: "#ecfdf3", color: "#15803d", display: "grid", placeItems: "center" }}><CheckCircle2 size={18} /></span>
              <div><strong>{event.title}</strong><div style={{ color: "#7a8797", fontSize: 13, marginTop: 4 }}>{event.eventType} · {event.actorEmail}</div></div>
              <time style={{ color: "#5b6778", fontSize: 13, textAlign: "right" }}>{formatter.format(new Date(event.createdAt))}</time>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
