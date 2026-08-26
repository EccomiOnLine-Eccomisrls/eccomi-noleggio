"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, ShieldCheck } from "lucide-react";

function activationParams() {
  if (typeof window === "undefined") return { tokenHash: "", type: "" };
  const params = new URLSearchParams(window.location.search);
  return { tokenHash: params.get("token_hash") || "", type: params.get("type") || "" };
}

export default function PartnerActivatePage() {
  const [tokenHash, setTokenHash] = useState("");
  const [type, setType] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = activationParams();
    setTokenHash(params.tokenHash);
    setType(params.type);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!tokenHash || !["invite", "recovery"].includes(type)) return setError("Il link di attivazione non è valido. Chiedi a ECCOMI di reinviare l'invito.");
    if (password.length < 8) return setError("La password deve contenere almeno 8 caratteri.");
    if (password !== confirm) return setError("Le due password non coincidono.");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/partner-activate", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tokenHash, type, password }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Attivazione non riuscita.");
      setDone(true);
      window.history.replaceState(null, "", "/partner/activate");
      window.setTimeout(() => { window.location.href = "/partner"; }, 900);
    } catch (activateError) {
      setError(activateError instanceof Error ? activateError.message : "Attivazione non riuscita.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.brand}><span style={styles.icon}>🚙</span><div><strong>ECCOMI</strong><small>NOLEGGIO · AREA PARTNER</small></div></div>
        {done ? (
          <div style={styles.success}><CheckCircle2 size={34} /><h1>Accesso attivato</h1><p>La password è stata impostata. Stai entrando nella tua Area Partner.</p></div>
        ) : (
          <>
            <div><span style={styles.kicker}><ShieldCheck size={16} /> ATTIVAZIONE SICURA</span><h1 style={styles.title}>Scegli la tua password</h1><p style={styles.muted}>Questo link è personale e monouso. La verifica avviene server-side con Supabase Auth; la password non viene memorizzata da ECCOMI.</p></div>
            <form onSubmit={submit} style={styles.form}>
              <label style={styles.label}><span>Password</span><input style={styles.input} type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required /></label>
              <label style={styles.label}><span>Ripeti password</span><input style={styles.input} type="password" minLength={8} value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" required /></label>
              <small style={styles.help}>Minimo 8 caratteri. Evita password già utilizzate altrove.</small>
              {error ? <div style={styles.error}>{error}</div> : null}
              <button style={styles.button} type="submit" disabled={busy}>{busy ? <Loader2 className="spin" size={18} /> : <KeyRound size={18} />}{busy ? "Attivazione…" : "Attiva Area Partner"}</button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "linear-gradient(135deg,#073f73,#0c5597)" },
  card: { width: "100%", maxWidth: 510, display: "grid", gap: 24, padding: 30, borderRadius: 22, background: "#fff", boxShadow: "0 24px 70px rgba(0,0,0,.22)", color: "#102033" },
  brand: { display: "flex", alignItems: "center", gap: 12, color: "#073f73" },
  icon: { width: 48, height: 48, borderRadius: 14, display: "grid", placeItems: "center", background: "#0c74bb", color: "#fff" },
  kicker: { display: "inline-flex", alignItems: "center", gap: 7, color: "#0c5597", fontSize: 12, fontWeight: 900, letterSpacing: ".1em" },
  title: { margin: "10px 0 8px", fontSize: 31 },
  muted: { margin: 0, color: "#66768a", lineHeight: 1.55 },
  form: { display: "grid", gap: 15 },
  label: { display: "grid", gap: 7, fontWeight: 800 },
  input: { minHeight: 49, border: "1px solid #dce6f1", borderRadius: 12, padding: "11px 13px", fontSize: 16 },
  help: { color: "#66768a" },
  error: { padding: 13, borderRadius: 11, background: "#fff1f2", color: "#b42318", fontWeight: 800 },
  button: { minHeight: 48, border: 0, borderRadius: 11, padding: "11px 16px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#1478bd", color: "#fff", fontWeight: 900 },
  success: { display: "grid", gap: 8, textAlign: "center", justifyItems: "center", padding: "16px 0", color: "#166534" },
};
