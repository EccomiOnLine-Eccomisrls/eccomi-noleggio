# ECCOMI NOLEGGIO — Area Partner v1

## Obiettivo PR14

PR14 trasforma `/partner` nella fondazione dell'Area Partner reale e aggiunge il primo onboarding Partner Admin governato dal CEO.

## Identità e accesso

La sessione CEO non autorizza l'Area Partner. Per entrare in `/partner` serve un account `PARTNER` o `PARTNER_ADMIN`, collegato a un `partner_id` attivo.

Non esiste più una password Partner condivisa come modello operativo:

- **Supabase Auth** gestisce identità, verifica del link e password personale;
- **Resend** invia le email transazionali ECCOMI;
- la tabella locale `users` resta autoritativa per ruolo, `partner_id` e stato attivo/non attivo;
- la sessione applicativa Partner resta separata da quella CEO.

## Onboarding Partner Admin

Flusso v1:

1. CEO apre `Gestione Partner → Scheda Partner → Centro Accessi`.
2. Inserisce nome e email e sceglie **Invia invito Partner Admin**.
3. Supabase Auth genera un token hash personale e monouso.
4. ECCOMI salva l'account locale come `PARTNER_ADMIN`, `active=false`, vincolato al Partner.
5. Resend invia l'email ECCOMI con un link verso `/partner/activate`.
6. Il Partner apre il link e sceglie una password di almeno 12 caratteri.
7. Il server verifica il token con Supabase Auth, imposta la password, attiva l'account locale e crea la sessione Partner.
8. Il Partner entra in `/partner` e vede solo la propria società.

Se il link scade, il CEO può reinserire la stessa email per generare un nuovo link. Gli account attivi possono essere disattivati dal Centro Accessi.

Stati esposti nel Centro Accessi: **INVITO INVIATO / ATTIVO / DISATTIVATO**. L'ultimo accesso deriva dagli eventi audit `PARTNER_LOGIN`.

## Isolamento server-side

Partner e Partner Admin hanno lo stesso perimetro dati:

- offerte: solo `promotions.partner_id = actor.partner_id`;
- pratiche: solo `leads.partner_id = actor.partner_id`;
- documenti: solo pratiche della stessa società;
- PDF quotazioni e copertine: solo offerte della stessa società;
- commissioni: solo `commissions.partner_id = actor.partner_id`;
- azioni pratica: stessi limiti di workflow Partner.

Un URL diretto fuori perimetro deve produrre `403`.

## Partner Admin

`PARTNER_ADMIN` opera sempre nella propria società. In PR14 vede l'elenco dei collaboratori. La creazione/disattivazione autonoma dei collaboratori da parte del Partner Admin resta un flusso operativo successivo; PR14 implementa invece il primo invito Partner Admin governato dal CEO.

## Dashboard Partner

La shell v1 contiene:

- Panoramica;
- Offerte;
- Pratiche;
- Commissioni;
- Collaboratori (solo Partner Admin).

Le pratiche si aprono con dati e documenti già esistenti, sempre filtrati server-side.

## Audit

Sono tracciati almeno:

- `PARTNER_ADMIN_INVITED` / `PARTNER_ADMIN_INVITE_RESENT`;
- `PARTNER_ACCOUNT_ACTIVATED` / `PARTNER_ACCOUNT_REACTIVATED`;
- `PARTNER_LOGIN`;
- `PARTNER_ACCESS_DISABLED`.

La disattivazione locale rende inutilizzabile anche una sessione Partner già presente perché ogni richiesta risolve nuovamente l'account attivo.

## Cosa NON fa ancora PR14

PR14 non collega ancora tutti i comandi sulle offerte, il CRUD autonomo dei collaboratori Partner Admin o il dettaglio fatture/pagamenti delle commissioni. Questi flussi useranno i permessi definiti in PR13.

## Sicurezza sviluppo

Base produzione: `a85af7b48ea8877dc15e9df33c84cf71c24b5a25`.

Backup: `backup/2026-08-26-pre-pr14-partner-area`.

Feature branch: `feature/pr14-partner-area`.

Preview server-safe: `/pr14-partner-area-demo`.

La preview non crea utenti reali, non invia email e non modifica il database di produzione.
