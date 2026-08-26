# ECCOMI NOLEGGIO — Account, Ruoli e Permessi v1

## Principio

Persona, account, ruolo e organizzazione sono concetti distinti.

- Una persona può avere più incarichi solo tramite account/email separati.
- Un account ha un solo ruolo operativo nel verticale.
- Un account Partner appartiene a una sola organizzazione Partner tramite `partner_id`.
- I dati operativi appartengono a ECCOMI NOLEGGIO o all'organizzazione Partner, mai alla persona che ricopre temporaneamente un ruolo.

## Ruoli

### CEO

Governance completa. Vede tutto, può intervenire ovunque, assegna ruoli e grants sensibili.

### NOLEGGIO_MANAGER

Responsabile ECCOMI NOLEGGIO. Vede tutto il verticale, verifica quotazioni, governa pratiche e può riassegnare pratiche rosse. Approvazione/pubblicazione sono abilitate solo se il CEO concede i relativi permessi.

### NOLEGGIO_DEPUTY

Vice Responsabile. Stesso modello di sicurezza del Responsabile; le capacità sensibili restano delegabili dal CEO.

### NOLEGGIO_OPERATOR

Operatore interno ECCOMI NOLEGGIO. Può vedere e lavorare il verticale secondo la matrice base e i grants concessi.

### PARTNER

Account collegato a una organizzazione Partner. Vede soltanto il proprio perimetro. Può inserire quotazioni, lavorare le proprie pratiche e gestire la vita operativa delle proprie offerte. Non può approvare una quotazione.

## Caso Robin

Robin Responsabile e Robin Partner sono due account diversi.

- account ECCOMI → `NOLEGGIO_MANAGER`
- account Partner → `PARTNER` + `partner_id`

Non esiste un comando “cambia ruolo”. Se domani Arcibaldo diventa Responsabile, il ruolo interno viene assegnato al nuovo account; Robin può restare Partner senza perdere offerte, pratiche o storico.

## Quotazioni

Flusso v1:

`Bozza Partner → Verifica ECCOMI → Approvata/Pubblicata`

Dopo la pubblicazione il Partner proprietario può:

- sospendere la propria offerta;
- archiviarla;
- prorogare la validità quando le condizioni restano invariate.

Se cambia canone, anticipo, durata, km o altre condizioni economiche sostanziali, la quotazione deve tornare sotto verifica ECCOMI.

## Lead e pratiche

Un lead proveniente da una offerta del Partner X nasce con Partner origine X.

Il Partner X lo lavora normalmente. Se la pratica diventa rossa/critica, CEO o Responsabile ECCOMI NOLEGGIO possono intervenire e riassegnarla.

Il Partner vede soltanto le proprie pratiche. ECCOMI vede tutte le pratiche.

## Commissioni

La commissione matura alla consegna del veicolo.

## HUB

HUB è la regia di governance. Può assegnare i ruoli di vertice e consegnare a ECCOMI NOLEGGIO una identità firmata via SSO.

ECCOMI NOLEGGIO non accetta permessi arbitrari dal token HUB: applica sempre la propria matrice ruoli/grants locale. In questo modo HUB supervisiona senza duplicare il gestionale operativo.

## Grants sensibili v1

I permessi sensibili predisposti per delega CEO sono:

- `QUOTE_APPROVE`
- `QUOTE_PUBLISH`

Sono registrati nella tabella `user_permission_grants`, con utente, permesso, stato, chi ha concesso la delega e timestamp.

## Migrazione

`drizzle/0002_roles_permissions_v1.sql` crea solo la tabella additiva `user_permission_grants`.

La migrazione non deve essere applicata al database di produzione prima dell'approvazione della preview PR13.
