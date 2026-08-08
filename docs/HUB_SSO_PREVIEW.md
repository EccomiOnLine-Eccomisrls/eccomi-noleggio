# HUB → NOLEGGIO SSO Preview

Questa preview aggiunge un handoff firmato e temporaneo da ECCOMI HUB a ECCOMI NOLEGGIO.

## Sicurezza

- Nessuna password passa nel browser.
- HUB emette un token HMAC-SHA256 con validità massima 90 secondi.
- NOLEGGIO verifica issuer, audience, scadenza e firma.
- Il token porta identità HUB, ruolo, ecosistemi e deleghe del Responsabile.
- In questa prima milestone il consumo SSO abilita il CEO; il ruolo Responsabile resta esplicitamente bloccato fino al completamento dell'enforcement delle deleghe dentro NOLEGGIO.
- Il login CEO tradizionale resta disponibile come fallback.

## Variabili Render

Configurare lo stesso valore segreto casuale e lungo su entrambi i backend:

- ECCOMI HUB: `HUB_SSO_SECRET`
- ECCOMI NOLEGGIO: `HUB_SSO_SECRET`

Su HUB configurare inoltre:

- `NOLEGGIO_SSO_BASE_URL` con l'URL della preview NOLEGGIO durante il collaudo.

Non committare mai il valore del segreto.

## Test CEO

1. Accedere alla Preview HUB con OTP come CEO.
2. Aprire Eccomi Noleggio tramite `Apri servizio` o `Apri area operativa`.
3. Verificare che non compaia il form email/password di NOLEGGIO.
4. Verificare ingresso diretto in `/ceo`.
5. Verificare che il login autonomo NOLEGGIO continui a funzionare come fallback.
