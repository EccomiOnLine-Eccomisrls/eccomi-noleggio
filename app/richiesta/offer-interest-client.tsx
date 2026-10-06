"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CarFront,
  Check,
  Loader2,
  ShieldCheck,
  UserRound,
  BriefcaseBusiness,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    oaiq?: (...args: unknown[]) => void;
  }
}

type CustomerProfile =
  | ""
  | "PRIVATE"
  | "PROFESSIONAL"
  | "COMPANY";

type OfferInterest = {
  id: string;
  offerNumber: string;
  brand: string;
  model: string;
  version: string;
  monthlyGrossCents: number;
  depositGrossCents: number;
  durationMonths: number;
  totalKm: number;
  validUntil: string;
  status: string;
  available: boolean;
};

function quickLeadStorageKey(requestCode: string) {
  return `eccomi_noleggio_quick_lead_${requestCode}`;
}

function quickLeadConversionKey(requestCode: string) {
  return `eccomi_noleggio_quick_lead_conversion_${requestCode}`;
}

function createSubmissionKey() {
  const browserCrypto = globalThis.crypto;

  if (typeof browserCrypto?.randomUUID === "function") {
    return `ecn_offer_${browserCrypto.randomUUID()}`;
  }

  return `ecn_offer_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2)}`;
}

function trackLeadCreated(retries = 20): boolean {
  try {
    if (
      typeof window !== "undefined"
      && typeof window.oaiq === "function"
    ) {
      window.oaiq(
        "measure",
        "lead_created",
        { type: "customer_action" },
      );
      return true;
    }

    if (retries > 0 && typeof window !== "undefined") {
      window.setTimeout(
        () => trackLeadCreated(retries - 1),
        250,
      );
    }
  } catch {
    // Il tracking non deve mai bloccare il contatto.
  }

  return false;
}

function euro(cents: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function statusCopy(offer: OfferInterest) {
  if (offer.available) {
    return {
      label: "OFFERTA DISPONIBILE",
      text:
        "Salviamo prima il tuo contatto e poi continui direttamente con la pratica. Documenti e IBAN arrivano solo nel passaggio successivo.",
    };
  }

  return {
    label: "OFFERTA DA AGGIORNARE",
    text:
      "Questa quotazione non è più valida, ma possiamo ricontattarti con l'aggiornamento o con alternative equivalenti. Lascia solo i dati di contatto.",
  };
}

export default function OfferInterestClient({
  promotionId,
  source = "shopify-product",
  entry = "shopify-product",
  campaign = "",
  adGroup = "",
  ad = "",
}: {
  promotionId: string;
  source?: string;
  entry?: string;
  campaign?: string;
  adGroup?: string;
  ad?: string;
}) {
  const [offer, setOffer] = useState<OfferInterest | null>(null);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [step, setStep] = useState(1);
  const [profile, setProfile] =
    useState<CustomerProfile>("");
  const [fields, setFields] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    province: "",
    businessName: "",
    vatNumber: "",
    website: "",
  });
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [requestCode, setRequestCode] = useState("");
  const submissionKey = useRef(createSubmissionKey());
  const conversionStarted = useRef(false);

  useEffect(() => {
    let mounted = true;

    fetch(
      `/api/public/promotions/${encodeURIComponent(promotionId)}/interest`,
      { cache: "no-store" },
    )
      .then(async (response) => {
        const payload = await response.json() as {
          promotion?: OfferInterest;
          preview?: boolean;
          error?: string;
        };

        if (!response.ok || !payload.promotion) {
          throw new Error(
            payload.error || "Offerta non disponibile.",
          );
        }

        return payload;
      })
      .then((payload) => {
        if (!mounted) return;
        setOffer(payload.promotion || null);
        setPreview(payload.preview === true);
      })
      .catch((error) => {
        if (!mounted) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Offerta non disponibile.",
        );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [promotionId]);

  const contactComplete = useMemo(() => {
    return (
      fields.firstName.trim().length >= 2
      && fields.lastName.trim().length >= 2
      && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        fields.email.trim(),
      )
      && fields.phone.replace(/\D/g, "").length >= 8
      && fields.province.trim().length >= 2
    );
  }, [fields]);

  const canContinue =
    step === 1
      ? Boolean(profile)
      : contactComplete && privacy;

  const updateField = (
    name: keyof typeof fields,
    value: string,
  ) => {
    setFields((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const submit = async () => {
    if (
      !offer
      || !profile
      || !contactComplete
      || !privacy
    ) {
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch(
        "/api/public/custom-requests",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "idempotency-key": submissionKey.current,
          },
          body: JSON.stringify({
            customerType: profile,
            firstName: fields.firstName,
            lastName: fields.lastName,
            email: fields.email,
            phone: fields.phone,
            province: fields.province,
            businessName: fields.businessName,
            promotionId: offer.id,
            vatNumber: fields.vatNumber,
            brand: offer.brand,
            modelOrSegment: offer.model,
            monthlyBudgetCents: null,
            maxDepositCents: offer.depositGrossCents,
            durationMonths: offer.durationMonths,
            annualKm: Math.round(
              offer.totalKm
              / Math.max(1, offer.durationMonths / 12),
            ),
            fuel: "",
            transmission: "",
            deliveryTiming: "",
            notes:
              `Interesse offerta ${offer.offerNumber} · `
              + `${offer.brand} ${offer.model} · `
              + `promotionId ${offer.id} · `
              + `stato ${offer.status}`,
            privacyAccepted: true,
            marketingConsent: marketing,
            submissionKey: submissionKey.current,
            source,
            entry,
            campaign,
            adGroup,
            ad,
            website: fields.website,
          }),
        },
      );

      const payload = await response.json() as {
        requestCode?: string;
        error?: string;
        duplicate?: boolean;
      };

      if (!response.ok || !payload.requestCode) {
        throw new Error(
          payload.error
          || "Non è stato possibile registrare il contatto.",
        );
      }

      try {
        window.sessionStorage.setItem(
          quickLeadStorageKey(payload.requestCode),
          JSON.stringify({
            requestCode: payload.requestCode,
            promotionId: offer.id,
            customerType: profile,
            firstName: fields.firstName,
            lastName: fields.lastName,
            email: fields.email,
            phone: fields.phone,
            province: fields.province,
            businessName: fields.businessName,
            vatNumber: fields.vatNumber,
            marketingConsent: marketing,
            source,
            entry,
            campaign,
            adGroup,
            ad,
          }),
        );
      } catch {
        // Il prefill è un miglioramento UX e non deve bloccare il lead.
      }

      let conversionSent = false;

      if (
        !preview
        && response.status === 201
        && !conversionStarted.current
      ) {
        conversionStarted.current = true;
        conversionSent = trackLeadCreated(
          offer.available ? 0 : 20,
        );
      }

      if (offer.available) {
        if (!preview && response.status === 201) {
          try {
            window.sessionStorage.setItem(
              quickLeadConversionKey(payload.requestCode),
              conversionSent ? "sent" : "pending",
            );
          } catch {
            // Il tracking non deve bloccare la continuità del funnel.
          }
        }

        const nextParams = new URLSearchParams({
          promozione: offer.id,
          completa: "1",
          lead: payload.requestCode,
          source,
        });

        if (entry) nextParams.set("entry", entry);
        if (campaign) nextParams.set("campaign", campaign);
        if (adGroup) nextParams.set("ad_group", adGroup);
        if (ad) nextParams.set("ad", ad);

        window.location.assign(
          `/richiesta?${nextParams.toString()}`,
        );
        return;
      }

      setRequestCode(payload.requestCode);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Invio non riuscito. Riprova tra poco.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="public-request-state">
        <Loader2 className="spin" size={34} />
        <h1>Sto aprendo la tua richiesta</h1>
        <p>Recupero dell’offerta ECCOMI in corso…</p>
      </main>
    );
  }

  if (loadError || !offer) {
    return (
      <main className="public-request-state public-request-state--error">
        <AlertTriangle size={36} />
        <h1>Offerta non riconosciuta</h1>
        <p>{loadError}</p>
        <a href="/richiesta">
          Richiedi comunque un’auto su misura
        </a>
      </main>
    );
  }

  const copy = statusCopy(offer);

  return (
    <main
      className="public-request-shell"
      data-pr38-offer-interest="true"
    >
      <header className="public-request-header">
        <a
          href="https://eccomionline.com/pages/eccomi-noleggio"
          aria-label="Torna a ECCOMI NOLEGGIO"
        >
          <span><CarFront size={21} /></span>
          <strong>ECCOMI</strong>
          <small>NOLEGGIO</small>
        </a>
        <div>
          <ShieldCheck size={17} />
          Contatto protetto
        </div>
      </header>

      <div className="public-request-layout">
        <aside className="public-offer-card">
          <span>{copy.label}</span>
          <h1>{offer.brand} {offer.model}</h1>
          <p>{offer.version}</p>
          <div className="public-offer-card__price">
            <strong>{euro(offer.monthlyGrossCents)}</strong>
            <span>/mese IVA inclusa</span>
          </div>
          <div className="public-offer-card__terms">
            <span>
              <small>Anticipo</small>
              <strong>{euro(offer.depositGrossCents)}</strong>
            </span>
            <span>
              <small>Durata</small>
              <strong>{offer.durationMonths} mesi</strong>
            </span>
            <span>
              <small>Km</small>
              <strong>
                {offer.totalKm.toLocaleString("it-IT")}
              </strong>
            </span>
          </div>
          <div className="public-offer-card__expiry">
            {copy.text}
          </div>
          <small>
            Offerta {offer.offerNumber}
            {preview ? " · PREVIEW PR38" : ""}
          </small>
        </aside>

        <section
          className="public-application-card"
          aria-labelledby="interest-title"
        >
          {!requestCode ? (
            <>
              <div className="public-application-card__heading">
                <span>PRIMA IL CONTATTO, POI LA PRATICA</span>
                <h2 id="interest-title">
                  Ti interessa questa auto?
                </h2>
                <p>
                  Lascia i tuoi recapiti. Nessun IBAN e nessun
                  documento in questa fase.
                </p>
              </div>

              <div
                className="public-progress"
                aria-label={`Passaggio ${step} di 2`}
              >
                {["Profilo", "Contatti"].map(
                  (label, index) => (
                    <span
                      className={
                        index + 1 <= step
                          ? "public-progress--active"
                          : ""
                      }
                      key={label}
                    >
                      <i>
                        {index + 1 < step
                          ? <Check size={13} />
                          : index + 1}
                      </i>
                      <small>{label}</small>
                    </span>
                  ),
                )}
              </div>

              <div className="public-application-card__body">
                {step === 1 ? (
                  <div className="public-step">
                    <span>PASSAGGIO 1 DI 2</span>
                    <h3>Per chi richiedi il noleggio?</h3>
                    <div className="public-profile-grid">
                      <button
                        type="button"
                        className={
                          profile === "PRIVATE"
                            ? "public-profile public-profile--active"
                            : "public-profile"
                        }
                        onClick={() => setProfile("PRIVATE")}
                      >
                        <UserRound size={25} />
                        <strong>Privato</strong>
                        <small>Persona fisica</small>
                        <Check size={17} />
                      </button>
                      <button
                        type="button"
                        className={
                          profile === "PROFESSIONAL"
                            ? "public-profile public-profile--active"
                            : "public-profile"
                        }
                        onClick={() =>
                          setProfile("PROFESSIONAL")
                        }
                      >
                        <BriefcaseBusiness size={25} />
                        <strong>Professionista</strong>
                        <small>P.IVA o ditta individuale</small>
                        <Check size={17} />
                      </button>
                      <button
                        type="button"
                        className={
                          profile === "COMPANY"
                            ? "public-profile public-profile--active"
                            : "public-profile"
                        }
                        onClick={() => setProfile("COMPANY")}
                      >
                        <Building2 size={25} />
                        <strong>Azienda</strong>
                        <small>Società o ente</small>
                        <Check size={17} />
                      </button>
                    </div>
                  </div>
                ) : null}

                {step === 2 ? (
                  <div className="public-step">
                    <span>PASSAGGIO 2 DI 2</span>
                    <h3>Dove possiamo ricontattarti?</h3>
                    <p>
                      Registriamo subito l’interesse. La pratica
                      completa si apre solo successivamente.
                    </p>

                    <div className="public-fields">
                      <label>
                        <span>Nome</span>
                        <input
                          value={fields.firstName}
                          onChange={(event) =>
                            updateField(
                              "firstName",
                              event.target.value,
                            )
                          }
                          required
                        />
                      </label>
                      <label>
                        <span>Cognome</span>
                        <input
                          value={fields.lastName}
                          onChange={(event) =>
                            updateField(
                              "lastName",
                              event.target.value,
                            )
                          }
                          required
                        />
                      </label>
                      <label>
                        <span>Email</span>
                        <input
                          type="email"
                          value={fields.email}
                          onChange={(event) =>
                            updateField(
                              "email",
                              event.target.value,
                            )
                          }
                          required
                        />
                      </label>
                      <label>
                        <span>Cellulare</span>
                        <input
                          type="tel"
                          value={fields.phone}
                          onChange={(event) =>
                            updateField(
                              "phone",
                              event.target.value,
                            )
                          }
                          required
                        />
                      </label>
                      <label>
                        <span>Provincia</span>
                        <input
                          value={fields.province}
                          onChange={(event) =>
                            updateField(
                              "province",
                              event.target.value,
                            )
                          }
                          placeholder="Es. Roma"
                          required
                        />
                      </label>

                      <label
                        className="public-honeypot"
                        aria-hidden="true"
                      >
                        <span>Sito web</span>
                        <input
                          value={fields.website}
                          onChange={(event) =>
                            updateField(
                              "website",
                              event.target.value,
                            )
                          }
                          tabIndex={-1}
                        />
                      </label>
                    </div>

                    <label className="public-consent">
                      <input
                        type="checkbox"
                        checked={privacy}
                        onChange={(event) =>
                          setPrivacy(event.target.checked)
                        }
                      />
                      <span>
                        Ho letto l’
                        <a
                          href="https://eccomionline.com/policies/privacy-policy"
                          target="_blank"
                          rel="noreferrer"
                        >
                          informativa privacy
                        </a>{" "}
                        e autorizzo il trattamento dei dati per
                        essere ricontattato sulla richiesta.
                      </span>
                    </label>

                    <label className="public-consent public-consent--optional">
                      <input
                        type="checkbox"
                        checked={marketing}
                        onChange={(event) =>
                          setMarketing(event.target.checked)
                        }
                      />
                      <span>
                        Desidero ricevere aggiornamenti e proposte
                        commerciali ECCOMI. Consenso facoltativo.
                      </span>
                    </label>

                    {submitError ? (
                      <div className="public-error">
                        <AlertTriangle size={18} />
                        {submitError}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <footer className="public-application-card__footer">
                <button
                  className="public-button public-button--back"
                  type="button"
                  disabled={submitting}
                  onClick={() =>
                    step === 1
                      ? history.back()
                      : setStep(1)
                  }
                >
                  <ArrowLeft size={17} />
                  {step === 1 ? "Torna indietro" : "Indietro"}
                </button>

                <span>
                  Nessun documento o IBAN richiesto ora.
                </span>

                <button
                  className="public-button public-button--primary"
                  type="button"
                  disabled={!canContinue || submitting}
                  onClick={() =>
                    step === 1
                      ? setStep(2)
                      : void submit()
                  }
                >
                  {submitting ? (
                    <>
                      <Loader2 className="spin" size={18} />
                      Salvataggio…
                    </>
                  ) : step === 1 ? (
                    <>
                      Continua
                      <ArrowRight size={17} />
                    </>
                  ) : (
                    <>
                      {offer.available
                        ? "Continua alla pratica"
                        : "Richiedi contatto"}
                      {offer.available
                        ? <ArrowRight size={17} />
                        : <Check size={17} />}
                    </>
                  )}
                </button>
              </footer>
            </>
          ) : (
            <div className="public-success">
              <span><Check size={38} /></span>
              <small>INTERESSE REGISTRATO</small>
              <h2>Perfetto, ora il contatto non va perso.</h2>
              <p>
                Un consulente ECCOMI potrà ricontattarti per
                verificare disponibilità, aggiornamento della
                quotazione e prossimi passi.
              </p>
              <div>
                <small>CODICE RICHIESTA</small>
                <strong>{requestCode}</strong>
              </div>

              {preview ? (
                <p>
                  Preview PR38: nessuna scrittura reale è stata
                  effettuata.
                </p>
              ) : null}

              <p>
                L’offerta va aggiornata: ti proporremo la
                versione valida o alternative equivalenti.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
