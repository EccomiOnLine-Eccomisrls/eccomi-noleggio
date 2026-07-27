# Migrazione ECCOMI NOLEGGIO — Render + Supabase

## Stato verificato

Il progetto è Node.js/TypeScript con Next.js 16, React 19, Vinext, Drizzle ORM, Cloudflare D1 e R2.
Le funzionalità applicative da conservare includono dashboard, promozioni NLT, parsing AI, immagini, partner, lead, commissioni, pubblicazione Shopify e riepilogo KPI per ECCOMI HUB.

## Blocchi da sostituire

1. `drizzle-orm/d1` e schema SQLite → PostgreSQL Supabase.
2. binding `BUCKET` R2 → Supabase Storage.
3. binding `ASSETS` Cloudflare → file statici Next.js/Render.
4. header di autenticazione ChatGPT Sites → token/sessione proveniente da ECCOMI HUB.
5. Vinext/Wrangler e script Sites → build standard Next.js per Render.

## Destinazione

- GitHub: repository ufficiale e versionamento.
- Render: Web Service Node.js.
- Supabase: PostgreSQL, Storage e autenticazione/ruoli se necessario.
- Shopify: prodotti, vetrina e lead.
- ECCOMI HUB: regia, accesso e KPI aggregati.

## Sequenza tecnica

1. Conservare lo snapshot originale su `main`.
2. Creare branch `migration/render-supabase`.
3. Convertire `db/schema.ts` da `sqlite-core` a `pg-core`.
4. Collegare Drizzle a `DATABASE_URL` Supabase con driver PostgreSQL.
5. Implementare adapter Supabase Storage mantenendo le operazioni `put/get/delete`.
6. Rimuovere `@cloudflare/vite-plugin`, `wrangler`, Vinext e script Sites.
7. Impostare `next build` e `next start -p $PORT`.
8. Sostituire l'identità ChatGPT Sites con verifica server-to-server HUB.
9. Eseguire migrazioni SQL su Supabase.
10. Configurare variabili ambiente Render e testare build, API, upload, Shopify e HUB.

## Variabili previste

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `CEO_EMAIL`
- `SHOPIFY_SHOP_DOMAIN`
- `SHOPIFY_ADMIN_ACCESS_TOKEN`
- `SHOPIFY_ONLINE_STORE_PUBLICATION_ID`
- `SHOPIFY_CREDENTIALS_ENCRYPTION_KEY`
- `SHOPIFY_PUBLISHING_ENABLED`
- `SHOPIFY_API_VERSION`
- `SHOPIFY_NOLEGGIO_TEMPLATE_SUFFIX`
- `SHOPIFY_NOLEGGIO_COLLECTION_HANDLE`
- `PUBLIC_REQUEST_BASE_URL`
- `PUBLIC_SHOWROOM_BASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_TEXT_MODEL`
- `OPENAI_IMAGE_MODEL`
- `CRON_SECRET`
- `HUB_READ_SECRET`
- `HUB_AUTH_SECRET`

## Nota di sicurezza

Nessuna chiave reale deve essere inserita nel repository. Le chiavi vanno configurate esclusivamente negli Environment Variables di Render e nei servizi collegati.
