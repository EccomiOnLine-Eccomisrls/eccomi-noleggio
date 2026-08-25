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

const previewSidebarScript = `
(() => {
  const items = Array.from(document.querySelectorAll('.ec-preview-sidebar nav .disabled'));
  for (const item of items) {
    const text = (item.textContent || '').trim();
    if (text.includes('Partner')) {
      const link = document.createElement('a');
      link.href = '/ceo/partners';
      link.innerHTML = item.innerHTML;
      link.setAttribute('data-preview-real-link', 'partner');
      item.replaceWith(link);
      continue;
    }
    const label = document.createElement('small');
    label.textContent = 'IN SVILUPPO';
    label.style.marginLeft = 'auto';
    label.style.fontSize = '10px';
    label.style.fontWeight = '800';
    label.style.letterSpacing = '.06em';
    label.style.opacity = '.7';
    item.appendChild(label);
    item.setAttribute('aria-disabled', 'true');
    item.setAttribute('title', 'Sezione non ancora disponibile nella preview');
  }
})();
`;

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
      <>
        <PreviewDemo
          payload={previewDashboardPayload()}
          view={view}
          editId={rawEdit || null}
          query={query}
        />
        <script dangerouslySetInnerHTML={{ __html: previewSidebarScript }} />
      </>
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
