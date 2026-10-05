// Persist admin authority only for the lifetime of the current browser tab.
// sessionStorage survives reloads/navigation in this tab, but is cleared when the tab/window closes.
const storageKey='viivii_admin_visit';
let visitKey=typeof window!=='undefined'?(window.sessionStorage.getItem(storageKey)||''):'';
let epoch=0;

export const getAdminVisitEpoch=()=>epoch;
export const hasAdminVisit=()=>!!visitKey;
export const adminHeaders=():Record<string,string>=>visitKey?{'X-Iconic-Visit':visitKey}:{};

export function rememberAdminVisit(key:string){
 visitKey=key;
 if(typeof window!=='undefined'){
  try{window.sessionStorage.setItem(storageKey,key)}catch{}
 }
}

export function clearAdminVisit(){
 visitKey='';
 epoch++;
 if(typeof window!=='undefined'){
  try{window.sessionStorage.removeItem(storageKey)}catch{}
 }
}

let pendingLock:Promise<void>=Promise.resolve();
export function revokeAdminVisit(){
 const headers=adminHeaders();clearAdminVisit();
 pendingLock=pendingLock.catch(()=>{}).then(async()=>{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),1200);
  try{
   const r=await fetch('/api/auth',{method:'DELETE',cache:'no-store',headers,keepalive:true,signal:controller.signal});
   if(!r.ok)throw Error('관리자 로그아웃에 실패했습니다. 다시 시도해 주세요.');
  }catch(e){
   if((e as Error).name!=='AbortError')throw e;
  }finally{clearTimeout(timer)}
 });
 return pendingLock;
}
export const waitForAdminLock=()=>pendingLock;
