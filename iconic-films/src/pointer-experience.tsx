'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {cursorDiameter,stepCursorDiameter,stepCursorPosition,type CursorMode} from './cursor-motion';
const interactive='button,a,[role="button"],[role="tab"],[role="switch"],[role="slider"],[role="checkbox"],input,textarea,select,summary';
const native='input:focus,textarea:focus,select:focus,video[controls],[data-native-cursor]';
function isModel(target:Element){return !!target.closest('[data-cursor="3d"],model-viewer,.model-stage,.team-model-loading')||!!target.closest('.focus-card-visual,.team-portfolio-grid-item,.team-stack-visual,.media-gallery-artwork,.about-visual,.main-logo')?.querySelector('model-viewer,.model-stage,.team-model-loading');}
function isVideoTarget(target:Element){
 if(target.closest('[data-cursor="video"],[data-cursor-label="VIDEO"]'))return true;
 if(target.closest('video'))return true;
 const host=target.closest<HTMLElement>('.film-frame,.media-gallery-artwork,.work-image,.hero-gallery button,.focus-card-visual,.team-portfolio-grid-item,.team-stack-visual');
 return !!host?.querySelector('video');
}
function cursorLabel(target:Element){
 const explicit=target.closest<HTMLElement>('[data-cursor-label]')?.dataset.cursorLabel;
 if(explicit)return explicit.toUpperCase();
 if(isModel(target))return '3D';
 if(isVideoTarget(target))return 'VIDEO';
 if(target.closest('[data-visual-text],[data-visual-work-text],[data-visual-team-text]'))return 'EDIT';
 if(target.closest('.nav a,.nav button,header nav a,header nav button,[role="menuitem"]'))return 'MENU';
 if(target.closest('.music-player,.music-panel,.track-list button,[aria-label*="재생"],[aria-label*="음악"]'))return 'PLAY';
 if(target.closest('[aria-label*="이전"],.media-gallery-prev,.film-prev'))return 'PREV';
 if(target.closest('[aria-label*="다음"],.media-gallery-next,.film-next'))return 'NEXT';
 if(target.closest('input[type="range"],[role="slider"],.film-seek,.volume'))return 'DRAG';
 if(target.closest('img,picture,.work-image,.team-stack-visual,.focus-card-visual,.about-visual'))return 'IMAGE';
 if(target.closest('a[href]'))return 'LINK';
 if(target.closest('.work-card,.media-gallery-artwork,.team-portfolio-grid-item,[data-visual-work-id]'))return 'VIEW';
 if(target.closest('button,[role="button"],[role="tab"],summary'))return 'CLICK';
 return 'VIEW';
}
function modeFor(target:Element):CursorMode{if(isModel(target))return 'media';const control=target.closest(interactive);if(control&&!control.matches('.work-image'))return 'control';if(target.closest('img,video,.work-image,.film-frame,.stage,.media-gallery-artwork,.about-visual,.main-logo'))return 'media';return target.closest('h1,h2,h3,p,article,figure,li,label,strong,small,.kicker,.disciplines span,.footer-copy,.team-portfolio-credits')?'text':'dot';}
export default function PointerExperience({enabled=true}:{enabled?:boolean}){
 const [mounted,setMounted]=useState(false),[portalTarget,setPortalTarget]=useState<Element|null>(null);const point=useRef<{x:number;y:number}|null>(null);const cursor=useRef<HTMLDivElement>(null),glow=useRef<HTMLDivElement>(null),optics=useRef<HTMLDivElement>(null),caption=useRef<HTMLDivElement>(null);
 useEffect(()=>{setMounted(true);const sync=()=>setPortalTarget(document.fullscreenElement||document.body);sync();document.addEventListener('fullscreenchange',sync);return()=>document.removeEventListener('fullscreenchange',sync)},[]);
 useEffect(()=>{
  const suppress=()=>{
   document.querySelectorAll('model-viewer').forEach(node=>{
    const host=node as HTMLElement&{shadowRoot:ShadowRoot|null};
    host.style.setProperty('cursor','none','important');
    const root=host.shadowRoot;
    if(!root||root.querySelector('[data-iconic-cursor-style]'))return;
    const style=document.createElement('style');
    style.setAttribute('data-iconic-cursor-style','true');
    style.textContent='*, .userInput, canvas { cursor:none !important; }';
    root.appendChild(style);
   });
  };
  suppress();
  const observer=new MutationObserver(suppress);
  observer.observe(document.documentElement,{subtree:true,childList:true});
  return()=>observer.disconnect();
 },[mounted]);
 useEffect(()=>{
  if(!mounted||!enabled||!cursor.current||!glow.current||!optics.current||!caption.current)return;
  const el=cursor.current,halo=glow.current,glass=optics.current,captionNode=caption.current,lens=el.firstElementChild as HTMLElement,fine=matchMedia('(any-hover: hover) and (any-pointer: fine)'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let raf=0,visible=false,down=false,x=0,y=0,renderX=0,renderY=0,last=0,diameter=6,wanted=6,targetDiameter=6,hit:Element|null=null,dirty=false,positionReady=false;
  const ripples=new Set<HTMLElement>(),timeouts=new Set<ReturnType<typeof setTimeout>>();
  const hide=()=>{cancelAnimationFrame(raf);raf=0;last=0;visible=false;dirty=false;hit=null;positionReady=false;el.dataset.visible='false';halo.dataset.visible='false';glass.dataset.visible=captionNode.dataset.visible='false';document.body.classList.remove('iconic-pointer')};
  const tick=(now:number)=>{
   raf=0;const dt=last?now-last:16;last=now;
   if(dirty){dirty=false;if(!hit||hit.closest(native)){hide();return}const mode=modeFor(hit),hovered=mode==='control'||mode==='media';halo.dataset.visible=el.dataset.visible='true';el.dataset.mode=mode;halo.dataset.mode=mode;glass.dataset.mode=mode;captionNode.dataset.mode=mode;el.dataset.hovered=glass.dataset.hovered=captionNode.dataset.hovered=String(hovered);glass.dataset.visible=captionNode.dataset.visible=String(hovered);document.body.classList.add('iconic-pointer');const labelText=hovered?cursorLabel(hit):'VIEW';captionNode.dataset.kind=labelText.toLowerCase();const label=captionNode.querySelector('.cursor-label-text') as HTMLElement;label.textContent=labelText;wanted=cursorDiameter[mode];if(!visible){visible=true;diameter=6;targetDiameter=6;renderX=x;renderY=y;positionReady=true}}
   if(!visible)return;
   // Only translation belongs to the anchor. A fixed 64px lens scales about its own center.
   // Moving and resizing can never change the anchor's origin or screen coordinates.
   if(!positionReady){renderX=x;renderY=y;positionReady=true}
   renderX=stepCursorPosition(renderX,x,dt);renderY=stepCursorPosition(renderY,y,dt);
   const transform=`translate3d(${renderX}px,${renderY}px,0)`;
   el.style.transform=transform;halo.style.transform=glass.style.transform=captionNode.style.transform=transform;
   const next=down?25:wanted;
   targetDiameter=next;
   diameter=stepCursorDiameter(diameter,targetDiameter,dt);
   lens.style.transform=`scale(${diameter/64})`;const panel=glass.firstElementChild as HTMLElement;panel.style.transform=lens.style.transform;lens.style.setProperty('--cursor-ring-width',(64/Math.max(diameter,6)*.82)+'px');captionNode.style.setProperty('--cursor-label-opacity',String(Math.max(0,Math.min(1,(diameter-17)/18))));
   const moving=Math.abs(renderX-x)>.04||Math.abs(renderY-y)>.04||Math.abs(diameter-targetDiameter)>.015;
   if(moving)raf=requestAnimationFrame(tick);else last=0;
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
 return mounted&&portalTarget?createPortal(<><div ref={glow} className="iconic-cursor-glow" data-visible="false" aria-hidden="true"/><div ref={cursor} className="iconic-cursor" data-visible="false" aria-hidden="true"><span/></div><div ref={optics} className="iconic-cursor-optics" data-visible="false" data-hovered="false" aria-hidden="true"><span className="cursor-optics-glass"/></div><div ref={caption} className="iconic-cursor-caption" data-visible="false" data-hovered="false" aria-hidden="true"><span className="cursor-optics-label"><span className="cursor-label-text">VIEW</span></span></div></>,portalTarget):null;
}
