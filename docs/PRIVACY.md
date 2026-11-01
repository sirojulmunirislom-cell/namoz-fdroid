# Namoz F-Droid privacy information

This client has no advertising or purchase SDK and no Firebase/Google Play Services
SDK. Optional account features still communicate with the Namoz server, whose
authentication provider is Firebase. You can use prayer calculations, Qibla and
bundled reading without creating an account.

## Location and maps

Location permission is requested when you choose to locate yourself. You can
choose a city manually instead. Prayer settings and coordinates are stored on
your device. Nearby-mosque searches send coordinates to the Namoz API; reverse
geocoding sends rounded coordinates to Nominatim/OpenStreetMap. City search uses
Open-Meteo Geocoding/GeoNames. Map tile requests go to OpenStreetMap. Network
providers can see the connecting IP address and request details.

An optional mosque-exit reminder uses a foreground location service while a trip
is active, with a system notification. It can be stopped. External directions
open a map provider and can pass the selected destination and route origin.
Weather uses the configured API/provider and location necessary for a forecast.

## Content, accounts and diagnostics

Opening the app can fetch updated public content from the Namoz API. Optional
sign-in and sync send the supplied account details and preferences to that API.
The in-app account screen supports deletion. Network requests use HTTPS.

Usage statistics are disabled by default. If you enable them, the app sends
section/locale and a daily session identifier to the Namoz API. Optional audience
statistics have a separate setting; no advertising SDK is present. You can turn
statistics off in Settings. Notifications are scheduled locally in this edition;
no cloud push token is registered.

## Local storage and control

Preferences, bundled/cached reading, notification history and prayer settings are
kept locally. Removing application data clears this device's local state, but does
not delete an existing server account. App permissions can be revoked through
Android Settings. See the source code for the actual fields and endpoints.

## My Umrah (0.19.2)

The six-stage progress, manual counters and user-entered preparation reminder
are stored only on this device. They are not synced or emitted as analytics.
A mode-specific location request is explicit and one-time; its coordinates
are neither saved in progress nor sent to the Namoz API. External miqat map
search links contain only the selected place name. GPS and network status
are separate. No route tracking or automatic boundary warning is provided.

An Android preparation reminder requests notification and exact-alarm access
only when enabled. It is scheduled locally without a server or cloud-push
token. Removing local app data removes the saved guide state. The guide is
bundled offline; opening source pages or external maps uses their services.
