"use client";

import { useState } from "react";

type Row = {
  id: number;
  state: "PRONTA" | "CREA" | "ATTENDI" | "RIUSA";
};

export default function ConcurrencyDemo() {
  const [rows, setRows] = useState<Row[]>(
    Array.from({ length: 5 }, (_, index) => ({ id: index + 1, state: "PRONTA" as const })),
  );
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  async function run() {
    if (running) return;
    setRunning(true);
    setDone(false);
    setRows(Array.from({ length: 5 }, (_, index) => ({ id: index + 1, state: "PRONTA" as const })));

    await new Promise((resolve) => setTimeout(resolve, 250));
    setRows((current) => current.map((row) => ({ ...row, state: row.id === 1 ? "CREA" : "ATTENDI" })));

    await new Promise((resolve) => setTimeout(resolve, 2200));
    setRows((current) => current.map((row) => ({ ...row, state: row.id === 1 ? "CREA" : "RIUSA" })));

    await new Promise((resolve) => setTimeout(resolve, 700));
    setRunning(false);
    setDone(true);
  }

  return (
    <section className="ceo-server-panel">
      <div className="ceo-server-result" style={{ marginBottom: 18 }}>
        <strong>COLLAUDO SICURO · NESSUNA SCRITTURA REALE</strong>
        <div>Simuliamo 5 richieste simultanee sulla stessa promozione.</div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((row) => (
          <div key={row.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", border: "1px solid #d8e4ef", borderRadius: 12, background: "#fff" }}>
            <strong>Richiesta {row.id}</strong>
            <span style={{ fontWeight: 800 }}>
              {row.state === "PRONTA" ? "PRONTA" : row.state === "CREA" ? "✅ CLAIM OTTENUTO · CREA 1 BOZZA" : row.state === "ATTENDI" ? "⏳ CLAIM NEGATO · ATTENDE" : "♻️ RIUSA LA BOZZA CREATA"}
            </span>
          </div>
        ))}
      </div>

      {done ? (
        <div className="ceo-server-result" style={{ marginTop: 18 }}>
          <strong>TEST COMPLETATO: 1 CREAZIONE · 4 RIUSI</strong>
          <div>La preview non ha contattato Supabase né Shopify.</div>
        </div>
      ) : null}

      <div className="ceo-server-actions" style={{ marginTop: 18 }}>
        <button className="ceo-server-primary" type="button" onClick={run} disabled={running}>
          {running ? "SIMULAZIONE IN CORSO…" : "SIMULA 5 RICHIESTE INSIEME"}
        </button>
      </div>
    </section>
  );
}
