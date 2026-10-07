'use client';
import {useEffect,useMemo,useRef,useState,type CSSProperties,type Dispatch,type PointerEvent as ReactPointerEvent,type SetStateAction} from 'react';
import {ArrowDown,ArrowUp,Copy,Eye,EyeOff,Grip,Layers3,Maximize2,PanelLeft,PanelRight,Plus,RotateCcw,Save,Settings2,SlidersHorizontal,Trash2,Type,Undo2,X} from 'lucide-react';
import type {Config,PortfolioDivider,PortfolioSectionKey,TeamMember,TextAlign} from './defaults';
import {uploadFile} from './media-upload';

type PanelTab='layers'|'content'|'layout'|'style';
type Point={x:number;y:number};
type TextKey='siteName'|'navWorkLabel'|'navAboutLabel'|'navTeamLabel'|'navContactLabel'|'indexLabel'|'name'|'title'|'intro'|'footerReturn';
type Selection=PortfolioSectionKey|`text:${TextKey}`|`work:${number}`|`divider:${string}`;
type TextFields={font:keyof TeamMember;size:keyof TeamMember;color:keyof TeamMember;align:keyof TeamMember;x:keyof TeamMember;y:keyof TeamMember};

const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
const numberValue=(value:unknown,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const sectionDefs:{key:PortfolioSectionKey;label:string}[]=[
 {key:'nav',label:'상단 메뉴'},{key:'hero',label:'대표 비주얼'},{key:'index',label:'카테고리 인덱스'},
 {key:'work',label:'작품 영역'},{key:'switcher',label:'이전 / 다음 영역'},{key:'footer',label:'하단 영역'}
];
const textSection:Record<TextKey,PortfolioSectionKey>={siteName:'nav',navWorkLabel:'nav',navAboutLabel:'nav',navTeamLabel:'nav',navContactLabel:'nav',indexLabel:'index',name:'index',title:'work',intro:'work',footerReturn:'footer'};
const textLabels:Record<TextKey,string>={siteName:'사이트 이름',navWorkLabel:'Work 메뉴',navAboutLabel:'About 메뉴',navTeamLabel:'Team 메뉴',navContactLabel:'Contact 메뉴',indexLabel:'카테고리 인덱스 문구',name:'포트폴리오 이름',title:'작품 영역 제목',intro:'소개 문구',footerReturn:'돌아가기 문구'};
const textFields:Partial<Record<TextKey,TextFields>>={
 name:{font:'portfolioNameFont',size:'portfolioNameSize',color:'portfolioNameColor',align:'portfolioNameAlign',x:'portfolioNameX',y:'portfolioNameY'},
 title:{font:'portfolioTitleFont',size:'portfolioTitleSize',color:'portfolioTitleColor',align:'portfolioTitleAlign',x:'portfolioTitleX',y:'portfolioTitleY'},
 intro:{font:'portfolioIntroFont',size:'portfolioIntroSize',color:'portfolioIntroColor',align:'portfolioIntroAlign',x:'portfolioIntroX',y:'portfolioIntroY'},
 indexLabel:{font:'portfolioUtilityFont',size:'portfolioUtilitySize',color:'portfolioUtilityColor',align:'portfolioUtilityAlign',x:'portfolioUtilityX',y:'portfolioUtilityY'},
 footerReturn:{font:'portfolioUtilityFont',size:'portfolioUtilitySize',color:'portfolioUtilityColor',align:'portfolioUtilityAlign',x:'portfolioReturnX',y:'portfolioReturnY'}
};
const pointFromStorage=(key:string):Point|null=>{try{const raw=localStorage.getItem(key);if(!raw)return null;const p=JSON.parse(raw);return Number.isFinite(p?.x)&&Number.isFinite(p?.y)?p:null}catch{return null}};

export default function PortfolioVisualEditor({config,memberId,setConfig,onSave,onCancel,onOpenAdmin,onUndo,canUndo,busy}:{
 config:Config;memberId:string;setConfig:Dispatch<SetStateAction<Config>>;
 onSave:()=>void|Promise<void>;onCancel:()=>void;onOpenAdmin:()=>void;onUndo:()=>void;canUndo:boolean;busy:boolean;
}){
 const [selection,setSelection]=useState<Selection>('work');
 const [rect,setRect]=useState<DOMRect|null>(null),[uploading,setUploading]=useState(false),[tab,setTab]=useState<PanelTab>('layers');
 const [panelSide,setPanelSide]=useState<'left'|'right'>('right'),[panelOpen,setPanelOpen]=useState(true);
 const [toolbarPos,setToolbarPos]=useState<Point|null>(()=>pointFromStorage('viivii-visual-toolbar-pos'));
 const [panelPos,setPanelPos]=useState<Point|null>(()=>pointFromStorage('viivii-visual-panel-pos'));
 const sectionDrag=useRef<{y:number;base:number}|null>(null),sectionScale=useRef<{x:number;y:number;base:number}|null>(null),sectionHeight=useRef<{y:number;base:number}|null>(null);
 const textDrag=useRef<{x:number;y:number;baseX:number;baseY:number}|null>(null),textResize=useRef<{x:number;y:number;base:number}|null>(null),dividerDrag=useRef<{y:number;base:number}|null>(null);
 const member=useMemo(()=>config.teamMembers.find(item=>item.id===memberId)||null,[config.teamMembers,memberId]);

 const patchConfig=<K extends keyof Config>(key:K,value:Config[K])=>setConfig(current=>({...current,[key]:value}));
 const patchMember=(value:Partial<TeamMember>)=>setConfig(current=>({...current,teamMembers:current.teamMembers.map(item=>item.id===memberId?{...item,...value}:item)}));
 if(!member)return null;

 const selectedSection=(sectionDefs.some(item=>item.key===selection)?selection:selection.startsWith('text:')?textSection[selection.slice(5) as TextKey]:selection.startsWith('work:')?'work':selection.startsWith('divider:')?(member.portfolioDividers.find(item=>item.id===selection.slice(8))?.after||'work'):'work') as PortfolioSectionKey;
 const selectedText=selection.startsWith('text:')?selection.slice(5) as TextKey:null;
 const selectedWorkIndex=selection.startsWith('work:')?Number(selection.slice(5)):-1;
 const selectedDivider=selection.startsWith('divider:')?member.portfolioDividers.find(item=>item.id===selection.slice(8))||null:null;
 const selectedLayout=member.portfolioSections[selectedSection];

 const targetFor=(value:Selection=selection)=>{
  if(value.startsWith('work:'))return document.querySelector<HTMLElement>(`[data-portfolio-work-index="${CSS.escape(value.slice(5))}"]`);
  if(value.startsWith('divider:'))return document.querySelector<HTMLElement>(`[data-portfolio-divider-id="${CSS.escape(value.slice(8))}"]`);
  if(value.startsWith('text:'))return document.querySelector<HTMLElement>(`[data-portfolio-edit="${CSS.escape(value.slice(5))}"]`);
  return document.querySelector<HTMLElement>(`[data-portfolio-section="${CSS.escape(value)}"]`);
 };
 const refresh=()=>{const target=targetFor();setRect(target?target.getBoundingClientRect():null)};
 useEffect(()=>{let raf=0;const sync=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(refresh)};sync();window.addEventListener('scroll',sync,{passive:true});window.addEventListener('resize',sync);return()=>{cancelAnimationFrame(raf);window.removeEventListener('scroll',sync);window.removeEventListener('resize',sync)}},[selection,config]);
 useEffect(()=>{if(selection.startsWith('text:')||selection.startsWith('work:')||selection.startsWith('divider:'))setTab('content')},[selection]);

 const patchSection=(key:PortfolioSectionKey,value:Partial<TeamMember['portfolioSections'][PortfolioSectionKey]>)=>patchMember({portfolioSections:{...member.portfolioSections,[key]:{...member.portfolioSections[key],...value}}});
 const patchDivider=(id:string,value:Partial<PortfolioDivider>)=>patchMember({portfolioDividers:member.portfolioDividers.map(item=>item.id===id?{...item,...value}:item)});
 const deleteDivider=(id:string)=>{patchMember({portfolioDividers:member.portfolioDividers.filter(item=>item.id!==id)});setSelection(selectedSection);setTab('layers')};
 const addDivider=()=>{const id='portfolio-divider-'+Date.now();patchMember({portfolioDividers:[...member.portfolioDividers,{id,after:selectedSection,visible:true,width:100,thickness:1,opacity:24,inset:0,marginTop:0,marginBottom:0,offsetY:0,color:''}]});setSelection(`divider:${id}`);setTab('content')};

 const textValue=(key:TextKey)=>key==='siteName'?config.name:key==='navWorkLabel'?config.navWorkLabel:key==='navAboutLabel'?config.navAboutLabel:key==='navTeamLabel'?config.navTeamLabel:key==='navContactLabel'?config.navContactLabel:key==='indexLabel'?member.portfolioTeamIndexLabel:key==='name'?member.name:key==='title'?member.portfolioTitle:key==='intro'?member.portfolioIntro:member.portfolioReturnLabel;
 const patchText=(key:TextKey,value:string)=>{
  if(key==='siteName')return patchConfig('name',value);
  if(key==='navWorkLabel')return patchConfig('navWorkLabel',value);
  if(key==='navAboutLabel')return patchConfig('navAboutLabel',value);
  if(key==='navTeamLabel')return patchConfig('navTeamLabel',value);
  if(key==='navContactLabel')return patchConfig('navContactLabel',value);
  if(key==='indexLabel')return patchMember({portfolioTeamIndexLabel:value});
  if(key==='name')return patchMember({name:value});
  if(key==='title')return patchMember({portfolioTitle:value});
  if(key==='intro')return patchMember({portfolioIntro:value});
  patchMember({portfolioReturnLabel:value});
 };
 const patchTextFields=(key:TextKey,value:Partial<{font:string;size:number;color:string;align:TextAlign;x:number;y:number}>)=>{
  const fields=textFields[key];if(!fields)return;
  const patch:any={};
  if(value.font!==undefined)patch[fields.font]=value.font;
  if(value.size!==undefined)patch[fields.size]=value.size;
  if(value.color!==undefined)patch[fields.color]=value.color;
  if(value.align!==undefined)patch[fields.align]=value.align;
  if(value.x!==undefined)patch[fields.x]=value.x;
  if(value.y!==undefined)patch[fields.y]=value.y;
  patchMember(patch);
 };
 const currentTextStyle=(key:TextKey)=>{
  const fields=textFields[key];if(!fields)return null;
  return {font:String(member[fields.font]||''),size:numberValue(member[fields.size]),color:String(member[fields.color]||''),align:(member[fields.align]||'left') as TextAlign,x:numberValue(member[fields.x]),y:numberValue(member[fields.y])};
 };

 const uploadHero=async(file?:File)=>{if(!file)return;try{setUploading(true);patchMember({photo:await uploadFile(file)})}finally{setUploading(false)}};
 const uploadWork=async(index:number,file?:File)=>{if(!file)return;try{setUploading(true);const url=await uploadFile(file);const works=[...member.works];works[index]=url;patchMember({works})}finally{setUploading(false)}};
 const removeWork=(index:number)=>{patchMember({works:member.works.filter((_,i)=>i!==index),portfolioWorkCategories:member.portfolioWorkCategories.filter((_,i)=>i!==index)});setSelection('work');setTab('layers')};
 const duplicateWork=(index:number)=>{const works=[...member.works],categories=[...member.portfolioWorkCategories];works.splice(index+1,0,works[index]||'');categories.splice(index+1,0,categories[index]||'');patchMember({works,portfolioWorkCategories:categories});setSelection(`work:${index+1}`)};
 const addWork=()=>{const index=member.works.length;patchMember({works:[...member.works,''],portfolioWorkCategories:[...member.portfolioWorkCategories,'']});setSelection(`work:${index}`);setTab('content')};
 const moveWork=(index:number,dir:number)=>{const target=index+dir;if(target<0||target>=member.works.length)return;const works=[...member.works],categories=[...member.portfolioWorkCategories];[works[index],works[target]]=[works[target],works[index]];[categories[index],categories[target]]=[categories[target],categories[index]];patchMember({works,portfolioWorkCategories:categories});setSelection(`work:${target}`)};

 const beginSectionMove=(e:ReactPointerEvent<HTMLButtonElement>)=>{e.preventDefault();e.stopPropagation();sectionDrag.current={y:e.clientY,base:selectedLayout.y};const move=(event:PointerEvent)=>{const start=sectionDrag.current;if(!start)return;patchSection(selectedSection,{x:0,y:Math.round(start.base+event.clientY-start.y)})};const up=()=>{sectionDrag.current=null;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true})};
 const beginSectionScale=(e:ReactPointerEvent<HTMLButtonElement>)=>{e.preventDefault();e.stopPropagation();sectionScale.current={x:e.clientX,y:e.clientY,base:selectedLayout.scale};const move=(event:PointerEvent)=>{const start=sectionScale.current;if(!start)return;patchSection(selectedSection,{x:0,scale:Math.round(clamp(start.base+((event.clientX-start.x)+(event.clientY-start.y))/720,.55,1.6)*100)/100})};const up=()=>{sectionScale.current=null;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true})};
 const beginSectionHeight=(e:ReactPointerEvent<HTMLButtonElement>)=>{e.preventDefault();e.stopPropagation();sectionHeight.current={y:e.clientY,base:selectedLayout.minHeight||rect?.height||0};const move=(event:PointerEvent)=>{const start=sectionHeight.current;if(!start)return;patchSection(selectedSection,{minHeight:clamp(Math.round(start.base+event.clientY-start.y),0,1800)})};const up=()=>{sectionHeight.current=null;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true})};
 const beginTextMove=(e:ReactPointerEvent<HTMLButtonElement>)=>{if(!selectedText)return;const style=currentTextStyle(selectedText);if(!style)return;e.preventDefault();e.stopPropagation();textDrag.current={x:e.clientX,y:e.clientY,baseX:style.x,baseY:style.y};const move=(event:PointerEvent)=>{const start=textDrag.current;if(!start)return;patchTextFields(selectedText,{x:Math.round(start.baseX+event.clientX-start.x),y:Math.round(start.baseY+event.clientY-start.y)})};const up=()=>{textDrag.current=null;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true})};
 const beginTextResize=(e:ReactPointerEvent<HTMLButtonElement>)=>{if(!selectedText)return;const style=currentTextStyle(selectedText);if(!style)return;e.preventDefault();e.stopPropagation();textResize.current={x:e.clientX,y:e.clientY,base:style.size};const move=(event:PointerEvent)=>{const start=textResize.current;if(!start)return;patchTextFields(selectedText,{size:clamp(Math.round((start.base+((event.clientX-start.x)+(event.clientY-start.y))*.25)*10)/10,8,180)})};const up=()=>{textResize.current=null;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true})};
 const beginDividerMove=(e:ReactPointerEvent<HTMLButtonElement>)=>{if(!selectedDivider)return;e.preventDefault();e.stopPropagation();dividerDrag.current={y:e.clientY,base:selectedDivider.offsetY||0};const move=(event:PointerEvent)=>{const start=dividerDrag.current;if(!start)return;patchDivider(selectedDivider.id,{offsetY:Math.round(start.base+event.clientY-start.y)})};const up=()=>{dividerDrag.current=null;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true})};

 useEffect(()=>{
  const down=(event:PointerEvent)=>{
   if(event.button!==0)return;
   const target=event.target as HTMLElement|null;if(!target||target.closest('[data-visual-editor="true"]'))return;
   const divider=target.closest<HTMLElement>('[data-portfolio-divider-id]');
   if(divider){const id=divider.dataset.portfolioDividerId||'';setSelection(`divider:${id}`);event.preventDefault();event.stopPropagation();return}
   const work=target.closest<HTMLElement>('[data-portfolio-work-index]');
   if(work?.dataset.portfolioWorkIndex!==undefined){setSelection(`work:${work.dataset.portfolioWorkIndex}` as Selection);event.preventDefault();event.stopPropagation();return}
   const text=target.closest<HTMLElement>('[data-portfolio-edit]');
   if(text?.dataset.portfolioEdit){const key=text.dataset.portfolioEdit as TextKey;setSelection(`text:${key}`);event.preventDefault();event.stopPropagation();const fields=textFields[key];if(!fields)return;const sx=event.clientX,sy=event.clientY,startScroll=window.scrollY,baseX=numberValue(member[fields.x]),baseY=numberValue(member[fields.y]);let active=false;const move=(ev:PointerEvent)=>{const dx=ev.clientX-sx,dy=ev.clientY-sy+(window.scrollY-startScroll);if(!active&&Math.hypot(dx,dy)<3)return;active=true;document.documentElement.classList.add('visual-direct-dragging');patchTextFields(key,{x:Math.round(baseX+dx),y:Math.round(baseY+dy)});if(ev.clientY<54)window.scrollBy(0,-18);else if(ev.clientY>window.innerHeight-54)window.scrollBy(0,18)};const up=()=>{document.documentElement.classList.remove('visual-direct-dragging');window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});return}
   const section=target.closest<HTMLElement>('[data-portfolio-section]');const key=section?.dataset.portfolioSection as PortfolioSectionKey|undefined;
   if(!section||!key)return;setSelection(key);
   if(target.closest('button,a,input,textarea,select,video,model-viewer')){event.preventDefault();event.stopPropagation();return}
   event.preventDefault();event.stopPropagation();const sy=event.clientY,startScroll=window.scrollY,base=member.portfolioSections[key].y;let active=false;
   const move=(ev:PointerEvent)=>{const dy=ev.clientY-sy+(window.scrollY-startScroll);if(!active&&Math.abs(dy)<3)return;active=true;document.documentElement.classList.add('visual-direct-dragging');patchSection(key,{x:0,y:Math.round(base+dy)});if(ev.clientY<54)window.scrollBy(0,-18);else if(ev.clientY>window.innerHeight-54)window.scrollBy(0,18)};
   const up=()=>{document.documentElement.classList.remove('visual-direct-dragging');window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
  };
  document.addEventListener('pointerdown',down,true);return()=>{document.removeEventListener('pointerdown',down,true);document.documentElement.classList.remove('visual-direct-dragging')};
 },[member,selection]);

 const beginChromeDrag=(e:ReactPointerEvent<HTMLElement>,kind:'toolbar'|'panel')=>{if(e.button!==0)return;const selector=kind==='toolbar'?'.visual-editor-topbar':'.visual-editor-panel';const node=(e.currentTarget as HTMLElement).closest<HTMLElement>(selector);if(!node)return;e.preventDefault();const r=node.getBoundingClientRect(),sx=e.clientX,sy=e.clientY,setPos=kind==='toolbar'?setToolbarPos:setPanelPos,storageKey=kind==='toolbar'?'viivii-visual-toolbar-pos':'viivii-visual-panel-pos';const move=(ev:PointerEvent)=>setPos({x:Math.round(clamp(r.left+ev.clientX-sx,8,Math.max(8,window.innerWidth-r.width-8))),y:Math.round(clamp(r.top+ev.clientY-sy,8,Math.max(8,window.innerHeight-r.height-8)))});const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);requestAnimationFrame(()=>{const el=document.querySelector<HTMLElement>(selector);if(!el)return;const rr=el.getBoundingClientRect(),p={x:Math.round(rr.left),y:Math.round(rr.top)};setPos(p);try{localStorage.setItem(storageKey,JSON.stringify(p))}catch{}})};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true})};
 const resetChrome=(kind:'toolbar'|'panel')=>{if(kind==='toolbar'){setToolbarPos(null);try{localStorage.removeItem('viivii-visual-toolbar-pos')}catch{}}else{setPanelPos(null);try{localStorage.removeItem('viivii-visual-panel-pos')}catch{}}};

 const label=selectedDivider?'구분선':selectedText?textLabels[selectedText]:selectedWorkIndex>=0?'작품 미디어':sectionDefs.find(item=>item.key===selectedSection)?.label||'포트폴리오';
 const toolbarBottom=!toolbarPos&&!!rect&&rect.top<112&&window.innerWidth>820,labelInside=!!rect&&rect.top<28;
 const toolbarStyle=toolbarPos?{'--ve-toolbar-x':toolbarPos.x+'px','--ve-toolbar-y':toolbarPos.y+'px'} as CSSProperties:undefined;
 const panelStyle=panelPos?{'--ve-panel-x':panelPos.x+'px','--ve-panel-y':panelPos.y+'px'} as CSSProperties:undefined;
 const style=currentTextStyle(selectedText||'siteName');

 return <div className={'visual-editor-ui portfolio-visual-editor is-panel-'+panelSide} data-visual-editor="true">
  <div style={toolbarStyle} className={'visual-editor-topbar '+(toolbarPos?'is-free ':toolbarBottom?'is-bottom ':'is-top ')}>
   <div className="visual-editor-title visual-editor-drag-zone" onPointerDown={e=>beginChromeDrag(e,'toolbar')} onDoubleClick={()=>resetChrome('toolbar')}><Grip size={14}/><Settings2 size={16}/><strong>VISUAL EDIT / PORTFOLIO</strong><span>현재 페이지 전용 레이어 · 직접 선택 · 드래그 · 크기 · 스타일</span></div>
   <div className="visual-editor-toolbar-tools">
    <button type="button" className="visual-toolbar-icon" title="패널 위치 전환" onClick={()=>{setPanelPos(null);setPanelSide(value=>value==='right'?'left':'right')}}>{panelSide==='right'?<PanelLeft size={15}/>:<PanelRight size={15}/>}</button>
    <button type="button" className="visual-toolbar-icon" title={panelOpen?'패널 접기':'패널 열기'} onClick={()=>setPanelOpen(value=>!value)}><SlidersHorizontal size={15}/></button>
    <div className="visual-editor-actions"><button type="button" disabled={!canUndo} onClick={onUndo}><Undo2 size={15}/><span>되돌리기</span></button><button type="button" onClick={onOpenAdmin}>ADMIN</button><button type="button" onClick={onCancel}><X size={15}/><span>취소</span></button><button type="button" className="is-primary" disabled={busy||uploading} onClick={onSave}><Save size={15}/><span>{busy?'저장 중':'저장'}</span></button></div>
   </div>
  </div>

  {panelOpen?<aside style={panelStyle} className={'visual-editor-panel is-'+panelSide+(panelPos?' is-free':'')}>
   <div className="visual-panel-head"><div className="visual-panel-drag-zone" onPointerDown={e=>beginChromeDrag(e,'panel')} onDoubleClick={()=>resetChrome('panel')}><Grip size={13}/><span><strong>{label}</strong><small>포트폴리오 페이지 전용 편집 · 메인과 독립</small></span></div><button type="button" onClick={()=>setPanelOpen(false)} aria-label="편집 패널 접기"><X size={15}/></button></div>
   <div className="visual-editor-tabs"><button className={tab==='layers'?'is-active':''} onClick={()=>setTab('layers')}><Layers3 size={13}/>레이어</button><button className={tab==='content'?'is-active':''} onClick={()=>setTab('content')}><Type size={13}/>편집</button><button className={tab==='layout'?'is-active':''} onClick={()=>setTab('layout')}><Maximize2 size={13}/>위치·크기</button><button className={tab==='style'?'is-active':''} onClick={()=>setTab('style')}><SlidersHorizontal size={13}/>스타일</button></div>

   {tab==='layers'&&<div className="visual-layers">
    <div className="visual-layer-heading"><span>이 포트폴리오 페이지의 레이어</span><div><button type="button" onClick={addDivider}><Plus size={13}/>구분선</button><button type="button" onClick={addWork}><Plus size={13}/>작품</button></div></div>
    <p className="visual-help">메인 화면 레이어를 복사하지 않고 현재 페이지의 실제 영역만 편집합니다. 숨김/복구도 이 포트폴리오에만 저장됩니다.</p>
    {sectionDefs.map(section=><div className="visual-layer-group" key={section.key}>
     <div className={'visual-layer-row '+(selection===section.key?'is-active':'')}><button className="visual-layer-select" onClick={()=>{setSelection(section.key);targetFor(section.key)?.scrollIntoView({behavior:'smooth',block:'center'})}}><span>{section.label}</span><small>{member.portfolioSections[section.key].visible?'VISIBLE':'HIDDEN'}</small></button><button className="visual-layer-icon" onClick={()=>patchSection(section.key,{visible:!member.portfolioSections[section.key].visible})}>{member.portfolioSections[section.key].visible?<Eye size={14}/>:<EyeOff size={14}/>}</button></div>
     {member.portfolioDividers.filter(divider=>divider.after===section.key).map(divider=><div className={'visual-layer-row is-child is-divider '+(selection===`divider:${divider.id}`?'is-active':'')} key={divider.id}><button className="visual-layer-select" onClick={()=>setSelection(`divider:${divider.id}`)}><span>구분선</span><small>{divider.visible?'VISIBLE':'HIDDEN'}</small></button><div className="visual-layer-mini-actions"><button onClick={()=>patchDivider(divider.id,{visible:!divider.visible})}>{divider.visible?<Eye size={12}/>:<EyeOff size={12}/>}</button><button className="is-danger" onClick={()=>deleteDivider(divider.id)}><Trash2 size={12}/></button></div></div>)}
     {section.key==='work'&&<div className="visual-layer-children">{member.works.map((work,index)=><div className={'visual-layer-row is-child '+(selection===`work:${index}`?'is-active':'')} key={index}><button className="visual-layer-select" onClick={()=>setSelection(`work:${index}`)}><span>{work?'작품 '+String(index+1).padStart(2,'0'):'빈 작품 '+String(index+1).padStart(2,'0')}</span><small>{member.portfolioWorkCategories[index]||'UNASSIGNED'}</small></button><div className="visual-layer-mini-actions"><button disabled={index===0} onClick={()=>moveWork(index,-1)}><ArrowUp size={12}/></button><button disabled={index===member.works.length-1} onClick={()=>moveWork(index,1)}><ArrowDown size={12}/></button><button className="is-danger" onClick={()=>removeWork(index)}><Trash2 size={12}/></button></div></div>)}</div>}
    </div>)}
   </div>}

   {tab==='content'&&<div className="visual-editor-context portfolio-editor-stack">
    {selectedDivider?<><div className="visual-editor-panel-head"><h3>구분선</h3><button className="is-danger" onClick={()=>deleteDivider(selectedDivider.id)}><Trash2 size={13}/>삭제</button></div><label className="visual-toggle"><span>구분선 표시</span><input type="checkbox" checked={selectedDivider.visible} onChange={e=>patchDivider(selectedDivider.id,{visible:e.target.checked})}/></label><label className="visual-field"><span>배치 영역</span><select value={selectedDivider.after} onChange={e=>patchDivider(selectedDivider.id,{after:e.target.value as PortfolioSectionKey})}>{sectionDefs.map(section=><option key={section.key} value={section.key}>{section.label}</option>)}</select></label></>:
     selectedWorkIndex>=0?<><div className="visual-editor-panel-head"><h3>작품 {selectedWorkIndex+1}</h3><div><button onClick={()=>duplicateWork(selectedWorkIndex)}><Copy size={13}/>복제</button><button className="is-danger" onClick={()=>removeWork(selectedWorkIndex)}><Trash2 size={13}/>삭제</button></div></div><FileInput label="이미지 / 영상 / 3D 교체" accept="image/*,video/*,.glb,.gltf" disabled={uploading} onFile={file=>uploadWork(selectedWorkIndex,file)}/><TextInput label="작품 카테고리" value={member.portfolioWorkCategories[selectedWorkIndex]||''} onChange={value=>{const next=[...member.portfolioWorkCategories];next[selectedWorkIndex]=value;patchMember({portfolioWorkCategories:next})}}/></>:
     selectedText?<><div className="visual-editor-panel-head"><h3>{textLabels[selectedText]}</h3><span className="visual-direct-badge">직접 편집</span></div><TextInput label="Text" value={textValue(selectedText)} multi={selectedText==='intro'} onChange={value=>patchText(selectedText,value)}/>{style&&<p className="visual-help">화면에서 글자를 직접 드래그할 수 있고 위치·크기/스타일 탭에서 더 세밀하게 조절할 수 있습니다.</p>}</>:
     <SectionContent section={selectedSection} config={config} member={member} patchConfig={patchConfig} patchMember={patchMember} uploadHero={uploadHero} uploading={uploading}/>}
   </div>}

   {tab==='layout'&&<div className="visual-editor-layout">
    {selectedDivider?<><div className="visual-editor-panel-head"><strong>구분선 위치·크기</strong><button onClick={()=>patchDivider(selectedDivider.id,{offsetY:0})}><RotateCcw size={13}/>Reset</button></div><NumberInput label="세로 위치" value={selectedDivider.offsetY} suffix="px" onChange={value=>patchDivider(selectedDivider.id,{offsetY:value})}/><Range label="너비" value={selectedDivider.width} min={10} max={100} step={1} suffix="%" onChange={value=>patchDivider(selectedDivider.id,{width:value})}/><Range label="좌우 여백" value={selectedDivider.inset} min={0} max={240} step={1} suffix="px" onChange={value=>patchDivider(selectedDivider.id,{inset:value})}/><Range label="위 여백" value={selectedDivider.marginTop} min={0} max={240} step={1} suffix="px" onChange={value=>patchDivider(selectedDivider.id,{marginTop:value})}/><Range label="아래 여백" value={selectedDivider.marginBottom} min={0} max={240} step={1} suffix="px" onChange={value=>patchDivider(selectedDivider.id,{marginBottom:value})}/></>:
     selectedText&&style?<><div className="visual-editor-panel-head"><strong>텍스트 위치·크기</strong><button onClick={()=>patchTextFields(selectedText,{x:0,y:0})}><RotateCcw size={13}/>Reset</button></div><NumberInput label="가로 위치" value={style.x} suffix="px" onChange={value=>patchTextFields(selectedText,{x:value})}/><NumberInput label="세로 위치" value={style.y} suffix="px" onChange={value=>patchTextFields(selectedText,{y:value})}/><Range label="글자 크기" value={style.size} min={8} max={180} step={1} suffix="px" onChange={value=>patchTextFields(selectedText,{size:value})}/></>:
     selectedWorkIndex>=0?<><div className="visual-editor-panel-head"><strong>작품 배치</strong></div><button className="visual-secondary-button" disabled={selectedWorkIndex===0} onClick={()=>moveWork(selectedWorkIndex,-1)}><ArrowUp size={13}/>앞으로 이동</button><button className="visual-secondary-button" disabled={selectedWorkIndex===member.works.length-1} onClick={()=>moveWork(selectedWorkIndex,1)}><ArrowDown size={13}/>뒤로 이동</button></>:
     <><div className="visual-editor-panel-head"><strong>영역 위치·크기</strong><button onClick={()=>patchSection(selectedSection,{x:0,y:0,scale:1,minHeight:0})}><RotateCcw size={13}/>Reset</button></div><div className="visual-axis-lock"><span>가로 위치</span><b>중앙 고정 · 0px</b><button onClick={()=>patchSection(selectedSection,{x:0})}>중앙 복귀</button></div><NumberInput label="세로 위치 · 제한 없음" value={selectedLayout.y} suffix="px" onChange={value=>patchSection(selectedSection,{x:0,y:value})}/><Range label="영역 크기" value={Math.round(selectedLayout.scale*100)} min={55} max={160} step={1} suffix="%" onChange={value=>patchSection(selectedSection,{scale:value/100})}/><Range label="영역 높이 · 0 = 자동" value={selectedLayout.minHeight} min={0} max={1800} step={10} suffix="px" onChange={value=>patchSection(selectedSection,{minHeight:value})}/>{selectedSection==='work'&&<><Range label="그리드 열 수" value={member.portfolioColumns} min={1} max={4} step={1} onChange={value=>patchMember({portfolioColumns:value})}/><Range label="미디어 간격" value={member.portfolioGap} min={4} max={48} step={1} suffix="px" onChange={value=>patchMember({portfolioGap:value})}/><Range label="그리드 너비" value={member.portfolioGridWidth} min={45} max={100} step={1} suffix="%" onChange={value=>patchMember({portfolioGridWidth:value})}/><Range label="슬라이드 높이" value={member.portfolioSliderHeight} min={320} max={1100} step={10} suffix="px" onChange={value=>patchMember({portfolioSliderHeight:value})}/></>}<button className="visual-editor-danger" onClick={()=>patchSection(selectedSection,{visible:false})}><EyeOff size={14}/> 이 영역 숨기기</button></>}
   </div>}

   {tab==='style'&&<div className="visual-style-panel">
    {selectedDivider?<><div className="visual-editor-panel-head"><strong>구분선 스타일</strong></div><Range label="두께" value={selectedDivider.thickness} min={.5} max={12} step={.5} suffix="px" onChange={value=>patchDivider(selectedDivider.id,{thickness:value})}/><Range label="불투명도" value={selectedDivider.opacity} min={0} max={100} step={1} suffix="%" onChange={value=>patchDivider(selectedDivider.id,{opacity:value})}/><ColorInput label="색상" value={selectedDivider.color||'#ffffff'} onChange={value=>patchDivider(selectedDivider.id,{color:value})}/><button className="visual-secondary-button" onClick={()=>patchDivider(selectedDivider.id,{color:''})}>색상 자동</button></>:
     selectedText&&style?<TextStyleEditor style={style} onChange={value=>patchTextFields(selectedText,value)}/>:
     selectedWorkIndex>=0?<><div className="visual-editor-panel-head"><strong>작품 카드 스타일</strong></div><Range label="모서리" value={member.portfolioRadius} min={0} max={48} step={1} suffix="px" onChange={value=>patchMember({portfolioRadius:value})}/><Range label="미디어 간격" value={member.portfolioGap} min={4} max={48} step={1} suffix="px" onChange={value=>patchMember({portfolioGap:value})}/></>:
     <><div className="visual-editor-panel-head"><strong>영역 스타일</strong></div><Range label="불투명도" value={selectedLayout.opacity} min={0} max={100} step={1} suffix="%" onChange={value=>patchSection(selectedSection,{opacity:value})}/><Range label="모서리" value={selectedLayout.radius} min={0} max={80} step={1} suffix="px" onChange={value=>patchSection(selectedSection,{radius:value})}/><ColorInput label="배경색" value={selectedLayout.background||'#000000'} onChange={value=>patchSection(selectedSection,{background:value})}/><button className="visual-secondary-button" onClick={()=>patchSection(selectedSection,{background:''})}>배경 자동 / 투명</button>{selectedSection==='nav'&&<><Range label="메뉴바 불투명도" value={config.navOpacity} min={0} max={100} step={1} suffix="%" onChange={value=>patchConfig('navOpacity',value)}/><Range label="글래스 블러" value={config.blur} min={0} max={50} step={1} suffix="px" onChange={value=>patchConfig('blur',value)}/></>}</>}
   </div>}
  </aside>:<button type="button" className={'visual-panel-reopen is-'+panelSide} onClick={()=>setPanelOpen(true)}><SlidersHorizontal size={16}/><span>편집 패널</span></button>}

  {rect&&<div className={'visual-selection-frame is-panel-'+panelSide+(labelInside?' is-label-inside':'')+(selectedText?' is-text-selection':'')+(selectedDivider?' is-divider-selection':'')} style={{left:rect.left,top:rect.top,width:rect.width,height:rect.height}}><span className="visual-selection-label">{label}</span>
   {selectedDivider&&<button type="button" className="visual-divider-drag-handle" onPointerDown={beginDividerMove} aria-label="구분선 세로 이동"><span/></button>}
   {!selectedDivider&&!selectedText&&selectedWorkIndex<0&&<button type="button" className="visual-move-handle" onPointerDown={beginSectionMove} aria-label="영역 세로 이동"><Grip size={16}/></button>}
   {selectedText&&style&&<button type="button" className="visual-move-handle is-text" onPointerDown={beginTextMove} aria-label="텍스트 이동"><Grip size={16}/></button>}
   {selectedText&&style&&<button type="button" className="visual-resize-handle is-text-size" onPointerDown={beginTextResize} aria-label="텍스트 크기 조절"><Type size={14}/></button>}
   {!selectedDivider&&!selectedText&&selectedWorkIndex<0&&<button type="button" className="visual-resize-handle" onPointerDown={beginSectionScale} aria-label="영역 크기 조절"><Maximize2 size={15}/></button>}
   {!selectedDivider&&!selectedText&&selectedWorkIndex<0&&<button type="button" className="visual-height-handle" onPointerDown={beginSectionHeight} aria-label="영역 높이 조절"><span/></button>}
  </div>}
 </div>;
}

function SectionContent({section,config,member,patchConfig,patchMember,uploadHero,uploading}:{section:PortfolioSectionKey;config:Config;member:TeamMember;patchConfig:<K extends keyof Config>(key:K,value:Config[K])=>void;patchMember:(value:Partial<TeamMember>)=>void;uploadHero:(file?:File)=>void;uploading:boolean}){
 if(section==='nav')return <><TextInput label="사이트 이름" value={config.name} onChange={value=>patchConfig('name',value)}/><TextInput label="Work 메뉴" value={config.navWorkLabel} onChange={value=>patchConfig('navWorkLabel',value)}/><TextInput label="About 메뉴" value={config.navAboutLabel} onChange={value=>patchConfig('navAboutLabel',value)}/><TextInput label="Team 메뉴" value={config.navTeamLabel} onChange={value=>patchConfig('navTeamLabel',value)}/><TextInput label="Contact 메뉴" value={config.navContactLabel} onChange={value=>patchConfig('navContactLabel',value)}/></>;
 if(section==='hero')return <><FileInput label="대표 이미지 / 영상 / 3D 교체" accept="image/*,video/*,.glb,.gltf" disabled={uploading} onFile={uploadHero}/>{member.photo&&<button className="visual-secondary-button" onClick={()=>patchMember({photo:''})}><Trash2 size={13}/>대표 미디어 제거</button>}</>;
 if(section==='index')return <><TextInput label="카테고리 인덱스 문구" value={member.portfolioTeamIndexLabel} onChange={value=>patchMember({portfolioTeamIndexLabel:value})}/><TextInput label="현재 포트폴리오 이름" value={member.name} onChange={value=>patchMember({name:value})}/></>;
 if(section==='work')return <><TextInput label="작품 영역 제목" value={member.portfolioTitle} onChange={value=>patchMember({portfolioTitle:value})}/><TextInput label="소개 문구" value={member.portfolioIntro} multi onChange={value=>patchMember({portfolioIntro:value})}/><TextInput label="세부 카테고리 · 쉼표로 구분" value={member.portfolioSubcategories.join(', ')} onChange={value=>patchMember({portfolioSubcategories:value.split(',').map(item=>item.trim()).filter(Boolean).slice(0,16)})}/><div className="portfolio-editor-row"><button className={member.portfolioLayout==='grid'?'is-active':''} onClick={()=>patchMember({portfolioLayout:'grid'})}>GRID</button><button className={member.portfolioLayout==='slider'?'is-active':''} onClick={()=>patchMember({portfolioLayout:'slider'})}>SLIDER</button></div></>;
 if(section==='footer')return <TextInput label="돌아가기 문구" value={member.portfolioReturnLabel} onChange={value=>patchMember({portfolioReturnLabel:value})}/>;
 return <p className="visual-help">이 영역의 텍스트는 연결된 앞/뒤 포트폴리오 이름을 자동으로 사용합니다. 위치·크기/스타일은 이 영역 자체에서 조절하세요.</p>;
}
function TextStyleEditor({style,onChange}:{style:{font:string;size:number;color:string;align:TextAlign;x:number;y:number};onChange:(value:Partial<{font:string;size:number;color:string;align:TextAlign;x:number;y:number}>)=>void}){
 return <><div className="visual-editor-panel-head"><strong>글자 스타일</strong></div><label className="visual-field"><span>폰트</span><select value={style.font||'Arial, Helvetica, sans-serif'} onChange={e=>onChange({font:e.target.value})}>{['Arial, Helvetica, sans-serif','Helvetica Neue, Arial, sans-serif','Georgia, serif','Times New Roman, serif','Verdana, sans-serif','Trebuchet MS, sans-serif','Courier New, monospace','system-ui, sans-serif'].map(font=><option key={font} value={font}>{font}</option>)}</select></label><Range label="크기" value={style.size} min={8} max={180} step={1} suffix="px" onChange={size=>onChange({size})}/><ColorInput label="색상" value={style.color||'#ffffff'} onChange={color=>onChange({color})}/><div className="visual-segmented">{(['left','center','right'] as TextAlign[]).map(align=><button key={align} className={style.align===align?'is-active':''} onClick={()=>onChange({align})}>{align.toUpperCase()}</button>)}</div></>;
}
function Range({label,value,min,max,step,suffix='',onChange}:{label:string;value:number;min:number;max:number;step:number;suffix?:string;onChange:(value:number)=>void}){return <label className="visual-range"><span>{label}<b>{Math.round(value*100)/100}{suffix}</b></span><input type="range" value={value} min={min} max={max} step={step} onChange={e=>onChange(Number(e.target.value))}/></label>}
function TextInput({label,value,onChange,multi=false}:{label:string;value:string;onChange:(value:string)=>void;multi?:boolean}){return <label className="visual-field"><span>{label}</span>{multi?<textarea value={value||''} onChange={e=>onChange(e.target.value)}/>:<input value={value||''} onChange={e=>onChange(e.target.value)}/>}</label>}
function NumberInput({label,value,suffix='',onChange}:{label:string;value:number;suffix?:string;onChange:(value:number)=>void}){return <label className="visual-number-field"><span>{label}<b>{suffix}</b></span><input type="number" value={numberValue(value)} onChange={e=>{const next=Number(e.target.value);if(Number.isFinite(next))onChange(next)}}/></label>}
function ColorInput({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}){return <label className="visual-color"><span>{label}</span><input type="color" value={/^#[0-9a-f]{6}$/i.test(value)?value:'#ffffff'} onChange={e=>onChange(e.target.value)}/><b>{value||'AUTO'}</b></label>}
function FileInput({label,accept,disabled,onFile}:{label:string;accept:string;disabled:boolean;onFile:(file?:File)=>void}){return <label className="visual-upload"><span>{label}</span><input type="file" accept={accept} disabled={disabled} onChange={e=>onFile(e.target.files?.[0])}/></label>}
