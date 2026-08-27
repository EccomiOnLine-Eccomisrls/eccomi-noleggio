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

function isIpadLikeUserAgent(userAgent: string) {
  return /iPad|iPhone|iPod/i.test(userAgent)
    || (/Macintosh/i.test(userAgent) && /Mobile\//i.test(userAgent));
}

function useServerSafeDashboard(
  request: Request,
  params: Record<string, string | string[] | undefined> | undefined,
) {
  if (queryValue(params, "client") === "1") return false;
  if (queryValue(params, "safe") === "1") return true;
  return isIpadLikeUserAgent(request.headers.get("user-agent") || "");
}

function CeoServerSafeDashboard({
  dashboard,
}: {
  dashboard: DashboardBootstrapPayload;
}) {
  const promotions = dashboard.promotions.filter(
    (promotion) => String(promotion.status) !== "TRASHED",
  );
  const onlineCount = promotions.filter((promotion) =>
    ["ONLINE", "ACTIVE", "EXPIRING"].includes(promotion.status),
  ).length;
  const attentionCount = promotions.filter((promotion) =>
    ["EXPIRED", "EXPIRING"].includes(promotion.status),
  ).length;
  const leadCount = dashboard.leads?.length || 0;

  return (
    <main className="ceo-server-page" data-ipad-safe-dashboard="true">
      <header className="ceo-server-bar">
        <div className="ceo-server-bar__brand">
          <span>🚙</span>
          <div><strong>ECCOMI</strong><small>NOLEGGIO</small></div>
        </div>
        <a href="/ceo/promotions">Gestione promozioni →</a>
      </header>

      <section className="ceo-server-heading">
        <small>MODALITÀ COMPATIBILITÀ IPAD · SERVER-SIDE</small>
        <h1>Dashboard CEO</h1>
        <p>
          Vista operativa leggera: non carica la dashboard React completa e
          impedisce al browser iPad di restare bloccato durante l’accesso.
        </p>
      </section>

      <section className="ceo-server-kpis" aria-label="Riepilogo operativo">
        <article>
          <small>PROMOZIONI</small>
          <strong>{promotions.length}</strong>
          <span>Offerte presenti</span>
        </article>
        <article>
          <small>ONLINE</small>
          <strong>{onlineCount}</strong>
          <span>Offerte operative</span>
        </article>
        <article>
          <small>DA ATTENZIONARE</small>
          <strong>{attentionCount}</strong>
          <span>Scadute o in scadenza</span>
        </article>
      </section>

      <section className="ceo-server-panel" aria-label="Aree operative">
        <article className="ceo-server-promotion">
          <div className="ceo-server-promotion__vehicle">
            <small>NOLEGGIO</small>
            <strong>Promozioni</strong>
            <em className="ceo-server-status ceo-server-status--online">OPERATIVO</em>
          </div>
          <div className="ceo-server-promotion__copy">
            <small>GESTIONE REALE</small>
            <h2>Gestione promozioni</h2>
            <p>Modifica vetture, canoni, km, scadenze e sincronizzazione Shopify.</p>
          </div>
          <div className="ceo-server-promotion__actions">
            <a className="ceo-server-primary" href="/ceo/promotions">Apri promozioni</a>
          </div>
        </article>

        <article className="ceo-server-promotion">
          <div className="ceo-server-promotion__vehicle">
            <small>CLIENTI</small>
            <strong>{leadCount}</strong>
            <em className="ceo-server-status">LEAD E PRATICHE</em>
          </div>
          <div className="ceo-server-promotion__copy">
            <small>OPERATIVITÀ</small>
            <h2>Registro pratiche</h2>
            <p>Consulta richieste, clienti e avanzamento delle pratiche di noleggio.</p>
          </div>
          <div className="ceo-server-promotion__actions">
            <a className="ceo-server-secondary" href="/registro">Apri registro</a>
          </div>
        </article>

        <article className="ceo-server-promotion">
          <div className="ceo-server-promotion__vehicle">
            <small>RETE</small>
            <strong>Partner</strong>
            <em className="ceo-server-status ceo-server-status--online">CEO</em>
          </div>
          <div className="ceo-server-promotion__copy">
            <small>GESTIONE RETE</small>
            <h2>Gestione Partner CEO</h2>
            <p>Controlla rete, pratiche, offerte, accessi e commissioni senza entrare nell’Area Partner.</p>
          </div>
          <div className="ceo-server-promotion__actions">
            <a className="ceo-server-secondary" href="/ceo/partners">Apri gestione partner</a>
          </div>
        </article>

        <article className="ceo-server-promotion">
          <div className="ceo-server-promotion__vehicle">
            <small>ECONOMIA PARTNER</small>
            <strong>Commissioni</strong>
            <em className="ceo-server-status ceo-server-status--online">DELIVERY</em>
          </div>
          <div className="ceo-server-promotion__copy">
            <small>MATURAZIONE AUTOMATICA</small>
            <h2>Centro Commissioni</h2>
            <p>Configura base Partner e override, poi gestisci maturate, fatturate e pagate.</p>
          </div>
          <div className="ceo-server-promotion__actions">
            <a className="ceo-server-secondary" href="/ceo/commissions">Apri commissioni</a>
          </div>
        </article>
      </section>
    </main>
  );
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

  if (useServerSafeDashboard(request, query)) {
    return <CeoServerSafeDashboard dashboard={initialDashboard} />;
  }

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
