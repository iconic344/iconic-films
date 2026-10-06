const prefix='viivii_member_visit:';

function storageKey(memberId:string){return prefix+memberId}

export function getMemberVisit(memberId:string){
  if(typeof window==='undefined')return '';
  try{return window.sessionStorage.getItem(storageKey(memberId))||''}catch{return ''}
}

export function hasMemberVisit(memberId:string){return !!getMemberVisit(memberId)}

export function rememberMemberVisit(memberId:string,visitKey:string){
  if(typeof window==='undefined')return;
  try{window.sessionStorage.setItem(storageKey(memberId),visitKey)}catch{}
}

export function clearMemberVisit(memberId:string){
  if(typeof window==='undefined')return;
  try{window.sessionStorage.removeItem(storageKey(memberId))}catch{}
}

export function memberHeaders(memberId:string):Record<string,string>{
  const visit=getMemberVisit(memberId);
  return visit?{'X-VIIVII-Member':memberId,'X-VIIVII-Member-Visit':visit}:{'X-VIIVII-Member':memberId};
}

export async function memberRequest(memberId:string,url:string,method='GET',data?:unknown){
  const response=await fetch(url,{method,cache:'no-store',headers:{...memberHeaders(memberId),...(data!==undefined?{'Content-Type':'application/json'}:{})},body:data!==undefined?JSON.stringify(data):undefined});
  const raw=await response.text();
  let result:any={};
  try{result=raw?JSON.parse(raw):{}}catch{throw Error(raw||`서버 오류 (${response.status})`)}
  if(!response.ok)throw Error(result.error||`요청에 실패했습니다. (${response.status})`);
  return result;
}
