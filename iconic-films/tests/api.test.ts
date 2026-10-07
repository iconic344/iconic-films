import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

test('standalone API: PIN, logout, chunk publication, upload, range and persistence',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'iconic-test-'));
  process.env.ICONIC_DATA_DIR=directory;delete process.env.VERCEL;delete process.env.SUPABASE_URL;
  const {handler}=await import('../server/handler');
  const server=createServer((req,res)=>{void handler(req,res)});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();assert(address&&typeof address==='object');const origin=`http://127.0.0.1:${address.port}`;
  let credentials:Record<string,string>={};
  const request=(route:string,method='GET',data?:unknown,extra:Record<string,string>={})=>fetch(origin+route,{method,headers:{...credentials,...(data?{'Content-Type':'application/json'}:{}),...extra},body:data?JSON.stringify(data):undefined});
  const login=async(pin='1211')=>{
    const res=await request('/api/auth','POST',{pin});if(res.ok){const j=await res.json();credentials={Cookie:res.headers.get('set-cookie')!.split(';')[0],'X-Iconic-Visit':j.visitKey}}return res;
  };
  try {
    const seed=(await (await request('/api/config')).json()).config;
    assert.equal(seed.tracks.length,28);assert.equal(seed.works.length,1);
    assert.equal((await request('/api/config','PUT',seed)).status,401);
    assert.equal((await request('/api/auth','POST',{pin:'0000'})).status,401);
    assert.equal((await login()).status,200);
    assert.equal((await (await request('/api/auth')).json()).authenticated,true);
    // Cookie alone is never sufficient, including reopening/reloading the site.
    const prior={...credentials};delete credentials['X-Iconic-Visit'];
    assert.equal((await (await request('/api/auth')).json()).authenticated,false);
    assert.equal((await request('/api/upload','POST',{name:'a.mp3',type:'audio/mpeg',size:4})).status,401);
    credentials=prior;
    assert.equal((await request('/api/config','PUT',seed,{Origin:'https://example.invalid'})).status,403);
    const lightingConfig={...seed,aboutLighting:{...seed.aboutLighting,environment:'/media/studio.hdr',exposure:1.1,toneMapping:'aces'},hdriEnvironments:[{url:'/media/studio.hdr',name:'studio.hdr'}],mainLogo:{...seed.mainLogo,modelLighting:{...seed.mainLogo.modelLighting,exposure:.8}}};
    const revision=randomUUID();const metadata={...lightingConfig,works:[],tracks:[],_mediaRevision:revision,_mediaChunks:{works:1,tracks:1}};
    assert.equal((await request('/api/config','PUT',metadata)).status,400);
    for(const kind of ['works','tracks'] as const)assert.equal((await request(`/api/config/chunk?revision=${revision}&kind=${kind}&index=0`,'POST',{items:seed[kind]})).status,200);
    assert.equal((await request('/api/config','PUT',metadata)).status,200);
    const published=(await (await request('/api/config')).json()).config;
    assert.equal(published._mediaRevision,revision);
    assert.equal(published.aboutLighting.exposure,1.1);assert.equal(published.mainLogo.modelLighting.exposure,.8);assert.equal(published.hdriEnvironments[0].name,'studio.hdr');
    assert.equal((await (await request(`/api/config/chunk?revision=${revision}&kind=tracks&index=0`)).json()).items.length,28);
    // A failed replacement cannot discard the previous published collection.
    assert.equal((await request('/api/config','PUT',{...metadata,_mediaRevision:randomUUID()})).status,400);
    assert.equal((await (await request('/api/config')).json()).config._mediaRevision,revision);
    const bytes=Buffer.from('glTFtest-model-content');
    const ticket=await (await request('/api/upload','POST',{name:'test.glb',type:'',size:bytes.length})).json();
    assert.equal(ticket.multipart,false);assert.equal(ticket.contentType,'model/gltf-binary');
    assert.equal((await fetch(origin+ticket.uploadUrl,{method:'PUT',headers:credentials,body:bytes})).status,200);
    const full=await request(ticket.url);assert.equal(full.status,200);assert.deepEqual(Buffer.from(await full.arrayBuffer()),bytes);
    const hdr=Buffer.from('#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n');
    const hdrTicket=await (await request('/api/upload','POST',{name:'studio.hdr',type:'image/vnd.radiance',size:hdr.length})).json();
    assert.equal(hdrTicket.contentType,'image/vnd.radiance');
    assert.equal((await fetch(origin+hdrTicket.uploadUrl,{method:'PUT',headers:credentials,body:hdr})).status,200);
    assert.equal((await request(hdrTicket.url)).headers.get('content-type'),'image/vnd.radiance');
    assert.equal((await request('/api/upload','POST',{name:'studio.exr',type:'image/x-exr',size:hdr.length})).status,400);
    const range=await request(ticket.url,'GET',undefined,{Range:'bytes=0-3'});assert.equal(range.status,206);assert.equal(await range.text(),'glTF');
    assert.equal((await request(ticket.url,'GET',undefined,{Range:'bytes=999-1000'})).status,416);
    assert.equal((await request('/api/upload','POST',{name:'large.mp4',type:'video/mp4',size:1048576001})).status,400);
    assert.equal((await request('/api/upload','POST',{name:'unsafe.svg',type:'image/svg+xml',size:100})).status,400);
    assert.equal((await request('/api/auth','DELETE')).status,200);
    assert.equal((await (await request('/api/auth')).json()).authenticated,false);
    assert.equal((await request('/api/config','PUT',seed)).status,401);
    assert.equal((await login()).status,200);
    assert.equal((await request('/api/security','PUT',{pin:'4321'})).status,200);
    assert.equal((await request('/api/config','PUT',seed)).status,401);
    assert.equal((await login()).status,401);assert.equal((await login('4321')).status,200);
    const state=JSON.parse(await readFile(path.join(directory,'state.json'),'utf8'));
    assert.equal(state.settings.config._mediaRevision,revision);assert.equal(state.settings.pin.length,64);
    assert.equal((await request('/api?__iconicPath=config')).status,200);
    // Exercise the actual frontend transport with a collection larger than a
    // Vercel Function body, rather than just calling manual small chunks.
    const originalFetch=globalThis.fetch,session=await import('../src/admin-session');
    session.rememberAdminVisit(credentials['X-Iconic-Visit']);
    globalThis.fetch=((input:any,options:any={})=>originalFetch(new URL(input,origin),{...options,headers:{Cookie:credentials.Cookie,...options.headers}})) as typeof fetch;
    try {
      const {api}=await import('../src/site-api');
      const large={...seed,tracks:Array.from({length:1200},(_,i)=>({...seed.tracks[0],id:String(i),title:'large collection '+i,artist:'A'.repeat(4000)}))};
      assert(Buffer.byteLength(JSON.stringify(large))>4.5*1024*1024);
      await api('/api/config','PUT',large);
      const restored=(await api('/api/config')).config;
      assert.equal(restored.tracks.length,1200);assert.equal(restored.tracks[1199].id,'1199');assert.equal(restored._mediaRevision,undefined);
    } finally {globalThis.fetch=originalFetch;session.clearAdminVisit();}
    // Failed attempts are persistent and locked after 8 failures.
    for(let i=0;i<8;i++)assert.equal((await request('/api/auth','POST',{pin:'9999'})).status,401);
    assert.equal((await request('/api/auth','POST',{pin:'4321'})).status,429);
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(directory,{recursive:true,force:true});}
});
