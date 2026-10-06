'use client';
import {useEffect,useMemo,useRef,useState,type Dispatch,type PointerEvent,type SetStateAction} from 'react';
import {ArrowDown,ArrowUp,Copy,Grip,Maximize2,Plus,RotateCcw,Save,Settings2,Trash2,X} from 'lucide-react';
import type {Config,NavItemKey,Work} from './defaults';
import {uploadFile} from './media-upload';

type SectionKey='nav'|'hero'|'work'|'about'|'team'|'footer';
export type VisualSelection=SectionKey|`work:${string}`;

const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
const sections:{key:SectionKey;label:string}[]=[
 {key:'nav',label:'Header'},{key:'hero',label:'Main visual'},{key:'work',label:'Work'},
 {key:'about',label:'About'},{key:'team',label:'Team'},{key:'footer',label:'Footer'}
];
const navLabels:Record<NavItemKey,string>={work:'Work',about:'About',team:'Team',contact:'Contact'};

export default function VisualSiteEditor({
 config,setConfig,selection,setSelection,onSave,onCancel,onOpenAdmin,busy
}:{
 config:Config;
 setConfig:Dispatch<SetStateAction<Config>>;
 selection:VisualSelection;
 setSelection:(value:VisualSelection)=>void;
 onSave:()=>void|Promise<void>;
 onCancel:()=>void;
 onOpenAdmin:()=>void;
 busy:boolean;
}){
 const [rect,setRect]=useState<DOMRect|null>(null);
 const [uploading,setUploading]=useState(false);
 const dragState=useRef<{x:number;y:number;baseX:number;baseY:number}|null>(null);
 const resizeState=useRef<{x:number;y:number;base:number}|null>(null);

 const selectedWorkId=selection.startsWith('work:')?selection.slice(5):'';
 const selectedWork=selectedWorkId?config.works.find(w=>w.id===selectedWorkId)||null:null;
 const sectionSelection=(selection.startsWith('work:')?'work':selection) as SectionKey;

 const target=()=>{
  if(typeof document==='undefined')return null;
  if(selectedWorkId){
   return Array.from(document.querySelectorAll<HTMLElement>('[data-visual-work-id]')).find(el=>el.dataset.visualWorkId===selectedWorkId)||null;
  }
  return document.querySelector<HTMLElement>(`[data-visual-section="${selection}"]`);
 };
 const refresh=()=>{
  const el=target();
  setRect(el?el.getBoundingClientRect():null);
 };
 useEffect(()=>{
  let raf=0;
  const sync=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(refresh)};
  sync();
  window.addEventListener('scroll',sync,{passive:true});
  window.addEventListener('resize',sync);
  return()=>{cancelAnimationFrame(raf);window.removeEventListener('scroll',sync);window.removeEventListener('resize',sync)};
 },[selection,config]);

 const patch=<K extends keyof Config>(key:K,value:Config[K])=>setConfig(d=>({...d,[key]:value}));
 const patchWork=(id:string,key:keyof Work,value:Work[keyof Work])=>setConfig(d=>({...d,works:d.works.map(w=>w.id===id?{...w,[key]:value}:w)}));

 const layoutKeys=(key:SectionKey)=>{
  if(key==='hero')return {x:'heroOffsetX',y:'heroOffsetY',scale:'heroScale'} as const;
  if(key==='work')return {x:'workOffsetX',y:'workOffsetY',scale:'workScale'} as const;
  if(key==='about')return {x:'aboutOffsetX',y:'aboutOffsetY',scale:'aboutScale'} as const;
  if(key==='team')return {x:'teamOffsetX',y:'teamOffsetY',scale:'teamScale'} as const;
  if(key==='footer')return {x:'footerOffsetX',y:'footerOffsetY',scale:'footerScale'} as const;
  return null;
 };
 const meta=layoutKeys(sectionSelection);

 const beginMove=(e:PointerEvent<HTMLButtonElement>)=>{
  if(!meta||selectedWork)return;
  e.preventDefault();e.stopPropagation();
  dragState.current={x:e.clientX,y:e.clientY,baseX:Number(config[meta.x]),baseY:Number(config[meta.y])};
  const move=(event:globalThis.PointerEvent)=>{
   const start=dragState.current;if(!start)return;
   const nx=clamp(Math.round(start.baseX+event.clientX-start.x),-500,500);
   const ny=clamp(Math.round(start.baseY+event.clientY-start.y),-500,500);
   setConfig(d=>({...d,[meta.x]:nx,[meta.y]:ny}));
  };
  const up=()=>{dragState.current=null;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
 };
 const beginResize=(e:PointerEvent<HTMLButtonElement>)=>{
  if(!meta||selectedWork)return;
  e.preventDefault();e.stopPropagation();
  resizeState.current={x:e.clientX,y:e.clientY,base:Number(config[meta.scale])};
  const move=(event:globalThis.PointerEvent)=>{
   const start=resizeState.current;if(!start)return;
   const delta=((event.clientX-start.x)+(event.clientY-start.y))/700;
   const scale=Math.round(clamp(start.base+delta,.7,1.35)*100)/100;
   setConfig(d=>({...d,[meta.scale]:scale}));
  };
  const up=()=>{resizeState.current=null;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
 };

 const isVisible=(key:SectionKey)=>{
  if(key==='nav')return config.showNav;
  if(key==='hero')return config.showHero;
  if(key==='footer')return config.showFooter;
  if(key==='work')return config.navOrder.includes('work');
  if(key==='about')return config.showAbout&&config.navOrder.includes('about');
  if(key==='team')return config.showTeam&&config.navOrder.includes('team');
  return true;
 };
 const removeSection=(key:SectionKey)=>setConfig(d=>{
  if(key==='nav')return {...d,showNav:false};
  if(key==='hero')return {...d,showHero:false};
  if(key==='footer')return {...d,showFooter:false};
  if(key==='work')return {...d,navOrder:d.navOrder.filter(x=>x!=='work')};
  if(key==='about')return {...d,showAbout:false,navOrder:d.navOrder.filter(x=>x!=='about')};
  if(key==='team')return {...d,showTeam:false,navOrder:d.navOrder.filter(x=>x!=='team')};
  return d;
 });
 const restoreSection=(key:SectionKey)=>setConfig(d=>{
  if(key==='nav')return {...d,showNav:true};
  if(key==='hero')return {...d,showHero:true};
  if(key==='footer')return {...d,showFooter:true};
  if(key==='work')return {...d,navOrder:d.navOrder.includes('work')?d.navOrder:[...d.navOrder,'work']};
  if(key==='about')return {...d,showAbout:true,navOrder:d.navOrder.includes('about')?d.navOrder:[...d.navOrder,'about']};
  if(key==='team')return {...d,showTeam:true,navOrder:d.navOrder.includes('team')?d.navOrder:[...d.navOrder,'team']};
  return d;
 });
 const resetLayout=()=>{
  if(!meta)return;
  setConfig(d=>({...d,[meta.x]:0,[meta.y]:0,[meta.scale]:1}));
 };
 const reorder=(item:NavItemKey,dir:number)=>setConfig(d=>{
  const arr=[...d.navOrder],i=arr.indexOf(item),j=i+dir;
  if(i<0||j<0||j>=arr.length)return d;
  [arr[i],arr[j]]=[arr[j],arr[i]];
  return {...d,navOrder:arr};
 });

 const addWork=()=>{
  const id='visual-'+Date.now();
  const work:Work={id,title:'New work',category:'Unassigned',year:new Date().getFullYear().toString(),role:'',description:'',poster:'',video:'',visible:false};
  setConfig(d=>({...d,works:[...d.works,work]}));
  setSelection(`work:${id}`);
 };
 const duplicateWork=(work:Work)=>{
  const copy={...work,id:'visual-'+Date.now(),title:work.title+' copy'};
  setConfig(d=>({...d,works:[...d.works,copy]}));
  setSelection(`work:${copy.id}`);
 };
 const deleteWork=(id:string)=>{
  setConfig(d=>({...d,works:d.works.filter(w=>w.id!==id)}));
  setSelection('work');
 };
 const upload=async(file:File|undefined,field:'poster'|'video')=>{
  if(!file||!selectedWork)return;
  try{
   setUploading(true);
   const url=await uploadFile(file);
   setConfig(d=>({...d,works:d.works.map(w=>w.id===selectedWork.id?{...w,[field]:url,visible:true}:w)}));
  }finally{setUploading(false)}
 };

 const removed=sections.filter(s=>!isVisible(s.key));
 const activeSections=sections.filter(s=>isVisible(s.key));

 return <div className="visual-editor-ui" data-visual-editor="true">
  <div className="visual-editor-topbar">
   <div className="visual-editor-title"><Settings2 size={16}/><strong>VISUAL EDIT</strong><span>클릭해서 선택 · 핸들로 이동/크기조절</span></div>
   <div className="visual-editor-actions">
    <button type="button" onClick={onOpenAdmin}>ADMIN</button>
    <button type="button" onClick={onCancel}><X size={15}/> 취소</button>
    <button type="button" className="is-primary" disabled={busy} onClick={onSave}><Save size={15}/> {busy?'저장 중':'저장'}</button>
   </div>
  </div>

  <aside className="visual-editor-panel">
   <div className="visual-editor-section-picker">
    {activeSections.map(s=><button type="button" className={sectionSelection===s.key&&!selectedWork?'is-active':''} key={s.key} onClick={()=>setSelection(s.key)}>{s.label}</button>)}
   </div>

   {removed.length>0&&<div className="visual-editor-restore">
    <span>숨긴 영역 추가</span>
    <div>{removed.map(s=><button type="button" key={s.key} onClick={()=>{restoreSection(s.key);setSelection(s.key)}}><Plus size={13}/>{s.label}</button>)}</div>
   </div>}

   <div className="visual-editor-context">
    {selectedWork?<WorkEditor work={selectedWork} patch={(key,value)=>patchWork(selectedWork.id,key,value)} onUpload={upload} uploading={uploading} onDuplicate={()=>duplicateWork(selectedWork)} onDelete={()=>deleteWork(selectedWork.id)}/>:
     <SectionEditor section={sectionSelection} config={config} patch={patch} reorder={reorder} addWork={addWork}/>}
   </div>

   {!selectedWork&&sectionSelection!=='nav'&&<div className="visual-editor-layout">
    <div className="visual-editor-panel-head"><strong>Layout</strong>{meta&&<button type="button" onClick={resetLayout}><RotateCcw size={13}/> Reset</button>}</div>
    {meta&&<>
     <Range label="X" value={Number(config[meta.x])} min={-500} max={500} step={1} onChange={v=>patch(meta.x,v as never)}/>
     <Range label="Y" value={Number(config[meta.y])} min={-500} max={500} step={1} onChange={v=>patch(meta.y,v as never)}/>
     <Range label="Size" value={Math.round(Number(config[meta.scale])*100)} min={70} max={135} step={1} suffix="%" onChange={v=>patch(meta.scale,(v/100) as never)}/>
    </>}
    <button type="button" className="visual-editor-danger" onClick={()=>removeSection(sectionSelection)}><Trash2 size={14}/> 이 영역 숨기기</button>
   </div>}
  </aside>

  {rect&&<div className="visual-selection-frame" style={{left:rect.left,top:rect.top,width:rect.width,height:rect.height}}>
   <span className="visual-selection-label">{selectedWork?'WORK CARD':sections.find(s=>s.key===sectionSelection)?.label}</span>
   {meta&&!selectedWork&&<button type="button" className="visual-move-handle" aria-label="영역 이동" onPointerDown={beginMove}><Grip size={16}/></button>}
   {meta&&!selectedWork&&<button type="button" className="visual-resize-handle" aria-label="영역 크기 조절" onPointerDown={beginResize}><Maximize2 size={15}/></button>}
  </div>}
 </div>;
}

function Range({label,value,min,max,step,suffix='',onChange}:{label:string;value:number;min:number;max:number;step:number;suffix?:string;onChange:(v:number)=>void}){
 return <label className="visual-range"><span>{label}<b>{Math.round(value*100)/100}{suffix}</b></span><input type="range" value={value} min={min} max={max} step={step} onChange={e=>onChange(Number(e.target.value))}/></label>;
}

function TextField({label,value,onChange,multi=false}:{label:string;value:string;onChange:(v:string)=>void;multi?:boolean}){
 return <label className="visual-field"><span>{label}</span>{multi?<textarea value={value} onChange={e=>onChange(e.target.value)}/>:<input value={value} onChange={e=>onChange(e.target.value)}/>}</label>;
}

function SectionEditor({section,config,patch,reorder,addWork}:{section:SectionKey;config:Config;patch:<K extends keyof Config>(key:K,value:Config[K])=>void;reorder:(item:NavItemKey,dir:number)=>void;addWork:()=>void}){
 if(section==='nav')return <>
  <h3>Header</h3>
  <TextField label="브랜드 이름" value={config.name} onChange={v=>patch('name',v)}/>
  <Range label="Glass opacity" value={config.navOpacity} min={0} max={100} step={1} suffix="%" onChange={v=>patch('navOpacity',v)}/>
  <div className="visual-menu-order"><span>Menu order</span>{config.navOrder.map((item,index)=><div key={item}><b>{navLabels[item]}</b><div><button disabled={index===0} onClick={()=>reorder(item,-1)}><ArrowUp size={13}/></button><button disabled={index===config.navOrder.length-1} onClick={()=>reorder(item,1)}><ArrowDown size={13}/></button></div></div>)}</div>
 </>;
 if(section==='hero')return <>
  <h3>Main visual</h3>
  <TextField label="Hover title" value={config.heroCaption} onChange={v=>patch('heroCaption',v)}/>
  <TextField label="Eyebrow" value={config.eyebrow} onChange={v=>patch('eyebrow',v)}/>
  <TextField label="Bottom copy" value={config.subtitle} onChange={v=>patch('subtitle',v)}/>
 </>;
 if(section==='work')return <>
  <div className="visual-editor-panel-head"><h3>Work</h3><button type="button" onClick={addWork}><Plus size={13}/> 작품 추가</button></div>
  <TextField label="Small title" value={config.workKicker} onChange={v=>patch('workKicker',v)}/>
  <TextField label="Headline" value={config.headline} multi onChange={v=>patch('headline',v)}/>
  <TextField label="Aside" value={config.workAside} multi onChange={v=>patch('workAside',v)}/>
  <Range label="Columns" value={config.columns} min={1} max={4} step={1} onChange={v=>patch('columns',v)}/>
  <div className="visual-work-list">{config.works.map(w=><button key={w.id} type="button" onClick={()=>document.querySelector<HTMLElement>(`[data-visual-work-id="${w.id}"]`)?.click()}><span>{w.title||'Untitled'}</span><small>{w.visible?'LIVE':'DRAFT'}</small></button>)}</div>
 </>;
 if(section==='about')return <>
  <h3>About</h3>
  <TextField label="Small title" value={config.aboutKicker} onChange={v=>patch('aboutKicker',v)}/>
  <TextField label="Headline" value={config.aboutHeadline} multi onChange={v=>patch('aboutHeadline',v)}/>
  <TextField label="Body" value={config.about} multi onChange={v=>patch('about',v)}/>
  <TextField label="Disciplines" value={config.aboutDisciplines} multi onChange={v=>patch('aboutDisciplines',v)}/>
 </>;
 if(section==='team')return <>
  <h3>Team</h3>
  <TextField label="Small title" value={config.teamKicker} onChange={v=>patch('teamKicker',v)}/>
  <TextField label="Headline" value={config.teamHeadline} multi onChange={v=>patch('teamHeadline',v)}/>
  <Range label="Media size" value={config.teamMediaSize} min={120} max={520} step={1} suffix="px" onChange={v=>patch('teamMediaSize',v)}/>
  <Range label="Row gap" value={config.teamRowGap} min={12} max={180} step={1} suffix="px" onChange={v=>patch('teamRowGap',v)}/>
 </>;
 return <>
  <h3>Footer</h3>
  <TextField label="Admin label" value={config.footerAdminLabel} onChange={v=>patch('footerAdminLabel',v)}/>
 </>;
}

function WorkEditor({work,patch,onUpload,uploading,onDuplicate,onDelete}:{work:Work;patch:(key:keyof Work,value:Work[keyof Work])=>void;onUpload:(file:File|undefined,field:'poster'|'video')=>void;uploading:boolean;onDuplicate:()=>void;onDelete:()=>void}){
 return <>
  <div className="visual-editor-panel-head"><h3>Work card</h3><div><button type="button" onClick={onDuplicate}><Copy size={13}/></button><button type="button" className="is-danger" onClick={onDelete}><Trash2 size={13}/></button></div></div>
  <TextField label="Title" value={work.title} onChange={v=>patch('title',v)}/>
  <TextField label="Category" value={work.category} onChange={v=>patch('category',v)}/>
  <TextField label="Year" value={work.year} onChange={v=>patch('year',v)}/>
  <TextField label="Role" value={work.role} onChange={v=>patch('role',v)}/>
  <TextField label="Description" value={work.description} multi onChange={v=>patch('description',v)}/>
  <label className="visual-toggle"><span>공개</span><input type="checkbox" checked={work.visible} onChange={e=>patch('visible',e.target.checked)}/></label>
  <label className="visual-upload"><span>Poster / Image</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={e=>onUpload(e.target.files?.[0],'poster')}/></label>
  <label className="visual-upload"><span>Video</span><input type="file" accept="video/mp4,video/webm" disabled={uploading} onChange={e=>onUpload(e.target.files?.[0],'video')}/></label>
 </>;
}
