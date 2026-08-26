# ECCOMI NOLEGGIO — Area Partner v1

## Obiettivo PR14

PR14 trasforma la route esistente `/partner` nella fondazione dell'Area Partner reale, senza duplicare la Dashboard CEO.

## Regola principale

La sessione CEO non autorizza l'Area Partner.

Per entrare in `/partner` serve un account con ruolo `PARTNER` o `PARTNER_ADMIN`, collegato a un `partner_id` attivo.

## Isolamento server-side

Partner e Partner Admin sono trattati allo stesso modo per il perimetro dati:

- offerte: solo `promotions.partner_id = actor.partner_id`;
- pratiche: solo `leads.partner_id = actor.partner_id`;
- documenti: accessibili solo se la pratica appartiene allo stesso Partner;
- PDF quotazioni e copertine: accessibili solo se l'offerta appartiene allo stesso Partner;
- commissioni: solo `commissions.partner_id = actor.partner_id`;
- azioni pratica: Partner e Partner Admin rispettano gli stessi limiti di workflow.

L'apertura diretta di un URL fuori perimetro deve produrre `403`.

## Partner Admin

`PARTNER_ADMIN` opera sempre nella propria società. In PR14 può vedere l'elenco dei collaboratori della società; la creazione/disattivazione operativa degli utenti verrà collegata nel flusso dedicato successivo.

## Dashboard Partner

La shell v1 contiene:

- Panoramica;
- Offerte;
- Pratiche;
- Commissioni;
- Collaboratori (solo Partner Admin).

Le pratiche possono essere aperte con i dati e i documenti già esistenti, sempre filtrati server-side.

## Cosa NON fa PR14

PR14 non introduce ancora tutti i comandi operativi sulle offerte e sugli utenti. In particolare la gestione completa di quotazioni, sospensione/archiviazione/riattivazione, utenti Partner e commissioni verrà collegata nei PR successivi usando i permessi definiti in PR13.

## Sicurezza sviluppo

Base produzione: `a85af7b48ea8877dc15e9df33c84cf71c24b5a25`.

Backup: `backup/2026-08-26-pre-pr14-partner-area`.

Feature branch: `feature/pr14-partner-area`.

Preview server-safe: `/pr14-partner-area-demo`.
