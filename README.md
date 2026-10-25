# Namoz F-Droid edition

Namoz helps you find nearby mosques, calculate prayer times, find the Qibla,
read daily adhkar and keep local prayer and Islamic-event reminders.
Uzbek Latin, Uzbek Cyrillic, Russian and English are included.

This is the first-party open-source Android edition maintained by Sirojul.munir.
It is free to use, with no advertising or in-app purchases.

## Differences from the other Android release

- Android LocationManager provides GPS/network location without Google Play services.
- No Firebase Messaging or Google Play services libraries are included.
- Local prayer, congregation and event notifications remain available. New-content
  cloud push is unavailable; content is refreshed when the app opens.
- No administrative editor, server code, credentials, databases or signing keys
  are distributed in this repository.
- The package is `app.namoz.prayer.fdroid`, labelled **Namoz F-Droid**, so it can
  coexist with `app.namoz.prayer`. Settings are stored separately.

## Build from source

Use Node.js 24+, npm, OpenJDK 21, Android SDK platform 36, and Gradle 8.14.3.
Set `ANDROID_HOME` and `JAVA_HOME` for your installation.

```sh
npm ci --ignore-scripts
npm test
npm run native:sync
cd android
./gradlew --no-daemon assembleRelease testDebugUnitTest
```

The output is `android/app/build/outputs/apk/release/app-release-unsigned.apk`.
No private credentials or external account are needed to compile it.
Release signing is performed by the distributor; this repository does not carry a key.
F-Droid acceptance and publication are separate from a successful local build.

The wrapper pins the official SHA-256 of the Gradle 8.14.3 complete distribution.
The official `gradle-wrapper.jar` is included and its checksum was checked against
https://gradle.org/release-checksums/ . See `docs/GRADLE_INTEGRITY.md`.

`npm run dev` starts a local browser preview. Native location, widgets, compass,
and notification behavior should be tested on Android. A browser preview does not
verify physical-device GPS, sensors or notification delivery.

## Network services

The default API is `https://namoz.namoz-prayer-bcaf08.workers.dev`.
It serves reviewed content and nearby-place results and provides optional account
sync. Account authentication currently uses Firebase on the server. This repository
contains the Android client, not the server. Set `VITE_API_URL` at build time to use
a compatible endpoint. See [privacy information](docs/PRIVACY.md).

Nearby results use OpenStreetMap/Open Data and a limited Wikidata fallback.
Coverage varies by location; an empty result does not prove there is no mosque.
Prayer times depend on the selected calculation settings. Navigation can open an
external map service. Core prayer calculations and bundled reading work offline.

## Store languages

F-Droid listing materials are available in [English](fastlane/metadata/android/en-US),
[Russian](fastlane/metadata/android/ru-RU), and
[Uzbek (Latin)](fastlane/metadata/android/uz).
The Uzbek listing includes two 2160×4320 screenshots and a 1024×500 promo banner,
highlighting nearby mosque search in London. The `uz` locale is the general Uzbek
fallback; both Uzbek scripts remain available inside the app.
See [store metadata notes](docs/STORE_METADATA.md) for asset provenance.

## License

Original Namoz code and project-authored text and artwork in this repository are
licensed under **GPL-3.0-only**. See [LICENSE](LICENSE).
Third-party components retain their own licenses. Historical religious source
references are preserved; the license does not assert ownership of those originals.
See [third-party notices](THIRD_PARTY_NOTICES.md).

## Reporting problems

Use this repository's issue tracker. Do not post passwords, account tokens,
private coordinates, or signing keys in an issue.
