import {loadEnv} from 'vite';
import {readdir,readFile,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createClient} from '@supabase/supabase-js';

Object.assign(process.env,loadEnv('production',process.cwd(),''));

const url=process.env.SUPABASE_URL?.trim();
const key=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const bucketName=(process.env.SUPABASE_STORAGE_BUCKET||'iconic-media').trim();

if(!url||!key){
  console.log('[legacy-media] Supabase env is unavailable in this build. Migration skipped.');
  process.exit(0);
}

const mediaRoot=path.resolve('public/media');
try{await stat(mediaRoot)}catch{
  console.log('[legacy-media] public/media does not exist. Nothing to migrate.');
  process.exit(0);
}

const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const bucket=supabase.storage.from(bucketName);

const mime=(file:string)=>{
  const ext=path.extname(file).toLowerCase();
  return ({
    '.mp4':'video/mp4','.webm':'video/webm','.mp3':'audio/mpeg','.wav':'audio/wav',
    '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp',
    '.gif':'image/gif','.glb':'model/gltf-binary','.gltf':'model/gltf+json',
    '.hdr':'image/vnd.radiance'
  } as Record<string,string>)[ext]||'application/octet-stream';
};

async function walk(dir:string):Promise<string[]>{
  const out:string[]=[];
  for(const entry of await readdir(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...await walk(full));
    else if(entry.isFile())out.push(full);
  }
  return out;
}

const marker=await supabase.from('iconic_settings').select('value').eq('key','legacy-media-migrated-v2').maybeSingle();
if(marker.error)throw marker.error;
if(marker.data?.value?.done===true){
  console.log('[legacy-media] Migration marker already exists. Skipping upload.');
  process.exit(0);
}

const files=await walk(mediaRoot);
if(!files.length){
  console.log('[legacy-media] public/media is empty. Nothing to migrate.');
  process.exit(0);
}

const replacements=new Map<string,string>();
let uploadedBytes=0;

for(const file of files){
  const relative=path.relative(mediaRoot,file).split(path.sep).join('/');
  const storagePath='legacy/'+relative;
  const bytes=await readFile(file);
  const {error}=await bucket.upload(storagePath,bytes,{
    contentType:mime(file),
    cacheControl:'31536000',
    upsert:true
  });
  if(error)throw new Error('[legacy-media] '+relative+': '+error.message);
  const publicUrl=bucket.getPublicUrl(storagePath).data.publicUrl;
  replacements.set('/media/'+relative,publicUrl);
  replacements.set('media/'+relative,publicUrl);
  uploadedBytes+=bytes.byteLength;
  console.log('[legacy-media] uploaded '+relative);
}

function replaceMedia(value:any):any{
  if(typeof value==='string'){
    let next=value;
    for(const [oldUrl,newUrl] of replacements)next=next.split(oldUrl).join(newUrl);
    return next;
  }
  if(Array.isArray(value))return value.map(replaceMedia);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,replaceMedia(v)]));
  return value;
}

// Migrate the live administrator configuration.
const configRow=await supabase.from('iconic_settings').select('key,value').eq('key','config').maybeSingle();
if(configRow.error)throw configRow.error;
if(configRow.data){
  const migrated=replaceMedia(configRow.data.value);
  const {error}=await supabase.from('iconic_settings').upsert({key:'config',value:migrated});
  if(error)throw error;
}

// Large work/music lists may be stored in media:* chunks. Migrate those too.
const chunks=await supabase.from('iconic_settings').select('key,value').like('key','media:%');
if(chunks.error)throw chunks.error;
if(chunks.data?.length){
  const rows=chunks.data.map(row=>({key:row.key,value:replaceMedia(row.value)}));
  const {error}=await supabase.from('iconic_settings').upsert(rows);
  if(error)throw error;
}

// Also migrate the bundled fallback snapshot used when cloud config is unavailable.
try{
  const configPath=path.resolve('src/site-config.json');
  const bundled=JSON.parse(await readFile(configPath,'utf8'));
  await writeFile(configPath,JSON.stringify(replaceMedia(bundled),null,2)+'\n');
}catch(error){
  console.warn('[legacy-media] bundled config was not rewritten:',(error as Error).message);
}

const markerValue={
  done:true,
  migratedAt:new Date().toISOString(),
  count:files.length,
  bytes:uploadedBytes,
  bucket:bucketName,
  prefix:'legacy/'
};
const saved=await supabase.from('iconic_settings').upsert({key:'legacy-media-migrated-v2',value:markerValue});
if(saved.error)throw saved.error;

console.log('[legacy-media] SUCCESS '+files.length+' files / '+uploadedBytes+' bytes migrated to Supabase.');
