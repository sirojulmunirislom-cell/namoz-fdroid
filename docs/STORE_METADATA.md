# Store metadata

The Fastlane tree follows the [F-Droid metadata format](https://f-droid.org/docs/All_About_Descriptions_Graphics_and_Screenshots/).
Text and graphics become available in the catalogue only after F-Droid accepts,
builds and indexes the application from a source revision containing them.

| Locale | Listing language | Phone screenshots | Feature graphic |
| --- | --- | --- | --- |
| en-US | English | 7 at 2160×3840 | — |
| ru-RU | Russian | 7 at 2160×3840 | — |
| uz | Uzbek, Latin script | 2 at 2160×4320 | 1024×500 |

`uz` provides a general Uzbek fallback. The application itself separately offers
Uzbek Latin and Cyrillic, Russian and English. This metadata update does not change
the application's interface, binary, package ID or version code.

## Uzbek artwork

The two promotional screenshots and feature graphic reuse the owner's existing
high-resolution Uzbek Namoz campaign. Its original captures were lossless PNGs
at 1524×3132, captured from the Namoz 0.18.1 browser interface in London. The
2160×4320 compositions were rendered from vector layouts with those captures,
not enlarged from the smaller export. The actual UI and mosque results were not
invented or translated inside an image. The F-Droid edition shares these screens.

The first image shows nearby mosque search and the map; the second shows distance
and the external-directions action. OpenStreetMap attribution and the limited
Wikidata fallback notice are preserved. The feature graphic includes the map
attribution and the incomplete-coverage notice. These images demonstrate the UI;
they do not imply a fresh live search or a complete list of local mosques.

This source revision adds Uzbek listing text, an icon, the two existing HD images
and a 1024×500 feature graphic. The original campaign's source layouts and captures
remain in the owner's versioned project backup.
