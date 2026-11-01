import type { CapacitorConfig } from '@capacitor/cli';
import pkg from './package.json' with { type: 'json' };
const config: CapacitorConfig = {
 appId: 'app.namoz.prayer.fdroid', appName: 'Namoz — намаз и умра', webDir: 'dist',
 appendUserAgent: ` Namoz/${pkg.version} (+https://github.com/sirojulmunirislom-cell/namoz-fdroid)`,
 plugins: {SystemBars:{insetsHandling:'disable'},LocalNotifications:{smallIcon:'ic_stat_namoz',iconColor:'#123e35'},CapacitorHttp:{enabled:true},CapacitorCookies:{enabled:true}},
 server:{errorPath:'webview-update.html'},android:{allowMixedContent:false,minWebViewVersion:111}
};
export default config;
