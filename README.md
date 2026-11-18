# hmongtea.com CRM

Shop orders, partner accounts, and update mail for hmongtea.com.

## Run

Copy `.env.example` and fill the placeholders in your shell. Do not commit that file.

```bash
docker compose up --build
```

The app listens on port 3299. Postgres 18 listens on port 3298.

## Tests

`bun test` reads `DATABASE_URL` and uses that Postgres server. The suite creates a database named `hmongtea_test`.

## Mail and payment

With `RESEND_API_KEY` empty, mail is stored and listed at `/dev/mail`. With the Stripe keys empty, checkout records the order and does not call Stripe. A webhook secret is kept only when it starts with `whsec_`.
