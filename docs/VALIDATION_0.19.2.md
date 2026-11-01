# Validation of Namoz 0.19.2 for F-Droid

Measured on 1 November 2026. Package `app.namoz.prayer.fdroid`, version `0.19.2`,
version code `29`, display name **Namoz — намаз и умра**.

## Completed checks

- Fresh `npm ci --ignore-scripts` from the lockfile.
- `npm test`: **144 tests passed in 13 files**, including My Umrah content,
  progress migration, manual counters/undo, location consent/errors, reminder
  permission/cancellation handling and notification links. Existing F-Droid
  cloud-push exclusion tests also pass.
- TypeScript check and production Vite build succeeded; Capacitor Android sync
  includes only App, Haptics, LocalNotifications, Network and Preferences.
- OpenJDK 21.0.12.1, Node 24.22.1, Gradle 8.14.3, Android SDK 36.
- `./gradlew --no-daemon assembleRelease testDebugUnitTest` succeeded.
  **17 JVM tests passed**, no failures/errors/skips. The initial new worktree
  build executed these tests; subsequent builds reused unchanged JVM test tasks.
- APK manifest: correct package/version/code/name, min SDK 24, target SDK 36;
  SCHEDULE_EXACT_ALARM is present, USE_EXACT_ALARM is absent.
- Release runtime dependency report and APK DEX namespace scan found no
  Firebase or Google Play Services libraries/classes. The old Android Auto
  metadata key is not a Play Services dependency.
- All **16 bundled web files** match the final `dist/` files byte-for-byte.
- In a working browser preview: Uzbek initial guide, Russian preview notice,
  six stages, explicit reminder scheduling/cancellation, stage progression,
  manual tawaf counter (0 → 2 → undo to 1), and persistence of stage/count after
  reload were checked. The final name appears in the title, navigation and footer.
  This does not test native device notification delivery.
- Vite was updated to 8.3.5 and Zod to 4.6.7 to address the reported high-severity
  advisories. `npm audit --omit=dev` reports **zero vulnerabilities**. Six moderate
  development-tool findings remain in Capacitor CLI's glob/rimraf/minimatch and
  Xcode/uuid dependency chains; an automatic major downgrade was not applied.
- The npm license inventory was refreshed. Gradle wrapper/distribution checksum
  pins from the security correction were retained.

Local unsigned APK: 5,122,213 bytes.
SHA-256: `8fe79f64ae01ba784039db34f195481c5595d75381fbefaa50777da576dd72d1`.
This hash identifies this local build; reproducible output across build hosts
has not been established.

## Outstanding review

F-Droid's scanner, infrastructure build, anti-feature decisions and inclusion
review have not completed. An open packaging request is not store publication.
No signed F-Droid download is claimed. The independent scholarly/translation
review and physical-device GPS/sensor/notification tests remain outstanding.
The mode retains its introductory/draft disclosures. No automatic miqat
crossing detection or automatic ritual counting is implemented or claimed.

Build tooling emits existing flatDir/deprecation and bundle-size warnings.
These did not prevent the successful build. The separate production website
and the previously prepared Uptodown APK were not changed.
