# hmongtea.com CRM

Staff tools and customer pre-orders for hmongtea.com. KuabCha is loose-leaf green tea from the Golden Triangle foothills in Chiang Rai, Thailand.

Copy `.env.example` to `.env`. Set `STAFF_PASSWORD` to 12 or more characters. Set `TAX_ID_KEY` to 64 hex characters. Leave the Resend and Stripe keys empty for demo checkout and the dev mail page.

```
docker compose up --build
```

The app listens on port 3160. Postgres listens on port 3161.

```
bun test
```

Tests create `hmongtea_test` on that Postgres and migrate it from empty.
