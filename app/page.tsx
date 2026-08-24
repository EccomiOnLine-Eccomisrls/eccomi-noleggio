import { headers } from "next/headers";
import DashboardClient from "./dashboard-client";
import PracticeManagementControls from "./practice-management-controls";
import "./practice-management.css";
import PromotionManagementControls from "./promotion-management-controls";
import PromotionEditControls from "./promotion-edit-controls";
import "./promotion-edit.css";
import PreviewDemo from "./preview-demo";
import "./preview-demo.css";
import { previewDashboardPayload } from "./lib/server/preview-fixture";
import { isRenderPullRequestPreview } from "./lib/server/preview-mode";

type HomeProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
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

  if (preview) {
    const query = await searchParams;
    const rawView = Array.isArray(query?.view) ? query?.view[0] : query?.view;
    const rawEdit = Array.isArray(query?.edit) ? query?.edit[0] : query?.edit;
    const view = rawView === "promotions" ? "promotions" : "dashboard";

    return (
      <PreviewDemo
        payload={previewDashboardPayload()}
        view={view}
        editId={rawEdit || null}
      />
    );
  }

  return (
    <>
      <DashboardClient />
      <PromotionManagementControls />
      <PromotionEditControls />
      <PracticeManagementControls />
    </>
  );
}
