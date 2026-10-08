'use client';
import {useEffect,useMemo,useRef,useState,type CSSProperties,type Dispatch,type PointerEvent as ReactPointerEvent,type SetStateAction} from 'react';
import {ArrowLeft,ArrowRight,Copy,Eye,EyeOff,Grip,Layers3,Maximize2,PanelLeft,PanelRight,Plus,RotateCcw,Save,Settings2,SlidersHorizontal,Trash2,Type,Undo2,X} from 'lucide-react';
import type {Config,PortfolioDivider,PortfolioMediaRatio,PortfolioSectionKey,TeamMember,TextAlign} from './defaults';
import {uploadFile} from './media-upload';
import EditSiteFullSettings from './edit-site-full-settings';
import FontPicker from './font-picker';

type PanelTab='layers'|'content'|'layout'|'style'|'settings';
type Point={x:number;y:number};
type TextKey='siteName'|'navWorkLabel'|'navAboutLabel'|'navTeamLabel'|'navContactLabel'|'indexLabel'|'name'|'title'|'intro'|'footerReturn';
type Selection=PortfolioSectionKey|`text:${TextKey}`|`work:${number}`|`divider:${string}`;
type TextFields={font:keyof TeamMember;size:keyof TeamMember;color:keyof TeamMember;align:keyof TeamMember;x:keyof TeamMember;y:keyof TeamMember};
const textKeys:TextKey[]=['siteName','navWorkLabel','navAboutLabel','navTeamLabel','navContactLabel','indexLabel','name','title','intro','footerReturn'];
const isTextKey=(value:string):value is TextKey=>textKeys.includes(value as TextKey);
const fallbackSectionLayout={visible:true,x:0,y:0,scale:1,minHeight:0,opacity:100,background:'',radius:0};
const mediaRatioOptions:{value:PortfolioMediaRatio;label:string}[]=[{value:'auto',label:'원본 비율 / 자동'},{value:'16:9',label:'16:9'},{value:'4:5',label:'4:5'},{value:'4:3',label:'4:3'},{value:'3:2',label:'3:2'},{value:'1:1',label:'1:1'},{value:'9:16',label:'9:16'}];

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

export default function PortfolioVisualEditor({config,memberId,setConfig,onSave,onCancel,onOpenAdmin,onUndo,canUndo,busy,setBusy,notify,onThemeChange}:{
 config:Config;memberId:string;setConfig:Dispatch<SetStateAction<Config>>;
 onSave:()=>void|Promise<void>;onCancel:()=>void;onOpenAdmin:()=>void;onUndo:()=>void;canUndo:boolean;busy:boolean;
 setBusy:(value:boolean)=>void;notify:(value:string)=>void;onThemeChange?:(value:string)=>void;
}){
 const [selection,setSelection]=useState<Selection>('work');
 const [rect,setRect]=useState<DOMRect|null>(null),[uploading,setUploading]=useState(false),[tab,setTab]=useState<PanelTab>('layers');
 const [panelSide,setPanelSide]=useState<'left'|'right'>('right'),[panelOpen,setPanelOpen]=useState(true);
 const [toolbarPos,setToolbarPos]=useState<Point|null>(()=>pointFromStorage('viivii-visual-toolbar-pos'));
 const [panelPos,setPanelPos]=useState<Point|null>(()=>pointFromStorage('viivii-visual-panel-pos'));
 const [inlineEditing,setInlineEditing]=useState<TextKey|null>(null);
 const inlineOriginal=useRef('');
 const sectionDrag=useRef<{y:number;base:number}|null>(null),sectionScale=useRef<{x:number;y:number;base:number}|null>(null),sectionHeight=useRef<{y:number;base:number}|null>(null);
 const textDrag=useRef<{x:number;y:number;baseX:number;baseY:number}|null>(null),textResize=useRef<{x:number;y:number;base:number}|null>(null),dividerDrag=useRef<{y:number;base:number}|null>(null);
 const member=useMemo(()=>config.teamMembers.find(item=>item.id===memberId)||null,[config.teamMembers,memberId]);
 const layoutMaster=useMemo(()=>config.teamMembers.find(item=>item.visible)||member,[config.teamMembers,member]);

 const patchConfig=<K extends keyof Config>(key:K,value:Config[K])=>setConfig(current=>({...current,[key]:value}));
 const sharedPortfolioLayoutKeys=new Set<keyof TeamMember>([
  'portfolioNameX','portfolioNameY','portfolioNameSize',
  'portfolioTitleX','portfolioTitleY','portfolioTitleSize',
  'portfolioIntroX','portfolioIntroY','portfolioIntroSize',
  'portfolioUtilityX','portfolioUtilityY','portfolioUtilitySize',
  'portfolioReturnX','portfolioReturnY',
  'portfolioSliderWidth','portfolioSliderHeight',
  'portfolioGridWidth','portfolioColumns','portfolioGap','portfolioRadius'
 ]);
 const patchMember=(value:Partial<TeamMember>)=>setConfig(current=>{
  const sharedPatch:Partial<TeamMember>={};
  for(const [key,next] of Object.entries(value) as [keyof TeamMember,TeamMember[keyof TeamMember]][]){
   if(sharedPortfolioLayoutKeys.has(key))(sharedPatch as any)[key]=next;
  }
  const hasShared=Object.keys(sharedPatch).length>0;
  return {...current,teamMembers:(current.teamMembers||[]).map(item=>{
   if(item.id===memberId)return {...item,...value};
   return hasShared?{...item,...sharedPatch}:item;
  })};
 });
 if(!member)return null;

 const portfolioDividers=Array.isArray(member.portfolioDividers)?member.portfolioDividers:[];
 const sectionLayout=(key:PortfolioSectionKey)=>{
  const own=member.portfolioSections?.[key]||fallbackSectionLayout;
  if((key==='index'||key==='work')&&layoutMaster){
   const shared=layoutMaster.portfolioSections?.[key]||own;
   return {...own,x:shared.x,y:shared.y,scale:shared.scale,minHeight:shared.minHeight};
  }
  return own;
 };
 const rawTextKey=selection.startsWith('text:')?selection.slice(5):'';
 const selectedText=isTextKey(rawTextKey)?rawTextKey:null;
 const selectedWorkIndex=selection.startsWith('work:')&&Number.isFinite(Number(selection.slice(5)))?Number(selection.slice(5)):-1;
 const selectedDivider=selection.startsWith('divider:')?portfolioDividers.find(item=>item.id===selection.slice(8))||null:null;
 const selectedSection=(sectionDefs.some(item=>item.key===selection)?selection:selectedText?textSection[selectedText]:selection.startsWith('work:')?'work':selectedDivider?.after||'work') as PortfolioSectionKey;
 const selectedLayout=sectionLayout(selectedSection);

 const targetFor=(value:Selection=selection)=>{
  if(value.startsWith('work:'))return document.querySelector<HTMLElement>(`[data-portfolio-work-index="${CSS.escape(value.slice(5))}"]`);
  if(value.startsWith('divider:'))return document.querySelector<HTMLElement>(`[data-portfolio-divider-id="${CSS.escape(value.slice(8))}"]`);
  if(value.startsWith('text:'))return document.querySelector<HTMLElement>(`[data-portfolio-edit="${CSS.escape(value.slice(5))}"]`);
  return document.querySelector<HTMLElement>(`[data-portfolio-section="${CSS.escape(value)}"]`);
 };
 const refresh=()=>{const target=targetFor();setRect(target?target.getBoundingClientRect():null)};
 useEffect(()=>{let raf=0;const sync=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(refresh)};sync();window.addEventListener('scroll',sync,{passive:true});window.addEventListener('resize',sync);return()=>{cancelAnimationFrame(raf);window.removeEventListener('scroll',sync);window.removeEventListener('resize',sync)}},[selection,config]);
 useEffect(()=>{if(selection.startsWith('text:')||selection.startsWith('work:')||selection.startsWith('divider:'))setTab('content')},[selection]);
 useEffect(()=>{if(selection.startsWith('text:')&&!isTextKey(selection.slice(5)))setSelection('work')},[selection]);
 useEffect(()=>{if(selectedWorkIndex>=0&&selectedWorkIndex>=(member.works||[]).length)setSelection('work')},[selectedWorkIndex,member.works]);

 const patchSection=(key:PortfolioSectionKey,value:Partial<TeamMember['portfolioSections'][PortfolioSectionKey]>)=>setConfig(current=>{
  const syncGeometry=key==='index'||key==='work';
  const geometry:Partial<TeamMember['portfolioSections'][PortfolioSectionKey]>={};
  if(syncGeometry){
   for(const field of ['x','y','scale','minHeight'] as const)if(value[field]!==undefined)geometry[field]=value[field] as never;
  }
  const hasGeometry=Object.keys(geometry).length>0;
  return {...current,teamMembers:(current.teamMembers||[]).map(item=>{
   const sections=item.portfolioSections||member.portfolioSections;
   const base={...fallbackSectionLayout,...(sections?.[key]||{})};
   if(item.id===memberId)return {...item,portfolioSections:{...sections,[key]:{...base,...value}} as TeamMember['portfolioSections']};
   if(syncGeometry&&hasGeometry)return {...item,portfolioSections:{...sections,[key]:{...base,...geometry}} as TeamMember['portfolioSections']};
   return item;
  })};
 });
 const patchDivider=(id:string,value:Partial<PortfolioDivider>)=>patchMember({portfolioDividers:portfolioDividers.map(item=>item.id===id?{...item,...value}:item)});
 const deleteDivider=(id:string)=>{patchMember({portfolioDividers:portfolioDividers.filter(item=>item.id!==id)});setSelection(selectedSection);setTab('layers')};
 const addDivider=()=>{const id='portfolio-divider-'+Date.now();patchMember({portfolioDividers:[...portfolioDividers,{id,after:selectedSection,visible:true,width:100,thickness:1,opacity:24,inset:0,marginTop:0,marginBottom:0,offsetY:0,color:''}]});setSelection(`divider:${id}`);setTab('content')};

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
  const fields=textFields[key];
  if(fields){
   const sharedPosition=layoutMaster&&(key==='name'||key==='title'||key==='intro'||key==='indexLabel'||key==='footerReturn')?layoutMaster:member;
   return {font:String(member[fields.font]||''),size:numberValue(sharedPosition[fields.size]),color:String(member[fields.color]||''),align:(member[fields.align]||'left') as TextAlign,x:numberValue(sharedPosition[fields.x]),y:numberValue(sharedPosition[fields.y])};
  }
  if(key==='siteName'){const s=config.textStyles.navBrand;return {font:s.font,size:s.size,color:s.color,align:s.align,x:s.x,y:s.y}}
  if(key==='navWorkLabel'||key==='navAboutLabel'||key==='navTeamLabel'||key==='navContactLabel'){const s=config.textStyles.navMenu;return {font:s.font,size:s.size,color:s.color,align:s.align,x:s.x,y:s.y}}
  return null;
 };
 const patchPortfolioTextStyle=(key:TextKey,value:Partial<{font:string;size:number;color:string;align:TextAlign;x:number;y:number}>)=>{
  const fields=textFields[key];if(fields)return patchTextFields(key,value);
  const styleKey=key==='siteName'?'navBrand':(key==='navWorkLabel'||key==='navAboutLabel'||key==='navTeamLabel'||key==='navContactLabel')?'navMenu':null;
  if(!styleKey)return;
  setConfig(current=>({...current,textStyles:{...current.textStyles,[styleKey]:{...current.textStyles[styleKey],...value}}}));
 };
 const stopInlineEdit=(commit=true)=>{
  const key=inlineEditing;if(!key)return;
  const el=targetFor(`text:${key}` as Selection);
  if(el){
   if(commit){let value=(el.innerText||el.textContent||'').replace(/\r/g,'').replace(/\u00a0/g,' ');if(key!=='intro')value=value.replace(/\n+/g,' ');patchText(key,value)}
   else el.innerText=inlineOriginal.current;
   el.contentEditable='false';el.removeAttribute('data-inline-editing');el.removeAttribute('spellcheck');
  }
  setInlineEditing(null);
 };
 const startInlineEdit=(key:TextKey,clientX?:number,clientY?:number)=>{
  const el=targetFor(`text:${key}` as Selection);if(!el)return;
  if(inlineEditing&&inlineEditing!==key)stopInlineEdit(true);
  setSelection(`text:${key}`);setTab('content');inlineOriginal.current=textValue(key);setInlineEditing(key);
  el.contentEditable='true';el.spellcheck=false;el.dataset.inlineEditing='true';
  requestAnimationFrame(()=>{
   el.focus({preventScroll:true});
   const doc=document as Document&{caretPositionFromPoint?:(x:number,y:number)=>{offsetNode:Node;offset:number}|null;caretRangeFromPoint?:(x:number,y:number)=>Range|null};
   const selectionApi=window.getSelection();if(!selectionApi)return;let range:Range|null=null;
   if(clientX!==undefined&&clientY!==undefined){const caret=doc.caretPositionFromPoint?.(clientX,clientY);if(caret){range=document.createRange();range.setStart(caret.offsetNode,caret.offset);range.collapse(true)}else range=doc.caretRangeFromPoint?.(clientX,clientY)||null}
   if(!range){range=document.createRange();range.selectNodeContents(el);range.collapse(false)}
   selectionApi.removeAllRanges();selectionApi.addRange(range);
  });
 };

 const uploadHero=async(file?:File)=>{if(!file)return;try{setUploading(true);patchMember({photo:await uploadFile(file)})}finally{setUploading(false)}};
 const workTitles=()=>[...(member.portfolioWorkTitles||member.works.map(()=>member.name||'Portfolio'))];
 const workInfo=()=>[...(member.portfolioWorkInfo||member.works.map(()=>''))];
 const workCredits=()=>[...(member.portfolioWorkCredits||member.works.map(()=>member.portfolioCredits||''))];
 const patchWorkText=(index:number,key:'portfolioWorkTitles'|'portfolioWorkInfo'|'portfolioWorkCredits',value:string)=>{const next=key==='portfolioWorkTitles'?workTitles():key==='portfolioWorkInfo'?workInfo():workCredits();while(next.length<member.works.length)next.push(key==='portfolioWorkTitles'?(member.name||'Portfolio'):key==='portfolioWorkCredits'?(member.portfolioCredits||''):'');next[index]=value;patchMember({[key]:next} as Partial<TeamMember>)};
 const uploadWork=async(index:number,file?:File)=>{if(!file)return;try{setUploading(true);const url=await uploadFile(file);const works=[...member.works];works[index]=url;const ratios=[...(member.portfolioWorkRatios||member.works.map(()=>'auto' as PortfolioMediaRatio))];while(ratios.length<works.length)ratios.push('auto');ratios[index]='auto';patchMember({works,portfolioWorkRatios:ratios});notify('작품을 교체했습니다. 텍스트 정보는 그대로 유지되고 비율만 원본 비율로 초기화됩니다.')}catch(e){notify((e as Error).message)}finally{setUploading(false)}};
 const uploadNewWorks=async(files:FileList|null)=>{if(!files?.length)return;try{setUploading(true);const urls:string[]=[];for(const file of Array.from(files))urls.push(await uploadFile(file));const fallback=member.portfolioSubcategories[0]||'All';const start=member.works.length;patchMember({works:[...member.works,...urls],portfolioWorkCategories:[...member.portfolioWorkCategories,...urls.map(()=>fallback)],portfolioWorkTitles:[...workTitles(),...urls.map(()=>member.name||'Portfolio')],portfolioWorkInfo:[...workInfo(),...urls.map(()=>'')],portfolioWorkCredits:[...workCredits(),...urls.map(()=>member.portfolioCredits||'')],portfolioWorkRatios:[...(member.portfolioWorkRatios||member.works.map(()=>'auto' as PortfolioMediaRatio)),...urls.map(()=>'auto' as PortfolioMediaRatio)]});setSelection(`work:${start}`);setTab('content');notify(`${urls.length}개 작품을 추가했습니다.`)}catch(e){notify((e as Error).message)}finally{setUploading(false)}};
 const setWorkRatio=(index:number,ratio:PortfolioMediaRatio)=>{const ratios=[...(member.portfolioWorkRatios||member.works.map(()=>'auto' as PortfolioMediaRatio))];while(ratios.length<member.works.length)ratios.push('auto');ratios[index]=ratio;patchMember({portfolioWorkRatios:ratios})};
 const removeWork=(index:number)=>{patchMember({works:member.works.filter((_,i)=>i!==index),portfolioWorkCategories:member.portfolioWorkCategories.filter((_,i)=>i!==index),portfolioWorkTitles:workTitles().filter((_,i)=>i!==index),portfolioWorkInfo:workInfo().filter((_,i)=>i!==index),portfolioWorkCredits:workCredits().filter((_,i)=>i!==index),portfolioWorkRatios:(member.portfolioWorkRatios||member.works.map(()=>'auto' as PortfolioMediaRatio)).filter((_,i)=>i!==index)});setSelection('work');setTab('layers')};
 const duplicateWork=(index:number)=>{const works=[...member.works],categories=[...member.portfolioWorkCategories],titles=workTitles(),info=workInfo(),credits=workCredits(),ratios=[...(member.portfolioWorkRatios||member.works.map(()=>'auto' as PortfolioMediaRatio))];works.splice(index+1,0,works[index]||'');categories.splice(index+1,0,categories[index]||'');titles.splice(index+1,0,titles[index]||member.name||'Portfolio');info.splice(index+1,0,info[index]||'');credits.splice(index+1,0,credits[index]||'');ratios.splice(index+1,0,ratios[index]||'auto');patchMember({works,portfolioWorkCategories:categories,portfolioWorkTitles:titles,portfolioWorkInfo:info,portfolioWorkCredits:credits,portfolioWorkRatios:ratios});setSelection(`work:${index+1}`)};
 const addWork=()=>{const index=member.works.length;patchMember({works:[...member.works,''],portfolioWorkCategories:[...member.portfolioWorkCategories,''],portfolioWorkTitles:[...workTitles(),member.name||'Portfolio'],portfolioWorkInfo:[...workInfo(),''],portfolioWorkCredits:[...workCredits(),member.portfolioCredits||''],portfolioWorkRatios:[...(member.portfolioWorkRatios||member.works.map(()=>'auto' as PortfolioMediaRatio)),'auto']});setSelection(`work:${index}`);setTab('content')};
 const moveWork=(index:number,dir:number)=>{const target=index+dir;if(target<0||target>=member.works.length)return;const works=[...member.works],categories=[...member.portfolioWorkCategories],titles=workTitles(),info=workInfo(),credits=workCredits(),ratios=[...(member.portfolioWorkRatios||member.works.map(()=>'auto' as PortfolioMediaRatio))];while(ratios.length<works.length)ratios.push('auto');[works[index],works[target]]=[works[target],works[index]];[categories[index],categories[target]]=[categories[target],categories[index]];[titles[index],titles[target]]=[titles[target],titles[index]];[info[index],info[target]]=[info[target],info[index]];[credits[index],credits[target]]=[credits[target],credits[index]];[ratios[index],ratios[target]]=[ratios[target],ratios[index]];patchMember({works,portfolioWorkCategories:categories,portfolioWorkTitles:titles,portfolioWorkInfo:info,portfolioWorkCredits:credits,portfolioWorkRatios:ratios});setSelection(`work:${target}`)};

 const beginSectionMove=(e:ReactPointerEvent<HTMLButtonElement>)=>{e.preventDefault();e.stopPropagation();sectionDrag.current={y:e.clientY,base:selectedLayout.y};const move=(event:PointerEvent)=>{const start=sectionDrag.current;if(!start)return;patchSection(selectedSection,{x:0,y:Math.round(start.base+event.clientY-start.y)})};const up=()=>{sectionDrag.current=null;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true})};
 const beginSectionScale=(e:ReactPointerEvent<HTMLButtonElement>)=>{e.preventDefault();e.stopPropagation();sectionScale.current={x:e.clientX,y:e.clientY,base:selectedLayout.scale};const move=(event:PointerEvent)=>{const start=sectionScale.current;if(!start)return;patchSection(selectedSection,{x:0,scale:Math.round(clamp(start.base+((event.clientX-start.x)+(event.clientY-start.y))/720,.55,1.6)*100)/100})};const up=()=>{sectionScale.current=null;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true})};
 const beginSectionHeight=(e:ReactPointerEvent<HTMLButtonElement>)=>{e.preventDefault();e.stopPropagation();sectionHeight.current={y:e.clientY,base:selectedLayout.minHeight||rect?.height||0};const move=(event:PointerEvent)=>{const start=sectionHeight.current;if(!start)return;patchSection(selectedSection,{minHeight:clamp(Math.round(start.base+event.clientY-start.y),0,1800)})};const up=()=>{sectionHeight.current=null;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true})};
 const beginTextMove=(e:ReactPointerEvent<HTMLButtonElement>)=>{if(!selectedText)return;const style=currentTextStyle(selectedText);if(!style)return;e.preventDefault();e.stopPropagation();textDrag.current={x:e.clientX,y:e.clientY,baseX:style.x,baseY:style.y};const move=(event:PointerEvent)=>{const start=textDrag.current;if(!start)return;patchTextFields(selectedText,{x:Math.round(start.baseX+event.clientX-start.x),y:Math.round(start.baseY+event.clientY-start.y)})};const up=()=>{textDrag.current=null;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true})};
 const beginTextResize=(e:ReactPointerEvent<HTMLButtonElement>)=>{if(!selectedText)return;const style=currentTextStyle(selectedText);if(!style)return;e.preventDefault();e.stopPropagation();textResize.current={x:e.clientX,y:e.clientY,base:style.size};const move=(event:PointerEvent)=>{const start=textResize.current;if(!start)return;patchTextFields(selectedText,{size:clamp(Math.round((start.base+((event.clientX-start.x)+(event.clientY-start.y))*.25)*10)/10,8,180)})};const up=()=>{textResize.current=null;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true})};
 const beginDividerMove=(e:ReactPointerEvent<HTMLButtonElement>)=>{if(!selectedDivider)return;e.preventDefault();e.stopPropagation();dividerDrag.current={y:e.clientY,base:selectedDivider.offsetY||0};const move=(event:PointerEvent)=>{const start=dividerDrag.current;if(!start)return;patchDivider(selectedDivider.id,{offsetY:Math.round(start.base+event.clientY-start.y)})};const up=()=>{dividerDrag.current=null;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true})};

 useEffect(()=>{
  if(!inlineEditing)return;
  const el=targetFor(`text:${inlineEditing}` as Selection);if(!el)return;
  const onBlur=()=>stopInlineEdit(true);
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();stopInlineEdit(false);return}if(event.key==='Enter'&&!event.shiftKey&&inlineEditing!=='intro'){event.preventDefault();event.stopPropagation();stopInlineEdit(true);return}if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();event.stopPropagation();stopInlineEdit(true)}};
  el.addEventListener('blur',onBlur);el.addEventListener('keydown',onKey);
  return()=>{el.removeEventListener('blur',onBlur);el.removeEventListener('keydown',onKey)};
 },[inlineEditing,member,config]);
 useEffect(()=>{
  const onKey=(event:KeyboardEvent)=>{const target=event.target as HTMLElement|null;if(target?.closest('input,textarea,select,[contenteditable="true"]'))return;if(selectedText&&(event.key==='Enter'||event.key==='F2')){event.preventDefault();startInlineEdit(selectedText);return}if(selectedText&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){const current=currentTextStyle(selectedText);if(!current)return;event.preventDefault();const step=event.shiftKey?10:1;if(event.key==='ArrowLeft')patchPortfolioTextStyle(selectedText,{x:current.x-step});if(event.key==='ArrowRight')patchPortfolioTextStyle(selectedText,{x:current.x+step});if(event.key==='ArrowUp')patchPortfolioTextStyle(selectedText,{y:current.y-step});if(event.key==='ArrowDown')patchPortfolioTextStyle(selectedText,{y:current.y+step})}};
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
 },[selectedText,member,config,inlineEditing]);
 useEffect(()=>{
  const down=(event:PointerEvent)=>{
   if(event.button!==0)return;
   const target=event.target as HTMLElement|null;if(!target||target.closest('[data-visual-editor="true"]'))return;
   const divider=target.closest<HTMLElement>('[data-portfolio-divider-id]');
   if(divider){const id=divider.dataset.portfolioDividerId||'';setSelection(`divider:${id}`);event.preventDefault();event.stopPropagation();return}
   const work=target.closest<HTMLElement>('[data-portfolio-work-index]');
   if(work?.dataset.portfolioWorkIndex!==undefined){setSelection(`work:${work.dataset.portfolioWorkIndex}` as Selection);event.preventDefault();event.stopPropagation();return}
   const text=target.closest<HTMLElement>('[data-portfolio-edit]');
   if(text?.dataset.portfolioEdit){
    const rawKey=text.dataset.portfolioEdit;
    if(!isTextKey(rawKey)){
     const section=text.closest<HTMLElement>('[data-portfolio-section]');
     const sectionKey=section?.dataset.portfolioSection as PortfolioSectionKey|undefined;
     setSelection(sectionDefs.some(item=>item.key===sectionKey)?sectionKey!:'work');
     event.preventDefault();event.stopPropagation();return;
    }
    const key=rawKey;setSelection(`text:${key}`);if(inlineEditing===key)return;event.preventDefault();event.stopPropagation();const current=currentTextStyle(key),sx=event.clientX,sy=event.clientY,startScroll=window.scrollY;let active=false;const move=(ev:PointerEvent)=>{const dx=ev.clientX-sx,dy=ev.clientY-sy+(window.scrollY-startScroll);if(!active&&Math.hypot(dx,dy)<5)return;if(!current)return;active=true;document.documentElement.classList.add('visual-direct-dragging');patchPortfolioTextStyle(key,{x:Math.round(current.x+dx),y:Math.round(current.y+dy)});if(ev.clientY<54)window.scrollBy(0,-18);else if(ev.clientY>window.innerHeight-54)window.scrollBy(0,18)};const up=(ev:PointerEvent)=>{document.documentElement.classList.remove('visual-direct-dragging');window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);if(active)refresh();else startInlineEdit(key,ev.clientX,ev.clientY)};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});return}
   const section=target.closest<HTMLElement>('[data-portfolio-section]');const key=section?.dataset.portfolioSection as PortfolioSectionKey|undefined;
   if(!section||!key)return;setSelection(key);
   if(target.closest('button,a,input,textarea,select,video,model-viewer'))return
   event.preventDefault();event.stopPropagation();const sy=event.clientY,startScroll=window.scrollY,base=sectionLayout(key).y;let active=false;
   const move=(ev:PointerEvent)=>{const dy=ev.clientY-sy+(window.scrollY-startScroll);if(!active&&Math.abs(dy)<3)return;active=true;document.documentElement.classList.add('visual-direct-dragging');patchSection(key,{x:0,y:Math.round(base+dy)});if(ev.clientY<54)window.scrollBy(0,-18);else if(ev.clientY>window.innerHeight-54)window.scrollBy(0,18)};
   const up=()=>{document.documentElement.classList.remove('visual-direct-dragging');window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refresh()};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
  };
  document.addEventListener('pointerdown',down,true);return()=>{document.removeEventListener('pointerdown',down,true);document.documentElement.classList.remove('visual-direct-dragging')};
 },[member,selection]);

 const beginChromeDrag=(e:ReactPointerEvent<HTMLElement>,kind:'toolbar'|'panel')=>{
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
  const move=(ev:PointerEvent)=>{
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

 const label=tab==='settings'?'사이트 설정':selectedDivider?'구분선':selectedText?textLabels[selectedText]:selectedWorkIndex>=0?'작품 미디어':sectionDefs.find(item=>item.key===selectedSection)?.label||'포트폴리오';
 const toolbarBottom=!toolbarPos&&!!rect&&rect.top<112&&window.innerWidth>820,labelInside=!!rect&&rect.top<28;
 const toolbarStyle=toolbarPos?{'--ve-toolbar-x':toolbarPos.x+'px','--ve-toolbar-y':toolbarPos.y+'px'} as CSSProperties:undefined;
 const panelStyle=panelPos?{'--ve-panel-x':panelPos.x+'px','--ve-panel-y':panelPos.y+'px'} as CSSProperties:undefined;
 const style=currentTextStyle(selectedText||'siteName');
 const quickToolbarStyle=rect&&typeof window!=='undefined'?{left:Math.max(8,Math.min(window.innerWidth-360,rect.left+rect.width/2-176)),top:Math.max(8,rect.top>74?rect.top-52:rect.bottom+10)} as CSSProperties:undefined;

 return <div className={'visual-editor-ui portfolio-visual-editor is-panel-'+panelSide} data-visual-editor="true">
  <div style={toolbarStyle} className={'visual-editor-topbar '+(toolbarPos?'is-free ':toolbarBottom?'is-bottom ':'is-top ')} onPointerDown={e=>beginChromeDrag(e,'toolbar')}>
   <div className="visual-editor-title visual-editor-drag-zone" onDoubleClick={()=>resetChrome('toolbar')}><Grip size={14}/><Settings2 size={16}/><strong>VISUAL EDIT / PORTFOLIO</strong><span>현재 페이지 전용 레이어 · 직접 선택 · 드래그 · 크기 · 스타일</span></div>
   <div className="visual-editor-toolbar-tools">
    <button type="button" className="visual-toolbar-icon" title="패널 위치 전환" onClick={()=>{setPanelPos(null);setPanelSide(value=>value==='right'?'left':'right')}}>{panelSide==='right'?<PanelLeft size={15}/>:<PanelRight size={15}/>}</button>
    <button type="button" className="visual-toolbar-icon" title={panelOpen?'패널 접기':'패널 열기'} onClick={()=>setPanelOpen(value=>!value)}><SlidersHorizontal size={15}/></button>
    <div className="visual-editor-actions"><button type="button" disabled={!canUndo} onClick={onUndo}><Undo2 size={15}/><span>되돌리기</span></button><button type="button" onClick={onOpenAdmin}>ADMIN</button><button type="button" onClick={onCancel}><X size={15}/><span>취소</span></button><button type="button" className="is-primary" disabled={busy||uploading} onClick={onSave}><Save size={15}/><span>{busy?'저장 중':'저장'}</span></button></div>
   </div>
  </div>

  {panelOpen?<aside style={panelStyle} className={'visual-editor-panel is-'+panelSide+(panelPos?' is-free':'')+(tab==='settings'?' is-full-settings':'')} onPointerDown={e=>beginChromeDrag(e,'panel')}>
   <div className="visual-panel-head"><div className="visual-panel-drag-zone" onDoubleClick={()=>resetChrome('panel')}><Grip size={13}/><span><strong>{label}</strong><small>포트폴리오 페이지 전용 편집 · 메인과 독립</small></span></div><button type="button" onClick={()=>setPanelOpen(false)} aria-label="편집 패널 접기"><X size={15}/></button></div>
   <div className="visual-editor-primary-tabs" role="tablist" aria-label="Edit Site 주요 메뉴"><button className={tab==='layers'?'is-active':''} onClick={()=>setTab('layers')}><Layers3 size={14}/><span>페이지 구성</span></button><button className={tab==='content'||tab==='layout'||tab==='style'?'is-active':''} onClick={()=>setTab('content')}><Type size={14}/><span>선택 항목</span></button><button className={tab==='settings'?'is-active':''} onClick={()=>setTab('settings')}><Settings2 size={14}/><span>사이트 설정</span></button></div>
   {(tab==='content'||tab==='layout'||tab==='style')&&<div className="visual-editor-subtabs" role="tablist" aria-label="선택 항목 편집"><button className={tab==='content'?'is-active':''} onClick={()=>setTab('content')}>내용</button><button className={tab==='layout'?'is-active':''} onClick={()=>setTab('layout')}><Maximize2 size={12}/>배치</button><button className={tab==='style'?'is-active':''} onClick={()=>setTab('style')}><SlidersHorizontal size={12}/>디자인</button></div>}

   {tab==='layers'&&<div className="visual-layers">
    <div className="visual-layer-heading"><span>이 포트폴리오 페이지의 영역</span><div><button type="button" onClick={addDivider}><Plus size={13}/>구분선</button><button type="button" onClick={addWork}><Plus size={13}/>작품</button></div></div>
    <p className="visual-help">현재 포트폴리오에서 실제로 보이는 영역만 관리합니다. 영역을 고른 뒤 ‘선택 항목’에서 내용·배치·디자인을 편집하세요. 숨김과 복구는 이 포트폴리오에만 적용됩니다.</p>
    {sectionDefs.map(section=><div className="visual-layer-group" key={section.key}>
     <div className={'visual-layer-row '+(selection===section.key?'is-active':'')}><button className="visual-layer-select" onClick={()=>{setSelection(section.key);targetFor(section.key)?.scrollIntoView({behavior:'smooth',block:'center'})}}><span>{section.label}</span><small>{sectionLayout(section.key).visible?'VISIBLE':'HIDDEN'}</small></button><button className="visual-layer-icon" onClick={()=>patchSection(section.key,{visible:!sectionLayout(section.key).visible})}>{sectionLayout(section.key).visible?<Eye size={14}/>:<EyeOff size={14}/>}</button></div>
     {portfolioDividers.filter(divider=>divider.after===section.key).map(divider=><div className={'visual-layer-row is-child is-divider '+(selection===`divider:${divider.id}`?'is-active':'')} key={divider.id}><button className="visual-layer-select" onClick={()=>setSelection(`divider:${divider.id}`)}><span>구분선</span><small>{divider.visible?'VISIBLE':'HIDDEN'}</small></button><div className="visual-layer-mini-actions"><button onClick={()=>patchDivider(divider.id,{visible:!divider.visible})}>{divider.visible?<Eye size={12}/>:<EyeOff size={12}/>}</button><button className="is-danger" onClick={()=>deleteDivider(divider.id)}><Trash2 size={12}/></button></div></div>)}
     {section.key==='work'&&<details className="visual-layer-details"><summary><span>작품 세부 관리</span><small>{member.works.length}개</small></summary><div className="visual-layer-children">{member.works.map((work,index)=><div className={'visual-layer-row is-child '+(selection===`work:${index}`?'is-active':'')} key={index}><button className="visual-layer-select" onClick={()=>setSelection(`work:${index}`)}><span>{work?'작품 '+String(index+1).padStart(2,'0'):'빈 작품 '+String(index+1).padStart(2,'0')}</span><small>{member.portfolioWorkCategories[index]||'미분류'}</small></button><div className="visual-layer-mini-actions"><button disabled={index===0} title="왼쪽으로 이동" onClick={()=>moveWork(index,-1)}><ArrowLeft size={12}/></button><button disabled={index===member.works.length-1} title="오른쪽으로 이동" onClick={()=>moveWork(index,1)}><ArrowRight size={12}/></button><button className="is-danger" onClick={()=>removeWork(index)}><Trash2 size={12}/></button></div></div>)}</div></details>}
    </div>)}
   </div>}

   {tab==='content'&&<div className="visual-editor-context portfolio-editor-stack">
    {selectedDivider?<><div className="visual-editor-panel-head"><h3>구분선</h3><button className="is-danger" onClick={()=>deleteDivider(selectedDivider.id)}><Trash2 size={13}/>삭제</button></div><label className="visual-toggle"><span>구분선 표시</span><input type="checkbox" checked={selectedDivider.visible} onChange={e=>patchDivider(selectedDivider.id,{visible:e.target.checked})}/></label><label className="visual-field"><span>배치 영역</span><select value={selectedDivider.after} onChange={e=>patchDivider(selectedDivider.id,{after:e.target.value as PortfolioSectionKey})}>{sectionDefs.map(section=><option key={section.key} value={section.key}>{section.label}</option>)}</select></label></>:
     selectedWorkIndex>=0?<><div className="visual-editor-panel-head"><h3>작품 {selectedWorkIndex+1}</h3><div><button onClick={()=>duplicateWork(selectedWorkIndex)}><Copy size={13}/>복제</button><button className="is-danger" onClick={()=>removeWork(selectedWorkIndex)}><Trash2 size={13}/>삭제</button></div></div><FileInput label="이미지 / 영상 / 3D 바로 교체" accept="image/*,video/*,.glb,.gltf" disabled={uploading} onFile={file=>uploadWork(selectedWorkIndex,file)}/><label className="visual-field"><span>표시 비율</span><select value={member.portfolioWorkRatios?.[selectedWorkIndex]||'auto'} onChange={e=>setWorkRatio(selectedWorkIndex,e.target.value as PortfolioMediaRatio)}>{mediaRatioOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label><div className="portfolio-media-order-actions"><button className="visual-secondary-button" disabled={selectedWorkIndex===0} onClick={()=>moveWork(selectedWorkIndex,-1)}><ArrowLeft size={13}/>왼쪽 작품과 위치 교체</button><button className="visual-secondary-button" disabled={selectedWorkIndex===member.works.length-1} onClick={()=>moveWork(selectedWorkIndex,1)}>오른쪽 작품과 위치 교체<ArrowRight size={13}/></button></div><div className="portfolio-work-copy-editor"><TextInput label="작품 카테고리" value={member.portfolioWorkCategories[selectedWorkIndex]||''} onChange={value=>{const next=[...member.portfolioWorkCategories];next[selectedWorkIndex]=value;patchMember({portfolioWorkCategories:next})}}/><TextInput label="작품 제목" value={member.portfolioWorkTitles?.[selectedWorkIndex]||member.name||'Portfolio'} onChange={value=>patchWorkText(selectedWorkIndex,'portfolioWorkTitles',value)}/><TextInput label="작품 정보 · INFO" value={member.portfolioWorkInfo?.[selectedWorkIndex]||''} multi onChange={value=>patchWorkText(selectedWorkIndex,'portfolioWorkInfo',value)}/><TextInput label="작품 크레딧 · CREDITS" value={member.portfolioWorkCredits?.[selectedWorkIndex]??member.portfolioCredits??''} multi onChange={value=>patchWorkText(selectedWorkIndex,'portfolioWorkCredits',value)}/><p className="visual-help">각 작품마다 제목·정보·크레딧·카테고리를 따로 저장합니다. 슬라이더 Hover와 전체화면에 같은 내용이 표시됩니다.</p></div></>:
     selectedText?<><div className="visual-editor-panel-head"><h3>{textLabels[selectedText]}</h3><span className="visual-direct-badge">직접 편집</span></div><TextInput label="텍스트" value={textValue(selectedText)} multi={selectedText==='intro'} onChange={value=>patchText(selectedText,value)}/><button type="button" className="visual-secondary-button" onClick={()=>startInlineEdit(selectedText)}><Type size={13}/> 화면에서 바로 입력</button>{style&&<p className="visual-help">글자를 클릭하면 즉시 입력할 수 있습니다. 드래그하면 이동하고, 배치/디자인 탭에서 세부 조절도 가능합니다.</p>}</>:
     <SectionContent section={selectedSection} config={config} member={member} patchConfig={patchConfig} patchMember={patchMember} uploadHero={uploadHero} uploadNewWorks={uploadNewWorks} uploading={uploading}/>}
   </div>}

   {tab==='layout'&&<div className="visual-editor-layout">
    {selectedDivider?<><div className="visual-editor-panel-head"><strong>구분선 위치·크기</strong><button onClick={()=>patchDivider(selectedDivider.id,{offsetY:0})}><RotateCcw size={13}/>Reset</button></div><NumberInput label="세로 위치" value={selectedDivider.offsetY} suffix="px" onChange={value=>patchDivider(selectedDivider.id,{offsetY:value})}/><Range label="너비" value={selectedDivider.width} min={10} max={100} step={1} suffix="%" onChange={value=>patchDivider(selectedDivider.id,{width:value})}/><Range label="좌우 여백" value={selectedDivider.inset} min={0} max={240} step={1} suffix="px" onChange={value=>patchDivider(selectedDivider.id,{inset:value})}/><Range label="위 여백" value={selectedDivider.marginTop} min={0} max={240} step={1} suffix="px" onChange={value=>patchDivider(selectedDivider.id,{marginTop:value})}/><Range label="아래 여백" value={selectedDivider.marginBottom} min={0} max={240} step={1} suffix="px" onChange={value=>patchDivider(selectedDivider.id,{marginBottom:value})}/></>:
     selectedText&&style?<><div className="visual-editor-panel-head"><strong>텍스트 위치·크기</strong><button onClick={()=>patchTextFields(selectedText,{x:0,y:0})}><RotateCcw size={13}/>Reset</button></div><NumberInput label="가로 위치" value={style.x} suffix="px" onChange={value=>patchTextFields(selectedText,{x:value})}/><NumberInput label="세로 위치" value={style.y} suffix="px" onChange={value=>patchTextFields(selectedText,{y:value})}/><Range label="글자 크기" value={style.size} min={8} max={180} step={1} suffix="px" onChange={value=>patchTextFields(selectedText,{size:value})}/></>:
     selectedWorkIndex>=0?<><div className="visual-editor-panel-head"><strong>작품 배치</strong></div><button className="visual-secondary-button" disabled={selectedWorkIndex===0} onClick={()=>moveWork(selectedWorkIndex,-1)}><ArrowLeft size={13}/>왼쪽으로 이동</button><button className="visual-secondary-button" disabled={selectedWorkIndex===member.works.length-1} onClick={()=>moveWork(selectedWorkIndex,1)}>오른쪽으로 이동<ArrowRight size={13}/></button></>:
     <><div className="visual-editor-panel-head"><strong>영역 위치·크기</strong><button onClick={()=>patchSection(selectedSection,{x:0,y:0,scale:1,minHeight:0})}><RotateCcw size={13}/>Reset</button></div><div className="visual-axis-lock"><span>가로 위치</span><b>중앙 고정 · 0px</b><button onClick={()=>patchSection(selectedSection,{x:0})}>중앙 복귀</button></div><NumberInput label="세로 위치 · 제한 없음" value={selectedLayout.y} suffix="px" onChange={value=>patchSection(selectedSection,{x:0,y:value})}/><Range label="영역 크기" value={Math.round(selectedLayout.scale*100)} min={55} max={160} step={1} suffix="%" onChange={value=>patchSection(selectedSection,{scale:value/100})}/><Range label="영역 높이 · 0 = 자동" value={selectedLayout.minHeight} min={0} max={1800} step={10} suffix="px" onChange={value=>patchSection(selectedSection,{minHeight:value})}/>{selectedSection==='work'&&member.portfolioLayout==='grid'&&<><Range label="그리드 열 수" value={member.portfolioColumns} min={1} max={4} step={1} onChange={value=>patchMember({portfolioColumns:value})}/><Range label="미디어 간격" value={member.portfolioGap} min={4} max={48} step={1} suffix="px" onChange={value=>patchMember({portfolioGap:value})}/><Range label="그리드 너비" value={member.portfolioGridWidth} min={45} max={100} step={1} suffix="%" onChange={value=>patchMember({portfolioGridWidth:value})}/></>}{selectedSection==='work'&&member.portfolioLayout==='slider'&&<><Range label="슬라이드 폭" value={member.portfolioSliderWidth} min={45} max={100} step={1} suffix="%" onChange={value=>patchMember({portfolioSliderWidth:value})}/><Range label="슬라이드 최대 높이" value={member.portfolioSliderHeight} min={240} max={1400} step={10} suffix="px" onChange={value=>patchMember({portfolioSliderHeight:value})}/><Range label="슬라이드 간격" value={member.portfolioGap} min={4} max={48} step={1} suffix="px" onChange={value=>patchMember({portfolioGap:value})}/><Range label="슬라이드 모서리" value={member.portfolioRadius} min={0} max={48} step={1} suffix="px" onChange={value=>patchMember({portfolioRadius:value})}/></>}<button className="visual-editor-danger" onClick={()=>patchSection(selectedSection,{visible:false})}><EyeOff size={14}/> 이 영역 숨기기</button></>}
   </div>}

   {tab==='style'&&<div className="visual-style-panel">
    {selectedDivider?<><div className="visual-editor-panel-head"><strong>구분선 스타일</strong></div><Range label="두께" value={selectedDivider.thickness} min={.5} max={12} step={.5} suffix="px" onChange={value=>patchDivider(selectedDivider.id,{thickness:value})}/><Range label="불투명도" value={selectedDivider.opacity} min={0} max={100} step={1} suffix="%" onChange={value=>patchDivider(selectedDivider.id,{opacity:value})}/><ColorInput label="색상" value={selectedDivider.color||'#ffffff'} onChange={value=>patchDivider(selectedDivider.id,{color:value})}/><button className="visual-secondary-button" onClick={()=>patchDivider(selectedDivider.id,{color:''})}>색상 자동</button></>:
     selectedText&&style?<TextStyleEditor style={style} onChange={value=>patchPortfolioTextStyle(selectedText,value)}/>:
     selectedWorkIndex>=0?<><div className="visual-editor-panel-head"><strong>작품 카드 스타일</strong></div><Range label="모서리" value={member.portfolioRadius} min={0} max={48} step={1} suffix="px" onChange={value=>patchMember({portfolioRadius:value})}/><Range label="미디어 간격" value={member.portfolioGap} min={4} max={48} step={1} suffix="px" onChange={value=>patchMember({portfolioGap:value})}/></>:
     <><div className="visual-editor-panel-head"><strong>영역 스타일</strong></div><Range label="불투명도" value={selectedLayout.opacity} min={0} max={100} step={1} suffix="%" onChange={value=>patchSection(selectedSection,{opacity:value})}/><Range label="모서리" value={selectedLayout.radius} min={0} max={80} step={1} suffix="px" onChange={value=>patchSection(selectedSection,{radius:value})}/><ColorInput label="배경색" value={selectedLayout.background||'#000000'} onChange={value=>patchSection(selectedSection,{background:value})}/><button className="visual-secondary-button" onClick={()=>patchSection(selectedSection,{background:''})}>배경 자동 / 투명</button>{selectedSection==='nav'&&<><Range label="메뉴바 불투명도" value={config.navOpacity} min={0} max={100} step={1} suffix="%" onChange={value=>patchConfig('navOpacity',value)}/><Range label="글래스 블러" value={config.blur} min={0} max={50} step={1} suffix="px" onChange={value=>patchConfig('blur',value)}/></>}</>}
   </div>}
   {tab==='settings'&&<EditSiteFullSettings draft={config} setDraft={setConfig} busy={busy} setBusy={setBusy} notify={notify} onThemeChange={onThemeChange}/>}
  </aside>:<button type="button" className={'visual-panel-reopen is-'+panelSide} onClick={()=>setPanelOpen(true)}><SlidersHorizontal size={16}/><span>편집 패널</span></button>}

  {tab!=='settings'&&rect&&selectedText&&style&&<div className="visual-inline-text-toolbar" style={quickToolbarStyle}>
   <button type="button" className={inlineEditing===selectedText?'is-active':''} title="화면에서 바로 입력 · Enter/F2" onMouseDown={e=>e.preventDefault()} onClick={()=>startInlineEdit(selectedText)}><Type size={13}/><span>입력</span></button>
   <FontPicker compact value={style.font} onChange={font=>patchPortfolioTextStyle(selectedText,{font})}/>
   <label className="visual-inline-color" title="글자 색상"><input type="color" value={style.color||'#ffffff'} onChange={e=>patchPortfolioTextStyle(selectedText,{color:e.target.value})}/><span style={{background:style.color||'#ffffff'}}/></label>
   <button type="button" title="글자 작게" onClick={()=>patchPortfolioTextStyle(selectedText,{size:Math.max(4,style.size-1)})}>−</button><span className="visual-inline-size">{Math.round(style.size)}</span><button type="button" title="글자 크게" onClick={()=>patchPortfolioTextStyle(selectedText,{size:Math.min(240,style.size+1)})}>+</button>
  </div>}
  {tab!=='settings'&&rect&&<div className={'visual-selection-frame is-panel-'+panelSide+(labelInside?' is-label-inside':'')+(selectedText?' is-text-selection':'')+(selectedDivider?' is-divider-selection':'')} style={{left:rect.left,top:rect.top,width:rect.width,height:rect.height}}><span className="visual-selection-label">{label}</span>
   {selectedDivider&&<button type="button" className="visual-divider-drag-handle" onPointerDown={beginDividerMove} aria-label="구분선 세로 이동"><span/></button>}
   {!selectedDivider&&!selectedText&&selectedWorkIndex<0&&<button type="button" className="visual-move-handle" onPointerDown={beginSectionMove} aria-label="영역 세로 이동"><Grip size={16}/></button>}
   {selectedText&&style&&<button type="button" className="visual-move-handle is-text" onPointerDown={beginTextMove} aria-label="텍스트 이동"><Grip size={16}/></button>}
   {selectedText&&style&&<button type="button" className="visual-resize-handle is-text-size" onPointerDown={beginTextResize} aria-label="텍스트 크기 조절"><Type size={14}/></button>}
   {!selectedDivider&&!selectedText&&selectedWorkIndex<0&&<button type="button" className="visual-resize-handle" onPointerDown={beginSectionScale} aria-label="영역 크기 조절"><Maximize2 size={15}/></button>}
   {!selectedDivider&&!selectedText&&selectedWorkIndex<0&&<button type="button" className="visual-height-handle" onPointerDown={beginSectionHeight} aria-label="영역 높이 조절"><span/></button>}
  </div>}
 </div>;
}

function SectionContent({section,config,member,patchConfig,patchMember,uploadHero,uploadNewWorks,uploading}:{section:PortfolioSectionKey;config:Config;member:TeamMember;patchConfig:<K extends keyof Config>(key:K,value:Config[K])=>void;patchMember:(value:Partial<TeamMember>)=>void;uploadHero:(file?:File)=>void;uploadNewWorks:(files:FileList|null)=>void;uploading:boolean}){
 if(section==='nav')return <><TextInput label="사이트 이름" value={config.name} onChange={value=>patchConfig('name',value)}/><TextInput label="Work 메뉴" value={config.navWorkLabel} onChange={value=>patchConfig('navWorkLabel',value)}/><TextInput label="About 메뉴" value={config.navAboutLabel} onChange={value=>patchConfig('navAboutLabel',value)}/><TextInput label="Team 메뉴" value={config.navTeamLabel} onChange={value=>patchConfig('navTeamLabel',value)}/><TextInput label="Contact 메뉴" value={config.navContactLabel} onChange={value=>patchConfig('navContactLabel',value)}/></>;
 if(section==='hero')return <><FileInput label="대표 이미지 / 영상 / 3D 교체" accept="image/*,video/*,.glb,.gltf" disabled={uploading} onFile={uploadHero}/>{member.photo&&<button className="visual-secondary-button" onClick={()=>patchMember({photo:''})}><Trash2 size={13}/>대표 미디어 제거</button>}</>;
 if(section==='index')return <><TextInput label="카테고리 인덱스 문구" value={member.portfolioTeamIndexLabel} onChange={value=>patchMember({portfolioTeamIndexLabel:value})}/><TextInput label="현재 포트폴리오 이름" value={member.name} onChange={value=>patchMember({name:value})}/></>;
 if(section==='work')return <><MultiFileInput label="새 작품 업로드 · 여러 파일 가능" accept="image/*,video/*,.glb,.gltf" disabled={uploading} onFiles={uploadNewWorks}/><p className="visual-help">새 파일은 현재 SLIDER / GRID 어디에서든 바로 추가됩니다. 기본 표시 비율은 전체화면에서 보이는 원본 비율입니다.</p><TextInput label="작품 영역 제목" value={member.portfolioTitle} onChange={value=>patchMember({portfolioTitle:value})}/><TextInput label="소개 문구" value={member.portfolioIntro} multi onChange={value=>patchMember({portfolioIntro:value})}/><TextInput label="세부 카테고리 · 쉼표로 구분" value={member.portfolioSubcategories.join(', ')} onChange={value=>patchMember({portfolioSubcategories:value.split(',').map(item=>item.trim()).filter(Boolean).slice(0,16)})}/><div className="portfolio-editor-row"><button className={member.portfolioLayout==='grid'?'is-active':''} onClick={()=>patchMember({portfolioLayout:'grid'})}>GRID</button><button className={member.portfolioLayout==='slider'?'is-active':''} onClick={()=>patchMember({portfolioLayout:'slider'})}>SLIDER</button></div>{member.portfolioLayout==='slider'&&<div className="portfolio-slider-toolbar-settings"><div className="visual-editor-panel-head"><strong>슬라이더 재생 · 모션</strong><span className="visual-direct-badge">미리보기 / 전체화면 동일 적용</span></div><label className="visual-toggle"><span>자동 넘김</span><input type="checkbox" checked={member.portfolioSliderAutoplay!==false} onChange={e=>patchMember({portfolioSliderAutoplay:e.target.checked})}/></label>{member.portfolioSliderAutoplay!==false&&<Range label="자동 넘김 간격" value={member.portfolioSliderAutoplayMs||6500} min={1200} max={20000} step={100} suffix="ms" onChange={value=>patchMember({portfolioSliderAutoplayMs:value})}/>}<Range label="넘김 애니메이션 속도" value={member.portfolioSliderTransitionMs||820} min={120} max={2400} step={20} suffix="ms" onChange={value=>patchMember({portfolioSliderTransitionMs:value})}/><label className="visual-field"><span>넘김 애니메이션</span><select value={member.portfolioSliderEasing||'smooth'} onChange={e=>patchMember({portfolioSliderEasing:e.target.value as 'smooth'|'soft'|'snappy'|'linear'})}><option value="smooth">SMOOTH · 부드럽게</option><option value="soft">SOFT · 느긋하게</option><option value="snappy">SNAPPY · 빠르게 붙기</option><option value="linear">LINEAR · 일정 속도</option></select></label><p className="visual-help">배치 탭에서 슬라이드 폭·최대 높이·간격·모서리도 바로 조절할 수 있습니다.</p></div>}</>;
 if(section==='footer')return <TextInput label="돌아가기 문구" value={member.portfolioReturnLabel} onChange={value=>patchMember({portfolioReturnLabel:value})}/>;
 return <p className="visual-help">이 영역의 텍스트는 연결된 앞/뒤 포트폴리오 이름을 자동으로 사용합니다. 위치·크기/스타일은 이 영역 자체에서 조절하세요.</p>;
}
function TextStyleEditor({style,onChange}:{style:{font:string;size:number;color:string;align:TextAlign;x:number;y:number};onChange:(value:Partial<{font:string;size:number;color:string;align:TextAlign;x:number;y:number}>)=>void}){
 return <><div className="visual-editor-panel-head"><strong>글자 스타일</strong></div><FontPicker value={style.font||'Arial, Helvetica, sans-serif'} onChange={font=>onChange({font})}/><Range label="크기" value={style.size} min={8} max={180} step={1} suffix="px" onChange={size=>onChange({size})}/><ColorInput label="색상" value={style.color||'#ffffff'} onChange={color=>onChange({color})}/><div className="visual-segmented">{(['left','center','right'] as TextAlign[]).map(align=><button key={align} className={style.align===align?'is-active':''} onClick={()=>onChange({align})}>{align.toUpperCase()}</button>)}</div></>;
}
function Range({label,value,min,max,step,suffix='',onChange}:{label:string;value:number;min:number;max:number;step:number;suffix?:string;onChange:(value:number)=>void}){return <label className="visual-range"><span>{label}<b>{Math.round(value*100)/100}{suffix}</b></span><input type="range" value={value} min={min} max={max} step={step} onChange={e=>onChange(Number(e.target.value))}/></label>}
function TextInput({label,value,onChange,multi=false}:{label:string;value:string;onChange:(value:string)=>void;multi?:boolean}){return <label className="visual-field"><span>{label}</span>{multi?<textarea value={value||''} onChange={e=>onChange(e.target.value)}/>:<input value={value||''} onChange={e=>onChange(e.target.value)}/>}</label>}
function NumberInput({label,value,suffix='',onChange}:{label:string;value:number;suffix?:string;onChange:(value:number)=>void}){return <label className="visual-number-field"><span>{label}<b>{suffix}</b></span><input type="number" value={numberValue(value)} onChange={e=>{const next=Number(e.target.value);if(Number.isFinite(next))onChange(next)}}/></label>}
function ColorInput({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}){return <label className="visual-color"><span>{label}</span><input type="color" value={/^#[0-9a-f]{6}$/i.test(value)?value:'#ffffff'} onChange={e=>onChange(e.target.value)}/><b>{value||'AUTO'}</b></label>}
function FileInput({label,accept,disabled,onFile}:{label:string;accept:string;disabled:boolean;onFile:(file?:File)=>void}){return <label className="visual-upload"><span>{label}</span><input type="file" accept={accept} disabled={disabled} onChange={e=>{onFile(e.target.files?.[0]);e.currentTarget.value='' }}/></label>}
function MultiFileInput({label,accept,disabled,onFiles}:{label:string;accept:string;disabled:boolean;onFiles:(files:FileList|null)=>void}){return <label className="visual-upload"><span>{label}</span><input type="file" multiple accept={accept} disabled={disabled} onChange={e=>{onFiles(e.target.files);e.currentTarget.value='' }}/></label>}
