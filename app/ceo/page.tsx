/* eslint-disable @next/next/no-html-link-for-pages -- Native links are the iPad fallback when client hydration is unavailable. */
import DashboardClient from "../dashboard-client";
import type { DashboardBootstrapPayload } from "../dashboard-client";
import PracticeManagementControls from "../practice-management-controls";
import "../practice-management.css";
import PromotionManagementControls from "../promotion-management-controls";
import PromotionEditControls from "../promotion-edit-controls";
import "../promotion-edit.css";
import { GET as getDashboard } from "../api/dashboard/route";
import { getActor } from "../lib/server/authz";
import { currentRequest } from "../lib/server/current-request";
import { isRenderPullRequestPreview } from "../lib/server/preview-mode";
import CeoLoginFallback from "./ceo-login-fallback";
import "./ceo-server.css";

type CeoDashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function queryValue(
  params: Record<string, string | string[] | undefined> | undefined,
  key: string,
) {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function CeoDashboardPage({
  searchParams,
}: CeoDashboardPageProps) {
  const request = await currentRequest("/api/dashboard");
  const query = await searchParams;
  const preview = isRenderPullRequestPreview(request);

  if (preview && queryValue(query, "authPreview") === "1") {
    return <CeoLoginFallback preview />;
  }

  const actor = await getActor(request);
  if (!actor) {
    return <CeoLoginFallback error={queryValue(query, "loginError")} />;
  }

  const dashboardResponse = await getDashboard(request);
  if (dashboardResponse.status === 401) {
    return <CeoLoginFallback />;
  }

  if (!dashboardResponse.ok) {
    return (
      <main className="ceo-server-login">
        <section className="ceo-server-login__card">
          <h1>Dashboard temporaneamente non disponibile</h1>
          <p>Il server ha risposto, ma non è riuscito a caricare i dati operativi.</p>
          <a className="ceo-server-primary" href="/ceo">Riprova</a>
        </section>
      </main>
    );
  }

  const initialDashboard = (await dashboardResponse.json()) as DashboardBootstrapPayload;

  return (
    <div className="ceo-server-entry" data-server-dashboard-ready="true">
      <a className="ceo-server-entry__compat" href="/ceo/promotions">
        🚙 Gestione promozioni iPad
      </a>
      <DashboardClient initialDashboard={initialDashboard} />
      <PromotionManagementControls />
      <PromotionEditControls />
      <PracticeManagementControls />
    </div>
  );
}
