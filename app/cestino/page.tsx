"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Car,
  RotateCcw,
  Trash2,
} from "lucide-react";

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

type DeletedPractice = {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  province: string | null;
  status: string;
  priority: string;
  assignedTo: string | null;
  deletedAt: string | null;
  deletedBy: string | null;
  deleteReason: string | null;
  createdAt: string;
  vehicle: string;
  offerNumber: string;
  partnerName: string;
};

const formatDateTime = (
  value?: string | null,
) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(date);
};

const cardStyle = {
  background: "#fff",
  border: "1px solid #dce6f1",
  borderRadius: 18,
  padding: 18,
} as const;

const restoreStyle = {
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#1d4ed8",
  borderRadius: 11,
  padding: "11px 14px",
  fontWeight: 800,
  cursor: "pointer",
  display: "inline-flex",
  gap: 7,
  alignItems: "center",
} as const;

const purgeStyle = {
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#b42318",
  borderRadius: 11,
  padding: "11px 14px",
  fontWeight: 800,
  cursor: "pointer",
  display: "inline-flex",
  gap: 7,
  alignItems: "center",
} as const;

export default function TrashPage() {
  const [promotions, setPromotions] =
    useState<Promotion[]>([]);

  const [practices, setPractices] =
    useState<DeletedPractice[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState<string | null>(null);

  const load = async () => {
    setLoading(true);

    const [promotionResponse, practiceResponse] =
      await Promise.all([
        fetch("/api/trash", {
          cache: "no-store",
          credentials: "same-origin",
        }),
        fetch("/api/trash/practices", {
          cache: "no-store",
          credentials: "same-origin",
        }),
      ]);

    const promotionPayload =
      await promotionResponse
        .json()
        .catch(() => ({}));

    const practicePayload =
      await practiceResponse
        .json()
        .catch(() => ({}));

    if (!promotionResponse.ok) {
      window.alert(
        promotionPayload.error
          || "Impossibile caricare le promozioni.",
      );
    } else {
      setPromotions(
        promotionPayload.promotions || [],
      );
    }

    if (!practiceResponse.ok) {
      window.alert(
        practicePayload.error
          || "Impossibile caricare le pratiche.",
      );
    } else {
      setPractices(
        practicePayload.practices || [],
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const promotionAction = async (
    promotion: Promotion,
    type: "RESTORE" | "PURGE",
  ) => {
    if (type === "RESTORE") {
      if (
        !window.confirm(
          `Ripristinare ${promotion.brand} ${promotion.model} come bozza?`,
        )
      ) {
        return;
      }
    } else {
      if (
        !window.confirm(
          "Eliminare definitivamente questa promozione anche da Shopify?",
        )
      ) {
        return;
      }

      if (
        window.prompt(
          "Per confermare scrivi ELIMINA",
        ) !== "ELIMINA"
      ) {
        return;
      }
    }

    setBusy(`promotion-${promotion.id}`);

    const response = await fetch(
      `/api/promotions/${promotion.id}/manage`,
      {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: type,
          confirm:
            type === "PURGE"
              ? "ELIMINA"
              : undefined,
        }),
      },
    );

    const payload =
      await response.json().catch(() => ({}));

    setBusy(null);

    if (!response.ok) {
      window.alert(
        payload.error
          || "Operazione non riuscita.",
      );
      return;
    }

    window.alert(
      type === "RESTORE"
        ? "Promozione ripristinata come bozza."
        : "Promozione eliminata definitivamente.",
    );

    await load();
  };

  const practiceAction = async (
    practice: DeletedPractice,
    type: "RESTORE" | "PURGE",
  ) => {
    if (type === "RESTORE") {
      if (
        !window.confirm(
          `Ripristinare la pratica ${practice.id}?`,
        )
      ) {
        return;
      }
    } else {
      if (
        !window.confirm(
          "Eliminare definitivamente questa pratica, i documenti e le commissioni collegate?",
        )
      ) {
        return;
      }

      if (
        window.prompt(
          "Per confermare scrivi ELIMINA",
        ) !== "ELIMINA"
      ) {
        return;
      }
    }

    setBusy(`practice-${practice.id}`);

    const response = await fetch(
      "/api/trash/practices",
      {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: practice.id,
          action: type,
          confirm:
            type === "PURGE"
              ? "ELIMINA"
              : undefined,
        }),
      },
    );

    const payload =
      await response.json().catch(() => ({}));

    setBusy(null);

    if (!response.ok) {
      window.alert(
        payload.error
          || "Operazione non riuscita.",
      );
      return;
    }

    window.alert(
      type === "RESTORE"
        ? "Pratica ripristinata."
        : "Pratica eliminata definitivamente.",
    );

    await load();
  };

  const empty =
    !loading
    && !promotions.length
    && !practices.length;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f4f7fb",
        padding: 28,
        color: "#102033",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
        }}
      >
        <a
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "#073f73",
            textDecoration: "none",
            fontWeight: 800,
            marginBottom: 24,
          }}
        >
          <ArrowLeft size={18} />
          Torna alla dashboard
        </a>

        <div
          style={{
            background: "#fff",
            border: "1px solid #dce6f1",
            borderRadius: 20,
            padding: 26,
            boxShadow:
              "0 14px 35px rgba(7,63,115,.08)",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#0c5597",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: ".12em",
            }}
          >
            ECCOMI NOLEGGIO
          </p>

          <h1
            style={{
              margin: "8px 0 6px",
              fontSize: 34,
            }}
          >
            Cestino intelligente
          </h1>

          <p
            style={{
              margin: 0,
              color: "#5b6778",
            }}
          >
            Gestisci separatamente pratiche e
            promozioni eliminate. Il ripristino è
            sempre possibile fino
            all’eliminazione definitiva.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: 24 }}>
            Caricamento…
          </div>
        ) : null}

        {empty ? (
          <div
            style={{
              ...cardStyle,
              marginTop: 20,
              padding: 34,
              textAlign: "center",
            }}
          >
            <Trash2 size={30} />
            <h2>Il cestino è vuoto</h2>
            <p style={{ color: "#5b6778" }}>
              Le pratiche e le promozioni eliminate
              appariranno qui.
            </p>
          </div>
        ) : null}

        {!loading ? (
          <>
            <section style={{ marginTop: 26 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <BriefcaseBusiness size={22} />
                <h2 style={{ margin: 0 }}>
                  Pratiche eliminate
                </h2>
                <strong
                  style={{
                    marginLeft: "auto",
                    background: "#e8f2fb",
                    color: "#073f73",
                    borderRadius: 999,
                    padding: "6px 11px",
                  }}
                >
                  {practices.length}
                </strong>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 14,
                }}
              >
                {!practices.length ? (
                  <div style={cardStyle}>
                    Nessuna pratica nel cestino.
                  </div>
                ) : null}

                {practices.map((item) => (
                  <article
                    key={item.id}
                    style={{
                      ...cardStyle,
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(0,1fr) auto",
                      gap: 18,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong
                        style={{ fontSize: 19 }}
                      >
                        {item.customerName}
                      </strong>

                      <div
                        style={{
                          color: "#073f73",
                          fontWeight: 800,
                          marginTop: 6,
                        }}
                      >
                        {item.vehicle}
                      </div>

                      <div
                        style={{
                          color: "#5b6778",
                          marginTop: 5,
                        }}
                      >
                        Pratica {item.id}
                        {" · "}
                        Offerta {item.offerNumber}
                        {" · "}
                        {item.partnerName}
                      </div>

                      <div
                        style={{
                          color: "#5b6778",
                          marginTop: 5,
                        }}
                      >
                        Eliminata il{" "}
                        {formatDateTime(
                          item.deletedAt,
                        )}
                        {" da "}
                        {item.deletedBy || "—"}
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          padding: "9px 11px",
                          borderRadius: 10,
                          background: "#fff7ed",
                          color: "#9a4b08",
                          fontSize: 13,
                        }}
                      >
                        <strong>Motivo:</strong>{" "}
                        {item.deleteReason || "—"}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        disabled={
                          busy
                          === `practice-${item.id}`
                        }
                        onClick={() =>
                          void practiceAction(
                            item,
                            "RESTORE",
                          )
                        }
                        style={restoreStyle}
                      >
                        <RotateCcw size={17} />
                        Ripristina
                      </button>

                      <button
                        disabled={
                          busy
                          === `practice-${item.id}`
                        }
                        onClick={() =>
                          void practiceAction(
                            item,
                            "PURGE",
                          )
                        }
                        style={purgeStyle}
                      >
                        <Trash2 size={17} />
                        Elimina definitivamente
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section style={{ marginTop: 32 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <Car size={22} />
                <h2 style={{ margin: 0 }}>
                  Promozioni eliminate
                </h2>
                <strong
                  style={{
                    marginLeft: "auto",
                    background: "#e8f2fb",
                    color: "#073f73",
                    borderRadius: 999,
                    padding: "6px 11px",
                  }}
                >
                  {promotions.length}
                </strong>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 14,
                }}
              >
                {!promotions.length ? (
                  <div style={cardStyle}>
                    Nessuna promozione nel cestino.
                  </div>
                ) : null}

                {promotions.map((item) => (
                  <article
                    key={item.id}
                    style={{
                      ...cardStyle,
                      display: "grid",
                      gridTemplateColumns:
                        "90px minmax(0,1fr) auto",
                      gap: 18,
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 90,
                        height: 72,
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "#edf3f8",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <Trash2 size={24} />
                      )}
                    </div>

                    <div>
                      <strong
                        style={{ fontSize: 19 }}
                      >
                        {item.brand} {item.model}
                      </strong>

                      <div
                        style={{
                          color: "#5b6778",
                          marginTop: 5,
                        }}
                      >
                        Offerta {item.offerNumber}
                        {" · "}
                        {item.rental}
                      </div>

                      <div
                        style={{
                          color: "#073f73",
                          fontWeight: 800,
                          marginTop: 7,
                        }}
                      >
                        {item.price}/mese
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        disabled={
                          busy
                          === `promotion-${item.id}`
                        }
                        onClick={() =>
                          void promotionAction(
                            item,
                            "RESTORE",
                          )
                        }
                        style={restoreStyle}
                      >
                        <RotateCcw size={17} />
                        Ripristina
                      </button>

                      <button
                        disabled={
                          busy
                          === `promotion-${item.id}`
                        }
                        onClick={() =>
                          void promotionAction(
                            item,
                            "PURGE",
                          )
                        }
                        style={purgeStyle}
                      >
                        <Trash2 size={17} />
                        Elimina definitivamente
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
