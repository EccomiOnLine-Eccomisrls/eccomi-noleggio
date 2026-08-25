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

const previewNavigationCss = `
.ec-preview-sidebar nav .disabled{visibility:hidden!important}
.ec-preview-nav-overrides{position:fixed;left:20px;top:312px;width:246px;z-index:9000;display:grid;gap:5px;font-family:Arial,Helvetica,sans-serif}
.ec-preview-nav-overrides>a,.ec-preview-nav-overrides>span{min-height:48px;display:flex;align-items:center;gap:12px;padding:0 13px;border-radius:11px;color:#b8cee0;text-decoration:none;font-size:14px;font-weight:700}
.ec-preview-nav-overrides>a:hover,.ec-preview-nav-overrides>a:focus{color:#fff;background:linear-gradient(90deg,#1096e8,#1278c9);outline:none}
.ec-preview-nav-overrides .nav-icon{width:21px;text-align:center;font-size:17px;font-style:normal}
.ec-preview-nav-overrides .nav-disabled{opacity:.62;cursor:default}
.ec-preview-nav-overrides small{margin-left:auto;padding:4px 6px;border:1px solid rgba(255,255,255,.16);border-radius:999px;color:#9fc0d9;font-size:8px;font-weight:900;letter-spacing:.06em;white-space:nowrap}
@media(max-width:700px){.ec-preview-nav-overrides{display:none}}
`;

function PreviewNavigationOverride() {
  return (
    <>
      <style>{previewNavigationCss}</style>
      <nav className="ec-preview-nav-overrides" aria-label="Navigazione operativa preview">
        <span className="nav-disabled" aria-disabled="true" title="Sezione in sviluppo">
          <i className="nav-icon">♙</i>
          Lead e pratiche
          <small>IN SVILUPPO</small>
        </span>
        <a href="/ceo/partners" data-preview-real-link="partner">
          <i className="nav-icon">⌁</i>
          Partner
        </a>
        <span className="nav-disabled" aria-disabled="true" title="Sezione in sviluppo">
          <i className="nav-icon">€</i>
          Commissioni
          <small>IN SVILUPPO</small>
        </span>
      </nav>
    </>
  );
}

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
        <PreviewNavigationOverride />
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
