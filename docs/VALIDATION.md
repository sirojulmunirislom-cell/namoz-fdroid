# Validation — 2026-10-21

- TypeScript check and production Vite build: passed.
- Client unit tests: 38 passed, 0 failed.
- Android unit tests: 17 passed, 0 failed.
- Gradle release build: passed with OpenJDK 21 / Gradle 8.14.3.
- Release runtime dependency tree: no `com.google.android.gms` or Firebase artifacts.
- APK DEX namespace check: no `Lcom/google/android/gms/` or `Lcom/google/firebase/`.
- Packaged Capacitor plugins: App, Haptics, Local Notifications, Network, Preferences.
- GPL license and dependency notices included in APK assets.
- Existing bundled religious content is byte-for-byte unchanged.
- 14 store screenshots verified at 2160×3840: seven English, seven Russian.
- Browser smoke check: London selection, prayer calculation, seven nearby mosque
  results, labelled Wikidata fallback and OSM map rendered successfully. The browser
  preview uses the Vite development proxy; the APK uses Capacitor HTTP.

Unsigned APK: `app.namoz.prayer.fdroid`, version `0.18.1-fdroid.1`, code `27`.
Size: 5,072,473 bytes.
SHA-256: `1333691a8aa142106f709e84c756bbffd2f222b35d782755fab477543d25c151`.

The APK is a build result for packaging review, not an installable signed release.
No claim of F-Droid acceptance, reproducible-build verification or official
F-Droid scanner/CI success is made. Physical Android GPS, compass, Auto and actual
notification delivery remain unverified for this edition.
