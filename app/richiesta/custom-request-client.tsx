"use client";

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CarFront,
  Check,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UserRound,
  BriefcaseBusiness,
  AlertTriangle,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

type CustomerProfile = "" | "PRIVATE" | "PROFESSIONAL" | "COMPANY";

type CustomRequestFields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  province: string;
  businessName: string;
  vatNumber: string;
  brand: string;
  modelOrSegment: string;
  monthlyBudget: string;
  maxDeposit: string;
  durationMonths: string;
  annualKm: string;
  fuel: string;
  transmission: string;
  deliveryTiming: string;
  notes: string;
  website: string;
};

const initialFields: CustomRequestFields = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  province: "",
  businessName: "",
  vatNumber: "",
  brand: "",
  modelOrSegment: "",
  monthlyBudget: "",
  maxDeposit: "",
  durationMonths: "",
  annualKm: "",
  fuel: "",
  transmission: "",
  deliveryTiming: "",
  notes: "",
  website: "",
};

function createSubmissionKey() {
  const browserCrypto = globalThis.crypto;

  if (typeof browserCrypto?.randomUUID === "function") {
    return `ecn_custom_${browserCrypto.randomUUID()}`;
  }

  return `ecn_custom_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2)}`;
}

function profileLabel(profile: CustomerProfile) {
  if (profile === "PRIVATE") return "Privato";
  if (profile === "PROFESSIONAL") {
    return "Professionista / ditta individuale";
  }
  if (profile === "COMPANY") return "Azienda";
  return "";
}

function euroToCents(value: string) {
  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(",", ".");

  if (!normalized) return null;

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) return null;

  return Math.round(parsed * 100);
}

function optionalInteger(value: string) {
  if (!value.trim()) return null;

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed >= 0
    ? parsed
    : null;
}

export default function CustomRequestClient() {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<CustomerProfile>("");
  const [fields, setFields] = useState(initialFields);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [requestCode, setRequestCode] = useState("");
  const submissionKey = useRef(createSubmissionKey());

  const updateField = (
    name: keyof CustomRequestFields,
    value: string,
  ) => {
    setFields((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const contactComplete = useMemo(() => {
    const baseComplete =
      fields.firstName.trim().length >= 2
      && fields.lastName.trim().length >= 2
      && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        fields.email.trim(),
      )
      && fields.phone.replace(/\D/g, "").length >= 8
      && fields.province.trim().length >= 2;

    if (!baseComplete) return false;

    if (profile === "PRIVATE") return true;

    return (
      fields.businessName.trim().length >= 2
      && fields.vatNumber.replace(/\D/g, "").length === 11
    );
  }, [fields, profile]);

  const vehicleComplete = useMemo(() => {
    return Boolean(
      fields.brand.trim()
      || fields.modelOrSegment.trim(),
    );
  }, [fields.brand, fields.modelOrSegment]);

  const canContinue =
    step === 1
      ? Boolean(profile)
      : step === 2
        ? contactComplete
        : step === 3
          ? vehicleComplete
          : privacy;

  const submit = async () => {
    if (!privacy || !contactComplete || !vehicleComplete) {
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
            vatNumber: fields.vatNumber,
            brand: fields.brand,
            modelOrSegment: fields.modelOrSegment,
            monthlyBudgetCents: euroToCents(
              fields.monthlyBudget,
            ),
            maxDepositCents: euroToCents(
              fields.maxDeposit,
            ),
            durationMonths: optionalInteger(
              fields.durationMonths,
            ),
            annualKm: optionalInteger(fields.annualKm),
            fuel: fields.fuel,
            transmission: fields.transmission,
            deliveryTiming: fields.deliveryTiming,
            notes: fields.notes,
            privacyAccepted: privacy,
            marketingConsent: marketing,
            submissionKey: submissionKey.current,
            website: fields.website,
          }),
        },
      );

      const payload = await response.json() as {
        ok?: boolean;
        error?: string;
        requestCode?: string;
      };

      if (!response.ok || !payload.requestCode) {
        throw new Error(
          payload.error
          || "Non è stato possibile inviare la richiesta.",
        );
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

  return (
    <main className="public-request-shell">
      <header className="public-request-header">
        <a
          href="https://eccomionline.com"
          aria-label="Torna a Eccomi Online"
        >
          <span>
            <CarFront size={21} />
          </span>
          <strong>ECCOMI</strong>
          <small>NOLEGGIO</small>
        </a>

        <div>
          <ShieldCheck size={17} />
          Richiesta gratuita e protetta
        </div>
      </header>

      <div className="public-request-layout">
        <aside className="public-offer-card custom-request-intro">
          <div className="custom-request-intro__image">
  <img
    src="/images/hero-auto-su-misura.jpeg"
    alt="Auto a noleggio su misura con ECCOMI Noleggio"
  />
</div>

          <span>ECCOMI AUTO SU MISURA</span>

          <h1>Non trovi l’auto giusta? La troviamo noi.</h1>

          <p>
            Dicci come la immagini. Analizziamo le offerte
            disponibili dei nostri partner e selezioniamo
            quelle realmente coerenti con budget, utilizzo
            ed esigenze.
          </p>

          <div className="custom-request-rating">
            <strong>Servizio gratuito</strong>
            <span>★★★★★</span>
            <small>Consulenza personalizzata e senza impegno</small>
          </div>

          <div className="custom-request-benefits">
            <div>
              <Check size={16} />
              Richiesta gratuita
            </div>
            <div>
              <Check size={16} />
              Nessun impegno
            </div>
            <div>
              <Check size={16} />
              Consulenza dedicata
            </div>
            <div>
              <Check size={16} />
              Offerte selezionate
            </div>
            <div>
              <Check size={16} />
              Nessun documento in questa fase
            </div>
          </div>

          <div className="custom-request-response-time">
            <span>Tempo medio di risposta</span>
            <strong>Entro 24 ore lavorative</strong>
          </div>

          <div className="public-offer-card__expiry">
            Non servono documenti o IBAN in questa fase.
            Prima individuiamo la soluzione giusta; solo
            successivamente potrai decidere se procedere.
          </div>
        </aside>

        <section
          className="public-application-card"
          aria-labelledby="custom-request-title"
        >
          {!requestCode ? (
            <>
              <div className="public-application-card__heading">
                <span>ECCOMI NOLEGGIO</span>

                <h2 id="custom-request-title">
                  Richiesta Auto su Misura
                </h2>

                <p>
                  Compila il percorso in meno di tre minuti.
                  Un consulente ECCOMI selezionerà le offerte
                  migliori disponibili per le tue esigenze.
                </p>

                <div className="custom-request-heading-badges">
                  <span><Check size={13} /> Gratuita</span>
                  <span><ShieldCheck size={13} /> Dati protetti</span>
                  <span><Check size={13} /> Senza impegno</span>
                </div>
              </div>

              <div
                className="public-progress"
                aria-label={`Passaggio ${step} di 4`}
              >
                {[
                  "Profilo",
                  "Contatti",
                  "Auto",
                  "Conferma",
                ].map((label, index) => (
                  <span
                    className={
                      index + 1 <= step
                        ? "public-progress--active"
                        : ""
                    }
                    key={label}
                  >
                    <i>
                      {index + 1 < step ? (
                        <Check size={13} />
                      ) : (
                        index + 1
                      )}
                    </i>
                    <small>{label}</small>
                  </span>
                ))}
              </div>

              <div className="public-application-card__body">
                {step === 1 ? (
                  <div className="public-step">
                    <span>PASSAGGIO 1 DI 4</span>
                    <h3>Per chi stai cercando l’auto?</h3>
                    <p>
                      Seleziona il profilo corretto: condizioni,
                      documenti e offerte possono variare.
                    </p>

                    <div className="public-profile-grid">
                      <button
                        className={
                          profile === "PRIVATE"
                            ? "public-profile public-profile--active"
                            : "public-profile"
                        }
                        type="button"
                        onClick={() => setProfile("PRIVATE")}
                      >
                        <UserRound size={25} />
                        <strong>Privato</strong>
                        <small>Auto per uso personale</small>
                        <Check size={17} />
                      </button>

                      <button
                        className={
                          profile === "PROFESSIONAL"
                            ? "public-profile public-profile--active"
                            : "public-profile"
                        }
                        type="button"
                        onClick={() =>
                          setProfile("PROFESSIONAL")
                        }
                      >
                        <BriefcaseBusiness size={25} />
                        <strong>Professionista</strong>
                        <small>Partita IVA o ditta individuale</small>
                        <Check size={17} />
                      </button>

                      <button
                        className={
                          profile === "COMPANY"
                            ? "public-profile public-profile--active"
                            : "public-profile"
                        }
                        type="button"
                        onClick={() => setProfile("COMPANY")}
                      >
                        <Building2 size={25} />
                        <strong>Azienda</strong>
                        <small>Società, ente o piccola flotta</small>
                        <Check size={17} />
                      </button>
                    </div>
                  </div>
                ) : null}

                {step === 2 ? (
                  <div className="public-step">
                    <span>
                      PASSAGGIO 2 DI 4 ·{" "}
                      {profileLabel(profile).toUpperCase()}
                    </span>

                    <h3>Come possiamo ricontattarti?</h3>

                    <p>
                      I dati saranno utilizzati esclusivamente
                      per analizzare la richiesta e preparare
                      una proposta personalizzata.
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

                      {profile !== "PRIVATE" ? (
                        <>
                          <label>
                            <span>
                              {profile === "COMPANY"
                                ? "Ragione sociale"
                                : "Denominazione attività"}
                            </span>
                            <input
                              value={fields.businessName}
                              onChange={(event) =>
                                updateField(
                                  "businessName",
                                  event.target.value,
                                )
                              }
                              required
                            />
                          </label>

                          <label>
                            <span>Partita IVA</span>
                            <input
                              value={fields.vatNumber}
                              onChange={(event) =>
                                updateField(
                                  "vatNumber",
                                  event.target.value,
                                )
                              }
                              inputMode="numeric"
                              maxLength={11}
                              required
                            />
                          </label>
                        </>
                      ) : null}

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
                  </div>
                ) : null}

                {step === 3 ? (
                  <div className="public-step">
                    <span>PASSAGGIO 3 DI 4</span>

                    <h3>Descrivi l’auto ideale</h3>

                    <p>
                      Puoi indicare un modello preciso oppure
                      descrivere semplicemente la tipologia,
                      il budget e l’utilizzo previsto.
                    </p>

                    <div className="public-fields custom-request-fields">
                      <label>
                        <span>Marca preferita</span>
                        <input
                          value={fields.brand}
                          onChange={(event) =>
                            updateField(
                              "brand",
                              event.target.value,
                            )
                          }
                          placeholder="Es. Fiat, Audi, Toyota"
                        />
                      </label>

                      <label>
                        <span>Modello o tipologia</span>
                        <input
                          value={fields.modelOrSegment}
                          onChange={(event) =>
                            updateField(
                              "modelOrSegment",
                              event.target.value,
                            )
                          }
                          placeholder="Es. Panda, SUV, utilitaria"
                        />
                      </label>

                      <label>
                        <span>Budget massimo mensile</span>
                        <input
                          value={fields.monthlyBudget}
                          onChange={(event) =>
                            updateField(
                              "monthlyBudget",
                              event.target.value,
                            )
                          }
                          inputMode="decimal"
                          placeholder="Es. 350"
                        />
                      </label>

                      <label>
                        <span>Anticipo massimo</span>
                        <input
                          value={fields.maxDeposit}
                          onChange={(event) =>
                            updateField(
                              "maxDeposit",
                              event.target.value,
                            )
                          }
                          inputMode="decimal"
                          placeholder="Es. 3.000 oppure 0"
                        />
                      </label>

                      <label>
                        <span>Durata preferita</span>
                        <select
                          value={fields.durationMonths}
                          onChange={(event) =>
                            updateField(
                              "durationMonths",
                              event.target.value,
                            )
                          }
                        >
                          <option value="">Indifferente</option>
                          <option value="24">24 mesi</option>
                          <option value="36">36 mesi</option>
                          <option value="48">48 mesi</option>
                          <option value="60">60 mesi</option>
                        </select>
                      </label>

                      <label>
                        <span>Chilometri annui</span>
                        <select
                          value={fields.annualKm}
                          onChange={(event) =>
                            updateField(
                              "annualKm",
                              event.target.value,
                            )
                          }
                        >
                          <option value="">Da definire</option>
                          <option value="10000">10.000 km</option>
                          <option value="15000">15.000 km</option>
                          <option value="20000">20.000 km</option>
                          <option value="25000">25.000 km</option>
                          <option value="30000">30.000 km</option>
                          <option value="40000">40.000 km</option>
                        </select>
                      </label>

                      <label>
                        <span>Alimentazione</span>
                        <select
                          value={fields.fuel}
                          onChange={(event) =>
                            updateField(
                              "fuel",
                              event.target.value,
                            )
                          }
                        >
                          <option value="">Indifferente</option>
                          <option value="BENZINA">Benzina</option>
                          <option value="DIESEL">Diesel</option>
                          <option value="IBRIDA">Ibrida</option>
                          <option value="ELETTRICA">Elettrica</option>
                          <option value="GPL">GPL</option>
                        </select>
                      </label>

                      <label>
                        <span>Cambio</span>
                        <select
                          value={fields.transmission}
                          onChange={(event) =>
                            updateField(
                              "transmission",
                              event.target.value,
                            )
                          }
                        >
                          <option value="">Indifferente</option>
                          <option value="MANUALE">Manuale</option>
                          <option value="AUTOMATICO">Automatico</option>
                        </select>
                      </label>

                      <label>
                        <span>Quando ti serve?</span>
                        <select
                          value={fields.deliveryTiming}
                          onChange={(event) =>
                            updateField(
                              "deliveryTiming",
                              event.target.value,
                            )
                          }
                        >
                          <option value="">Da definire</option>
                          <option value="SUBITO">Il prima possibile</option>
                          <option value="ENTRO_30_GIORNI">
                            Entro 30 giorni
                          </option>
                          <option value="ENTRO_90_GIORNI">
                            Entro 3 mesi
                          </option>
                          <option value="OLTRE_90_GIORNI">
                            Più avanti
                          </option>
                        </select>
                      </label>

                      <label className="custom-request-fields__wide">
                        <span>Esigenze o preferenze particolari</span>
                        <textarea
                          value={fields.notes}
                          onChange={(event) =>
                            updateField(
                              "notes",
                              event.target.value,
                            )
                          }
                          maxLength={2000}
                          placeholder="Es. bagagliaio capiente, pronta consegna, colore, accessori, uso aziendale..."
                        />
                      </label>
                    </div>
                  </div>
                ) : null}

                {step === 4 ? (
                  <div className="public-step">
                    <span>PASSAGGIO 4 DI 4 · RIEPILOGO</span>

                    <h3>Controlla e invia la richiesta</h3>

                    <div className="public-summary">
                      <div>
                        <span>Richiedente</span>
                        <strong>
                          {fields.firstName} {fields.lastName}
                        </strong>
                        <small>
                          {profileLabel(profile)} · {fields.email}
                        </small>
                      </div>

                      <div>
                        <span>Auto desiderata</span>
                        <strong>
                          {[fields.brand, fields.modelOrSegment]
                            .filter(Boolean)
                            .join(" ") || "Da definire"}
                        </strong>
                        <small>
                          Budget:{" "}
                          {fields.monthlyBudget
                            ? `${fields.monthlyBudget} €/mese`
                            : "da definire"}
                        </small>
                      </div>

                      <div>
                        <span>Utilizzo</span>
                        <strong>
                          {fields.annualKm
                            ? `${Number(fields.annualKm).toLocaleString("it-IT")} km/anno`
                            : "Chilometri da definire"}
                        </strong>
                        <small>
                          Durata:{" "}
                          {fields.durationMonths
                            ? `${fields.durationMonths} mesi`
                            : "indifferente"}
                        </small>
                      </div>
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
                        e autorizzo il trattamento dei dati
                        necessario alla gestione della richiesta.
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

                    <div className="public-safety">
                      <ShieldCheck size={20} />
                      <p>
                        <strong>Richiesta senza impegno.</strong>
                        <small>
                          I dati verranno usati per individuare e
                          proporti offerte coerenti con le esigenze
                          indicate.
                        </small>
                      </p>
                    </div>

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
                      : setStep((current) => current - 1)
                  }
                >
                  <ArrowLeft size={17} />
                  {step === 1 ? "Torna indietro" : "Indietro"}
                </button>

                <span>
                  La richiesta è gratuita e senza impegno.
                </span>

                <button
                  className="public-button public-button--primary"
                  type="button"
                  disabled={!canContinue || submitting}
                  onClick={() =>
                    step < 4
                      ? setStep((current) => current + 1)
                      : submit()
                  }
                >
                  {submitting ? (
                    <>
                      <Loader2 className="spin" size={18} />
                      Invio…
                    </>
                  ) : step < 4 ? (
                    <>
                      Continua
                      <ArrowRight size={17} />
                    </>
                  ) : (
                    <>
                      Invia richiesta
                      <Check size={17} />
                    </>
                  )}
                </button>
              </footer>
            </>
          ) : (
            <div className="public-success">
              <span>
                <Check size={38} />
              </span>

              <small>RICHIESTA REGISTRATA</small>

              <h2>Richiesta inviata correttamente</h2>

              <p>
                Ora analizziamo le tue esigenze e cerchiamo
                le offerte più coerenti. Un consulente ECCOMI
                ti ricontatterà entro 24 ore lavorative.
              </p>

              <div>
                <small>CODICE RICHIESTA</small>
                <strong>{requestCode}</strong>
              </div>

              <div className="custom-request-next-steps">
                <h3>Cosa succede adesso?</h3>

                <ol>
                  <li>
                    <i>1</i>
                    <span>
                      <strong>Analizziamo la richiesta</strong>
                      <small>Verifichiamo budget, utilizzo e preferenze.</small>
                    </span>
                  </li>
                  <li>
                    <i>2</i>
                    <span>
                      <strong>Selezioniamo le offerte</strong>
                      <small>Confrontiamo le proposte disponibili.</small>
                    </span>
                  </li>
                  <li>
                    <i>3</i>
                    <span>
                      <strong>Ti ricontattiamo</strong>
                      <small>Ricevi una consulenza gratuita e senza impegno.</small>
                    </span>
                  </li>
                </ol>
              </div>

              <a
                className="public-button public-button--primary"
                href="https://eccomionline.com"
              >
                <CarFront size={18} />
                Torna su Eccomi Online
              </a>
            </div>
          )}
        </section>
      </div>

      <footer className="public-request-footer">
        <div>
          <ShieldCheck size={17} />
          <span>
            <strong>Governato da ECCOMI</strong>
            <small>
              La richiesta viene gestita e tracciata dal nostro
              ecosistema.
            </small>
          </span>
        </div>

        <div>
          <MessageCircle size={17} />
          <span>
            <strong>Hai bisogno di aiuto?</strong>
            <small>
              Un consulente potrà ricontattarti dopo l’invio.
            </small>
          </span>
        </div>
      </footer>
    </main>
  );
}
