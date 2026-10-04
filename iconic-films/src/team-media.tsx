'use client';
import {createElement,useEffect,useState} from 'react';

const ext=(url:string)=>url.split('?')[0].split('#')[0].toLowerCase();
export const teamMediaType=(url:string)=>{
  const value=ext(url);
  if(/\.(mp4|webm|mov)$/.test(value))return 'video';
  if(/\.(glb|gltf)$/.test(value))return 'model';
  return 'image';
};

export default function TeamMedia({src,alt='',className='',interactive=false,autoPlay=false}:{src:string;alt?:string;className?:string;interactive?:boolean;autoPlay?:boolean}){
  const [modelReady,setModelReady]=useState(false);
  const type=teamMediaType(src);
  useEffect(()=>{
    if(type!=='model')return;
    let live=true;
    import('@google/model-viewer').then(()=>{if(live)setModelReady(true)}).catch(()=>{});
    return()=>{live=false};
  },[type]);
  if(type==='video')return <video className={className} src={src} muted loop playsInline preload={autoPlay?'auto':'metadata'} controls={interactive} autoPlay={autoPlay} onCanPlay={e=>{if(autoPlay)e.currentTarget.play().catch(()=>{})}} onPointerEnter={e=>{if(!interactive)e.currentTarget.play().catch(()=>{})}} onPointerLeave={e=>{if(!interactive)e.currentTarget.pause()}}/>;
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
  return <img className={className} src={src} alt={alt} loading="lazy"/>;
}
