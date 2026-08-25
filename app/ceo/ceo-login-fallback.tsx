type CeoLoginFallbackProps = {
  error?: string;
  preview?: boolean;
};

export default function CeoLoginFallback({
  error,
  preview = false,
}: CeoLoginFallbackProps) {
  return (
    <main className="ceo-server-login" data-server-auth-ready="true">
      <section className="ceo-server-login__card">
        <div className="ceo-server-login__brand">
          <span>🚙</span>
          <div>
            <strong>ECCOMI</strong>
            <small>NOLEGGIO</small>
          </div>
        </div>

        <span className="ceo-server-login__eyebrow">ACCESSO RISERVATO</span>
        <h1>Entra in ECCOMI NOLEGGIO</h1>
        <p>
          Login caricata direttamente dal server e pronta all’uso anche su
          Safari e iPad.
        </p>

        {error ? <div className="ceo-server-login__error">{error}</div> : null}

        <form method="post" action={preview ? "/ceo?authPreview=1" : "/api/auth/ceo-login-form"}>
          <input type="hidden" name="returnTo" value="/ceo" />
          <label>
            <span>Email</span>
            <input
              name="email"
              type="email"
              autoComplete="username"
              autoCapitalize="none"
              required
            />
          </label>
          <label>
            <span>Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button type="submit" disabled={preview}>
            {preview ? "Anteprima login server-side" : "Accedi come CEO"}
          </button>
        </form>

        <p className="ceo-server-login__note">
          {preview
            ? "PREVIEW SICURA: autenticazione disabilitata e nessun dato reale coinvolto."
            : "Sessione protetta tramite cookie HttpOnly."}
        </p>
      </section>
    </main>
  );
}
