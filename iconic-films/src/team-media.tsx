'use client';
import {createElement,useEffect,useRef,useState} from 'react';
import {frameModelViewer,type FramingViewer} from './model-framing';

const ext=(url:string)=>url.split('?')[0].split('#')[0].toLowerCase();
export const teamMediaType=(url:string)=>{
  const value=ext(url);
  if(/\.(mp4|webm|mov|m4v)$/.test(value))return 'video';
  if(/\.(glb|gltf)$/.test(value))return 'model';
  return 'image';
};

export default function TeamMedia({src,alt='',className='',interactive=false,autoPlay=false,suspended=false}:{src:string;alt?:string;className?:string;interactive?:boolean;autoPlay?:boolean;suspended?:boolean}){
  const [modelReady,setModelReady]=useState(false);
  const [mediaReady,setMediaReady]=useState(false);
  const [mediaFailed,setMediaFailed]=useState(false);
  useEffect(()=>{setMediaReady(false);setMediaFailed(false)},[src]);
  const videoRef=useRef<HTMLVideoElement>(null);
  const modelRef=useRef<FramingViewer|null>(null);
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
    if(video.dataset.fullscreenHandoff!=='true'){video.muted=true;video.defaultMuted=true}
    video.loop=true;video.playsInline=true;
    if(suspended&&video.dataset.fullscreenHandoff!=='true'){video.pause();return;}
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries){
        visible.current=entry.isIntersecting;
        if(entry.isIntersecting&&!suspended)video.play().catch(()=>{});
        else if(video.dataset.fullscreenHandoff!=='true')video.pause();
      }
    },{rootMargin:autoPlay?'0px':'120px 0px',threshold:.01});
    observer.observe(video);
    return()=>{observer.disconnect();visible.current=false;if(video.dataset.fullscreenHandoff!=='true')video.pause()};
  },[type,interactive,autoPlay,src,suspended]);
  useEffect(()=>{
    const viewer=modelRef.current;
    if(type!=='model'||!modelReady||!viewer)return;
    let frame=0;
    const update=()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>frameModelViewer(viewer,{resetDistance:true}));
    };
    const resize=typeof ResizeObserver!=='undefined'?new ResizeObserver(update):null;
    resize?.observe(viewer);
    viewer.addEventListener('load',update);
    if(viewer.loaded)update();
    return()=>{cancelAnimationFrame(frame);resize?.disconnect();viewer.removeEventListener('load',update)};
  },[type,modelReady,src]);
  if(type==='video')return <video ref={videoRef} className={className} src={src} draggable={false} muted loop playsInline preload={autoPlay||className.includes('team-stack-media')?'metadata':'none'} controls={interactive} autoPlay={autoPlay} data-media-ready={mediaFailed?'error':mediaReady?'true':'false'} onLoadedData={()=>setMediaReady(true)} onPlaying={()=>setMediaReady(true)} onError={()=>{setMediaReady(false);setMediaFailed(true)}} onCanPlay={e=>{if(autoPlay&&!suspended&&visible.current)e.currentTarget.play().catch(()=>{})}} onPointerEnter={e=>{if(!suspended&&!interactive&&!autoPlay&&window.matchMedia('(hover:hover) and (pointer:fine)').matches)e.currentTarget.play().catch(()=>{})}} onPointerLeave={e=>{if(!suspended&&!interactive&&!autoPlay&&window.matchMedia('(hover:hover) and (pointer:fine)').matches)e.currentTarget.pause()}}/>;
  if(type==='model')return modelReady?createElement('model-viewer',{
    class:className,
    ref:modelRef,
    src,
    alt,
    loading:'lazy',
    'camera-controls':interactive?'':undefined,
    'disable-pan':'',
    'camera-target':'auto auto auto',
    'camera-orbit':'0deg 75deg 145%',
    'min-camera-orbit':'auto auto 100%',
    'max-camera-orbit':'auto auto 3000%',
    'auto-rotate':'',
    'interaction-prompt':'none',
    'shadow-intensity':'1',
    style:{width:'100%',height:'100%',display:'block',background:'transparent'}
  }):<div className={className+' team-model-loading'}>3D</div>;
  return <img className={className} src={src} alt={alt} loading={autoPlay||className.includes('team-stack-media')?'eager':'lazy'} decoding="async" data-media-ready={mediaFailed?'error':mediaReady?'true':'false'} onLoad={()=>setMediaReady(true)} onError={()=>{setMediaReady(false);setMediaFailed(true)}} draggable={false} onDragStart={e=>e.preventDefault()}/>;
}
