'use client';
import {createElement,useEffect,useRef,useState} from 'react';

const ext=(url:string)=>url.split('?')[0].split('#')[0].toLowerCase();
export const teamMediaType=(url:string)=>{
  const value=ext(url);
  if(/\.(mp4|webm|mov|m4v)$/.test(value))return 'video';
  if(/\.(glb|gltf)$/.test(value))return 'model';
  return 'image';
};

export default function TeamMedia({src,alt='',className='',interactive=false,autoPlay=false}:{src:string;alt?:string;className?:string;interactive?:boolean;autoPlay?:boolean}){
  const [modelReady,setModelReady]=useState(false);
  const videoRef=useRef<HTMLVideoElement>(null);
  const visible=useRef(false);
  const type=teamMediaType(src);
  useEffect(()=>{
    if(type!=='model')return;
    let live=true;
    import('@google/model-viewer').then(()=>{if(live)setModelReady(true)}).catch(()=>{});
    return()=>{live=false};
  },[type]);
  useEffect(()=>{
    if(type!=='video'||interactive||!videoRef.current)return;
    const mobile=window.matchMedia('(max-width: 820px), (max-width: 1180px) and (any-pointer: coarse)').matches;
    if(!autoPlay&&!mobile)return;
    const video=videoRef.current;
    video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries){
        visible.current=entry.isIntersecting;
        if(entry.isIntersecting)video.play().catch(()=>{});
        else video.pause();
      }
    },{rootMargin:autoPlay?'0px':'120px 0px',threshold:.01});
    observer.observe(video);
    return()=>{observer.disconnect();visible.current=false;video.pause()};
  },[type,interactive,autoPlay,src]);
  if(type==='video')return <video ref={videoRef} className={className} src={src} draggable={false} muted loop playsInline preload={autoPlay?'metadata':'none'} controls={interactive} autoPlay={autoPlay} onCanPlay={e=>{if(autoPlay&&visible.current)e.currentTarget.play().catch(()=>{})}} onPointerEnter={e=>{if(!interactive&&!autoPlay&&window.matchMedia('(hover:hover) and (pointer:fine)').matches)e.currentTarget.play().catch(()=>{})}} onPointerLeave={e=>{if(!interactive&&!autoPlay&&window.matchMedia('(hover:hover) and (pointer:fine)').matches)e.currentTarget.pause()}}/>;
  if(type==='model')return modelReady?createElement('model-viewer',{
    class:className,
    src,
    alt,
    loading:'lazy',
    'camera-controls':interactive?'':undefined,
    'auto-rotate':'',
    'interaction-prompt':'none',
    'shadow-intensity':'1',
    style:{width:'100%',height:'100%',display:'block',background:'transparent'}
  }):<div className={className+' team-model-loading'}>3D</div>;
  return <img className={className} src={src} alt={alt} loading={autoPlay?'eager':'lazy'} decoding="async" draggable={false} onDragStart={e=>e.preventDefault()}/>;
}
