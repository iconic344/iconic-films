'use client';
import {useEffect,useRef,useState,type CSSProperties,type Dispatch,type PointerEvent,type SetStateAction} from 'react';
import {ArrowDown,ArrowUp,Copy,Eye,EyeOff,Grip,Layers3,Maximize2,PanelLeft,PanelRight,Plus,RotateCcw,Save,Settings2,SlidersHorizontal,Trash2,Type,Undo2,X} from 'lucide-react';
import type {Config,NavItemKey,SiteSectionKey,Work,SectionDivider,PageBlock,PageBlockType} from './defaults';
import {uploadFile,videoPoster} from './media-upload';
import {checkVideoPlayback} from './video-playback-check';
import EditSiteFullSettings from './edit-site-full-settings';
import EditSiteWorkbench from './edit-site-workbench';
import FontPicker from './font-picker';
import MediaLibrary from './media-library';

type SectionKey=SiteSectionKey;
type PanelTab='layers'|'content'|'layout'|'style'|'settings';
type Point={x:number;y:number};
type UploadState={key:keyof Config;filename:string;percent:number;phase:'uploading'|'verifying'|'done'|'error';message?:string};
type TextStyleKey=keyof Config['textStyles'];
type TextPatch=Partial<{font:string;size:number;color:string;align:'left'|'center'|'right';x:number;y:number;letterSpacing:number;weight:number;opacity:number;textTransform:'none'|'uppercase'|'lowercase'|'capitalize'}>;
export type VisualSelection=SectionKey|`work:${string}`|`divider:${string}`|`block:${string}`|`text:${string}`|`worktext:${string}:${string}`|`teamtext:${string}:${string}`;

const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
const sanitizeFooterBrand=(value:string)=>value.replace(/^(?:\s*©\s*\d{4}\s*)+/,'').trim();
const verticalDragTextKeys=new Set(['aboutKicker','aboutHeadline','about','aboutDisciplines','footerCopyright']);
const sectionDefs:{key:SectionKey;label:string}[]=[
 {key:'nav',label:'상단 메뉴'},{key:'hero',label:'메인 비주얼'},{key:'work',label:'작품'},{key:'about',label:'소개'},{key:'team',label:'팀'},{key:'footer',label:'하단 영역'}
];
const navLabels:Record<NavItemKey,string>={work:'작품',about:'소개',team:'팀',contact:'문의'};
const labelKeys:Record<NavItemKey,'navWorkLabel'|'navAboutLabel'|'navTeamLabel'|'navContactLabel'>={work:'navWorkLabel',about:'navAboutLabel',team:'navTeamLabel',contact:'navContactLabel'};
type DirectTextDef={section:SectionKey;label:string;configKey:keyof Config;styleKey?:TextStyleKey;multi?:boolean};
const directTextDefs:Record<string,DirectTextDef>={
 name:{section:'nav',label:'브랜드 이름',configKey:'name',styleKey:'navBrand'},
 navWorkLabel:{section:'nav',label:'작품 메뉴',configKey:'navWorkLabel',styleKey:'navMenu'},
 navAboutLabel:{section:'nav',label:'소개 메뉴',configKey:'navAboutLabel',styleKey:'navMenu'},
 navTeamLabel:{section:'nav',label:'팀 메뉴',configKey:'navTeamLabel',styleKey:'navMenu'},
 navContactLabel:{section:'nav',label:'문의 메뉴',configKey:'navContactLabel',styleKey:'navMenu'},
 heroCaption:{section:'hero',label:'마우스 오버 제목',configKey:'heroCaption',styleKey:'heroCaption'},
 eyebrow:{section:'hero',label:'상단 보조 문구',configKey:'eyebrow',styleKey:'heroEyebrow'},
 subtitle:{section:'hero',label:'하단 문구',configKey:'subtitle',styleKey:'heroSubtitle'},
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
 footerAdminLabel:{section:'footer',label:'관리자 문구',configKey:'footerAdminLabel',styleKey:'footerAdmin'},
 footerCopyright:{section:'footer',label:'저작권 브랜드명',configKey:'name',styleKey:'footerCopyright'}
};
const pointFromStorage=(key:string):Point|null=>{
 try{if(typeof window==='undefined')return null;const raw=localStorage.getItem(key);if(!raw)return null;const p=JSON.parse(raw);return Number.isFinite(p?.x)&&Number.isFinite(p?.y)?p:null}catch{return null}
};

export default function VisualSiteEditor({
 config,setConfig,selection,setSelection,onSave,onCancel,onOpenAdmin,onUndo,canUndo,busy,setBusy,notify,onThemeChange
}:{
 config:Config;setConfig:Dispatch<SetStateAction<Config>>;selection:VisualSelection;setSelection:(value:VisualSelection)=>void;
 onSave:()=>void|Promise<void>;onCancel:()=>void;onOpenAdmin:()=>void;onUndo:()=>void;canUndo:boolean;busy:boolean;
 setBusy:(value:boolean)=>void;notify:(value:string)=>void;onThemeChange?:(value:string)=>void;
}){
 const [rect,setRect]=useState<DOMRect|null>(null),[uploading,setUploading]=useState(false),[uploadState,setUploadState]=useState<UploadState|null>(null),[pendingHeroVideo,setPendingHeroVideo]=useState<string|null>(null),[panelSide,setPanelSide]=useState<'left'|'right'>('right'),[panelOpen,setPanelOpen]=useState(true),[tab,setTab]=useState<PanelTab>('content');
 const [toolbarPos,setToolbarPos]=useState<Point|null>(()=>pointFromStorage('viivii-visual-toolbar-pos'));
 const [panelPos,setPanelPos]=useState<Point|null>(()=>pointFromStorage('viivii-visual-panel-pos'));
 const [inlineEditing,setInlineEditing]=useState<VisualSelection|null>(null);
 const inlineOriginal=useRef('');
 const dragState=useRef<{y:number;baseY:number}|null>(null),resizeState=useRef<{x:number;y:number;base:number}|null>(null),heightState=useRef<{y:number;base:number}|null>(null),textDragState=useRef<{x:number;y:number;baseX:number;baseY:number}|null>(null),textSizeState=useRef<{x:number;y:number;base:number}|null>(null),dividerDragState=useRef<{y:number;base:number}|null>(null),modelDragState=useRef<{y:number;baseY:number;height:number}|null>(null);
 const selectedWorkId=selection.startsWith('work:')?selection.slice(5):'';
 const selectedWork=selectedWorkId?config.works.find(w=>w.id===selectedWorkId)||null:null;
 const selectedDividerId=selection.startsWith('divider:')?selection.slice(8):'';
 const selectedDivider=selectedDividerId?config.sectionDividers.find(d=>d.id===selectedDividerId)||null:null;
 const selectedBlockId=selection.startsWith('block:')?selection.slice(6):'';
 const selectedBlock=selectedBlockId?(config.pageBlocks||[]).find(block=>block.id===selectedBlockId)||null:null;
 const selectedTextKey=selection.startsWith('text:')?selection.slice(5):'';
 const selectedTextDef=selectedTextKey?directTextDefs[selectedTextKey]||null:null;
 const workTextParts=selection.startsWith('worktext:')?selection.slice(9).split(':'):[];
 const selectedWorkText=workTextParts.length>=2?{id:workTextParts[0],field:workTextParts.slice(1).join(':') as keyof Work}:null;
 const teamTextParts=selection.startsWith('teamtext:')?selection.slice(9).split(':'):[];
 const selectedTeamText=teamTextParts.length>=2?{id:teamTextParts[0],field:teamTextParts.slice(1).join(':')}:null;
 const sectionCandidate=selectedBlock?.after||selectedDivider?.after||selectedTextDef?.section||(selectedWork||selectedWorkText?'work':selectedTeamText?'team':selection);
 const sectionSelection=(sectionDefs.some(item=>item.key===sectionCandidate)?sectionCandidate:'work') as SectionKey;

 const targetFor=(value:VisualSelection=selection)=>{
  if(typeof document==='undefined')return null;
  if(value.startsWith('text:'))return document.querySelector<HTMLElement>(`[data-visual-text="${CSS.escape(value.slice(5))}"]`);
  if(value.startsWith('worktext:'))return document.querySelector<HTMLElement>(`[data-visual-work-text="${CSS.escape(value.slice(9))}"]`);
  if(value.startsWith('teamtext:'))return document.querySelector<HTMLElement>(`[data-visual-team-text="${CSS.escape(value.slice(9))}"]`);
  if(value.startsWith('divider:'))return document.querySelector<HTMLElement>(`[data-visual-divider-id="${CSS.escape(value.slice(8))}"]`);
  if(value.startsWith('block:'))return document.querySelector<HTMLElement>(`[data-visual-block-id="${CSS.escape(value.slice(6))}"]`);
  if(value.startsWith('work:')){const id=value.slice(5);return Array.from(document.querySelectorAll<HTMLElement>('[data-visual-work-id]')).find(el=>el.dataset.visualWorkId===id)||null}
  return document.querySelector<HTMLElement>(`[data-visual-section="${value}"]`);
 };
 const refresh=()=>{const el=targetFor();setRect(el?el.getBoundingClientRect():null)};
 useEffect(()=>{let raf=0;const sync=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(refresh)};sync();window.addEventListener('scroll',sync,{passive:true});window.addEventListener('resize',sync);return()=>{cancelAnimationFrame(raf);window.removeEventListener('scroll',sync);window.removeEventListener('resize',sync)}},[selection,config]);
 useEffect(()=>{setPanelOpen(true);setTab(current=>current==='settings'?'settings':'content')},[selection]);
 useEffect(()=>{if(panelPos)return;const el=targetFor();if(!el)return;const r=el.getBoundingClientRect();if(r.width<window.innerWidth*.76)setPanelSide(r.left+r.width/2>window.innerWidth/2?'left':'right');else if(selection==='nav')setPanelSide('right')},[selection,panelPos]);

 const patch=<K extends keyof Config>(key:K,value:Config[K])=>setConfig(d=>({...d,[key]:value}));
 const showGuides=(x:number,y:number)=>{const html=document.documentElement;html.style.setProperty('--visual-guide-x',Math.round(x)+'px');html.style.setProperty('--visual-guide-y',Math.round(y)+'px');html.classList.add('visual-axis-guides')};
 const hideGuides=()=>{const html=document.documentElement;html.classList.remove('visual-axis-guides');html.style.removeProperty('--visual-guide-x');html.style.removeProperty('--visual-guide-y')};
 const patchTextStyle=(key:TextStyleKey,value:TextPatch)=>setConfig(d=>({...d,textStyles:{...d.textStyles,[key]:{...d.textStyles[key],...value}}}));
 const patchWork=(id:string,key:keyof Work,value:Work[keyof Work])=>setConfig(d=>({...d,works:d.works.map(w=>w.id===id?{...w,[key]:value}:w)}));
 const patchTeam=(id:string,key:string,value:unknown)=>setConfig(d=>({...d,teamMembers:d.teamMembers.map(m=>m.id===id?{...m,[key]:value}:m)}));
 const patchBlock=(id:string,value:Partial<PageBlock>)=>setConfig(d=>({...d,pageBlocks:(d.pageBlocks||[]).map(block=>block.id===id?{...block,...value}:block)}));
 const deleteBlock=(id:string)=>{setConfig(d=>({...d,pageBlocks:(d.pageBlocks||[]).filter(block=>block.id!==id)}));setSelection(sectionSelection);setTab('layers')};
 const addBlock=(type:PageBlockType)=>{
  const id='page-block-'+Date.now(),after=sectionDefs.some(item=>item.key===sectionSelection)?sectionSelection:'work';
  const defaults:PageBlock={id,type,after,visible:true,title:type==='slider'?'Slider':type==='text'?'New text':'',text:type==='text'?'내용을 입력하세요.':'',media:'',width:100,height:type==='spacer'?120:type==='media'?620:560,gap:18,radius:24,offsetY:0,background:'',color:'',fontSize:42,align:'left',mediaFit:'contain',mediaPositionX:50,mediaPositionY:50,autoplay:true,pattern:'none',patternSize:32,patternColor:'#888888',patternOpacity:12,fadeEnabled:false,fadeTopSize:14,fadeBottomSize:14,fadeDensity:34,fadeOpacity:72,fadeBlur:0};
  setConfig(d=>({...d,pageBlocks:[...(d.pageBlocks||[]),defaults]}));setSelection(`block:${id}`);setTab('content');
 };
 const uploadBlockMedia=async(id:string,file?:File)=>{if(!file)return;try{setUploading(true);const url=await uploadFile(file);patchBlock(id,{media:url});notify('미디어 업로드 완료. 저장을 눌러 적용하세요.')}catch(error){notify((error as Error).message)}finally{setUploading(false)}};
 const textStyleKeyFor=(value:VisualSelection):TextStyleKey|undefined=>{
  if(value.startsWith('text:'))return directTextDefs[value.slice(5)]?.styleKey;
  if(value.startsWith('worktext:')){const field=value.slice(9).split(':').slice(1).join(':');return field==='title'?'workCardTitle':'workCardMeta'}
  if(value.startsWith('teamtext:')){const field=value.slice(9).split(':').slice(1).join(':');return field==='name'?'teamMemberName':field==='bio'?'teamMemberBio':'teamMemberRole'}
  return undefined;
 };
 const inlineMetaFor=(value:VisualSelection)=>{
  if(value.startsWith('text:')){
   const key=value.slice(5),def=directTextDefs[key];if(!def)return null;
   return {multi:!!def.multi,read:()=>String(config[def.configKey]??''),write:(text:string)=>patch(def.configKey,(key==='footerCopyright'?sanitizeFooterBrand(text):text) as never)};
  }
  if(value.startsWith('worktext:')){
   const parts=value.slice(9).split(':'),id=parts.shift()||'',field=parts.join(':') as keyof Work;
   const work=config.works.find(item=>item.id===id);if(!work)return null;
   return {multi:field==='description',read:()=>String(work[field]??''),write:(text:string)=>patchWork(id,field,text as never)};
  }
  if(value.startsWith('teamtext:')){
   const parts=value.slice(9).split(':'),id=parts.shift()||'',field=parts.join(':');
   const member=config.teamMembers.find(item=>item.id===id);if(!member)return null;
   return {multi:field==='bio',read:()=>String((member as any)[field]??''),write:(text:string)=>patchTeam(id,field,text)};
  }
  return null;
 };
 const stopInlineEdit=(commit=true)=>{
  const value=inlineEditing;if(!value)return;
  const el=targetFor(value),meta=inlineMetaFor(value);
  if(el&&meta){
   if(commit){
    let text=(el.innerText||el.textContent||'').replace(/\r/g,'').replace(/\u00a0/g,' ');
    if(!meta.multi)text=text.replace(/\n+/g,' ');
    meta.write(text);
   }else{
    el.innerText=inlineOriginal.current;
   }
   el.contentEditable='false';el.removeAttribute('data-inline-editing');el.removeAttribute('spellcheck');
   if(el.dataset.visualNavKey)el.draggable=true;
  }
  setInlineEditing(null);
 };
 const startInlineEdit=(value:VisualSelection=selection,clientX?:number,clientY?:number)=>{
  const el=targetFor(value),meta=inlineMetaFor(value);if(!el||!meta)return;
  if(inlineEditing&&inlineEditing!==value)stopInlineEdit(true);
  setSelection(value);setTab('content');inlineOriginal.current=meta.read();setInlineEditing(value);
  el.contentEditable='true';el.spellcheck=false;el.dataset.inlineEditing='true';if(el.dataset.visualNavKey)el.draggable=false;
  requestAnimationFrame(()=>{
   el.focus({preventScroll:true});
   const doc=document as Document&{caretPositionFromPoint?:(x:number,y:number)=>{offsetNode:Node;offset:number}|null;caretRangeFromPoint?:(x:number,y:number)=>Range|null};
   const selectionApi=window.getSelection();if(!selectionApi)return;
   let range:Range|null=null;
   if(clientX!==undefined&&clientY!==undefined){
    const caret=doc.caretPositionFromPoint?.(clientX,clientY);
    if(caret){range=document.createRange();range.setStart(caret.offsetNode,caret.offset);range.collapse(true)}
    else range=doc.caretRangeFromPoint?.(clientX,clientY)||null;
   }
   if(!range){range=document.createRange();range.selectNodeContents(el);range.collapse(false)}
   selectionApi.removeAllRanges();selectionApi.addRange(range);
  });
 };
 const layoutKeys=(key:SectionKey)=>{
  if(key==='nav')return {x:'navOffsetX',y:'navOffsetY',scale:'navScale'} as const;
  if(key==='hero')return {x:'heroOffsetX',y:'heroOffsetY',scale:'heroScale'} as const;
  if(key==='work')return {x:'workOffsetX',y:'workOffsetY',scale:'workScale'} as const;
  if(key==='about')return {x:'aboutOffsetX',y:'aboutOffsetY',scale:'aboutScale'} as const;
  if(key==='team')return {x:'teamOffsetX',y:'teamOffsetY',scale:'teamScale'} as const;
  if(key==='footer')return {x:'footerOffsetX',y:'footerOffsetY',scale:'footerScale'} as const;
  return null;
 };
 const meta=layoutKeys(sectionSelection);

 const beginMove=(e:PointerEvent<HTMLButtonElement>)=>{
  if(!meta||selectedWork||selectedDivider||selectedTextDef||selectedWorkText||selectedTeamText)return;e.preventDefault();e.stopPropagation();
  dragState.current={y:e.clientY,baseY:Number(config[meta.y])};
  setConfig(d=>({...d,[meta.x]:0}));
  const move=(event:globalThis.PointerEvent)=>{const start=dragState.current;if(!start)return;setConfig(d=>({...d,[meta.x]:0,[meta.y]:Math.round(start.baseY+event.clientY-start.y)}))};
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
  if(selectedWork||selectedDivider||selectedTextDef||selectedWorkText||selectedTeamText)return;
  e.preventDefault();e.stopPropagation();
  const section=sectionSelection,pointerId=e.pointerId,handle=e.currentTarget;
  const current=Number(config.sectionHeights?.[section])>0?Number(config.sectionHeights?.[section]):Math.max(0,Math.round(rect?.height||0));
  heightState.current={y:e.clientY,base:current};
  try{handle.setPointerCapture(pointerId)}catch{}
  let raf=0,pendingY=e.clientY;
  const commit=()=>{
   raf=0;
   const start=heightState.current;if(!start)return;
   const minimum=section==='nav'?48:0;
   const next=Math.max(minimum,Math.round(start.base+pendingY-start.y));
   setConfig(d=>({...d,sectionHeights:{...(d.sectionHeights||{}),[section]:next}}));
  };
  const move=(event:globalThis.PointerEvent)=>{if(!heightState.current||event.pointerId!==pointerId)return;pendingY=event.clientY;if(!raf)raf=requestAnimationFrame(commit)};
  const finish=(event?:globalThis.PointerEvent)=>{if(event&&event.pointerId!==pointerId)return;cancelAnimationFrame(raf);if(heightState.current){pendingY=event?.clientY??pendingY;commit()}heightState.current=null;try{if(handle.hasPointerCapture(pointerId))handle.releasePointerCapture(pointerId)}catch{}window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);refresh()};
  window.addEventListener('pointermove',move,{passive:true});window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);
 };
 const beginTextMove=(e:PointerEvent<HTMLButtonElement>)=>{
  if(!selectedTextDef?.styleKey)return;e.preventDefault();e.stopPropagation();
  const style=config.textStyles[selectedTextDef.styleKey],lockX=verticalDragTextKeys.has(selectedTextKey),baseX=selectedTextKey==='footerCopyright'?0:style.x;
  textDragState.current={x:e.clientX,y:e.clientY,baseX,baseY:style.y};
  const target=targetFor(),guideX=selectedTextKey==='footerCopyright'?window.innerWidth/2:(target?.getBoundingClientRect().left??e.clientX);
  const move=(event:globalThis.PointerEvent)=>{const start=textDragState.current;if(!start)return;showGuides(guideX,event.clientY);patchTextStyle(selectedTextDef.styleKey!,{x:lockX?start.baseX:Math.round(start.baseX+event.clientX-start.x),y:Math.round(start.baseY+event.clientY-start.y)})};
  const up=()=>{textDragState.current=null;hideGuides();window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
 };
 const beginDividerMove=(e:PointerEvent<HTMLButtonElement>)=>{
  if(!selectedDivider)return;e.preventDefault();e.stopPropagation();
  dividerDragState.current={y:e.clientY,base:selectedDivider.offsetY||0};
  const move=(event:globalThis.PointerEvent)=>{const start=dividerDragState.current;if(!start)return;patchDivider(selectedDivider.id,{offsetY:Math.round(start.base+event.clientY-start.y)})};
  const up=()=>{dividerDragState.current=null;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
 };
 const beginTextResize=(e:PointerEvent<HTMLButtonElement>)=>{
  if(!selectedTextDef?.styleKey)return;e.preventDefault();e.stopPropagation();
  const style=config.textStyles[selectedTextDef.styleKey];
  textSizeState.current={x:e.clientX,y:e.clientY,base:style.size};
  const move=(event:globalThis.PointerEvent)=>{const start=textSizeState.current;if(!start)return;const delta=((event.clientX-start.x)+(event.clientY-start.y))*.28;patchTextStyle(selectedTextDef.styleKey!,{size:Math.max(4,Math.round((start.base+delta)*10)/10)})};
  const up=()=>{textSizeState.current=null;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
 };
 useEffect(()=>{
  if(!inlineEditing)return;
  const el=targetFor(inlineEditing);if(!el)return;
  const onBlur=()=>stopInlineEdit(true);
  const onKey=(event:KeyboardEvent)=>{
   const meta=inlineMetaFor(inlineEditing);
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();stopInlineEdit(false);return}
   if(event.key==='Enter'&&!event.shiftKey&&!meta?.multi){event.preventDefault();event.stopPropagation();stopInlineEdit(true);return}
   if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();event.stopPropagation();stopInlineEdit(true)}
  };
  el.addEventListener('blur',onBlur);el.addEventListener('keydown',onKey);
  return()=>{el.removeEventListener('blur',onBlur);el.removeEventListener('keydown',onKey)};
 },[inlineEditing,config]);
 useEffect(()=>{
  const onKey=(event:KeyboardEvent)=>{
   const target=event.target as HTMLElement|null;
   if(target?.closest('input,textarea,select,[contenteditable="true"]'))return;
   const styleKey=textStyleKeyFor(selection);
   if((event.key==='Enter'||event.key==='F2')&&inlineMetaFor(selection)){event.preventDefault();startInlineEdit(selection);return}
   if(styleKey&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='b'){event.preventDefault();const style=config.textStyles[styleKey];patchTextStyle(styleKey,{weight:(style.weight??500)>=650?400:700});return}
   if(selectedTextDef?.styleKey&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
    event.preventDefault();const style=config.textStyles[selectedTextDef.styleKey],step=event.shiftKey?10:1;
    if(selectedTextKey!=='footerCopyright'&&event.key==='ArrowLeft')patchTextStyle(selectedTextDef.styleKey,{x:style.x-step});
    if(selectedTextKey!=='footerCopyright'&&event.key==='ArrowRight')patchTextStyle(selectedTextDef.styleKey,{x:style.x+step});
    if(event.key==='ArrowUp')patchTextStyle(selectedTextDef.styleKey,{y:style.y-step});
    if(event.key==='ArrowDown')patchTextStyle(selectedTextDef.styleKey,{y:style.y+step});
   }
  };
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
 },[selection,config,inlineEditing]);
 useEffect(()=>{
  const down=(event:globalThis.PointerEvent)=>{
   if(event.button!==0)return;
   const target=event.target as HTMLElement|null;
   if(!target||target.closest('[data-visual-editor="true"]')||target.closest('[data-visual-nav-key]'))return;
   const anyText=target.closest<HTMLElement>('[data-visual-text],[data-visual-work-text],[data-visual-team-text]');
   if(anyText){
    const directKey=anyText.dataset.visualText||'';
    if(directKey&&!directTextDefs[directKey]){
     const section=anyText.closest<HTMLElement>('[data-visual-section]');
     const key=section?.dataset.visualSection||'work';
     setSelection((sectionDefs.some(item=>item.key===key)?key:'work') as VisualSelection);
     event.preventDefault();event.stopPropagation();return;
    }
    const value=(directKey?('text:'+directKey):anyText.dataset.visualWorkText?('worktext:'+anyText.dataset.visualWorkText):('teamtext:'+anyText.dataset.visualTeamText)) as VisualSelection;
    setSelection(value);
    if(inlineEditing===value)return;
    event.preventDefault();event.stopPropagation();
    const styleKey=textStyleKeyFor(value),style=styleKey?config.textStyles[styleKey]:null,sx=event.clientX,sy=event.clientY,startScroll=window.scrollY;
    const lockX=verticalDragTextKeys.has(directKey),baseX=directKey==='footerCopyright'?0:(style?.x||0),guideX=directKey==='footerCopyright'?window.innerWidth/2:anyText.getBoundingClientRect().left;
    let active=false;
    const move=(ev:globalThis.PointerEvent)=>{
     const dx=ev.clientX-sx,dy=ev.clientY-sy+(window.scrollY-startScroll);
     if(!active&&Math.hypot(dx,dy)<5)return;
     if(!value.startsWith('text:')||!styleKey||!style)return;
     active=true;document.documentElement.classList.add('visual-direct-dragging');showGuides(guideX,ev.clientY);
     patchTextStyle(styleKey,{x:lockX?baseX:Math.round(baseX+dx),y:Math.round(style.y+dy)});
     if(ev.clientY<54)window.scrollBy(0,-18);else if(ev.clientY>window.innerHeight-54)window.scrollBy(0,18);
    };
    const up=(ev:globalThis.PointerEvent)=>{
     document.documentElement.classList.remove('visual-direct-dragging');hideGuides();window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);
     if(active)refresh();else startInlineEdit(value,ev.clientX,ev.clientY);
    };
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
    return;
   }
   const mediaEl=target.closest<HTMLElement>('[data-visual-media]');
   if(mediaEl){
    const mediaKey=mediaEl.dataset.visualMedia||'';
    if(mediaKey==='hero'||mediaKey.startsWith('block:')){
     event.preventDefault();event.stopPropagation();
     const rect=mediaEl.getBoundingClientRect(),sx=event.clientX,sy=event.clientY,pointerId=event.pointerId;
     const isHero=mediaKey==='hero';
     const blockId=isHero?'':mediaKey.slice(6);
     const block=!isHero?config.pageBlocks.find(item=>item.id===blockId):null;
     if(!isHero&&!block)return;
     if(isHero)setSelection('hero');else setSelection(('block:'+blockId) as VisualSelection);
     const baseX=isHero?Number(config.heroMediaPositionX||50):Number(block!.mediaPositionX||50);
     const baseY=isHero?Number(config.heroMediaPositionY||50):Number(block!.mediaPositionY||50);
     const width=Math.max(1,rect.width),height=Math.max(1,rect.height);
     let active=false,raf=0,pendingX=sx,pendingY=sy;
     try{mediaEl.setPointerCapture(pointerId)}catch{}
     const commit=()=>{
      raf=0;
      const nextX=Math.round((baseX+((pendingX-sx)/width)*100)*10)/10;
      const nextY=Math.round((baseY+((pendingY-sy)/height)*100)*10)/10;
      if(isHero)setConfig(d=>({...d,heroMediaPositionX:nextX,heroMediaPositionY:nextY}));
      else patchBlock(blockId,{mediaPositionX:nextX,mediaPositionY:nextY});
     };
     const move=(ev:globalThis.PointerEvent)=>{
      if(ev.pointerId!==pointerId)return;
      if(!active&&Math.hypot(ev.clientX-sx,ev.clientY-sy)<3)return;
      active=true;document.documentElement.classList.add('visual-direct-dragging','visual-media-dragging');
      pendingX=ev.clientX;pendingY=ev.clientY;showGuides(ev.clientX,ev.clientY);
      if(!raf)raf=requestAnimationFrame(commit);
     };
     const finish=(ev:globalThis.PointerEvent)=>{
      if(ev.pointerId!==pointerId)return;
      if(active){pendingX=ev.clientX;pendingY=ev.clientY;if(raf)cancelAnimationFrame(raf);commit();refresh()}
      document.documentElement.classList.remove('visual-direct-dragging','visual-media-dragging');hideGuides();
      try{if(mediaEl.hasPointerCapture(pointerId))mediaEl.releasePointerCapture(pointerId)}catch{}
      window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);
     };
     window.addEventListener('pointermove',move,{passive:true});window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);
     return;
    }
   }
   const modelEl=target.closest<HTMLElement>('[data-visual-model="about"]');
   if(modelEl&&config.aboutMediaType==='3d'){
    setSelection('about');event.preventDefault();event.stopPropagation();
    const r=modelEl.getBoundingClientRect(),sy=event.clientY,baseY=Number(config.modelOffsetY)||0,guideX=r.left+r.width/2;
    modelDragState.current={y:sy,baseY,height:Math.max(1,r.height)};
    const move=(ev:globalThis.PointerEvent)=>{const start=modelDragState.current;if(!start)return;document.documentElement.classList.add('visual-direct-dragging');showGuides(guideX,ev.clientY);const next=clamp(start.baseY+((ev.clientY-start.y)/start.height)*100,-80,80);setConfig(d=>({...d,modelOffsetY:Math.round(next*10)/10}))};
    const up=()=>{modelDragState.current=null;document.documentElement.classList.remove('visual-direct-dragging');hideGuides();window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});return;
   }
   const dividerEl=target.closest<HTMLElement>('[data-visual-divider-id]');
   if(dividerEl){
    const id=dividerEl.dataset.visualDividerId||'',divider=config.sectionDividers.find(item=>item.id===id);
    if(!divider)return;
    setSelection(('divider:'+id) as VisualSelection);event.preventDefault();event.stopPropagation();
    const sy=event.clientY,startScroll=window.scrollY,base=divider.offsetY||0;
    const move=(ev:globalThis.PointerEvent)=>{document.documentElement.classList.add('visual-direct-dragging');patchDivider(id,{offsetY:Math.round(base+ev.clientY-sy+(window.scrollY-startScroll))});if(ev.clientY<54)window.scrollBy(0,-18);else if(ev.clientY>window.innerHeight-54)window.scrollBy(0,18)};
    const up=()=>{document.documentElement.classList.remove('visual-direct-dragging');window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
    return;
   }
   if(target.closest('[data-visual-work-id]')||target.closest('[data-visual-work-text]')||target.closest('[data-visual-team-text]')||target.closest('input,textarea,select,button,a,video,audio'))return;
   const sectionEl=target.closest<HTMLElement>('[data-visual-section]');
   const key=sectionEl?.dataset.visualSection as SectionKey|undefined;
   const keys=key?layoutKeys(key):null;
   if(!sectionEl||!key||!keys)return;
   setSelection(key);event.preventDefault();event.stopPropagation();
   const sy=event.clientY,startScroll=window.scrollY,base=Number(config[keys.y]);
   let active=false;
   const move=(ev:globalThis.PointerEvent)=>{
    const dy=ev.clientY-sy+(window.scrollY-startScroll);
    if(!active&&Math.abs(dy)<3)return;
    active=true;document.documentElement.classList.add('visual-direct-dragging');
    setConfig(d=>({...d,[keys.x]:0,[keys.y]:Math.round(base+dy)}));
    if(ev.clientY<54)window.scrollBy(0,-18);else if(ev.clientY>window.innerHeight-54)window.scrollBy(0,18);
   };
   const up=()=>{document.documentElement.classList.remove('visual-direct-dragging');window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};
   window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
  };
  document.addEventListener('pointerdown',down,true);
  return()=>{document.removeEventListener('pointerdown',down,true);document.documentElement.classList.remove('visual-direct-dragging');hideGuides()};
 },[config,setConfig,setSelection]);
 const beginChromeDrag=(e:PointerEvent<HTMLElement>,kind:'toolbar'|'panel')=>{
  if(e.button!==0)return;
  const origin=e.target as HTMLElement|null;
  if(origin?.closest('button,a,input,textarea,select,label,summary,[role="button"],[contenteditable="true"]'))return;
  const selector=kind==='toolbar'?'.visual-editor-topbar':'.visual-editor-panel';
  const node=(e.currentTarget as HTMLElement).closest<HTMLElement>(selector);
  if(!node)return;
  e.preventDefault();
  const r=node.getBoundingClientRect(),sx=e.clientX,sy=e.clientY;
  const setPos=kind==='toolbar'?setToolbarPos:setPanelPos;
  const storageKey=kind==='toolbar'?'viivii-visual-toolbar-pos':'viivii-visual-panel-pos';
  const xVar=kind==='toolbar'?'--ve-toolbar-x':'--ve-panel-x';
  const yVar=kind==='toolbar'?'--ve-toolbar-y':'--ve-panel-y';
  let x=r.left,y=r.top,raf=0;
  node.classList.add('is-free','is-dragging');
  document.documentElement.classList.add('visual-chrome-dragging');
  const paint=()=>{raf=0;node.style.setProperty(xVar,x+'px');node.style.setProperty(yVar,y+'px')};
  paint();
  const move=(ev:globalThis.PointerEvent)=>{
   x=r.left+(ev.clientX-sx);
   y=r.top+(ev.clientY-sy);
   if(!raf)raf=requestAnimationFrame(paint);
  };
  const finish=()=>{
   if(raf){cancelAnimationFrame(raf);raf=0}
   paint();
   window.removeEventListener('pointermove',move);
   window.removeEventListener('pointerup',finish);
   window.removeEventListener('pointercancel',finish);
   node.classList.remove('is-dragging');
   document.documentElement.classList.remove('visual-chrome-dragging');
   const p={x:Math.round(x),y:Math.round(y)};
   setPos(p);
   try{localStorage.setItem(storageKey,JSON.stringify(p))}catch{}
  };
  window.addEventListener('pointermove',move,{passive:true});
  window.addEventListener('pointerup',finish,{once:true});
  window.addEventListener('pointercancel',finish,{once:true});
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
 const addDivider=()=>{const id='divider-'+Date.now(),divider:SectionDivider={id,after:sectionSelection||'hero',visible:true,width:100,thickness:1,opacity:22,inset:0,marginTop:0,marginBottom:0,offsetY:0,color:''};setConfig(d=>({...d,sectionDividers:[...d.sectionDividers,divider]}));setSelection(`divider:${id}`);setTab('content')};
 const patchDivider=(id:string,value:Partial<SectionDivider>)=>setConfig(d=>({...d,sectionDividers:d.sectionDividers.map(divider=>divider.id===id?{...divider,...value}:divider)}));
 const deleteDivider=(id:string)=>{setConfig(d=>({...d,sectionDividers:d.sectionDividers.filter(divider=>divider.id!==id)}));setSelection(sectionSelection);setTab('layers')};
 const duplicateWork=(work:Work)=>{const copy={...work,id:'visual-'+Date.now(),title:work.title+' copy'};setConfig(d=>({...d,works:[...d.works,copy]}));setSelection(`work:${copy.id}`);setTab('content')};
 const deleteWork=(id:string)=>{setConfig(d=>({...d,works:d.works.filter(w=>w.id!==id)}));setSelection('work');setTab('layers')};
 const uploadWork=async(file:File|undefined,field:'poster'|'video')=>{if(!file||!selectedWork)return;try{setUploading(true);const url=await uploadFile(file);setConfig(d=>({...d,works:d.works.map(w=>w.id===selectedWork.id?{...w,[field]:url,visible:true}:w)}))}finally{setUploading(false)}};

 const retryHeroPlayback=async()=>{
  if(!pendingHeroVideo||uploading)return;
  const url=pendingHeroVideo,filename=uploadState?.filename||'업로드된 영상';
  setUploading(true);setUploadState({key:'heroVideo',filename,percent:100,phase:'verifying',message:'업로드된 영상의 재생 상태를 다시 확인하는 중'});
  try{
   const result=await checkVideoPlayback(url,18000);
   if(result!=='ready')throw Error(result==='unsupported'?'영상 코덱을 읽지 못했습니다. H.264/AAC MP4로 변환해 주세요.':'영상 준비가 지연됩니다. 잠시 후 다시 확인할 수 있습니다.');
   setConfig(d=>({...d,heroVideo:url,heroPoster:'',autoplay:true,heroMediaFit:'cover'}));
   setPendingHeroVideo(null);
   setUploadState({key:'heroVideo',filename,percent:100,phase:'done',message:'영상 재생 확인 완료 · 미리보기에 적용됨'});
  }catch(error){
   setUploadState({key:'heroVideo',filename,percent:100,phase:'error',message:(error as Error).message});
  }finally{setUploading(false)}
 };
 const uploadConfig=async(file:File|undefined,key:keyof Config)=>{
  if(!file)return;
  if(file.size>1000*1024*1024){const message='파일은 최대 1000MB(1GB)까지 업로드할 수 있습니다.';setUploadState({key,filename:file.name,percent:0,phase:'error',message});notify(message);return}
  if(key==='heroVideo'&&!(/^(video|image)\//.test(file.type)||/\.(mp4|webm|mov|m4v|jpg|jpeg|png|webp|gif|avif)$/i.test(file.name))){const message='메인 미디어는 이미지(JPG, PNG, WebP 등) 또는 영상(MP4, WebM, MOV, M4V)을 선택해 주세요.';setUploadState({key,filename:file.name,percent:0,phase:'error',message});notify(message);return}
  try{
   setUploading(true);setBusy(true);
   if(key==='heroVideo')setPendingHeroVideo(null);
   const isHeroVideo=key==='heroVideo'&&(file.type.startsWith('video/')||/\\.(mp4|mov|m4v|webm)$/i.test(file.name));
   setUploadState({key,filename:file.name,percent:0,phase:'uploading'});
   if(isHeroVideo){
    const local=await checkVideoPlayback(file,12000);
    if(local==='unsupported')throw Error('영상 코덱을 브라우저가 읽지 못합니다. H.264 비디오 + AAC 오디오의 MP4로 변환해 업로드해 주세요.');
    // Slow metadata alone should not produce an "applied" success message.
    if(local==='timeout')notify('영상 디코딩을 확인하는 중입니다. 고용량 파일은 미리보기 로딩이 지연될 수 있습니다.');
   }
   // Capture the loading poster from THIS uploaded movie, not the previous
   // site's old hero image. Run extraction while transfer is in progress.
   const posterTask=isHeroVideo?videoPoster(file).catch(()=>null):Promise.resolve(null);
   const url=await uploadFile(file,percent=>setUploadState(current=>current?.key===key?{...current,percent,phase:'uploading'}:current));
   if(isHeroVideo){
    setUploadState({key,filename:file.name,percent:100,phase:'verifying',message:'서버 업로드 완료 · 영상 디코딩 및 미리보기 확인 중'});
    const playback=await checkVideoPlayback(url,15000);
    if(playback==='unsupported')throw Error('업로드된 영상의 디코딩이 실패했습니다. MP4(H.264/AAC) 파일인지 확인하고 다시 업로드해 주세요. 기존 메인 미디어는 유지됩니다.');
    if(playback==='timeout'){
     setPendingHeroVideo(url);
     setUploadState({key,filename:file.name,percent:100,phase:'error',message:'서버 업로드는 완료됐지만 영상 준비가 지연됩니다. 잠시 후 아래 다시 확인 버튼을 누르세요. 기존 메인 미디어는 유지됩니다.'});
     notify('영상 업로드 후 첫 프레임을 아직 읽지 못했습니다. 기존 미디어는 유지되며, 다시 확인할 수 있습니다.');
     return;
    }
   }
   let matchingPoster='';
   if(isHeroVideo){
    const still=await posterTask;
    if(still){
     try{matchingPoster=await uploadFile(still)}
     catch{notify('영상은 정상 업로드됐습니다. 포스터 이미지 저장은 완료하지 못했지만 영상 재생에는 영향이 없습니다.')}
    }
   }
   setConfig(d=>({...d,[key]:url,...(key==='aboutImage'?{aboutMediaType:'image'}:{}),...((key==='heroVideo'||key==='heroPoster')?{heroMediaFit:'cover'}:{}),
     // The poster must be a frame from the SAME movie. Never reuse a stale
     // photo that visually flashes just before a new uploaded video plays.
     ...(isHeroVideo?{heroPoster:matchingPoster,autoplay:true}:{}),
   }));
   setUploadState({key,filename:file.name,percent:100,phase:'done',message:isHeroVideo?'업로드 및 영상 재생 확인 완료 · 미리보기에 적용됨':'업로드 완료 · 현재 미리보기에 적용됨'});
   notify(isHeroVideo?'영상 업로드와 재생 준비 확인 완료. 저장 · 적용을 눌러 최종 반영하세요.':key==='heroVideo'?'메인 미디어가 미리보기에 적용됐습니다. 저장을 눌러 최종 반영하세요.':'파일 업로드 완료. 현재 화면에 바로 적용했습니다.');
  }catch(error){
   const message=(error as Error).message||'업로드에 실패했습니다.';
   setUploadState({key,filename:file.name,percent:0,phase:'error',message});notify(message);
  }finally{setUploading(false);setBusy(false)}
 };
 const selectLayer=(value:VisualSelection)=>{setSelection(value);setTab('content');requestAnimationFrame(()=>targetFor(value)?.scrollIntoView({behavior:'smooth',block:value==='nav'?'start':'center'}))};
 const hiddenSections=sectionDefs.filter(s=>!isVisible(s.key)),toolbarBottom=!toolbarPos&&!!rect&&rect.top<112&&window.innerWidth>820,labelInside=!!rect&&rect.top<28;
 const selectedWorkTextWork=selectedWorkText?config.works.find(work=>work.id===selectedWorkText.id)||null:null;
 const selectedTeamTextMember=selectedTeamText?config.teamMembers.find(member=>member.id===selectedTeamText.id)||null:null;
 const selectedWorkTextStyleKey:TextStyleKey|undefined=selectedWorkText?(selectedWorkText.field==='title'?'workCardTitle':'workCardMeta'):undefined;
 const selectedTeamTextStyleKey:TextStyleKey|undefined=selectedTeamText?(selectedTeamText.field==='name'?'teamMemberName':selectedTeamText.field==='bio'?'teamMemberBio':'teamMemberRole'):undefined;
 const selectionLabel=tab==='settings'?'사이트 설정':selectedBlock?(selectedBlock.type==='slider'?'슬라이더':selectedBlock.type==='text'?'텍스트 블록':selectedBlock.type==='media'?'미디어 블록':'여백'):selectedDivider?'구분선':selectedTextDef?.label||(selectedWorkText?'작품 텍스트':selectedTeamText?'팀 텍스트':selectedWork?'작품 카드':sectionDefs.find(s=>s.key===sectionSelection)?.label);
 const toolbarStyle=toolbarPos?{'--ve-toolbar-x':toolbarPos.x+'px','--ve-toolbar-y':toolbarPos.y+'px'} as CSSProperties:undefined;
 const panelStyle=panelPos?{'--ve-panel-x':panelPos.x+'px','--ve-panel-y':panelPos.y+'px'} as CSSProperties:undefined;
 const quickStyleKey=textStyleKeyFor(selection),quickTextStyle=quickStyleKey?config.textStyles[quickStyleKey]:null;
 const quickToolbarStyle=rect&&typeof window!=='undefined'?{left:Math.max(8,Math.min(window.innerWidth-360,rect.left+rect.width/2-176)),top:Math.max(8,rect.top>74?rect.top-52:rect.bottom+10)} as CSSProperties:undefined;

 return <div className={'visual-editor-ui is-panel-'+panelSide+' is-workbench'} data-visual-editor="true">
  <EditSiteWorkbench page="home" config={config} selection={selection} onSelect={value=>selectLayer(value as VisualSelection)} onContent={()=>setTab('content')} onLayers={()=>setTab('layers')} onSettings={()=>setTab('settings')} onAddWork={addWork} onReorderSection={(from,to)=>reorderSection(from as SectionKey,to as SectionKey)} onReorderWork={reorderWork} onSave={onSave} onCancel={onCancel} onUndo={onUndo} canUndo={canUndo} busy={busy} onOpenAdmin={onOpenAdmin}/>
  <div style={toolbarStyle} className={'visual-editor-topbar '+(toolbarPos?'is-free ':toolbarBottom?'is-bottom ':'is-top ')} onPointerDown={e=>beginChromeDrag(e,'toolbar')}>
   <div className="visual-editor-title visual-editor-drag-zone" onDoubleClick={()=>resetChrome('toolbar')}><Grip size={14}/><Settings2 size={16}/><strong>VISUAL EDIT</strong><span>드래그 이동 · 화면에서 선택 · 크기 · 콘텐츠 · 스타일</span></div>
   <div className="visual-editor-toolbar-tools">
    <button type="button" className="visual-toolbar-icon" title="패널 위치 전환" onClick={()=>{setPanelPos(null);setPanelSide(v=>v==='right'?'left':'right')}}>{panelSide==='right'?<PanelLeft size={15}/>:<PanelRight size={15}/>}</button>
    <button type="button" className="visual-toolbar-icon" title={panelOpen?'패널 접기':'패널 열기'} onClick={()=>setPanelOpen(v=>!v)}><SlidersHorizontal size={15}/></button>
    <div className="visual-editor-actions"><button type="button" disabled={!canUndo} title="직전 수정 되돌리기 · Ctrl+Z" onClick={onUndo}><Undo2 size={15}/><span>되돌리기</span></button><button type="button" onClick={onOpenAdmin}>ADMIN</button><button type="button" onClick={onCancel}><X size={15}/><span>취소</span></button><button type="button" className="is-primary" disabled={busy} onClick={onSave}><Save size={15}/><span>{busy?'저장 중':'저장'}</span></button></div>
   </div>
  </div>

  {panelOpen?<aside style={panelStyle} className={'visual-editor-panel is-'+panelSide+(panelPos?' is-free':'')+(tab==='settings'?' is-full-settings':'')} onPointerDown={e=>beginChromeDrag(e,'panel')}>
   <div className="visual-panel-head"><div className="visual-panel-drag-zone" onDoubleClick={()=>resetChrome('panel')}><Grip size={13}/><span><strong>{selectionLabel}</strong><small>{selectedTextDef||selectedWorkText||selectedTeamText?'텍스트를 직접 선택해 편집 중':selectedBlock?'추가한 페이지 요소 편집 중':selectedDivider?'독립 구분선 레이어':'끌어서 패널 이동 · 더블클릭 위치 초기화'}</small></span></div><button type="button" aria-label="편집 패널 접기" onClick={()=>setPanelOpen(false)}><X size={15}/></button></div>
   <div className="visual-editor-primary-tabs" role="tablist" aria-label="Edit Site 주요 메뉴"><button className={tab==='layers'?'is-active':''} onClick={()=>setTab('layers')}><Layers3 size={14}/><span>페이지 구성</span></button><button className={tab==='content'||tab==='layout'||tab==='style'?'is-active':''} onClick={()=>setTab('content')}><Type size={14}/><span>현재 항목 전체 편집</span></button><button className={tab==='settings'?'is-active':''} onClick={()=>setTab('settings')}><Settings2 size={14}/><span>사이트 설정</span></button></div>
   {tab==='content'&&<div className="visual-complete-hint"><span>전체 편집</span><small>내용 · 배치 · 디자인을 한 화면에서 바로 수정</small></div>}
   {tab==='layers'&&<LayersPanel config={config} selection={selection} select={selectLayer} isVisible={isVisible} hide={removeSection} restore={restoreSection} reorderSection={reorderSection} moveWork={moveWork} reorderWork={reorderWork} patchWork={patchWork} deleteWork={deleteWork} addWork={addWork} addDivider={addDivider} addBlock={addBlock} patchBlock={patchBlock} deleteBlock={deleteBlock} patchDivider={patchDivider} deleteDivider={deleteDivider}/>}
   {tab==='content'&&<div className="visual-editor-context">
    {selectedBlock?<PageBlockContent block={selectedBlock} config={config} setConfig={setConfig} patch={value=>patchBlock(selectedBlock.id,value)} remove={()=>deleteBlock(selectedBlock.id)} upload={file=>uploadBlockMedia(selectedBlock.id,file)} uploading={uploading} busy={busy} setBusy={setBusy} notify={notify}/>:
     selectedDivider?<DividerContent divider={selectedDivider} patch={value=>patchDivider(selectedDivider.id,value)} remove={()=>deleteDivider(selectedDivider.id)}/>:
     selectedTextDef?<DirectTextEditor def={selectedTextDef} config={config} patch={patch} patchTextStyle={patchTextStyle}/>:
     selectedWorkText&&selectedWorkTextWork?<WorkTextEditor work={selectedWorkTextWork} field={selectedWorkText.field} patch={(key,value)=>patchWork(selectedWorkTextWork.id,key,value)} style={config.textStyles[selectedWorkTextStyleKey!]} patchStyle={value=>patchTextStyle(selectedWorkTextStyleKey!,value)}/>:
     selectedTeamText&&selectedTeamTextMember?<TeamTextEditor member={selectedTeamTextMember} field={selectedTeamText.field} patch={(key,value)=>patchTeam(selectedTeamTextMember.id,key,value)} style={config.textStyles[selectedTeamTextStyleKey!]} patchStyle={value=>patchTextStyle(selectedTeamTextStyleKey!,value)}/>:
     selectedWork?<WorkEditor work={selectedWork} patch={(key,value)=>patchWork(selectedWork.id,key,value)} onUpload={uploadWork} uploading={uploading} onDuplicate={()=>duplicateWork(selectedWork)} onDelete={()=>deleteWork(selectedWork.id)}/>:
     <><SectionEditor section={sectionSelection} config={config} patch={patch} patchTeam={patchTeam} reorder={reorderMenu} removeMenu={removeMenu} restoreMenu={restoreMenu} addWork={addWork} addDivider={addDivider} uploadConfig={uploadConfig} uploading={uploading} uploadState={uploadState} pendingHeroVideo={pendingHeroVideo} retryHeroPlayback={retryHeroPlayback}/><SectionCompleteExtras section={sectionSelection} config={config} patch={patch} patchTextStyle={patchTextStyle} uploadConfig={uploadConfig} uploading={uploading} remove={()=>removeSection(sectionSelection)}/></>}
   </div>}
   {tab==='layout'&&<div className="visual-editor-layout">
    {selectedBlock?<PageBlockLayout block={selectedBlock} patch={value=>patchBlock(selectedBlock.id,value)}/>:
     selectedDivider?<DividerLayout divider={selectedDivider} patch={value=>patchDivider(selectedDivider.id,value)}/>:
     selectedTextDef?.styleKey?<><div className="visual-editor-panel-head"><strong>텍스트 위치</strong><button type="button" onClick={()=>patchTextStyle(selectedTextDef.styleKey!,{x:selectedTextKey==='footerCopyright'?0:config.textStyles[selectedTextDef.styleKey!].x,y:0})}><RotateCcw size={13}/>Reset</button></div>{selectedTextKey==='footerCopyright'?<div className="visual-axis-lock"><span>가로 위치</span><b>화면 정중앙 고정</b></div>:<NumberField label="가로 위치" value={config.textStyles[selectedTextDef.styleKey].x} suffix="px" onChange={v=>patchTextStyle(selectedTextDef.styleKey!,{x:v})}/>}<NumberField label="세로 위치" value={config.textStyles[selectedTextDef.styleKey].y} suffix="px" onChange={v=>patchTextStyle(selectedTextDef.styleKey!,{y:v})}/></>:
     <><div className="visual-editor-panel-head"><strong>영역 위치·크기</strong>{meta&&!selectedWork&&<button type="button" onClick={resetLayout}><RotateCcw size={13}/>Reset</button>}</div>{meta&&!selectedWork&&!selectedWorkText&&!selectedTeamText&&<><div className="visual-axis-lock"><span>가로 위치</span><b>중앙 고정 · 0px</b><button onClick={()=>patch(meta.x,0 as never)}>중앙 복귀</button></div><NumberField label="세로 위치 · 제한 없음" value={Number(config[meta.y])} suffix="px" onChange={v=>patch(meta.y,v as never)}/><Range label="크기" value={Math.round(Number(config[meta.scale])*100)} min={65} max={145} step={1} suffix="%" onChange={v=>patch(meta.scale,(v/100) as never)}/><NumberField label="영역 높이 · 0 = 자동 · 제한 없음" value={config.sectionHeights?.[sectionSelection]||0} suffix="px" onChange={v=>patch('sectionHeights',{...(config.sectionHeights||{}),[sectionSelection]:Math.max(sectionSelection==='nav'?48:0,v)})}/></>}{sectionSelection==='work'&&!selectedWorkText&&<Range label="그리드 열 개수" value={config.columns} min={1} max={4} step={1} onChange={v=>patch('columns',v)}/>} {sectionSelection==='team'&&!selectedTeamText&&<><Range label="미디어 크기" value={config.teamMediaSize} min={120} max={520} step={1} suffix="px" onChange={v=>patch('teamMediaSize',v)}/><Range label="행 간격" value={config.teamRowGap} min={12} max={180} step={1} suffix="px" onChange={v=>patch('teamRowGap',v)}/></>}<Range label="전체 영역 간격" value={config.spacing} min={28} max={180} step={1} suffix="px" onChange={v=>patch('spacing',v)}/>{!selectedWork&&!selectedWorkText&&!selectedTeamText&&<button type="button" className="visual-editor-danger" onClick={()=>removeSection(sectionSelection)}><EyeOff size={14}/> 이 영역 숨기기</button>}</>}
   </div>}
   {tab==='style'&&(
    selectedBlock?<PageBlockStyle block={selectedBlock} patch={value=>patchBlock(selectedBlock.id,value)}/>:
    selectedDivider?<DividerStyle divider={selectedDivider} patch={value=>patchDivider(selectedDivider.id,value)}/>:
    selectedTextDef?.styleKey?<InspectorGroup title="글자 스타일" open><TextStyleControl label={selectedTextDef.label} value={config.textStyles[selectedTextDef.styleKey]} lockX={selectedTextKey==='footerCopyright'} onChange={v=>patchTextStyle(selectedTextDef.styleKey!,selectedTextKey==='footerCopyright'?{...v,x:0}:v)}/></InspectorGroup>:
    selectedWorkText&&selectedWorkTextStyleKey?<InspectorGroup title="카드 글자 스타일" open><TextStyleControl label={String(selectedWorkText.field)} value={config.textStyles[selectedWorkTextStyleKey]} onChange={v=>patchTextStyle(selectedWorkTextStyleKey,v)}/></InspectorGroup>:
    selectedTeamText&&selectedTeamTextStyleKey?<InspectorGroup title="팀 글자 스타일" open><TextStyleControl label={String(selectedTeamText.field)} value={config.textStyles[selectedTeamTextStyleKey]} onChange={v=>patchTextStyle(selectedTeamTextStyleKey,v)}/></InspectorGroup>:
    <StylePanel section={sectionSelection} config={config} patch={patch} patchTextStyle={patchTextStyle} uploadConfig={uploadConfig} uploading={uploading}/>
   )}
   {tab==='settings'&&<EditSiteFullSettings draft={config} setDraft={setConfig} busy={busy} setBusy={setBusy} notify={notify} onThemeChange={onThemeChange}/>}
   {tab!=='settings'&&hiddenSections.length>0&&<div className="visual-editor-restore"><span>숨긴 영역</span><div>{hiddenSections.map(s=><button type="button" key={s.key} onClick={()=>{restoreSection(s.key);selectLayer(s.key)}}><Plus size={13}/>{s.label}</button>)}</div></div>}
  </aside>:<button type="button" className={'visual-panel-reopen is-'+panelSide} onClick={()=>setPanelOpen(true)}><SlidersHorizontal size={16}/><span>편집 패널</span></button>}

  {tab!=='settings'&&rect&&quickTextStyle&&quickStyleKey&&<div className="visual-inline-text-toolbar" style={quickToolbarStyle}>
   <button type="button" className={inlineEditing===selection?'is-active':''} title="화면에서 바로 글자 입력 · Enter/F2" onMouseDown={e=>e.preventDefault()} onClick={()=>startInlineEdit(selection)}><Type size={13}/><span>입력</span></button>
   <FontPicker compact value={quickTextStyle.font} onChange={font=>patchTextStyle(quickStyleKey,{font})}/>
   <label className="visual-inline-color" title="글자 색상"><input type="color" value={quickTextStyle.color||'#ffffff'} onChange={e=>patchTextStyle(quickStyleKey,{color:e.target.value})}/><span style={{background:quickTextStyle.color||'#ffffff'}}/></label>
   <button type="button" title="글자 작게" onClick={()=>patchTextStyle(quickStyleKey,{size:Math.max(4,quickTextStyle.size-1)})}>−</button>
   <span className="visual-inline-size">{Math.round(quickTextStyle.size)}</span>
   <button type="button" title="글자 크게" onClick={()=>patchTextStyle(quickStyleKey,{size:Math.min(240,quickTextStyle.size+1)})}>+</button>
   <button type="button" className={(quickTextStyle.weight??500)>=650?'is-active':''} title="굵게 · Ctrl/Cmd+B" onClick={()=>patchTextStyle(quickStyleKey,{weight:(quickTextStyle.weight??500)>=650?400:700})}><b>B</b></button>
  </div>}
  {tab!=='settings'&&rect&&<div className={'visual-selection-frame is-panel-'+panelSide+(labelInside?' is-label-inside':'')+(selectedTextDef||selectedWorkText||selectedTeamText?' is-text-selection':'')+(selectedDivider?' is-divider-selection':'')+(selectedBlock?' is-block-selection':'')} style={{left:rect.left,top:rect.top,width:rect.width,height:rect.height}}><span className="visual-selection-label">{selectionLabel}</span>
   {selectedDivider&&<button type="button" className="visual-divider-drag-handle" aria-label="구분선 세로 이동" title="구분선을 위아래로 드래그" onPointerDown={beginDividerMove}><span/></button>}
   {meta&&!selectedWork&&!selectedDivider&&!selectedBlock&&!selectedTextDef&&!selectedWorkText&&!selectedTeamText&&<button type="button" className="visual-move-handle" aria-label="영역 세로 이동" title="세로 이동 · X축은 자동 중앙 고정" onPointerDown={beginMove}><Grip size={16}/></button>}
   {selectedTextDef?.styleKey&&<button type="button" className="visual-move-handle is-text" aria-label="텍스트 이동" title={verticalDragTextKeys.has(selectedTextKey)?'세로 이동 · 가로 위치 유지':'텍스트 자유 이동'} onPointerDown={beginTextMove}><Grip size={16}/></button>}
   {selectedTextDef?.styleKey&&<button type="button" className="visual-resize-handle is-text-size" aria-label="텍스트 크기 조절" title="드래그해서 글자 크기 조절" onPointerDown={beginTextResize}><Type size={14}/></button>}
   {meta&&!selectedWork&&!selectedDivider&&!selectedBlock&&!selectedTextDef&&!selectedWorkText&&!selectedTeamText&&<button type="button" className="visual-resize-handle" aria-label="영역 크기 조절" onPointerDown={beginResize}><Maximize2 size={15}/></button>}
   {meta&&!selectedWork&&!selectedDivider&&!selectedBlock&&!selectedTextDef&&!selectedWorkText&&!selectedTeamText&&<button type="button" className="visual-height-handle" aria-label="영역 높이 조절" title="위아래로 드래그해 영역 높이 조절" onPointerDown={beginHeightResize}><span/></button>}
  </div>}
 </div>;
}

function LayersPanel({config,selection,select,isVisible,hide,restore,reorderSection,moveWork,reorderWork,patchWork,deleteWork,addWork,addDivider,addBlock,patchBlock,deleteBlock,patchDivider,deleteDivider}:{config:Config;selection:VisualSelection;select:(v:VisualSelection)=>void;isVisible:(k:SectionKey)=>boolean;hide:(k:SectionKey)=>void;restore:(k:SectionKey)=>void;reorderSection:(from:SectionKey,to:SectionKey)=>void;moveWork:(id:string,dir:number)=>void;reorderWork:(from:string,to:string)=>void;patchWork:(id:string,key:keyof Work,value:Work[keyof Work])=>void;deleteWork:(id:string)=>void;addWork:()=>void;addDivider:()=>void;addBlock:(type:PageBlockType)=>void;patchBlock:(id:string,value:Partial<PageBlock>)=>void;deleteBlock:(id:string)=>void;patchDivider:(id:string,value:Partial<SectionDivider>)=>void;deleteDivider:(id:string)=>void}){
 const [dragSection,setDragSection]=useState<SectionKey|null>(null),[dragWork,setDragWork]=useState<string|null>(null),[adding,setAdding]=useState(false);
 const ordered=(config.sectionOrder||sectionDefs.map(s=>s.key)).map(key=>sectionDefs.find(s=>s.key===key)).filter(Boolean) as typeof sectionDefs;
 return <div className="visual-layers">
  <div className="visual-layer-heading"><span>페이지 영역</span><div><button className={adding?'is-active':''} onClick={()=>setAdding(value=>!value)}><Plus size={13}/>요소 추가</button><button onClick={addWork}><Plus size={13}/>작품</button></div></div>
  {adding&&<div className="visual-add-palette">
   <button onClick={()=>{addBlock('slider');setAdding(false)}}><span>▣</span><b>슬라이더</b><small>여러 이미지·영상</small></button>
   <button onClick={()=>{addBlock('text');setAdding(false)}}><span>T</span><b>텍스트</b><small>자유 문구 영역</small></button>
   <button onClick={()=>{addBlock('media');setAdding(false)}}><span>◫</span><b>미디어</b><small>이미지·영상·3D</small></button>
   <button onClick={()=>{addBlock('spacer');setAdding(false)}}><span>↕</span><b>여백</b><small>간격 조절</small></button>
   <button onClick={()=>{addDivider();setAdding(false)}}><span>―</span><b>구분선</b><small>선 추가</small></button>
  </div>}
  <p className="visual-help">큰 영역 순서를 관리하고 필요한 요소를 원하는 영역 뒤에 추가할 수 있습니다. 추가한 슬라이더·텍스트·미디어·여백·구분선은 각각 선택해 세부 편집하거나 삭제할 수 있습니다.</p>
  {ordered.map(section=><div className={'visual-layer-group '+(dragSection===section.key?'is-dragging':'')} key={section.key} onDragOver={e=>{if(dragSection)e.preventDefault()}} onDrop={e=>{if(dragSection){e.preventDefault();reorderSection(dragSection,section.key);setDragSection(null)}}}>
   <div className={'visual-layer-row '+(selection===section.key?'is-active':'')}><button type="button" draggable className="visual-layer-grip" title="드래그해서 섹션 순서 이동" onDragStart={e=>{setDragSection(section.key);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',section.key)}} onDragEnd={()=>setDragSection(null)}><Grip size={13}/></button><button className="visual-layer-select" onClick={()=>select(section.key)}><span>{section.label}</span><small>{isVisible(section.key)?'VISIBLE':'HIDDEN'}</small></button><button className="visual-layer-icon" aria-label={isVisible(section.key)?'숨기기':'표시하기'} onClick={()=>isVisible(section.key)?hide(section.key):restore(section.key)}>{isVisible(section.key)?<Eye size={14}/>:<EyeOff size={14}/>}</button></div>
   {config.sectionDividers.filter(divider=>divider.after===section.key).map(divider=><div className={'visual-layer-row is-child is-divider '+(selection===`divider:${divider.id}`?'is-active':'')} key={divider.id}><span className="visual-layer-grip visual-divider-swatch" aria-hidden="true"><span/></span><button className="visual-layer-select" onClick={()=>select(`divider:${divider.id}`)}><span>구분선</span><small>{divider.visible?'VISIBLE':'HIDDEN'}</small></button><div className="visual-layer-mini-actions"><button onClick={()=>patchDivider(divider.id,{visible:!divider.visible})}>{divider.visible?<Eye size={12}/>:<EyeOff size={12}/>}</button><button className="is-danger" onClick={()=>deleteDivider(divider.id)}><Trash2 size={12}/></button></div></div>)}
   {(config.pageBlocks||[]).filter(block=>block.after===section.key).map(block=><div className={'visual-layer-row is-child is-page-block '+(selection===`block:${block.id}`?'is-active':'')} key={block.id}><span className="visual-layer-grip visual-block-swatch" aria-hidden="true">{block.type==='slider'?'▣':block.type==='text'?'T':block.type==='media'?'◫':'↕'}</span><button className="visual-layer-select" onClick={()=>select(`block:${block.id}`)}><span>{block.title||({slider:'슬라이더',text:'텍스트',media:'미디어',spacer:'여백'} as Record<PageBlockType,string>)[block.type]}</span><small>{block.visible?'VISIBLE':'HIDDEN'}</small></button><div className="visual-layer-mini-actions"><button onClick={()=>patchBlock(block.id,{visible:!block.visible})}>{block.visible?<Eye size={12}/>:<EyeOff size={12}/>}</button><button className="is-danger" onClick={()=>deleteBlock(block.id)}><Trash2 size={12}/></button></div></div>)}
   {section.key==='work'&&<details className="visual-layer-details"><summary><span>작품 세부 관리</span><small>{config.works.length}개</small></summary><div className="visual-layer-children">{config.works.map((work,index)=><div className={'visual-layer-row is-child '+(selection===`work:${work.id}`?'is-active':'')+(dragWork===work.id?' is-dragging':'')} key={work.id} onDragOver={e=>{if(dragWork){e.preventDefault();e.stopPropagation()}}} onDrop={e=>{if(dragWork){e.preventDefault();e.stopPropagation();reorderWork(dragWork,work.id);setDragWork(null)}}}><button type="button" draggable className="visual-layer-grip" title="드래그해서 작품 순서 이동" onDragStart={e=>{e.stopPropagation();setDragWork(work.id);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',work.id)}} onDragEnd={()=>setDragWork(null)}><Grip size={12}/></button><button className="visual-layer-select" onClick={()=>select(`work:${work.id}`)}><span>{work.title||'Untitled'}</span><small>{work.visible?'LIVE':'DRAFT'}</small></button><div className="visual-layer-mini-actions"><button disabled={index===0} onClick={()=>moveWork(work.id,-1)}><ArrowUp size={12}/></button><button disabled={index===config.works.length-1} onClick={()=>moveWork(work.id,1)}><ArrowDown size={12}/></button><button onClick={()=>patchWork(work.id,'visible',!work.visible)}>{work.visible?<Eye size={12}/>:<EyeOff size={12}/>}</button><button className="is-danger" onClick={()=>deleteWork(work.id)}><Trash2 size={12}/></button></div></div>)}</div></details>}
  </div>)}
 </div>;
}
function Range({label,value,min,max,step,suffix='',onChange}:{label:string;value:number;min:number;max:number;step:number;suffix?:string;onChange:(v:number)=>void}){return <label className="visual-range"><span>{label}<b>{Math.round(value*100)/100}{suffix}</b></span><input type="range" value={value} min={min} max={max} step={step} onChange={e=>onChange(Number(e.target.value))}/></label>}
function NumberField({label,value,suffix='',onChange}:{label:string;value:number;suffix?:string;onChange:(v:number)=>void}){return <label className="visual-number-field"><span>{label}<b>{suffix}</b></span><input type="number" value={Number.isFinite(value)?value:0} step="1" onChange={e=>{const next=Number(e.target.value);if(Number.isFinite(next))onChange(next)}}/></label>}
function TextField({label,value,onChange,multi=false}:{label:string;value:string;onChange:(v:string)=>void;multi?:boolean}){return <label className="visual-field"><span>{label}</span>{multi?<textarea value={value} onChange={e=>onChange(e.target.value)}/>:<input value={value} onChange={e=>onChange(e.target.value)}/>}</label>}
function FileField({label,accept,disabled,value,onFile,onClear}:{label:string;accept:string;disabled:boolean;value?:string;onFile:(file:File|undefined)=>void;onClear?:()=>void}){return <label className="visual-upload"><span>{label}</span><input type="file" accept={accept} disabled={disabled} onChange={e=>{const file=e.target.files?.[0];e.currentTarget.value='';onFile(file)}}/>{value&&<span className="visual-upload-state">등록됨 {onClear&&<button type="button" onClick={e=>{e.preventDefault();onClear()}}>제거</button>}</span>}</label>}
function UploadStateView({state}:{state:UploadState}){return <div className={'visual-upload-progress is-'+state.phase} role="status"><div><strong>{state.phase==='uploading'?'업로드 중':state.phase==='verifying'?'영상 확인 중':state.phase==='done'?'적용 준비 완료':'업로드 실패'}</strong><span>{state.filename}</span><b>{state.phase==='uploading'?state.percent+'%':state.phase==='verifying'?'확인 중':state.phase==='done'?'100%':'ERROR'}</b></div>{(state.phase==='uploading'||state.phase==='verifying')&&<span className="visual-upload-progress-track"><i style={{width:state.percent+'%'}}/></span>}{state.message&&<small>{state.message}</small>}</div>}

function InspectorGroup({title,children,open=false,meta}:{title:string;children:React.ReactNode;open?:boolean;meta?:string}){
 return <details className="visual-inspector-group" open={open}><summary><span><strong>{title}</strong>{meta&&<small>{meta}</small>}</span><b aria-hidden="true">⌄</b></summary><div className="visual-inspector-body">{children}</div></details>;
}

function DirectTextEditor({def,config,patch,patchTextStyle}:{def:DirectTextDef;config:Config;patch:<K extends keyof Config>(key:K,value:Config[K])=>void;patchTextStyle:(key:TextStyleKey,value:TextPatch)=>void}){
 const value=String(config[def.configKey]??'');
 return <><div className="visual-editor-panel-head"><h3>{def.label}</h3><span className="visual-direct-badge">직접 편집</span></div><TextField label="텍스트" value={value} multi={!!def.multi} onChange={v=>patch(def.configKey,v as never)}/>{def.styleKey&&<InspectorGroup title="글자 디자인" open meta="글꼴 · 색상 · 크기 · 굵기 · 자간"><TextStyleControl label={def.label} value={config.textStyles[def.styleKey]} lockX={def.styleKey==='footerCopyright'} onChange={v=>patchTextStyle(def.styleKey!,def.styleKey==='footerCopyright'?{...v,x:0}:v)}/></InspectorGroup>}</>;
}

function WorkTextEditor({work,field,patch,style,patchStyle}:{work:Work;field:keyof Work;patch:(key:keyof Work,value:Work[keyof Work])=>void;style:Config['textStyles'][TextStyleKey];patchStyle:(value:TextPatch)=>void}){
 const label=field==='title'?'Title':field==='category'?'Category':field==='role'?'Role':field==='year'?'Year':String(field);
 return <><div className="visual-editor-panel-head"><h3>{label}</h3><span className="visual-direct-badge">작품 텍스트</span></div><TextField label={label} value={String(work[field]??'')} multi={field==='description'} onChange={v=>patch(field,v as never)}/><InspectorGroup title="Shared card typography" open meta="이 스타일은 같은 종류의 카드 글자에 적용"><TextStyleControl label={label} value={style} onChange={patchStyle}/></InspectorGroup></>;
}

function TeamTextEditor({member,field,patch,style,patchStyle}:{member:Config['teamMembers'][number];field:string;patch:(key:string,value:unknown)=>void;style:Config['textStyles'][TextStyleKey];patchStyle:(value:TextPatch)=>void}){
 const label=field==='name'?'Member name':field==='bio'?'Bio':'Role';
 return <><div className="visual-editor-panel-head"><h3>{label}</h3><span className="visual-direct-badge">팀 텍스트</span></div><TextField label={label} value={String((member as any)[field]??'')} multi={field==='bio'} onChange={v=>patch(field,v)}/><InspectorGroup title="Shared team typography" open><TextStyleControl label={label} value={style} onChange={patchStyle}/></InspectorGroup></>;
}

function PageBlockContent({block,config,setConfig,patch,remove,upload,uploading,busy,setBusy,notify}:{block:PageBlock;config:Config;setConfig:Dispatch<SetStateAction<Config>>;patch:(value:Partial<PageBlock>)=>void;remove:()=>void;upload:(file?:File)=>void;uploading:boolean;busy:boolean;setBusy:(value:boolean)=>void;notify:(value:string)=>void}){
 const label=block.type==='slider'?'슬라이더':block.type==='text'?'텍스트 블록':block.type==='media'?'미디어 블록':'여백';
 const patternOptions=[['none','없음'],['dots','도트'],['grid','그리드'],['diagonal','사선'],['checker','체커'],['lines','라인'],['rings','링']];
 return <div className="visual-complete-editor">
  <div className="visual-editor-panel-head"><h3>{label}</h3><button type="button" className="is-danger" onClick={remove}><Trash2 size={13}/>삭제</button></div>
  <InspectorGroup title="기본" open>
   <label className="visual-field"><span>배치 위치</span><select value={block.after} onChange={e=>patch({after:e.target.value as SiteSectionKey})}>{sectionDefs.map(section=><option key={section.key} value={section.key}>{section.label} 뒤</option>)}</select></label>
   <label className="visual-toggle"><span>화면에 표시</span><input type="checkbox" checked={block.visible} onChange={e=>patch({visible:e.target.checked})}/></label>
   {block.type==='slider'&&<><TextField label="슬라이더 제목 · 비우면 숨김" value={block.title} onChange={title=>patch({title})}/><p className="visual-help">미디어 업로드·순서·삭제까지 이 창에서 바로 관리합니다.</p><div className="visual-block-library"><MediaLibrary kind="focusItems" draft={config} setDraft={setConfig} busy={busy} setBusy={setBusy} notify={notify}/></div></>}
   {block.type==='text'&&<><TextField label="제목" value={block.title} onChange={title=>patch({title})}/><TextField label="본문" value={block.text} multi onChange={text=>patch({text})}/></>}
   {block.type==='media'&&<><TextField label="제목 · 비우면 숨김" value={block.title} onChange={title=>patch({title})}/><FileField label="이미지 · 영상 · 3D 파일" accept="image/*,video/*,.glb,.gltf" disabled={uploading} value={block.media} onFile={upload} onClear={()=>patch({media:''})}/><label className="visual-toggle"><span>영상 자동 재생</span><input type="checkbox" checked={block.autoplay} onChange={e=>patch({autoplay:e.target.checked})}/></label></>}
  </InspectorGroup>
  <InspectorGroup title="배치 · 크기" open>
   {block.type!=='spacer'&&<Range label="너비" value={block.width} min={20} max={100} step={1} suffix="%" onChange={width=>patch({width})}/>}
   <Range label={block.type==='spacer'?'여백 높이':'영역 높이'} value={block.height} min={block.type==='spacer'?24:180} max={1400} step={block.type==='spacer'?4:10} suffix="px" onChange={height=>patch({height})}/>
   <NumberField label="세로 위치 · 제한 없음" value={block.offsetY} suffix="px" onChange={offsetY=>patch({offsetY})}/>
   {block.type==='slider'&&<Range label="카드 간격" value={block.gap} min={0} max={80} step={1} suffix="px" onChange={gap=>patch({gap})}/>}
   {block.type==='media'&&<><label className="visual-field"><span>미디어 맞춤</span><select value={block.mediaFit} onChange={e=>patch({mediaFit:e.target.value as PageBlock['mediaFit']})}><option value="contain">전체 보기 · 잘림 없음</option><option value="cover">영역 채우기 · 일부 잘림</option></select></label><Range label="가로 초점" value={block.mediaPositionX} min={0} max={100} step={1} suffix="%" onChange={mediaPositionX=>patch({mediaPositionX})}/><Range label="세로 초점" value={block.mediaPositionY} min={0} max={100} step={1} suffix="%" onChange={mediaPositionY=>patch({mediaPositionY})}/></>}
   <button type="button" className="visual-secondary-button" onClick={()=>patch({offsetY:0,width:100,...(block.type==='media'?{mediaPositionX:50,mediaPositionY:50,mediaFit:'contain' as const}:{})})}><RotateCcw size={13}/> 배치 초기화</button>
  </InspectorGroup>
  {block.type!=='spacer'&&<InspectorGroup title="디자인" open>
   <Range label="모서리" value={block.radius} min={0} max={80} step={1} suffix="px" onChange={radius=>patch({radius})}/>
   {block.type==='text'&&<><Range label="글자 크기" value={block.fontSize} min={8} max={180} step={1} suffix="px" onChange={fontSize=>patch({fontSize})}/><label className="visual-field"><span>정렬</span><select value={block.align} onChange={e=>patch({align:e.target.value as PageBlock['align']})}><option value="left">왼쪽</option><option value="center">가운데</option><option value="right">오른쪽</option></select></label><label className="visual-color"><span>글자 색상</span><input type="color" value={block.color||'#ffffff'} onChange={e=>patch({color:e.target.value})}/><b>{block.color||'AUTO'}</b></label></>}
   <label className="visual-color"><span>배경색</span><input type="color" value={block.background||'#000000'} onChange={e=>patch({background:e.target.value})}/><b>{block.background||'AUTO'}</b></label><button type="button" className="visual-secondary-button" onClick={()=>patch({background:''})}>배경 자동 / 투명</button>
  </InspectorGroup>}
  {block.type==='media'&&<><InspectorGroup title="그라데이션" open><label className="visual-toggle"><span>그라데이션 사용</span><input type="checkbox" checked={block.fadeEnabled} onChange={e=>patch({fadeEnabled:e.target.checked})}/></label>{block.fadeEnabled&&<><Range label="상단 크기" value={block.fadeTopSize} min={0} max={50} step={1} suffix="%" onChange={fadeTopSize=>patch({fadeTopSize})}/><Range label="하단 크기" value={block.fadeBottomSize} min={0} max={50} step={1} suffix="%" onChange={fadeBottomSize=>patch({fadeBottomSize})}/><Range label="농도" value={block.fadeDensity} min={0} max={100} step={1} suffix="%" onChange={fadeDensity=>patch({fadeDensity})}/><Range label="불투명도" value={block.fadeOpacity} min={0} max={100} step={1} suffix="%" onChange={fadeOpacity=>patch({fadeOpacity})}/><Range label="블러" value={block.fadeBlur} min={0} max={60} step={1} suffix="px" onChange={fadeBlur=>patch({fadeBlur})}/></>}</InspectorGroup>
  <InspectorGroup title="패턴 오버레이" open><label className="visual-field"><span>패턴</span><select value={block.pattern} onChange={e=>patch({pattern:e.target.value})}>{patternOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>{block.pattern!=='none'&&<><label className="visual-color"><span>패턴 색상</span><input type="color" value={block.patternColor} onChange={e=>patch({patternColor:e.target.value})}/><b>{block.patternColor}</b></label><Range label="패턴 크기" value={block.patternSize} min={4} max={160} step={1} suffix="px" onChange={patternSize=>patch({patternSize})}/><Range label="패턴 불투명도" value={block.patternOpacity} min={0} max={100} step={1} suffix="%" onChange={patternOpacity=>patch({patternOpacity})}/></>}</InspectorGroup></>}
 </div>;
}
function PageBlockLayout({block,patch}:{block:PageBlock;patch:(value:Partial<PageBlock>)=>void}){
 return <><div className="visual-editor-panel-head"><strong>{block.type==='spacer'?'여백 크기':'요소 위치·크기'}</strong><button type="button" onClick={()=>patch({offsetY:0,width:100})}><RotateCcw size={13}/>Reset</button></div>
  {block.type!=='spacer'&&<Range label="너비" value={block.width} min={20} max={100} step={1} suffix="%" onChange={width=>patch({width})}/>}
  <Range label={block.type==='spacer'?'여백 높이':'영역 높이'} value={block.height} min={block.type==='spacer'?24:180} max={1200} step={block.type==='spacer'?4:10} suffix="px" onChange={height=>patch({height})}/>
  <NumberField label="세로 위치 · 제한 없음" value={block.offsetY} suffix="px" onChange={offsetY=>patch({offsetY})}/>
  {block.type==='slider'&&<Range label="카드 간격" value={block.gap} min={0} max={80} step={1} suffix="px" onChange={gap=>patch({gap})}/>}
 </>;
}
function PageBlockStyle({block,patch}:{block:PageBlock;patch:(value:Partial<PageBlock>)=>void}){
 return <><div className="visual-editor-panel-head"><strong>요소 디자인</strong></div>
  {block.type!=='spacer'&&<Range label="모서리" value={block.radius} min={0} max={80} step={1} suffix="px" onChange={radius=>patch({radius})}/>}
  {block.type==='text'&&<><Range label="글자 크기" value={block.fontSize} min={8} max={180} step={1} suffix="px" onChange={fontSize=>patch({fontSize})}/><label className="visual-field"><span>정렬</span><select value={block.align} onChange={e=>patch({align:e.target.value as PageBlock['align']})}><option value="left">왼쪽</option><option value="center">가운데</option><option value="right">오른쪽</option></select></label><label className="visual-color"><span>글자 색상</span><input type="color" value={block.color||'#ffffff'} onChange={e=>patch({color:e.target.value})}/><b>{block.color||'AUTO'}</b></label></>}
  {block.type!=='spacer'&&<><label className="visual-color"><span>배경색</span><input type="color" value={block.background||'#000000'} onChange={e=>patch({background:e.target.value})}/><b>{block.background||'AUTO'}</b></label><button type="button" className="visual-secondary-button" onClick={()=>patch({background:''})}>배경 자동 / 투명</button></>}
 </>;
}

function DividerContent({divider,patch,remove}:{divider:SectionDivider;patch:(value:Partial<SectionDivider>)=>void;remove:()=>void}){
 return <div className="visual-complete-editor"><div className="visual-editor-panel-head"><h3>구분선</h3><button type="button" className="is-danger" onClick={remove}><Trash2 size={13}/>삭제</button></div>
  <InspectorGroup title="기본" open><label className="visual-field"><span>배치할 영역</span><select value={divider.after} onChange={e=>patch({after:e.target.value as SiteSectionKey})}>{sectionDefs.map(section=><option key={section.key} value={section.key}>{section.label} 뒤</option>)}</select></label><label className="visual-toggle"><span>구분선 표시</span><input type="checkbox" checked={divider.visible} onChange={e=>patch({visible:e.target.checked})}/></label></InspectorGroup>
  <InspectorGroup title="배치 · 크기" open><NumberField label="세로 위치 · 제한 없음" value={divider.offsetY||0} suffix="px" onChange={v=>patch({offsetY:v})}/><Range label="너비" value={divider.width} min={10} max={100} step={1} suffix="%" onChange={v=>patch({width:v})}/><Range label="좌우 여백" value={divider.inset} min={0} max={240} step={1} suffix="px" onChange={v=>patch({inset:v})}/><Range label="위 여백" value={divider.marginTop} min={0} max={240} step={1} suffix="px" onChange={v=>patch({marginTop:v})}/><Range label="아래 여백" value={divider.marginBottom} min={0} max={240} step={1} suffix="px" onChange={v=>patch({marginBottom:v})}/><button type="button" className="visual-secondary-button" onClick={()=>patch({offsetY:0,inset:0,marginTop:0,marginBottom:0,width:100})}><RotateCcw size={13}/> 배치 초기화</button></InspectorGroup>
  <InspectorGroup title="디자인" open><Range label="두께" value={divider.thickness} min={.5} max={12} step={.5} suffix="px" onChange={v=>patch({thickness:v})}/><Range label="불투명도" value={divider.opacity} min={0} max={100} step={1} suffix="%" onChange={v=>patch({opacity:v})}/><label className="visual-color"><span>색상</span><input type="color" value={divider.color||'#ffffff'} onChange={e=>patch({color:e.target.value})}/><b>{divider.color||'AUTO'}</b></label><button type="button" className="visual-secondary-button" onClick={()=>patch({color:''})}>색상 자동</button></InspectorGroup>
 </div>;
}
function DividerLayout({divider,patch}:{divider:SectionDivider;patch:(value:Partial<SectionDivider>)=>void}){
 return <><div className="visual-editor-panel-head"><strong>구분선 위치·크기</strong></div><NumberField label="세로 위치 · 제한 없음" value={divider.offsetY||0} suffix="px" onChange={v=>patch({offsetY:v})}/><Range label="너비" value={divider.width} min={10} max={100} step={1} suffix="%" onChange={v=>patch({width:v})}/><Range label="좌우 여백" value={divider.inset} min={0} max={240} step={1} suffix="px" onChange={v=>patch({inset:v})}/><Range label="위 여백" value={divider.marginTop} min={0} max={240} step={1} suffix="px" onChange={v=>patch({marginTop:v})}/><Range label="아래 여백" value={divider.marginBottom} min={0} max={240} step={1} suffix="px" onChange={v=>patch({marginBottom:v})}/><button type="button" className="visual-secondary-button" onClick={()=>patch({offsetY:0})}>세로 위치 초기화</button></>;
}
function DividerStyle({divider,patch}:{divider:SectionDivider;patch:(value:Partial<SectionDivider>)=>void}){
 return <InspectorGroup title="구분선 스타일" open><Range label="두께" value={divider.thickness} min={.5} max={12} step={.5} suffix="px" onChange={v=>patch({thickness:v})}/><Range label="불투명도" value={divider.opacity} min={0} max={100} step={1} suffix="%" onChange={v=>patch({opacity:v})}/><label className="visual-color"><span>색상</span><input type="color" value={divider.color||'#ffffff'} onChange={e=>patch({color:e.target.value})}/><b>{divider.color||'AUTO'}</b></label><button type="button" className="visual-secondary-button" onClick={()=>patch({color:''})}>색상 자동</button></InspectorGroup>;
}


function SectionCompleteExtras({section,config,patch,patchTextStyle,uploadConfig,uploading,remove}:{section:SectionKey;config:Config;patch:<K extends keyof Config>(key:K,value:Config[K])=>void;patchTextStyle:(key:TextStyleKey,value:TextPatch)=>void;uploadConfig:(file:File|undefined,key:keyof Config)=>void;uploading:boolean;remove:()=>void}){
 const meta=section==='nav'?{x:'navOffsetX',y:'navOffsetY',scale:'navScale'} as const:section==='hero'?{x:'heroOffsetX',y:'heroOffsetY',scale:'heroScale'} as const:section==='work'?{x:'workOffsetX',y:'workOffsetY',scale:'workScale'} as const:section==='about'?{x:'aboutOffsetX',y:'aboutOffsetY',scale:'aboutScale'} as const:section==='team'?{x:'teamOffsetX',y:'teamOffsetY',scale:'teamScale'} as const:{x:'footerOffsetX',y:'footerOffsetY',scale:'footerScale'} as const;
 const textGroups:Partial<Record<SectionKey,{key:TextStyleKey;label:string}[]>>={
  nav:[{key:'navBrand',label:'브랜드 이름'},{key:'navMenu',label:'메뉴'}],
  hero:[{key:'heroEyebrow',label:'상단 보조 문구'},{key:'heroSubtitle',label:'하단 문구'}],
  work:[{key:'workKicker',label:'작은 제목'},{key:'workHeadline',label:'큰 제목'},{key:'workAside',label:'보조 문구'},{key:'workCardTitle',label:'작품 제목'},{key:'workCardMeta',label:'작품 정보'}],
  about:[{key:'aboutKicker',label:'작은 제목'},{key:'aboutHeadline',label:'큰 제목'},{key:'aboutBody',label:'본문'},{key:'aboutDisciplines',label:'분야 목록'}],
  team:[{key:'teamKicker',label:'작은 제목'},{key:'teamHeadline',label:'큰 제목'},{key:'teamMemberName',label:'팀원 이름'},{key:'teamMemberBio',label:'팀원 소개'},{key:'teamView',label:'보기 버튼'}],
  footer:[{key:'footerCopyright',label:'저작권'},{key:'footerAdmin',label:'관리자 문구'}]
 };
 const patterns=[['none','없음'],['dots','도트'],['grid','그리드'],['diagonal','사선'],['checker','체커'],['lines','라인'],['rings','링']];
 return <div className="visual-complete-extras">
  <InspectorGroup title="배치 · 크기" open><NumberField label="세로 위치 · 제한 없음" value={Number(config[meta.y])} suffix="px" onChange={v=>patch(meta.y,v as never)}/><Range label={section==='hero'?'메인 미디어 크기':'크기'} value={Math.round(Number(config[meta.scale])*100)} min={55} max={160} step={1} suffix="%" onChange={v=>patch(meta.scale,(v/100) as never)}/><Range label="영역 높이 · 0 = 자동" value={config.sectionHeights?.[section]||0} min={0} max={1800} step={10} suffix="px" onChange={v=>patch('sectionHeights',{...config.sectionHeights,[section]:v})}/>{section==='hero'&&<p className="visual-help">여기의 크기는 메인 이미지/영상에만 적용됩니다. 아래 VIIVII sara 움직이는 로고 크기와는 연결되지 않습니다.</p>}<button type="button" className="visual-secondary-button" onClick={()=>{patch(meta.x,0 as never);patch(meta.y,0 as never);patch(meta.scale,1 as never)}}><RotateCcw size={13}/> 위치·크기 초기화</button></InspectorGroup>
  {section==='hero'&&<><InspectorGroup title="메인 미디어 표시" open><label className="visual-field"><span>프레임 비율</span><select value={config.heroMediaRatio||'fill'} onChange={e=>patch('heroMediaRatio',e.target.value as Config['heroMediaRatio'])}><option value="fill">화면 채우기 · 현재 기본</option><option value="16:9">16:9</option><option value="4:3">4:3</option><option value="3:2">3:2</option><option value="4:5">4:5</option><option value="1:1">1:1</option><option value="9:16">9:16</option></select></label><label className="visual-field"><span>미디어 맞춤</span><select value={config.heroMediaFit} onChange={e=>patch('heroMediaFit',e.target.value as Config['heroMediaFit'])}><option value="cover">영역 채우기 · 일부 잘림</option><option value="contain">전체 보기 · 잘림 없음</option></select></label><Range label="가로 초점" value={config.heroMediaPositionX} min={0} max={100} step={1} suffix="%" onChange={v=>patch('heroMediaPositionX',v)}/><Range label="세로 초점" value={config.heroMediaPositionY} min={0} max={100} step={1} suffix="%" onChange={v=>patch('heroMediaPositionY',v)}/><button type="button" className="visual-secondary-button" onClick={()=>{patch('heroMediaRatio','fill');patch('heroMediaFit','cover');patch('heroMediaPositionX',50);patch('heroMediaPositionY',50);patch('heroScale',1)}}>미디어 표시 초기화</button></InspectorGroup>
  <InspectorGroup title="메인 미디어 그라데이션" open><label className="visual-toggle"><span>그라데이션 사용</span><input type="checkbox" checked={config.heroFadeEnabled} onChange={e=>patch('heroFadeEnabled',e.target.checked)}/></label>{config.heroFadeEnabled&&<><Range label="상단 크기" value={config.heroFadeTopSize} min={0} max={50} step={1} suffix="%" onChange={v=>patch('heroFadeTopSize',v)}/><Range label="하단 크기" value={config.heroFadeBottomSize} min={0} max={50} step={1} suffix="%" onChange={v=>patch('heroFadeBottomSize',v)}/><Range label="농도" value={config.heroFadeDensity} min={0} max={100} step={1} suffix="%" onChange={v=>patch('heroFadeDensity',v)}/><Range label="불투명도" value={config.heroFadeOpacity} min={0} max={100} step={1} suffix="%" onChange={v=>patch('heroFadeOpacity',v)}/><Range label="블러" value={config.heroFadeBlur} min={0} max={60} step={1} suffix="px" onChange={v=>patch('heroFadeBlur',v)}/></>}</InspectorGroup>
  <InspectorGroup title="메인 미디어 패턴" open><label className="visual-field"><span>패턴</span><select value={config.heroPattern} onChange={e=>patch('heroPattern',e.target.value)}>{patterns.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>{config.heroPattern!=='none'&&<><label className="visual-color"><span>색상</span><input type="color" value={config.heroPatternColor} onChange={e=>patch('heroPatternColor',e.target.value)}/><b>{config.heroPatternColor}</b></label><Range label="크기" value={config.heroPatternSize} min={4} max={160} step={1} suffix="px" onChange={v=>patch('heroPatternSize',v)}/><Range label="불투명도" value={config.heroPatternOpacity} min={0} max={100} step={1} suffix="%" onChange={v=>patch('heroPatternOpacity',v)}/></>}</InspectorGroup></>}
  {!!textGroups[section]?.length&&<InspectorGroup title="글자 디자인" open meta="현재 영역의 모든 텍스트">{textGroups[section]!.map(item=><TextStyleControl key={item.key} label={item.label} value={config.textStyles[item.key]} onChange={v=>patchTextStyle(item.key,v)}/>)}</InspectorGroup>}
  <button type="button" className="visual-editor-danger" onClick={remove}><EyeOff size={14}/> 이 영역 숨기기</button>
 </div>;
}

function SectionEditor({section,config,patch,patchTeam,reorder,removeMenu,restoreMenu,addWork,addDivider,uploadConfig,uploading,uploadState,pendingHeroVideo,retryHeroPlayback}:{section:SectionKey;config:Config;patch:<K extends keyof Config>(key:K,value:Config[K])=>void;patchTeam:(id:string,key:string,value:unknown)=>void;reorder:(item:NavItemKey,dir:number)=>void;removeMenu:(item:NavItemKey)=>void;restoreMenu:(item:NavItemKey)=>void;addWork:()=>void;addDivider:()=>void;uploadConfig:(file:File|undefined,key:keyof Config)=>void;uploading:boolean;uploadState:UploadState|null;pendingHeroVideo:string|null;retryHeroPlayback:()=>Promise<void>}){
 const missing=(['work','about','team','contact'] as NavItemKey[]).filter(x=>!config.navOrder.includes(x));
 const dividerButton=<button type="button" className="visual-secondary-button" onClick={addDivider}><Plus size={13}/> 이 영역 뒤에 구분선 추가</button>;
 if(section==='nav')return <><div className="visual-editor-panel-head"><h3>상단 메뉴</h3></div><InspectorGroup title="브랜드" open><TextField label="브랜드 이름" value={config.name} onChange={v=>patch('name',v)}/><FileField label="상단 로고" accept="image/*" disabled={uploading} value={config.logo} onFile={f=>uploadConfig(f,'logo')} onClear={()=>patch('logo','')}/></InspectorGroup><InspectorGroup title="메뉴" open meta="순서 · 이름 · 삭제"><div className="visual-menu-order">{config.navOrder.map((item,index)=><div key={item}><input value={String(config[labelKeys[item]])} onChange={e=>patch(labelKeys[item],e.target.value)}/><div><button disabled={index===0} onClick={()=>reorder(item,-1)}><ArrowUp size={13}/></button><button disabled={index===config.navOrder.length-1} onClick={()=>reorder(item,1)}><ArrowDown size={13}/></button><button className="is-danger" onClick={()=>removeMenu(item)}><Trash2 size={13}/></button></div></div>)}{missing.length>0&&<div className="visual-menu-restore">{missing.map(item=><button key={item} onClick={()=>restoreMenu(item)}><Plus size={12}/>{navLabels[item]}</button>)}</div>}</div></InspectorGroup><InspectorGroup title="상단 메뉴 글래스"><Range label="불투명도" value={config.navOpacity} min={0} max={100} step={1} suffix="%" onChange={v=>patch('navOpacity',v)}/></InspectorGroup>{dividerButton}</>;
 if(section==='hero')return <><div className="visual-editor-panel-head"><h3>메인 비주얼</h3></div><InspectorGroup title="미디어" open><FileField label="메인 미디어 · 저장소 실제 용량 제한 적용" accept="image/*,video/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.mp4,.webm,.mov,.m4v" disabled={uploading} value={config.heroVideo} onFile={f=>uploadConfig(f,'heroVideo')} onClear={()=>patch('heroVideo','')}/>{uploadState?.key==='heroVideo'&&<UploadStateView state={uploadState}/>}<p className="visual-upload-storage-note">대용량 영상은 저장소의 실제 제한을 따릅니다. 무료 Supabase 프로젝트는 최대 50MB입니다. <a href="https://supabase.com/dashboard/project/_/storage/settings" target="_blank" rel="noopener noreferrer">Storage 용량 설정 확인 ↗</a></p> {pendingHeroVideo&&<button type="button" className="visual-secondary-button" disabled={uploading} onClick={retryHeroPlayback}>업로드된 영상 다시 확인</button>}<FileField label="대체 이미지" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" disabled={uploading} value={config.heroPoster} onFile={f=>uploadConfig(f,'heroPoster')} onClear={()=>patch('heroPoster','')}/>{uploadState?.key==='heroPoster'&&<UploadStateView state={uploadState}/>}<label className="visual-toggle"><span>영상 자동 재생 · 영상일 때만</span><input type="checkbox" checked={config.autoplay} onChange={e=>patch('autoplay',e.target.checked)}/></label><p className="visual-help">메인 미디어에는 JPG · PNG · WebP · GIF · AVIF 이미지와 MP4 · WebM · MOV · M4V 영상을 모두 올릴 수 있습니다. 업로드 후 영상 디코딩을 확인한 다음 미리보기를 교체합니다. 이전 영상의 대체 이미지는 새 영상 위에 남지 않으며, 저장 · 적용을 누르면 공개 사이트에 반영됩니다.</p></InspectorGroup><InspectorGroup title="주변 문구"><TextField label="상단 보조 문구" value={config.eyebrow} onChange={v=>patch('eyebrow',v)}/><TextField label="하단 문구" value={config.subtitle} onChange={v=>patch('subtitle',v)}/></InspectorGroup>{dividerButton}</>;
 if(section==='work')return <><div className="visual-editor-panel-head"><h3>작품</h3><button type="button" onClick={addWork}><Plus size={13}/>작품 추가</button></div><InspectorGroup title="영역 텍스트" open><TextField label="작은 제목" value={config.workKicker} onChange={v=>patch('workKicker',v)}/><TextField label="큰 제목" value={config.headline} multi onChange={v=>patch('headline',v)}/><TextField label="보조 문구" value={config.workAside} multi onChange={v=>patch('workAside',v)}/></InspectorGroup><InspectorGroup title="그리드·전체화면"><Range label="열 개수" value={config.columns} min={1} max={4} step={1} onChange={v=>patch('columns',v)}/><Range label="전체화면 배경 불투명도" value={config.filmBackdropOpacity} min={0} max={100} step={1} suffix="%" onChange={v=>patch('filmBackdropOpacity',v)}/><Range label="전체화면 배경 블러" value={config.filmBackdropBlur} min={0} max={60} step={1} suffix="px" onChange={v=>patch('filmBackdropBlur',v)}/></InspectorGroup>{dividerButton}</>;
 if(section==='about')return <><div className="visual-editor-panel-head"><h3>소개</h3></div><InspectorGroup title="텍스트" open><TextField label="작은 제목" value={config.aboutKicker} onChange={v=>patch('aboutKicker',v)}/><TextField label="큰 제목" value={config.aboutHeadline} multi onChange={v=>patch('aboutHeadline',v)}/><TextField label="본문" value={config.about} multi onChange={v=>patch('about',v)}/><TextField label="분야 목록" value={config.aboutDisciplines} multi onChange={v=>patch('aboutDisciplines',v)}/></InspectorGroup><InspectorGroup title="비주얼" open><label className="visual-field"><span>비주얼 형식</span><select value={config.aboutMediaType} onChange={e=>patch('aboutMediaType',e.target.value)}><option value="image">이미지</option><option value="3d">3D</option></select></label>{config.aboutMediaType==='image'?<FileField label="소개 이미지" accept="image/jpeg,image/png,image/webp" disabled={uploading} value={config.aboutImage} onFile={f=>uploadConfig(f,'aboutImage')} onClear={()=>patch('aboutImage','')}/>:<FileField label="3D 모델" accept=".glb,.gltf,.fbx,.obj,.stl,.ply,.zip" disabled={uploading} value={config.aboutModel} onFile={f=>uploadConfig(f,'aboutModel')} onClear={()=>patch('aboutModel','')}/>}</InspectorGroup>{dividerButton}</>;
 if(section==='team')return <><div className="visual-editor-panel-head"><h3>팀</h3></div><InspectorGroup title="영역 텍스트" open><TextField label="작은 제목" value={config.teamKicker} onChange={v=>patch('teamKicker',v)}/><TextField label="큰 제목" value={config.teamHeadline} multi onChange={v=>patch('teamHeadline',v)}/><TextField label="보기 버튼" value={config.teamViewLabel} onChange={v=>patch('teamViewLabel',v)}/></InspectorGroup><InspectorGroup title="팀원" open><div className="visual-team-list">{config.teamMembers.map(m=><div className="visual-team-row" key={m.id}><input value={m.name} placeholder="이름" onChange={e=>patchTeam(m.id,'name',e.target.value)}/><input value={m.codeName} placeholder="코드명" onChange={e=>patchTeam(m.id,'codeName',e.target.value)}/><label><span>표시</span><input type="checkbox" checked={m.visible} onChange={e=>patchTeam(m.id,'visible',e.target.checked)}/></label></div>)}</div></InspectorGroup><InspectorGroup title="팀 레이아웃"><Range label="미디어 크기" value={config.teamMediaSize} min={120} max={520} step={1} suffix="px" onChange={v=>patch('teamMediaSize',v)}/><Range label="미디어 모서리" value={config.teamMediaRadius} min={0} max={80} step={1} suffix="px" onChange={v=>patch('teamMediaRadius',v)}/><Range label="행 간격" value={config.teamRowGap} min={12} max={180} step={1} suffix="px" onChange={v=>patch('teamRowGap',v)}/><Range label="큰 제목 너비" value={config.teamHeadlineWidth} min={30} max={100} step={1} suffix="%" onChange={v=>patch('teamHeadlineWidth',v)}/></InspectorGroup>{dividerButton}</>;
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
  {section==='hero'&&<InspectorGroup title="메인 영상 그라데이션" open meta="top · bottom · density · blur"><label className="visual-toggle"><span>그라데이션 사용</span><input type="checkbox" checked={config.heroFadeEnabled} onChange={e=>patch('heroFadeEnabled',e.target.checked)}/></label><Range label="상단 크기" value={config.heroFadeTopSize} min={0} max={40} step={1} suffix="%" onChange={v=>patch('heroFadeTopSize',v)}/><Range label="하단 크기" value={config.heroFadeBottomSize} min={0} max={40} step={1} suffix="%" onChange={v=>patch('heroFadeBottomSize',v)}/><Range label="농도" value={config.heroFadeDensity} min={0} max={100} step={1} suffix="%" onChange={v=>patch('heroFadeDensity',v)}/><Range label="불투명도" value={config.heroFadeOpacity} min={0} max={100} step={1} suffix="%" onChange={v=>patch('heroFadeOpacity',v)}/><Range label="블러" value={config.heroFadeBlur} min={0} max={40} step={1} suffix="px" onChange={v=>patch('heroFadeBlur',v)}/></InspectorGroup>}
  {!!textGroups[section]?.length&&<InspectorGroup title="글자 스타일" open meta="필요한 항목만 펼쳐서 편집">{textGroups[section]!.map(item=><TextStyleControl key={item.key} label={item.label} value={config.textStyles[item.key]} onChange={v=>patchTextStyle(item.key,v)}/>)}</InspectorGroup>}
  {section==='about'&&config.aboutMediaType==='3d'&&<InspectorGroup title="3D 인터랙션" meta="관리자 고급 기능 이전"><label className="visual-toggle"><span>드래그 회전</span><input type="checkbox" checked={config.modelDrag} onChange={e=>patch('modelDrag',e.target.checked)}/></label><label className="visual-toggle"><span>원위치 복귀</span><input type="checkbox" checked={config.modelReturnToCenter} onChange={e=>patch('modelReturnToCenter',e.target.checked)}/></label><label className="visual-toggle"><span>포인터 반응</span><input type="checkbox" checked={config.modelReact} onChange={e=>patch('modelReact',e.target.checked)}/></label><label className="visual-toggle"><span>휠 / 핀치 확대</span><input type="checkbox" checked={config.modelZoom} onChange={e=>patch('modelZoom',e.target.checked)}/></label><label className="visual-toggle"><span>자동 회전</span><input type="checkbox" checked={config.modelAutoRotate} onChange={e=>patch('modelAutoRotate',e.target.checked)}/></label><Range label="크기" value={config.modelScale} min={.4} max={2.5} step={.05} onChange={v=>patch('modelScale',v)}/><Range label="X offset" value={config.modelOffsetX} min={-40} max={40} step={1} suffix="%" onChange={v=>patch('modelOffsetX',v)}/><Range label="Y offset" value={config.modelOffsetY} min={-80} max={80} step={1} suffix="%" onChange={v=>patch('modelOffsetY',v)}/><Range label="Rotate X" value={config.modelRotateX} min={-180} max={180} step={1} suffix="°" onChange={v=>patch('modelRotateX',v)}/><Range label="Rotate Y" value={config.modelRotateY} min={-180} max={180} step={1} suffix="°" onChange={v=>patch('modelRotateY',v)}/><Range label="Rotate Z" value={config.modelRotateZ} min={-180} max={180} step={1} suffix="°" onChange={v=>patch('modelRotateZ',v)}/><Range label="Exposure" value={config.modelExposure} min={.2} max={2} step={.1} onChange={v=>patch('modelExposure',v)}/></InspectorGroup>}
  <InspectorGroup title="사이트 스타일" meta="전역 디자인"><div className="visual-segmented"><button className={config.theme==='dark'?'is-active':''} onClick={()=>patch('theme','dark')}>Dark</button><button className={config.theme==='light'?'is-active':''} onClick={()=>patch('theme','light')}>Light</button></div><label className="visual-color"><span>Accent</span><input type="color" value={config.accent} onChange={e=>patch('accent',e.target.value)}/><b>{config.accent.toUpperCase()}</b></label><label className="visual-field"><span>Font</span><select value={config.font} onChange={e=>patch('font',e.target.value)}><option>Arial, Helvetica, sans-serif</option><option>Helvetica Neue, Arial, sans-serif</option><option>Georgia, serif</option><option>Times New Roman, serif</option><option>Verdana, sans-serif</option><option>Trebuchet MS, sans-serif</option><option>Courier New, monospace</option><option>system-ui, sans-serif</option></select></label><Range label="Body size" value={config.fontSize} min={12} max={24} step={1} suffix="px" onChange={v=>patch('fontSize',v)}/><Range label="Corner radius" value={config.radius} min={0} max={54} step={1} suffix="px" onChange={v=>patch('radius',v)}/><Range label="Glass blur" value={config.blur} min={0} max={60} step={1} suffix="px" onChange={v=>patch('blur',v)}/><Range label="Glass opacity" value={config.glass} min={10} max={100} step={1} suffix="%" onChange={v=>patch('glass',v)}/><Range label="Motion" value={Math.round(config.motion*100)} min={0} max={180} step={5} suffix="%" onChange={v=>patch('motion',v/100)}/></InspectorGroup>
  <InspectorGroup title="배경·패턴"><label className="visual-field"><span>Background</span><select value={config.backgroundType} onChange={e=>patch('backgroundType',e.target.value)}><option value="none">None</option><option value="image">이미지</option><option value="video">Video</option></select></label>{config.backgroundType==='image'&&<FileField label="Background image" accept="image/*" disabled={uploading} value={config.backgroundImage} onFile={f=>uploadConfig(f,'backgroundImage')} onClear={()=>patch('backgroundImage','')}/>} {config.backgroundType==='video'&&<FileField label="Background video" accept="video/mp4,video/webm" disabled={uploading} value={config.backgroundVideo} onFile={f=>uploadConfig(f,'backgroundVideo')} onClear={()=>patch('backgroundVideo','')}/>} {config.backgroundType!=='none'&&<><Range label="Background opacity" value={config.backgroundOpacity} min={0} max={100} step={1} suffix="%" onChange={v=>patch('backgroundOpacity',v)}/><Range label="Background dim" value={config.backgroundDim} min={0} max={100} step={1} suffix="%" onChange={v=>patch('backgroundDim',v)}/></>}<label className="visual-field"><span>Pattern</span><select value={config.pattern} onChange={e=>patch('pattern',e.target.value)}><option value="none">None</option><option value="dots">Dots</option><option value="grid">Grid</option><option value="diagonal">Diagonal</option><option value="checker">Checker</option><option value="lines">Lines</option><option value="rings">Rings</option></select></label>{config.pattern!=='none'&&<><label className="visual-color"><span>Pattern color</span><input type="color" value={config.patternColor} onChange={e=>patch('patternColor',e.target.value)}/><b>{config.patternColor.toUpperCase()}</b></label><Range label="Pattern size" value={config.patternSize} min={8} max={120} step={1} suffix="px" onChange={v=>patch('patternSize',v)}/><Range label="Pattern opacity" value={config.patternOpacity} min={0} max={100} step={1} suffix="%" onChange={v=>patch('patternOpacity',v)}/></>}</InspectorGroup>
  <InspectorGroup title="브라우저"><TextField label="Browser title" value={config.browserTitle} onChange={v=>patch('browserTitle',v)}/><FileField label="Favicon" accept="image/png,image/jpeg,image/webp,image/x-icon,.ico" disabled={uploading} value={config.favicon} onFile={f=>uploadConfig(f,'favicon')} onClear={()=>patch('favicon','')}/></InspectorGroup>
 </div>;
}

function TextStyleControl({label,value,onChange,lockX=false}:{label:string;value:Config['textStyles'][TextStyleKey];onChange:(value:TextPatch)=>void;lockX?:boolean}){
 const weight=value.weight??500,opacity=value.opacity??100,letterSpacing=value.letterSpacing??0,textTransform=value.textTransform??'none';
 return <div className="visual-text-style visual-text-style-open">
  <div className="visual-typography-head"><strong>{label} 스타일</strong><span>{value.size}px · {weight}</span></div>
  <FontPicker value={value.font} onChange={font=>onChange({font})}/>
  <div className="visual-quick-style-grid">
   <label className="visual-color"><span>글자 색상</span><input type="color" value={value.color||'#ffffff'} onChange={e=>onChange({color:e.target.value})}/><b>{value.color||'AUTO'}</b></label>
   <label className="visual-field"><span>정렬</span><select value={value.align} onChange={e=>onChange({align:e.target.value as TextPatch['align']})}><option value="left">왼쪽</option><option value="center">가운데</option><option value="right">오른쪽</option></select></label>
  </div>
  <Range label="크기" value={value.size} min={8} max={180} step={1} suffix="px" onChange={v=>onChange({size:v})}/>
  <Range label="굵기" value={weight} min={100} max={900} step={100} onChange={v=>onChange({weight:v})}/>
  <Range label="자간" value={letterSpacing} min={-8} max={24} step={.25} suffix="px" onChange={v=>onChange({letterSpacing:v})}/>
  <Range label="불투명도" value={opacity} min={0} max={100} step={1} suffix="%" onChange={v=>onChange({opacity:v})}/>
  <label className="visual-field"><span>영문 대소문자</span><select value={textTransform} onChange={e=>onChange({textTransform:e.target.value as TextPatch['textTransform']})}><option value="none">입력한 그대로</option><option value="uppercase">UPPERCASE</option><option value="lowercase">lowercase</option><option value="capitalize">Capitalize</option></select></label>
  <details className="visual-advanced-text-controls"><summary>고급 위치 조절</summary>{lockX?<div className="visual-axis-lock"><span>가로 위치</span><b>화면 정중앙 고정</b></div>:<Range label="가로 위치" value={value.x} min={-600} max={600} step={1} suffix="px" onChange={v=>onChange({x:v})}/>}<Range label="세로 위치" value={value.y} min={-420} max={420} step={1} suffix="px" onChange={v=>onChange({y:v})}/></details>
 </div>;
}
function WorkEditor({work,patch,onUpload,uploading,onDuplicate,onDelete}:{work:Work;patch:(key:keyof Work,value:Work[keyof Work])=>void;onUpload:(file:File|undefined,field:'poster'|'video')=>void;uploading:boolean;onDuplicate:()=>void;onDelete:()=>void}){
 return <><div className="visual-editor-panel-head"><h3>작품 카드</h3><div><button type="button" title="복제" onClick={onDuplicate}><Copy size={13}/></button><button type="button" className="is-danger" title="삭제" onClick={onDelete}><Trash2 size={13}/></button></div></div><TextField label="제목" value={work.title} onChange={v=>patch('title',v)}/><TextField label="카테고리" value={work.category} onChange={v=>patch('category',v)}/><TextField label="연도" value={work.year} onChange={v=>patch('year',v)}/><TextField label="역할" value={work.role} onChange={v=>patch('role',v)}/><TextField label="설명" value={work.description} multi onChange={v=>patch('description',v)}/><label className="visual-toggle"><span>공개</span><input type="checkbox" checked={work.visible} onChange={e=>patch('visible',e.target.checked)}/></label><FileField label="포스터 / 이미지" accept="image/jpeg,image/png,image/webp" disabled={uploading} value={work.poster} onFile={f=>onUpload(f,'poster')} onClear={()=>patch('poster','')}/><FileField label="영상" accept="video/mp4,video/webm" disabled={uploading} value={work.video} onFile={f=>onUpload(f,'video')} onClear={()=>patch('video','')}/></>;
}
