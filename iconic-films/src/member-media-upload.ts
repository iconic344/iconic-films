import {memberHeaders} from './member-session';
const inferredMime=(name:string,type:string)=>{
  const ext=name.split('.').pop()?.toLowerCase();
  const inferred=({mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',m4v:'video/x-m4v',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif',mp3:'audio/mpeg',m4a:'audio/mp4',wav:'audio/wav',ogg:'audio/ogg',flac:'audio/flac',aac:'audio/aac'} as Record<string,string>)[ext||''];
  return !type||type==='application/octet-stream'||type==='binary/octet-stream'?inferred||type:type;
};

type UploadTicket={uploadUrl:string;url:string;method:string;multipart?:boolean;contentType?:string;resumable?:boolean;tusEndpoint?:string;token?:string;bucketName?:string;objectName?:string};
const uploadError=async(response:Response)=>{
  let detail='';try{const body=await response.json();detail=body?.message||body?.error||body?.code||''}catch{detail=await response.text().catch(()=>'')}
  if(response.status===413||/payload too large|entity too large/i.test(detail))return Error('파일 크기가 현재 Supabase Storage 한도를 초과했습니다. 사이트 코드는 1GB까지 허용하지만 Storage의 Global/Bucket 파일 크기 제한도 같은 크기로 열려 있어야 합니다.');
  return Error(detail||('업로드에 실패했습니다. HTTP '+response.status));
};
const b64=(value:string)=>btoa(unescape(encodeURIComponent(value)));

function signedUpload(ticket:UploadTicket,file:File,progress?:(percent:number)=>void,signal?:AbortSignal):Promise<string>{
  return new Promise((resolve,reject)=>{
    if(!ticket.uploadUrl){reject(Error('서명 업로드 주소를 만들지 못했습니다.'));return}
    const xhr=new XMLHttpRequest(),abort=()=>xhr.abort(),cleanup=()=>signal?.removeEventListener('abort',abort);
    xhr.open('PUT',ticket.uploadUrl);xhr.responseType='json';xhr.setRequestHeader('x-upsert','false');
    xhr.upload.onprogress=e=>{if(e.lengthComputable)progress?.(Math.round(e.loaded/e.total*100))};
    xhr.onload=()=>{
      cleanup();
      if(xhr.status>=200&&xhr.status<300){progress?.(100);resolve(ticket.url);return}
      const message=xhr.response?.message||xhr.response?.error||'';
      if(xhr.status===413||/payload too large|entity too large/i.test(message)){reject(Error('Supabase Storage의 실제 파일 크기 제한을 초과했습니다. 사이트 업로더는 1GB까지 열려 있으므로 Supabase Storage의 Global/Bucket 제한도 파일 크기 이상이어야 합니다.'));return}
      if(/Invalid Compact JWS/i.test(message)){reject(Error('Supabase 서명 업로드 토큰 검증에 실패했습니다. 새 업로드 주소로 다시 시도해 주세요.'));return}
      reject(Error(message||('업로드에 실패했습니다. HTTP '+xhr.status)));
    };
    xhr.onerror=()=>{cleanup();reject(Error('Storage 연결이 끊겼습니다. 다시 시도해 주세요.'))};
    xhr.onabort=()=>{cleanup();reject(new DOMException('업로드 중지','AbortError'))};
    signal?.addEventListener('abort',abort,{once:true});
    if(signal?.aborted){cleanup();reject(new DOMException('업로드 중지','AbortError'));return}
    const body=new FormData();
    body.append('cacheControl','86400');
    body.append('',new File([file],file.name,{type:ticket.contentType||file.type||'application/octet-stream'}));
    xhr.send(body);
  });
}

async function resumableUpload(ticket:UploadTicket,file:File,progress?:(percent:number)=>void,signal?:AbortSignal){
  if(!ticket.tusEndpoint||!ticket.token||!ticket.bucketName||!ticket.objectName)throw Error('대용량 업로드 정보를 만들지 못했습니다.');
  const common={'Tus-Resumable':'1.0.0','x-signature':ticket.token};
  const metadata=[
    ['bucketName',ticket.bucketName],
    ['objectName',ticket.objectName],
    ['contentType',ticket.contentType||file.type||'application/octet-stream'],
    ['cacheControl','86400']
  ].map(([key,value])=>key+' '+b64(value)).join(',');
  const created=await fetch(ticket.tusEndpoint,{method:'POST',signal,headers:{...common,'Upload-Length':String(file.size),'Upload-Metadata':metadata,'x-upsert':'false'}});
  if(!created.ok)throw await uploadError(created);
  const location=created.headers.get('Location');
  if(!location)throw Error('대용량 업로드 주소를 받지 못했습니다.');
  const uploadUrl=new URL(location,ticket.tusEndpoint).toString();
  const chunkSize=6*1024*1024;
  let offset=Number(created.headers.get('Upload-Offset')||0);
  progress?.(Math.round(offset/file.size*100));
  while(offset<file.size){
    if(signal?.aborted)throw new DOMException('업로드 중지','AbortError');
    const chunk=file.slice(offset,Math.min(file.size,offset+chunkSize));
    let completed=false,lastError:unknown;
    for(let attempt=0;attempt<5&&!completed;attempt++){
      try{
        const response=await fetch(uploadUrl,{method:'PATCH',signal,headers:{...common,'Content-Type':'application/offset+octet-stream','Upload-Offset':String(offset)},body:chunk});
        if(response.ok){
          const next=Number(response.headers.get('Upload-Offset'));
          offset=Number.isFinite(next)&&next>offset?next:offset+chunk.size;
          progress?.(Math.min(100,Math.round(offset/file.size*100)));
          completed=true;break;
        }
        if(response.status===413)throw await uploadError(response);
        lastError=await uploadError(response);
      }catch(error){
        if((error as Error).name==='AbortError')throw error;
        lastError=error;
      }
      try{
        const head=await fetch(uploadUrl,{method:'HEAD',signal,headers:common});
        if(head.ok){
          const serverOffset=Number(head.headers.get('Upload-Offset'));
          if(Number.isFinite(serverOffset)&&serverOffset>offset){
            offset=serverOffset;progress?.(Math.min(100,Math.round(offset/file.size*100)));completed=true;break;
          }
        }
      }catch(error){if((error as Error).name==='AbortError')throw error}
      await new Promise(resolve=>setTimeout(resolve,[0,800,1800,3500,6000][attempt]||6000));
    }
    if(!completed)throw lastError instanceof Error?lastError:Error('대용량 업로드가 중단되었습니다. 다시 시도해 주세요.');
  }
  return ticket.url;
}

export async function uploadMemberFile(memberId:string,file:File,progress?:(percent:number)=>void,signal?:AbortSignal):Promise<string>{
  const mime=inferredMime(file.name,file.type);
  if(mime&&mime!==file.type)file=new File([file],file.name,{type:mime,lastModified:file.lastModified});
  if(/\.exr$/i.test(file.name))throw Error('EXR은 현재 3D 뷰어에서 지원하지 않습니다. Radiance HDR(.hdr) 파일을 사용해 주세요.');
  if(/\.hdr$/i.test(file.name)){
    const signature=await file.slice(0,10).text();
    if(!/^#\?(RADIANCE|RGBE)/.test(signature))throw Error('올바른 Radiance HDR 파일이 아닙니다.');
    file=new File([file],file.name,{type:'image/vnd.radiance'});
  }
  if(/\.(gltf|obj|fbx|stl|ply|zip)$/i.test(file.name)){
    const {prepareModel}=await import('./model-upload');
    file=await prepareModel(file);
  }
  if(/\.glb$/i.test(file.name)&&new TextDecoder().decode(await file.slice(0,4).arrayBuffer())!=='glTF')throw Error('올바른 GLB 파일이 아닙니다.');
  if(signal?.aborted)throw new DOMException('업로드 중지','AbortError');

  const response=await fetch('/api/team-upload',{
    method:'POST',
    signal,
    headers:{...memberHeaders(memberId),'Content-Type':'application/json'},
    body:JSON.stringify({memberId,name:file.name,type:file.type,size:file.size})
  });
  const ticket=await response.json() as UploadTicket&{error?:string};
  if(!response.ok)throw Error(ticket.error||'업로드에 실패했습니다.');
  // Signed standard uploads support large objects directly and avoid the current
  // x-signature/TUS JWS failure seen on this Storage project. The request still
  // goes browser -> Supabase Storage, never through Vercel, so app request-size
  // limits do not apply.
  return signedUpload(ticket,file,progress,signal);

}
}
