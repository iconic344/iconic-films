import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import {ChevronLeft,ChevronRight,Play,Pause,Volume2,VolumeX,Maximize,Minimize,X} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import TeamMedia,{teamMediaType} from './team-media';

export type GalleryItem={id:string;src:string;poster?:string;title:string;description?:string;kicker?:string};
const formatTime=(n:number)=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;

export function MediaGallery({items,initialIndex=0,onIndexChange,onExpand,onReady,modal=false}:{items:GalleryItem[];initialIndex?:number;onIndexChange?:(index:number)=>void;onExpand?:()=>void;onReady?:()=>void;modal?:boolean}){
 const [index,setIndex]=useState(Math.min(initialIndex,Math.max(0,items.length-1)));
 const [playing,setPlaying]=useState(()=>!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [muted,setMuted]=useState(true),[progress,setProgress]=useState(0),[time,setTime]=useState(0),[duration,setDuration]=useState(0),[visible,setVisible]=useState(true),[error,setError]=useState(false),[expanded,setExpanded]=useState(false),[nativeFullscreen,setNativeFullscreen]=useState(false),[idle,setIdle]=useState(false),[ready,setReady]=useState(0),[readySrc,setReadySrc]=useState('');
 const root=useRef<HTMLDivElement>(null),video=useRef<HTMLVideoElement>(null),drag=useRef<{x:number;y:number}|null>(null),dragged=useRef(false),elapsed=useRef(0),ambient=useRef<HTMLCanvasElement>(null),idleTimer=useRef(0),restoreTime=useRef<number|null>(null);
 const item=items[index],type=item?teamMediaType(item.src):'image',isFullscreen=expanded||nativeFullscreen,showBackdrop=modal||isFullscreen;
 useEffect(()=>{if(modal)root.current?.focus({preventScroll:true})},[modal]);
 useEffect(()=>{if(isFullscreen)root.current?.focus({preventScroll:true})},[isFullscreen]);
 const choose=(n:number)=>{if(!items.length)return;const target=(n+items.length)%items.length;setIndex(target);onIndexChange?.(target)};
 const advance=()=>{if(items.length>1)choose(index+1);else if(video.current){video.current.currentTime=0;video.current.play().catch(()=>setPlaying(false))}else elapsed.current=0};
 useEffect(()=>{setIndex(Math.min(initialIndex,Math.max(0,items.length-1)))},[initialIndex,items.length]);
 useEffect(()=>{
  elapsed.current=0;setProgress(0);setTime(0);setError(false);
  root.current?.querySelectorAll('video').forEach(v=>{v.pause();if(v===video.current)v.currentTime=0});
  const v=video.current;setDuration(v&&Number.isFinite(v.duration)?v.duration:0);
  // Adjacent slides may finish loading before becoming active. Reuse that
  // decoded frame immediately so their fullscreen backdrop is ready too.
  setReadySrc(v&&v.readyState>=2?item.src:'');
  if(v&&v.readyState>=2)setReady(n=>n+1);
 },[item?.id,item?.src]);
 useEffect(()=>{
  if(!expanded)return;
  const previous=document.body.style.overflow;document.body.style.overflow='hidden';
  return()=>{document.body.style.overflow=previous};
 },[expanded]);
 useEffect(()=>{
  const el=root.current;if(!el)return;
  let intersects=true;
  const sync=()=>setVisible(intersects&&document.visibilityState!=='hidden');
  const observer=new IntersectionObserver(entries=>{intersects=entries[0].isIntersecting;sync()},{threshold:.1});observer.observe(el);
  document.addEventListener('visibilitychange',sync);
  return()=>{observer.disconnect();document.removeEventListener('visibilitychange',sync)};
 },[expanded]);
 useEffect(()=>{
  const v=video.current;if(!v)return;
  if(playing&&visible)v.play().catch(()=>{if(!v.muted){v.muted=true;setMuted(true);v.play().catch(()=>setPlaying(false))}else setPlaying(false)});
  else v.pause();
 },[playing,visible,item?.id,item?.src,expanded]);
 useEffect(()=>{
  if(type==='video'||!playing||!visible||!item||error)return;
  let last=performance.now();
  const timer=window.setInterval(()=>{const now=performance.now();elapsed.current+=now-last;last=now;setProgress(Math.min(1,elapsed.current/6500));if(elapsed.current>=6500)advance()},50);
  return()=>window.clearInterval(timer);
 },[type,playing,visible,index,items.length,error]);
 const toggle=()=>setPlaying(v=>!v);
 const exitFullscreen=()=>{
  if(document.fullscreenElement===root.current)void document.exitFullscreen().catch(()=>{});
  else {restoreTime.current=video.current?.currentTime??null;setExpanded(false)}
 };
 const fullscreen=()=>{
  const el=root.current;if(!el)return;
  if(isFullscreen){exitFullscreen();return}
  const fallback=()=>{restoreTime.current=video.current?.currentTime??null;setExpanded(true)};
  if(el.requestFullscreen)void el.requestFullscreen().catch(fallback);
  else fallback();
 };
 const wake=()=>{
  setIdle(false);window.clearTimeout(idleTimer.current);
  if(isFullscreen&&type==='video')idleTimer.current=window.setTimeout(()=>setIdle(true),2400);
 };
 useEffect(()=>{
  const sync=()=>{setNativeFullscreen(document.fullscreenElement===root.current);setIdle(false)};
  document.addEventListener('fullscreenchange',sync);
  return()=>{document.removeEventListener('fullscreenchange',sync);if(document.fullscreenElement===root.current)void document.exitFullscreen().catch(()=>{})};
 },[]);
 useEffect(()=>{wake();return()=>window.clearTimeout(idleTimer.current)},[isFullscreen,type,item?.id]);
 // Sample the playing frame into a small canvas. It is purely visual, muted by
 // glass and blur, and never creates a second stream or audio/video decoder.
 useEffect(()=>{
  const canvas=ambient.current,v=video.current;if(!canvas||!v||type!=='video')return;
  const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return;
  let frame=0,last=0;
  const draw=(now:number)=>{
   if(v.readyState>=2&&now-last>=66){
    const width=480,height=Math.round(width*(v.videoHeight||9)/(v.videoWidth||16));
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
    ctx.drawImage(v,0,0,width,height);last=now;
   }
   if(playing&&visible)frame=requestAnimationFrame(draw);
  };
  draw(performance.now());return()=>cancelAnimationFrame(frame);
 },[item?.id,item?.src,type,playing,visible,ready,expanded,showBackdrop]);
 const key=(e:React.KeyboardEvent)=>{
  if((e.target as HTMLElement).matches('input'))return;
  if(e.key==='Escape'&&isFullscreen){e.preventDefault();e.stopPropagation();exitFullscreen();return}
  if(e.key==='ArrowLeft'){e.preventDefault();choose(index-1)}
  if(e.key==='ArrowRight'){e.preventDefault();choose(index+1)}
  if(e.key===' '&&!((e.target as HTMLElement).closest('button'))){e.preventDefault();toggle()}
 };
 if(!item)return null;
 const gallery=<div ref={root} className={'media-gallery '+(modal?'is-modal ':'')+(expanded?'is-expanded ':'')+(isFullscreen?'is-fullscreen ':'')+(type==='video'?'has-video':'has-image')} role="region" aria-roledescription="carousel" aria-label="미디어 갤러리" tabIndex={0} data-cursor-idle={idle?'true':'false'} onPointerMove={wake} onPointerDown={wake} onFocusCapture={wake} onKeyDown={e=>{wake();key(e)}}>
  {showBackdrop&&<><div className="media-gallery-backdrop" aria-hidden="true">
   {(type==='image'||item.poster)&&<img src={type==='image'?item.src:item.poster} alt=""/>}
   {type==='video'&&<canvas ref={ambient} style={{opacity:readySrc===item.src?1:0}}/>}
  </div><div className="media-gallery-backdrop-glass" aria-hidden="true"/></>}
  {isFullscreen&&<button type="button" className="media-gallery-close" aria-label="전체 화면 종료" onClick={exitFullscreen}><X size={23}/></button>}
  <div className="media-gallery-viewport" onPointerDown={e=>{if(e.button!==0||(e.target as HTMLElement).closest('button,input,model-viewer'))return;drag.current={x:e.clientX,y:e.clientY};dragged.current=false;e.currentTarget.setPointerCapture(e.pointerId)}} onPointerUp={e=>{if(!drag.current)return;const dx=e.clientX-drag.current.x,dy=e.clientY-drag.current.y;drag.current=null;if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)){dragged.current=true;choose(index+(dx<0?1:-1))}e.currentTarget.releasePointerCapture?.(e.pointerId)}} onPointerCancel={()=>{drag.current=null}}>
   <div className="media-gallery-track" style={{'--gallery-index':index} as CSSProperties}>
    {items.map((entry,i)=>{
     const active=i===index,kind=teamMediaType(entry.src);
     return <article className={'media-gallery-slide '+(active?'is-active':'')} key={entry.id} aria-hidden={!active} inert={!active}>
      <div className="media-gallery-artwork" onClick={()=>{if(dragged.current){dragged.current=false;return}if(active&&kind==='video')toggle()}}>
       {kind==='video'?<video key={entry.src} ref={active?video:undefined} src={Math.abs(i-index)<=1?entry.src:undefined} poster={entry.poster} muted={active?muted:true} playsInline preload={active?'auto':'metadata'} onLoadedData={()=>{if(active){setReadySrc(entry.src);setReady(n=>n+1);onReady?.();if(playing&&visible)video.current?.play().catch(()=>setPlaying(false))}}} onLoadedMetadata={e=>{if(active){if(restoreTime.current!==null){e.currentTarget.currentTime=restoreTime.current;restoreTime.current=null}setDuration(Number.isFinite(e.currentTarget.duration)?e.currentTarget.duration:0);setReady(n=>n+1)}}} onTimeUpdate={e=>{if(active){setTime(e.currentTarget.currentTime);setProgress(e.currentTarget.duration?e.currentTarget.currentTime/e.currentTarget.duration:0)}}} onEnded={()=>{if(active&&playing)advance()}} onError={()=>{if(active){setError(true);setPlaying(false);onReady?.()}}}/>:<TeamMedia src={entry.src} alt={entry.title} autoPlay={active} interactive={active&&kind==='model'}/>}
      </div>

      {active&&error&&<p className="media-gallery-error" role="status">미디어를 불러오지 못했습니다. <button type="button" onClick={()=>{setError(false);video.current?.load();setPlaying(true)}}>다시 시도</button></p>}
      {active&&kind==='video'&&<div className="media-gallery-tools">
       <button type="button" aria-label={playing?'일시정지':'재생'} onClick={toggle}>{playing?<Pause size={18} fill="currentColor"/>:<Play size={18} fill="currentColor"/>}</button><span>{formatTime(time)}</span><input type="range" aria-label="영상 재생 위치" min={0} max={duration||1} step={.1} value={Math.min(time,duration||0)} onChange={e=>{if(video.current)video.current.currentTime=Number(e.target.value)}}/><span>{formatTime(duration)}</span>
       <button type="button" aria-label={muted?'소리 켜기':'음소거'} onClick={()=>setMuted(v=>!v)}>{muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button>
       <button type="button" aria-label={isFullscreen?'전체 화면 종료':'전체 화면'} onClick={fullscreen}>{isFullscreen?<Minimize size={17}/>:<Maximize size={17}/>}</button>
      </div>}
      {active&&kind!=='video'&&<button type="button" className="media-gallery-expand" aria-label={isFullscreen?'전체 화면 종료':'전체 화면'} onClick={fullscreen}><Maximize size={18}/></button>}
     </article>;
    })}
   </div>
   {items.length>1&&<><button type="button" className="media-gallery-arrow is-prev" aria-label="이전 미디어" onClick={()=>choose(index-1)}><ChevronLeft size={23}/></button><button type="button" className="media-gallery-arrow is-next" aria-label="다음 미디어" onClick={()=>choose(index+1)}><ChevronRight size={23}/></button></>}
  </div>
  <div className="media-gallery-caption">{item.kicker&&<span>{item.kicker}</span>}<h3>{item.title}</h3>{item.description&&<p>{item.description}</p>}</div>
  <div className="media-gallery-navigation"><div className="media-gallery-indicators" role="group" aria-label="미디어 선택">{items.map((entry,i)=><button type="button" key={entry.id} aria-label={`${i+1}번 미디어: ${entry.title}`} aria-current={i===index?'true':undefined} className={i===index?'is-active':''} onClick={()=>choose(i)}><span style={{'--gallery-progress':i===index?progress:0} as CSSProperties}/></button>)}</div><button type="button" className="media-gallery-toggle" aria-label={playing?'일시정지':'재생'} onClick={toggle}>{playing?<Pause size={20} fill="currentColor"/>:<Play size={20} fill="currentColor"/>}</button></div>
  <span className="sr-only" aria-live="polite">{index+1} / {items.length}: {item.title}</span>
 </div>;
 // Native fullscreen retains the DOM. Unsupported browsers get a body portal
 // so transformed sections cannot clip or cover the viewport fallback.
 return expanded&&!modal?createPortal(gallery,document.body):gallery;
}

export default function MediaGalleryDialog({items,index,onClose,onIndexChange}:{items:GalleryItem[];index:number|null;onClose:()=>void;onIndexChange?:(index:number)=>void}){
 return <Dialog open={index!==null} onOpenChange={open=>{if(!open)onClose()}}><DialogContent className="unified-media-dialog" showCloseButton={false} onOpenAutoFocus={e=>e.preventDefault()} onEscapeKeyDown={e=>{if(document.fullscreenElement||document.querySelector('.media-gallery.is-expanded'))e.preventDefault()}}><DialogTitle className="sr-only">미디어 갤러리</DialogTitle><DialogDescription className="sr-only">좌우 화살표 또는 드래그로 미디어를 넘기고, 아래 버튼으로 재생을 제어하세요.</DialogDescription><button type="button" className="media-gallery-close" aria-label="미디어 닫기" onClick={onClose}><X size={23}/></button>{index!==null&&<MediaGallery items={items} initialIndex={index} onIndexChange={onIndexChange} modal/>}</DialogContent></Dialog>;
}
