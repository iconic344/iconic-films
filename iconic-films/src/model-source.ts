// Avoid previously cached partial responses and failed viewer loads.
export function modelSource(src:string,retry=0){
 if(!src.startsWith('/api/media/'))return src;
 const url=new URL(src,'https://iconic.local');
 url.searchParams.set('model-response','2');
 if(retry)url.searchParams.set('retry',String(retry));
 return url.pathname+url.search+url.hash;
}
