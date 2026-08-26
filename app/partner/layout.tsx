import type { ReactNode } from "react";

type PartnerLayoutProps = {
  children: ReactNode;
};

export default function PartnerLayout({ children }: PartnerLayoutProps) {
  return (
    <div className="partner-route-branding">
      <style>{`
        /* Login Partner */
        .partner-route-branding > main > section:first-child > div:first-child > span:last-child > strong::after {
          content: " ";
        }

        .partner-route-branding > main > section:first-child > div:first-child > span:last-child::after {
          content: "by Eccomi OnLine";
          display: block;
          margin-top: 3px;
          color: #6b7c90;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .035em;
          line-height: 1.2;
        }

        .partner-route-branding > main > section:has(> form + div) > div:nth-child(2) > p {
          display: none;
        }

        .partner-route-branding > main > section:has(> form + div) > div:nth-child(2)::after {
          content: "Accedi per gestire offerte, pratiche, documenti e commissioni della tua società.";
          display: block;
          margin-top: 8px;
          color: #66768a;
          line-height: 1.55;
        }

        .partner-route-branding > main > section:has(> form + div) > form + div > span {
          display: none;
        }

        .partner-route-branding > main > section:has(> form + div) > form + div::after {
          content: "Accesso riservato ai Partner ECCOMI · Un servizio dell’ecosistema Eccomi OnLine.";
          color: #0c5597;
          font-size: 13px;
          line-height: 1.45;
        }

        /* Dashboard reale autenticata: applica il branding solo quando è presente il pulsante Esci.
           Le preview demo hanno già il proprio markup e non devono ricevere duplicazioni. */
        .partner-route-branding > main:has(header button) > header > div:first-child > span:last-child::after {
          content: "by Eccomi OnLine";
          display: block;
          margin-top: 3px;
          color: #6b7c90;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .035em;
          line-height: 1.2;
        }

        .partner-route-branding > main:has(header button) > div > nav::before {
          content: "IL TUO SPAZIO DI LAVORO";
          display: block;
          flex: 0 0 100%;
          width: 100%;
          margin: 0 0 3px;
          color: #0c5597;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .1em;
          line-height: 1.3;
        }

        /* Firma prodotto: nascosta di default e mostrata una sola volta nella dashboard reale. */
        .partner-product-signature {
          display: none;
          max-width: 1320px;
          margin: 0 auto;
          padding: 12px 24px 34px;
          color: #6b7c90;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .015em;
          text-align: center;
        }

        .partner-route-branding > main:has(header button) + .partner-product-signature {
          display: block;
        }

        .partner-product-signature strong {
          color: #0c5597;
        }

        @media (max-width: 720px) {
          .partner-product-signature {
            padding-bottom: 26px;
            font-size: 11px;
          }
        }
      `}</style>
      {children}
      <footer className="partner-product-signature">
        <strong>ECCOMI NOLEGGIO</strong> · Ideato e progettato by Eccomi OnLine
      </footer>
    </div>
  );
}
