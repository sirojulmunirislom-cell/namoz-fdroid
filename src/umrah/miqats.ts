import type { UmrahText } from "./types";

export interface UmrahMiqat {
  id: string;
  name: UmrahText;
  arabicName: string;
  route: UmrahText;
  note: UmrahText;
  sources: Array<{ title: UmrahText; url: string }>;
  // A voluntary external place search, never a coordinate or miqat boundary.
  mapQuery: string;
}

const t = (latin: string, cyrillic: string, russian: string, english: string): UmrahText => ({
  "uz-Latn": latin, "uz-Cyrl": cyrillic, ru: russian, en: english,
});
const saudipedia = (url: string) => ({
  title: t("Saudipedia: joy haqida", "Saudipedia: жой ҳақида", "Saudipedia: описание места", "Saudipedia: place information"),
  url,
});

// Source-checked 2026-10-27; translations remain review drafts.
// No positions, radii or route-selection rules are inferred from these records.
export const umrahMiqats: UmrahMiqat[] = [
  {
    id: "dhul-hulayfah",
    name: t("Zul-Hulayfa · Abyor Ali", "Зул-Ҳулайфа · Абёр Али", "Зуль-Хулейфа · Абьяр Али", "Dhu al-Hulayfah · Abyar Ali"),
    arabicName: "ذو الحليفة",
    route: t("Madina orqali keladigan yo‘l.", "Мадина орқали келадиган йўл.", "Маршрут через Медину.", "The route through Madinah."),
    note: t(
      "Abyor Ali nomi bilan ham tanilgan. Madina aholisi va shu yo‘ldan o‘tuvchilar uchun; boshqa yo‘lga avtomatik tatbiq etilmaydi.",
      "Абёр Али номи билан ҳам танилган. Мадина аҳолиси ва шу йўлдан ўтувчилар учун; бошқа йўлга автоматик татбиқ этилмайди.",
      "Известен также как Абьяр Али. Для жителей Медины и проходящих этим путём; другой маршрут нужно рассматривать отдельно.",
      "Also known as Abyar Ali. For Madinah residents and those passing this way; a different route needs separate consideration.",
    ),
    sources: [saudipedia("https://saudipedia.com/en/miqat-dhu-al-hulayfah")],
    mapQuery: "Dhu al Hulayfah Abyar Ali Miqat Saudi Arabia",
  },
  {
    id: "al-juhfah",
    name: t("Al-Juhfa", "Ал-Жуҳфа", "Аль-Джухфа", "Al-Juhfah"),
    arabicName: "الجحفة",
    route: t("Makkaga shimoli-g‘arbiy tomondan, shu miqot yo‘li orqali kelish.", "Маккага шимоли-ғарбий томондан, шу миқот йўли орқали келиш.", "Северо-западный подход к Мекке по соответствующему пути.", "The north-western approach to Makkah along this route."),
    note: t(
      "Robig‘ yaqinidagi alohida joy. Robig‘dan ihramga kirish ham manbalarda keltirilgan, ammo ikki nom bitta nuqta emas; haqiqiy yo‘lingizni aniqlang.",
      "Робиғ яқинидаги алоҳида жой. Робиғдан иҳромга кириш ҳам манбаларда келтирилган, аммо икки ном битта нуқта эмас; ҳақиқий йўлингизни аниқланг.",
      "Отдельное место рядом с Рабигом. Источники также описывают вступление в ихрам из Рабига; это разные места, выбор зависит от пути.",
      "A distinct place near Rabigh. Sources also describe entering ihram from Rabigh; these are different locations, and the actual route matters.",
    ),
    sources: [
      saudipedia("https://saudipedia.com/en/miqat-al-juhfah"),
      saudipedia("https://saudipedia.com/en/mawaqit-al-ihram"),
    ],
    mapQuery: "Al Juhfah Miqat Saudi Arabia",
  },
  {
    id: "qarn-al-manazil",
    name: t("Qarn al-Manozil · Sayl al-Kabir", "Қарн ал-Манозил · Сайл ал-Кабир", "Карн аль-Маназиль · Ас-Сайль аль-Кабир", "Qarn al-Manazil · As-Sayl al-Kabir"),
    arabicName: "قرن المنازل",
    route: t("Najd va Toif tomondan tegishli yo‘l orqali kelish.", "Нажд ва Тоиф томондан тегишли йўл орқали келиш.", "Со стороны Наджда и Таифа по соответствующей дороге.", "From Najd and Taif along the relevant road."),
    note: t(
      "Al-Hada yo‘lidagi Vodiy Muharram — Qarn vodiysining yuqori qismi. Uni oltinchi asosiy miqot deb hisoblamang; yo‘lga mos joyni aniqlang.",
      "Ал-Ҳада йўлидаги Водий Муҳаррам — Қарн водийсининг юқори қисми. Уни олтинчи асосий миқот деб ҳисобламанг; йўлга мос жойни аниқланг.",
      "Вади Мухаррам на дороге Аль-Хада — верхний участок долины Карн, а не шестой основной микат. Уточните место для своей дороги.",
      "Wadi Muharram on the Al-Hada road is the upper part of the Qarn valley, not a sixth principal miqat. Confirm the place for your road.",
    ),
    sources: [
      saudipedia("https://saudipedia.com/en/qarn-al-manazil"),
      saudipedia("https://saudipedia.com/en/miqat-wadi-muharram"),
    ],
    mapQuery: "Qarn al Manazil As Sayl al Kabir Miqat Saudi Arabia",
  },
  {
    id: "yalamlam",
    name: t("Yalamlam", "Яламлам", "Ялямлям", "Yalamlam"),
    arabicName: "يلملم",
    route: t("Yaman va janub tomondan tegishli yo‘l orqali kelish.", "Яман ва жануб томондан тегишли йўл орқали келиш.", "С юга, со стороны Йемена, по соответствующему пути.", "The southern approach from Yemen along the relevant route."),
    note: t(
      "Hozirgi Sa‘diya masjidi eski joydan farq qiladi. Xarita qidiruvi zamonaviy joy nomi bo‘yicha; masjid belgisi butun miqot chegarasini ko‘rsatmaydi.",
      "Ҳозирги Саъдия масжиди эски жойдан фарқ қилади. Харита қидируви замонавий жой номи бўйича; масжид белгиси бутун миқот чегарасини кўрсатмайди.",
      "Современная мечеть Ас-Са‘дийя отличается от прежнего места. Поиск карты использует современное название; маркер мечети не показывает всю границу миката.",
      "The modern Al-Sa‘diyyah Mosque differs from the older site. Map search uses the modern name; a mosque marker does not represent the whole miqat boundary.",
    ),
    sources: [saudipedia("https://saudipedia.com/en/miqat-yalamlam")],
    mapQuery: "Yalamlam Al Sadiyah Miqat Mosque Saudi Arabia",
  },
  {
    id: "dhat-irq",
    name: t("Zotu Irq", "Зоту Ирқ", "Зат Ирк", "Dhat Irq"),
    arabicName: "ذات عرق",
    route: t("Iroq tomondan shimoli-sharqiy yo‘l va undan o‘tuvchilar.", "Ироқ томондан шимоли-шарқий йўл ва ундан ўтувчилар.", "Северо-восточный путь со стороны Ирака и проходящие им.", "The north-eastern route from Iraq and those passing along it."),
    note: t(
      "Ad-Dariba hududi bilan bog‘liq nom. Xarita qidiruvi joyni izlash uchun; u sizning yo‘lingiz uchun miqotni avtomatik tanlamaydi.",
      "Ад-Дариба ҳудуди билан боғлиқ ном. Харита қидируви жойни излаш учун; у сизнинг йўлингиз учун миқотни автоматик танламайди.",
      "Название связано с местностью Ад-Дариба. Поиск помогает найти место, но не выбирает автоматически микат вашего маршрута.",
      "The name is associated with the Ad-Dharibah area. Map search helps find the place; it does not automatically choose your route’s miqat.",
    ),
    sources: [saudipedia("https://saudipedia.com/en/miqat-dhat-irq")],
    mapQuery: "Dhat Irq Miqat Ad Dharibah Saudi Arabia",
  },
];
