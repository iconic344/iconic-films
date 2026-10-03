import type {IncomingMessage, ServerResponse} from 'node:http';
import {createHash, randomUUID, randomBytes, timingSafeEqual} from 'node:crypto';
import {mkdir, writeFile, stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import seed from '../src/site-config.json';
import {store, cloudStorage, supabase, bucketName, dataDirectory} from './store.ts';

const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const maxFile=100*1024*1024, maxConfig=10*1024*1024;
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
type RequestLike=IncomingMessage & {body?:any};
class HttpError extends Error {constructor(public status:number,message:string){super(message)}}
function header(req:RequestLike,key:string) {const v=req.headers[key];return Array.isArray(v)?v[0]:v||'';}
function cookieToken(req:RequestLike) {return header(req,'cookie').match(/(?:^|;\s*)iconic_session=([a-f0-9]{64})(?:;|$)/)?.[1];}
function sessionHash(req:RequestLike) {const cookie=cookieToken(req),visit=header(req,'x-iconic-visit');return cookie&&/^[a-f0-9-]{72}$/.test(visit)?hash('visit:'+cookie+':'+visit):undefined;}
function isSecure(req:RequestLike) {return !!process.env.VERCEL || header(req,'x-forwarded-proto')==='https';}
function sameOrigin(req:RequestLike) {
  const origin=header(req,'origin');if(!origin)return true;
  const expected=(isSecure(req)?'https':'http')+'://'+header(req,'host');
  return origin===expected;
}
async function authorized(req:RequestLike) {
  if(!sameOrigin(req))return false;
  const key=sessionHash(req);return !!key&&Number(await store().sessionGet(key))>Date.now();
}
async function requireAdmin(req:RequestLike) {if(!await authorized(req))throw new HttpError(401,'관리자 로그인이 필요합니다.');}
function json(res:ServerResponse,value:unknown,status=200) {
  res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  res.end(JSON.stringify(value));
}
async function raw(req:RequestLike,limit:number):Promise<Buffer> {
  const length=Number(header(req,'content-length'));
  if(length>limit)throw new HttpError(413,'요청 파일이 너무 큽니다.');
  const chunks:Buffer[]=[];let bytes=0;
  for await(const value of req){const chunk=Buffer.isBuffer(value)?value:Buffer.from(value);bytes+=chunk.length;if(bytes>limit)throw new HttpError(413,'요청 파일이 너무 큽니다.');chunks.push(chunk)}
  return Buffer.concat(chunks);
}
async function body(req:RequestLike):Promise<any> {
  if(req.body!==undefined){const text=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(Buffer.byteLength(text)>1024*1024)throw new HttpError(413,'편집 정보를 작은 단위로 나눠 저장하세요.');try{return typeof req.body==='string'?JSON.parse(req.body):req.body}catch{throw new HttpError(400,'올바른 JSON이 아닙니다.')}}
  try{return JSON.parse((await raw(req,1024*1024)).toString('utf8'))}catch(e){if(e instanceof HttpError)throw e;throw new HttpError(400,'올바른 JSON이 아닙니다.')}
}
function chunkKey(revision:string,kind:string,index:number) {return `media:${revision}:${kind}:${index}`;}
function chunkCoordinates(url:URL) {
  const revision=url.searchParams.get('revision')||'',kind=url.searchParams.get('kind')||'',value=url.searchParams.get('index');
  const index=Number(value);
  if(!uuid.test(revision)||!['works','tracks'].includes(kind)||value===null||!Number.isInteger(index)||index<0||index>1000)throw new HttpError(400,'목록 요청이 올바르지 않습니다.');
  return {revision,kind,index};
}
function validateConfig(c:any) {
  if(!c||typeof c.name!=='string'||!Array.isArray(c.works)||!Array.isArray(c.tracks))throw new HttpError(400,'입력 형식이 올바르지 않습니다.');
  if(Buffer.byteLength(JSON.stringify(c))>maxConfig)throw new HttpError(400,'편집 정보는 최대 10MB입니다.');
}
function normalizeUpload(name:string,type:string,size:number) {
  if(typeof name!=='string'||typeof type!=='string'||!Number.isInteger(size)||size<=0||size>maxFile)throw new HttpError(400,'파일은 최대 100MB입니다.');
  const ext=name.split('.').pop()?.toLowerCase();
  if(ext==='glb')return {type:'model/gltf-binary',ext:'glb'};
  if(ext==='gltf')return {type:'model/gltf+json',ext:'gltf'};
  if(ext==='exr')throw new HttpError(400,'EXR은 현재 3D 뷰어에서 지원하지 않습니다. Radiance HDR(.hdr) 파일을 사용해 주세요.');
  if(ext==='hdr')return {type:'image/vnd.radiance',ext:'hdr'};
  if(!/^(image|audio|video)\/[a-z0-9.+-]+$/i.test(type)||type==='image/svg+xml')throw new HttpError(400,'이미지·음악·영상·3D 파일을 지원합니다.');
  const safeExt=ext&&/^[a-z0-9]{1,8}$/.test(ext)?ext:'bin';return {type,ext:safeExt};
}
async function media(req:RequestLike,res:ServerResponse,id:string) {
  if(!uuid.test(id))throw new HttpError(404,'파일을 찾을 수 없습니다.');
  const entry=await store().get('file:'+id);
  if(!entry)throw new HttpError(404,'파일을 찾을 수 없습니다.');
  if(entry.url){res.statusCode=307;res.setHeader('Location',entry.url);res.end();return;}
  const filename=path.join(dataDirectory(),'media',entry.filename),info=await stat(filename);
  res.setHeader('Content-Type',entry.type);res.setHeader('Accept-Ranges','bytes');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','public, max-age=86400');
  const range=header(req,'range');let start=0,end=info.size-1;
  if(range){const m=range.match(/^bytes=(\d*)-(\d*)$/);if(!m||(!m[1]&&!m[2])){res.setHeader('Content-Range',`bytes */${info.size}`);res.statusCode=416;res.end();return;}
    if(!m[1])start=Math.max(0,info.size-Number(m[2]));else {start=Number(m[1]);if(m[2])end=Math.min(end,Number(m[2]));}
    if(start>end||start>=info.size){res.setHeader('Content-Range',`bytes */${info.size}`);res.statusCode=416;res.end();return;}
    res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${info.size}`);
  }else res.statusCode=200;
  res.setHeader('Content-Length',end-start+1);
  if(req.method==='HEAD'){res.end();return;}
  const stream=createReadStream(filename,{start,end});stream.on('error',()=>res.destroy());stream.pipe(res);
}

export async function handler(req:RequestLike,res:ServerResponse) {
  try {
    const url=new URL(req.url||'/',`http://${header(req,'host')||'localhost'}`),method=req.method||'GET';
    const route=url.searchParams.has('__iconicPath')?'/api/'+url.searchParams.get('__iconicPath'):url.pathname;
    if(!['GET','HEAD'].includes(method)&&!sameOrigin(req))throw new HttpError(403,'다른 사이트에서 관리자 요청을 보낼 수 없습니다.');
    if(route==='/api/auth') {
      if(method==='GET'){json(res,{authenticated:await authorized(req)});return;}
      if(method==='DELETE') {
        const key=sessionHash(req);if(key)await store().sessionDelete(key);
        res.setHeader('Set-Cookie','iconic_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'+(isSecure(req)?'; Secure':''));
        json(res,{ok:true});return;
      }
      if(method==='POST') {
        const key=hash(process.env.VERCEL?header(req,'x-forwarded-for').split(',')[0].trim():req.socket.remoteAddress||'local');
        const attempt=await store().attemptGet(key);
        if(attempt&&attempt.until>Date.now()&&attempt.count>=8)throw new HttpError(429,'시도 횟수를 초과했습니다. 10분 후 다시 시도해 주세요.');
        const {pin}=await body(req);if(typeof pin!=='string'||!/^\d{4}$/.test(pin))throw new HttpError(400,'숫자 4자리를 입력하세요.');
        const configured=(process.env.ADMIN_PIN||'').trim(),marker=configured?await store().get('pin-env-version'):undefined;
        const stored=configured&&marker!==hash('iconic:'+configured)?hash('iconic:'+configured):(await store().get('pin')||hash('iconic:1211'));
        const computed=hash('iconic:'+pin);
        if(typeof stored!=='string'||stored.length!==computed.length||!timingSafeEqual(Buffer.from(stored),Buffer.from(computed))){
          await store().attemptFail(key);throw new HttpError(401,'비밀번호가 일치하지 않습니다.');
        }
        await store().attemptClear(key);
        const token=randomBytes(32).toString('hex'),visitKey=randomUUID()+randomUUID();
        await store().sessionPut(hash('visit:'+token+':'+visitKey),Date.now()+21600000);
        res.setHeader('Set-Cookie','iconic_session='+token+'; HttpOnly; SameSite=Strict; Path=/'+(isSecure(req)?'; Secure':''));
        json(res,{ok:true,visitKey});return;
      }
    }
    if(route==='/api/security'&&method==='PUT') {
      await requireAdmin(req);const {pin}=await body(req);
      if(typeof pin!=='string'||!/^\d{4}$/.test(pin))throw new HttpError(400,'숫자 4자리를 입력하세요.');
      await store().resetPin(hash('iconic:'+pin));
      const configured=(process.env.ADMIN_PIN||'').trim();
      await store().put('pin-env-version',configured?hash('iconic:'+configured):'');
      json(res,{ok:true});return;
    }
    if(route==='/api/config/chunk') {
      const {revision,kind,index}=chunkCoordinates(url),key=chunkKey(revision,kind,index);
      if(method==='POST') {await requireAdmin(req);const {items}=await body(req);if(!Array.isArray(items)||items.length>100||Buffer.byteLength(JSON.stringify(items))>700000)throw new HttpError(400,'목록 항목의 정보가 너무 큽니다.');await store().put(key,{items,owner:sessionHash(req)});json(res,{ok:true});return;}
      if(method==='GET') {
        const c=await store().get('config');
        if(c?._mediaRevision!==revision||index>=c?._mediaChunks?.[kind])throw new HttpError(404,'목록을 찾을 수 없습니다.');
        const part=await store().get(key);if(!part)throw new HttpError(404,'목록을 찾을 수 없습니다.');json(res,{items:part.items});return;
      }
    }
    if(route==='/api/config') {
      if(method==='GET'){let config:any=seed;try{config=await store().get('config')||seed}catch(e){console.warn('ICONIC config fallback:',e)}json(res,{config});return;}
      if(method==='PUT') {
        await requireAdmin(req);const c=await body(req);validateConfig(c);
        if(c._mediaRevision) {
          if(!uuid.test(c._mediaRevision)||c.works.length||c.tracks.length)throw new HttpError(400,'편집 저장 요청이 올바르지 않습니다.');
          let size=Buffer.byteLength(JSON.stringify(c));
          const keys:string[]=[];
          for(const kind of ['works','tracks']) {
            const count=c._mediaChunks?.[kind];if(!Number.isInteger(count)||count<0||count>1000)throw new HttpError(400,'목록 크기가 올바르지 않습니다.');
            for(let i=0;i<count;i++)keys.push(chunkKey(c._mediaRevision,kind,i));
          }
          const parts=await store().getMany(keys);
          for(const key of keys){const part=parts.get(key);if(!part||part.owner!==sessionHash(req))throw new HttpError(400,'목록 저장이 완료되지 않았습니다.');size+=Buffer.byteLength(JSON.stringify(part.items));if(size>maxConfig)throw new HttpError(400,'편집 정보는 최대 10MB입니다.');}
        }
        await store().put('config',c);json(res,{ok:true});return;
      }
    }
    if(route==='/api/upload'&&method==='POST') {
      await requireAdmin(req);const input=await body(req),meta=normalizeUpload(input.name,input.type,input.size),id=randomUUID();
      const filename=id+'.'+meta.ext;
      if(cloudStorage()) {
        const bucket=supabase().storage.from(bucketName());const {data,error}=await bucket.createSignedUploadUrl(filename);
        if(error)throw error;
        const publicUrl=bucket.getPublicUrl(filename).data.publicUrl;
        json(res,{uploadUrl:data.signedUrl,url:publicUrl,method:'PUT',multipart:true,contentType:meta.type});return;
      }
      const token=randomUUID()+randomUUID();
      await store().put('ticket:'+id,{token:hash(token),name:input.name,type:meta.type,size:input.size,filename,expires:Date.now()+600000,owner:sessionHash(req)});
      json(res,{uploadUrl:`/api/upload/file/${id}?token=${token}`,url:`/api/media/${id}`,method:'PUT',multipart:false,contentType:meta.type});return;
    }
    const uploadMatch=route.match(/^\/api\/upload\/file\/([a-f0-9-]+)$/);
    if(uploadMatch&&method==='PUT') {
      await requireAdmin(req);const id=uploadMatch[1];if(!uuid.test(id))throw new HttpError(404,'업로드를 찾을 수 없습니다.');
      const ticket=await store().get('ticket:'+id);
      if(!ticket||ticket.expires<Date.now()||ticket.owner!==sessionHash(req)||ticket.token!==hash(url.searchParams.get('token')||'')||ticket.used)throw new HttpError(403,'업로드 권한이 만료되었습니다.');
      const bytes=await raw(req,ticket.size);
      if(bytes.length!==ticket.size)throw new HttpError(400,'파일 전송이 완료되지 않았습니다.');
      if(ticket.type==='model/gltf-binary'&&bytes.subarray(0,4).toString()!=='glTF')throw new HttpError(400,'올바른 GLB 파일이 아닙니다.');
      await mkdir(path.join(dataDirectory(),'media'),{recursive:true});await writeFile(path.join(dataDirectory(),'media',ticket.filename),bytes);
      await store().put('file:'+id,{filename:ticket.filename,type:ticket.type});await store().put('ticket:'+id,{...ticket,used:true});json(res,{ok:true});return;
    }
    const mediaMatch=route.match(/^\/api\/media\/([a-f0-9-]+)$/);
    if(mediaMatch&&['GET','HEAD'].includes(method)){await media(req,res,mediaMatch[1]);return;}
    throw new HttpError(404,'요청을 찾을 수 없습니다.');
  } catch(e) {
    if(res.headersSent){res.destroy();return;}
    if(e instanceof HttpError)json(res,{error:e.message},e.status);
    else {console.error('ICONIC API:',e);json(res,{error:'저장소에 연결하지 못했습니다. 환경 변수와 Supabase 초기 설정을 확인하세요.'},503);}
  }
}
