import { headers } from "next/headers";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";
import { chatGPTSignInPath, chatGPTSignOutPath, getChatGPTUser } from "./chatgpt-auth";
import { getActorForIdentity } from "./lib/server/authz";

function isLocalHost(host: string | null) {
  const hostname = (host || "").split(":")[0].toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "terminal.local";
}

export default async function Home() {
  const requestHeaders = await headers();
  const hostname = (requestHeaders.get("host") || "").split(":")[0].toLowerCase();
  if (hostname === "noleggio.eccomionline.com" || hostname === "www.noleggio.eccomionline.com") {
    redirect("https://eccomionline.com/pages/eccomi-noleggio");
  }
  if (isLocalHost(requestHeaders.get("host"))) return <DashboardClient />;

  const user = await getChatGPTUser();
  if (!user) redirect(chatGPTSignInPath("/"));

  const actor = await getActorForIdentity(user.email, user.displayName);
  if (!actor) {
    return (
      <main className="dashboard-access-denied">
        <span>ECCOMI NOLEGGIO</span>
        <h1>Accesso non autorizzato</h1>
        <p>Questo account non è associato al CEO né a un partner operativo attivo.</p>
        <a href={chatGPTSignOutPath("/")}>Esci e cambia account</a>
      </main>
    );
  }

  return <DashboardClient />;
}
