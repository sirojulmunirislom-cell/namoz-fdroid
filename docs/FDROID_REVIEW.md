# F-Droid packaging notes

First-party open-source edition: Namoz F-Droid, `app.namoz.prayer.fdroid`.
Version `0.18.1-fdroid.1`, version code `27`, GPL-3.0-only.
This distribution uses a separate application ID and can coexist with the
non-F-Droid release. It has no existing public signing key to preserve;
F-Droid may sign its build. The local release output is unsigned.

## Build inputs

- Node.js 24+, npm (`legacy-peer-deps=true` is pinned in `.npmrc`).
- OpenJDK 21, Android SDK platform 36, Gradle 8.14.3.
- `npm ci --ignore-scripts`, `npm run native:sync`, then in `android/`:
  `gradle --no-daemon :app:assembleRelease`.
- Capacitor sync generates the Cordova compatibility project and plugin files.
- Gradle wrapper properties record the version; no prebuilt wrapper JAR is committed.
- No APK, AAR, native library, signing key or provider secret is checked in.
- Build the bundled web assets from TypeScript with the pinned npm lockfile.
- F-Droid server tooling/CI has not yet run; the packager should review any npm
  toolchain preparation and native npm tooling using the normal F-Droid policy.
  Do not ignore arbitrary scanner findings to make a build pass.

## Removed proprietary dependencies

The Firebase cloud-push plugin and the Capacitor geolocation plugin that pulled
in Google Play services are absent from both npm and Gradle runtime dependencies.
Android uses its own `LocationManager` through `NamozLocationPlugin`.
Local notification, widget, compass and optional foreground mosque-trip code is
included. The old Android Auto metadata name is an Android integration descriptor,
not a dependency on Google Play services; the AndroidX Car library is Apache-2.0.

## Network/anti-feature disclosure

Please assess `NonFreeNet` and `TetheredNet`: public content updates and mosque
lookup use the Namoz API; optional account authentication uses Firebase on that
server. The backend is not included in this client repository. A compatible API
URL can be selected at build time, but there is no in-app server setting.
External navigation currently opens Google Maps links; map tiles are OSM.
Core prayer calculations, Qibla bearing and bundled reading work offline.

Usage statistics are explicitly opt-in and disabled by default. No proprietary
tracking/advertising SDK is bundled. See `docs/PRIVACY.md` for transmitted data.

## Project age and review limitations

This public edition was prepared on 2026-10-21 from the owner's existing Namoz
application. The locally available source history starts on 2026-10-06. We do not
claim three months of public development or a verified user count. Please advise
whether inclusion should wait for the project-age criterion or what evidence is
needed for an exception. This is a request for packaging review, not a claim that
all inclusion criteria or official F-Droid build checks have passed.

Tests cover prayer calculations, location permission/error handling, mosque
parsing, calendar logic, local notification setup and native location/trip logic.
Physical Android GPS, compass, Android Auto and notification delivery have not
been re-tested on a physical device for this edition.

English/Russian Fastlane descriptions and seven 2160×3840 screenshots per language
are included. Nearby mosques in London lead the screenshot sequence. All content
references and translations are preserved from the original client.
