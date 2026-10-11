// Read-only live browser verification. Does not log into EDIT SITE or mutate data.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const origin = 'https://viiviisara.com';
const browser = await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
async function collect(page, selector) {
 return await page.locator(selector).first().evaluate(v=>{
  const style=getComputedStyle(v);
  const rect=v.getBoundingClientRect();
  return {
   currentSrc:v.currentSrc||v.src,
   readyState:v.readyState,
   videoWidth:v.videoWidth,
   videoHeight:v.videoHeight,
   duration:v.duration,
   currentTime:v.currentTime,
   paused:v.paused,
   loop:v.loop,
   muted:v.muted,
   objectFit:style.objectFit,
   objectPosition:style.objectPosition,
   rect:{width:Math.round(rect.width),height:Math.round(rect.height)}
  };
 });
}
async function verifyViewport(width,height,checkLoop=false){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
 page.on('pageerror',e=>console.log('Browser JS error:',String(e).slice(0,220)));
 page.on('response',response=>{if(/\/media\/viivii-hero-777|\/api\/config/.test(response.url()))console.log('NETWORK',response.status(),response.url())});
 page.on('requestfailed',request=>{if(/\/media\/|\/api\//.test(request.url()))console.log('REQUEST FAILED',request.failure()?.errorText,request.url())});
 try{
  // GitHub and Vercel are independent deployment pipelines. Do not
  // mistake a still-cached old release for the commit being verified.
  let deployed=false;
  for(let attempt=0;attempt<18;attempt++){
   const probeUrl=origin+'/?verified_sha='+encodeURIComponent(process.env.GITHUB_SHA||'main')+'&try='+attempt;
   const response=await page.goto(probeUrl,{waitUntil:'domcontentloaded',timeout:30000});
   assert.equal(response?.status(),200,'Site homepage must respond 200');
   try{
    await page.locator('.site .hero-media-shell .media-gallery.is-passive-preview').first()
      .waitFor({state:'attached',timeout:4500});
    deployed=true;break;
   }catch{
    console.log('WAITING FOR NEW DEPLOYMENT',attempt+1,'passive background mode not yet present');
    await page.waitForTimeout(6000);
   }
  }
  assert(deployed,'The version without a clickable hero player has not yet deployed');
  const selector='.site .hero-media-shell .media-gallery-artwork video';
  await page.locator(selector).first().waitFor({state:'attached',timeout:24000});
  console.log('CODEC SUPPORT',await page.evaluate(()=>({mp4:document.createElement('video').canPlayType('video/mp4; codecs="avc1.640032"'),h264:document.createElement('video').canPlayType('video/mp4; codecs="avc1.640028"')})));
  console.log('ATTACHED',width,height,JSON.stringify(await collect(page,selector)));
  try{
   await page.waitForFunction(selector=>{
    const v=document.querySelector(selector);
    return v instanceof HTMLVideoElement && v.videoWidth>0 && v.readyState>=2;
   },selector,{timeout:24000});
  }catch(e){
   const diagnostic=await page.evaluate(()=>({
    ready:document.documentElement.dataset.siteBootReady,
    hero:document.querySelector('.site .hero-media-shell')?.getAttribute('data-hero-has-media'),
    videos:[...document.querySelectorAll('video')].map(v=>({src:v.currentSrc||v.src,error:v.error?.code,networkState:v.networkState,readyState:v.readyState,paused:v.paused,loop:v.loop,videoWidth:v.videoWidth,outerHTML:v.outerHTML.slice(0,380)})),
    startup:document.getElementById('viivii-startup')?.outerHTML.slice(0,180)
   }));
   console.log('FRAME TIMEOUT DIAGNOSTIC',JSON.stringify(diagnostic));
   throw e;
  }
  let state=await collect(page,selector);
  console.log('PREVIEW',width,height,JSON.stringify(state));
  assert.match(state.currentSrc,/\/media\/viivii-hero-777-4k\.mp4/,'Opening reel must use the real 4K asset');
  assert.equal(state.videoWidth,3840,'Opening film must decode as actual 4K width');
  assert.equal(state.videoHeight,2160,'Opening film must decode as actual 4K height');
  assert.equal(state.objectFit,'contain','No-crop preview must use contain');
  assert.equal(state.loop,true,'Native seamless looping must stay enabled');
  // The hero is a visual-only 4K background, not a clickable player.
  assert.equal(state.paused,false,'Hero must already be auto-playing');
  assert.equal(await page.locator('.unified-media-dialog').count(),0,'No player should be open on arrival');
  const heroVideo=await page.locator(selector).first().elementHandle();
  const artwork=page.locator('.site .hero-media-shell .media-gallery-artwork').first();
  await artwork.click({force:true});
  await page.waitForTimeout(450);
  assert.equal(await page.locator('.unified-media-dialog').count(),0,'Clicking home film must not open a modal player');
  const afterClick=await collect(page,selector);
  assert.equal(afterClick.paused,false,'Click must not pause the home video');
  assert.equal(afterClick.loop,true,'Looping must survive user click');
  assert.equal(await page.locator(selector).first().evaluate((v,node)=>v===node,heroVideo),true,'Click must preserve the same streaming video element');
  await artwork.click({force:true});
  assert.equal(await page.locator('.unified-media-dialog').count(),0,'Repeated clicks must remain inert');
  await page.mouse.move(0,0);
  await page.waitForTimeout(550);
  const afterLeave=await collect(page,selector);
  assert.equal(afterLeave.paused,false,'Moving the mouse off the showreel must not pause it');
  assert.equal(afterLeave.loop,true);
  console.log('PASS: clicking the showreel twice did not open a viewer, change the video, or stop playback');
  if(checkLoop){
   await page.waitForFunction(selector=>{
    const v=document.querySelector(selector);
    return v instanceof HTMLVideoElement && v.duration>0 &&
      v.currentTime>Math.max(3,v.duration-2.2) && !v.paused;
   },selector,{timeout:25000});
   await page.waitForFunction(selector=>{
    const v=document.querySelector(selector);
    return v instanceof HTMLVideoElement && v.currentTime<1.8 && !v.paused;
   },selector,{timeout:10000});
   assert.equal(await page.locator('.unified-media-dialog').count(),0);
   console.log('PASS: the homepage background video looped at the end without opening a player');
  }
  console.log('PASS: browser viewport',width+'x'+height);
 } finally {await page.close()}
}
try{
 await verifyViewport(1920,1080,true);
 await verifyViewport(390,844,true);
}finally{await browser.close()}
