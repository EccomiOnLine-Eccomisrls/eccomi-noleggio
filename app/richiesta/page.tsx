import type { Metadata } from "next";
import RequestClient from "./request-client";

export const metadata: Metadata = {
  title: "Richiesta di noleggio | ECCOMI NOLEGGIO",
  description: "Avvia online la richiesta di noleggio collegata alla tua offerta ECCOMI.",
  robots: { index: false, follow: false },
};

export default async function RequestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const promotionId = typeof params.promozione === "string" ? params.promozione : "";
  return <RequestClient promotionId={promotionId} />;
}
