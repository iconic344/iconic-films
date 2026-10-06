import {memberHeaders} from './member-session';

export async function uploadMemberFile(memberId:string,file:File,progress?:(percent:number)=>void,signal?:AbortSignal):Promise<string>{
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
  const ticket=await response.json();
  if(!response.ok)throw Error(ticket.error||'업로드에 실패했습니다.');

  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();
    const abort=()=>xhr.abort();
    const cleanup=()=>signal?.removeEventListener('abort',abort);
    xhr.open(ticket.method,ticket.uploadUrl);
    xhr.responseType='json';
    xhr.upload.onprogress=e=>{if(e.lengthComputable)progress?.(Math.round(e.loaded/e.total*100))};
    xhr.onload=()=>{cleanup();if(xhr.status>=200&&xhr.status<300)resolve(ticket.url);else reject(Error(xhr.response?.error||xhr.response?.message||'업로드에 실패했습니다.'))};
    xhr.onerror=()=>{cleanup();reject(Error('연결이 끊겼습니다. 다시 시도해 주세요.'))};
    xhr.onabort=()=>{cleanup();reject(new DOMException('업로드 중지','AbortError'))};
    signal?.addEventListener('abort',abort,{once:true});
    if(signal?.aborted){cleanup();reject(new DOMException('업로드 중지','AbortError'));return}
    if(ticket.multipart){
      const body=new FormData();
      body.append('cacheControl','86400');
      body.append('',new File([file],file.name,{type:ticket.contentType||file.type}));
      xhr.send(body);
    }else{
      xhr.setRequestHeader('Content-Type',ticket.contentType||file.type||'application/octet-stream');
      xhr.send(file);
    }
  });
}
