import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createHash,randomUUID} from 'node:crypto';

async function testDatabase(){
  const tables:Record<string,Record<string,any>>={iconic_settings:{},iconic_sessions:{},iconic_attempts:{}};
  const server=createServer(async(req,res)=>{
    const url=new URL(req.url!,'http://local');res.setHeader('Content-Type','application/json');
    assert.equal(req.headers.authorization,'Bearer test-service-role');
    const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(chunk);
    const input=chunks.length?JSON.parse(Buffer.concat(chunks).toString()):null;
    const table=url.pathname.split('/').pop()!;
    if(url.pathname.includes('/rpc/')){
      if(table==='iconic_reset_pin'){tables.iconic_settings.pin={key:'pin',value:input.p_hash};tables.iconic_sessions={};}
      else if(table==='iconic_failed_attempt'){
        const prior=tables.iconic_attempts[input.p_key];
        tables.iconic_attempts[input.p_key]={key:input.p_key,count:prior&&prior.until>Date.now()?prior.count+1:1,until:Date.now()+600000};
      }else{res.statusCode=404;res.end('{}');return;}
      res.statusCode=204;res.end();return;
    }
    if(tables[table]){
      const keyField=table==='iconic_sessions'?'token':'key',filter=url.searchParams.get(keyField);
      const key=filter?.startsWith('eq.')?filter.slice(3):undefined;
      if(req.method==='GET'){res.end(JSON.stringify(key?(tables[table][key]?[tables[table][key]]:[]):Object.values(tables[table])));return;}
      if(req.method==='POST'){for(const row of Array.isArray(input)?input:[input])tables[table][row[keyField]]=row;res.statusCode=201;res.end();return;}
      if(req.method==='DELETE'){
        if(key)delete tables[table][key];
        else for(const [k,row] of Object.entries(tables[table]))if(row.expires<Number(url.searchParams.get('expires')?.slice(3)))delete tables[table][k];
        res.statusCode=204;res.end();return;
      }
    }
    res.statusCode=404;res.end('{"message":"unexpected test request"}');
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();assert(address&&typeof address==='object');
  return {server,tables,origin:'http://127.0.0.1:'+address.port};
}

test('actual Vercel API retains exported assets and revokes admin sessions',async()=>{
  const originalDirectory=process.cwd();
  const temporary=await mkdtemp(path.join(tmpdir(),'iconic-entry-'));
  const database=await testDatabase();
  process.env.SUPABASE_URL=database.origin;process.env.SUPABASE_SERVICE_ROLE_KEY='test-service-role';
  process.env.ADMIN_PIN='0846';process.env.ADMIN_SESSION_SECRET='test-only-session-secret';
  const originalFetch=globalThis.fetch;
  let legacyRequests=0;
  globalThis.fetch=async(input,init)=>{
    if(String(input).startsWith('https://iconic-films.tlscndgus9.chatgpt.site/')){legacyRequests++;return new Response('',{status:503});}
    return originalFetch(input,init);
  };
  const {default:handler}=await import('../api/index.ts');
  const server=createServer((req,res)=>{void handler(req,res)});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();assert(address&&typeof address==='object');
  const origin=`http://127.0.0.1:${address.port}`;
  try{
    for(const directory of [path.resolve(originalDirectory,'..'),temporary]){
      process.chdir(directory);
      const response=await fetch(origin+'/api/config');assert.equal(response.status,200);
      const {config}=await response.json();assert.equal(config.name,'ICONIC');
      assert.equal(config.works.length,1);assert.equal(config.tracks.length,28);
      assert(Object.keys(config).length>=64,'the full exported design configuration is retained');
      assert.equal(config.heroVideo,'/media/8091a227-4883-4f87-8a17-7645109f704b.mp4');
      assert.equal(config.aboutModel,'/media/viivii-sara-metallic.gltf');
      assert(config.tracks.every((track:any)=>track.url.startsWith('/media/')&&track.url.endsWith('.mp3')));
    }
    assert.equal(legacyRequests,0,'the standalone deployment never requests the original Sites runtime');
    const login=await fetch(origin+'/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin:'0846'})});
    assert.equal(login.status,200);const {visitKey}=await login.json();
    const cookie=login.headers.get('set-cookie')!.split(';')[0];
    const authenticated=await fetch(origin+'/api/auth',{headers:{Cookie:cookie,'X-Iconic-Visit':visitKey}});
    assert.equal((await authenticated.json()).authenticated,true);
    const cookieOnly=await fetch(origin+'/api/auth',{headers:{Cookie:cookie}});
    assert.equal((await cookieOnly.json()).authenticated,false);
    for(const pin of ['9999','1211']){
      const rejected=await fetch(origin+'/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin})});
      assert.equal(rejected.status,401,'only the configured administrator PIN is accepted');
    }
    const headers={Cookie:cookie,'X-Iconic-Visit':visitKey,'Content-Type':'application/json'};
    assert.equal((await fetch(origin+'/api/auth',{method:'DELETE',headers})).status,200);
    assert.equal((await (await fetch(origin+'/api/auth',{headers})).json()).authenticated,false);
    assert.equal((await fetch(origin+'/api/config',{method:'PUT',headers,body:JSON.stringify({name:'ICONIC',works:[],tracks:[]})})).status,401);
    const visit=randomUUID()+randomUUID(),forged=createHash('sha256').update('admin:'+visit+':0846').digest('hex');
    assert.equal((await (await fetch(origin+'/api/auth',{headers:{Cookie:'iconic_session='+forged,'X-Iconic-Visit':visit}})).json()).authenticated,false);
    async function loginAs(pin:string){
      const response=await fetch(origin+'/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin})});
      const data=await response.json();
      return {response,headers:{Cookie:(response.headers.get('set-cookie')||'').split(';')[0],'X-Iconic-Visit':data.visitKey||'','Content-Type':'application/json'}};
    }
    const again=await loginAs('0846');assert.equal(again.response.status,200);
    assert.equal((await fetch(origin+'/api/security',{method:'PUT',headers:again.headers,body:JSON.stringify({pin:'4950'})})).status,200);
    assert.equal((await (await fetch(origin+'/api/auth',{headers:again.headers})).json()).authenticated,false);
    assert.equal((await loginAs('0846')).response.status,401);
    const changed=await loginAs('4950');assert.equal(changed.response.status,200);
    for(const row of Object.values(database.tables.iconic_sessions))row.expires=Date.now()-1;
    assert.equal((await (await fetch(origin+'/api/auth',{headers:changed.headers})).json()).authenticated,false);
    process.env.ADMIN_PIN='0847';
    assert.equal((await loginAs('4950')).response.status,401);
    assert.equal((await loginAs('0847')).response.status,200);
    for(let i=0;i<8;i++)assert.equal((await loginAs('9999')).response.status,401);
    assert.equal((await loginAs('0847')).response.status,429);
  }finally{
    globalThis.fetch=originalFetch;
    process.chdir(originalDirectory);
    await new Promise<void>(resolve=>server.close(()=>resolve()));
    await new Promise<void>(resolve=>database.server.close(()=>resolve()));
    await rm(temporary,{recursive:true,force:true});
  }
});
