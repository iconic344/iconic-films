import {adminHeaders} from './admin-session';

async function request(url:string,method='GET',data?:unknown) {
  const response=await fetch(url,{method,cache:'no-store',headers:{...adminHeaders(),...(data!==undefined?{'Content-Type':'application/json'}:{})},body:data!==undefined?JSON.stringify(data):undefined});
  const raw=await response.text();
  let result:any={};
  try{result=raw?JSON.parse(raw):{}}catch{
    throw Error(response.ok?'서버 응답 형식이 올바르지 않습니다.':raw||`서버 오류 (${response.status})`);
  }
  if(!response.ok)throw Error(result.error||`요청에 실패했습니다. (${response.status})`);
  return result;
}

// Split collection metadata so even very large libraries stay below Vercel's body limit.
// The active revision changes only after ALL chunks have been stored successfully.
export async function api(url:string,method='GET',data?:any):Promise<any> {
  if(url==='/api/config'&&method==='PUT') {
    const revision=crypto.randomUUID(),counts={works:0,tracks:0};
    for(const kind of ['works','tracks'] as const) {
      for(let i=0;i<data[kind].length;i+=100) {
        const items=data[kind].slice(i,i+100);
        await request(`/api/config/chunk?revision=${revision}&kind=${kind}&index=${counts[kind]++}`,'POST',{items});
      }
    }
    return request(url,method,{...data,works:[],tracks:[],_mediaRevision:revision,_mediaChunks:counts});
  }
  const result=await request(url,method,data);
  if(url==='/api/config'&&method==='GET'&&result.config?._mediaRevision) {
    const config=result.config,revision=config._mediaRevision;
    for(const kind of ['works','tracks']) {
      const all:any[]=[];
      for(let i=0;i<config._mediaChunks[kind];i++) {
        const chunk=await request(`/api/config/chunk?revision=${revision}&kind=${kind}&index=${i}`);
        all.push(...chunk.items);
      }
      config[kind]=all;
    }
    delete config._mediaRevision;delete config._mediaChunks;
  }
  return result;
}
