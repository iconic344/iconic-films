'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {cursorDiameter,stepCursorDiameter,type CursorMode} from './cursor-motion';
const interactive='button,a,[role="button"],[role="tab"],[role="switch"],[role="slider"]';
const native='input,textarea,select,video[controls],.editor,[data-native-cursor]';
function modeFor(target:Element):CursorMode{const control=target.closest(interactive);if(control&&!control.matches('.work-image'))return 'control';if(target.closest('img,video,.work-image,.film-frame,.stage,.about-visual,.main-logo,model-viewer'))return 'media';return target.closest('h1,h2,h3,p,.disciplines span')?'text':'dot';}
export default function PointerExperience({enabled=true}:{enabled?:boolean}){
 const [mounted,setMounted]=useState(false);const cursor=useRef<HTMLDivElement>(null);
 useEffect(()=>setMounted(true),[]);
 useEffect(()=>{
  if(!mounted||!enabled||!cursor.current)return;
  const el=cursor.current,lens=el.firstElementChild as HTMLElement,fine=matchMedia('(any-hover: hover) and (any-pointer: fine)'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let raf=0,visible=false,down=false,x=0,y=0,last=0,diameter=6,wanted=6,targetDiameter=6,shrinkAt=0,hit:Element|null=null,dirty=false;
  const ripples=new Set<HTMLElement>(),timeouts=new Set<ReturnType<typeof setTimeout>>();
  const hide=()=>{cancelAnimationFrame(raf);raf=0;last=0;visible=false;dirty=false;hit=null;shrinkAt=0;el.dataset.visible='false';document.body.classList.remove('iconic-pointer')};
  const tick=(now:number)=>{
   raf=0;const dt=last?now-last:16;last=now;
   if(dirty){dirty=false;if(!hit||hit.closest(native)){hide();return}wanted=cursorDiameter[modeFor(hit)];if(!visible){visible=true;diameter=6;targetDiameter=6;el.dataset.visible='true';document.body.classList.add('iconic-pointer')}}
   if(!visible)return;
   // Only translation belongs to the anchor. A fixed 64px lens scales about its own center.
   // Moving and resizing can never change the anchor's origin or screen coordinates.
   el.style.transform=`translate3d(${x}px,${y}px,0)`;
   const next=down?26:wanted;
   if(next>=targetDiameter||down){targetDiameter=next;shrinkAt=0}else{if(!shrinkAt)shrinkAt=now+60;if(now>=shrinkAt){targetDiameter=next;shrinkAt=0}}
   diameter=stepCursorDiameter(diameter,targetDiameter,dt);lens.style.transform=`scale(${diameter/64})`;
   if(diameter!==targetDiameter||shrinkAt)raf=requestAnimationFrame(tick);else last=0;
  };
  const schedule=()=>{if(!raf)raf=requestAnimationFrame(tick)};
  const move=(e:PointerEvent)=>{if(e.pointerType!=='mouse'||!fine.matches||reduced.matches){hide();return}x=e.clientX;y=e.clientY;hit=e.target instanceof Element?e.target:null;dirty=true;schedule()};
  const press=(e:PointerEvent)=>{down=true;if(visible)schedule();const target=e.target instanceof Element?e.target.closest<HTMLElement>(interactive):null;if(!target||target.closest(native)||reduced.matches||target.hasAttribute('disabled'))return;target.classList.add('touch-feedback');const timeout=setTimeout(()=>{target.classList.remove('touch-feedback');timeouts.delete(timeout)},280);timeouts.add(timeout);const ripple=document.createElement('div');ripple.className='pointer-ripple';ripple.style.left=e.clientX+'px';ripple.style.top=e.clientY+'px';document.body.appendChild(ripple);ripples.add(ripple);const removal=setTimeout(()=>{ripple.remove();ripples.delete(ripple);timeouts.delete(removal)},750);timeouts.add(removal)};
  const release=()=>{down=false;if(visible)schedule()};
  const scroll=()=>{if(!visible)return;hit=document.elementFromPoint(x,y);dirty=true;schedule()};
  const change=()=>{if(!fine.matches||reduced.matches)hide()};const visibility=()=>{if(document.hidden)hide()};
  window.addEventListener('pointermove',move,{passive:true});window.addEventListener('pointerdown',press,{passive:true});window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);window.addEventListener('blur',hide);window.addEventListener('scroll',scroll,true);document.documentElement.addEventListener('pointerleave',hide);document.addEventListener('visibilitychange',visibility);fine.addEventListener('change',change);reduced.addEventListener('change',change);
  return()=>{hide();window.removeEventListener('pointermove',move);window.removeEventListener('pointerdown',press);window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);window.removeEventListener('blur',hide);window.removeEventListener('scroll',scroll,true);document.documentElement.removeEventListener('pointerleave',hide);document.removeEventListener('visibilitychange',visibility);fine.removeEventListener('change',change);reduced.removeEventListener('change',change);timeouts.forEach(clearTimeout);ripples.forEach(r=>r.remove());document.querySelectorAll('.touch-feedback').forEach(n=>n.classList.remove('touch-feedback'))};
 },[mounted,enabled]);
 return mounted?createPortal(<div ref={cursor} className="iconic-cursor" data-visible="false" aria-hidden="true"><span/></div>,document.body):null;
}
