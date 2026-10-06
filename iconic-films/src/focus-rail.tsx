import {useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,RotateCcw,Pause,Play} from 'lucide-react';
import TeamMedia,{teamMediaType} from './team-media';
import type {GalleryItem} from './media-gallery';

function FocusCard({item,onOpen}:{item:GalleryItem;onOpen:()=>void}){
 const video=useRef<HTMLVideoElement>(null),card=useRef<HTMLElement>(null);
 const [playing,setPlaying]=useState(false),[ended,setEnded]=useState(false);
 useEffect(()=>{
  const node=card.current,v=video.current;if(!node||!v)return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting&&!reduced&&!v.ended)v.play().catch(()=>{});else v.pause()},{threshold:.55});observer.observe(node);
  return()=>{observer.disconnect();v.pause()};
 },[item.src]);
 const toggle=()=>{const v=video.current;if(!v)return;if(v.ended){v.currentTime=0;setEnded(false)}if(v.paused)v.play().catch(()=>{});else v.pause()};
 return <article ref={card} className="focus-card"><div className="focus-card-visual">
  {teamMediaType(item.src)==='video'?<video ref={video} src={item.src} poster={item.poster} muted playsInline preload="metadata" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>{setEnded(true);setPlaying(false)}}/>:<TeamMedia src={item.src} alt={item.title}/>}
  <button type="button" className="focus-card-open" aria-label={item.title+' 미디어 보기'} onClick={onOpen}/>
  {teamMediaType(item.src)==='video'&&<button type="button" className="focus-card-replay" aria-label={ended?'영상 다시 재생':playing?'영상 일시정지':'영상 재생'} onClick={toggle}>{ended?<RotateCcw size={18}/>:playing?<Pause size={17}/>:<Play size={17}/>}</button>}
 </div><p><strong>{item.title}.</strong> {item.description||item.kicker}</p></article>;
}

export default function FocusRail({items,onOpen}:{items:GalleryItem[];onOpen:(index:number)=>void}){
 const rail=useRef<HTMLDivElement>(null),drag=useRef<{x:number;left:number}|null>(null),moved=useRef(false);
 const [start,setStart]=useState(true),[end,setEnd]=useState(false);
 useEffect(()=>{
  const el=rail.current;if(!el)return;
  const sync=()=>{setStart(el.scrollLeft<3);setEnd(el.scrollLeft+el.clientWidth>=el.scrollWidth-3)};
  sync();const observer=new ResizeObserver(sync);observer.observe(el);el.addEventListener('scroll',sync,{passive:true});
  return()=>{observer.disconnect();el.removeEventListener('scroll',sync)};
 },[items.length]);
 const move=(dir:number)=>rail.current?.scrollBy({left:dir*(rail.current.clientWidth*.75),behavior:'smooth'});

 if(!items.length)return null;

 return <section className="focus-section" aria-label="In focus"><div className="focus-section-head"><span className="kicker">IN FOCUS</span><h2>장면을 만드는 시선.</h2></div><div ref={rail} className={"focus-rail"+(!items.length?" is-empty":"")} tabIndex={items.length?0:undefined} aria-label="가로 미디어 카드" onKeyDown={e=>{if((e.target as HTMLElement).closest('button'))return;if(e.key==='ArrowLeft'){e.preventDefault();move(-1)}if(e.key==='ArrowRight'){e.preventDefault();move(1)}}} onPointerDown={e=>{if(e.pointerType!=='mouse'||e.button!==0)return;drag.current={x:e.clientX,left:e.currentTarget.scrollLeft};moved.current=false}} onPointerMove={e=>{if(!drag.current)return;const dx=e.clientX-drag.current.x;if(Math.abs(dx)>8){moved.current=true;e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.scrollLeft=drag.current.left-dx}}} onPointerUp={e=>{drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}} onPointerCancel={()=>{drag.current=null}} onClickCapture={e=>{if(moved.current){e.preventDefault();e.stopPropagation();moved.current=false}}}>
  {items.map((item,i)=><FocusCard key={item.id} item={item} onOpen={()=>onOpen(i)}/>)}
 </div>{items.length>1&&<div className="focus-navigation"><button type="button" aria-label="이전 카드" disabled={start} onClick={()=>move(-1)}><ChevronLeft size={20}/></button><button type="button" aria-label="다음 카드" disabled={end} onClick={()=>move(1)}><ChevronRight size={20}/></button></div>}</section>;
}
