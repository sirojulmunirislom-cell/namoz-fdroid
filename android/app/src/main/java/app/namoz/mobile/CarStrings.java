package app.namoz.mobile;

import android.content.Context;

/** Uses the language explicitly selected in Namoz, including Uzbek Cyrillic. */
final class CarStrings {
    private final int language;
    CarStrings(Context context) {
        String locale = context.getSharedPreferences("namoz-language", 0).getString("locale", "uz-Latn");
        language = "uz-Cyrl".equals(locale) ? 1 : "ru".equals(locale) ? 2 : "en".equals(locale) ? 3 : 0;
    }
    private String choose(String uz, String cy, String ru, String en) { return new String[]{uz, cy, ru, en}[language]; }
    String title() { return choose("Yaqin masjidlar", "Яқин масжидлар", "Мечети рядом", "Nearby mosques"); }
    String selected() { return choose("Tanlangan shahar", "Танланган шаҳар", "Выбранный город", "Selected city"); }
    String permission() { return choose("Yaqin masjidlarni topish uchun joylashuvga ruxsat bering. Yoki telefonda shaharni tanlang. Ruxsatni mashina to‘xtaganda bering.", "Яқин масжидларни топиш учун жойлашувга рухсат беринг. Ёки телефонда шаҳарни танланг. Рухсатни машина тўхтаганда беринг.", "Разрешите геолокацию для поиска мечетей рядом или выберите город в приложении на телефоне. Разрешение выдаётся на стоянке.", "Allow location to find nearby mosques, or select a city in the phone app. Grant permission while parked."); }
    String location() { return choose("Joylashuv", "Жойлашув", "Геолокация", "Location"); }
    String noLocation() { return choose("Joylashuv aniqlanmadi. GPSni yoqing yoki telefonda shaharni tanlang, so‘ng qayta urinib ko‘ring.", "Жойлашув аниқланмади. GPSни ёқинг ёки телефонда шаҳарни танланг, сўнг қайта уриниб кўринг.", "Местоположение не определено. Включите GPS или выберите город в приложении, затем повторите поиск.", "Location is unavailable. Enable GPS or choose a city in the phone app, then retry."); }
    String retry() { return choose("Yangilash", "Янгилаш", "Обновить", "Refresh"); }
    String error() { return choose("Masjidlar yuklanmadi. Internetni tekshirib, qayta urinib ko‘ring.", "Масжидлар юкланмади. Интернетни текшириб, қайта уриниб кўринг.", "Не удалось загрузить мечети. Проверьте интернет и повторите поиск.", "Could not load mosques. Check your connection and retry."); }
    String empty() { return choose("5 km ichida xaritada masjid topilmadi. Xarita ma’lumotlari to‘liq bo‘lmasligi mumkin.", "5 km ичида харитада масжид топилмади. Харита маълумотлари тўлиқ бўлмаслиги мумкин.", "На карте не найдено мечетей в радиусе 5 км. Данные карты могут быть неполными.", "No mapped mosques found within 5 km. Map data may be incomplete."); }
    String navigate() { return choose("Yo‘l ko‘rsatish", "Йўл кўрсатиш", "Маршрут", "Navigate"); }
    String noNavigation() { return choose("Navigator ochilmadi.", "Навигатор очилмади.", "Не удалось открыть навигатор.", "Could not open navigation."); }
    String straightLine() { return choose("To‘g‘ri chiziq bo‘yicha", "Тўғри чизиқ бўйича", "По прямой", "Straight-line distance"); }
    String information() { return choose("Manba", "Манба", "Источник", "Source"); }
    String attribution() { return CarMosqueData.SOURCE + "\n" + choose("Xarita ma’lumotlari to‘liq bo‘lmasligi mumkin. Yo‘lni navigator hisoblaydi.", "Харита маълумотлари тўлиқ бўлмаслиги мумкин. Йўлни навигатор ҳисоблайди.", "Данные карты могут быть неполными. Маршрут рассчитывает навигатор.", "Map data may be incomplete. Your navigation app calculates the route."); }
}
