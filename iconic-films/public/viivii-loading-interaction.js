/* PROJECT 09 - low-cost spring motion for the pre-React VIIVII loading mark.
   Only the loading overlay is interactive. No site player, canvas or 3D runtime is created. */
(()=>{
  'use strict';
  const hit=document.getElementById('viivii-loading-hit');
  const mark=document.getElementById('viivii-loading-object');
  if(!hit||!mark)return;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce){mark.style.transform='rotateX(0deg) rotateY(0deg)';return;}
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  let active=false,pointer=-1,originX=0,originY=0,fromX=0,fromY=0;
  let rotationX=0,rotationY=0,velocityX=0,velocityY=0,targetX=0,targetY=0;
  let raf=0,ended=false;
  const pointerEnd=(event)=>{
    if(!active||(event&&event.pointerId!==pointer))return;
    active=false;
    try{hit.releasePointerCapture(pointer)}catch{}
    pointer=-1;
    hit.classList.remove('is-dragging');
  };
  hit.addEventListener('pointerdown',event=>{
    if(event.pointerType==='mouse'&&event.button!==0)return;
    active=true;pointer=event.pointerId;
    originX=event.clientX;originY=event.clientY;fromX=targetX;fromY=targetY;
    hit.classList.add('is-dragging');
    try{hit.setPointerCapture(pointer)}catch{}
    event.preventDefault();
  },{passive:false});
  hit.addEventListener('pointermove',event=>{
    if(!active||event.pointerId!==pointer)return;
    targetY=clamp(fromY+(event.clientX-originX)*.32,-42,42);
    targetX=clamp(fromX-(event.clientY-originY)*.24,-28,28);
    event.preventDefault();
  },{passive:false});
  hit.addEventListener('pointerup',pointerEnd);
  hit.addEventListener('pointercancel',pointerEnd);
  hit.addEventListener('lostpointercapture',()=>pointerEnd(null));

  const tick=(time)=>{
    if(ended)return;
    if(!active){
      // Once released, settle back into the original centered pose while
      // a restrained automatic 3D turn continues.
      targetX=Math.sin(time*.00048)*6;
      targetY=Math.sin(time*.00037)*16;
    }
    // Damped spring: pointer drag feels connected but doesn't snap on release.
    velocityX=(velocityX+(targetX-rotationX)*.075)*.81;
    velocityY=(velocityY+(targetY-rotationY)*.075)*.81;
    rotationX+=velocityX;
    rotationY+=velocityY;
    mark.style.transform='rotateX('+rotationX.toFixed(2)+'deg) rotateY('+rotationY.toFixed(2)+'deg)';
    raf=window.requestAnimationFrame(tick);
  };
  raf=window.requestAnimationFrame(tick);
  const stop=()=>{
    if(ended)return;
    ended=true;window.cancelAnimationFrame(raf);observer.disconnect();
    pointerEnd(null);
  };
  // Avoid burning animation frames after the splash has faded away.
  const observer=new MutationObserver(()=>{
    if(document.documentElement.dataset.siteBootReady==='true'){
      window.setTimeout(stop,1100);
    }
  });
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-site-boot-ready']});
  if(document.documentElement.dataset.siteBootReady==='true')window.setTimeout(stop,1100);
})();