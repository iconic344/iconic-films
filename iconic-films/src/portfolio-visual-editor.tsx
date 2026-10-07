'use client';
import {useEffect,useMemo,useState,type Dispatch,type SetStateAction} from 'react';
import {ImagePlus,Save,Settings2,Trash2,Undo2,X} from 'lucide-react';
import type {Config,TeamMember} from './defaults';
import {uploadFile} from './media-upload';

type Selection='hero'|'layout'|'title'|'intro'|'indexLabel'|'name'|`work:${number}`;
const numberValue=(value:unknown,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;

export default function PortfolioVisualEditor({config,memberId,setConfig,onSave,onCancel,onOpenAdmin,onUndo,canUndo,busy}:{
 config:Config;memberId:string;setConfig:Dispatch<SetStateAction<Config>>;
 onSave:()=>void|Promise<void>;onCancel:()=>void;onOpenAdmin:()=>void;onUndo:()=>void;canUndo:boolean;busy:boolean;
}){
 const [selection,setSelection]=useState<Selection>('layout');
 const [rect,setRect]=useState<DOMRect|null>(null);
 const [uploading,setUploading]=useState(false);
 const member=useMemo(()=>config.teamMembers.find(item=>item.id===memberId)||null,[config.teamMembers,memberId]);
 const patchMember=(value:Partial<TeamMember>)=>setConfig(current=>({...current,teamMembers:current.teamMembers.map(item=>item.id===memberId?{...item,...value}:item)}));
 const targetFor=(value:Selection=selection)=>{
  if(typeof document==='undefined')return null;
  if(value.startsWith('work:'))return document.querySelector<HTMLElement>(`[data-portfolio-work-index="${CSS.escape(value.slice(5))}"]`);
  return document.querySelector<HTMLElement>(`[data-portfolio-edit="${CSS.escape(value)}"]`);
 };
 const refresh=()=>{const target=targetFor();setRect(target?target.getBoundingClientRect():null)};
 useEffect(()=>{let raf=0;const sync=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(refresh)};sync();window.addEventListener('scroll',sync,{passive:true});window.addEventListener('resize',sync);return()=>{cancelAnimationFrame(raf);window.removeEventListener('scroll',sync);window.removeEventListener('resize',sync)}},[selection,config]);
 useEffect(()=>{
  const down=(event:PointerEvent)=>{
   const target=event.target as HTMLElement|null;
   if(!target||target.closest('[data-visual-editor="true"]'))return;
   const work=target.closest<HTMLElement>('[data-portfolio-work-index]');
   const editable=target.closest<HTMLElement>('[data-portfolio-edit]');
   if(!work&&!editable)return;
   event.preventDefault();event.stopPropagation();
   if(work?.dataset.portfolioWorkIndex!==undefined){setSelection(('work:'+work.dataset.portfolioWorkIndex) as Selection);return}
   const key=editable?.dataset.portfolioEdit as Selection|undefined;
   if(!key){return}
   setSelection(key);
   if(!member||(key!=='title'&&key!=='intro'&&key!=='indexLabel'))return;
   const map=key==='title'?{x:'portfolioTitleX',y:'portfolioTitleY'}:key==='intro'?{x:'portfolioIntroX',y:'portfolioIntroY'}:{x:'portfolioUtilityX',y:'portfolioUtilityY'};
   const startX=event.clientX,startY=event.clientY,startScroll=window.scrollY,baseX=numberValue((member as any)[map.x]),baseY=numberValue((member as any)[map.y]);
   let active=false;
   const move=(e:PointerEvent)=>{
    const dx=e.clientX-startX,dy=e.clientY-startY+(window.scrollY-startScroll);
    if(!active&&Math.hypot(dx,dy)<3)return;
    active=true;document.documentElement.classList.add('visual-direct-dragging');
    patchMember({[map.x]:Math.round(baseX+dx),[map.y]:Math.round(baseY+dy)} as Partial<TeamMember>);
    if(e.clientY<54)window.scrollBy(0,-18);else if(e.clientY>window.innerHeight-54)window.scrollBy(0,18);
   };
   const up=()=>{document.documentElement.classList.remove('visual-direct-dragging');window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};
   window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
  };
  document.addEventListener('pointerdown',down,true);
  return()=>{document.removeEventListener('pointerdown',down,true);document.documentElement.classList.remove('visual-direct-dragging')};
 },[member,setConfig,memberId]);
 if(!member)return null;

 const uploadHero=async(file?:File)=>{if(!file)return;try{setUploading(true);patchMember({photo:await uploadFile(file)})}finally{setUploading(false)}};
 const uploadWork=async(index:number,file?:File)=>{if(!file)return;try{setUploading(true);const url=await uploadFile(file);patchMember({works:member.works.map((item,i)=>i===index?url:item)})}finally{setUploading(false)}};
 const removeWork=(index:number)=>patchMember({works:member.works.filter((_,i)=>i!==index),portfolioWorkCategories:member.portfolioWorkCategories.filter((_,i)=>i!==index)});
 const selectedWorkIndex=selection.startsWith('work:')?Number(selection.slice(5)):-1;
 const label=selection==='hero'?'대표 미디어':selection==='layout'?'포트폴리오 레이아웃':selection==='title'?'작품 제목':selection==='intro'?'소개 문구':selection==='indexLabel'?'카테고리 인덱스':selection==='name'?'포트폴리오 이름':selection.startsWith('work:')?'작품 미디어':'포트폴리오';

 return <div className="visual-editor-ui portfolio-visual-editor" data-visual-editor="true">
  <div className="visual-editor-topbar is-top">
   <div className="visual-editor-title"><Settings2 size={16}/><strong>EDIT SITE / PORTFOLIO</strong><span>이 페이지를 화면에서 직접 선택해서 편집</span></div>
   <div className="visual-editor-toolbar-tools"><div className="visual-editor-actions">
    <button type="button" disabled={!canUndo} title="직전 수정 되돌리기 · Ctrl+Z" onClick={onUndo}><Undo2 size={15}/><span>되돌리기</span></button>
    <button type="button" onClick={onOpenAdmin}>ADMIN</button>
    <button type="button" onClick={onCancel}><X size={15}/><span>취소</span></button>
    <button type="button" className="is-primary" disabled={busy||uploading} onClick={onSave}><Save size={15}/><span>{busy?'저장 중':'저장'}</span></button>
   </div></div>
  </div>
  <aside className="visual-editor-panel is-right">
   <div className="visual-panel-head"><div><strong>{label}</strong><small>포트폴리오 페이지 전용 직접 편집</small></div></div>
   <div className="portfolio-editor-stack">
    {selection==='hero'&&<><label className="visual-upload"><span>대표 이미지 / 영상 교체</span><input type="file" accept="image/*,video/*,.glb,.gltf" disabled={uploading} onChange={e=>uploadHero(e.target.files?.[0])}/></label>{member.photo&&<button className="visual-secondary-button" onClick={()=>patchMember({photo:''})}><Trash2 size={13}/>대표 미디어 제거</button>}</>}
    {selection==='name'&&<TextInput label="포트폴리오 이름" value={member.name} onChange={value=>patchMember({name:value})}/>}
    {selection==='title'&&<><TextInput label="작품 영역 제목" value={member.portfolioTitle} onChange={value=>patchMember({portfolioTitle:value})}/><NumberInput label="글자 크기" value={member.portfolioTitleSize} suffix="px" onChange={value=>patchMember({portfolioTitleSize:value})}/><NumberInput label="가로 위치" value={member.portfolioTitleX} suffix="px" onChange={value=>patchMember({portfolioTitleX:value})}/><NumberInput label="세로 위치" value={member.portfolioTitleY} suffix="px" onChange={value=>patchMember({portfolioTitleY:value})}/></>}
    {selection==='intro'&&<><TextInput label="소개 문구" value={member.portfolioIntro} multi onChange={value=>patchMember({portfolioIntro:value})}/><NumberInput label="글자 크기" value={member.portfolioIntroSize} suffix="px" onChange={value=>patchMember({portfolioIntroSize:value})}/><NumberInput label="가로 위치" value={member.portfolioIntroX} suffix="px" onChange={value=>patchMember({portfolioIntroX:value})}/><NumberInput label="세로 위치" value={member.portfolioIntroY} suffix="px" onChange={value=>patchMember({portfolioIntroY:value})}/></>}
    {selection==='indexLabel'&&<><TextInput label="카테고리 인덱스 문구" value={member.portfolioTeamIndexLabel} onChange={value=>patchMember({portfolioTeamIndexLabel:value})}/><NumberInput label="글자 크기" value={member.portfolioUtilitySize} suffix="px" onChange={value=>patchMember({portfolioUtilitySize:value})}/></>}
    {selection==='layout'&&<><div className="portfolio-editor-row"><button className={member.portfolioLayout==='grid'?'is-active':''} onClick={()=>patchMember({portfolioLayout:'grid'})}>GRID</button><button className={member.portfolioLayout==='slider'?'is-active':''} onClick={()=>patchMember({portfolioLayout:'slider'})}>SLIDER</button></div><NumberInput label="그리드 열 수" value={member.portfolioColumns} onChange={value=>patchMember({portfolioColumns:Math.max(1,Math.round(value))})}/><NumberInput label="미디어 간격" value={member.portfolioGap} suffix="px" onChange={value=>patchMember({portfolioGap:value})}/><NumberInput label="모서리" value={member.portfolioRadius} suffix="px" onChange={value=>patchMember({portfolioRadius:value})}/><NumberInput label="그리드 너비" value={member.portfolioGridWidth} suffix="%" onChange={value=>patchMember({portfolioGridWidth:value})}/><NumberInput label="슬라이드 높이" value={member.portfolioSliderHeight} suffix="px" onChange={value=>patchMember({portfolioSliderHeight:value})}/></>}
    {selectedWorkIndex>=0&&<><label className="visual-upload"><span>선택 작품 교체</span><input type="file" accept="image/*,video/*,.glb,.gltf" disabled={uploading} onChange={e=>uploadWork(selectedWorkIndex,e.target.files?.[0])}/></label><TextInput label="작품 카테고리" value={member.portfolioWorkCategories[selectedWorkIndex]||''} onChange={value=>{const next=[...member.portfolioWorkCategories];next[selectedWorkIndex]=value;patchMember({portfolioWorkCategories:next})}}/><button className="visual-secondary-button" onClick={()=>removeWork(selectedWorkIndex)}><Trash2 size={13}/>이 작품 삭제</button></>}
    <p className="visual-help">페이지 안의 제목·카테고리 문구·대표 미디어·작품 카드·작품 영역을 직접 클릭하세요. 제목/문구는 화면에서 잡아 끌어 위치도 바꿀 수 있습니다.</p>
   </div>
  </aside>
  {rect&&<div className="visual-selection-frame is-panel-right" style={{left:rect.left,top:rect.top,width:rect.width,height:rect.height}}><span className="visual-selection-label">{label}</span></div>}
 </div>;
}

function TextInput({label,value,onChange,multi=false}:{label:string;value:string;onChange:(value:string)=>void;multi?:boolean}){
 return <label className="visual-field"><span>{label}</span>{multi?<textarea value={value||''} onChange={e=>onChange(e.target.value)}/>:<input value={value||''} onChange={e=>onChange(e.target.value)}/>}</label>;
}
function NumberInput({label,value,suffix='',onChange}:{label:string;value:number;suffix?:string;onChange:(value:number)=>void}){
 return <label className="visual-number-field"><span>{label}<b>{suffix}</b></span><input type="number" value={numberValue(value)} onChange={e=>{const next=Number(e.target.value);if(Number.isFinite(next))onChange(next)}}/></label>;
}
