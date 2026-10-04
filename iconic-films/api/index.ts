import type {IncomingMessage,ServerResponse} from 'node:http';
import {createHash,randomUUID,randomBytes,timingSafeEqual} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
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
function owner(req:Req){const c=cookieToken(req),v=visitKey(req);return c&&/^[a-f0-9-]{72}$/.test(v)?hash('visit:'+c+':'+v):'';}
function checked(result:{error:any}){if(result.error)throw result.error;}
async function authorized(req:Req){
  if(!sameOrigin(req))return false;
  const token=owner(req);if(!token)return false;
  const result=await db().from('iconic_sessions').select('expires').eq('token',token).maybeSingle();
  checked(result);return Number(result.data?.expires)>Date.now();
}
async function requireAdmin(req:Req){if(!await authorized(req))throw new HttpError(401,'관리자 로그인이 필요합니다.');}
async function expectedPin(){
  const configured=process.env.ADMIN_PIN?.trim();
  if(configured&&/^\d{4}$/.test(configured))return hash('iconic:'+configured);
  const stored=await getSetting('pin');
  return typeof stored==='string'&&stored?stored:hash('iconic:1124');
}
function json(res:ServerResponse,value:unknown,status=200){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Iconic-Revision','iconic-recovery-20261003-v1');
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
  // Vercel may start a nested project from the repository root. Resolve the
  // traced JSON next to this module before trying working-directory layouts.
  const candidates=[
    fileURLToPath(new URL('../src/site-config.json',import.meta.url)),
    path.join(process.cwd(),'src','site-config.json'),
    path.join(process.cwd(),'iconic-films','src','site-config.json'),
  ];
  for(const file of candidates){
    try{
      const config=JSON.parse(readFileSync(file,'utf8'));
      if(config&&typeof config.name==='string'&&Array.isArray(config.works)&&Array.isArray(config.tracks))return config;
    }catch{}
  }
  // The React bundle already contains the exported snapshot. Null keeps that
  // fallback intact; empty arrays would overwrite and hide all existing media.
  return null;
}

const legacyOrigin='https://iconic-films.tlscndgus9.chatgpt.site';
let bundledMedia:Map<string,string>|undefined;
function mediaPaths(){
  if(bundledMedia)return bundledMedia;
  const paths=new Map<string,string>();
  function visit(value:any){
    if(typeof value==='string'){
      const match=value.match(/^\/media\/([a-f0-9-]{36})\.[a-z0-9]+$/i);
      if(match)paths.set(match[1],value);
    }else if(Array.isArray(value))value.forEach(visit);
    else if(value&&typeof value==='object')Object.values(value).forEach(visit);
  }
  visit(seed());
  return bundledMedia=paths;
}

function resolveLegacyMedia(value:any):any{
  if(typeof value==='string'){
    const local=value.startsWith(legacyOrigin+'/')?value.slice(legacyOrigin.length):value;
    const match=local.match(/^\/(?:api\/)?media\/([a-f0-9-]{36})(?:\.[a-z0-9]+)?$/i);
    return match?(mediaPaths().get(match[1])||value):value;
  }
  if(Array.isArray(value))return value.map(resolveLegacyMedia);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,resolveLegacyMedia(v)]));
  return value;
}

function fillMedia(current:any,fallback:any){
  const source=fallback&&typeof fallback==='object'?fallback:{};
  const base={...structuredClone(source),...(current&&typeof current==='object'?structuredClone(current):{})};
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
type ContactMessage={id:string;from:string;subject:string;message:string;createdAt:string;read:boolean;emailed:boolean};
async function getContactInbox():Promise<ContactMessage[]>{
  const value=await getSetting('contact-inbox').catch(()=>[]);
  return Array.isArray(value)?value.filter(item=>item&&typeof item.id==='string'&&typeof item.from==='string'&&typeof item.message==='string').slice(0,120):[];
}
async function putContactInbox(messages:ContactMessage[]){
  await putSetting('contact-inbox',messages.slice(0,120));
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
      if(method==='GET'){json(res,{authenticated:await authorized(req)});return;}
      if(method==='DELETE'){
        const key=owner(req);if(key)checked(await db().from('iconic_sessions').delete().eq('token',key));
        res.setHeader('Set-Cookie','iconic_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'+(isSecure(req)?'; Secure':''));
        json(res,{ok:true});return;
      }
      if(method==='POST'){
        const input=await body(req),pin=input?.pin;
        if(typeof pin!=='string'||!/^\d{4}$/.test(pin))throw new HttpError(400,'숫자 4자리를 입력하세요.');
        const key=hash(process.env.VERCEL?header(req,'x-forwarded-for').split(',')[0].trim():req.socket.remoteAddress||'local');
        const attempt=await db().from('iconic_attempts').select('count,until').eq('key',key).maybeSingle();checked(attempt);
        if(attempt.data&&Number(attempt.data.until)>Date.now()&&attempt.data.count>=8)throw new HttpError(429,'시도 횟수를 초과했습니다. 10분 후 다시 시도해 주세요.');
        const expected=await expectedPin(),computed=hash('iconic:'+pin);
        if(expected.length!==computed.length||!timingSafeEqual(Buffer.from(expected),Buffer.from(computed))){
          checked(await db().rpc('iconic_failed_attempt',{p_key:key}));
          throw new HttpError(401,'비밀번호가 일치하지 않습니다.');
        }
        checked(await db().from('iconic_attempts').delete().eq('key',key));
        const token=randomBytes(32).toString('hex'),visit=randomUUID()+randomUUID();
        checked(await db().from('iconic_sessions').delete().lt('expires',Date.now()));
        checked(await db().from('iconic_sessions').insert({token:hash('visit:'+token+':'+visit),expires:Date.now()+21600000}));
        res.setHeader('Set-Cookie','iconic_session='+token+'; HttpOnly; SameSite=Strict; Path=/'+(isSecure(req)?'; Secure':''));
        json(res,{ok:true,visitKey:visit});return;
      }
    }

    if(route==='/api/contact'){
      if(method==='GET'){
        await requireAdmin(req);
        json(res,{messages:await getContactInbox()});return;
      }

      if(method==='POST'){
        const input=await body(req);
        const from=typeof input?.from==='string'?input.from.trim():'';
        const subject=typeof input?.subject==='string'?input.subject.trim():'';
        const message=typeof input?.message==='string'?input.message.trim():'';
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)||from.length>180)throw new HttpError(400,'보내는 이메일 주소를 확인해 주세요.');
        if(subject.length>160)throw new HttpError(400,'제목은 160자 이하로 입력해 주세요.');
        if(!message||message.length>5000)throw new HttpError(400,'메시지는 1자 이상 5000자 이하로 입력해 주세요.');

        const ip=(process.env.VERCEL?header(req,'x-forwarded-for').split(',')[0].trim():req.socket.remoteAddress||'local');
        const rateKey='contact-rate:'+hash(ip).slice(0,32);
        const now=Date.now();
        const rate=await getSetting(rateKey).catch(()=>null) as {count?:number;until?:number}|null;
        if(rate&&Number(rate.until)>now&&Number(rate.count)>=5)throw new HttpError(429,'메시지 전송 횟수가 많습니다. 잠시 후 다시 시도해 주세요.');
        await putSetting(rateKey,{count:rate&&Number(rate.until)>now?Number(rate.count||0)+1:1,until:rate&&Number(rate.until)>now?Number(rate.until):now+600000});

        const item:ContactMessage={
          id:randomUUID(),
          from,
          subject:subject||'Project inquiry',
          message,
          createdAt:new Date().toISOString(),
          read:false,
          emailed:false
        };
        const inbox=await getContactInbox();
        await putContactInbox([item,...inbox]);

        const bundled=resolveLegacyMedia(seed());
        const stored=await getSetting('config').catch(()=>null);
        const config=stored||bundled?fillMedia(stored||bundled,bundled):null;
        const target=(process.env.CONTACT_TO_EMAIL?.trim()||config?.email?.trim()||'');
        const apiKey=process.env.RESEND_API_KEY?.trim();
        let emailDelivered=false;

        if(apiKey&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)){
          try{
            const sender=process.env.CONTACT_FROM_EMAIL?.trim()||'VIIVII sara <onboarding@resend.dev>';
            const response=await fetch('https://api.resend.com/emails',{
              method:'POST',
              headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},
              body:JSON.stringify({
                from:sender,
                to:[target],
                reply_to:from,
                subject:'VIIVII sara · '+item.subject,
                text:'From: '+from+'\n\n'+message
              })
            });
            emailDelivered=response.ok;
            if(!response.ok){
              const detail=await response.text().catch(()=>'');
              console.error('CONTACT EMAIL:',response.status,detail.slice(0,500));
            }
          }catch(error){
            console.error('CONTACT EMAIL:',error);
          }
        }

        if(emailDelivered){
          item.emailed=true;
          await putContactInbox([item,...inbox.filter(entry=>entry.id!==item.id)]);
        }
        json(res,{ok:true,stored:true,emailDelivered});return;
      }

      if(method==='PATCH'){
        await requireAdmin(req);
        const input=await body(req),id=input?.id;
        if(typeof id!=='string'||!uuid.test(id))throw new HttpError(400,'문의 ID가 올바르지 않습니다.');
        const inbox=await getContactInbox();
        const index=inbox.findIndex(item=>item.id===id);
        if(index<0)throw new HttpError(404,'문의를 찾을 수 없습니다.');
        inbox[index]={...inbox[index],read:input?.read!==false};
        await putContactInbox(inbox);
        json(res,{ok:true});return;
      }

      if(method==='DELETE'){
        await requireAdmin(req);
        const input=await body(req),id=input?.id;
        if(typeof id!=='string'||!uuid.test(id))throw new HttpError(400,'문의 ID가 올바르지 않습니다.');
        const inbox=await getContactInbox();
        await putContactInbox(inbox.filter(item=>item.id!==id));
        json(res,{ok:true});return;
      }
    }

    if(route==='/api/security'&&method==='PUT'){
      await requireAdmin(req);
      const input=await body(req),pin=input?.pin;
      if(typeof pin!=='string'||!/^\d{4}$/.test(pin))throw new HttpError(400,'숫자 4자리를 입력하세요.');
      checked(await db().rpc('iconic_reset_pin',{p_hash:hash('iconic:'+pin)}));
      const configured=process.env.ADMIN_PIN?.trim();
      await putSetting('pin-env-version',configured?hash('iconic:'+configured):'');
      json(res,{ok:true});return;
    }

    if(route==='/api/config/chunk'){
      const {revision,kind,index}=chunkCoordinates(url);
      const key=chunkKey(revision,kind,index);
      if(method==='POST'){
        await requireAdmin(req);
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
        const config=stored||bundled?fillMedia(stored||bundled,bundled):null;
        json(res,{config});return;
      }
      if(method==='PUT'){
        await requireAdmin(req);
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
      await requireAdmin(req);
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
