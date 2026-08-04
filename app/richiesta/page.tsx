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

  if (!promotionId) {
    return <CustomRequestClient />;
  }

  return <RequestClient promotionId={promotionId} />;
}
