/** Optional: upload copied static media to your own Supabase project. */
import {loadEnv} from 'vite';
import {readFile,writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
Object.assign(process.env,loadEnv('production',process.cwd(),''));
const {SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:key}=process.env;
if(!url||!key)throw Error('.env에 SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 설정하세요.');
const bucket=createClient(url,key,{auth:{persistSession:false}}).storage.from(process.env.SUPABASE_STORAGE_BUCKET||'iconic-media');
const manifest=JSON.parse(await readFile('docs/asset-manifest.json','utf8'));
const replacements=new Map<string,string>();
for(const asset of manifest){
  if(asset.status!=='copied')continue;
  const file=asset.local.split('/').pop();const bytes=await readFile('public'+asset.local);
  const {error}=await bucket.upload(file,bytes,{contentType:asset.contentType,cacheControl:'86400',upsert:true});
  if(error)throw Error(file+': '+error.message);
  replacements.set(asset.local,bucket.getPublicUrl(file).data.publicUrl);console.log('Uploaded '+file);
}
function replace(value:any):any{if(typeof value==='string')return replacements.get(value)||value;if(Array.isArray(value))return value.map(replace);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,replace(v)]));return value;}
const config=replace(JSON.parse(await readFile('src/site-config.json','utf8')));
await writeFile('src/site-config.json',JSON.stringify(config,null,2)+'\n');
console.log('설정의 미디어 경로를 새 Supabase로 변경했습니다. 다시 빌드·배포하세요. 이미 관리자에서 저장한 설정이 있으면 백업 후 새 스냅샷을 반영하세요.');
