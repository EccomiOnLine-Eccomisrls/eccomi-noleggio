import type { ReactNode } from "react";

type PartnerLayoutProps = {
  children: ReactNode;
};

export default function PartnerLayout({ children }: PartnerLayoutProps) {
  return (
    <div className="partner-route-branding">
      <style>{`
        .partner-route-branding > main > section:first-child > div:first-child > span:last-child > strong::after,
        .partner-route-branding > main > header:first-child > div:first-child > span:last-child > strong::after {
          content: " ";
        }

        .partner-route-branding > main > section:first-child > div:first-child > span:last-child::after,
        .partner-route-branding > main > header:first-child > div:first-child > span:last-child::after {
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

        /* PR18 · workspace Partner: nessun identificativo tecnico visibile */
        .partner-route-branding > main > header + div > section:first-child > div:last-child > span > strong {
          font-size: 0;
        }

        .partner-route-branding > main > header + div > section:first-child > div:last-child > span > strong::after {
          content: "Area protetta";
          font-size: 14px;
        }

        .partner-route-branding > main > header + div > section:first-child > div:last-child > span > small {
          display: block;
          max-width: 240px;
          margin-top: 2px;
          font-size: 12px;
          line-height: 1.3;
          color: #2f7c5b;
        }

        .partner-route-branding > main > header + div > section:first-child > div:last-child > span > small {
          font-size: 0;
        }

        .partner-route-branding > main > header + div > section:first-child > div:last-child > span > small::after {
          content: "Accesso riservato alla tua organizzazione";
          font-size: 12px;
        }

        /* Le cinque aree sono il menu di lavoro, non semplici filtri. */
        .partner-route-branding > main > header + div > nav::before {
          content: "IL TUO SPAZIO DI LAVORO";
          flex-basis: 100%;
          margin-bottom: 2px;
          color: #0c5597;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .1em;
        }

        /* Firma prodotto richiesta: visibile solo nella dashboard autenticata. */
        .partner-route-branding > main:has(> header + div)::after {
          content: "ECCOMI NOLEGGIO · Ideato e progettato by Eccomi OnLine";
          display: block;
          max-width: 1320px;
          margin: -42px auto 0;
          padding: 0 24px 34px;
          color: #6b7c90;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .015em;
          text-align: center;
        }

        @media (max-width: 720px) {
          .partner-route-branding > main:has(> header + div)::after {
            margin-top: -30px;
            padding-bottom: 26px;
            font-size: 11px;
          }
        }
      `}</style>
      {children}
    </div>
  );
}
