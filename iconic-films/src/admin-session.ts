// Intentionally memory-only: a navigation, reload, or restored page needs a new PIN check.
let visitKey='',epoch=0;
export const getAdminVisitEpoch=()=>epoch;
export const adminHeaders=():Record<string,string>=>visitKey?{'X-Iconic-Visit':visitKey}:{};
export function rememberAdminVisit(key:string){visitKey=key;}
export function clearAdminVisit(){visitKey='';epoch++;}
let pendingLock:Promise<void>=Promise.resolve();
export function revokeAdminVisit(){
 const headers=adminHeaders();clearAdminVisit();
 pendingLock=pendingLock.catch(()=>{}).then(async()=>{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),1200);try{const r=await fetch('/api/auth',{method:'DELETE',cache:'no-store',headers,keepalive:true,signal:controller.signal});if(!r.ok)throw Error('관리자 로그아웃에 실패했습니다. 다시 시도해 주세요.')}catch(e){if((e as Error).name!=='AbortError')throw e}finally{clearTimeout(timer)}});
 return pendingLock;
}
export const waitForAdminLock=()=>pendingLock;
