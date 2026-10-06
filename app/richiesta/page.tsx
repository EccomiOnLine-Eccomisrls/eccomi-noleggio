import type { Metadata } from "next";
import "./request-upload.css";
import RequestClient from "./request-client";
import CustomRequestClient from "./custom-request-client";

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
    typeof params.source === "string"
      ? params.source.slice(0, 80)
      : "direct";

  if (!promotionId) {
    return (
      <CustomRequestClient
        initialVehicle={initialVehicle}
        source={source}
      />
    );
  }

  return <RequestClient promotionId={promotionId} />;
}
