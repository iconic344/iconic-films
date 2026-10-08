import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import {ChevronLeft,ChevronRight,Play,Pause,Volume2,VolumeX,Maximize,Minimize,X} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import TeamMedia,{teamMediaType} from './team-media';
import type {PortfolioMediaRatio} from './defaults';
import {scopeGallery} from './gallery-scope';

export type GalleryItem={id:string;src:string;poster?:string;title:string;description?:string;info?:string;credits?:string;kicker?:string;category?:string;sourceIndex?:number;ratio?:PortfolioMediaRatio};
type MediaFrameMode='landscape'|'portrait'|'square';
const mediaFrameCache=new Map<string,{mode:MediaFrameMode;ratio:number}>();
const ratioValue=(ratio:PortfolioMediaRatio|undefined)=>{
 if(!ratio||ratio==='auto')return null;
 const [w,h]=ratio.split(':').map(Number);
 return w>0&&h>0?w/h:null;
};
const frameFromRatio=(ratio:number)=>({mode:(ratio<.94?'portrait':ratio<=1.06?'square':'landscape') as MediaFrameMode,ratio});
export const portfolioMediaFrame=(width:number,height:number,override:PortfolioMediaRatio='auto')=>{
 const forced=ratioValue(override);
 if(forced)return frameFromRatio(forced);
 const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1),raw=Math.min(4,Math.max(.25,w/h));
 return frameFromRatio(raw);
};
const formatTime=(n:number)=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;

type GalleryProps={items:GalleryItem[];initialIndex?:number;onIndexChange?:(index:number)=>void;onExpand?:(index?:number)=>void;onReady?:()=>void;modal?:boolean;preserveItems?:boolean;captionTitleStyle?:CSSProperties;captionVisualText?:string;balanceEdges?:boolean;cleanPreview?:boolean;nativeCursor?:boolean;mediaFit?:'contain'|'cover';mediaPositionX?:number;mediaPositionY?:number;autoPlay?:boolean;autoplayMs?:number;transitionMs?:number;easing?:'smooth'|'soft'|'snappy'|'linear';maxCardHeight?:number};
export function MediaGallery({items,initialIndex=0,onIndexChange,preserveItems=false,...props}:GalleryProps){
 if(preserveItems)return <ScopedMediaGallery {...props} items={items} initialIndex={initialIndex} onIndexChange={onIndexChange}/>;
 const scoped=scopeGallery(items,initialIndex);
 return <ScopedMediaGallery {...props} items={scoped.items} initialIndex={scoped.index} onIndexChange={index=>onIndexChange?.(scoped.sourceIndices[index])}/>;
}
function ScopedMediaGallery({items,initialIndex=0,onIndexChange,onReady,onExpand,modal=false,captionTitleStyle,captionVisualText,balanceEdges=false,cleanPreview=false,nativeCursor=true,mediaFit='contain',mediaPositionX=50,mediaPositionY=50,autoPlay=true,autoplayMs=6500,transitionMs=820,easing='smooth',maxCardHeight}:GalleryProps){
 const [index,setIndex]=useState(Math.min(initialIndex,Math.max(0,items.length-1)));
 const [playing,setPlaying]=useState(()=>autoPlay&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [muted,setMuted]=useState(()=>!modal),[mediaVolume,setMediaVolume]=useState(1),[progress,setProgress]=useState(0),[time,setTime]=useState(0),[duration,setDuration]=useState(0),[visible,setVisible]=useState(true),[error,setError]=useState(false),[expanded,setExpanded]=useState(modal),[idle,setIdle]=useState(false),[ready,setReady]=useState(0),[readySrc,setReadySrc]=useState(''),[landscape,setLandscape]=useState(false),[frame,setFrame]=useState<{mode:MediaFrameMode;ratio:number}>({mode:'landscape',ratio:16/9});
 const root=useRef<HTMLDivElement>(null),video=useRef<HTMLVideoElement>(null),drag=useRef<{x:number;y:number;slideIndex:number|null}|null>(null),dragged=useRef(false),elapsed=useRef(0),ambient=useRef<HTMLCanvasElement>(null),idleTimer=useRef(0),restoreTime=useRef<number|null>(null);
 const item=items[index],type=item?teamMediaType(item.src):'image',isFullscreen=expanded,showBackdrop=modal||isFullscreen;
 useEffect(()=>{
  if(!item?.src)return;
  const cacheKey=item.src+'|'+(item.ratio||'auto');
  const forced=ratioValue(item.ratio);
  if(forced){const next=frameFromRatio(forced);mediaFrameCache.set(cacheKey,next);setFrame(next);return}
  const cached=mediaFrameCache.get(cacheKey);
  if(cached){setFrame(cached);return}
  const kind=teamMediaType(item.src);
  if(kind==='model'){const next={mode:'landscape' as const,ratio:16/9};mediaFrameCache.set(cacheKey,next);setFrame(next);return}
  if(kind==='video'){setFrame({mode:'landscape',ratio:16/9});return}
  let live=true;
  const probe=new Image();
  probe.onload=()=>{if(!live)return;const next=portfolioMediaFrame(probe.naturalWidth,probe.naturalHeight,item.ratio||'auto');mediaFrameCache.set(cacheKey,next);setFrame(next)};
  probe.src=item.src;
  return()=>{live=false;probe.onload=null};
 },[item?.src,item?.ratio]);
 useEffect(()=>{if(modal)root.current?.focus({preventScroll:true})},[modal]);
 useEffect(()=>{if(!modal)setPlaying(autoPlay&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)},[autoPlay]);
 useEffect(()=>{if(modal)setMuted(mediaVolume<=0)},[modal,item?.id]);
 useEffect(()=>{const v=video.current;if(!v)return;v.volume=Math.max(0,Math.min(1,mediaVolume));v.muted=mediaVolume<=0?true:muted},[mediaVolume,muted,item?.id]);
 useEffect(()=>{if(isFullscreen)root.current?.focus({preventScroll:true})},[isFullscreen]);
 useEffect(()=>{
  if(!balanceEdges||modal||isFullscreen)return;
  const el=root.current;if(!el)return;
  const sync=()=>{
   const rect=el.getBoundingClientRect();
   el.style.setProperty('--gallery-center-shift',`${window.innerWidth/2-(rect.left+rect.width/2)}px`);
  };
  sync();
  const observer=new ResizeObserver(sync);observer.observe(el);
  window.addEventListener('resize',sync);
  const frame=requestAnimationFrame(sync);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',sync)};
 });
 const choose=(n:number)=>{if(!items.length)return;const target=(n+items.length)%items.length;setIndex(target);onIndexChange?.(target)};
 const advance=()=>{if(items.length>1)choose(index+1);else if(video.current){video.current.currentTime=0;video.current.play().catch(()=>setPlaying(false))}else elapsed.current=0};
 useEffect(()=>{setIndex(Math.min(initialIndex,Math.max(0,items.length-1)))},[initialIndex,items.length]);
 useEffect(()=>{
  elapsed.current=0;setProgress(0);setTime(0);setError(false);setLandscape(false);
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
  if(playing&&visible)v.play().catch(()=>{if(modal){setPlaying(false);return}if(!v.muted){v.muted=true;setMuted(true);v.play().catch(()=>setPlaying(false))}else setPlaying(false)});
  else v.pause();
 },[playing,visible,item?.id,item?.src,expanded]);
 useEffect(()=>{
  if(type==='video'||!playing||!visible||!item||error)return;
  let last=performance.now();
  const intervalMs=Math.max(1200,Number(autoplayMs)||6500);
  const timer=window.setInterval(()=>{const now=performance.now();elapsed.current+=now-last;last=now;setProgress(Math.min(1,elapsed.current/intervalMs));if(elapsed.current>=intervalMs)advance()},120);
  return()=>window.clearInterval(timer);
 },[type,playing,visible,index,items.length,error,autoplayMs]);
 const toggle=()=>setPlaying(v=>!v);
 const exitFullscreen=()=>{
  restoreTime.current=video.current?.currentTime??null;
  if(modal){onExpand?.();return}
  setExpanded(false);
 };
 const fullscreen=()=>{
  if(!modal&&onExpand){onExpand();return}
  if(modal)return;
  restoreTime.current=video.current?.currentTime??null;
  setExpanded(v=>!v);
 };
 const wake=()=>{
  setIdle(false);window.clearTimeout(idleTimer.current);
  if(isFullscreen&&type==='video')idleTimer.current=window.setTimeout(()=>setIdle(true),1600);
 };
 useEffect(()=>{wake();return()=>window.clearTimeout(idleTimer.current)},[isFullscreen,type,item?.id]);
 // Sample the playing frame into a small canvas. It is purely visual, muted by
 // glass and blur, and never creates a second stream or audio/video decoder.
 useEffect(()=>{
  const canvas=ambient.current,v=video.current;if(!canvas||!v||type!=='video')return;
  const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return;
  let frame=0,last=0;
  const draw=(now:number)=>{
   if(v.readyState>=2&&now-last>=100){
    const width=360,height=Math.round(width*(v.videoHeight||9)/(v.videoWidth||16));
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
 const balancedPreview=balanceEdges&&!modal&&!isFullscreen&&items.length>=1;
 const showLeadingSlot=balancedPreview&&items.length<5;
 const showTrailingSlot=balancedPreview&&items.length<4;
 const previewItems:Array<{entry:GalleryItem|null;sourceIndex:number;ghost:boolean;key:string}>=balancedPreview?[
  ...(showLeadingSlot?[{entry:null,sourceIndex:-1,ghost:true,key:'ghost-pre'}]:[]),
  ...items.map((entry,sourceIndex)=>({entry,sourceIndex,ghost:false,key:'main-'+entry.id})),
  ...(showTrailingSlot?[{entry:null,sourceIndex:-1,ghost:true,key:'ghost-post'}]:[])
 ]:items.map((entry,sourceIndex)=>({entry,sourceIndex,ghost:false,key:'main-'+entry.id}));
 const displayIndex=balancedPreview?index+(showLeadingSlot?1:0):index;
 const easingValue=easing==='soft'?'cubic-bezier(.22,.61,.36,1)':easing==='snappy'?'cubic-bezier(.2,.9,.25,1.08)':easing==='linear'?'linear':'cubic-bezier(.16,1,.3,1)';
 const heightCap=maxCardHeight&&Number.isFinite(maxCardHeight)?Math.max(180,maxCardHeight)*frame.ratio:null;
 const gallery=<div ref={root} className={'media-gallery '+(balancedPreview?'is-balanced-preview ':'')+(cleanPreview&&!isFullscreen&&!modal?'is-clean-preview ':'')+(modal?'is-modal ':'')+(expanded?'is-expanded ':'')+(isFullscreen?'is-fullscreen ':'')+(items.length<=1?'is-single ':'')+(type==='video'?'has-video ':'has-image ')+(landscape?'is-landscape':'is-portrait')+' is-frame-'+frame.mode} style={{'--gallery-media-fit':mediaFit,'--gallery-media-position':mediaPositionX+'% '+mediaPositionY+'%','--gallery-frame-ratio':String(frame.ratio),'--gallery-transition-ms':Math.max(120,Number(transitionMs)||820)+'ms','--gallery-easing':easingValue,'--gallery-height-cap-width':heightCap?heightCap+'px':'9999px'} as CSSProperties} role="region" aria-roledescription="carousel" aria-label="미디어 갤러리" tabIndex={0} data-native-cursor={cleanPreview&&!isFullscreen&&!modal&&nativeCursor?'true':undefined} data-cursor-idle={idle?'true':'false'} onPointerMove={wake} onPointerDown={wake} onFocusCapture={wake} onKeyDown={e=>{wake();key(e)}}>
  {showBackdrop&&<><div className="media-gallery-backdrop" aria-hidden="true">
   {(type==='image'||item.poster)&&<img src={type==='image'?item.src:item.poster} alt=""/>}
   {type==='video'&&<canvas ref={ambient} style={{opacity:1}}/>}
  </div><div className="media-gallery-backdrop-glass" aria-hidden="true"/></>}
  {isFullscreen&&<button type="button" className="media-gallery-close" aria-label={modal?'미디어 닫기':'전체 화면 종료'} onClick={()=>{if(modal)onExpand?.();else exitFullscreen()}}><X size={23}/></button>}
  <div className="media-gallery-viewport" onPointerDown={e=>{if(e.button!==0||(e.target as HTMLElement).closest('button,input,model-viewer'))return;const slide=(e.target as HTMLElement).closest<HTMLElement>('[data-gallery-index]');const slideIndex=slide?Number(slide.dataset.galleryIndex):null;drag.current={x:e.clientX,y:e.clientY,slideIndex:Number.isInteger(slideIndex)?slideIndex:null};dragged.current=false;e.currentTarget.setPointerCapture(e.pointerId)}} onPointerUp={e=>{if(!drag.current)return;const start=drag.current,dx=e.clientX-start.x,dy=e.clientY-start.y;drag.current=null;const swiped=Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy);if(swiped){dragged.current=true;choose(index+(dx<0?1:-1))}else if(balanceEdges&&!modal&&!isFullscreen&&start.slideIndex!==null){dragged.current=true;if(start.slideIndex!==index){choose(start.slideIndex)}else if(onExpand){if(type==='video'&&video.current){video.current.muted=false;setMuted(false);void video.current.play().catch(()=>{})}onExpand(start.slideIndex)}}else if(type==='video'&&(modal||isFullscreen)){dragged.current=true;toggle()}e.currentTarget.releasePointerCapture?.(e.pointerId)}} onPointerCancel={()=>{drag.current=null}}>
   <div className="media-gallery-track" style={{'--gallery-index':displayIndex} as CSSProperties}>
    {previewItems.map(({entry,sourceIndex,ghost,key:slideKey},i)=>{
     if(ghost||!entry)return <article className="media-gallery-slide is-placeholder" key={slideKey} aria-hidden="true"><div className="media-gallery-placeholder-stack" aria-hidden="true"/></article>;
     const active=sourceIndex===index,kind=teamMediaType(entry.src);
     return <article className={'media-gallery-slide '+(active?'is-active ':'')} key={slideKey} aria-hidden={!active} inert={!active&&!balancedPreview} data-gallery-index={sourceIndex} data-portfolio-work-index={balanceEdges&&Number.isInteger(entry.sourceIndex)?entry.sourceIndex:undefined}>
      <div className="media-gallery-artwork" data-cursor-label={cleanPreview&&!isFullscreen&&!modal?undefined:(kind==='video'?'VIDEO':kind==='model'?'3D':'IMAGE')} data-native-cursor={cleanPreview&&!isFullscreen&&!modal&&nativeCursor?'true':undefined} onClick={()=>{if(dragged.current){dragged.current=false;return}if(!active){if(balanceEdges)choose(sourceIndex);return}if(modal&&kind==='video'){toggle();return}if(onExpand&&kind!=='model'){if(kind==='video'&&video.current){video.current.muted=false;setMuted(false);void video.current.play().catch(()=>{})}onExpand(index);return}if(kind==='video')toggle()}}>
       {kind==='video'?<>{entry.poster&&<img className="media-gallery-video-poster" src={entry.poster} alt="" aria-hidden="true"/>}<video key={entry.src} ref={active?video:undefined} src={Math.abs(i-displayIndex)<=1?entry.src:undefined} poster={entry.poster} data-has-poster={entry.poster?'true':'false'} data-media-ready={readySrc===entry.src&&!error?'true':'false'} muted={active?muted:true} data-site-autoplay={!modal&&active?'true':undefined} autoPlay={active} playsInline preload={active?'auto':'metadata'} onLoadedData={()=>{if(active){setReady(n=>n+1);onReady?.();if(playing&&visible){const v=video.current;if(v&&!modal){v.muted=true;setMuted(true)}v?.play().catch(()=>setPlaying(false))}}}} onPlaying={()=>{if(active)setReadySrc(entry.src)}} onCanPlay={e=>{if(active&&playing&&visible){if(!modal)e.currentTarget.muted=true;void e.currentTarget.play().catch(()=>{})}}} onLoadedMetadata={e=>{if(active){if(restoreTime.current!==null){e.currentTarget.currentTime=restoreTime.current;restoreTime.current=null}setDuration(Number.isFinite(e.currentTarget.duration)?e.currentTarget.duration:0);setLandscape((e.currentTarget.videoWidth||0)/(e.currentTarget.videoHeight||1)>=1.45);const nextFrame=portfolioMediaFrame(e.currentTarget.videoWidth,e.currentTarget.videoHeight,entry.ratio||'auto');mediaFrameCache.set(entry.src+'|'+(entry.ratio||'auto'),nextFrame);setFrame(nextFrame);if(modal){e.currentTarget.volume=mediaVolume;e.currentTarget.muted=mediaVolume<=0;setMuted(mediaVolume<=0)}setReady(n=>n+1)}}} onTimeUpdate={e=>{if(active){if(e.currentTarget.currentTime>0)setReadySrc(entry.src);setTime(e.currentTarget.currentTime);setProgress(e.currentTarget.duration?e.currentTarget.currentTime/e.currentTarget.duration:0)}}} onEnded={()=>{if(active&&playing)advance()}} onError={()=>{if(active){setError(true);setReadySrc('');setPlaying(false);onReady?.()}}}/></>:<TeamMedia src={entry.src} alt={entry.title} autoPlay={active} interactive={active&&kind==='model'}/>}
      </div>

      {balanceEdges&&!modal&&!isFullscreen&&<div className="media-gallery-slide-caption" aria-hidden="true">
       <div className="media-gallery-slide-caption-inner">
        <span className="media-gallery-slide-caption-label">INFO</span>
        {entry.kicker&&<span className="media-gallery-slide-caption-kicker">{entry.kicker}</span>}
        <h3>{entry.title}</h3>
        {entry.info&&<p className="is-info">{entry.info}</p>}
        {entry.credits&&<><span className="media-gallery-slide-caption-label is-credits">CREDITS</span><p className="is-credits-copy">{entry.credits}</p></>}
       </div>
      </div>}
      {active&&error&&<p className="media-gallery-error" role="status">미디어를 불러오지 못했습니다. <button type="button" onClick={()=>{setError(false);video.current?.load();setPlaying(true)}}>다시 시도</button></p>}
      {active&&kind==='video'&&(!cleanPreview||isFullscreen||modal)&&<div className="media-gallery-tools">
       <button type="button" aria-label={playing?'일시정지':'재생'} onClick={toggle}>{playing?<Pause size={18} fill="currentColor"/>:<Play size={18} fill="currentColor"/>}</button><span>{formatTime(time)}</span><input type="range" aria-label="영상 재생 위치" min={0} max={duration||1} step={.1} value={Math.min(time,duration||0)} onChange={e=>{if(video.current)video.current.currentTime=Number(e.target.value)}}/><span>{formatTime(duration)}</span>
       <div className="media-volume-control">
        <button type="button" aria-label="영상 볼륨 조절">{mediaVolume<=0||muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button>
        <div className="media-volume-popover" role="group" aria-label="영상 볼륨"><input type="range" aria-label="영상 볼륨" min={0} max={1} step={.01} value={muted?0:mediaVolume} onChange={e=>{const next=Number(e.target.value);setMediaVolume(next);setMuted(next<=0)}}/><span>{Math.round((muted?0:mediaVolume)*100)}</span></div>
       </div>
       {!modal&&!balanceEdges&&<button type="button" aria-label={isFullscreen?'전체 화면 종료':'전체 화면'} onClick={fullscreen}>{isFullscreen?<Minimize size={17}/>:<Maximize size={17}/>}</button>}
      </div>}
      {active&&kind!=='video'&&!modal&&!cleanPreview&&!balanceEdges&&<button type="button" className="media-gallery-expand" aria-label={isFullscreen?'전체 화면 종료':'전체 화면'} onClick={fullscreen}><Maximize size={18}/></button>}
     </article>;
    })}
   </div>

  </div>
  {(isFullscreen||modal||(!cleanPreview&&!balanceEdges))&&<div className="media-gallery-caption">{item.kicker&&<span>{item.kicker}</span>}<h3 data-visual-text={captionVisualText} style={captionTitleStyle}>{item.title}</h3>{item.info&&<p className="is-info">{item.info}</p>}{item.credits&&<><span className="media-gallery-caption-credit-label">CREDITS</span><p className="is-credits-copy">{item.credits}</p></>}{!item.info&&!item.credits&&item.description&&<p>{item.description}</p>}</div>}
  {items.length>1&&<div className="media-gallery-navigation" role="group" aria-label="슬라이드 컨트롤">
   <button type="button" className="media-gallery-arrow is-prev" aria-label="이전 미디어" onClick={()=>choose(index-1)}><ChevronLeft size={21}/></button>
   <div className="media-gallery-indicators" role="group" aria-label="미디어 선택">{items.map((entry,i)=><button type="button" key={entry.id} aria-label={`${i+1}번 미디어: ${entry.title}`} aria-current={i===index?'true':undefined} className={i===index?'is-active':''} onClick={()=>choose(i)}><span style={{'--gallery-progress':i===index?progress:0} as CSSProperties}/></button>)}</div>
   <button type="button" className="media-gallery-arrow is-next" aria-label="다음 미디어" onClick={()=>choose(index+1)}><ChevronRight size={21}/></button>
   {(balanceEdges||type!=='video')&&<button type="button" className="media-gallery-toggle" aria-label={playing?'일시정지':'재생'} onClick={toggle}>{playing?<Pause size={18} fill="currentColor"/>:<Play size={18} fill="currentColor"/>}</button>}
  </div>}
  <span className="sr-only" aria-live="polite">{index+1} / {items.length}: {item.title}</span>
 </div>;
 // Native fullscreen retains the DOM. Unsupported browsers get a body portal
 // so transformed sections cannot clip or cover the viewport fallback.
 return expanded&&!modal?createPortal(gallery,document.body):gallery;
}

export default function MediaGalleryDialog({items,index,onClose,onIndexChange,autoPlay=true,autoplayMs=6500,transitionMs=820,easing='smooth'}:{items:GalleryItem[];index:number|null;onClose:()=>void;onIndexChange?:(index:number)=>void;autoPlay?:boolean;autoplayMs?:number;transitionMs?:number;easing?:'smooth'|'soft'|'snappy'|'linear'}){
 return <Dialog open={index!==null} onOpenChange={open=>{if(!open)onClose()}}><DialogContent className="unified-media-dialog" showCloseButton={false} onOpenAutoFocus={e=>e.preventDefault()}><DialogTitle className="sr-only">미디어 갤러리</DialogTitle><DialogDescription className="sr-only">좌우 화살표 또는 스와이프로 같은 카테고리의 미디어를 넘길 수 있습니다.</DialogDescription>{index!==null&&<MediaGallery items={items} initialIndex={index} onIndexChange={onIndexChange} onExpand={onClose} modal preserveItems autoPlay={autoPlay} autoplayMs={autoplayMs} transitionMs={transitionMs} easing={easing}/>}</DialogContent></Dialog>;
}
