import { Capacitor, registerPlugin } from '@capacitor/core';
export interface PositionOptions {enableHighAccuracy?:boolean; timeout?:number; maximumAge?:number}
type PermissionState = 'prompt'|'prompt-with-rationale'|'granted'|'denied';
interface PermissionStatus {location:PermissionState;coarseLocation:PermissionState}
interface Position {timestamp:number;coords:{latitude:number;longitude:number;accuracy:number;altitude:number|null;altitudeAccuracy:number|null;heading:number|null;speed:number|null}}
const AndroidLocation=registerPlugin<{checkPermissions():Promise<PermissionStatus>;requestPermissions(options:{requirePrecise:boolean}):Promise<PermissionStatus>;getCurrentPosition(options:PositionOptions):Promise<Position>}>('NamozLocation');
export async function checkLocationPermissions():Promise<PermissionStatus> {
 if(Capacitor.getPlatform()==='android')return AndroidLocation.checkPermissions();
 const p=await navigator.permissions.query({name:'geolocation'});return {location:p.state,coarseLocation:p.state};
}
export async function requestLocationPermissions(requirePrecise=false):Promise<PermissionStatus>{
 if(Capacitor.getPlatform()==='android')return AndroidLocation.requestPermissions({requirePrecise});
 await currentDevicePosition({});return {location:'granted',coarseLocation:'granted'};
}
export function currentDevicePosition(options:PositionOptions):Promise<Position>{
 return Capacitor.getPlatform()==='android'?AndroidLocation.getCurrentPosition(options):new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,options));
}
