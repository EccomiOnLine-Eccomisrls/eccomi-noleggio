"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, RotateCcw, Trash2 } from "lucide-react";

type Promotion = {
  id: string;
  brand: string;
  model: string;
  offerNumber: string;
  owner: string;
  rental: string;
  price: string;
  image: string | null;
  updatedAt?: string;
};

export default function TrashPage() {
  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const response = await fetch("/api/trash", { cache: "no-store", credentials: "same-origin" });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) setItems(payload.promotions || []);
    else window.alert(payload.error || "Impossibile caricare il cestino.");
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const action = async (promotion: Promotion, type: "RESTORE" | "PURGE") => {
    if (type === "RESTORE") {
      if (!window.confirm(`Ripristinare ${promotion.brand} ${promotion.model} come bozza?`)) return;
    } else {
      if (!window.confirm("Eliminare definitivamente questa promozione anche da Shopify?")) return;
      if (window.prompt("Per confermare scrivi ELIMINA") !== "ELIMINA") return;
    }
    setBusy(promotion.id);
    const response = await fetch(`/api/promotions/${promotion.id}/manage`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: type, confirm: type === "PURGE" ? "ELIMINA" : undefined }),
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) return window.alert(payload.error || "Operazione non riuscita.");
    window.alert(type === "RESTORE" ? "Promozione ripristinata come bozza." : "Promozione eliminata definitivamente.");
    await load();
  };

  return (
    <main style={{ minHeight: "100vh", background: "#f4f7fb", padding: 28, color: "#102033", fontFamily: "Arial, sans-serif" }}>
      <section style={{ maxWidth: 1180, margin: "0 auto" }}>
        <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#073f73", textDecoration: "none", fontWeight: 800, marginBottom: 24 }}><ArrowLeft size={18} /> Torna alla dashboard</a>
        <div style={{ background: "#fff", border: "1px solid #dce6f1", borderRadius: 20, padding: 26, boxShadow: "0 14px 35px rgba(7,63,115,.08)" }}>
          <p style={{ margin: 0, color: "#0c5597", fontSize: 12, fontWeight: 900, letterSpacing: ".12em" }}>ECCOMI NOLEGGIO</p>
          <h1 style={{ margin: "8px 0 6px", fontSize: 34 }}>Cestino</h1>
          <p style={{ margin: 0, color: "#5b6778" }}>Le offerte qui presenti non sono visibili nella dashboard né pubblicate su Shopify.</p>
        </div>

        <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
          {loading ? <div style={{ padding: 24 }}>Caricamento…</div> : null}
          {!loading && !items.length ? <div style={{ background: "#fff", borderRadius: 18, padding: 34, textAlign: "center", border: "1px solid #dce6f1" }}><Trash2 size={30} /><h2>Il cestino è vuoto</h2><p style={{ color: "#5b6778" }}>Le promozioni spostate nel cestino appariranno qui.</p></div> : null}
          {items.map((item) => (
            <article key={item.id} style={{ display: "grid", gridTemplateColumns: "90px 1fr auto", gap: 18, alignItems: "center", background: "#fff", border: "1px solid #dce6f1", borderRadius: 18, padding: 18 }}>
              <div style={{ width: 90, height: 72, borderRadius: 12, overflow: "hidden", background: "#edf3f8", display: "grid", placeItems: "center" }}>{item.image ? <img src={item.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Trash2 size={24} />}</div>
              <div><strong style={{ fontSize: 19 }}>{item.brand} {item.model}</strong><div style={{ color: "#5b6778", marginTop: 5 }}>Offerta {item.offerNumber} · {item.rental}</div><div style={{ color: "#073f73", fontWeight: 800, marginTop: 7 }}>{item.price}/mese</div></div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button disabled={busy === item.id} onClick={() => void action(item, "RESTORE")} style={{ border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", borderRadius: 11, padding: "11px 14px", fontWeight: 800, cursor: "pointer", display: "inline-flex", gap: 7, alignItems: "center" }}><RotateCcw size={17} /> Ripristina</button>
                <button disabled={busy === item.id} onClick={() => void action(item, "PURGE")} style={{ border: "1px solid #fecaca", background: "#fff1f2", color: "#b42318", borderRadius: 11, padding: "11px 14px", fontWeight: 800, cursor: "pointer", display: "inline-flex", gap: 7, alignItems: "center" }}><Trash2 size={17} /> Elimina definitivamente</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
