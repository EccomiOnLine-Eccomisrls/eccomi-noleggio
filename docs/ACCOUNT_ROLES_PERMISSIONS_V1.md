# ECCOMI NOLEGGIO — Account, Ruoli e Permessi v1

## Principio

Persona, account, ruolo e organizzazione sono concetti distinti.

- Una persona può avere più incarichi solo tramite account/email separati.
- Un account ha un solo ruolo operativo nel verticale.
- Un account Partner appartiene a una sola organizzazione Partner tramite `partner_id`.
- I dati operativi appartengono a ECCOMI NOLEGGIO o all'organizzazione Partner, mai alla persona che ricopre temporaneamente un ruolo.
- I permessi hanno default di ruolo ma possono essere modificati tramite override ON/OFF, nei limiti di sicurezza definiti dal sistema.

## Ruoli

### CEO

Governance completa. Vede tutto, può intervenire ovunque, assegna ruoli e governa i permessi.

### NOLEGGIO_MANAGER

Responsabile ECCOMI NOLEGGIO. Vede tutto il verticale, verifica quotazioni, governa pratiche, può riassegnare pratiche rosse e può attivare/disattivare Partner. Può gestire soltanto i permessi ordinari degli Operatori; non può modificare i propri permessi né quelli sensibili.

### NOLEGGIO_DEPUTY

Vice Responsabile. Parte con un set base limitato e il CEO può aggiungere i permessi operativi necessari.

### NOLEGGIO_OPERATOR

Operatore interno ECCOMI NOLEGGIO. Vede tutte le pratiche del verticale ma agisce soltanto sulle funzioni abilitate dal proprio profilo.

### PARTNER_ADMIN

Amministratore della singola società Partner. Può creare/disattivare i collaboratori della propria società e opera sempre dentro il solo perimetro del proprio `partner_id`.

### PARTNER

Account collegato a una organizzazione Partner. Vede soltanto il proprio perimetro. Può inserire quotazioni, lavorare le proprie pratiche e gestire la vita operativa delle proprie offerte. Non può approvare una quotazione.

## Caso Robin

Robin Responsabile e Robin Partner sono due account diversi.

- account ECCOMI → `NOLEGGIO_MANAGER`
- account Partner → `PARTNER` + `partner_id`

Non esiste un comando “cambia ruolo”. Se domani Arcibaldo diventa Responsabile, il ruolo interno viene assegnato al nuovo account; Robin può restare Partner senza perdere offerte, pratiche o storico.

## Decisioni approvate — 26 agosto 2026

1. Attivazione/disattivazione Partner: CEO + Responsabile ECCOMI NOLEGGIO.
2. Ogni società Partner può avere un `PARTNER_ADMIN` che crea/disattiva i collaboratori della propria società.
3. Per ora l'importo della commissione può essere impostato o corretto solo dal CEO.
4. Una propria offerta sospesa può essere riattivata dal Partner se le condizioni non sono cambiate.
5. Una offerta archiviata può essere ripristinata solo da ECCOMI, mai direttamente dal Partner.
6. Il Partner può sostituire/rimuovere un documento caricato per errore, lasciando sempre traccia nell'audit.
7. Il Responsabile propone la creazione/disattivazione di un Operatore ECCOMI; il CEO approva.
8. Il Vice Responsabile parte con permessi base limitati; il CEO aggiunge quelli necessari.
9. L'Operatore ECCOMI vede tutte le pratiche del verticale e agisce secondo i propri permessi.
10. Il CEO governa i permessi; il Responsabile può gestire solo i permessi ordinari degli Operatori, mai i propri e mai quelli sensibili.

## Quotazioni e offerte

Flusso v1:

`Bozza Partner → Verifica ECCOMI → Approvata/Pubblicata`

Dopo la pubblicazione il Partner proprietario può:

- sospendere la propria offerta;
- archiviarla;
- riattivarla direttamente dopo una sospensione se le condizioni sono rimaste invariate;
- prorogare la validità quando le condizioni restano invariate.

Se cambia canone, anticipo, durata, km o altre condizioni economiche sostanziali, la quotazione torna sotto verifica ECCOMI.

Il ripristino di una offerta archiviata è riservato a ECCOMI.

## Lead e pratiche

Un lead proveniente da una offerta del Partner X nasce con Partner origine X.

Il Partner X lo lavora normalmente. Se la pratica diventa rossa/critica, CEO o Responsabile ECCOMI NOLEGGIO possono intervenire e riassegnarla. Il CEO può inoltre delegare questa capacità a ruoli interni quando necessario.

Il Partner vede soltanto le proprie pratiche. ECCOMI vede tutte le pratiche.

## Documenti

Il Partner può vedere, sostituire e rimuovere i documenti delle proprie pratiche secondo il workflow operativo. Le correzioni devono lasciare audit; la rimozione logica dal flusso non equivale alla cancellazione silenziosa della traccia storica.

## Commissioni

La commissione matura alla consegna del veicolo.

Per la v1 l'importo può essere impostato o corretto soltanto dal CEO. Partner e Partner Admin vedono soltanto le commissioni della propria società.

## Permessi e override

I default di ruolo non sono una gabbia. La tabella `user_permission_grants` viene usata come tabella di override:

- `enabled = true` abilita esplicitamente un permesso;
- `enabled = false` disabilita esplicitamente anche un permesso normalmente presente nel ruolo base;
- ogni modifica mantiene chi l'ha concessa/revocata e i timestamp.

Il CEO può gestire i permessi operativi interni previsti dalla policy. Il Responsabile può gestire soltanto la lista di permessi ordinari degli Operatori.

Permessi sensibili v1:

- `QUOTE_APPROVE`
- `QUOTE_PUBLISH`

Permessi che restano CEO-only nella policy corrente includono la governance completa degli account/ruoli, l'approvazione definitiva degli Operatori e `COMMISSION_EDIT_ANY`.

## Barriere di sistema

Queste regole non sono semplici toggle:

- Partner e Partner Admin non possono accedere ai dati di altre società Partner.
- Partner e Partner Admin non possono approvare quotazioni.
- L'audit non viene cancellato da una normale correzione operativa.
- Gli account ECCOMI e Partner restano identità operative separate.

## HUB

HUB è la regia di governance. Può assegnare i ruoli di vertice e consegnare a ECCOMI NOLEGGIO una identità firmata via SSO.

ECCOMI NOLEGGIO non accetta permessi arbitrari dal token HUB: applica sempre la propria matrice ruoli/override locale. In questo modo HUB supervisiona senza duplicare il gestionale operativo.

## Migrazione

`drizzle/0002_roles_permissions_v1.sql` crea solo la tabella additiva `user_permission_grants`.

La migrazione non deve essere applicata al database di produzione prima dell'approvazione esplicita di merge/deploy PR13.
