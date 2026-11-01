import type { UmrahSource, UmrahStep, UmrahText } from "./types";

// Review candidate: source cross-check is recorded in docs/umrah-source-review.md.
// These authored translations have not been approved by a qualified scholar.
const t = (latin: string, cyrillic: string, russian: string, english: string): UmrahText => ({
  "uz-Latn": latin, "uz-Cyrl": cyrillic, ru: russian, en: english,
});

const source = (id: string, title: UmrahText, url: string, reference: string, checkedAt = "2026-10-26"): UmrahSource => ({
  id, title, url, reference, checkedAt,
});

export const umrahSources: UmrahSource[] = [
  source("nusuk-journey", t("Nusuk: umra yo‘li", "Nusuk: умра йўли", "Nusuk: порядок умры", "Nusuk: Umrah journey"), "https://umrah.nusuk.sa/Journey", "Nusuk • Journey • Umrah rituals"),
  source("bukhari-1524", t("Miqotlar va ulardan o‘tuvchilar", "Миқотлар ва улардан ўтувчилар", "Микаты и проходящие через них", "Miqats and those passing them"), "https://sunnah.com/bukhari:1524", "Sahih al-Bukhari 1524"),
  source("bukhari-1542", t("Ihramdagi erkakning kiyimi", "Иҳромдаги эркакнинг кийими", "Одежда мужчины в ихраме", "Men’s clothing in ihram"), "https://sunnah.com/bukhari:1542", "Sahih al-Bukhari 1542"),
  source("bukhari-1838", t("Ihram: niqob va qo‘lqop", "Иҳром: ниқоб ва қўлқоп", "Ихрам: никаб и перчатки", "Ihram: niqab and gloves"), "https://sunnah.com/bukhari:1838", "Sahih al-Bukhari 1838"),
  source("bukhari-1549", t("Payg‘ambarning talbiyasi", "Пайғамбарнинг талбияси", "Тальбия Пророка", "The Prophet’s talbiyah"), "https://sunnah.com/bukhari:1549", "Sahih al-Bukhari 1549"),
  source("bukhari-1784", t("Oisha onamizning Tan‘imdan umrasi", "Оиша онамизнинг Танъимдан умраси", "Умра Аиши из Тан‘има", "Aishah’s Umrah from Tan‘im"), "https://sunnah.com/bukhari:1784", "Sahih al-Bukhari 1784"),
  source("bukhari-305", t("Hayz va tavof", "Ҳайз ва тавоф", "Менструация и таваф", "Menstruation and tawaf"), "https://sunnah.com/bukhari:305", "Sahih al-Bukhari 305"),
  source("bukhari-1641", t("Tavofdan oldin tahorat", "Тавофдан олдин таҳорат", "Омовение перед тавафом", "Ablution before tawaf"), "https://sunnah.com/bukhari:1641", "Sahih al-Bukhari 1641–1642"),
  source("muslim-1218a", t("Jobir rivoyati: tavof va sa‘y", "Жобир ривояти: тавоф ва саъй", "Рассказ Джабира: таваф и са‘й", "Jabir’s account: tawaf and sa‘i"), "https://sunnah.com/muslim:1218a", "Sahih Muslim 1218a", "2026-10-27"),
  source("quran-2-201", t("Qur’on: Baqara, 201-oyat", "Қуръон: Бақара, 201-оят", "Коран: Аль-Бакара, 201", "Quran: al-Baqarah, 201"), "https://quran.com/2/201", "Quran 2:201 • supplication excerpt", "2026-10-27"),
  source("binbaz-flight", t("Samolyotda miqotdan o‘tish", "Самолётда миқотдан ўтиш", "Пересечение миката в самолёте", "Passing the miqat by air"), "https://binbaz.org.sa/fatwas/1640/كيفية-احرام-من-كان-على-الطاىرة-او-السفينة", "Ibn Baz • fatwa 1640 • كيفية إحرام من كان على الطائرة أو السفينة", "2026-10-27"),
  source("binbaz-mecca", t("Makkada umra niyatini qilgan kishi", "Маккада умра ниятини қилган киши", "Намерение на умру уже в Мекке", "Intending Umrah while in Makkah"), "https://binbaz.org.sa/fatwas/7202/ميقات-اهل-مكة", "Ibn Baz • fatwa 7202 • ميقات أهل مكة"),
  source("binbaz-missed-miqat", t("Makkaga kirishdagi niyat farqi", "Маккага киришдаги ният фарқи", "Разные намерения при въезде в Мекку", "Different intentions on entering Makkah"), "https://binbaz.org.sa/fatwas/30666/حكم-من-اتى-مكة-لزيارة-اقاربه-والعمرة", "Ibn Baz • fatwa 30666 • حكم من أتى مكة لزيارة أقاربه والعمرة", "2026-10-27"),
  source("binbaz-ihram-prayer", t("Ihram va namoz haqidagi izoh", "Иҳром ва намоз ҳақидаги изоҳ", "Пояснение об ихраме и молитве", "Clarification on ihram and prayer"), "https://binbaz.org.sa/fatwas/14647/هل-ينعقد-احرام-بغير-ركعتي-الاحرام", "Ibn Baz • fatwa 14647 • Majmu‘ 17/67"),
  source("binbaz-tawaf-dua", t("Tavofdagi duo", "Тавофдаги дуо", "Мольба во время тавафа", "Supplication during tawaf"), "https://binbaz.org.sa/fatwas/15716/الدعاء-في-الطواف", "Ibn Baz • fatwa 15716 • Majmu‘ 17/222"),
  source("binbaz-no-circle-dua", t("Har aylanishga alohida duo belgilanmagan", "Ҳар айланишга алоҳида дуо белгиланмаган", "Нет отдельного дуа для каждого круга", "No prescribed dua for each circuit"), "https://binbaz.org.sa/fatwas/6685/حكم-تخصيص-اشواط-الطواف-بادعية-معينة", "Ibn Baz • fatwa 6685 • حكم تخصيص أشواط الطواف بأدعية معينة"),
  source("binbaz-tawaf-prayer", t("Tavofdan keyingi namozning joyi", "Тавофдан кейинги намознинг жойи", "Место молитвы после тавафа", "Where to pray after tawaf"), "https://binbaz.org.sa/fatwas/15859/هل-ركعتا-الطواف-تكون-خلف-المقام-فقط", "Ibn Baz • fatwa 15859 • Majmu‘ 17/228"),
  source("binbaz-umrah", t("Umra tartibi va soch qisqartirish", "Умра тартиби ва соч қисқартириш", "Порядок умры и стрижка волос", "Umrah sequence and cutting hair"), "https://binbaz.org.sa/fatwas/11982/صفة-العمرة", "Ibn Baz • fatwa 11982 • صفة العمرة", "2026-10-27"),
  source("binbaz-hijr", t("Hijr tashqarisidan tavof", "Ҳижр ташқарисидан тавоф", "Таваф снаружи Хиджра", "Tawaf outside the Hijr"), "https://binbaz.org.sa/fatwas/4697/ما-حكم-الطواف-من-داخل-الحجر", "Ibn Baz • fatwa 4697 • ما حكم الطواف من داخل الحِجْر؟"),
  source("bukhari-1613", t("Hajarul Asvad yonida takbir", "Ҳажарул Асвад ёнида такбир", "Такбир у Чёрного камня", "Takbir at the Black Stone"), "https://sunnah.com/bukhari:1613", "Sahih al-Bukhari 1613", "2026-10-27"),
  source("muslim-713a", t("Masjidga kirish va chiqish duosi", "Масжидга кириш ва чиқиш дуоси", "Мольба при входе в мечеть и выходе", "Supplication on entering and leaving a mosque"), "https://sunnah.com/muslim:713a", "Sahih Muslim 713a", "2026-10-27"),
  source("abudawud-1892", t("Ikki rukn orasidagi duo", "Икки рукн орасидаги дуо", "Мольба между двумя углами", "Supplication between the two corners"), "https://sunnah.com/abudawud:1892", "Sunan Abi Dawud 1892 • Hasan (al-Albani)", "2026-10-27"),
  source("quran-2-125", t("Qur’on: Baqara, 125-oyat", "Қуръон: Бақара, 125-оят", "Коран: Аль-Бакара, 125", "Quran: al-Baqarah, 125"), "https://quran.com/2/125", "Quran 2:125 • excerpt", "2026-10-27"),
  source("quran-2-158", t("Qur’on: Baqara, 158-oyat", "Қуръон: Бақара, 158-оят", "Коран: Аль-Бакара, 158", "Quran: al-Baqarah, 158"), "https://quran.com/2/158", "Quran 2:158 • opening excerpt", "2026-10-27"),
  source("hisn-236", t("Hisnul muslim: Safo va Marva", "Ҳиснул муслим: Сафо ва Марва", "Крепость мусульманина: Сафа и Марва", "Fortress of the Muslim: Safa and Marwah"), "https://sunnah.com/hisn:236", "Hisn al-Muslim 236 • chapter 118 • Muslim 2/888", "2026-10-27"),
];

export const umrahSteps: UmrahStep[] = [
  {
    id: "preparation",
    title: t("Tayyorgarlik", "Тайёргарлик", "Подготовка", "Preparation"),
    summary: t("Yo‘lingizni va ihram qoidalarini oldindan o‘rganing.", "Йўлингизни ва иҳром қоидаларини олдиндан ўрганинг.", "Заранее изучите маршрут и правила ихрама.", "Learn your route and the rules of ihram beforehand."),
    instructions: [
      {
        id: "prepare-route", kind: "context", sourceIds: ["bukhari-1524", "nusuk-journey"],
        text: t(
          "Umra tartibini va yo‘lingizdagi miqotni biladigan ustoz yoki tajribali umra yo‘lboshchisi bilan aniqlang. Miqot millatga yoki eng yaqin masjidga qarab tanlanmaydi.",
          "Умра тартибини ва йўлингиздаги миқотни биладиган устоз ёки тажрибали умра йўлбошчиси билан аниқланг. Миқот миллатга ёки энг яқин масжидга қараб танланмайди.",
          "Заранее уточните порядок умры и микат вашего маршрута у знающего наставника или опытного проводника по умре. Микат не выбирают по национальности или ближайшей мечети.",
          "Clarify the Umrah sequence and your route’s miqat with a knowledgeable mentor or experienced Umrah guide. Nationality or the nearest mosque does not determine your miqat.",
        ),
      },
      {
        id: "prepare-bath", kind: "recommended", sourceIds: ["muslim-1218a", "binbaz-ihram-prayer"],
        text: t("Ihramga kirishdan oldin imkon bo‘lsa g‘usl qiling. Bu tayyorgarlik; kiyimni almashtirishning o‘zi ihramga kirish emas.", "Иҳромга киришдан олдин имкон бўлса ғусл қилинг. Бу тайёргарлик; кийимни алмаштиришнинг ўзи иҳромга кириш эмас.", "Перед вступлением в ихрам по возможности совершите полное омовение. Это подготовка: переодевание само по себе ещё не означает вступление в ихрам.", "If possible, bathe before entering ihram. This is preparation: changing clothes alone does not mean you have entered ihram."),
      },
      {
        id: "prepare-men-clothing", kind: "caution", audience: "men", sourceIds: ["bukhari-1542", "nusuk-journey"],
        text: t("Erkaklar ihram uchun izor va rido tayyorlaydi. Ihramda ko‘ylak, shim va boshga kiyiladigan yopqichlar haqidagi cheklovlarni oldindan o‘rganing. Matoda chok borligining o‘zi taqiq degani emas.", "Эркаклар иҳром учун изор ва ридо тайёрлайди. Иҳромда кўйлак, шим ва бошга кийиладиган ёпқичлар ҳақидаги чекловларни олдиндан ўрганинг. Матода чок борлигининг ўзи тақиқ дегани эмас.", "Мужчины готовят изар и рида. Заранее изучите ограничения на рубашки, брюки и головные уборы в ихраме. Наличие шва на ткани само по себе не означает запрет.", "Men prepare an izar and rida. Learn the ihram restrictions on shirts, trousers and head coverings beforehand. A seam in fabric does not by itself make it prohibited."),
      },
      {
        id: "prepare-women-clothing", kind: "caution", audience: "women", sourceIds: ["bukhari-1838"],
        text: t("Hadisda ihramdagi ayolga niqob va qo‘lqop kiyish taqiqlangan. Yuzni boshqa usulda yopish tafsilotlarini biladigan ustozdan so‘rang; bu matn yuzni har qanday usulda yopishga umumiy taqiq emas.", "Ҳадисда иҳромдаги аёлга ниқоб ва қўлқоп кийиш тақиқланган. Юзни бошқа усулда ёпиш тафсилотларини биладиган устоздан сўранг; бу матн юзни ҳар қандай усулда ёпишга умумий тақиқ эмас.", "В хадисе женщине в ихраме запрещены никаб и перчатки. О других способах прикрытия лица уточните у знающего наставника: это не общий запрет любого прикрытия лица.", "The hadith prohibits a woman in ihram from wearing a niqab and gloves. Ask a knowledgeable mentor about other ways of covering the face; this is not a blanket prohibition of all face covering."),
      },
    ],
  },
  {
    id: "ihram",
    title: t("Miqot va ihram", "Миқот ва иҳром", "Микат и ихрам", "Miqat and ihram"),
    summary: t("Haqiqiy yo‘l va turgan joyingizga mos holatni tekshiring.", "Ҳақиқий йўл ва турган жойингизга мос ҳолатни текширинг.", "Учитывайте реальный маршрут и своё положение.", "Account for your actual route and present location."),
    instructions: [
      {
        id: "ihram-transport", kind: "context", sourceIds: ["muslim-1218a", "binbaz-flight", "bukhari-1524", "binbaz-missed-miqat"],
        title: t("Transportda ihramga kirish", "Транспортда иҳромга кириш", "Ихрам в транспорте", "Entering ihram in a vehicle"),
        text: t("Transport ichida ham ihramga kirish mumkin; buning uchun miqot masjidiga kirish shart emas. Oldindan tayyorlaning va yo‘lingizdagi miqotdan yoki unga teng joydan o‘tishdan kechikmay ihramga kiring. Umra niyati oldindan bo‘la turib miqotni ihramsiz o‘tgan bo‘lsangiz, bu rejimni tanlash xatoni tuzatmaydi; holatingizni biladigan ustozdan so‘rang.", "Транспорт ичида ҳам иҳромга кириш мумкин; бунинг учун миқот масжидига кириш шарт эмас. Олдиндан тайёрланинг ва йўлингиздаги миқотдан ёки унга тенг жойдан ўтишдан кечикмай иҳромга киринг. Умра нияти олдиндан бўла туриб миқотни иҳромсиз ўтган бўлсангиз, бу режимни танлаш хатони тузатмайди; ҳолатингизни биладиган устоздан сўранг.", "Вступить в ихрам можно в транспортном средстве; для этого не обязательно заходить в мечеть миката. Подготовьтесь заранее и вступите в ихрам не позднее прохождения миката своего маршрута или наравне с ним. Если вы уже пересекли микат без ихрама, заранее намереваясь совершить умру, выбор этого режима не исправляет ошибку; уточните свой случай у знающего наставника.", "You may enter ihram while in a vehicle; entering the miqat mosque is not required for this. Prepare beforehand and enter ihram no later than reaching your route’s miqat or passing level with it. If you already crossed without ihram while intending Umrah, selecting this mode does not remedy that; ask a knowledgeable mentor about your case."),
        startModes: ["transport"],
      },
      {
        id: "ihram-route", kind: "essential", scenarios: ["ground", "flight"], sourceIds: ["bukhari-1524"],
        text: t("Tashqaridan umra niyatida kelayotgan kishi o‘z yo‘lidagi miqotdan ihramsiz o‘tmasligi kerak. Ichkarida turgan kishining holati boshqacha; joylashuv va niyat qachon paydo bo‘lganini ustoz bilan aniqlang.", "Ташқаридан умра ниятида келаётган киши ўз йўлидаги миқотдан иҳромсиз ўтмаслиги керак. Ичкарида турган кишининг ҳолати бошқача; жойлашув ва ният қачон пайдо бўлганини устоз билан аниқланг.", "Прибывая извне с намерением умры, не пересекайте микат своего маршрута без ихрама. Для находящегося внутри границ правила зависят от положения и момента возникновения намерения; уточните свой случай у наставника.", "When arriving from outside intending Umrah, do not cross your route’s miqat without ihram. For someone already inside, location and when the intention arose matter; clarify your case with a mentor."),
      },
      {
        id: "ihram-flight", kind: "caution", scenarios: ["flight"], sourceIds: ["binbaz-flight"],
        text: t("Samolyotda oldindan tayyor bo‘ling; miqotga tenglashishdan oldin ekipaj yoki yo‘lboshchining xabarini aniqlang. Jiddaga qo‘nishni kutmang. Ilova GPS yoki bildirishnoma ishlashini kafolatlamaydi; barcha reyslar uchun bir xil daqiqa belgilanmaydi.", "Самолётда олдиндан тайёр бўлинг; миқотга тенглашишдан олдин экипаж ёки йўлбошчининг хабарини аниқланг. Жиддага қўнишни кутманг. Илова GPS ёки билдиришнома ишлашини кафолатламайди; барча рейслар учун бир хил дақиқа белгиланмайди.", "В самолёте подготовьтесь заранее и уточните у экипажа или проводника, когда маршрут проходит на уровне миката. Не ждите посадки в Джидде. GPS и уведомления могут не сработать; единого числа минут для всех рейсов нет.", "Prepare before reaching the miqat by air and check the route announcement with the crew or guide. Do not wait until landing in Jeddah. GPS and alerts may fail; there is no fixed number of minutes for every flight."),
      },
      {
        id: "ihram-mecca", kind: "context", scenarios: ["mecca"], sourceIds: ["bukhari-1784", "binbaz-mecca", "binbaz-missed-miqat"],
        text: t("Makkada turib yangi umra niyatini qilgan kishi haqidagi manbalarda ihram uchun Haram chegarasidan tashqariga, masalan Tan‘imga chiqish ko‘rsatilgan. Ammo avvaldan umra niyatida kelib miqotni ihramsiz o‘tgan kishiga bu avtomatik yechim emas. Holatingizni bilimli mutaxassisga ayting. Allaqachon ihramda bo‘lsangiz, uni qayta boshlamang.", "Маккада туриб янги умра ниятини қилган киши ҳақидаги манбаларда иҳром учун Ҳарам чегарасидан ташқарига, масалан Танъимга чиқиш кўрсатилган. Аммо аввалдан умра ниятида келиб миқотни иҳромсиз ўтган кишига бу автоматик ечим эмас. Ҳолатингизни билимли мутахассисга айтинг. Аллақачон иҳромда бўлсангиз, уни қайта бошламанг.", "Для возникшего уже в Мекке намерения новой умры источники указывают выход за границу Харама, например в Тан‘им. Но это не универсальное решение для того, кто приехал с намерением умры и уже пропустил микат без ихрама. Обсудите свой случай со знающим специалистом. Уже находясь в ихраме, не начинайте его заново.", "For a new intention of Umrah formed while in Makkah, the sources describe going outside the Haram boundary, for example to Tan‘im. This is not a universal remedy for having crossed a miqat without ihram while already intending Umrah. Ask a qualified scholar about your case. If already in ihram, do not restart it."),
      },
      {
        id: "ihram-intention", kind: "essential", sourceIds: ["binbaz-ihram-prayer", "bukhari-1549"],
        text: t("Umraga kirish niyatini qalbingizda qiling va talbiya ayting. Ilova majburiy maxsus niyat jumlasini yoki alohida «miqot namozi»ni belgilamaydi. Ihramga kirishning fiqhiy tafsilotlarini o‘zingiz o‘rganayotgan yo‘nalish bo‘yicha ustoz bilan aniqlang.", "Умрага кириш ниятини қалбингизда қилинг ва талбия айтинг. Илова мажбурий махсус ният жумласини ёки алоҳида «миқот намози»ни белгиламайди. Иҳромга киришнинг фиқҳий тафсилотларини ўзингиз ўрганаётган йўналиш бўйича устоз билан аниқланг.", "Намеритесь сердцем вступить в умру и произнесите тальбию. Приложение не назначает обязательную особую формулу намерения или отдельную «молитву миката». Фикховые подробности вступления в ихрам уточните у наставника в рамках изучаемой вами школы.", "Intend in your heart to enter Umrah and recite the talbiyah. The app does not prescribe a compulsory special intention formula or a separate obligatory ‘miqat prayer’. Clarify the legal details of entering ihram with a mentor in the school you follow."),
      },
    ],
  },
  {
    id: "talbiyah",
    title: t("Yo‘l va talbiya", "Йўл ва талбия", "Путь и тальбия", "Journey and talbiyah"),
    summary: t("Talbiyani aytib, ihram qoidalariga rioya qiling.", "Талбияни айтиб, иҳром қоидаларига риоя қилинг.", "Произносите тальбию и соблюдайте правила ихрама.", "Recite the talbiyah and observe the rules of ihram."),
    instructions: [
      {
        id: "talbiyah-text",
        title: t("Talbiya", "Талбия", "Тальбия", "Talbiyah"),
        kind: "recommended", sourceIds: ["bukhari-1549", "binbaz-umrah"],
        text: t("Yo‘lda Payg‘ambardan rivoyat qilingan talbiyani takrorlang. Quyida uning arabcha matni va ma’nosi keltirilgan.", "Йўлда Пайғамбардан ривоят қилинган талбияни такрорланг. Қуйида унинг арабча матни ва маъноси келтирилган.", "В пути повторяйте переданную от Пророка тальбию. Ниже её арабский текст и передача смысла.", "On the journey, repeat the talbiyah reported from the Prophet. Its Arabic text and a rendering of its meaning follow."),
        arabic: "لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ",
        meaning: t("Labbay, Allohim, labbay! Labbay, Sening sheriging yo‘q, labbay! Albatta, hamd, ne’mat va mulk Senga xosdir. Sening sheriging yo‘q.", "Лаббай, Аллоҳим, лаббай! Лаббай, Сенинг шеригинг йўқ, лаббай! Албатта, ҳамд, неъмат ва мулк Сенга хосдир. Сенинг шеригинг йўқ.", "Вот я перед Тобой, о Аллах, вот я! Вот я, нет у Тебя сотоварища, вот я! Поистине, хвала, милость и власть принадлежат Тебе. Нет у Тебя сотоварища.", "Here I am, O Allah, here I am! Here I am; You have no partner, here I am! All praise, favour and sovereignty belong to You. You have no partner."),
      },
      {
        id: "talbiyah-ihram-remains", kind: "caution", sourceIds: ["nusuk-journey", "binbaz-umrah"],
        text: t("Makkaga yetib kelish yoki ilovada bosqichni belgilash ihramni tugatmaydi. Umraning tavof, sa‘y va soch oldirish yoki qisqartirish amallari haqiqatan bajarilguncha ihram cheklovlariga rioya qiling.", "Маккага етиб келиш ёки иловада босқични белгилаш иҳромни тугатмайди. Умранинг тавоф, саъй ва соч олдириш ёки қисқартириш амаллари ҳақиқатан бажарилгунча иҳром чекловларига риоя қилинг.", "Прибытие в Мекку или отметка этапа в приложении не завершает ихрам. Соблюдайте его ограничения до фактического выполнения тавафа, са‘й и бритья или подстригания волос.", "Arriving in Makkah or marking a step in the app does not end ihram. Observe its restrictions until you have actually performed tawaf, sa‘i and the required shaving or trimming."),
      },
    ],
  },
  {
    id: "tawaf",
    title: t("Tavof", "Тавоф", "Таваф", "Tawaf"),
    summary: t("Ka’ba atrofida yetti aylanishni sanang.", "Каъба атрофида етти айланишни сананг.", "Отсчитайте семь кругов вокруг Каабы.", "Count seven circuits around the Kaaba."),
    instructions: [
      {
        id: "tawaf-mosque-entry", kind: "recommended", sourceIds: ["muslim-713a"],
        title: t("Masjidga kirayotganda", "Масжидга кираётганда", "При входе в мечеть", "When entering the mosque"),
        text: t("Masjidga, jumladan Masjidul Haromga kirayotganda ushbu duo aytiladi. Bu umumiy masjidga kirish duosi; Ka’bani birinchi ko‘rishga maxsus formula sifatida belgilanmaydi.", "Масжидга, жумладан Масжидул Ҳаромга кираётганда ушбу дуо айтилади. Бу умумий масжидга кириш дуоси; Каъбани биринчи кўришга махсус формула сифатида белгиланмайди.", "При входе в мечеть, в том числе в аль-Масджид аль-Харам, произносят эту мольбу. Это общая мольба входа в мечеть, а не особая формула при первом взгляде на Каабу.", "Say this supplication when entering a mosque, including al-Masjid al-Haram. It is the general supplication for entering a mosque, not a special formula for first seeing the Kaaba."),
        arabic: "اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ",
        meaning: t("Allohim, menga rahmating eshiklarini och.", "Аллоҳим, менга раҳматинг эшикларини оч.", "О Аллах, открой для меня врата Твоей милости.", "O Allah, open for me the doors of Your mercy."),
      },
      {
        id: "tawaf-preparation", kind: "context", sourceIds: ["bukhari-1641", "binbaz-umrah"],
        text: t("Tavofga tahoratli holda tayyorlaning: Payg‘ambarning tavofdan oldin tahorat qilgani rivoyat qilingan. Tahorat buzilishi yoki uzrli holat hukmini ustozdan so‘rang. Hajarul Asvadga yetish uchun odamlarni turtmang; yetish imkoni bo‘lmasa, unga ishora qilib takbir aytiladi.", "Тавофга таҳоратли ҳолда тайёрланинг: Пайғамбарнинг тавофдан олдин таҳорат қилгани ривоят қилинган. Таҳорат бузилиши ёки узрли ҳолат ҳукмини устоздан сўранг. Ҳажарул Асвадга етиш учун одамларни туртманг; етиш имкони бўлмаса, унга ишора қилиб такбир айтилади.", "Подготовьтесь к тавафу с омовением: передано, что Пророк совершил омовение перед тавафом. Последствия его нарушения и случаи уважительных причин уточните у наставника. Не толкайтесь ради Чёрного камня: если подойти невозможно, укажите на него и произнесите такбир.", "Prepare for tawaf with ablution: the Prophet is reported to have performed ablution before tawaf. Ask your mentor about losing ablution or exceptional circumstances. Do not push to reach the Black Stone; if you cannot reach it, gesture toward it and say the takbir."),
      },
      {
        id: "tawaf-seven", kind: "essential", sourceIds: ["nusuk-journey", "muslim-1218a", "binbaz-hijr"],
        text: t("Hajarul Asvad ro‘parasidan boshlang. Ka’ba chap tomoningizda qolgan holda soat miliga teskari yo‘nalishda yetti to‘liq aylanish qiling. Hijrning yarim doira devori tashqarisidan yuring, ichidan kesib o‘tmang. Boshlang‘ich joyga qaytish — bir aylanish.", "Ҳажарул Асвад рўпарасидан бошланг. Каъба чап томонингизда қолган ҳолда соат милига тескари йўналишда етти тўлиқ айланиш қилинг. Ҳижрнинг ярим доира девори ташқарисидан юринг, ичидан кесиб ўтманг. Бошланғич жойга қайтиш — бир айланиш.", "Начните на уровне Чёрного камня. Совершите семь полных кругов против часовой стрелки, оставляя Каабу слева. Обходите полукруглую стену Хиджра снаружи, не срезайте путь внутри. Возвращение к исходной линии завершает один круг.", "Start level with the Black Stone. Complete seven circuits counterclockwise, keeping the Kaaba on your left. Pass outside the Hijr’s semicircular wall, without cutting through it. Returning to the starting line completes one circuit."),
      },
      {
        id: "tawaf-black-stone", kind: "recommended", sourceIds: ["bukhari-1613", "binbaz-umrah"],
        title: t("Hajarul Asvad ro‘parasida", "Ҳажарул Асвад рўпарасида", "На уровне Чёрного камня", "Level with the Black Stone"),
        text: t("Hajarul Asvad ro‘parasiga kelganda takbir aytiladi. Unga yetish uchun odamlarni turtmang; yetish imkoni bo‘lmasa, unga ishora qiling. Bu Yaman ruknida aytiladigan alohida formula emas.", "Ҳажарул Асвад рўпарасига келганда такбир айтилади. Унга етиш учун одамларни туртманг; етиш имкони бўлмаса, унга ишора қилинг. Бу Яман рукнида айтиладиган алоҳида формула эмас.", "На уровне Чёрного камня произносят такбир. Не толкайтесь, чтобы приблизиться: если подойти невозможно, укажите в его сторону. Это не отдельная формула для Йеменского угла.", "Say the takbir when level with the Black Stone. Do not push to approach it; if you cannot reach it, gesture toward it. This is not a separate formula prescribed at the Yemeni Corner."),
        arabic: "اللَّهُ أَكْبَرُ",
        meaning: t("Alloh eng buyukdir.", "Аллоҳ энг буюкдир.", "Аллах превелик.", "Allah is the Greatest."),
      },
      {
        id: "tawaf-no-fixed-dua", kind: "context", sourceIds: ["binbaz-no-circle-dua", "binbaz-tawaf-dua"],
        text: t("Har bir aylanish uchun alohida majburiy duo yo‘q. Allohni zikr qiling va ma’nosini bilgan munosib duolaringizni ayting; ilova birinchi, ikkinchi yoki boshqa aylanishga maxsus duo biriktirmaydi.", "Ҳар бир айланиш учун алоҳида мажбурий дуо йўқ. Аллоҳни зикр қилинг ва маъносини билган муносиб дуоларингизни айтинг; илова биринчи, иккинчи ёки бошқа айланишга махсус дуо бириктирмайди.", "Для каждого круга не установлено отдельного обязательного дуа. Поминайте Аллаха и обращайтесь с подходящими мольбами, смысл которых понимаете. Приложение не закрепляет особые дуа за номерами кругов.", "There is no separately prescribed compulsory dua for each circuit. Remember Allah and make appropriate supplications whose meaning you understand. The app does not assign special duas to numbered circuits."),
      },
      {
        id: "tawaf-quran-dua", kind: "recommended", sourceIds: ["quran-2-201", "abudawud-1892", "binbaz-tawaf-dua"],
        title: t("Yaman ruknidan Hajarul Asvadgacha", "Яман рукнидан Ҳажарул Асвадгача", "Между Йеменским углом и Чёрным камнем", "From the Yemeni Corner to the Black Stone"),
        text: t("Yaman rukni bilan Hajarul Asvad orasida ushbu duo tavsiya qilingan. Bu Baqara surasi 201-oyatidagi duo qismi; ma’lum bir aylanishga xos emas.", "Яман рукни билан Ҳажарул Асвад орасида ушбу дуо тавсия қилинган. Бу Бақара сураси 201-оятдаги дуо қисми; маълум бир айланишга хос эмас.", "Между Йеменским углом и Чёрным камнем рекомендуется эта мольба из аята 2:201. Она не закреплена за определённым номером круга.", "Between the Yemeni Corner and the Black Stone, this supplication from Quran 2:201 is recommended. It is not assigned to a particular numbered circuit."),
        arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
        meaning: t("Rabbimiz! Bizga bu dunyoda ham, oxiratda ham yaxshilik ato et va bizni do‘zax azobidan asra.", "Раббимиз! Бизга бу дунёда ҳам, охиратда ҳам яхшилик ато эт ва бизни дўзах азобидан асра.", "Господь наш! Даруй нам благо в этом мире и благо в Последней жизни и защити нас от мучений Огня.", "Our Lord, grant us good in this world and good in the Hereafter, and protect us from the punishment of the Fire."),
      },
      {
        id: "tawaf-men-pace", kind: "recommended", audience: "men", sourceIds: ["muslim-1218a", "nusuk-journey"],
        text: t("Umra tavofida erkaklarga dastlabki uch aylanishda mayda qadamlar bilan tezroq yurish — ramal tavsiya qilinadi. Odamlarga ozor bermang; gavjumlikda buni majburlab qilmang. Qolgan to‘rt aylanish oddiy yurish bilan.", "Умра тавофида эркакларга дастлабки уч айланишда майда қадамлар билан тезроқ юриш — рамал тавсия қилинади. Одамларга озор берманг; гавжумликда буни мажбурлаб қилманг. Қолган тўрт айланиш оддий юриш билан.", "Мужчинам в тавафе умры рекомендуется рамаль — более быстрый ход короткими шагами в первых трёх кругах. Не причиняйте неудобств людям и не протискивайтесь ради этого в толпе. Остальные четыре круга проходят обычным шагом.", "For men, ramal—a brisk pace with short steps—is recommended in the first three circuits of Umrah tawaf. Do not harm others or force your way through a crowd. Walk normally for the remaining four."),
      },
      {
        id: "tawaf-women-menstruation", kind: "caution", audience: "women", sourceIds: ["bukhari-305", "muslim-1218a"],
        text: t("Hayz ihramga kirishga to‘sqinlik qilmaydi. Ammo tavof poklanishgacha qoldiriladi. Safar vaqti yoki sog‘liq bilan bog‘liq murakkab holatda individual hukmni biladigan mutaxassisdan so‘rang.", "Ҳайз иҳромга киришга тўсқинлик қилмайди. Аммо тавоф покланишгача қолдирилади. Сафар вақти ёки соғлиқ билан боғлиқ мураккаб ҳолатда индивидуал ҳукмни биладиган мутахассисдан сўранг.", "Менструация не препятствует вступлению в ихрам, но таваф откладывается до очищения. При сложных обстоятельствах, связанных со сроками поездки или здоровьем, обратитесь за индивидуальной консультацией к знающему специалисту.", "Menstruation does not prevent entering ihram, but tawaf is postponed until purification. For difficult circumstances involving travel deadlines or health, seek individual advice from a qualified scholar."),
      },
    ],
  },
  {
    id: "after-tawaf",
    title: t("Tavofdan keyin", "Тавофдан кейин", "После тавафа", "After tawaf"),
    summary: t("Ikki rak‘at namoz va sa‘yga tayyorgarlik.", "Икки ракъат намоз ва саъйга тайёргарлик.", "Два рак‘ата и подготовка к са‘й.", "Two rak‘ahs and preparation for sa‘i."),
    instructions: [
      {
        id: "after-tawaf-maqam", kind: "recommended", sourceIds: ["muslim-1218a", "quran-2-125"],
        title: t("Maqomi Ibrohimga yo‘nalganda", "Мақоми Иброҳимга йўналганда", "Направляясь к Макаму Ибрахима", "When approaching Maqam Ibrahim"),
        text: t("Tavofdan so‘ng Maqomi Ibrohimga yo‘nalganda Payg‘ambar ushbu oyat qismini o‘qigan. Bu Baqara surasi 125-oyatidan parcha. Odamlarga xalaqit bermasdan namoz uchun joy toping.", "Тавофдан сўнг Мақоми Иброҳимга йўналганда Пайғамбар ушбу оят қисмини ўқиган. Бу Бақара сураси 125-оятдан парча. Одамларга халақит бермасдан намоз учун жой топинг.", "После тавафа, направляясь к Макаму Ибрахима, Пророк прочитал этот фрагмент аята 2:125. Выберите место для молитвы, не мешая другим людям.", "After tawaf, as he approached Maqam Ibrahim, the Prophet recited this excerpt from Quran 2:125. Find a place to pray without obstructing others."),
        arabic: "وَاتَّخِذُوا مِنْ مَقَامِ إِبْرَاهِيمَ مُصَلًّى",
        meaning: t("Maqomi Ibrohimni namozgoh tuting.", "Мақоми Иброҳимни намозгоҳ тутинг.", "Сделайте место стояния Ибрахима местом молитвы.", "Take the standing place of Ibrahim as a place of prayer."),
      },
      {
        id: "after-tawaf-prayer", kind: "context", sourceIds: ["muslim-1218a", "binbaz-tawaf-prayer"],
        text: t("Tavofdan keyin ikki rak‘at namoz o‘qing. Maqomi Ibrohim orqasida gavjumliksiz imkon bo‘lsa o‘qiladi; buning uchun tavof qiluvchilarga xalaqit bermang. Masjidning boshqa joyida ham o‘qish mumkin. Amalning fiqhiy darajasini ustozingizdan aniqlang.", "Тавофдан кейин икки ракъат намоз ўқинг. Мақоми Иброҳим орқасида гавжумликсиз имкон бўлса ўқилади; бунинг учун тавоф қилувчиларга халақит берманг. Масжиднинг бошқа жойида ҳам ўқиш мумкин. Амалнинг фиқҳий даражасини устозингиздан аниқланг.", "После тавафа совершите два рак‘ата. Если за Макамом Ибрахима свободно, можно молиться там; не мешайте совершающим таваф. Подойдёт и другое место в мечети. Правовую классификацию этого действия уточните у своего наставника.", "After tawaf, pray two rak‘ahs. Pray behind Maqam Ibrahim if there is room without crowding; do not obstruct people performing tawaf. Another place in the mosque is also suitable. Clarify this act’s legal classification with your mentor."),
      },
    ],
  },
  {
    id: "sai",
    title: t("Sa‘y", "Саъй", "Са‘й", "Sa‘i"),
    summary: t("Safo va Marva orasida yetti yo‘l.", "Сафо ва Марва орасида етти йўл.", "Семь переходов между Сафа и Марва.", "Seven one-way traversals between Safa and Marwah."),
    instructions: [
      {
        id: "sai-first-approach", kind: "recommended", sourceIds: ["muslim-1218a", "quran-2-158", "hisn-236"],
        title: t("Safo tomon birinchi kelishda", "Сафо томон биринчи келишда", "При первом приближении к Сафа", "On first approaching Safa"),
        text: t("Sa‘y boshida Safo tomon kelganda ushbu oyat qismi o‘qiladi. Bu Baqara surasi 158-oyatining boshlanishi. Uni har bir yo‘l uchun alohida takrorlanadigan formula deb belgilamang.", "Саъй бошида Сафо томон келганда ушбу оят қисми ўқилади. Бу Бақара сураси 158-оятнинг бошланиши. Уни ҳар бир йўл учун алоҳида такрорланадиган формула деб белгиламанг.", "При первом приближении к Сафа в начале са‘й читают этот начальный фрагмент аята 2:158. Он относится к началу са‘й, а не назначается отдельной формулой для каждого перехода.", "On first approaching Safa at the start of sa‘i, recite this opening excerpt from Quran 2:158. It belongs to the start of sa‘i, rather than a separate formula assigned to every traversal."),
        arabic: "إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ",
        meaning: t("Albatta, Safo va Marva Allohning diniy nishonlaridandir.", "Албатта, Сафо ва Марва Аллоҳнинг диний нишонларидандир.", "Поистине, Сафа и Марва — из обрядовых знамений Аллаха.", "Indeed, Safa and Marwah are among the sacred symbols of Allah."),
      },
      {
        id: "sai-begin-with-safa", kind: "recommended", sourceIds: ["muslim-1218a", "hisn-236"],
        title: t("Safodan boshlash", "Сафодан бошлаш", "Начать с Сафа", "Begin with Safa"),
        text: t("Oyat parchasidan keyin hadishda ushbu so‘zlar kelgan. Bu oyatning davomi emas. Sa‘yni Safodan boshlang.", "Оят парчасидан кейин ҳадисда ушбу сўзлар келган. Бу оятнинг давоми эмас. Саъйни Сафодан бошланг.", "После фрагмента аята в хадисе переданы эти слова. Они не являются продолжением аята. Начните са‘й с Сафа.", "After the verse excerpt, the hadith reports these words. They are not part of the Quranic verse. Begin sa‘i at Safa."),
        arabic: "أَبْدَأُ بِمَا بَدَأَ اللَّهُ بِهِ",
        meaning: t("Alloh boshlagan narsadan boshlayman.", "Аллоҳ бошлаган нарсадан бошлайман.", "Начинаю с того, с чего начал Аллах.", "I begin with what Allah began with."),
      },
      {
        id: "sai-seven", kind: "essential", sourceIds: ["muslim-1218a", "nusuk-journey"],
        text: t("Safodan boshlang: Safo → Marva — birinchi, Marva → Safo — ikkinchi yo‘l. Shu tartibda yettita bir tomonlama yo‘lni bajaring; yettinchisi Marvada tugaydi. Borib-kelish bitta emas, ikkita hisoblanadi.", "Сафодан бошланг: Сафо → Марва — биринчи, Марва → Сафо — иккинчи йўл. Шу тартибда еттита бир томонлама йўлни бажаринг; еттинчиси Марвада тугайди. Бориб-келиш битта эмас, иккита ҳисобланади.", "Начните у Сафа: Сафа → Марва — первый переход, Марва → Сафа — второй. Всего семь переходов в одну сторону; седьмой заканчивается у Марва. Путь туда и обратно считается двумя переходами.", "Start at Safa: Safa → Marwah is one traversal; Marwah → Safa is the second. Complete seven one-way traversals, ending at Marwah. A return trip counts as two, not one."),
      },
      {
        id: "sai-dhikr", kind: "recommended", sourceIds: ["muslim-1218a", "hisn-236", "binbaz-umrah"],
        title: t("Safo va Marvada zikr va duo", "Сафо ва Марвада зикр ва дуо", "Зикр и мольба на Сафа и Марва", "Remembrance and supplication at Safa and Marwah"),
        text: t("Safo va Marvada qiblaga yuzlanib Allohning yagonaligini ayting va «Allohu akbar» deb takbir ayting. Quyidagi tahlilni uch marta aytib, takrorlar orasida Allohdan o‘zingiz istagan yaxshiliklarni so‘rang. Marvada ham Safodagidek zikr va duo qilinadi. Bu har bir yo‘l raqami uchun boshqa-boshqa duo emas.", "Сафо ва Марвада қиблага юзланиб Аллоҳнинг ягоналигини айтинг ва «Аллоҳу акбар» деб такбир айтинг. Қуйидаги таҳлилни уч марта айтиб, такрорлар орасида Аллоҳдан ўзингиз истаган яхшиликларни сўранг. Марвада ҳам Сафодагидек зикр ва дуо қилинади. Бу ҳар бир йўл рақами учун бошқа-бошқа дуо эмас.", "На Сафа и Марва обратитесь к кибле, произнесите слова единобожия и такбир «Аллаху акбар». Приведённый ниже тахлиль повторяют три раза, между повторениями обращаясь к Аллаху со своими мольбами о благе. На Марва поступают так же, как на Сафа. Это общий зикр в этих местах, а не разные дуа для каждого номера перехода.", "At Safa and Marwah, face the qiblah, proclaim Allah’s oneness and say the takbir, Allahu akbar. Repeat the following tahlil three times, making your own supplications for good between repetitions. At Marwah do as at Safa. This is the shared remembrance at these places, not different duas for numbered traversals."),
        arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ. لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ، أَنْجَزَ وَعْدَهُ، وَنَصَرَ عَبْدَهُ، وَهَزَمَ الْأَحْزَابَ وَحْدَهُ.",
        meaning: t("Yagona Allohdan o‘zga ibodatga haqli zot yo‘q, Uning sherigi yo‘q. Mulk Unikidir va hamd Ungadir. U har bir narsaga qodirdir. Yagona Allohdan o‘zga ibodatga haqli zot yo‘q. U va’dasini bajardi, bandasiga yordam berdi va birlashgan dushmanlarni O‘zi mag‘lub etdi.", "Ягона Аллоҳдан ўзга ибодатга ҳақли зот йўқ, Унинг шериги йўқ. Мулк Уникидир ва ҳамд Унгадир. У ҳар бир нарсага қодирдир. Ягона Аллоҳдан ўзга ибодатга ҳақли зот йўқ. У ваъдасини бажарди, бандасига ёрдам берди ва бирлашган душманларни Ўзи мағлуб этди.", "Нет никого, достойного поклонения, кроме одного Аллаха, у Которого нет сотоварища. Ему принадлежат власть и хвала, и Он способен на всякую вещь. Нет никого, достойного поклонения, кроме одного Аллаха. Он исполнил Своё обещание, помог Своему рабу и единолично разгромил союзные войска.", "None is worthy of worship except Allah alone, without partner. To Him belong dominion and praise, and He has power over all things. None is worthy of worship except Allah alone. He fulfilled His promise, aided His servant and alone defeated the confederates."),
      },
      {
        id: "sai-walking-dua", kind: "context", sourceIds: ["binbaz-umrah", "binbaz-tawaf-dua"],
        title: t("Safo va Marva orasidagi yo‘lda", "Сафо ва Марва орасидаги йўлда", "Во время перехода между Сафа и Марва", "While walking between Safa and Marwah"),
        text: t("Yo‘lda Allohni zikr qiling va ma’nosini bilgan munosib duolaringizni ayting. Birinchi, ikkinchi yoki boshqa yo‘l uchun maxsus duo ajratilmagan. Safo va Marvadagi yuqoridagi zikr bilan yo‘ldagi erkin duoni farqlang.", "Йўлда Аллоҳни зикр қилинг ва маъносини билган муносиб дуоларингизни айтинг. Биринчи, иккинчи ёки бошқа йўл учун махсус дуо ажратилмаган. Сафо ва Марвадаги юқоридаги зикр билан йўлдаги эркин дуони фарқланг.", "В пути поминайте Аллаха и обращайтесь с подходящими мольбами, смысл которых понимаете. Для первого, второго и остальных переходов не назначены разные особые дуа. Отличайте приведённый зикр у Сафа и Марва от свободной мольбы во время ходьбы.", "While walking, remember Allah and make appropriate supplications whose meaning you understand. Different special duas are not assigned to the first, second or other traversals. Distinguish the remembrance at Safa and Marwah above from personal supplication along the way."),
      },
      {
        id: "sai-men-pace", kind: "recommended", audience: "men", sourceIds: ["nusuk-journey", "muslim-1218a"],
        text: t("Erkaklarga yashil belgilar orasida imkon bo‘lsa tezroq harakatlanish tavsiya qilingan. Qolgan yo‘lni oddiy yuring. Odamlarga zarar yetkazmang; bu tezlashish ayollarga tatbiq etilmaydi.", "Эркакларга яшил белгилар орасида имкон бўлса тезроқ ҳаракатланиш тавсия қилинган. Қолган йўлни оддий юринг. Одамларга зарар етказманг; бу тезлашиш аёлларга татбиқ этилмайди.", "Мужчинам рекомендуется ускоряться между зелёными отметками, если это возможно. Остальной путь проходите обычным шагом. Не причиняйте вреда людям; для женщин это ускорение не предписано.", "Men are recommended to move more quickly between the green markers when able. Walk normally elsewhere and do not harm others. This quicker pace is not prescribed for women."),
      },
    ],
  },
  {
    id: "completion",
    title: t("Yakunlash", "Якунлаш", "Завершение", "Completion"),
    summary: t("Sa‘ydan keyin soch oldirish yoki qisqartirish.", "Саъйдан кейин соч олдириш ёки қисқартириш.", "Бритьё или подстригание волос после са‘й.", "Shaving or trimming the hair after sa‘i."),
    instructions: [
      {
        id: "completion-men-hair", kind: "essential", audience: "men", sourceIds: ["binbaz-umrah", "nusuk-journey"],
        text: t("Tavof va sa‘ydan keyin erkak bosh sochini oldiradi yoki qisqartiradi. Qisqartirishning yetarli miqdori haqidagi fiqhiy tafsilotlarni oldindan ustoz bilan aniqlang; ilova bitta miqdorni barcha mazhablar uchun belgilamaydi.", "Тавоф ва саъйдан кейин эркак бош сочини олдиради ёки қисқартиради. Қисқартиришнинг етарли миқдори ҳақидаги фиқҳий тафсилотларни олдиндан устоз билан аниқланг; илова битта миқдорни барча мазҳаблар учун белгиламайди.", "После тавафа и са‘й мужчина сбривает или подстригает волосы на голове. Заранее уточните у наставника требования своей школы к достаточному подстриганию; приложение не назначает один объём для всех мазхабов.", "After tawaf and sa‘i, a man shaves or trims his head hair. Ask your mentor beforehand about sufficient trimming in the school you follow; the app does not prescribe one amount for every school."),
      },
      {
        id: "completion-women-hair", kind: "essential", audience: "women", sourceIds: ["binbaz-umrah"],
        text: t("Tavof va sa‘ydan keyin ayol sochining uchidan qisqartiradi, boshini qirmaydi. Yetarli qisqartirish tafsilotini ustoz bilan oldindan aniqlang.", "Тавоф ва саъйдан кейин аёл сочининг учидан қисқартиради, бошини қирмайди. Етарли қисқартириш тафсилотини устоз билан олдиндан аниқланг.", "После тавафа и са‘й женщина подстригает кончики волос, а не бреет голову. Подробности достаточного подстригания заранее уточните у наставника.", "After tawaf and sa‘i, a woman trims the ends of her hair; she does not shave her head. Clarify sufficient trimming with your mentor beforehand."),
      },
      {
        id: "completion-mosque-exit", kind: "recommended", sourceIds: ["muslim-713a"],
        title: t("Masjiddan chiqayotganda", "Масжиддан чиқаётганда", "При выходе из мечети", "When leaving the mosque"),
        text: t("Masjiddan chiqayotgan paytingizda ushbu umumiy duo aytiladi. Bu soch oldirishga xos duo yoki umra tugashining sharti emas.", "Масжиддан чиқаётган пайтингизда ушбу умумий дуо айтилади. Бу соч олдиришга хос дуо ёки умра тугашининг шарти эмас.", "Эту общую мольбу произносят тогда, когда выходят из мечети. Она не является особым дуа стрижки или условием завершения умры.", "Say this general supplication when you leave the mosque. It is not a special invocation for cutting hair or a condition of completing Umrah."),
        arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ",
        meaning: t("Allohim, Sendan fazlingni so‘rayman.", "Аллоҳим, Сендан фазлингни сўрайман.", "О Аллах, прошу Тебя о Твоей щедрости.", "O Allah, I ask You for Your bounty."),
      },
      {
        id: "completion-real-actions", kind: "context", sourceIds: ["nusuk-journey", "binbaz-umrah"],
        text: t("Umra amallari bajarilib, soch oldirilgach yoki qisqartirilgach ihramdan chiqiladi. Ilovadagi belgilar faqat shaxsiy qayd: ular ibodatning to‘g‘ri bajarilgani yoki qabul bo‘lganini tasdiqlamaydi. Shubhada bilimli mutaxassisga murojaat qiling.", "Умра амаллари бажарилиб, соч олдирилгач ёки қисқартирилгач иҳромдан чиқилади. Иловадаги белгилар фақат шахсий қайд: улар ибодатнинг тўғри бажарилгани ёки қабул бўлганини тасдиқламайди. Шубҳада билимли мутахассисга мурожаат қилинг.", "Из ихрама выходят после выполнения действий умры и фактического бритья или подстригания волос. Отметки приложения — только личная запись: они не подтверждают действительность или принятие поклонения. При сомнениях обратитесь к знающему специалисту.", "You leave ihram after performing the acts of Umrah and actually shaving or trimming the hair. App checkmarks are only personal records; they do not establish the validity or acceptance of worship. Consult a qualified scholar when unsure."),
      },
    ],
  },
];
