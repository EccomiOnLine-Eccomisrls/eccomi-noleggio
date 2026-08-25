import { previewPromotionEditable } from "../../../lib/server/preview-fixture";
import PreviewOfferView from "../preview-offer-view";

export default function PreviewPartnerOfferOnePage() {
  return <PreviewOfferView promotion={previewPromotionEditable} />;
}
