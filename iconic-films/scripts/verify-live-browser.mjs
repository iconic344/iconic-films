// Read-only live browser verification. Does not log into EDIT SITE or mutate data.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const origin = 'https://viiviisara.com';
const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
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
async function verifyViewport(width,height,checkFullscreen=false){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
 page.on('pageerror',e=>console.log('Browser JS error:',String(e).slice(0,220)));
 try{
  const response=await page.goto(origin,{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(response?.status(),200,'Site homepage must respond 200');
  const selector='.site .hero-media-shell .media-gallery-artwork video';
  await page.locator(selector).first().waitFor({state:'attached',timeout:24000});
  await page.waitForFunction(selector=>{
   const v=document.querySelector(selector);
   return v instanceof HTMLVideoElement && v.videoWidth>0 && v.readyState>=2;
  },selector,{timeout:24000});
  let state=await collect(page,selector);
  console.log('PREVIEW',width,height,JSON.stringify(state));
  assert.match(state.currentSrc,/\/media\/viivii-hero-777\.mp4/,'Opening reel must have the expected source');
  assert(state.videoWidth>=1280 && state.videoHeight>=720,'Media should decode as video');
  assert.equal(state.objectFit,'contain','No-crop preview must use contain');
  assert.equal(state.loop,true,'Native seamless looping must stay enabled');
  if(checkFullscreen){
   await page.waitForFunction(selector=>{
    const v=document.querySelector(selector);
    return v instanceof HTMLVideoElement && !v.paused && v.currentTime>0.5;
   },selector,{timeout:14000});
   await page.locator('.site .hero-media-shell .media-gallery-artwork').first().click({force:true});
   const fullSelector='.unified-media-dialog .media-gallery.is-fullscreen video';
   await page.locator(fullSelector).first().waitFor({state:'attached',timeout:12000});
   state=await collect(page,fullSelector);
   console.log('FULLSCREEN',width,height,JSON.stringify(state));
   assert.equal(state.objectFit,'contain','Fullscreen should never crop the showreel');
   assert.equal(state.loop,true,'Fullscreen must preserve looping');
   // Observe an actual playback rollover while the fullscreen viewer is open.
   await page.waitForFunction(selector=>{
    const v=document.querySelector(selector);
    return v instanceof HTMLVideoElement && v.duration>0 &&
      v.currentTime>Math.max(3,v.duration-2.2) && !v.paused;
   },fullSelector,{timeout:23000});
   await page.waitForFunction(selector=>{
    const v=document.querySelector(selector);
    return v instanceof HTMLVideoElement && v.currentTime<1.8 && !v.paused;
   },fullSelector,{timeout:10000});
   console.log('PASS: fullscreen video continued playing after crossing its ending timestamp');
  }
  console.log('PASS: browser viewport',width+'x'+height);
 } finally {await page.close()}
}
try{
 await verifyViewport(1920,1080,true);
 await verifyViewport(390,844,false);
}finally{await browser.close()}
