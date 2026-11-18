# Judge

Scores for desktop 6, then 7, then 8.

Retail flow 5/5/5. Wholesale flow 5/5/3. Staff tools 5/5/5. Security 4/5/4. Version pins 5/5/5. Docker 4/5/4. Code quality 4/4/3. Mobile 3/3/3. Facts 4/4/2. Match to the front end 2/2/1.

Desktop 7 is the base: Postgres tests, a real argon2id hash, staff secrets from the environment, and a bun entrypoint.

From desktop 6, the session, CSRF, and cart cookies use the __Host- prefix. From desktop 8, staff order search matches the order id as text. No cross-judge ran.

None of the three matched the judged shop. Colors, Fraunces, Figtree, the logo, the gallery, 4.4 oz (125 g), the 5 to 7 business day ship window, and the $30 subscription come from the shop. One pack stays $32. Wholesale stays $24, $22, and $20 at 12, 24, and 48 packs.

What worked. 22 tests and 180 expects passed. Docker served port 3190. The walk covered sign-up, pre-order, address edit, cancel, tracking, a logged blast, a CSV with no tax id, a wholesale hold, 12 packs at $24, and a retail block on wholesale and staff. 47 pages saved at 1440 and 390. The brand grep returned nothing. Stack stopped.

What did not. Desktop 8 used 50 g at $18, 100 g at $32, and a minimum of 6. Desktops 6 and 7 kept the Dwell type and colors. No live Stripe or carrier call.

What was redone. Cookie names, the shop frame, product facts, order id search, and the port.
