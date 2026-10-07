'use client';
import {useEffect,useRef,useState,type CSSProperties,type Dispatch,type PointerEvent,type SetStateAction} from 'react';
import {ArrowDown,ArrowUp,Copy,Eye,EyeOff,Grip,Layers3,Maximize2,PanelLeft,PanelRight,Plus,RotateCcw,Save,Settings2,SlidersHorizontal,Trash2,Type,X} from 'lucide-react';
import type {Config,NavItemKey,SiteSectionKey,Work,SectionDivider} from './defaults';
import {uploadFile} from './media-upload';

type SectionKey=SiteSectionKey;
type PanelTab='layers'|'content'|'layout'|'style';
type Point={x:number;y:number};
type TextStyleKey=keyof Config['textStyles'];
type TextPatch=Partial<{font:string;size:number;color:string;align:'left'|'center'|'right';x:number;y:number;letterSpacing:number;weight:number;opacity:number;textTransform:'none'|'uppercase'|'lowercase'|'capitalize'}>;
export type VisualSelection=SectionKey|`work:${string}`|`divider:${string}`|`text:${string}`|`worktext:${string}:${string}`|`teamtext:${string}:${string}`;

const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
const sectionDefs:{key:SectionKey;label:string}[]=[
 {key:'nav',label:'상단 메뉴'},{key:'hero',label:'메인 비주얼'},{key:'work',label:'작품'},{key:'about',label:'소개'},{key:'team',label:'팀'},{key:'footer',label:'하단 영역'}
];
const navLabels:Record<NavItemKey,string>={work:'작품',about:'소개',team:'팀',contact:'문의'};
const labelKeys:Record<NavItemKey,'navWorkLabel'|'navAboutLabel'|'navTeamLabel'|'navContactLabel'>={work:'navWorkLabel',about:'navAboutLabel',team:'navTeamLabel',contact:'navContactLabel'};
type DirectTextDef={section:SectionKey;label:string;configKey:keyof Config;styleKey?:TextStyleKey;multi?:boolean};
const directTextDefs:Record<string,DirectTextDef>={
 name:{section:'nav',label:'브랜드 이름',configKey:'name'},
 navWorkLabel:{section:'nav',label:'작품 메뉴',configKey:'navWorkLabel'},
 navAboutLabel:{section:'nav',label:'소개 메뉴',configKey:'navAboutLabel'},
 navTeamLabel:{section:'nav',label:'팀 메뉴',configKey:'navTeamLabel'},
 navContactLabel:{section:'nav',label:'문의 메뉴',configKey:'navContactLabel'},
 heroCaption:{section:'hero',label:'마우스 오버 제목',configKey:'heroCaption',styleKey:'heroCaption'},
 eyebrow:{section:'hero',label:'상단 보조 문구',configKey:'eyebrow'},
 subtitle:{section:'hero',label:'하단 문구',configKey:'subtitle'},
 workKicker:{section:'work',label:'작은 제목',configKey:'workKicker',styleKey:'workKicker'},
 headline:{section:'work',label:'큰 제목',configKey:'headline',styleKey:'workHeadline',multi:true},
 workAside:{section:'work',label:'보조 문구',configKey:'workAside',styleKey:'workAside',multi:true},
 aboutKicker:{section:'about',label:'작은 제목',configKey:'aboutKicker',styleKey:'aboutKicker'},
 aboutHeadline:{section:'about',label:'큰 제목',configKey:'aboutHeadline',styleKey:'aboutHeadline',multi:true},
 about:{section:'about',label:'본문',configKey:'about',styleKey:'aboutBody',multi:true},
 aboutDisciplines:{section:'about',label:'분야 목록',configKey:'aboutDisciplines',styleKey:'aboutDisciplines',multi:true},
 teamKicker:{section:'team',label:'작은 제목',configKey:'teamKicker',styleKey:'teamKicker'},
 teamHeadline:{section:'team',label:'큰 제목',configKey:'teamHeadline',styleKey:'teamHeadline',multi:true},
 teamViewLabel:{section:'team',label:'보기 버튼',configKey:'teamViewLabel',styleKey:'teamView'},
 footerAdminLabel:{section:'footer',label:'관리자 문구',configKey:'footerAdminLabel'},
 footerCopyright:{section:'footer',label:'저작권 브랜드명',configKey:'name'}
};
const pointFromStorage=(key:string):Point|null=>{
 try{if(typeof window==='undefined')return null;const raw=localStorage.getItem(key);if(!raw)return null;const p=JSON.parse(raw);return Number.isFinite(p?.x)&&Number.isFinite(p?.y)?p:null}catch{return null}
};

export default function VisualSiteEditor({
 config,setConfig,selection,setSelection,onSave,onCancel,onOpenAdmin,busy
}:{
 config:Config;setConfig:Dispatch<SetStateAction<Config>>;selection:VisualSelection;setSelection:(value:VisualSelection)=>void;
 onSave:()=>void|Promise<void>;onCancel:()=>void;onOpenAdmin:()=>void;busy:boolean;
}){
 const [rect,setRect]=useState<DOMRect|null>(null),[uploading,setUploading]=useState(false),[panelSide,setPanelSide]=useState<'left'|'right'>('right'),[panelOpen,setPanelOpen]=useState(true),[tab,setTab]=useState<PanelTab>('layers');
 const [toolbarPos,setToolbarPos]=useState<Point|null>(()=>pointFromStorage('viivii-visual-toolbar-pos'));
 const [panelPos,setPanelPos]=useState<Point|null>(()=>pointFromStorage('viivii-visual-panel-pos'));
 const dragState=useRef<{y:number;baseY:number}|null>(null),resizeState=useRef<{x:number;y:number;base:number}|null>(null),heightState=useRef<{y:number;base:number}|null>(null),textDragState=useRef<{x:number;y:number;baseX:number;baseY:number}|null>(null);
 const selectedWorkId=selection.startsWith('work:')?selection.slice(5):'';
 const selectedWork=selectedWorkId?config.works.find(w=>w.id===selectedWorkId)||null:null;
 const selectedDividerId=selection.startsWith('divider:')?selection.slice(8):'';
 const selectedDivider=selectedDividerId?config.sectionDividers.find(d=>d.id===selectedDividerId)||null:null;
 const selectedTextKey=selection.startsWith('text:')?selection.slice(5):'';
 const selectedTextDef=selectedTextKey?directTextDefs[selectedTextKey]||null:null;
 const workTextParts=selection.startsWith('worktext:')?selection.slice(9).split(':'):[];
 const selectedWorkText=workTextParts.length>=2?{id:workTextParts[0],field:workTextParts.slice(1).join(':') as keyof Work}:null;
 const teamTextParts=selection.startsWith('teamtext:')?selection.slice(9).split(':'):[];
 const selectedTeamText=teamTextParts.length>=2?{id:teamTextParts[0],field:teamTextParts.slice(1).join(':')}:null;
 const sectionSelection=(selectedDivider?.after||selectedTextDef?.section||(selectedWork||selectedWorkText?'work':selectedTeamText?'team':selection)) as SectionKey;

 const targetFor=(value:VisualSelection=selection)=>{
  if(typeof document==='undefined')return null;
  if(value.startsWith('text:'))return document.querySelector<HTMLElement>(`[data-visual-text="${CSS.escape(value.slice(5))}"]`);
  if(value.startsWith('worktext:'))return document.querySelector<HTMLElement>(`[data-visual-work-text="${CSS.escape(value.slice(9))}"]`);
  if(value.startsWith('teamtext:'))return document.querySelector<HTMLElement>(`[data-visual-team-text="${CSS.escape(value.slice(9))}"]`);
  if(value.startsWith('divider:'))return document.querySelector<HTMLElement>(`[data-visual-divider-id="${CSS.escape(value.slice(8))}"]`);
  if(value.startsWith('work:')){const id=value.slice(5);return Array.from(document.querySelectorAll<HTMLElement>('[data-visual-work-id]')).find(el=>el.dataset.visualWorkId===id)||null}
  return document.querySelector<HTMLElement>(`[data-visual-section="${value}"]`);
 };
 const refresh=()=>{const el=targetFor();setRect(el?el.getBoundingClientRect():null)};
 useEffect(()=>{let raf=0;const sync=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(refresh)};sync();window.addEventListener('scroll',sync,{passive:true});window.addEventListener('resize',sync);return()=>{cancelAnimationFrame(raf);window.removeEventListener('scroll',sync);window.removeEventListener('resize',sync)}},[selection,config]);
 useEffect(()=>{if(selection.startsWith('text:')||selection.startsWith('worktext:')||selection.startsWith('teamtext:')||selection.startsWith('divider:'))setTab('content')},[selection]);
 useEffect(()=>{if(panelPos)return;const el=targetFor();if(!el)return;const r=el.getBoundingClientRect();if(r.width<window.inner너비*.76)setPanelSide(r.left+r.width/2>window.inner너비/2?'left':'right');else if(selection==='nav')setPanelSide('right')},[selection,panelPos]);

 const patch=<K extends keyof Config>(key:K,value:Config[K])=>setConfig(d=>({...d,[key]:value}));
 const patchTextStyle=(key:TextStyleKey,value:TextPatch)=>setConfig(d=>({...d,textStyles:{...d.textStyles,[key]:{...d.textStyles[key],...value}}}));
 const patchWork=(id:string,key:keyof Work,value:Work[keyof Work])=>setConfig(d=>({...d,works:d.works.map(w=>w.id===id?{...w,[key]:value}:w)}));
 const patchTeam=(id:string,key:string,value:unknown)=>setConfig(d=>({...d,teamMembers:d.teamMembers.map(m=>m.id===id?{...m,[key]:value}:m)}));
 const layoutKeys=(key:SectionKey)=>{
  if(key==='nav')return {x:'navOffsetX',y:'navOffsetY',scale:'nav크기'} as const;
  if(key==='hero')return {x:'heroOffsetX',y:'heroOffsetY',scale:'hero크기'} as const;
  if(key==='work')return {x:'workOffsetX',y:'workOffsetY',scale:'work크기'} as const;
  if(key==='about')return {x:'aboutOffsetX',y:'aboutOffsetY',scale:'about크기'} as const;
  if(key==='team')return {x:'teamOffsetX',y:'teamOffsetY',scale:'team크기'} as const;
  if(key==='footer')return {x:'footerOffsetX',y:'footerOffsetY',scale:'footer크기'} as const;
  return null;
 };
 const meta=layoutKeys(sectionSelection);

 const beginMove=(e:PointerEvent<HTMLButtonElement>)=>{
  if(!meta||selectedWork||selectedDivider||selectedTextDef||selectedWorkText||selectedTeamText)return;e.preventDefault();e.stopPropagation();
  dragState.current={y:e.clientY,baseY:Number(config[meta.y])};
  setConfig(d=>({...d,[meta.x]:0}));
  const move=(event:globalThis.PointerEvent)=>{const start=dragState.current;if(!start)return;setConfig(d=>({...d,[meta.x]:0,[meta.y]:clamp(Math.round(start.baseY+event.clientY-start.y),-500,500)}))};
  const up=()=>{dragState.current=null;setConfig(d=>({...d,[meta.x]:0}));window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
 };
 const beginResize=(e:PointerEvent<HTMLButtonElement>)=>{
  if(!meta||selectedWork||selectedDivider||selectedTextDef||selectedWorkText||selectedTeamText)return;e.preventDefault();e.stopPropagation();
  resizeState.current={x:e.clientX,y:e.clientY,base:Number(config[meta.scale])};
  const move=(event:globalThis.PointerEvent)=>{const start=resizeState.current;if(!start)return;const delta=((event.clientX-start.x)+(event.clientY-start.y))/720;setConfig(d=>({...d,[meta.x]:0,[meta.scale]:Math.round(clamp(start.base+delta,.65,1.45)*100)/100}))};
  const up=()=>{resizeState.current=null;setConfig(d=>({...d,[meta.x]:0}));window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
 };
 const beginHeightResize=(e:PointerEvent<HTMLButtonElement>)=>{
  if(selectedWork||selectedDivider||selectedTextDef||selectedWorkText||selectedTeamText)return;e.preventDefault();e.stopPropagation();
  const current=config.sectionHeights?.[sectionSelection]||rect?.height||0;
  heightState.current={y:e.clientY,base:current};
  const move=(event:globalThis.PointerEvent)=>{const start=heightState.current;if(!start)return;const next=clamp(Math.round(start.base+event.clientY-start.y),sectionSelection==='nav'?48:120,1800);setConfig(d=>({...d,sectionHeights:{...d.sectionHeights,[sectionSelection]:next}}))};
  const up=()=>{heightState.current=null;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
 };
 const beginTextMove=(e:PointerEvent<HTMLButtonElement>)=>{
  if(!selectedTextDef?.styleKey)return;e.preventDefault();e.stopPropagation();
  const style=config.textStyles[selectedTextDef.styleKey];
  textDragState.current={x:e.clientX,y:e.clientY,baseX:style.x,baseY:style.y};
  const move=(event:globalThis.PointerEvent)=>{const start=textDragState.current;if(!start)return;patchTextStyle(selectedTextDef.styleKey!,{x:clamp(Math.round(start.baseX+event.clientX-start.x),-600,600),y:clamp(Math.round(start.baseY+event.clientY-start.y),-420,420)})};
  const up=()=>{textDragState.current=null;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
 };
 const beginChromeDrag=(e:PointerEvent<HTMLElement>,kind:'toolbar'|'panel')=>{
  if(e.button!==0)return;
  const selector=kind==='toolbar'?'.visual-editor-topbar':'.visual-editor-panel';
  const node=(e.currentTarget as HTMLElement).closest<HTMLElement>(selector);if(!node)return;
  e.preventDefault();
  const r=node.getBoundingClientRect(),sx=e.clientX,sy=e.clientY;
  const setPos=kind==='toolbar'?setToolbarPos:setPanelPos;
  const storageKey=kind==='toolbar'?'viivii-visual-toolbar-pos':'viivii-visual-panel-pos';
  const move=(ev:globalThis.PointerEvent)=>{
   const x=clamp(r.left+ev.clientX-sx,8,Math.max(8,window.inner너비-r.width-8));
   const y=clamp(r.top+ev.clientY-sy,8,Math.max(8,window.innerHeight-r.height-8));
   setPos({x:Math.round(x),y:Math.round(y)});
  };
  const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);requestAnimationFrame(()=>{const el=document.querySelector<HTMLElement>(selector);if(!el)return;const rr=el.getBoundingClientRect();const p={x:Math.round(rr.left),y:Math.round(rr.top)};setPos(p);try{localStorage.setItem(storageKey,JSON.stringify(p))}catch{}})};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
 };
 const resetChrome=(kind:'toolbar'|'panel')=>{if(kind==='toolbar'){setToolbarPos(null);try{localStorage.removeItem('viivii-visual-toolbar-pos')}catch{}}else{setPanelPos(null);try{localStorage.removeItem('viivii-visual-panel-pos')}catch{}}};

 const isVisible=(key:SectionKey)=>key==='nav'?config.showNav:key==='hero'?config.showHero:key==='footer'?config.showFooter:key==='work'?config.navOrder.includes('work'):key==='about'?config.showAbout&&config.navOrder.includes('about'):config.showTeam&&config.navOrder.includes('team');
 const removeSection=(key:SectionKey)=>setConfig(d=>key==='nav'?{...d,showNav:false}:key==='hero'?{...d,showHero:false}:key==='footer'?{...d,showFooter:false}:key==='work'?{...d,navOrder:d.navOrder.filter(x=>x!=='work')}:key==='about'?{...d,showAbout:false,navOrder:d.navOrder.filter(x=>x!=='about')}:{...d,showTeam:false,navOrder:d.navOrder.filter(x=>x!=='team')});
 const restoreSection=(key:SectionKey)=>setConfig(d=>key==='nav'?{...d,showNav:true}:key==='hero'?{...d,showHero:true}:key==='footer'?{...d,showFooter:true}:key==='work'?{...d,navOrder:d.navOrder.includes('work')?d.navOrder:[...d.navOrder,'work']}:key==='about'?{...d,showAbout:true,navOrder:d.navOrder.includes('about')?d.navOrder:[...d.navOrder,'about']}:{...d,showTeam:true,navOrder:d.navOrder.includes('team')?d.navOrder:[...d.navOrder,'team']});
 const resetLayout=()=>{if(meta)setConfig(d=>({...d,[meta.x]:0,[meta.y]:0,[meta.scale]:1,sectionHeights:{...d.sectionHeights,[sectionSelection]:0}}))};
 const reorderMenu=(item:NavItemKey,dir:number)=>setConfig(d=>{const arr=[...d.navOrder],i=arr.indexOf(item),j=i+dir;if(i<0||j<0||j>=arr.length)return d;[arr[i],arr[j]]=[arr[j],arr[i]];return {...d,navOrder:arr}});
 const removeMenu=(item:NavItemKey)=>setConfig(d=>({...d,navOrder:d.navOrder.filter(x=>x!==item)}));
 const restoreMenu=(item:NavItemKey)=>setConfig(d=>d.navOrder.includes(item)?d:{...d,navOrder:[...d.navOrder,item]});
 const reorderSection=(from:SectionKey,to:SectionKey)=>setConfig(d=>{if(from===to)return d;const arr=[...(d.sectionOrder||sectionDefs.map(s=>s.key))],a=arr.indexOf(from),b=arr.indexOf(to);if(a<0||b<0)return d;arr.splice(a,1);arr.splice(b,0,from);return {...d,sectionOrder:arr}});
 const moveWork=(id:string,dir:number)=>setConfig(d=>{const arr=[...d.works],i=arr.findIndex(w=>w.id===id),j=i+dir;if(i<0||j<0||j>=arr.length)return d;[arr[i],arr[j]]=[arr[j],arr[i]];return {...d,works:arr}});
 const reorderWork=(from:string,to:string)=>setConfig(d=>{if(from===to)return d;const arr=[...d.works],a=arr.findIndex(w=>w.id===from),b=arr.findIndex(w=>w.id===to);if(a<0||b<0)return d;const [item]=arr.splice(a,1);arr.splice(b,0,item);return {...d,works:arr}});
 const addWork=()=>{const id='visual-'+Date.now(),work:Work={id,title:'New work',category:'Unassigned',year:new Date().getFullYear().toString(),role:'',description:'',poster:'',video:'',visible:false};setConfig(d=>({...d,works:[...d.works,work]}));setSelection(`work:${id}`);setTab('content')};
 const addDivider=()=>{const id='divider-'+Date.now(),divider:SectionDivider={id,after:sectionSelection||'hero',visible:true,width:100,thickness:1,opacity:22,inset:0,marginTop:0,marginBottom:0,color:''};setConfig(d=>({...d,sectionDividers:[...d.sectionDividers,divider]}));setSelection(`divider:${id}`);setTab('content')};
 const patchDivider=(id:string,value:Partial<SectionDivider>)=>setConfig(d=>({...d,sectionDividers:d.sectionDividers.map(divider=>divider.id===id?{...divider,...value}:divider)}));
 const deleteDivider=(id:string)=>{setConfig(d=>({...d,sectionDividers:d.sectionDividers.filter(divider=>divider.id!==id)}));setSelection(sectionSelection);setTab('layers')};
 const duplicateWork=(work:Work)=>{const copy={...work,id:'visual-'+Date.now(),title:work.title+' copy'};setConfig(d=>({...d,works:[...d.works,copy]}));setSelection(`work:${copy.id}`);setTab('content')};
 const deleteWork=(id:string)=>{setConfig(d=>({...d,works:d.works.filter(w=>w.id!==id)}));setSelection('work');setTab('layers')};
 const uploadWork=async(file:File|undefined,field:'poster'|'video')=>{if(!file||!selectedWork)return;try{setUploading(true);const url=await uploadFile(file);setConfig(d=>({...d,works:d.works.map(w=>w.id===selectedWork.id?{...w,[field]:url,visible:true}:w)}))}finally{setUploading(false)}};
 const uploadConfig=async(file:File|undefined,key:keyof Config)=>{if(!file)return;try{setUploading(true);const url=await uploadFile(file);setConfig(d=>({...d,[key]:url,...(key==='aboutImage'?{aboutMediaType:'image'}:{})}))}finally{setUploading(false)}};
 const selectLayer=(value:VisualSelection)=>{setSelection(value);requestAnimationFrame(()=>targetFor(value)?.scrollIntoView({behavior:'smooth',block:value==='nav'?'start':'center'}))};
 const hiddenSections=sectionDefs.filter(s=>!isVisible(s.key)),toolbarBottom=!toolbarPos&&!!rect&&rect.top<112&&window.inner너비>820,labelInside=!!rect&&rect.top<28;
 const selectedWorkTextWork=selectedWorkText?config.works.find(work=>work.id===selectedWorkText.id)||null:null;
 const selectedTeamTextMember=selectedTeamText?config.teamMembers.find(member=>member.id===selectedTeamText.id)||null:null;
 const selectedWorkTextStyleKey:TextStyleKey|undefined=selectedWorkText?(selectedWorkText.field==='title'?'workCardTitle':'workCardMeta'):undefined;
 const selectedTeamTextStyleKey:TextStyleKey|undefined=selectedTeamText?(selectedTeamText.field==='name'?'teamMemberName':selectedTeamText.field==='bio'?'teamMemberBio':'teamMemberRole'):undefined;
 const selectionLabel=selectedDivider?'구분선':selectedTextDef?.label||(selectedWorkText?'작품 텍스트':selectedTeamText?'팀 텍스트':selectedWork?'작품 카드':sectionDefs.find(s=>s.key===sectionSelection)?.label);
 const toolbarStyle=toolbarPos?{'--ve-toolbar-x':toolbarPos.x+'px','--ve-toolbar-y':toolbarPos.y+'px'} as CSSProperties:undefined;
 const panelStyle=panelPos?{'--ve-panel-x':panelPos.x+'px','--ve-panel-y':panelPos.y+'px'} as CSSProperties:undefined;

 return <div className={'visual-editor-ui is-panel-'+panelSide} data-visual-editor="true">
  <div style={toolbarStyle} className={'visual-editor-topbar '+(toolbarPos?'is-free ':toolbarBottom?'is-bottom ':'is-top ')}>
   <div className="visual-editor-title visual-editor-drag-zone" onPointerDown={e=>beginChromeDrag(e,'toolbar')} onDoubleClick={()=>resetChrome('toolbar')}><Grip size={14}/><Settings2 size={16}/><strong>VISUAL EDIT</strong><span>드래그 이동 · 화면에서 선택 · 크기 · 콘텐츠 · 스타일</span></div>
   <div className="visual-editor-toolbar-tools">
    <button type="button" className="visual-toolbar-icon" title="패널 위치 전환" onClick={()=>{setPanelPos(null);setPanelSide(v=>v==='right'?'left':'right')}}>{panelSide==='right'?<PanelLeft size={15}/>:<PanelRight size={15}/>}</button>
    <button type="button" className="visual-toolbar-icon" title={panelOpen?'패널 접기':'패널 열기'} onClick={()=>setPanelOpen(v=>!v)}><SlidersHorizontal size={15}/></button>
    <div className="visual-editor-actions"><button type="button" onClick={onOpenAdmin}>ADMIN</button><button type="button" onClick={onCancel}><X size={15}/><span>취소</span></button><button type="button" className="is-primary" disabled={busy} onClick={onSave}><Save size={15}/><span>{busy?'저장 중':'저장'}</span></button></div>
   </div>
  </div>

  {panelOpen?<aside style={panelStyle} className={'visual-editor-panel is-'+panelSide+(panelPos?' is-free':'')}>
   <div className="visual-panel-head"><div className="visual-panel-drag-zone" onPointerDown={e=>beginChromeDrag(e,'panel')} onDoubleClick={()=>resetChrome('panel')}><Grip size={13}/><span><strong>{selectionLabel}</strong><small>{selectedTextDef||selectedWorkText||selectedTeamText?'텍스트를 직접 선택해 편집 중':selectedDivider?'독립 구분선 레이어':'끌어서 패널 이동 · 더블클릭 위치 초기화'}</small></span></div><button type="button" aria-label="편집 패널 접기" onClick={()=>setPanelOpen(false)}><X size={15}/></button></div>
   <div className="visual-editor-tabs" role="tablist"><button className={tab==='layers'?'is-active':''} onClick={()=>setTab('layers')}><Layers3 size={13}/>레이어</button><button className={tab==='content'?'is-active':''} onClick={()=>setTab('content')}><Type size={13}/>편집</button><button className={tab==='layout'?'is-active':''} onClick={()=>setTab('layout')}><Maximize2 size={13}/>위치·크기</button><button className={tab==='style'?'is-active':''} onClick={()=>setTab('style')}><SlidersHorizontal size={13}/>스타일</button></div>
   {tab==='layers'&&<LayersPanel config={config} selection={selection} select={selectLayer} isVisible={isVisible} hide={removeSection} restore={restoreSection} reorderSection={reorderSection} moveWork={moveWork} reorderWork={reorderWork} patchWork={patchWork} deleteWork={deleteWork} addWork={addWork} addDivider={addDivider} patchDivider={patchDivider} deleteDivider={deleteDivider}/>}
   {tab==='content'&&<div className="visual-editor-context">
    {selectedDivider?<DividerContent divider={selectedDivider} patch={value=>patchDivider(selectedDivider.id,value)} remove={()=>deleteDivider(selectedDivider.id)}/>:
     selectedTextDef?<DirectTextEditor def={selectedTextDef} config={config} patch={patch} patchTextStyle={patchTextStyle}/>:
     selectedWorkText&&selectedWorkTextWork?<WorkTextEditor work={selectedWorkTextWork} field={selectedWorkText.field} patch={(key,value)=>patchWork(selectedWorkTextWork.id,key,value)} style={config.textStyles[selectedWorkTextStyleKey!]} patchStyle={value=>patchTextStyle(selectedWorkTextStyleKey!,value)}/>:
     selectedTeamText&&selectedTeamTextMember?<TeamTextEditor member={selectedTeamTextMember} field={selectedTeamText.field} patch={(key,value)=>patchTeam(selectedTeamTextMember.id,key,value)} style={config.textStyles[selectedTeamTextStyleKey!]} patchStyle={value=>patchTextStyle(selectedTeamTextStyleKey!,value)}/>:
     selectedWork?<WorkEditor work={selectedWork} patch={(key,value)=>patchWork(selectedWork.id,key,value)} onUpload={uploadWork} uploading={uploading} onDuplicate={()=>duplicateWork(selectedWork)} onDelete={()=>deleteWork(selectedWork.id)}/>:
     <SectionEditor section={sectionSelection} config={config} patch={patch} patchTeam={patchTeam} reorder={reorderMenu} removeMenu={removeMenu} restoreMenu={restoreMenu} addWork={addWork} addDivider={addDivider} uploadConfig={uploadConfig} uploading={uploading}/>}
   </div>}
   {tab==='layout'&&<div className="visual-editor-layout">
    {selectedDivider?<DividerLayout divider={selectedDivider} patch={value=>patchDivider(selectedDivider.id,value)}/>:
     selectedTextDef?.styleKey?<><div className="visual-editor-panel-head"><strong>텍스트 위치</strong><button type="button" onClick={()=>patchTextStyle(selectedTextDef.styleKey!,{x:0,y:0})}><RotateCcw size={13}/>Reset</button></div><Range label="X position" value={config.textStyles[selectedTextDef.styleKey].x} min={-600} max={600} step={1} suffix="px" onChange={v=>patchTextStyle(selectedTextDef.styleKey!,{x:v})}/><Range label="세로 위치" value={config.textStyles[selectedTextDef.styleKey].y} min={-420} max={420} step={1} suffix="px" onChange={v=>patchTextStyle(selectedTextDef.styleKey!,{y:v})}/></>:
     <><div className="visual-editor-panel-head"><strong>영역 위치·크기</strong>{meta&&!selectedWork&&<button type="button" onClick={resetLayout}><RotateCcw size={13}/>Reset</button>}</div>{meta&&!selectedWork&&!selectedWorkText&&!selectedTeamText&&<><div className="visual-axis-lock"><span>가로 위치</span><b>중앙 고정 · 0px</b><button onClick={()=>patch(meta.x,0 as never)}>중앙 복귀</button></div><Range label="세로 위치" value={Number(config[meta.y])} min={-500} max={500} step={1} suffix="px" onChange={v=>patch(meta.y,v as never)}/><Range label="크기" value={Math.round(Number(config[meta.scale])*100)} min={65} max={145} step={1} suffix="%" onChange={v=>patch(meta.scale,(v/100) as never)}/><Range label="영역 높이 · 0 = 자동" value={config.sectionHeights?.[sectionSelection]||0} min={0} max={1600} step={10} suffix="px" onChange={v=>patch('sectionHeights',{...config.sectionHeights,[sectionSelection]:v})}/></>}{sectionSelection==='work'&&!selectedWorkText&&<Range label="그리드 열 개수" value={config.columns} min={1} max={4} step={1} onChange={v=>patch('columns',v)}/>} {sectionSelection==='team'&&!selectedTeamText&&<><Range label="미디어 크기" value={config.teamMediaSize} min={120} max={520} step={1} suffix="px" onChange={v=>patch('teamMediaSize',v)}/><Range label="행 간격" value={config.teamRowGap} min={12} max={180} step={1} suffix="px" onChange={v=>patch('teamRowGap',v)}/></>}<Range label="전체 영역 간격" value={config.spacing} min={28} max={180} step={1} suffix="px" onChange={v=>patch('spacing',v)}/>{!selectedWork&&!selectedWorkText&&!selectedTeamText&&<button type="button" className="visual-editor-danger" onClick={()=>removeSection(sectionSelection)}><EyeOff size={14}/> 이 영역 숨기기</button>}</>}
   </div>}
   {tab==='style'&&(
    selectedDivider?<DividerStyle divider={selectedDivider} patch={value=>patchDivider(selectedDivider.id,value)}/>:
    selectedTextDef?.styleKey?<InspectorGroup title="글자 스타일" open><TextStyleControl label={selectedTextDef.label} value={config.textStyles[selectedTextDef.styleKey]} onChange={v=>patchTextStyle(selectedTextDef.styleKey!,v)}/></InspectorGroup>:
    selectedWorkText&&selectedWorkTextStyleKey?<InspectorGroup title="카드 글자 스타일" open><TextStyleControl label={String(selectedWorkText.field)} value={config.textStyles[selectedWorkTextStyleKey]} onChange={v=>patchTextStyle(selectedWorkTextStyleKey,v)}/></InspectorGroup>:
    selectedTeamText&&selectedTeamTextStyleKey?<InspectorGroup title="팀 글자 스타일" open><TextStyleControl label={String(selectedTeamText.field)} value={config.textStyles[selectedTeamTextStyleKey]} onChange={v=>patchTextStyle(selectedTeamTextStyleKey,v)}/></InspectorGroup>:
    <StylePanel section={sectionSelection} config={config} patch={patch} patchTextStyle={patchTextStyle} uploadConfig={uploadConfig} uploading={uploading}/>
   )}
   {hiddenSections.length>0&&<div className="visual-editor-restore"><span>숨긴 영역</span><div>{hiddenSections.map(s=><button type="button" key={s.key} onClick={()=>{restoreSection(s.key);selectLayer(s.key)}}><Plus size={13}/>{s.label}</button>)}</div></div>}
  </aside>:<button type="button" className={'visual-panel-reopen is-'+panelSide} onClick={()=>setPanelOpen(true)}><SlidersHorizontal size={16}/><span>편집 패널</span></button>}

  {rect&&<div className={'visual-selection-frame is-panel-'+panelSide+(labelInside?' is-label-inside':'')+(selectedTextDef||selectedWorkText||selectedTeamText?' is-text-selection':'')+(selectedDivider?' is-divider-selection':'')} style={{left:rect.left,top:rect.top,width:rect.width,height:rect.height}}><span className="visual-selection-label">{selectionLabel}</span>
   {meta&&!selectedWork&&!selectedDivider&&!selectedTextDef&&!selectedWorkText&&!selectedTeamText&&<button type="button" className="visual-move-handle" aria-label="영역 세로 이동" title="세로 이동 · X축은 자동 중앙 고정" onPointerDown={beginMove}><Grip size={16}/></button>}
   {selectedTextDef?.styleKey&&<button type="button" className="visual-move-handle is-text" aria-label="텍스트 이동" title="텍스트 자유 이동" onPointerDown={beginTextMove}><Grip size={16}/></button>}
   {meta&&!selectedWork&&!selectedDivider&&!selectedTextDef&&!selectedWorkText&&!selectedTeamText&&<button type="button" className="visual-resize-handle" aria-label="영역 크기 조절" onPointerDown={beginResize}><Maximize2 size={15}/></button>}
   {meta&&!selectedWork&&!selectedDivider&&!selectedTextDef&&!selectedWorkText&&!selectedTeamText&&<button type="button" className="visual-height-handle" aria-label="영역 높이 조절" title="위아래로 드래그해 영역 높이 조절" onPointerDown={beginHeightResize}><span/></button>}
  </div>}
 </div>;
}

function LayersPanel({config,selection,select,isVisible,hide,restore,reorderSection,moveWork,reorderWork,patchWork,deleteWork,addWork,addDivider,patchDivider,deleteDivider}:{config:Config;selection:VisualSelection;select:(v:VisualSelection)=>void;isVisible:(k:SectionKey)=>boolean;hide:(k:SectionKey)=>void;restore:(k:SectionKey)=>void;reorderSection:(from:SectionKey,to:SectionKey)=>void;moveWork:(id:string,dir:number)=>void;reorderWork:(from:string,to:string)=>void;patchWork:(id:string,key:keyof Work,value:Work[keyof Work])=>void;deleteWork:(id:string)=>void;addWork:()=>void;addDivider:()=>void;patchDivider:(id:string,value:Partial<SectionDivider>)=>void;deleteDivider:(id:string)=>void}){
 const [dragSection,setDragSection]=useState<SectionKey|null>(null),[dragWork,setDragWork]=useState<string|null>(null);
 const ordered=(config.sectionOrder||sectionDefs.map(s=>s.key)).map(key=>sectionDefs.find(s=>s.key===key)).filter(Boolean) as typeof sectionDefs;
 return <div className="visual-layers">
  <div className="visual-layer-heading"><span>페이지 레이어</span><div><button onClick={addDivider}><Plus size={13}/>구분선</button><button onClick={addWork}><Plus size={13}/>작품</button></div></div>
  <p className="visual-help">섹션은 드래그로 순서를 바꾸고, 구분선도 독립 레이어처럼 추가·삭제할 수 있습니다.</p>
  {ordered.map(section=><div className={'visual-layer-group '+(dragSection===section.key?'is-dragging':'')} key={section.key} onDragOver={e=>{if(dragSection)e.preventDefault()}} onDrop={e=>{if(dragSection){e.preventDefault();reorderSection(dragSection,section.key);setDragSection(null)}}}>
   <div className={'visual-layer-row '+(selection===section.key?'is-active':'')}><button type="button" draggable className="visual-layer-grip" title="드래그해서 섹션 순서 이동" onDragStart={e=>{setDragSection(section.key);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',section.key)}} onDragEnd={()=>setDragSection(null)}><Grip size={13}/></button><button className="visual-layer-select" onClick={()=>select(section.key)}><span>{section.label}</span><small>{isVisible(section.key)?'VISIBLE':'HIDDEN'}</small></button><button className="visual-layer-icon" aria-label={isVisible(section.key)?'숨기기':'표시하기'} onClick={()=>isVisible(section.key)?hide(section.key):restore(section.key)}>{isVisible(section.key)?<Eye size={14}/>:<EyeOff size={14}/>}</button></div>
   {config.sectionDividers.filter(divider=>divider.after===section.key).map(divider=><div className={'visual-layer-row is-child is-divider '+(selection===`divider:${divider.id}`?'is-active':'')} key={divider.id}><span className="visual-layer-grip visual-divider-swatch" aria-hidden="true"><span/></span><button className="visual-layer-select" onClick={()=>select(`divider:${divider.id}`)}><span>구분선</span><small>{divider.visible?'VISIBLE':'HIDDEN'}</small></button><div className="visual-layer-mini-actions"><button onClick={()=>patchDivider(divider.id,{visible:!divider.visible})}>{divider.visible?<Eye size={12}/>:<EyeOff size={12}/>}</button><button className="is-danger" onClick={()=>deleteDivider(divider.id)}><Trash2 size={12}/></button></div></div>)}
   {section.key==='work'&&<div className="visual-layer-children">{config.works.map((work,index)=><div className={'visual-layer-row is-child '+(selection===`work:${work.id}`?'is-active':'')+(dragWork===work.id?' is-dragging':'')} key={work.id} onDragOver={e=>{if(dragWork){e.preventDefault();e.stopPropagation()}}} onDrop={e=>{if(dragWork){e.preventDefault();e.stopPropagation();reorderWork(dragWork,work.id);setDragWork(null)}}}><button type="button" draggable className="visual-layer-grip" title="드래그해서 작품 순서 이동" onDragStart={e=>{e.stopPropagation();setDragWork(work.id);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',work.id)}} onDragEnd={()=>setDragWork(null)}><Grip size={12}/></button><button className="visual-layer-select" onClick={()=>select(`work:${work.id}`)}><span>{work.title||'Untitled'}</span><small>{work.visible?'LIVE':'DRAFT'}</small></button><div className="visual-layer-mini-actions"><button disabled={index===0} onClick={()=>moveWork(work.id,-1)}><ArrowUp size={12}/></button><button disabled={index===config.works.length-1} onClick={()=>moveWork(work.id,1)}><ArrowDown size={12}/></button><button onClick={()=>patchWork(work.id,'visible',!work.visible)}>{work.visible?<Eye size={12}/>:<EyeOff size={12}/>}</button><button className="is-danger" onClick={()=>deleteWork(work.id)}><Trash2 size={12}/></button></div></div>)}</div>}
  </div>)}
 </div>;
}
function Range({label,value,min,max,step,suffix='',onChange}:{label:string;value:number;min:number;max:number;step:number;suffix?:string;onChange:(v:number)=>void}){return <label className="visual-range"><span>{label}<b>{Math.round(value*100)/100}{suffix}</b></span><input type="range" value={value} min={min} max={max} step={step} onChange={e=>onChange(Number(e.target.value))}/></label>}
function TextField({label,value,onChange,multi=false}:{label:string;value:string;onChange:(v:string)=>void;multi?:boolean}){return <label className="visual-field"><span>{label}</span>{multi?<textarea value={value} onChange={e=>onChange(e.target.value)}/>:<input value={value} onChange={e=>onChange(e.target.value)}/>}</label>}
function FileField({label,accept,disabled,value,onFile,onClear}:{label:string;accept:string;disabled:boolean;value?:string;onFile:(file:File|undefined)=>void;onClear?:()=>void}){return <label className="visual-upload"><span>{label}</span><input type="file" accept={accept} disabled={disabled} onChange={e=>onFile(e.target.files?.[0])}/>{value&&<span className="visual-upload-state">등록됨 {onClear&&<button type="button" onClick={e=>{e.preventDefault();onClear()}}>제거</button>}</span>}</label>}

function InspectorGroup({title,children,open=false,meta}:{title:string;children:React.ReactNode;open?:boolean;meta?:string}){
 return <details className="visual-inspector-group" open={open}><summary><span><strong>{title}</strong>{meta&&<small>{meta}</small>}</span><b aria-hidden="true">⌄</b></summary><div className="visual-inspector-body">{children}</div></details>;
}

function DirectTextEditor({def,config,patch,patchTextStyle}:{def:DirectTextDef;config:Config;patch:<K extends keyof Config>(key:K,value:Config[K])=>void;patchTextStyle:(key:TextStyleKey,value:TextPatch)=>void}){
 const value=String(config[def.configKey]??'');
 return <><div className="visual-editor-panel-head"><h3>{def.label}</h3><span className="visual-direct-badge">직접 편집</span></div><TextField label="Text" value={value} multi={!!def.multi} onChange={v=>patch(def.configKey,v as never)}/>{def.styleKey&&<InspectorGroup title="글자 스타일" open meta="position · size · weight · spacing"><TextStyleControl label={def.label} value={config.textStyles[def.styleKey]} onChange={v=>patchTextStyle(def.styleKey!,v)}/></InspectorGroup>}</>;
}

function WorkTextEditor({work,field,patch,style,patchStyle}:{work:Work;field:keyof Work;patch:(key:keyof Work,value:Work[keyof Work])=>void;style:Config['textStyles'][TextStyleKey];patchStyle:(value:TextPatch)=>void}){
 const label=field==='title'?'Title':field==='category'?'Category':field==='role'?'Role':field==='year'?'Year':String(field);
 return <><div className="visual-editor-panel-head"><h3>{label}</h3><span className="visual-direct-badge">작품 텍스트</span></div><TextField label={label} value={String(work[field]??'')} multi={field==='description'} onChange={v=>patch(field,v as never)}/><InspectorGroup title="Shared card typography" open meta="이 스타일은 같은 종류의 카드 글자에 적용"><TextStyleControl label={label} value={style} onChange={patchStyle}/></InspectorGroup></>;
}

function TeamTextEditor({member,field,patch,style,patchStyle}:{member:Config['teamMembers'][number];field:string;patch:(key:string,value:unknown)=>void;style:Config['textStyles'][TextStyleKey];patchStyle:(value:TextPatch)=>void}){
 const label=field==='name'?'Member name':field==='bio'?'Bio':'Role';
 return <><div className="visual-editor-panel-head"><h3>{label}</h3><span className="visual-direct-badge">팀 텍스트</span></div><TextField label={label} value={String((member as any)[field]??'')} multi={field==='bio'} onChange={v=>patch(field,v)}/><InspectorGroup title="Shared team typography" open><TextStyleControl label={label} value={style} onChange={patchStyle}/></InspectorGroup></>;
}

function DividerContent({divider,patch,remove}:{divider:SectionDivider;patch:(value:Partial<SectionDivider>)=>void;remove:()=>void}){
 return <><div className="visual-editor-panel-head"><h3>구분선</h3><button type="button" className="is-danger" onClick={remove}><Trash2 size={13}/>삭제</button></div><InspectorGroup title="배치" open><label className="visual-field"><span>배치할 영역</span><select value={divider.after} onChange={e=>patch({after:e.target.value as SiteSectionKey})}>{sectionDefs.map(section=><option key={section.key} value={section.key}>{section.label}</option>)}</select></label><label className="visual-toggle"><span>구분선 표시</span><input type="checkbox" checked={divider.visible} onChange={e=>patch({visible:e.target.checked})}/></label></InspectorGroup><p className="visual-help">Layers에서 독립 요소처럼 선택·삭제할 수 있고, Position/Style에서 세밀하게 조절합니다.</p></>;
}
function DividerLayout({divider,patch}:{divider:SectionDivider;patch:(value:Partial<SectionDivider>)=>void}){
 return <><div className="visual-editor-panel-head"><strong>구분선 위치·크기</strong></div><Range label="너비" value={divider.width} min={10} max={100} step={1} suffix="%" onChange={v=>patch({width:v})}/><Range label="좌우 여백" value={divider.inset} min={0} max={240} step={1} suffix="px" onChange={v=>patch({inset:v})}/><Range label="위 여백" value={divider.marginTop} min={0} max={240} step={1} suffix="px" onChange={v=>patch({marginTop:v})}/><Range label="아래 여백" value={divider.marginBottom} min={0} max={240} step={1} suffix="px" onChange={v=>patch({marginBottom:v})}/></>;
}
function DividerStyle({divider,patch}:{divider:SectionDivider;patch:(value:Partial<SectionDivider>)=>void}){
 return <InspectorGroup title="구분선 스타일" open><Range label="두께" value={divider.thickness} min={.5} max={12} step={.5} suffix="px" onChange={v=>patch({thickness:v})}/><Range label="불투명도" value={divider.opacity} min={0} max={100} step={1} suffix="%" onChange={v=>patch({opacity:v})}/><label className="visual-color"><span>색상</span><input type="color" value={divider.color||'#ffffff'} onChange={e=>patch({color:e.target.value})}/><b>{divider.color||'AUTO'}</b></label><button type="button" className="visual-secondary-button" onClick={()=>patch({color:''})}>색상 자동</button></InspectorGroup>;
}


function SectionEditor({section,config,patch,patchTeam,reorder,removeMenu,restoreMenu,addWork,addDivider,uploadConfig,uploading}:{section:SectionKey;config:Config;patch:<K extends keyof Config>(key:K,value:Config[K])=>void;patchTeam:(id:string,key:string,value:unknown)=>void;reorder:(item:NavItemKey,dir:number)=>void;removeMenu:(item:NavItemKey)=>void;restoreMenu:(item:NavItemKey)=>void;addWork:()=>void;addDivider:()=>void;uploadConfig:(file:File|undefined,key:keyof Config)=>void;uploading:boolean}){
 const missing=(['work','about','team','contact'] as NavItemKey[]).filter(x=>!config.navOrder.includes(x));
 const dividerButton=<button type="button" className="visual-secondary-button" onClick={addDivider}><Plus size={13}/> 이 영역 뒤에 구분선 추가</button>;
 if(section==='nav')return <><div className="visual-editor-panel-head"><h3>상단 메뉴</h3></div><InspectorGroup title="브랜드" open><TextField label="브랜드 이름" value={config.name} onChange={v=>patch('name',v)}/><FileField label="상단 로고" accept="image/*" disabled={uploading} value={config.logo} onFile={f=>uploadConfig(f,'logo')} onClear={()=>patch('logo','')}/></InspectorGroup><InspectorGroup title="메뉴" open meta="순서 · 이름 · 삭제"><div className="visual-menu-order">{config.navOrder.map((item,index)=><div key={item}><input value={String(config[labelKeys[item]])} onChange={e=>patch(labelKeys[item],e.target.value)}/><div><button disabled={index===0} onClick={()=>reorder(item,-1)}><ArrowUp size={13}/></button><button disabled={index===config.navOrder.length-1} onClick={()=>reorder(item,1)}><ArrowDown size={13}/></button><button className="is-danger" onClick={()=>removeMenu(item)}><Trash2 size={13}/></button></div></div>)}{missing.length>0&&<div className="visual-menu-restore">{missing.map(item=><button key={item} onClick={()=>restoreMenu(item)}><Plus size={12}/>{navLabels[item]}</button>)}</div>}</div></InspectorGroup><InspectorGroup title="상단 메뉴 글래스"><Range label="불투명도" value={config.nav불투명도} min={0} max={100} step={1} suffix="%" onChange={v=>patch('nav불투명도',v)}/></InspectorGroup>{dividerButton}</>;
 if(section==='hero')return <><div className="visual-editor-panel-head"><h3>메인 비주얼</h3></div><InspectorGroup title="텍스트" open><TextField label="마우스 오버 제목" value={config.heroCaption} onChange={v=>patch('heroCaption',v)}/><TextField label="상단 보조 문구" value={config.eyebrow} onChange={v=>patch('eyebrow',v)}/><TextField label="하단 문구" value={config.subtitle} onChange={v=>patch('subtitle',v)}/></InspectorGroup><InspectorGroup title="미디어" open><FileField label="메인 영상" accept="video/mp4,video/webm" disabled={uploading} value={config.heroVideo} onFile={f=>uploadConfig(f,'heroVideo')} onClear={()=>patch('heroVideo','')}/><FileField label="대체 이미지" accept="image/jpeg,image/png,image/webp" disabled={uploading} value={config.heroPoster} onFile={f=>uploadConfig(f,'heroPoster')} onClear={()=>patch('heroPoster','')}/></InspectorGroup><InspectorGroup title="재생 설정"><label className="visual-toggle"><span>자동 재생</span><input type="checkbox" checked={config.autoplay} onChange={e=>patch('autoplay',e.target.checked)}/></label></InspectorGroup>{dividerButton}</>;
 if(section==='work')return <><div className="visual-editor-panel-head"><h3>작품</h3><button type="button" onClick={addWork}><Plus size={13}/>작품 추가</button></div><InspectorGroup title="영역 텍스트" open><TextField label="작은 제목" value={config.workKicker} onChange={v=>patch('workKicker',v)}/><TextField label="큰 제목" value={config.headline} multi onChange={v=>patch('headline',v)}/><TextField label="보조 문구" value={config.workAside} multi onChange={v=>patch('workAside',v)}/></InspectorGroup><InspectorGroup title="그리드·전체화면"><Range label="열 개수" value={config.columns} min={1} max={4} step={1} onChange={v=>patch('columns',v)}/><Range label="전체화면 배경 불투명도" value={config.filmBackdrop불투명도} min={0} max={100} step={1} suffix="%" onChange={v=>patch('filmBackdrop불투명도',v)}/><Range label="전체화면 배경 블러" value={config.filmBackdropBlur} min={0} max={60} step={1} suffix="px" onChange={v=>patch('filmBackdropBlur',v)}/></InspectorGroup>{dividerButton}</>;
 if(section==='about')return <><div className="visual-editor-panel-head"><h3>소개</h3></div><InspectorGroup title="텍스트" open><TextField label="작은 제목" value={config.aboutKicker} onChange={v=>patch('aboutKicker',v)}/><TextField label="큰 제목" value={config.aboutHeadline} multi onChange={v=>patch('aboutHeadline',v)}/><TextField label="본문" value={config.about} multi onChange={v=>patch('about',v)}/><TextField label="분야 목록" value={config.aboutDisciplines} multi onChange={v=>patch('aboutDisciplines',v)}/></InspectorGroup><InspectorGroup title="비주얼" open><label className="visual-field"><span>비주얼 형식</span><select value={config.aboutMediaType} onChange={e=>patch('aboutMediaType',e.target.value)}><option value="image">이미지</option><option value="3d">3D</option></select></label>{config.aboutMediaType==='image'?<FileField label="소개 이미지" accept="image/jpeg,image/png,image/webp" disabled={uploading} value={config.aboutImage} onFile={f=>uploadConfig(f,'aboutImage')} onClear={()=>patch('aboutImage','')}/>:<FileField label="3D 모델" accept=".glb,.gltf,.fbx,.obj,.stl,.ply,.zip" disabled={uploading} value={config.aboutModel} onFile={f=>uploadConfig(f,'aboutModel')} onClear={()=>patch('aboutModel','')}/>}</InspectorGroup>{dividerButton}</>;
 if(section==='team')return <><div className="visual-editor-panel-head"><h3>팀</h3></div><InspectorGroup title="영역 텍스트" open><TextField label="작은 제목" value={config.teamKicker} onChange={v=>patch('teamKicker',v)}/><TextField label="큰 제목" value={config.teamHeadline} multi onChange={v=>patch('teamHeadline',v)}/><TextField label="보기 버튼" value={config.teamViewLabel} onChange={v=>patch('teamViewLabel',v)}/></InspectorGroup><InspectorGroup title="팀원" open><div className="visual-team-list">{config.teamMembers.map(m=><div className="visual-team-row" key={m.id}><input value={m.name} placeholder="이름" onChange={e=>patchTeam(m.id,'name',e.target.value)}/><input value={m.codeName} placeholder="코드명" onChange={e=>patchTeam(m.id,'codeName',e.target.value)}/><label><span>표시</span><input type="checkbox" checked={m.visible} onChange={e=>patchTeam(m.id,'visible',e.target.checked)}/></label></div>)}</div></InspectorGroup><InspectorGroup title="팀 레이아웃"><Range label="미디어 크기" value={config.teamMediaSize} min={120} max={520} step={1} suffix="px" onChange={v=>patch('teamMediaSize',v)}/><Range label="미디어 모서리" value={config.teamMediaRadius} min={0} max={80} step={1} suffix="px" onChange={v=>patch('teamMediaRadius',v)}/><Range label="행 간격" value={config.teamRowGap} min={12} max={180} step={1} suffix="px" onChange={v=>patch('teamRowGap',v)}/><Range label="큰 제목 너비" value={config.teamHeadline너비} min={30} max={100} step={1} suffix="%" onChange={v=>patch('teamHeadline너비',v)}/></InspectorGroup>{dividerButton}</>;
 return <><div className="visual-editor-panel-head"><h3>하단 영역</h3></div><InspectorGroup title="내용" open><TextField label="관리자 문구" value={config.footerAdminLabel} onChange={v=>patch('footerAdminLabel',v)}/><TextField label="문의 이메일" value={config.email} onChange={v=>patch('email',v)}/><TextField label="인스타그램" value={config.instagram} onChange={v=>patch('instagram',v)}/></InspectorGroup><InspectorGroup title="음악 플레이어" open><label className="visual-toggle"><span>음악 플레이어 표시</span><input type="checkbox" checked={config.showMusic} onChange={e=>patch('showMusic',e.target.checked)}/></label><label className="visual-toggle"><span>사이트 방문 시 자동재생</span><input type="checkbox" checked={config.musicAutoplay} onChange={e=>patch('musicAutoplay',e.target.checked)}/></label><label className="visual-toggle"><span>기본 셔플</span><input type="checkbox" checked={config.musicShuffle} onChange={e=>patch('musicShuffle',e.target.checked)}/></label><label className="visual-toggle"><span>첫 곡 랜덤</span><input type="checkbox" checked={config.musicRandomStart} onChange={e=>patch('musicRandomStart',e.target.checked)}/></label><Range label="기본 음량" value={config.volume} min={0} max={100} step={1} suffix="%" onChange={v=>patch('volume',v)}/><label className="visual-field"><span>반복 모드</span><select value={config.musicRepeatMode} onChange={e=>patch('musicRepeatMode',e.target.value as Config['musicRepeatMode'])}><option value="all">전체 반복</option><option value="one">한 곡 반복</option><option value="none">반복 없음</option></select></label></InspectorGroup>{dividerButton}</>;
}

function StylePanel({section,config,patch,patchTextStyle,uploadConfig,uploading}:{section:SectionKey;config:Config;patch:<K extends keyof Config>(key:K,value:Config[K])=>void;patchTextStyle:(key:TextStyleKey,value:TextPatch)=>void;uploadConfig:(file:File|undefined,key:keyof Config)=>void;uploading:boolean}){
 const textGroups:Partial<Record<SectionKey,{key:TextStyleKey;label:string}[]>>={
  hero:[{key:'heroCaption',label:'마우스 오버 제목'}],
  work:[{key:'workKicker',label:'작은 제목'},{key:'workHeadline',label:'큰 제목'},{key:'workAside',label:'보조 문구'},{key:'workCardTitle',label:'Card title'},{key:'workCardMeta',label:'Card meta'}],
  about:[{key:'aboutKicker',label:'작은 제목'},{key:'aboutHeadline',label:'큰 제목'},{key:'aboutBody',label:'본문'},{key:'aboutDisciplines',label:'분야 목록'}],
  team:[{key:'teamKicker',label:'작은 제목'},{key:'teamHeadline',label:'큰 제목'},{key:'teamMemberName',label:'Member name'},{key:'teamMemberBio',label:'Member bio'},{key:'teamView',label:'보기 버튼'}]
 };
 return <div className="visual-style-panel">
  {section==='hero'&&<InspectorGroup title="메인 영상 그라데이션" open meta="top · bottom · density · blur"><label className="visual-toggle"><span>그라데이션 사용</span><input type="checkbox" checked={config.heroFadeEnabled} onChange={e=>patch('heroFadeEnabled',e.target.checked)}/></label><Range label="상단 크기" value={config.heroFadeTopSize} min={0} max={40} step={1} suffix="%" onChange={v=>patch('heroFadeTopSize',v)}/><Range label="하단 크기" value={config.heroFadeBottomSize} min={0} max={40} step={1} suffix="%" onChange={v=>patch('heroFadeBottomSize',v)}/><Range label="농도" value={config.heroFadeDensity} min={0} max={100} step={1} suffix="%" onChange={v=>patch('heroFadeDensity',v)}/><Range label="불투명도" value={config.heroFade불투명도} min={0} max={100} step={1} suffix="%" onChange={v=>patch('heroFade불투명도',v)}/><Range label="블러" value={config.heroFadeBlur} min={0} max={40} step={1} suffix="px" onChange={v=>patch('heroFadeBlur',v)}/></InspectorGroup>}
  {!!textGroups[section]?.length&&<InspectorGroup title="글자 스타일" open meta="필요한 항목만 펼쳐서 편집">{textGroups[section]!.map(item=><TextStyleControl key={item.key} label={item.label} value={config.textStyles[item.key]} onChange={v=>patchTextStyle(item.key,v)}/>)}</InspectorGroup>}
  {section==='about'&&config.aboutMediaType==='3d'&&<InspectorGroup title="3D 인터랙션" meta="관리자 고급 기능 이전"><label className="visual-toggle"><span>드래그 회전</span><input type="checkbox" checked={config.modelDrag} onChange={e=>patch('modelDrag',e.target.checked)}/></label><label className="visual-toggle"><span>원위치 복귀</span><input type="checkbox" checked={config.modelReturnToCenter} onChange={e=>patch('modelReturnToCenter',e.target.checked)}/></label><label className="visual-toggle"><span>포인터 반응</span><input type="checkbox" checked={config.modelReact} onChange={e=>patch('modelReact',e.target.checked)}/></label><label className="visual-toggle"><span>휠 / 핀치 확대</span><input type="checkbox" checked={config.modelZoom} onChange={e=>patch('modelZoom',e.target.checked)}/></label><label className="visual-toggle"><span>자동 회전</span><input type="checkbox" checked={config.modelAutoRotate} onChange={e=>patch('modelAutoRotate',e.target.checked)}/></label><Range label="크기" value={config.model크기} min={.4} max={2.5} step={.05} onChange={v=>patch('model크기',v)}/><Range label="X offset" value={config.modelOffsetX} min={-40} max={40} step={1} suffix="%" onChange={v=>patch('modelOffsetX',v)}/><Range label="Y offset" value={config.modelOffsetY} min={-40} max={40} step={1} suffix="%" onChange={v=>patch('modelOffsetY',v)}/><Range label="Rotate X" value={config.modelRotateX} min={-180} max={180} step={1} suffix="°" onChange={v=>patch('modelRotateX',v)}/><Range label="Rotate Y" value={config.modelRotateY} min={-180} max={180} step={1} suffix="°" onChange={v=>patch('modelRotateY',v)}/><Range label="Rotate Z" value={config.modelRotateZ} min={-180} max={180} step={1} suffix="°" onChange={v=>patch('modelRotateZ',v)}/><Range label="Exposure" value={config.modelExposure} min={.2} max={2} step={.1} onChange={v=>patch('modelExposure',v)}/></InspectorGroup>}
  <InspectorGroup title="사이트 스타일" meta="전역 디자인"><div className="visual-segmented"><button className={config.theme==='dark'?'is-active':''} onClick={()=>patch('theme','dark')}>Dark</button><button className={config.theme==='light'?'is-active':''} onClick={()=>patch('theme','light')}>Light</button></div><label className="visual-color"><span>Accent</span><input type="color" value={config.accent} onChange={e=>patch('accent',e.target.value)}/><b>{config.accent.toUpperCase()}</b></label><label className="visual-field"><span>Font</span><select value={config.font} onChange={e=>patch('font',e.target.value)}><option>Arial, Helvetica, sans-serif</option><option>Helvetica Neue, Arial, sans-serif</option><option>Georgia, serif</option><option>Times New Roman, serif</option><option>Verdana, sans-serif</option><option>Trebuchet MS, sans-serif</option><option>Courier New, monospace</option><option>system-ui, sans-serif</option></select></label><Range label="Body size" value={config.fontSize} min={12} max={24} step={1} suffix="px" onChange={v=>patch('fontSize',v)}/><Range label="Corner radius" value={config.radius} min={0} max={54} step={1} suffix="px" onChange={v=>patch('radius',v)}/><Range label="Glass blur" value={config.blur} min={0} max={60} step={1} suffix="px" onChange={v=>patch('blur',v)}/><Range label="Glass opacity" value={config.glass} min={10} max={100} step={1} suffix="%" onChange={v=>patch('glass',v)}/><Range label="Motion" value={Math.round(config.motion*100)} min={0} max={180} step={5} suffix="%" onChange={v=>patch('motion',v/100)}/></InspectorGroup>
  <InspectorGroup title="배경·패턴"><label className="visual-field"><span>Background</span><select value={config.backgroundType} onChange={e=>patch('backgroundType',e.target.value)}><option value="none">None</option><option value="image">이미지</option><option value="video">Video</option></select></label>{config.backgroundType==='image'&&<FileField label="Background image" accept="image/*" disabled={uploading} value={config.backgroundImage} onFile={f=>uploadConfig(f,'backgroundImage')} onClear={()=>patch('backgroundImage','')}/>} {config.backgroundType==='video'&&<FileField label="Background video" accept="video/mp4,video/webm" disabled={uploading} value={config.backgroundVideo} onFile={f=>uploadConfig(f,'backgroundVideo')} onClear={()=>patch('backgroundVideo','')}/>} {config.backgroundType!=='none'&&<><Range label="Background opacity" value={config.background불투명도} min={0} max={100} step={1} suffix="%" onChange={v=>patch('background불투명도',v)}/><Range label="Background dim" value={config.backgroundDim} min={0} max={100} step={1} suffix="%" onChange={v=>patch('backgroundDim',v)}/></>}<label className="visual-field"><span>Pattern</span><select value={config.pattern} onChange={e=>patch('pattern',e.target.value)}><option value="none">None</option><option value="dots">Dots</option><option value="grid">Grid</option><option value="diagonal">Diagonal</option><option value="checker">Checker</option><option value="lines">Lines</option><option value="rings">Rings</option></select></label>{config.pattern!=='none'&&<><label className="visual-color"><span>Pattern color</span><input type="color" value={config.patternColor} onChange={e=>patch('patternColor',e.target.value)}/><b>{config.patternColor.toUpperCase()}</b></label><Range label="Pattern size" value={config.patternSize} min={8} max={120} step={1} suffix="px" onChange={v=>patch('patternSize',v)}/><Range label="Pattern opacity" value={config.pattern불투명도} min={0} max={100} step={1} suffix="%" onChange={v=>patch('pattern불투명도',v)}/></>}</InspectorGroup>
  <InspectorGroup title="브라우저"><TextField label="Browser title" value={config.browserTitle} onChange={v=>patch('browserTitle',v)}/><FileField label="Favicon" accept="image/png,image/jpeg,image/webp,image/x-icon,.ico" disabled={uploading} value={config.favicon} onFile={f=>uploadConfig(f,'favicon')} onClear={()=>patch('favicon','')}/></InspectorGroup>
 </div>;
}

function TextStyleControl({label,value,onChange}:{label:string;value:Config['textStyles'][TextStyleKey];onChange:(value:TextPatch)=>void}){
 const weight=value.weight??500,opacity=value.opacity??100,letterSpacing=value.letterSpacing??0,textTransform=value.textTransform??'none';
 return <details className="visual-text-style"><summary>{label}<span>{value.size}px · {weight}</span></summary>
  <label className="visual-field"><span>Font</span><select value={value.font} onChange={e=>onChange({font:e.target.value})}><option>Arial, Helvetica, sans-serif</option><option>Helvetica Neue, Arial, sans-serif</option><option>Georgia, serif</option><option>Times New Roman, serif</option><option>Verdana, sans-serif</option><option>Trebuchet MS, sans-serif</option><option>Courier New, monospace</option><option>system-ui, sans-serif</option></select></label>
  <Range label="크기" value={value.size} min={8} max={180} step={1} suffix="px" onChange={v=>onChange({size:v})}/>
  <Range label="X" value={value.x} min={-600} max={600} step={1} suffix="px" onChange={v=>onChange({x:v})}/>
  <Range label="Y" value={value.y} min={-420} max={420} step={1} suffix="px" onChange={v=>onChange({y:v})}/>
  <Range label="자간" value={letterSpacing} min={-8} max={24} step={.25} suffix="px" onChange={v=>onChange({letterSpacing:v})}/>
  <Range label="굵기" value={weight} min={100} max={900} step={100} onChange={v=>onChange({weight:v})}/>
  <Range label="불투명도" value={opacity} min={0} max={100} step={1} suffix="%" onChange={v=>onChange({opacity:v})}/>
  <label className="visual-color"><span>색상</span><input type="color" value={value.color||'#ffffff'} onChange={e=>onChange({color:e.target.value})}/><b>{value.color||'AUTO'}</b></label>
  <label className="visual-field"><span>영문 대소문자</span><select value={textTransform} onChange={e=>onChange({textTransform:e.target.value as TextPatch['textTransform']})}><option value="none">입력한 그대로</option><option value="uppercase">UPPERCASE</option><option value="lowercase">lowercase</option><option value="capitalize">Capitalize</option></select></label>
  <div className="visual-align-buttons">{(['left','center','right'] as const).map(a=><button key={a} className={value.align===a?'is-active':''} onClick={()=>onChange({align:a})}>{a}</button>)}</div>
 </details>;
}
function WorkEditor({work,patch,onUpload,uploading,onDuplicate,onDelete}:{work:Work;patch:(key:keyof Work,value:Work[keyof Work])=>void;onUpload:(file:File|undefined,field:'poster'|'video')=>void;uploading:boolean;onDuplicate:()=>void;onDelete:()=>void}){
 return <><div className="visual-editor-panel-head"><h3>작품 카드</h3><div><button type="button" title="복제" onClick={onDuplicate}><Copy size={13}/></button><button type="button" className="is-danger" title="삭제" onClick={onDelete}><Trash2 size={13}/></button></div></div><TextField label="제목" value={work.title} onChange={v=>patch('title',v)}/><TextField label="카테고리" value={work.category} onChange={v=>patch('category',v)}/><TextField label="연도" value={work.year} onChange={v=>patch('year',v)}/><TextField label="역할" value={work.role} onChange={v=>patch('role',v)}/><TextField label="설명" value={work.description} multi onChange={v=>patch('description',v)}/><label className="visual-toggle"><span>공개</span><input type="checkbox" checked={work.visible} onChange={e=>patch('visible',e.target.checked)}/></label><FileField label="포스터 / 이미지" accept="image/jpeg,image/png,image/webp" disabled={uploading} value={work.poster} onFile={f=>onUpload(f,'poster')} onClear={()=>patch('poster','')}/><FileField label="영상" accept="video/mp4,video/webm" disabled={uploading} value={work.video} onFile={f=>onUpload(f,'video')} onClear={()=>patch('video','')}/></>;
}
