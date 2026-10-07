'use client';
import type {CSSProperties} from 'react';
import type {Config,PageBlock} from './defaults';
import {MediaGallery,type GalleryItem} from './media-gallery';
import TeamMedia,{teamMediaType} from './team-media';

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
  translate:'0 '+(block.offsetY||0)+'px'
 } as CSSProperties;
 const className='page-block page-block-'+block.type+(block.visible?'':' is-hidden-preview');

 if(block.type==='spacer')return <div className={className} data-visual-block-id={block.id} style={style} aria-label="여백 영역"><span className="page-block-editor-placeholder">{editing?'여백 '+block.height+'px':''}</span></div>;

 if(block.type==='text')return <section className={className} data-visual-block-id={block.id} style={style}>
  <div className="page-block-text" style={{textAlign:block.align,color:block.color||undefined,fontSize:block.fontSize}}>{block.title&&<strong>{block.title}</strong>}{block.text&&<p>{block.text}</p>}{!block.title&&!block.text&&editing&&<span className="page-block-editor-placeholder">텍스트를 입력하세요</span>}</div>
 </section>;

 if(block.type==='media')return <section className={className} data-visual-block-id={block.id} style={style}>
  {block.title&&<h3 className="page-block-title">{block.title}</h3>}
  <div className="page-block-media-frame">{block.media?<TeamMedia src={block.media} alt={block.title||'Media'} className="page-block-media" autoPlay interactive={teamMediaType(block.media)==='model'}/>:editing?<span className="page-block-editor-placeholder">이미지 · 영상 · 3D 파일을 추가하세요</span>:null}</div>
 </section>;

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
