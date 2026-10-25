# Gradle wrapper integrity — 2026-10-25

The RFP bot reported `missing distributionSha256Sum` for
`v0.18.1-fdroid.1` in https://gitlab.com/fdroid/rfp/-/work_items/4613#note_4053727955.

The wrapper now pins the complete Gradle 8.14.3 ZIP:

- Distribution: `https://services.gradle.org/distributions/gradle-8.14.3-all.zip`
- SHA-256: `ed1a8d686605fd7c23bdf62c7fc7add1c5b23b2bbc3721e661934ef4a4911d7c`
- Official checksum: https://services.gradle.org/distributions/gradle-8.14.3-all.zip.sha256

The previously missing wrapper JAR is also included. Its SHA-256 is
`7d3a4ac4de1c32b59bc6a4eb8ecb8e612ccd0cf1ae1e99f66902da64df296172`, matching the
official Gradle 8.14.3 wrapper entry at https://gradle.org/release-checksums/.
The wrapper is third-party Gradle code under Apache-2.0, not relicensed project code.

Application source, application ID, version 0.18.1-fdroid.1 (27), runtime dependencies,
signing identity and service configuration are unchanged. No account or learner data
is part of this update. Use `v0.18.1-fdroid.1-security.1` for the packaging review.
The old report refers to an older tag; only F-Droid maintainers can rerun their check
and remove the historical label. This update is not a claim of F-Droid acceptance.
