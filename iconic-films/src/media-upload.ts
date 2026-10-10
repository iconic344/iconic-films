import {adminHeaders} from './admin-session';
const inferredMime=(name:string,type:string)=>{
  const ext=name.split('.').pop()?.toLowerCase();
  const inferred=({mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',m4v:'video/x-m4v',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif',mp3:'audio/mpeg',m4a:'audio/mp4',wav:'audio/wav',ogg:'audio/ogg',flac:'audio/flac',aac:'audio/aac',glb:'model/gltf-binary',gltf:'model/gltf+json',hdr:'image/vnd.radiance'} as Record<string,string>)[ext||''];
  return !type||type==='application/octet-stream'||type==='binary/octet-stream'?inferred||type:type;
};


type UploadTicket={
 uploadUrl:string;url:string;method:string;multipart?:boolean;contentType?:string;
 resumable?:boolean;tusEndpoint?:string;token?:string;bucketName?:string;objectName?:string;
 maxAppBytes?:number;effectiveLimitBytes?:number|null;globalLimitVerified?:boolean;
};
const MiB=1024*1024;
export function isStorageLimitError(message:string,status=0){
 return status===413||/maximum allowed size|file.?size.?limit|file too large|payload too large|entity too large|request entity too large|exceeded.*size|exceeds.*limit|size.?exceeded|ObjectTooLarge/i.test(message);
}
export function userFacingUploadError(message:string,fileSize:number,status=0){
 if(isStorageLimitError(message,status)){
  const size=(fileSize/MiB).toFixed(1);
  return '선택한 파일('+size+'MB)이 Supabase Storage의 실제 업로드 용량 제한을 초과했습니다. '+
   '사이트의 1GB 표시는 저장소 한도를 늘려주지 않습니다. Supabase → Storage → Settings → Global file size limit과 버킷의 파일 제한을 확인하세요. '+
   '무료 프로젝트는 파일당 최대 50MB이며, 그 이상을 그대로 올리려면 지원되는 저장소 요금제가 필요합니다.';
 }
 if(/Invalid Compact JWS|invalid.+signature|invalid.+jwt/i.test(message))
  return '서명된 업로드 주소를 검증하지 못했습니다. 관리자 로그인을 새로고침하고 다시 시도해 주세요.';
 return message||'업로드 중 서버 오류가 발생했습니다.';
}
function quotaAwareError(message:string,file:File,status=0){
 const error=Error(userFacingUploadError(message,file.size,status));
 if(isStorageLimitError(message,status))error.name='StorageQuotaError';
 return error;
}
function signedUpload(ticket:UploadTicket,file:File,progress?:(percent:number)=>void,signal?:AbortSignal):Promise<string>{
 return new Promise((resolve,reject)=>{
  if(!ticket.uploadUrl){reject(Error('서명 업로드 주소를 만들지 못했습니다.'));return}
  const xhr=new XMLHttpRequest(),abort=()=>xhr.abort(),cleanup=()=>signal?.removeEventListener('abort',abort);
  xhr.open('PUT',ticket.uploadUrl);
  xhr.responseType='json';
  xhr.upload.onprogress=e=>{
   if(e.lengthComputable)progress?.(Math.min(99,Math.round(e.loaded/e.total*100)));
  };
  xhr.onload=()=>{
   cleanup();
   if(xhr.status>=200&&xhr.status<300){progress?.(100);resolve(ticket.url);return}
   const body=xhr.response||{};
   const message=String(body.message||body.error_description||body.error||xhr.statusText||'');
   reject(quotaAwareError(message,file,xhr.status));
  };
  xhr.onerror=()=>{cleanup();reject(Error('Supabase Storage 연결이 끊겼습니다. 다시 시도해 주세요.'))};
  xhr.onabort=()=>{cleanup();reject(new DOMException('업로드 중지','AbortError'))};
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted){cleanup();reject(new DOMException('업로드 중지','AbortError'));return}
  const body=new FormData();
  body.append('cacheControl','86400');
  // Never materialize a second huge File: reuse the original browser Blob.
  body.append('',file,file.name);
  xhr.send(body);
 });
}

const TUS_CHUNK=6*MiB;
async function tusUpload(ticket:UploadTicket,file:File,progress?:(percent:number)=>void,signal?:AbortSignal):Promise<string>{
 if(!ticket.resumable||!ticket.tusEndpoint||!ticket.token||!ticket.bucketName||!ticket.objectName)
  throw Error('이어 올리기 사용 불가');
 const signature=ticket.token;
 const baseHeaders={'Tus-Resumable':'1.0.0','x-signature':signature};
 const meta=[
  ['bucketName',ticket.bucketName],['objectName',ticket.objectName],
  ['contentType',ticket.contentType||file.type||'application/octet-stream'],
  ['cacheControl','86400']
 ].map(([key,value])=>key+' '+btoa(value)).join(',');
 const created=await fetch(ticket.tusEndpoint,{
  method:'POST',
  headers:{...baseHeaders,'Upload-Length':String(file.size),'Upload-Metadata':meta},
  signal
 });
 if(!created.ok){
  const body=await created.text().catch(()=>'');
  throw quotaAwareError(body,file,created.status);
 }
 const location=created.headers.get('Location');
 if(!location)throw Error('Supabase Storage가 이어 올리기 위치를 반환하지 않았습니다.');
 const endpoint=new URL(location,ticket.tusEndpoint).toString();
 let offset=0,failures=0;
 while(offset<file.size){
  if(signal?.aborted)throw new DOMException('업로드 중지','AbortError');
  const end=Math.min(file.size,offset+TUS_CHUNK);
  try{
   const response=await fetch(endpoint,{
    method:'PATCH',
    headers:{...baseHeaders,'Content-Type':'application/offset+octet-stream','Upload-Offset':String(offset)},
    body:file.slice(offset,end),signal
   });
   if(!response.ok){
    const body=await response.text().catch(()=>'');
    if(isStorageLimitError(body,response.status))throw quotaAwareError(body,file,response.status);
    if(![408,409,429,500,502,503,504].includes(response.status))
      throw quotaAwareError(body||'이어 올리기 실패',file,response.status);
    throw Error('일시적인 저장소 응답 오류 ('+response.status+')');
   }
   const received=Number(response.headers.get('Upload-Offset'));
   offset=Number.isFinite(received)&&received>offset?received:end;
   failures=0;
   progress?.(Math.min(99,Math.round(offset/file.size*100)));
  }catch(err){
   if(signal?.aborted)throw err;
   if((err as Error).name==='StorageQuotaError'||isStorageLimitError((err as Error).message))throw err;
   if(++failures>4)throw err;
   await new Promise(resolve=>setTimeout(resolve,600*Math.pow(2,failures-1)));
   // After a dropped PATCH, resume from the server-confirmed offset.
   const status=await fetch(endpoint,{method:'HEAD',headers:baseHeaders,signal});
   if(!status.ok)throw Error('업로드 재개 위치를 읽지 못했습니다. 잠시 후 다시 시도하세요.');
   const remote=Number(status.headers.get('Upload-Offset'));
   if(Number.isFinite(remote)&&remote>=0&&remote<=file.size)offset=remote;
  }
 }
 progress?.(100);
 return ticket.url;
}

export async function uploadFile(file:File,progress?:(percent:number)=>void,signal?:AbortSignal):Promise<string> {
 const mime=inferredMime(file.name,file.type);
 if(mime&&mime!==file.type)file=new File([file],file.name,{type:mime,lastModified:file.lastModified});
 if(/\.exr$/i.test(file.name))throw Error('EXR은 현재 3D 뷰어에서 지원하지 않습니다. Radiance HDR(.hdr) 파일을 사용해 주세요.');
 if(/\.hdr$/i.test(file.name)) {
  const signature=await file.slice(0,10).text();
  if(!/^#\?(RADIANCE|RGBE)/.test(signature))throw Error('올바른 Radiance HDR 파일이 아닙니다.');
  file=new File([file],file.name,{type:'image/vnd.radiance'});
 }
 if(/\.(gltf|obj|fbx|stl|ply|zip)$/i.test(file.name)) {
  const {prepareModel}=await import('./model-upload');file=await prepareModel(file);
 }
 if(/\.glb$/i.test(file.name)&&new TextDecoder().decode(await file.slice(0,4).arrayBuffer())!=='glTF')throw Error('올바른 GLB 파일이 아닙니다.');
 if(signal?.aborted)throw new DOMException('업로드 중지','AbortError');
 // This ticket is a server-side preflight. Do not send gigabytes until checked.
 const response=await fetch('/api/upload',{
  method:'POST',signal,headers:{...adminHeaders(),'Content-Type':'application/json'},
  body:JSON.stringify({name:file.name,type:file.type,size:file.size})
 });
 const ticket=await response.json() as UploadTicket&{error?:string};
 if(!response.ok)throw quotaAwareError(ticket.error||'업로드 준비 실패',file,response.status);
 if(ticket.effectiveLimitBytes&&file.size>ticket.effectiveLimitBytes)
  throw quotaAwareError('exceeded maximum allowed size',file,413);
 // Supabase recommends resumable TUS for files above 6MB. Prior versions
 // hard-disabled it and sent every full-size movie as one large PUT.
 if(file.size>6*MiB&&ticket.resumable&&ticket.token&&ticket.tusEndpoint){
  try{return await tusUpload(ticket,file,progress,signal)}
  catch(error){
   if(signal?.aborted||(error as Error).name==='AbortError')throw error;
   if((error as Error).name==='StorageQuotaError'||isStorageLimitError((error as Error).message))throw error;
   // Signed resumable uploads can fail JWS validation on some projects;
   // fall back to the existing tested standard signed upload when compatible.
  }
 }
 return signedUpload(ticket,file,progress,signal);
}
export function videoPoster(file:File):Promise<File|null>{return new Promise(resolve=>{const video=document.createElement('video');video.muted=true;video.playsInline=true;const url=URL.createObjectURL(file);let done=false;const finish=(f:File|null)=>{if(done)return;done=true;clearTimeout(timer);video.removeAttribute('src');video.load();URL.revokeObjectURL(url);resolve(f)};const timer=setTimeout(()=>finish(null),5000);const capture=()=>{try{if(!video.videoWidth)return;const canvas=document.createElement('canvas');canvas.width=960;canvas.height=Math.round(960*video.videoHeight/video.videoWidth);canvas.getContext('2d')!.drawImage(video,0,0,canvas.width,canvas.height);canvas.toBlob(b=>finish(b?new File([b],'cover.jpg',{type:'image/jpeg'}):null),'image/jpeg',.82)}catch{finish(null)}};video.onloadeddata=()=>{if(Number.isFinite(video.duration)&&video.duration>1)video.currentTime=Math.min(1,video.duration/3);else capture()};video.onseeked=capture;video.onerror=()=>finish(null);video.src=url;video.load()})}
