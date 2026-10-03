import type {IncomingMessage,ServerResponse} from 'node:http';
import {createHash,randomUUID,timingSafeEqual} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';

type Req=IncomingMessage & {body?:any};
class HttpError extends Error{constructor(public status:number,message:string){super(message)}}

const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const maxFile=100*1024*1024;
const maxConfig=10*1024*1024;

let client:SupabaseClient|undefined;
function db(){
  const url=process.env.SUPABASE_URL?.trim();
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if(!url||!key)throw new Error('Supabase environment variables are missing');
  return client??=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
function bucket(){return process.env.SUPABASE_STORAGE_BUCKET?.trim()||'iconic-media';}
function header(req:Req,key:string){const v=req.headers[key];return Array.isArray(v)?v[0]:v||'';}
function isSecure(req:Req){return !!process.env.VERCEL||header(req,'x-forwarded-proto')==='https';}
function sameOrigin(req:Req){
  const origin=header(req,'origin');if(!origin)return true;
  const expected=(isSecure(req)?'https':'http')+'://'+header(req,'host');
  return origin===expected;
}
function cookieToken(req:Req){return header(req,'cookie').match(/(?:^|;\s*)iconic_session=([a-f0-9]{64})(?:;|$)/)?.[1];}
function visitKey(req:Req){return header(req,'x-iconic-visit');}
function sessionSecret(){return process.env.ADMIN_SESSION_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.ADMIN_PIN||'1211';}
function signedToken(visit:string){return hash('admin:'+visit+':'+sessionSecret());}
function owner(req:Req){const c=cookieToken(req),v=visitKey(req);return c&&v?hash('visit:'+c+':'+v):'';}
function authorized(req:Req){
  if(!sameOrigin(req))return false;
  const c=cookieToken(req),v=visitKey(req);
  if(!c||!/^[a-f0-9-]{72}$/.test(v))return false;
  const expected=signedToken(v);
  return c.length===expected.length&&timingSafeEqual(Buffer.from(c),Buffer.from(expected));
}
function requireAdmin(req:Req){if(!authorized(req))throw new HttpError(401,'관리자 로그인이 필요합니다.');}
function json(res:ServerResponse,value:unknown,status=200){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.end(JSON.stringify(value));
}
async function raw(req:Req,limit:number){
  const chunks:Buffer[]=[];let bytes=0;
  for await(const value of req){
    const chunk=Buffer.isBuffer(value)?value:Buffer.from(value);
    bytes+=chunk.length;if(bytes>limit)throw new HttpError(413,'요청이 너무 큽니다.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function body(req:Req){
  if(req.body!==undefined){
    if(typeof req.body==='object'&&req.body!==null)return req.body;
    if(typeof req.body==='string'){try{return JSON.parse(req.body)}catch{throw new HttpError(400,'올바른 JSON이 아닙니다.')}}
  }
  const buf=await raw(req,1024*1024);
  try{return JSON.parse(buf.toString('utf8')||'{}')}catch{throw new HttpError(400,'올바른 JSON이 아닙니다.')}
}
function seed(){
  try{
    const file=path.join(process.cwd(),'src','site-config.json');
    return JSON.parse(readFileSync(file,'utf8'));
  }catch{return {name:'ICONIC',works:[],tracks:[]};}
}

const legacyOrigin='https://iconic-films.tlscndgus9.chatgpt.site';

function resolveLegacyMedia(value:any):any{
  if(typeof value==='string'){
    const match=value.match(/^\/(?:api\/)?media\/([a-f0-9-]{36})(?:\.[a-z0-9]+)?$/i);
    return match?`${legacyOrigin}/api/media/${match[1]}`:value;
  }
  if(Array.isArray(value))return value.map(resolveLegacyMedia);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,resolveLegacyMedia(v)]));
  return value;
}

async function legacyConfig(){
  try{
    const response=await fetch(legacyOrigin+'/api/config',{cache:'no-store',signal:AbortSignal.timeout(4500)});
    if(!response.ok)return null;
    const payload=await response.json();
    return resolveLegacyMedia(payload?.config||payload);
  }catch{return null;}
}

function fillMedia(current:any,fallback:any){
  const base=current&&typeof current==='object'?structuredClone(current):{};
  const source=fallback&&typeof fallback==='object'?fallback:{};
  const fields=['heroPoster','heroVideo','logo','aboutImage','aboutModel','backgroundImage','backgroundVideo'];
  for(const key of fields)if((base[key]===undefined||base[key]===null||base[key]==='')&&source[key])base[key]=source[key];

  base.mainLogo={...(source.mainLogo||{}),...(base.mainLogo||{})};
  for(const key of ['image','model'])if(!base.mainLogo[key]&&source.mainLogo?.[key])base.mainLogo[key]=source.mainLogo[key];

  if((!Array.isArray(base.hdriEnvironments)||!base.hdriEnvironments.length)&&Array.isArray(source.hdriEnvironments)&&source.hdriEnvironments.length)base.hdriEnvironments=source.hdriEnvironments;
  if((!Array.isArray(base.musicPlaylists)||!base.musicPlaylists.length)&&Array.isArray(source.musicPlaylists)&&source.musicPlaylists.length)base.musicPlaylists=source.musicPlaylists;

  if(!base._mediaRevision){
    if((!Array.isArray(base.works)||!base.works.length)&&Array.isArray(source.works)&&source.works.length)base.works=source.works;
    else if(Array.isArray(base.works)&&Array.isArray(source.works)){
      const byId=new Map(source.works.map((w:any)=>[w.id,w]));
      base.works=base.works.map((w:any)=>{const s:any=byId.get(w.id);return s?{...w,poster:w.poster||s.poster||'',video:w.video||s.video||''}:w});
    }
    if((!Array.isArray(base.tracks)||!base.tracks.length)&&Array.isArray(source.tracks)&&source.tracks.length)base.tracks=source.tracks;
    else if(Array.isArray(base.tracks)&&Array.isArray(source.tracks)){
      const byId=new Map(source.tracks.map((t:any)=>[t.id,t]));
      base.tracks=base.tracks.map((t:any)=>{const s:any=byId.get(t.id);return s?{...t,url:t.url||s.url||'',cover:t.cover||s.cover||''}:t});
    }
  }
  return resolveLegacyMedia(base);
}
async function getSetting(key:string){
  const {data,error}=await db().from('iconic_settings').select('value').eq('key',key).maybeSingle();
  if(error)throw error;return data?.value;
}
async function putSetting(key:string,value:unknown){
  const {error}=await db().from('iconic_settings').upsert({key,value});
  if(error)throw error;
}
async function getMany(keys:string[]){
  const map=new Map<string,any>();
  for(let i=0;i<keys.length;i+=80){
    const {data,error}=await db().from('iconic_settings').select('key,value').in('key',keys.slice(i,i+80));
    if(error)throw error;
    for(const row of data||[])map.set(row.key,row.value);
  }
  return map;
}
function chunkKey(revision:string,kind:string,index:number){return `media:${revision}:${kind}:${index}`;}
function chunkCoordinates(url:URL){
  const revision=url.searchParams.get('revision')||'';
  const kind=url.searchParams.get('kind')||'';
  const value=url.searchParams.get('index');
  const index=Number(value);
  if(!uuid.test(revision)||!['works','tracks'].includes(kind)||value===null||!Number.isInteger(index)||index<0||index>1000)throw new HttpError(400,'목록 요청이 올바르지 않습니다.');
  return {revision,kind,index};
}
function validateConfig(c:any){
  if(!c||typeof c.name!=='string'||!Array.isArray(c.works)||!Array.isArray(c.tracks))throw new HttpError(400,'입력 형식이 올바르지 않습니다.');
  if(Buffer.byteLength(JSON.stringify(c))>maxConfig)throw new HttpError(400,'편집 정보는 최대 10MB입니다.');
}
function normalizeUpload(name:string,type:string,size:number){
  if(typeof name!=='string'||typeof type!=='string'||!Number.isInteger(size)||size<=0||size>maxFile)throw new HttpError(400,'파일은 최대 100MB입니다.');
  const ext=name.split('.').pop()?.toLowerCase();
  if(ext==='glb')return {type:'model/gltf-binary',ext:'glb'};
  if(ext==='gltf')return {type:'model/gltf+json',ext:'gltf'};
  if(ext==='hdr')return {type:'image/vnd.radiance',ext:'hdr'};
  if(ext==='exr')throw new HttpError(400,'EXR은 지원하지 않습니다. HDR(.hdr)을 사용해 주세요.');
  if(!/^(image|audio|video)\/[a-z0-9.+-]+$/i.test(type)||type==='image/svg+xml')throw new HttpError(400,'이미지·음악·영상·3D 파일을 지원합니다.');
  return {type,ext:ext&&/^[a-z0-9]{1,8}$/.test(ext)?ext:'bin'};
}

export default async function handler(req:Req,res:ServerResponse){
  try{
    const url=new URL(req.url||'/',`http://${header(req,'host')||'localhost'}`);
    const method=req.method||'GET';
    const route=url.searchParams.has('__iconicPath')?'/api/'+url.searchParams.get('__iconicPath'):url.pathname;

    if(!['GET','HEAD'].includes(method)&&!sameOrigin(req))throw new HttpError(403,'다른 사이트에서 관리자 요청을 보낼 수 없습니다.');

    if(route==='/api/auth'){
      if(method==='GET'){json(res,{authenticated:authorized(req)});return;}
      if(method==='DELETE'){
        res.setHeader('Set-Cookie',`iconic_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${isSecure(req)?'; Secure':''}`);
        json(res,{ok:true});return;
      }
      if(method==='POST'){
        const input=await body(req);
        const pin=input?.pin;
        if(typeof pin!=='string'||!/^\d{4}$/.test(pin))throw new HttpError(400,'숫자 4자리를 입력하세요.');

        const configuredPin=process.env.ADMIN_PIN?.trim();
        let stored:string|undefined;
        try{stored=await getSetting('pin')}catch{}
        const computed=hash('iconic:'+pin);
        const candidates=[
          configuredPin?hash('iconic:'+configuredPin):'',
          typeof stored==='string'?stored:'',
          hash('iconic:1124')
        ].filter(Boolean);
        const ok=candidates.some(expected=>expected.length===computed.length&&timingSafeEqual(Buffer.from(expected),Buffer.from(computed)));
        if(!ok)throw new HttpError(401,'비밀번호가 일치하지 않습니다.');
        try{await putSetting('pin',hash('iconic:1124'))}catch{}

        const visit=randomUUID()+randomUUID();
        const token=signedToken(visit);
        res.setHeader('Set-Cookie',`iconic_session=${token}; HttpOnly; SameSite=Strict; Path=/${isSecure(req)?'; Secure':''}`);
        json(res,{ok:true,visitKey:visit});return;
      }
    }

    if(route==='/api/security'&&method==='PUT'){
      requireAdmin(req);
      const input=await body(req),pin=input?.pin;
      if(typeof pin!=='string'||!/^\d{4}$/.test(pin))throw new HttpError(400,'숫자 4자리를 입력하세요.');
      await putSetting('pin',hash('iconic:'+pin));
      json(res,{ok:true});return;
    }

    if(route==='/api/config/chunk'){
      const {revision,kind,index}=chunkCoordinates(url);
      const key=chunkKey(revision,kind,index);
      if(method==='POST'){
        requireAdmin(req);
        const input=await body(req),items=input?.items;
        if(!Array.isArray(items)||items.length>100||Buffer.byteLength(JSON.stringify(items))>700000)throw new HttpError(400,'목록 항목의 정보가 너무 큽니다.');
        await putSetting(key,{items,owner:owner(req)});
        json(res,{ok:true});return;
      }
      if(method==='GET'){
        const cfg=await getSetting('config');
        if(cfg?._mediaRevision!==revision||index>=cfg?._mediaChunks?.[kind])throw new HttpError(404,'목록을 찾을 수 없습니다.');
        const part=await getSetting(key);
        if(!part)throw new HttpError(404,'목록을 찾을 수 없습니다.');
        json(res,{items:part.items});return;
      }
    }

    if(route==='/api/config'){
      if(method==='GET'){
        const bundled=resolveLegacyMedia(seed());
        let stored:any=null;
        try{stored=await getSetting('config')}catch{}
        const legacy=await legacyConfig();
        const fallback=legacy||bundled;
        const config=fillMedia(stored||bundled,fallback);
        try{
          if(!stored||JSON.stringify(stored)!==JSON.stringify(config))await putSetting('config',config);
        }catch{}
        json(res,{config});return;
      }
      if(method==='PUT'){
        requireAdmin(req);
        const cfg=await body(req);
        validateConfig(cfg);
        if(cfg._mediaRevision){
          if(!uuid.test(cfg._mediaRevision)||cfg.works.length||cfg.tracks.length)throw new HttpError(400,'편집 저장 요청이 올바르지 않습니다.');
          const keys:string[]=[];
          for(const kind of ['works','tracks']){
            const count=cfg._mediaChunks?.[kind];
            if(!Number.isInteger(count)||count<0||count>1000)throw new HttpError(400,'목록 크기가 올바르지 않습니다.');
            for(let i=0;i<count;i++)keys.push(chunkKey(cfg._mediaRevision,kind,i));
          }
          const parts=await getMany(keys);
          let size=Buffer.byteLength(JSON.stringify(cfg));
          for(const key of keys){
            const part=parts.get(key);
            if(!part||part.owner!==owner(req))throw new HttpError(400,'목록 저장이 완료되지 않았습니다.');
            size+=Buffer.byteLength(JSON.stringify(part.items));
            if(size>maxConfig)throw new HttpError(400,'편집 정보는 최대 10MB입니다.');
          }
        }
        await putSetting('config',cfg);
        json(res,{ok:true});return;
      }
    }

    if(route==='/api/upload'&&method==='POST'){
      requireAdmin(req);
      const input=await body(req);
      const meta=normalizeUpload(input.name,input.type,input.size);
      const filename=randomUUID()+'.'+meta.ext;
      const storage=db().storage.from(bucket());
      const {data,error}=await storage.createSignedUploadUrl(filename);
      if(error)throw error;
      const publicUrl=storage.getPublicUrl(filename).data.publicUrl;
      json(res,{uploadUrl:data.signedUrl,url:publicUrl,method:'PUT',multipart:true,contentType:meta.type});return;
    }

    throw new HttpError(404,'요청을 찾을 수 없습니다.');
  }catch(e){
    if(e instanceof HttpError){json(res,{error:e.message},e.status);return;}
    console.error('ICONIC API:',e);
    json(res,{error:'서버 연결에 실패했습니다. Vercel 로그를 확인해 주세요.'},500);
  }
}
