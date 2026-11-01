# My Umrah in Namoz 0.19.2 for F-Droid

This release ports the existing 0.19.2 My Umrah feature to the separate
`app.namoz.prayer.fdroid` Android edition. Its display name is
**Namoz — намаз и умра**, version **0.19.2**, version code **29**.
The owner authorized public F-Droid source submission on 1 November 2026.

Six stages cover miqat/ihram, talbiyah, tawaf, after-tawaf actions, sa'i and
completion. Preparation remains a reference panel. There are three starting
contexts, manual counters with undo, device-local saved progress, a directory
of five external miqats, nine Arabic cards with source links, and four languages.
Existing religious text and translations were transferred without edits.

The first-entry preview notice and source-review limitations remain visible.
Translations are drafts; independent scholarly and language approval is not
claimed. This is a reference aid, not an individual ruling or a replacement for
a knowledgeable guide. Tapping a checkmark does not establish ritual validity.
The source ledgers preserve the actual historical source-check dates:
[content ledger](umrah-source-review.md), [miqat ledger](umrah-miqat-review.md).
Source submission does not claim those outstanding reviews have happened.

Progress, counters, reminder and mode-specific location stay on this device.
The mode emits no usage analytics even if general analytics is enabled.
Position is requested only on an explicit action and uses the existing F-Droid
Android LocationManager bridge. It provides a timestamp/accuracy snapshot,
not miqat-boundary detection. No Firebase or Play Services plugin is added.

Preparation reminders use the user's own time estimate and lead time. Android
uses LocalNotifications with explicit notification and SCHEDULE_EXACT_ALARM
access; denied exact-alarm access never silently falls back to inexact delivery.
The reminder uses no GPS, server or internet. A tap opens the guide without
confirming a rite or clearing counters. Device shutdown, force-stop and OS
restrictions remain limitations; actual delivery requires testing on the phone.
The browser preview reminder works only while the page runs.

The Android bundle contains the guide for offline reading. This F-Droid
repository does not provide an installable/offline PWA; a desktop browser
preview is only a UI test and needs its local server. External source links
require a network connection. Existing unrelated app features keep their own
network and consent behavior, described in PRIVACY.md.

See VALIDATION_0.19.2.md for this edition's measured verification results.
No public store download or F-Droid acceptance is implied by a local build.
