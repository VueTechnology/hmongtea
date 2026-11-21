# hmongtea.com CRM

Shop orders, partner accounts, and update mail for hmongtea.com.

## Dev

Copy `.env.example` to `.env` and fill the placeholders. Do not commit `.env`.

```bash
bun run dev-up      # start db, app and mailpit
bun run dev-test    # start the stack, run the tests, stop the stack
bun run dev-down    # stop the stack
```

The app listens on port 3299, Postgres on 3298, Mailpit on 8025. `bun run seed:sample` (inside the app container) loads dev sample data.

## Prod

`compose.prod.yaml` runs only `db` and `app` (no Mailpit), each with a restart policy and a healthcheck.

```bash
bun run prod-build   # build the prod image
bun run prod-deploy  # start the prod stack
```

Set `APP_ORIGIN` (the public origin) and `APP_PORT` (the published port) in the environment.

## Tests

`bun test` reads `DATABASE_URL` and uses that Postgres server. The suite creates a database named `hmongtea_test`. Run it inside the app container where the database is reachable.

## Mail and payment

With `RESEND_API_KEY` empty, mail is stored and listed at `/dev/mail`. With the Stripe keys empty, checkout records the order and does not call Stripe. A webhook secret is kept only when it starts with `whsec_`.
