/* Verify that a browser can decode an uploaded VIDEO, not just store it.
   Supabase accepting the bytes says nothing about codec or seek/readability.
   The validator never uploads, changes the config, or autoplays sound. */
export type VideoCheck='ready'|'unsupported'|'timeout';
export function checkVideoPlayback(source:File|string,waitMs=12000):Promise<VideoCheck>{
 if(typeof document==='undefined')return Promise.resolve('timeout');
 return new Promise(resolve=>{
  const element=document.createElement('video');
  const local=typeof source!=='string';
  const src=local?URL.createObjectURL(source):source;
  let finished=false;
  const finish=(status:VideoCheck)=>{
   if(finished)return;
   finished=true;
   clearTimeout(timer);
   element.removeEventListener('loadeddata',onReady);
   element.removeEventListener('canplay',onReady);
   element.removeEventListener('error',onError);
   element.pause();
   element.removeAttribute('src');
   element.load();
   if(local)URL.revokeObjectURL(src);
   resolve(status);
  };
  const onReady=()=>{if(element.readyState>=2&&element.videoWidth>0)finish('ready')};
  const onError=()=>finish('unsupported');
  const timer=setTimeout(()=>finish('timeout'),waitMs);
  element.muted=true;
  element.defaultMuted=true;
  element.playsInline=true;
  element.preload='auto';
  element.addEventListener('loadeddata',onReady);
  element.addEventListener('canplay',onReady);
  element.addEventListener('error',onError);
  element.src=src;
  element.load();
 });
}
