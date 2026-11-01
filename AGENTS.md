# Namoz F-Droid edition

- This is the public GPL-3.0-only client edition. Keep package
  `app.namoz.prayer.fdroid`, separate from the other Namoz edition.
- The owner authorized the 1 November 2026 My Umrah port, the name
  `Namoz — намаз и умра`, source publication and update of existing RFP #4613.
- Do not import administrative/server code, Firebase/Play Services mobile SDKs,
  signing keys, secrets, sessions, private owner contacts or working databases.
- Read `docs/my-umrah.md`, its two source ledgers and `docs/FDROID_REVIEW.md`.
  Preserve the source texts and explicit draft/preview labels. Source review is
  not independent scholarly approval. Do not invent boundary detection, automatic
  counters or guaranteed reminder delivery. Progress and My Umrah analytics remain
  device-local. Exact-alarm access must be explicit; no silent inexact fallback.
- Use Node 24+, `npm ci --ignore-scripts`, `npm test`, `npm run native:sync`,
  OpenJDK 21 and the checked-in Gradle wrapper. Run relevant tests after changes.
- Source publication and an open RFP do not mean acceptance or a signed F-Droid
  download. Report only observed outcomes.
- Follow the owner's versioned Personal islam backup policy and local registry;
  preserve earlier archives and verify readback before updating the pointer.
