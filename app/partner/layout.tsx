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
      `}</style>
      {children}
    </div>
  );
}
