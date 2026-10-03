import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer, type Server} from 'node:http';
import {randomUUID} from 'node:crypto';

async function listen(server:Server) {await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const a=server.address();assert(a&&typeof a==='object');return `http://127.0.0.1:${a.port}`;}
test('Vercel/Supabase adapter uses service credentials only on the server and signed direct uploads',async()=>{
  const tables:Record<string,Record<string,any>>={iconic_settings:{},iconic_sessions:{},iconic_attempts:{}};
  let storageOrigin='';let signedRequests=0;
  const storage=createServer(async(req,res)=>{
    const u=new URL(req.url!,'http://local'),table=u.pathname.split('/').pop()!;
    res.setHeader('Content-Type','application/json');
    assert.equal(req.headers.authorization,'Bearer test-service-role');
    const read=async()=>{const parts=[];for await(const p of req)parts.push(p);return parts.length?JSON.parse(Buffer.concat(parts).toString()):null;};
    if(u.pathname.startsWith('/storage/v1/object/upload/sign/')) {
      signedRequests++;res.end(JSON.stringify({url:u.pathname.replace('/storage/v1','')+'?token=test-signed-token'}));return;
    }
    if(tables[table]) {
      const keyField=table==='iconic_sessions'?'token':'key';
      const filter=u.searchParams.get(keyField),eq=filter?.startsWith('eq.')?filter.slice(3):undefined;
      if(req.method==='GET'){const rows=filter?.startsWith('in.')?filter.slice(4,-1).split(',').map(k=>tables[table][k.replace(/^"|"$/g,'')]).filter(Boolean):eq?(tables[table][eq]?[tables[table][eq]]:[]):Object.values(tables[table]);res.end(JSON.stringify(rows));return;}
      if(req.method==='POST'){const rows=await read();for(const row of Array.isArray(rows)?rows:[rows])tables[table][row[keyField]]=row;res.statusCode=201;res.end();return;}
      if(req.method==='DELETE') {if(eq)delete tables[table][eq];else for(const [key,v] of Object.entries(tables[table]))if(v.expires<Number(u.searchParams.get('expires')?.replace('lt.','')))delete tables[table][key];res.statusCode=204;res.end();return;}
    }
    res.statusCode=404;res.end(JSON.stringify({message:'Unexpected adapter request'}));
  });
  storageOrigin=await listen(storage);
  process.env.SUPABASE_URL=storageOrigin;process.env.SUPABASE_SERVICE_ROLE_KEY='test-service-role';process.env.VERCEL='1';
  const {handler}=await import('../server/handler');const api=createServer((req,res)=>{void handler(req,res)});const origin=await listen(api);
  try {
    const login=await fetch(origin+'/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin:'1211'})});
    assert.equal(login.status,200);const data=await login.json();assert.match(login.headers.get('set-cookie')!,/Secure/);
    const credentials={Cookie:login.headers.get('set-cookie')!.split(';')[0],'X-Iconic-Visit':data.visitKey,'Content-Type':'application/json'};
    const seed=(await (await fetch(origin+'/api/config')).json()).config;
    const revision=randomUUID();
    for(const kind of ['works','tracks']){
      const saved=await fetch(`${origin}/api/config/chunk?revision=${revision}&kind=${kind}&index=0`,{method:'POST',headers:credentials,body:JSON.stringify({items:seed[kind]})});assert.equal(saved.status,200);
    }
    const publication=await fetch(origin+'/api/config',{method:'PUT',headers:credentials,body:JSON.stringify({...seed,works:[],tracks:[],_mediaRevision:revision,_mediaChunks:{works:1,tracks:1}})});
    assert.equal(publication.status,200);assert.equal(tables.iconic_settings.config.value._mediaRevision,revision);
    const upload=await fetch(origin+'/api/upload',{method:'POST',headers:credentials,body:JSON.stringify({name:'model.glb',type:'',size:1024})});
    assert.equal(upload.status,200);const ticket=await upload.json();assert.equal(ticket.multipart,true);assert.equal(ticket.method,'PUT');assert.equal(ticket.contentType,'model/gltf-binary');
    assert(ticket.uploadUrl.startsWith(storageOrigin+'/storage/v1/object/upload/sign/iconic-media/'));
    assert(ticket.url.startsWith(storageOrigin+'/storage/v1/object/public/iconic-media/'));assert.equal(signedRequests,1);
    // Verify the actual frontend's XHR contract as well.
    const session=await import('../src/admin-session');session.rememberAdminVisit(data.visitKey);
    const originalFetch=globalThis.fetch;
    const calls:any[]=[];
    class Xhr {
      status=200;response={};responseType='';upload:any={};onload?:()=>void;onerror?:()=>void;onabort?:()=>void;
      headers:Record<string,string>={};method='';url='';
      open(method:string,url:string){this.method=method;this.url=url;}
      setRequestHeader(k:string,v:string){this.headers[k]=v;}
      send(body:FormData){calls.push({method:this.method,url:this.url,headers:this.headers,body});this.onload?.();}
      abort(){this.onabort?.();}
    }
    (globalThis as any).XMLHttpRequest=Xhr;
    globalThis.fetch=(async()=>new Response(JSON.stringify(ticket),{headers:{'Content-Type':'application/json'}})) as typeof fetch;
    try {
      const {uploadFile}=await import('../src/media-upload');const result=await uploadFile(new File(['glTFfake'],'test.glb'));
      assert.equal(result,ticket.url);assert.deepEqual(calls[0].headers,{});assert.equal(calls[0].method,'PUT');
      assert(calls[0].body instanceof FormData);assert.equal(calls[0].body.get('cacheControl'),'86400');
      assert.equal(calls[0].body.get('').type,'model/gltf-binary');
    }finally{globalThis.fetch=originalFetch;delete (globalThis as any).XMLHttpRequest;session.clearAdminVisit();}
  }finally{await new Promise<void>(r=>api.close(()=>r()));await new Promise<void>(r=>storage.close(()=>r()));}
});
