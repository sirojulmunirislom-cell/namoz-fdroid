import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({request:vi.fn(),listen:vi.fn(),send:vi.fn()}));
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>true,getPlatform:()=> 'android'}}));
vi.mock('@capacitor/local-notifications',()=>({LocalNotifications:{requestPermissions:mocks.request,addListener:mocks.listen}}));
vi.mock('../src/api',()=>({send:mocks.send,api:vi.fn()}));
import {enableContentPush,requestLocalNotifications,initializeNotificationLinks,collectNativeNotifications} from '../src/notifications';
beforeEach(()=>{vi.clearAllMocks();mocks.request.mockResolvedValue({display:'granted'});mocks.listen.mockResolvedValue({remove:vi.fn()});});
afterEach(()=>vi.unstubAllGlobals());
it('reports the edition limitation without requesting cloud credentials or network access',async()=>{
 await expect(enableContentPush(null,'en',true)).rejects.toThrow('F-Droid');
 expect(mocks.send).not.toHaveBeenCalled();expect(mocks.request).not.toHaveBeenCalled();
});
it('still requests local notification permission and registers local notification actions',async()=>{
 await expect(requestLocalNotifications()).resolves.toBe(true);
 await initializeNotificationLinks();await collectNativeNotifications();
 expect(mocks.listen.mock.calls.map(c=>c[0])).toEqual(['localNotificationActionPerformed','localNotificationReceived']);
});
