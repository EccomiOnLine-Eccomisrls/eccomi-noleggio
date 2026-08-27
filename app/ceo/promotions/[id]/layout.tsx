import type { ReactNode } from "react";
import ShopifyPreparationWaiting from "./shopify-preparation-waiting";

export default function CeoPromotionLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ShopifyPreparationWaiting />
    </>
  );
}
