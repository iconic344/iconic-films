import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import {mkdir, readFile, writeFile, rename} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

type LocalState = {
  settings: Record<string, unknown>;
  sessions: Record<string, number>;
  attempts: Record<string, {count:number;until:number}>;
};
export interface Store {
  get(key:string): Promise<any>;
  getMany(keys:string[]): Promise<Map<string,any>>;
  put(key:string, value:unknown): Promise<void>;
  sessionGet(token:string): Promise<number|undefined>;
  sessionPut(token:string, expires:number): Promise<void>;
  sessionDelete(token:string): Promise<void>;
  resetPin(hash:string): Promise<void>;
  attemptGet(key:string): Promise<{count:number;until:number}|undefined>;
  attemptFail(key:string): Promise<void>;
  attemptClear(key:string): Promise<void>;
}

export function dataDirectory() {return path.resolve(process.env.ICONIC_DATA_DIR || 'data');}

class LocalStore implements Store {
  private queue: Promise<unknown> = Promise.resolve();
  private file = path.join(dataDirectory(), 'state.json');
  private async read(): Promise<LocalState> {
    try {return JSON.parse(await readFile(this.file, 'utf8'));}
    catch (e:any) {if(e.code==='ENOENT') return {settings:{},sessions:{},attempts:{}}; throw e;}
  }
  private async mutate(fn:(s:LocalState)=>void) {
    const pending=this.queue.catch(()=>{}).then(async()=>{
      const s=await this.read();fn(s);await mkdir(path.dirname(this.file),{recursive:true});
      const temp=this.file+'.'+randomUUID()+'.tmp';
      await writeFile(temp,JSON.stringify(s),{mode:0o600});await rename(temp,this.file);
    });
    this.queue=pending;await pending;
  }
  async get(key:string) {await this.queue;return (await this.read()).settings[key];}
  async getMany(keys:string[]) {await this.queue;const s=await this.read();return new Map(keys.filter(k=>s.settings[k]!==undefined).map(k=>[k,s.settings[k]]));}
  async put(key:string,value:unknown) {await this.mutate(s=>{s.settings[key]=value});}
  async sessionGet(token:string) {await this.queue;return (await this.read()).sessions[token];}
  async sessionPut(token:string,expires:number) {await this.mutate(s=>{
    for(const [k,v] of Object.entries(s.sessions))if(v<Date.now())delete s.sessions[k];
    s.sessions[token]=expires;
  });}
  async sessionDelete(token:string) {await this.mutate(s=>{delete s.sessions[token]});}
  async resetPin(hash:string) {await this.mutate(s=>{s.settings.pin=hash;s.sessions={}});}
  async attemptGet(key:string) {await this.queue;return (await this.read()).attempts[key];}
  async attemptFail(key:string) {await this.mutate(s=>{
    const now=Date.now(),a=s.attempts[key];
    for(const [k,v] of Object.entries(s.attempts))if(v.until<now)delete s.attempts[k];
    s.attempts[key]={count:a&&a.until>now?a.count+1:1,until:now+600000};
  });}
  async attemptClear(key:string) {await this.mutate(s=>{delete s.attempts[key]});}
}

let supabaseClient:SupabaseClient|undefined;
export function supabase() {
  if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Supabase 환경 변수를 설정하세요.');
  return supabaseClient??=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
}
export const bucketName=()=>process.env.SUPABASE_STORAGE_BUCKET||'iconic-media';
export const cloudStorage=()=>!!(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY);
function checked<T>(r:{data:T;error:any}):T {if(r.error)throw r.error;return r.data;}
class CloudStore implements Store {
  async get(key:string) {const row=checked(await supabase().from('iconic_settings').select('value').eq('key',key).maybeSingle());return row?.value;}
  async getMany(keys:string[]) {
    const values=new Map<string,any>();
    for(let i=0;i<keys.length;i+=80){const rows=checked(await supabase().from('iconic_settings').select('key,value').in('key',keys.slice(i,i+80)));for(const row of rows||[])values.set(row.key,row.value);}
    return values;
  }
  async put(key:string,value:unknown) {checked(await supabase().from('iconic_settings').upsert({key,value}));}
  async sessionGet(token:string) {const row=checked(await supabase().from('iconic_sessions').select('expires').eq('token',token).maybeSingle());return row?Number(row.expires):undefined;}
  async sessionPut(token:string,expires:number) {
    checked(await supabase().from('iconic_sessions').delete().lt('expires',Date.now()));
    checked(await supabase().from('iconic_sessions').insert({token,expires}));
  }
  async sessionDelete(token:string) {checked(await supabase().from('iconic_sessions').delete().eq('token',token));}
  async resetPin(hash:string) {checked(await supabase().rpc('iconic_reset_pin',{p_hash:hash}));}
  async attemptGet(key:string) {const row=checked(await supabase().from('iconic_attempts').select('count,until').eq('key',key).maybeSingle());return row?{count:row.count,until:Number(row.until)}:undefined;}
  async attemptFail(key:string) {checked(await supabase().rpc('iconic_failed_attempt',{p_key:key}));}
  async attemptClear(key:string) {checked(await supabase().from('iconic_attempts').delete().eq('key',key));}
}
let instance:Store|undefined;
export function store():Store {
  // Vercel's temporary filesystem must never silently become a database.
  if(process.env.VERCEL&&!cloudStorage())throw Error('Vercel에 Supabase 환경 변수를 설정하세요.');
  return instance??=(cloudStorage()?new CloudStore():new LocalStore());
}
