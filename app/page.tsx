import { headers } from "next/headers";
import DashboardClient, { type DashboardBootstrapPayload } from "./dashboard-client";
import PracticeManagementControls from "./practice-management-controls";
import "./practice-management.css";
import PromotionManagementControls from "./promotion-management-controls";
import PromotionEditControls from "./promotion-edit-controls";
import "./promotion-edit.css";
import { previewDashboardPayload } from "./lib/server/preview-fixture";
import { isRenderPullRequestPreview } from "./lib/server/preview-mode";

// vinext 0.0.50 can emit its final RSC marker after </html>. When the client
// entry is already cached (notably on WebKit), it can start consuming the
// embedded stream before that marker arrives and never close the stream.
// This preview-only setter turns the final marker into one last harmless push,
// which closes the stream whether the client entry starts early or late.
const previewHydrationGuard = `(()=>{const scope=self;if(scope.__ECCOMI_PREVIEW_RSC_GUARD__)return;scope.__ECCOMI_PREVIEW_RSC_GUARD__=true;let done=Boolean(scope.__VINEXT_RSC_DONE__);try{Object.defineProperty(scope,"__VINEXT_RSC_DONE__",{configurable:true,get(){return done},set(value){done=Boolean(value);if(!done)return;const chunks=scope.__VINEXT_RSC_CHUNKS__=scope.__VINEXT_RSC_CHUNKS__||[];chunks.push("")}})}catch{}})();`;

export default async function Home() {
  const incomingHeaders = await headers();
  const host = incomingHeaders.get("host")?.trim() || "localhost";
  const forwardedProtocol = incomingHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol === "http" ? "http" : "https";

  let preview = false;
  try {
    preview = isRenderPullRequestPreview(new Request(`${protocol}://${host}/`));
  } catch {
    preview = isRenderPullRequestPreview();
  }

  const initialDashboard = preview
    ? previewDashboardPayload() as DashboardBootstrapPayload
    : null;

  return (
    <>
      {preview ? (
        <script
          data-eccomi-preview-hydration-guard="true"
          dangerouslySetInnerHTML={{ __html: previewHydrationGuard }}
        />
      ) : null}
      <DashboardClient initialDashboard={initialDashboard} />
      <PromotionManagementControls />
      <PromotionEditControls />
      <PracticeManagementControls />
    </>
  );
}
