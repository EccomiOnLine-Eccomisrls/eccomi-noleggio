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
      `}</style>
      {children}
    </div>
  );
}
