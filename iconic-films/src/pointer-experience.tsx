'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {cursorDiameter,stepCursorDiameter,type CursorMode} from './cursor-motion';
const interactive='button,a,[role="button"],[role="tab"],[role="switch"],[role="slider"],[role="checkbox"],input,textarea,select,summary';
const native='input:focus,textarea:focus,select:focus,video[controls],[data-native-cursor]';
function modeFor(target:Element):CursorMode{const control=target.closest(interactive);if(control&&!control.matches('.work-image'))return 'control';if(target.closest('img,video,.work-image,.film-frame,.stage,.about-visual,.main-logo,model-viewer'))return 'media';return target.closest('h1,h2,h3,p,article,figure,li,label,strong,small,.kicker,.disciplines span,.footer-copy,.team-portfolio-credits')?'text':'dot';}
export default function PointerExperience({enabled=true}:{enabled?:boolean}){
 const [mounted,setMounted]=useState(false),[portalTarget,setPortalTarget]=useState<Element|null>(null);const point=useRef<{x:number;y:number}|null>(null);const cursor=useRef<HTMLDivElement>(null),glow=useRef<HTMLDivElement>(null),optics=useRef<HTMLDivElement>(null),caption=useRef<HTMLDivElement>(null);
 useEffect(()=>{setMounted(true);const sync=()=>setPortalTarget(document.fullscreenElement||document.body);sync();document.addEventListener('fullscreenchange',sync);return()=>document.removeEventListener('fullscreenchange',sync)},[]);
 useEffect(()=>{
  if(!mounted||!enabled||!cursor.current||!glow.current||!optics.current||!caption.current)return;
  const el=cursor.current,halo=glow.current,glass=optics.current,captionNode=caption.current,lens=el.firstElementChild as HTMLElement,fine=matchMedia('(any-hover: hover) and (any-pointer: fine)'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let raf=0,visible=false,down=false,x=0,y=0,last=0,diameter=6,wanted=6,targetDiameter=6,shrinkAt=0,hit:Element|null=null,dirty=false;
  const ripples=new Set<HTMLElement>(),timeouts=new Set<ReturnType<typeof setTimeout>>();
  const hide=()=>{cancelAnimationFrame(raf);raf=0;last=0;visible=false;dirty=false;hit=null;shrinkAt=0;el.dataset.visible='false';halo.dataset.visible='false';glass.dataset.visible=captionNode.dataset.visible='false';document.body.classList.remove('iconic-pointer')};
  const tick=(now:number)=>{
   raf=0;const dt=last?now-last:16;last=now;
   if(dirty){dirty=false;if(!hit||hit.closest(native)){hide();return}const mode=modeFor(hit);halo.dataset.visible='true';el.dataset.hovered=glass.dataset.hovered=captionNode.dataset.hovered=mode==='dot'?'false':'true';wanted=cursorDiameter[mode];if(!visible){visible=true;diameter=6;targetDiameter=6;el.dataset.visible=glass.dataset.visible=captionNode.dataset.visible='true';document.body.classList.add('iconic-pointer')}}
   if(!visible)return;
   // Only translation belongs to the anchor. A fixed 64px lens scales about its own center.
   // Moving and resizing can never change the anchor's origin or screen coordinates.
   el.style.transform=`translate3d(${x}px,${y}px,0)`;halo.style.transform=glass.style.transform=captionNode.style.transform=el.style.transform;
   const next=down?26:wanted;
   if(next>=targetDiameter||down){targetDiameter=next;shrinkAt=0}else{if(!shrinkAt)shrinkAt=now+60;if(now>=shrinkAt){targetDiameter=next;shrinkAt=0}}
   diameter=stepCursorDiameter(diameter,targetDiameter,dt);lens.style.transform=`scale(${diameter/64})`;const panel=glass.firstElementChild as HTMLElement;panel.style.transform=lens.style.transform;lens.style.setProperty('--cursor-ring-width',(64/Math.max(diameter,6)*.85)+'px');captionNode.style.setProperty('--cursor-label-opacity',String(Math.max(0,Math.min(1,(diameter-16)/16))));
   if(diameter!==targetDiameter||shrinkAt)raf=requestAnimationFrame(tick);else last=0;
  };
  const schedule=()=>{if(!raf)raf=requestAnimationFrame(tick)};
  const move=(e:PointerEvent)=>{if(e.pointerType!=='mouse'||!fine.matches||reduced.matches){hide();return}x=e.clientX;y=e.clientY;point.current={x,y};hit=e.target instanceof Element?e.target:null;dirty=true;schedule()};
  const press=(e:PointerEvent)=>{down=true;if(visible)schedule();const target=e.target instanceof Element?e.target.closest<HTMLElement>(interactive):null;if(!target||target.closest(native)||reduced.matches||target.hasAttribute('disabled'))return;target.classList.add('touch-feedback');const timeout=setTimeout(()=>{target.classList.remove('touch-feedback');timeouts.delete(timeout)},280);timeouts.add(timeout);const ripple=document.createElement('div');ripple.className='pointer-ripple';ripple.style.left=e.clientX+'px';ripple.style.top=e.clientY+'px';document.body.appendChild(ripple);ripples.add(ripple);const removal=setTimeout(()=>{ripple.remove();ripples.delete(ripple);timeouts.delete(removal)},750);timeouts.add(removal)};
  const release=()=>{down=false;if(visible)schedule()};
  const scroll=()=>{if(!visible)return;hit=document.elementFromPoint(x,y);dirty=true;schedule()};
  const change=()=>{if(!fine.matches||reduced.matches)hide()};const visibility=()=>{if(document.hidden)hide()};
  if(point.current&&fine.matches&&!reduced.matches){x=point.current.x;y=point.current.y;hit=document.elementFromPoint(x,y);dirty=true;schedule()}
  window.addEventListener('pointermove',move,{passive:true});window.addEventListener('pointerdown',press,{passive:true});window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);window.addEventListener('blur',hide);window.addEventListener('scroll',scroll,true);document.addEventListener('transitionend',scroll,true);document.addEventListener('focusin',scroll,true);document.documentElement.addEventListener('pointerleave',hide);document.addEventListener('visibilitychange',visibility);fine.addEventListener('change',change);reduced.addEventListener('change',change);
  return()=>{hide();window.removeEventListener('pointermove',move);window.removeEventListener('pointerdown',press);window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);window.removeEventListener('blur',hide);window.removeEventListener('scroll',scroll,true);document.removeEventListener('transitionend',scroll,true);document.removeEventListener('focusin',scroll,true);document.documentElement.removeEventListener('pointerleave',hide);document.removeEventListener('visibilitychange',visibility);fine.removeEventListener('change',change);reduced.removeEventListener('change',change);timeouts.forEach(clearTimeout);ripples.forEach(r=>r.remove());document.querySelectorAll('.touch-feedback').forEach(n=>n.classList.remove('touch-feedback'))};
 },[mounted,enabled,portalTarget]);
 return mounted&&portalTarget?createPortal(<><div ref={glow} className="iconic-cursor-glow" data-visible="false" aria-hidden="true"/><div ref={cursor} className="iconic-cursor" data-visible="false" aria-hidden="true"><span/></div><div ref={optics} className="iconic-cursor-optics" data-visible="false" data-hovered="false" aria-hidden="true"><span className="cursor-optics-glass"/></div><div ref={caption} className="iconic-cursor-caption" data-visible="false" data-hovered="false" aria-hidden="true"><span className="cursor-optics-label">VIEW</span></div></>,portalTarget):null;
}
