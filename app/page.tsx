import { headers } from "next/headers";
import DashboardClient, { type DashboardBootstrapPayload } from "./dashboard-client";
import PracticeManagementControls from "./practice-management-controls";
import "./practice-management.css";
import PromotionManagementControls from "./promotion-management-controls";
import PromotionEditControls from "./promotion-edit-controls";
import "./promotion-edit.css";
import { previewDashboardPayload } from "./lib/server/preview-fixture";
import { isRenderPullRequestPreview } from "./lib/server/preview-mode";

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
      <DashboardClient initialDashboard={initialDashboard} />
      <PromotionManagementControls />
      <PromotionEditControls />
      <PracticeManagementControls />
    </>
  );
}
