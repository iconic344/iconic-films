'use client';
import {useEffect,useRef,useState,type CSSProperties,type MouseEvent as ReactMouseEvent} from 'react';
import {createPortal} from 'react-dom';
import {Moon,Sun,X} from 'lucide-react';

export type SiteMenuItem={
 key:string;
 label:string;
 href?:string;
 onSelect?:()=>void;
 visualTextKey?:string;
};

type Props={
 items:SiteMenuItem[];
 onAdmin:()=>void;
 onEdit:()=>void;
 theme:string;
 onToggleTheme:()=>void;
 editing?:boolean;
 fontFamily?:string;
};

const scrambleAlphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const easingDuration=760;

function ScrambleMenuItem({item,index,close}:{item:SiteMenuItem;index:number;close:()=>void}){
 const [shown,setShown]=useState(item.label);
 const [scrambling,setScrambling]=useState(false);
 const timer=useRef<ReturnType<typeof setInterval>|null>(null);

 const clear=()=>{
  if(timer.current!==null){clearInterval(timer.current);timer.current=null}
  setShown(item.label);setScrambling(false);
 };
 useEffect(()=>{setShown(item.label);return()=>{if(timer.current!==null)clearInterval(timer.current)}},[item.label]);
 const hover=()=>{
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  if(timer.current!==null)clearInterval(timer.current);
  setScrambling(true);
  let progress=0;
  const glyphs=Array.from(item.label);
  timer.current=setInterval(()=>{
   progress+=.58;
   setShown(glyphs.map((char,i)=>{
    if(char===' '||char==='·'||char==='—'||i<progress)return char;
    if(!/[a-zA-Z0-9]/.test(char))return char;
    return scrambleAlphabet[Math.floor(Math.random()*scrambleAlphabet.length)];
   }).join(''));
   if(progress>=glyphs.length+2)clear();
  },32);
 };
 const handleClick=(event:ReactMouseEvent<HTMLAnchorElement|HTMLButtonElement>)=>{
  clear();close();
  if(item.onSelect){event.preventDefault();item.onSelect()}
 };
 const inner=<>
  <span className="vii-menu-index" aria-hidden="true">{String(index+1).padStart(2,'0')}</span>
  <span className={'vii-menu-label'+(scrambling?' is-scrambling':'')} aria-hidden="true">
   {Array.from(shown).map((char,i)=><span
    key={item.key+':'+i}
    className="vii-menu-glyph"
    style={{'--vii-char-index':i} as CSSProperties}
   >{char===' '?'\u00a0':char}</span>)}
  </span>
  <span className="vii-menu-arrow" aria-hidden="true">↗</span>
 </>;
 const common={
  className:'vii-menu-entry',
  'aria-label':item.label,
  'data-visual-text':item.visualTextKey,
  onPointerEnter:hover,
  onPointerLeave:clear,
  onFocus:hover,
  onBlur:clear,
  onClick:handleClick,
  style:{'--vii-row-index':index} as CSSProperties
 };
 return item.href?<a {...common} href={item.href}>{inner}</a>:<button type="button" {...common}>{inner}</button>;
}

export default function SiteMenu({items,onAdmin,onEdit,theme,onToggleTheme,editing=false,fontFamily}:Props){
 const [open,setOpen]=useState(false);
 const opener=useRef<HTMLButtonElement>(null);
 const closeButton=useRef<HTMLButtonElement>(null);
 const close=()=>setOpen(false);
 useEffect(()=>{if(editing)setOpen(false)},[editing]);
 useEffect(()=>{
  if(!open)return;
  const previous=document.body.style.overflow;
  document.body.style.overflow='hidden';
  document.documentElement.dataset.viiviiMenuOpen='true';
  const keydown=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();setOpen(false);opener.current?.focus({preventScroll:true})}
   if(event.key==='Tab'){
    const panel=document.querySelector<HTMLElement>('.vii-site-menu-panel');
    if(!panel)return;
    const enabled=[...panel.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')];
    if(!enabled.length)return;
    const first=enabled[0],last=enabled[enabled.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
   }
  };
  document.addEventListener('keydown',keydown);
  const next=window.requestAnimationFrame(()=>closeButton.current?.focus({preventScroll:true}));
  return()=>{
   document.removeEventListener('keydown',keydown);
   window.cancelAnimationFrame(next);
   document.body.style.overflow=previous;
   delete document.documentElement.dataset.viiviiMenuOpen;
  };
 },[open]);
 const dismiss=()=>{setOpen(false);opener.current?.focus({preventScroll:true})};
 const runAction=(action:()=>void)=>{setOpen(false);action()};
 return <>
  <div className="vii-menu-inline-wrap" style={{'--vii-menu-font':fontFamily||'inherit'} as CSSProperties}>
   <nav className="vii-menu-inline-links" aria-label="상단 빠른 메뉴">
    {items.map((item,index)=>{
     const text=<span className="vii-inline-text-stack" aria-hidden="true"><span>{item.label}</span><span>{item.label}</span></span>;
     const props={
      className:'vii-menu-inline-link',
      'aria-label':item.label,
      'data-visual-text':item.visualTextKey,
      'data-cursor-label':'MENU',
      style:{'--vii-nav-index':index} as CSSProperties
     };
     return item.href
      ?<a key={item.key} {...props} href={item.href} onClick={event=>{if(item.onSelect){event.preventDefault();item.onSelect()}}}>{text}</a>
      :<button key={item.key} {...props} type="button" onClick={()=>item.onSelect?.()}>{text}</button>;
    })}
   </nav>
  <button
   type="button"
   ref={opener}
   className={'vii-menu-trigger'+(open?' is-active':'')}
   data-vii-menu-toggle="true"
   data-cursor-label="MENU"
   aria-label={open?'메뉴 닫기':'메뉴 열기'}
   aria-expanded={open}
   aria-controls="viivii-site-menu-panel"
   onClick={()=>setOpen(o=>!o)}
  ><span aria-hidden="true">M</span></button>
  </div>
  {typeof document!=='undefined'&&createPortal(
   <div className={'vii-site-menu-root'+(open?' is-open':'')} aria-hidden={!open} inert={!open}>
    <button className="vii-site-menu-backdrop" type="button" aria-label="메뉴 닫기" onClick={dismiss} tabIndex={open?0:-1}/>
    <aside id="viivii-site-menu-panel" className="vii-site-menu-panel" aria-label="사이트 메뉴" style={{'--vii-menu-font':fontFamily||'inherit'} as CSSProperties}>
     <div className="vii-site-menu-glare" aria-hidden="true"/>
     <div className="vii-site-menu-top">
      <button
       type="button"
       className="vii-site-menu-theme"
       onClick={onToggleTheme}
       aria-label={theme==='light'?'다크 모드로 전환':'라이트 모드로 전환'}
       title={theme==='light'?'다크 모드':'라이트 모드'}
       tabIndex={open?0:-1}
      >{theme==='light'?<Moon size={19} strokeWidth={1.75} aria-hidden="true"/>:<Sun size={19} strokeWidth={1.75} aria-hidden="true"/>}</button>
      <button type="button" ref={closeButton} className="vii-site-menu-close" onClick={dismiss} aria-label="메뉴 닫기" tabIndex={open?0:-1}>
       <X size={19} strokeWidth={1.9} aria-hidden="true"/>
      </button>
     </div>
     <nav aria-label="메인 메뉴" className="vii-site-menu-links">
      <div className="vii-site-menu-heading">INDEX</div>
      {items.map((item,i)=><ScrambleMenuItem key={item.key} item={item} index={i} close={close}/>)}
     </nav>
     <div className="vii-site-menu-bottom">
      <div className="vii-menu-meta">VIIVII SARA®<span>CREATIVE PORTFOLIO</span></div>
      <div className="vii-menu-utilities">
       <button type="button" onClick={()=>runAction(onAdmin)}>Admin</button>
       <button type="button" onClick={()=>runAction(onEdit)} disabled={editing}>Edit Site</button>
      </div>
     </div>
    </aside>
   </div>,document.body)}
 </>;
}
