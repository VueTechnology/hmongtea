# Dependency pins

Versions are exact. `bun.lock` is the lockfile.

`nitro` is `3.0.261103-rc`. That is the current npm release as of 2026-11-17. TanStack Start 1.169.5 loads the Nitro Vite plugin from this release. Nitro 3.0.0 predates that plugin API, so the app pins the rc the Start release uses.

Mailpit is `axllent/mailpit:v1.34.0`, the stable release from 2026-11-17. The dev inbox uses that image. A real send needs a provider on the mail transport.
