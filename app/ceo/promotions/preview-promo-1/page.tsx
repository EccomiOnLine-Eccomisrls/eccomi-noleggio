import { previewPromotionEditable } from "../../../lib/server/preview-fixture";
import PreviewOfferView from "../preview-offer-view";

type PreviewOfferPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function queryValue(
  params: Record<string, string | string[] | undefined> | undefined,
  key: string,
) {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function PreviewPartnerOfferOnePage({ searchParams }: PreviewOfferPageProps) {
  const query = await searchParams;
  return (
    <PreviewOfferView
      promotion={previewPromotionEditable}
      partnerId={queryValue(query, "partner")}
    />
  );
}
