import type { Metadata } from "next";
import "./request-upload.css";
import RequestClient from "./request-client";
import CustomRequestClient from "./custom-request-client";
import OfferInterestClient from "./offer-interest-client";
import { attributionToken } from "../lib/attribution";

export const metadata: Metadata = {
  title: "Richiesta di noleggio | ECCOMI NOLEGGIO",
  description:
    "Richiedi un’auto su misura oppure avvia la pratica collegata a un’offerta ECCOMI NOLEGGIO.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function RequestPage({
  searchParams,
}: {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >;
}) {
  const params = await searchParams;

  const promotionId =
    typeof params.promozione === "string"
      ? params.promozione
      : "";

  const initialVehicle =
    typeof params.auto === "string"
      ? params.auto.slice(0, 160)
      : "";

  const source =
    attributionToken(params.source, 80)
    || (promotionId ? "shopify-product" : "direct");

  const entry =
    attributionToken(params.entry, 80)
    || (promotionId ? "shopify-product" : "direct");

  const campaign = attributionToken(params.campaign, 120);
  const adGroup = attributionToken(params.ad_group, 120);
  const ad = attributionToken(params.ad, 120);

  const quickLeadCode =
    typeof params.lead === "string"
      ? params.lead.slice(0, 100)
      : "";

  const completePractice =
    params.completa === "1";

  if (!promotionId) {
    return (
      <CustomRequestClient
        initialVehicle={initialVehicle}
        source={source}
        entry={entry}
        campaign={campaign}
        adGroup={adGroup}
        ad={ad}
      />
    );
  }

  if (!completePractice) {
    return (
      <OfferInterestClient
        promotionId={promotionId}
        source={source}
        entry={entry}
        campaign={campaign}
        adGroup={adGroup}
        ad={ad}
      />
    );
  }

  return (
    <RequestClient
      promotionId={promotionId}
      quickLeadCode={quickLeadCode}
      source={source}
      entry={entry}
      campaign={campaign}
      adGroup={adGroup}
      ad={ad}
    />
  );
}
