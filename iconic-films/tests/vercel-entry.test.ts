import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';

test('deployed API loads the exported portfolio from nested and unrelated working directories',async()=>{
  const originalDirectory=process.cwd();
  const temporary=await mkdtemp(path.join(tmpdir(),'iconic-entry-'));
  delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY;
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
      assert.equal(config.aboutModel,'/media/da61feaa-799d-45b5-8e01-81cd8ad8801a.glb');
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
  }finally{
    globalThis.fetch=originalFetch;
    process.chdir(originalDirectory);
    await new Promise<void>(resolve=>server.close(()=>resolve()));
    await rm(temporary,{recursive:true,force:true});
  }
});
