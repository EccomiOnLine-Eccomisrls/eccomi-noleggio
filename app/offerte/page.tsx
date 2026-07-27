import {
  ArrowRight,
  CalendarDays,
  CarFront,
  Check,
  Gauge,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { listPublicPromotions } from "../lib/server/public-promotions";

export const dynamic = "force-dynamic";

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const date = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Rome",
});

export default async function OffersPage() {
  const offers = await listPublicPromotions();
  return (
    <main className="showroom">
      <header className="showroom__header">
        <a className="showroom__brand" href="/offerte" aria-label="ECCOMI Noleggio">
          <span><CarFront size={24} /></span>
          <strong>ECCOMI <small>NOLEGGIO</small></strong>
        </a>
        <a className="showroom__back" href="https://eccomionline.com">Torna a EccomiOnline</a>
      </header>

      <section className="showroom__hero">
        <div>
          <p><Sparkles size={16} /> OFFERTE VERIFICATE DA ECCOMI</p>
          <h1>Il noleggio a lungo termine, più semplice da scegliere.</h1>
          <span>Confronta le offerte disponibili, apri il veicolo che preferisci e avvia la richiesta guidata senza carrello e senza pagamento online.</span>
        </div>
        <aside>
          <ShieldCheck size={28} />
          <strong>Controllo ECCOMI</strong>
          <span>Ogni promozione nasce da una quotazione reale e viene pubblicata solo dopo la verifica del CEO.</span>
        </aside>
      </section>

      <section className="showroom__offers" aria-labelledby="offers-title">
        <div className="showroom__section-heading">
          <div>
            <p>ECCOMI NOLEGGIO</p>
            <h2 id="offers-title">Offerte online</h2>
          </div>
          <span>{offers.length} {offers.length === 1 ? "offerta disponibile" : "offerte disponibili"}</span>
        </div>

        {offers.length ? (
          <div className="showroom__grid">
            {offers.map((offer) => (
              <article className="showroom-card" key={offer.id}>
                <div className="showroom-card__image">
                  {/* The image is served by the same public application and already validated at ingestion. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={offer.imageUrl} alt={`${offer.brand} ${offer.model}`} />
                  <span><ShieldCheck size={14} /> OFFERTA VERIFICATA</span>
                </div>
                {offer.imageAttribution ? (
                  <small className="showroom-card__credit">
                    Fonte immagine: {offer.imageSourceUrl
                      ? <a href={offer.imageSourceUrl} target="_blank" rel="noreferrer">{offer.imageAttribution}</a>
                      : offer.imageAttribution}
                  </small>
                ) : null}
                <div className="showroom-card__body">
                  <p>{offer.brand}</p>
                  <h3>{offer.model}</h3>
                  <small>{offer.version}</small>
                  <div className="showroom-card__price">
                    <strong>{euro.format(offer.monthlyGrossCents / 100)}</strong>
                    <span>/mese IVA inclusa</span>
                  </div>
                  <div className="showroom-card__terms">
                    <span><CalendarDays size={16} /><small>Durata</small><strong>{offer.durationMonths} mesi</strong></span>
                    <span><Gauge size={16} /><small>Chilometri</small><strong>{offer.totalKm.toLocaleString("it-IT")} km</strong></span>
                    <span><CarFront size={16} /><small>Anticipo</small><strong>{euro.format(offer.depositGrossCents / 100)}</strong></span>
                  </div>
                  <div className="showroom-card__services">
                    {offer.services.slice(0, 4).map((service) => <span key={service}><Check size={13} /> {service}</span>)}
                  </div>
                  <div className="showroom-card__expiry">
                    Valida fino al <strong>{date.format(new Date(`${offer.validUntil}T12:00:00Z`))}</strong>, salvo disponibilità.
                  </div>
                  {offer.shopifyUrl ? (
                    <a className="showroom-card__cta" href={offer.shopifyUrl}>
                      VEDI L’OFFERTA <ArrowRight size={18} />
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="showroom__empty">
            <CarFront size={36} />
            <h3>Nuove offerte in arrivo</h3>
            <p>Le promozioni verificate compariranno qui appena saranno pubblicate online.</p>
          </div>
        )}
      </section>

      <footer className="showroom__footer">
        <strong>ECCOMI NOLEGGIO</strong>
        <span>La richiesta non costituisce acquisto né approvazione del contratto di noleggio.</span>
      </footer>
    </main>
  );
}
