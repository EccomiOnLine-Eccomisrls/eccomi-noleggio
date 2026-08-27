"use client";

import { KeyboardEvent, useState } from "react";

type ExtraGaraOffer = {
  id: string;
  offerNumber: string;
  brand: string;
  model: string;
  status: string;
  baseCents: number | null;
  extraCents: number;
  totalCents: number | null;
};

type Props = {
  offers: ExtraGaraOffer[];
  canIncrease: boolean;
  preview: boolean;
};

const money = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

function euro(cents: number) {
  return money.format(cents / 100);
}

function euroPlusVat(cents: number) {
  return `${euro(cents)} + IVA`;
}

export default function ExtraGaraOffers({ offers, canIncrease, preview }: Props) {
  const [selected, setSelected] = useState<ExtraGaraOffer | null>(null);

  const openFromKeyboard = (event: KeyboardEvent<HTMLTableRowElement>, offer: ExtraGaraOffer) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelected(offer);
    }
  };

  return (
    <>
      <div className="partner-table-wrap">
        <table className="partner-table">
          <thead>
            <tr>
              <th>Offerta</th>
              <th>Base ECCOMI</th>
              <th>Extra Gara</th>
              <th>Totale</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => (
              <tr
                key={offer.id}
                role="button"
                tabIndex={0}
                aria-label={`Apri Extra Gara offerta ${offer.offerNumber}`}
                onClick={() => setSelected(offer)}
                onKeyDown={(event) => openFromKeyboard(event, offer)}
                style={{ cursor: "pointer" }}
              >
                <td>
                  <strong>{offer.offerNumber}</strong><br />
                  <small>{offer.brand} {offer.model} · {offer.status.replaceAll("_", " ")}</small>
                </td>
                <td><strong>{offer.baseCents === null ? "DA DEFINIRE" : euroPlusVat(offer.baseCents)}</strong></td>
                <td>
                  {offer.baseCents === null ? "—" : offer.extraCents > 0 ? <strong>+ {euro(offer.extraCents)}</strong> : euro(0)}
                  {offer.baseCents !== null ? <><br /><small>IVA esclusa</small></> : null}
                </td>
                <td><strong>{offer.totalCents === null ? "—" : euroPlusVat(offer.totalCents)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div
          role="presentation"
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "grid",
            placeItems: "center",
            padding: 20,
            background: "rgba(8,24,40,.48)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="extra-gara-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(620px,96vw)",
              borderRadius: 22,
              background: "#fff",
              padding: 26,
              boxShadow: "0 28px 80px rgba(8,24,40,.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
              <div>
                <small style={{ color: "#0c5597", fontWeight: 900, letterSpacing: ".08em" }}>EXTRA GARA · OFFERTA {selected.offerNumber}</small>
                <h2 id="extra-gara-title" style={{ margin: "8px 0 4px", fontSize: 30, color: "#102033" }}>{selected.brand} {selected.model}</h2>
              </div>
              <button
                type="button"
                aria-label="Chiudi"
                onClick={() => setSelected(null)}
                style={{ width: 40, height: 40, borderRadius: 12, border: "1px solid #dce6f1", background: "#fff", fontSize: 22, cursor: "pointer" }}
              >×</button>
            </div>

            <div style={{ margin: "22px 0", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
              <div style={{ padding: 14, borderRadius: 14, background: "#f8fafc" }}><small>BASE ECCOMI</small><br /><strong>{selected.baseCents === null ? "DA DEFINIRE" : euroPlusVat(selected.baseCents)}</strong></div>
              <div style={{ padding: 14, borderRadius: 14, background: "#f8fafc" }}><small>EXTRA GARA</small><br /><strong>{selected.baseCents === null ? "—" : selected.extraCents > 0 ? `+ ${euro(selected.extraCents)}` : euro(0)}</strong></div>
              <div style={{ padding: 14, borderRadius: 14, background: "#f8fafc" }}><small>TOTALE</small><br /><strong>{selected.totalCents === null ? "—" : euroPlusVat(selected.totalCents)}</strong></div>
            </div>

            {selected.baseCents === null || selected.totalCents === null ? (
              <p style={{ margin: 0, color: "#66768a" }}>ECCOMI deve prima definire la provvigione base dell’offerta.</p>
            ) : (
              <form method="post" action={`/api/partner/offers/${selected.id}/commission-increase`} style={{ display: "grid", gap: 12 }}>
                <label style={{ display: "grid", gap: 7, fontWeight: 800, color: "#102033" }}>
                  <span>Nuovo totale imponibile</span>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input
                      name="total"
                      type="number"
                      min={(selected.totalCents + 1) / 100}
                      step="0.01"
                      placeholder={`Più di ${(selected.totalCents / 100).toFixed(2).replace(".", ",")}`}
                      disabled={preview || !canIncrease || ["ARCHIVED", "TRASHED"].includes(selected.status)}
                      required
                      style={{ flex: 1, minWidth: 0, minHeight: 48, border: "1px solid #cbd8e6", borderRadius: 12, padding: "10px 12px", fontSize: 16 }}
                    />
                    <strong>€ + IVA</strong>
                  </div>
                </label>

                {!canIncrease ? <small style={{ color: "#66768a" }}>Solo il Partner Admin può modificare l’Extra Gara.</small> : null}
                {["ARCHIVED", "TRASHED"].includes(selected.status) ? <small style={{ color: "#66768a" }}>L’offerta è archiviata e non può essere modificata.</small> : null}
                {preview ? <small style={{ color: "#66768a" }}>Preview sicura: salvataggio disabilitato.</small> : null}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                  <button type="button" onClick={() => setSelected(null)} style={{ minHeight: 44, padding: "10px 16px", borderRadius: 11, border: "1px solid #cbd8e6", background: "#fff", fontWeight: 800, cursor: "pointer" }}>Annulla</button>
                  <button
                    type="submit"
                    disabled={preview || !canIncrease || ["ARCHIVED", "TRASHED"].includes(selected.status)}
                    style={{ minHeight: 44, padding: "10px 18px", borderRadius: 11, border: 0, background: "#1478bd", color: "#fff", fontWeight: 900, cursor: "pointer" }}
                  >Conferma Extra Gara</button>
                </div>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
