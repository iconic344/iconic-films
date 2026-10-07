import type {IncomingMessage,ServerResponse} from 'node:http';
import {createHash,randomUUID,randomBytes,timingSafeEqual} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import tls from 'node:tls';
import net from 'node:net';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';

type Req=IncomingMessage & {body?:any};
class HttpError extends Error{constructor(public status:number,message:string){super(message)}}

const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const maxFile=1000*1024*1024;
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
  let parsed:URL;
  try{parsed=new URL(origin)}catch{return false}
  if(parsed.protocol!=='http:'&&parsed.protocol!=='https:')return false;

  // On Vercel a custom domain request can reach the Function with an internal
  // Host header while the browser Origin remains the public custom domain.
  // Prefer the proxy-preserved public host(s), but keep the direct Host for
  // local/dev and vercel.app access. This retains CSRF origin checking without
  // breaking administrator login on custom domains.
  const hosts=[
    header(req,'x-forwarded-host'),
    header(req,'x-vercel-forwarded-host'),
    header(req,'host')
  ].flatMap(value=>value.split(',')).map(value=>value.trim().toLowerCase()).filter(Boolean);
  if(!hosts.includes(parsed.host.toLowerCase()))return false;

  const forwardedProto=header(req,'x-forwarded-proto').split(',')[0]?.trim().toLowerCase();
  const expectedProto=process.env.VERCEL?'https':(forwardedProto||(isSecure(req)?'https':'http'));
  return parsed.protocol===expectedProto+':';
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
function memberVisit(req:Req){return header(req,'x-viivii-member-visit');}
async function memberAuthorized(req:Req,memberId:string){
  if(!sameOrigin(req)||!memberId)return false;
  const visit=memberVisit(req);
  if(!/^[a-f0-9-]{72}$/.test(visit))return false;
  const token=hash('member-visit:'+memberId+':'+visit);
  const result=await db().from('iconic_sessions').select('expires').eq('token',token).maybeSingle();
  checked(result);return Number(result.data?.expires)>Date.now();
}
async function requireMember(req:Req,memberId:string){
  if(!await memberAuthorized(req,memberId))throw new HttpError(401,'팀원 포트폴리오 로그인이 필요합니다.');
}
async function expectedMemberPin(memberId:string){
  const stored=await getSetting('member-pin:'+memberId).catch(()=>'');
  return typeof stored==='string'&&stored?stored:hash('member-pin:'+memberId+':1234');
}
async function currentConfigPair(){
  const bundled=resolveLegacyMedia(seed());
  const stored=await getSetting('config').catch(()=>null);
  const config=stored||bundled?fillMedia(stored||bundled,bundled):null;
  return {bundled,stored,config};
}
async function expectedPin(){
  const configured=process.env.ADMIN_PIN?.trim();
  const configuredHash=configured&&/^\d{4}$/.test(configured)?hash('iconic:'+configured):'';
  const stored=await getSetting('pin').catch(()=>'');
  if(configuredHash){
    const envVersion=await getSetting('pin-env-version').catch(()=>'');
    if(envVersion!==configuredHash){
      await putSetting('pin',configuredHash);
      await putSetting('pin-env-version',configuredHash);
      return configuredHash;
    }
    if(typeof stored==='string'&&stored)return stored;
    return configuredHash;
  }
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
type ContactMessage={id:string;from:string;subject:string;message:string;createdAt:string;read:boolean;emailed:boolean;repliedAt?:string};
async function getContactInbox():Promise<ContactMessage[]>{
  const value=await getSetting('contact-inbox').catch(()=>[]);
  return Array.isArray(value)?value.filter(item=>item&&typeof item.id==='string'&&typeof item.from==='string'&&typeof item.message==='string').slice(0,120):[];
}
async function putContactInbox(messages:ContactMessage[]){
  await putSetting('contact-inbox',messages.slice(0,120));
}
type MailProvider='gmail'|'naver';
type MailConnection={provider:MailProvider;email:string;appPassword:string;updatedAt:string};
const contactRate=new Map<string,{count:number;until:number}>();
async function getMailConnection():Promise<MailConnection|null>{
  const value=await getSetting('mail-connection').catch(()=>null) as Partial<MailConnection>|null;
  if(!value||!['gmail','naver'].includes(String(value.provider))||typeof value.email!=='string'||typeof value.appPassword!=='string')return null;
  return {provider:value.provider as MailProvider,email:value.email,appPassword:value.appPassword,updatedAt:typeof value.updatedAt==='string'?value.updatedAt:''};
}
function smtpHost(provider:MailProvider){return provider==='gmail'?'smtp.gmail.com':'smtp.naver.com';}
function smtpPassword(connection:MailConnection){return connection.provider==='gmail'?connection.appPassword.replace(/\s+/g,''):connection.appPassword.replace(/\s+/g,'');}
function smtpEndpoints(provider:MailProvider){
  return provider==='naver'
    ?[{port:587,secure:false},{port:465,secure:true}]
    :[{port:465,secure:true},{port:587,secure:false}];
}
function encodeHeader(value:string){return /[^\x20-\x7E]/.test(value)?'=?UTF-8?B?'+Buffer.from(value,'utf8').toString('base64')+'?=':value;}
function dotStuff(value:string){return value.replace(/\r?\n/g,'\r\n').replace(/(^|\r\n)\./g,'$1..');}
type SmtpSocket=net.Socket|tls.TLSSocket;
function smtpRead(socket:SmtpSocket){
  return new Promise<{code:number;text:string}>((resolve,reject)=>{
    let buffer='';
    const cleanup=()=>{socket.off('data',onData);socket.off('error',onError);socket.off('timeout',onTimeout)};
    const onError=(error:Error)=>{cleanup();reject(error)};
    const onTimeout=()=>{cleanup();reject(new Error('SMTP connection timeout'))};
    const onData=(chunk:Buffer|string)=>{
      buffer+=chunk.toString();
      const lines=buffer.split(/\r?\n/);
      for(let i=0;i<lines.length-1;i++){
        if(/^\d{3} /.test(lines[i])){
          const text=lines.slice(0,i+1).join('\n');
          cleanup();resolve({code:Number(lines[i].slice(0,3)),text});return;
        }
      }
    };
    socket.on('data',onData);socket.once('error',onError);socket.once('timeout',onTimeout);
  });
}
function connectPlain(host:string,port:number){
  return new Promise<net.Socket>((resolve,reject)=>{
    const socket=net.connect({host,port});
    const fail=(error:Error)=>{socket.destroy();reject(error)};
    socket.once('error',fail);
    socket.once('connect',()=>{socket.off('error',fail);resolve(socket)});
  });
}
function connectTls(host:string,port:number){
  return new Promise<tls.TLSSocket>((resolve,reject)=>{
    const socket=tls.connect({host,port,servername:host,rejectUnauthorized:true});
    const fail=(error:Error)=>{socket.destroy();reject(error)};
    socket.once('error',fail);
    socket.once('secureConnect',()=>{socket.off('error',fail);resolve(socket)});
  });
}
function upgradeStartTls(socket:net.Socket,host:string){
  return new Promise<tls.TLSSocket>((resolve,reject)=>{
    socket.removeAllListeners('data');
    const secure=tls.connect({socket,servername:host,rejectUnauthorized:true});
    const fail=(error:Error)=>{secure.destroy();reject(error)};
    secure.once('error',fail);
    secure.once('secureConnect',()=>{secure.off('error',fail);resolve(secure)});
  });
}
async function smtpAttempt(connection:MailConnection,mail:{to:string;subject:string;text:string}|undefined,endpoint:{port:number;secure:boolean}){
  const host=smtpHost(connection.provider);
  let socket:SmtpSocket=endpoint.secure?await connectTls(host,endpoint.port):await connectPlain(host,endpoint.port);
  socket.setTimeout(12000);
  const command=async(value:string|undefined,ok:number[])=>{
    if(value!==undefined)socket.write(value+'\r\n');
    const response=await smtpRead(socket);
    if(!ok.includes(response.code))throw new Error('SMTP '+response.code+' '+response.text.replace(/\s+/g,' ').slice(0,240));
    return response;
  };
  try{
    await command(undefined,[220]);
    await command('EHLO viivii-sara.site',[250]);
    if(!endpoint.secure){
      await command('STARTTLS',[220]);
      socket=await upgradeStartTls(socket as net.Socket,host);
      socket.setTimeout(12000);
      await command('EHLO viivii-sara.site',[250]);
    }
    await command('AUTH LOGIN',[334]);
    await command(Buffer.from(connection.email).toString('base64'),[334]);
    await command(Buffer.from(smtpPassword(connection)).toString('base64'),[235]);
    if(!mail){await command('QUIT',[221]).catch(()=>{});return}
    await command('MAIL FROM:<'+connection.email+'>',[250]);
    await command('RCPT TO:<'+mail.to+'>',[250,251]);
    await command('DATA',[354]);
    const message=[
      'From: VIIVII sara <'+connection.email+'>',
      'To: <'+mail.to+'>',
      'Subject: '+encodeHeader(mail.subject),
      'Date: '+new Date().toUTCString(),
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      'X-Mailer: VIIVII sara portfolio',
      '',
      dotStuff(mail.text),
      ''
    ].join('\r\n');
    socket.write(message+'\r\n.\r\n');
    const sent=await smtpRead(socket);
    if(sent.code!==250)throw new Error('SMTP '+sent.code+' '+sent.text.replace(/\s+/g,' ').slice(0,240));
    await command('QUIT',[221]).catch(()=>{});
  }finally{
    socket.end();
    socket.destroy();
  }
}
async function smtpSession(connection:MailConnection,mail?:{to:string;subject:string;text:string}){
  const errors:string[]=[];
  for(const endpoint of smtpEndpoints(connection.provider)){
    try{return await smtpAttempt(connection,mail,endpoint)}
    catch(error){errors.push((error as Error).message)}
  }
  const joined=errors.join(' | ');
  if(/535|auth|authentication|invalid credentials|login/i.test(joined)){
    throw new Error('SMTP authentication failed. 2-step verification, application password, and IMAP/SMTP access must be enabled.');
  }
  throw new Error(joined||'SMTP connection failed');
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
  if(typeof name!=='string'||typeof type!=='string'||!Number.isInteger(size)||size<=0||size>maxFile)throw new HttpError(400,'파일은 최대 1000MB(1GB)입니다.');
  const ext=name.split('.').pop()?.toLowerCase();
  if(ext==='glb')return {type:'model/gltf-binary',ext:'glb'};
  if(ext==='gltf')return {type:'model/gltf+json',ext:'gltf'};
  if(ext==='hdr')return {type:'image/vnd.radiance',ext:'hdr'};
  if(ext==='exr')throw new HttpError(400,'EXR은 지원하지 않습니다. HDR(.hdr)을 사용해 주세요.');
  if(!/^(image|audio|video)\/[a-z0-9.+-]+$/i.test(type)||type==='image/svg+xml')throw new HttpError(400,'이미지·음악·영상·3D 파일을 지원합니다.');
  return {type,ext:ext&&/^[a-z0-9]{1,8}$/.test(ext)?ext:'bin'};
}

const memberStringFields=[
  'name','role','bio','instagram','photo','portfolioTitle','portfolioIntro','portfolioCredits','portfolioTeamIndexLabel','portfolioReturnLabel',
  'portfolioNameFont','portfolioNameColor','portfolioRoleFont','portfolioRoleColor','portfolioBioFont','portfolioBioColor',
  'portfolioTitleFont','portfolioTitleColor','portfolioIntroFont','portfolioIntroColor','portfolioUtilityFont','portfolioUtilityColor'
] as const;
const memberNumberFields=[
  'photoRadius','photoSize','portfolioColumns','portfolioGap','portfolioRadius','portfolioProfileSize',
  'portfolioNameSize','portfolioNameX','portfolioNameY','portfolioRoleSize','portfolioRoleX','portfolioRoleY',
  'portfolioBioSize','portfolioBioX','portfolioBioY','portfolioTitleSize','portfolioTitleX','portfolioTitleY',
  'portfolioIntroSize','portfolioIntroX','portfolioIntroY','portfolioUtilitySize','portfolioUtilityX','portfolioUtilityY',
  'portfolioReturnX','portfolioReturnY','portfolioSliderWidth','portfolioSliderHeight','portfolioSliderAutoplayMs','portfolioSliderTransitionMs','portfolioGridWidth'
] as const;
const memberAlignFields=['portfolioNameAlign','portfolioRoleAlign','portfolioBioAlign','portfolioTitleAlign','portfolioIntroAlign','portfolioUtilityAlign'] as const;
function cleanMemberUpdate(current:any,input:any){
  if(!input||typeof input!=='object')throw new HttpError(400,'팀원 편집 정보가 올바르지 않습니다.');
  const next={...current};
  for(const key of memberStringFields){
    if(input[key]===undefined)continue;
    if(typeof input[key]!=='string')throw new HttpError(400,'문자 입력 형식이 올바르지 않습니다.');
    const limit=key==='bio'||key==='portfolioIntro'?5000:key==='portfolioCredits'?2000:key==='instagram'||key==='photo'?2048:400;
    if(input[key].length>limit)throw new HttpError(400,'입력 내용이 너무 깁니다.');
    next[key]=input[key];
  }
  if(typeof next.instagram==='string'&&next.instagram&& !/^https?:\/\//i.test(next.instagram))throw new HttpError(400,'Instagram 주소는 http:// 또는 https:// 주소로 입력해 주세요.');
  if(typeof next.photo==='string'&&next.photo&&!/^(https?:\/\/|\/)/i.test(next.photo))throw new HttpError(400,'프로필 미디어 주소가 올바르지 않습니다.');
  for(const key of memberNumberFields){
    if(input[key]===undefined)continue;
    if(typeof input[key]!=='number'||!Number.isFinite(input[key]))throw new HttpError(400,'숫자 설정이 올바르지 않습니다.');
    next[key]=input[key];
  }
  for(const key of memberAlignFields){
    if(input[key]===undefined)continue;
    if(!['left','center','right'].includes(input[key]))throw new HttpError(400,'정렬 설정이 올바르지 않습니다.');
    next[key]=input[key];
  }
  if(input.portfolioLayout!==undefined){
    if(input.portfolioLayout!=='grid'&&input.portfolioLayout!=='slider')throw new HttpError(400,'포트폴리오 보기 방식이 올바르지 않습니다.');
    next.portfolioLayout=input.portfolioLayout;
  }
  if(input.portfolioSliderAutoplay!==undefined){
    if(typeof input.portfolioSliderAutoplay!=='boolean')throw new HttpError(400,'슬라이더 자동재생 설정이 올바르지 않습니다.');
    next.portfolioSliderAutoplay=input.portfolioSliderAutoplay;
  }
  if(input.portfolioSliderEasing!==undefined){
    if(!['smooth','soft','snappy','linear'].includes(input.portfolioSliderEasing))throw new HttpError(400,'슬라이더 애니메이션 설정이 올바르지 않습니다.');
    next.portfolioSliderEasing=input.portfolioSliderEasing;
  }
  if(input.works!==undefined){
    if(!Array.isArray(input.works)||input.works.length>240||input.works.some((url:any)=>typeof url!=='string'||url.length>2048||!/^(https?:\/\/|\/)/i.test(url)))throw new HttpError(400,'포트폴리오 미디어 목록이 올바르지 않습니다.');
    next.works=[...input.works];
  }
  if(input.portfolioSubcategories!==undefined){
    if(!Array.isArray(input.portfolioSubcategories)||input.portfolioSubcategories.length>16||input.portfolioSubcategories.some((v:any)=>typeof v!=='string'||!v.trim()||v.length>40))throw new HttpError(400,'세부 카테고리 목록이 올바르지 않습니다.');
    next.portfolioSubcategories=Array.from(new Set(input.portfolioSubcategories.map((v:string)=>v.trim())));
  }
  if(input.portfolioWorkCategories!==undefined){
    if(!Array.isArray(input.portfolioWorkCategories)||input.portfolioWorkCategories.length>240||input.portfolioWorkCategories.some((v:any)=>typeof v!=='string'||v.length>40))throw new HttpError(400,'작품 세부 카테고리 정보가 올바르지 않습니다.');
    next.portfolioWorkCategories=[...input.portfolioWorkCategories];
  }
  if(input.portfolioWorkRatios!==undefined){
    const allowed=new Set(['auto','16:9','4:5','4:3','3:2','1:1','9:16']);
    if(!Array.isArray(input.portfolioWorkRatios)||input.portfolioWorkRatios.length>240||input.portfolioWorkRatios.some((v:any)=>typeof v!=='string'||!allowed.has(v)))throw new HttpError(400,'작품 표시 비율 정보가 올바르지 않습니다.');
    next.portfolioWorkRatios=[...input.portfolioWorkRatios];
  }
  // Member editors can never change routing, ownership, or public visibility.
  next.id=current.id;
  next.portfolioSlug=current.portfolioSlug;
  next.visible=current.visible;
  return next;
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

    if(route==='/api/team-auth'){
      const queryMemberId=url.searchParams.get('memberId')||header(req,'x-viivii-member')||'';
      if(method==='GET'){
        json(res,{authenticated:await memberAuthorized(req,queryMemberId),memberId:queryMemberId});return;
      }
      if(method==='DELETE'){
        const memberId=queryMemberId;
        const visit=memberVisit(req);
        if(memberId&&/^[a-f0-9-]{72}$/.test(visit)){
          checked(await db().from('iconic_sessions').delete().eq('token',hash('member-visit:'+memberId+':'+visit)));
        }
        json(res,{ok:true});return;
      }
      if(method==='POST'){
        const input=await body(req);
        const memberId=typeof input?.memberId==='string'?input.memberId:'';
        const pin=typeof input?.pin==='string'?input.pin:'';
        if(!memberId||memberId.length>100)throw new HttpError(400,'팀원 정보가 올바르지 않습니다.');
        if(!/^\d{4}$/.test(pin))throw new HttpError(400,'숫자 4자리를 입력하세요.');
        const {config}=await currentConfigPair();
        const member=config?.teamMembers?.find((item:any)=>item?.id===memberId&&item?.visible!==false);
        if(!member)throw new HttpError(404,'팀원 포트폴리오를 찾을 수 없습니다.');

        const ip=process.env.VERCEL?header(req,'x-forwarded-for').split(',')[0].trim():req.socket.remoteAddress||'local';
        const attemptKey=hash('member-login:'+memberId+':'+ip);
        const attempt=await db().from('iconic_attempts').select('count,until').eq('key',attemptKey).maybeSingle();checked(attempt);
        if(attempt.data&&Number(attempt.data.until)>Date.now()&&attempt.data.count>=8)throw new HttpError(429,'시도 횟수를 초과했습니다. 10분 후 다시 시도해 주세요.');
        const expected=await expectedMemberPin(memberId),computed=hash('member-pin:'+memberId+':'+pin);
        if(expected.length!==computed.length||!timingSafeEqual(Buffer.from(expected),Buffer.from(computed))){
          checked(await db().rpc('iconic_failed_attempt',{p_key:attemptKey}));
          throw new HttpError(401,'비밀번호가 일치하지 않습니다.');
        }
        checked(await db().from('iconic_attempts').delete().eq('key',attemptKey));
        const visit=randomUUID()+randomUUID();
        checked(await db().from('iconic_sessions').delete().lt('expires',Date.now()));
        checked(await db().from('iconic_sessions').insert({token:hash('member-visit:'+memberId+':'+visit),expires:Date.now()+43200000}));
        json(res,{ok:true,memberId,visitKey:visit});return;
      }
    }

    if(route==='/api/team-security'){
      await requireAdmin(req);
      if(method==='PUT'){
        const input=await body(req);
        const memberId=typeof input?.memberId==='string'?input.memberId:'';
        const pin=typeof input?.pin==='string'?input.pin:'';
        if(!memberId||memberId.length>100)throw new HttpError(400,'팀원 정보가 올바르지 않습니다.');
        if(!/^\d{4}$/.test(pin))throw new HttpError(400,'숫자 4자리를 입력하세요.');
        const {config}=await currentConfigPair();
        if(!config?.teamMembers?.some((item:any)=>item?.id===memberId))throw new HttpError(404,'팀원을 찾을 수 없습니다.');
        await putSetting('member-pin:'+memberId,hash('member-pin:'+memberId+':'+pin));
        json(res,{ok:true,memberId});return;
      }
    }

    if(route==='/api/team-self-security'){
      const memberId=header(req,'x-viivii-member')||'';
      if(!memberId||memberId.length>100)throw new HttpError(400,'팀원 정보가 올바르지 않습니다.');
      await requireMember(req,memberId);
      if(method==='PUT'){
        const input=await body(req);
        const pin=typeof input?.pin==='string'?input.pin:'';
        if(!/^\d{4}$/.test(pin))throw new HttpError(400,'숫자 4자리를 입력하세요.');
        const {config}=await currentConfigPair();
        if(!config?.teamMembers?.some((item:any)=>item?.id===memberId))throw new HttpError(404,'팀원을 찾을 수 없습니다.');
        await putSetting('member-pin:'+memberId,hash('member-pin:'+memberId+':'+pin));
        json(res,{ok:true,memberId});return;
      }
    }

    if(route==='/api/team-member'){
      const memberId=url.searchParams.get('memberId')||header(req,'x-viivii-member')||'';
      if(!memberId||memberId.length>100)throw new HttpError(400,'팀원 정보가 올바르지 않습니다.');
      await requireMember(req,memberId);
      const pair=await currentConfigPair();
      const member=pair.config?.teamMembers?.find((item:any)=>item?.id===memberId);
      if(!member)throw new HttpError(404,'팀원 포트폴리오를 찾을 수 없습니다.');
      if(method==='GET'){json(res,{member});return;}
      if(method==='PUT'){
        const input=await body(req);
        const updated=cleanMemberUpdate(member,input?.member);
        const raw=structuredClone(pair.stored||pair.config);
        if(!raw||!Array.isArray(raw.teamMembers))throw new HttpError(500,'사이트 설정을 불러올 수 없습니다.');
        const index=raw.teamMembers.findIndex((item:any)=>item?.id===memberId);
        if(index<0)throw new HttpError(404,'팀원 포트폴리오를 찾을 수 없습니다.');
        raw.teamMembers[index]={...raw.teamMembers[index],...updated,id:member.id,portfolioSlug:member.portfolioSlug,visible:member.visible};
        if(Buffer.byteLength(JSON.stringify(raw))>maxConfig)throw new HttpError(400,'편집 정보는 최대 10MB입니다.');
        await putSetting('config',raw);
        json(res,{ok:true,member:raw.teamMembers[index]});return;
      }
    }

    if(route==='/api/team-upload'&&method==='POST'){
      const input=await body(req);
      const memberId=typeof input?.memberId==='string'?input.memberId:header(req,'x-viivii-member')||'';
      if(!memberId||memberId.length>100)throw new HttpError(400,'팀원 정보가 올바르지 않습니다.');
      await requireMember(req,memberId);
      const {config}=await currentConfigPair();
      if(!config?.teamMembers?.some((item:any)=>item?.id===memberId))throw new HttpError(404,'팀원을 찾을 수 없습니다.');
      const meta=normalizeUpload(input.name,input.type,input.size);
      const filename=randomUUID()+'.'+meta.ext;
      const storage=db().storage.from(bucket());
      const {data,error}=await storage.createSignedUploadUrl(filename);
      if(error)throw error;
      const publicUrl=storage.getPublicUrl(filename).data.publicUrl;
      json(res,{uploadUrl:data.signedUrl,url:publicUrl,method:'PUT',multipart:true,contentType:meta.type});return;
    }

    if(route==='/api/mail'){
      await requireAdmin(req);
      if(method==='GET'){
        const connection=await getMailConnection();
        json(res,{connected:!!connection,provider:connection?.provider||'',email:connection?.email||'',updatedAt:connection?.updatedAt||''});return;
      }
      if(method==='PUT'){
        const input=await body(req);
        const provider=input?.provider==='gmail'||input?.provider==='naver'?input.provider:null;
        const email=typeof input?.email==='string'?input.email.trim():'';
        const appPassword=typeof input?.appPassword==='string'?input.appPassword.trim():'';
        if(!provider)throw new HttpError(400,'Gmail 또는 Naver Mail을 선택해 주세요.');
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>180)throw new HttpError(400,'메일 주소를 확인해 주세요.');
        if(appPassword.length<8||appPassword.length>160)throw new HttpError(400,'앱 비밀번호를 확인해 주세요.');
        if(provider==='gmail'&&!/@gmail\.com$/i.test(email))throw new HttpError(400,'Gmail 연결에는 @gmail.com 주소를 입력해 주세요.');
        if(provider==='naver'&&!/@naver\.com$/i.test(email))throw new HttpError(400,'Naver Mail 연결에는 @naver.com 주소를 입력해 주세요.');
        const connection:MailConnection={provider,email,appPassword,updatedAt:new Date().toISOString()};
        try{await smtpSession(connection)}catch(error){console.error('MAIL CONNECT:',error);throw new HttpError(502,'메일 계정 인증에 실패했습니다. 네이버 메일의 IMAP/SMTP를 사용함으로 켠 뒤, 일반 비밀번호가 아닌 새 애플리케이션 비밀번호로 다시 연결해 주세요.');}
        await putSetting('mail-connection',connection);
        json(res,{ok:true,connected:true,provider,email});return;
      }
      if(method==='DELETE'){
        await putSetting('mail-connection',null);
        json(res,{ok:true,connected:false});return;
      }
    }

    if(route==='/api/contact/reply'&&method==='POST'){
      await requireAdmin(req);
      const input=await body(req);
      const id=typeof input?.id==='string'?input.id:'';
      const to=typeof input?.to==='string'?input.to.trim():'';
      const subject=typeof input?.subject==='string'?input.subject.trim():'';
      const message=typeof input?.message==='string'?input.message.trim():'';
      if(!uuid.test(id))throw new HttpError(400,'문의 ID가 올바르지 않습니다.');
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)||to.length>180)throw new HttpError(400,'받는 이메일 주소를 확인해 주세요.');
      if(!subject||subject.length>180)throw new HttpError(400,'답장 제목을 확인해 주세요.');
      if(!message||message.length>8000)throw new HttpError(400,'답장 내용은 1자 이상 8000자 이하로 입력해 주세요.');

      const inbox=await getContactInbox();
      const index=inbox.findIndex(item=>item.id===id);
      if(index<0)throw new HttpError(404,'문의를 찾을 수 없습니다.');

      const connection=await getMailConnection();
      if(connection){
        try{
          await smtpSession(connection,{to,subject,text:message});
          inbox[index]={...inbox[index],read:true,repliedAt:new Date().toISOString()};
          await putContactInbox(inbox);
          json(res,{ok:true,delivered:true,provider:connection.provider,from:connection.email});return;
        }catch(error){
          console.error('CONTACT SMTP REPLY:',error);
          throw new HttpError(502,'연결된 메일 계정으로 답장을 보내지 못했습니다. 메일 연결 상태를 확인해 주세요.');
        }
      }

      const bundled=resolveLegacyMedia(seed());
      const stored=await getSetting('config').catch(()=>null);
      const config=stored||bundled?fillMedia(stored||bundled,bundled):null;
      const adminReply=(process.env.CONTACT_TO_EMAIL?.trim()||config?.email?.trim()||'');
      const apiKey=process.env.RESEND_API_KEY?.trim();

      if(apiKey){
        const sender=process.env.CONTACT_FROM_EMAIL?.trim()||'VIIVII sara <onboarding@resend.dev>';
        const response=await fetch('https://api.resend.com/emails',{
          method:'POST',
          headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},
          body:JSON.stringify({
            from:sender,
            to:[to],
            reply_to:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminReply)?adminReply:undefined,
            subject,
            text:message
          })
        });
        if(!response.ok){
          const detail=await response.text().catch(()=>'');
          console.error('CONTACT REPLY:',response.status,detail.slice(0,500));
          throw new HttpError(502,'사이트 내 이메일 전송에 실패했습니다. Gmail 또는 Naver Mail 연결 상태를 확인해 주세요.');
        }
        inbox[index]={...inbox[index],read:true,repliedAt:new Date().toISOString()};
        await putContactInbox(inbox);
        json(res,{ok:true,delivered:true,provider:'resend'});return;
      }

      const gmailUrl='https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(to)+'&su='+encodeURIComponent(subject)+'&body='+encodeURIComponent(message);
      const naverUrl='https://mail.naver.com/v2/new';
      json(res,{ok:true,delivered:false,providerRequired:true,gmailUrl,naverUrl});return;
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
        const website=typeof input?.website==='string'?input.website.trim():'';
        if(website){json(res,{ok:true,stored:true});return;}
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)||from.length>180)throw new HttpError(400,'보내는 이메일 주소를 확인해 주세요.');
        if(subject.length>160)throw new HttpError(400,'제목은 160자 이하로 입력해 주세요.');
        if(!message||message.length>5000)throw new HttpError(400,'메시지는 1자 이상 5000자 이하로 입력해 주세요.');

        const ip=(process.env.VERCEL?header(req,'x-forwarded-for').split(',')[0].trim():req.socket.remoteAddress||'local');
        const key=hash(ip).slice(0,32),now=Date.now();
        const rate=contactRate.get(key);
        if(rate&&rate.until>now&&rate.count>=5)throw new HttpError(429,'메시지 전송 횟수가 많습니다. 잠시 후 다시 시도해 주세요.');
        contactRate.set(key,{count:rate&&rate.until>now?rate.count+1:1,until:rate&&rate.until>now?rate.until:now+600000});
        if(contactRate.size>800)for(const [entry,value] of contactRate)if(value.until<=now)contactRate.delete(entry);

        const item:ContactMessage={id:randomUUID(),from,subject:subject||'Project inquiry',message,createdAt:new Date().toISOString(),read:false,emailed:false};
        const inbox=await getContactInbox();
        await putContactInbox([item,...inbox]);
        json(res,{ok:true,stored:true});return;
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
        const input=await body(req);
        const inbox=await getContactInbox();

        if(input?.all===true){
          await putContactInbox([]);
          json(res,{ok:true,deleted:inbox.length});return;
        }

        const ids=Array.isArray(input?.ids)?input.ids:(typeof input?.id==='string'?[input.id]:[]);
        if(!ids.length||ids.length>500||ids.some((id:any)=>typeof id!=='string'||!uuid.test(id)))throw new HttpError(400,'삭제할 문의 ID가 올바르지 않습니다.');
        const removeSet=new Set(ids);
        const next=inbox.filter(item=>!removeSet.has(item.id));
        await putContactInbox(next);
        json(res,{ok:true,deleted:inbox.length-next.length});return;
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
