'use client';
import type {CSSProperties} from 'react';
import type {Config,PageBlock} from './defaults';
import {MediaGallery,type GalleryItem} from './media-gallery';
import {teamMediaType} from './team-media';

const patternImage=(pattern:string,color:string,size:number)=>({none:'none',dots:`radial-gradient(circle, ${color} 1px, transparent 1.5px)`,grid:`linear-gradient(${color} 1px,transparent 1px),linear-gradient(90deg,${color} 1px,transparent 1px)`,diagonal:`repeating-linear-gradient(45deg,${color} 0px,${color} 1px,transparent 1px,transparent ${size}px)`,checker:`conic-gradient(${color} 25%,transparent 0 50%,${color} 0 75%,transparent 0)`,lines:`linear-gradient(${color} 1px, transparent 1px)`,rings:`repeating-radial-gradient(circle at center,transparent 0,transparent ${Math.max(1,size-1)}px,${color} ${size}px,transparent ${size+1}px)`} as Record<string,string>)[pattern]||'none';

export default function PageBlockView({block,config,order,editing=false}:{block:PageBlock;config:Config;order:number;editing?:boolean}){
 if(!block.visible&&!editing)return null;
 const style={
  order,
  width:block.width+'%',
  minHeight:block.type==='spacer'?block.height+'px':undefined,
  '--page-block-height':block.height+'px',
  '--page-block-gap':block.gap+'px',
  '--page-block-radius':block.radius+'px',
  '--page-block-bg':block.background||'transparent',
  '--page-block-color':block.color||'var(--ink)',
  '--page-block-font-size':block.fontSize+'px',
  '--page-block-media-fit':block.mediaFit,
  '--page-block-media-position':block.mediaPositionX+'% '+block.mediaPositionY+'%',
  '--page-block-fade-top':block.fadeTopSize+'%',
  '--page-block-fade-bottom':block.fadeBottomSize+'%',
  '--page-block-fade-density':block.fadeDensity+'%',
  '--page-block-fade-opacity':String(block.fadeEnabled?block.fadeOpacity/100:0),
  '--page-block-fade-blur':block.fadeBlur+'px',
  translate:'0 '+(block.offsetY||0)+'px'
 } as CSSProperties;
 const className='page-block page-block-'+block.type+(block.visible?'':' is-hidden-preview');

 if(block.type==='spacer')return <div className={className} data-visual-block-id={block.id} style={style} aria-label="여백 영역"><span className="page-block-editor-placeholder">{editing?'여백 '+block.height+'px':''}</span></div>;

 if(block.type==='text')return <section className={className} data-visual-block-id={block.id} style={style}>
  <div className="page-block-text" style={{textAlign:block.align,color:block.color||undefined,fontSize:block.fontSize}}>{block.title&&<strong>{block.title}</strong>}{block.text&&<p>{block.text}</p>}{!block.title&&!block.text&&editing&&<span className="page-block-editor-placeholder">텍스트를 입력하세요</span>}</div>
 </section>;

 if(block.type==='media'){
  const mediaItems:GalleryItem[]=block.media?[{id:block.id+'-media',src:block.media,title:block.title||'Media'}]:[];
  return <section className={className} data-visual-block-id={block.id} style={style}>
   {block.title&&<h3 className="page-block-title">{block.title}</h3>}
   <div className="page-block-media-frame" data-native-cursor="true">
    {mediaItems.length?<MediaGallery items={mediaItems} cleanPreview mediaFit={block.mediaFit} mediaPositionX={block.mediaPositionX} mediaPositionY={block.mediaPositionY} autoPlay={block.autoplay}/>:editing?<span className="page-block-editor-placeholder">이미지 · 영상 · 3D 파일을 추가하세요</span>:null}
    {block.fadeEnabled&&<div className="page-block-local-fade" aria-hidden="true"/>}
    {block.pattern!=='none'&&<div className="page-block-local-pattern" aria-hidden="true" style={{backgroundImage:patternImage(block.pattern,block.patternColor,block.patternSize),backgroundSize:`${block.patternSize}px ${block.patternSize}px`,opacity:block.patternOpacity/100}}/>}
   </div>
  </section>;
 }

 const items:GalleryItem[]=(config.focusItems||[]).filter(item=>item.visible!==false&&(item.video||item.poster)).map((item,index)=>({
  id:item.id||block.id+'-'+index,
  src:item.video||item.poster,
  poster:item.poster||undefined,
  title:item.title||'Slide '+String(index+1).padStart(2,'0'),
  description:item.description||item.role||'',
  kicker:item.category||''
 }));
 return <section className={className} data-visual-block-id={block.id} style={style}>
  {block.title&&<h3 className="page-block-title">{block.title}</h3>}
  {items.length?<MediaGallery items={items} balanceEdges/>:<div className="page-block-slider-empty">{editing?'슬라이더 미디어를 추가하세요':'No media'}</div>}
 </section>;
}
