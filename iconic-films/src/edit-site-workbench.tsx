'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ChevronRight,Eye,Layers3,Monitor,PanelLeftClose,PanelRightClose,Plus,Save,Settings2,Smartphone,Tablet,Undo2,MousePointer2} from 'lucide-react';
import type {Config} from './defaults';

export type EditorDevice='desktop'|'tablet'|'phone';
export type EditorPage='home'|'portfolio';

type Props={
 config:Config;
 page:EditorPage;
 memberId?:string;
 selection:string;
 onSelect:(key:string)=>void;
 onContent:()=>void;
 onSettings:()=>void;
 onLayers:()=>void;
 onSave:()=>void;
 onCancel:()=>void;
 onUndo:()=>void;
 onAddWork?:()=>void;
 onOpenAdmin:()=>void;
 canUndo:boolean;
 busy:boolean;
};

const sectionsHome=[['nav','헤더 · 브랜드'],['hero','첫 화면 · 메인 미디어'],['work','작품 · Work'],['about','소개 · About'],['team','팀 · Categories'],['footer','푸터']] as const;
const sectionsPortfolio=[['nav','헤더 · 브랜드'],['hero','대표 미디어'],['index','카테고리 인덱스'],['work','작품 · Selected works'],['switcher','이전 · 다음'],['footer','푸터']] as const;
const deviceSizes:{device:EditorDevice;label:string;width:number;height:number;icon:typeof Monitor}[]=[
 {device:'desktop',label:'PC',width:1440,height:900,icon:Monitor},
 {device:'tablet',label:'iPad',width:820,height:1080,icon:Tablet},
 {device:'phone',label:'Mobile',width:390,height:844,icon:Smartphone}
];

function previewDestination(page:EditorPage,memberId?:string){
 const path=window.location.pathname;
 return path+'?viivii-workbench-preview=1';
}

export default function EditSiteWorkbench({config,page,memberId,selection,onSelect,onContent,onSettings,onLayers,onSave,onCancel,onUndo,onAddWork,onOpenAdmin,canUndo,busy}:Props){
 const [device,setDevice]=useState<EditorDevice>('desktop');
 const [direct,setDirect]=useState(false);
 const [leftOpen,setLeftOpen]=useState(()=>typeof window!=='undefined'&&window.innerWidth>1100);
 const [rightOpen,setRightOpen]=useState(()=>typeof window!=='undefined'&&window.innerWidth>1100);
 const [ready,setReady]=useState(false);
 const stageRef=useRef<HTMLDivElement>(null);
 const iframeRef=useRef<HTMLIFrameElement>(null);
 const [bounds,setBounds]=useState({width:1100,height:750});
 const src=useMemo(()=>previewDestination(page,memberId),[page,memberId]);
 const sizing=deviceSizes.find(s=>s.device===device)||deviceSizes[0];
 const scale=Math.max(.1,Math.min(1,(bounds.width-42)/sizing.width,(bounds.height-42)/sizing.height));
 const selections=page==='portfolio'?sectionsPortfolio:sectionsHome;
 const selectedSection=selection.startsWith('work:')?'work':selection.startsWith('text:')?'nav':selection;
 const activeMember=page==='portfolio'?(config.teamMembers||[]).find(m=>m.id===memberId):null;
 const works=page==='portfolio'?(activeMember?.works||[]):config.works.map(w=>w.video||w.poster||'');
 const post=(message:Record<string,unknown>)=>{
  if(!iframeRef.current?.contentWindow)return;
  iframeRef.current.contentWindow.postMessage({source:'viivii-editor',...message},window.location.origin);
 };
 useEffect(()=>{
  const root=document.documentElement;
  root.dataset.editorWorkbench='true';
  root.dataset.editorWorkbenchDirect=direct?'true':'false';
  root.dataset.editorWorkbenchLeft=leftOpen?'true':'false';
  root.dataset.editorWorkbenchRight=rightOpen?'true':'false';
  return()=>{
   delete root.dataset.editorWorkbench;
   delete root.dataset.editorWorkbenchDirect;
   delete root.dataset.editorWorkbenchLeft;
   delete root.dataset.editorWorkbenchRight;
  };
 },[direct,leftOpen,rightOpen]);
 useEffect(()=>{
  const el=stageRef.current;
  if(!el)return;
  const update=()=>{const r=el.getBoundingClientRect();setBounds({width:r.width,height:r.height})};
  const observer=new ResizeObserver(update);observer.observe(el);update();
  return()=>observer.disconnect();
 },[]);
 useEffect(()=>{
  const onMessage=(event:MessageEvent)=>{
   if(event.origin!==window.location.origin||event.source!==iframeRef.current?.contentWindow)return;
   const msg=event.data;
   if(!msg||msg.source!=='viivii-preview')return;
   if(msg.type==='ready'){
    setReady(true);
    post({type:'sync',config});
   }else if(msg.type==='select'&&typeof msg.selection==='string'){
    onSelect(msg.selection);
    onContent();
    if(window.matchMedia('(max-width: 1100px)').matches){setRightOpen(true);setLeftOpen(false)}
   }
  };
  window.addEventListener('message',onMessage);
  return()=>window.removeEventListener('message',onMessage);
 },[config,onSelect,onContent]);
 useEffect(()=>{if(ready)post({type:'sync',config})},[config,ready]);
 useEffect(()=>{setReady(false)},[src]);
 const choose=(key:string)=>{
  onSelect(key);
  onContent();
  post({type:'focus',selection:key});
  if(window.matchMedia('(max-width: 760px)').matches){setRightOpen(true);setLeftOpen(false)}
 };
 const changeDevice=(next:EditorDevice)=>{
  setDevice(next);setDirect(false);
 };
 const closeEditing=()=>{onCancel()};
 return <div className="vii-workbench" data-page={page} data-device={device} data-direct={direct?'true':'false'}>
   <header className="vii-workbench-header">
    <div className="vii-workbench-brand">
     <button type="button" className="vii-wb-icon" onClick={closeEditing} aria-label="편집 종료" title="편집 종료"><ArrowLeft size={18}/></button>
     <div className="vii-wb-name"><strong>VIIVII <em>sara</em></strong><span>EDIT SITE <i/> LIVE DRAFT</span></div>
    </div>
    <div className="vii-workbench-modes" role="group" aria-label="화면 미리보기 크기">
     {deviceSizes.map(item=><button key={item.device} type="button" aria-label={item.label+' 미리보기'} aria-pressed={device===item.device&&!direct} className={device===item.device&&!direct?'is-active':''} onClick={()=>changeDevice(item.device)} title={item.label+' · '+item.width+'px'}><item.icon size={16}/><span>{item.label}</span></button>)}
     <span className="vii-wb-separator"/>
     <button type="button" className={direct?'is-active':''} aria-pressed={direct} title="기존 방식으로 실제 화면에서 직접 선택·드래그" onClick={()=>setDirect(v=>!v)}><MousePointer2 size={15}/><span>직접 편집</span></button>
    </div>
    <div className="vii-workbench-actions">
     <button type="button" className="vii-wb-icon vii-wb-panel-toggle" onClick={()=>setLeftOpen(v=>!v)} title="사이트 구성 열기 / 닫기"><PanelLeftClose size={17}/></button>
     <button type="button" className="vii-wb-icon vii-wb-panel-toggle" onClick={()=>setRightOpen(v=>!v)} title="설정 패널 열기 / 닫기"><PanelRightClose size={17}/></button>
     <button type="button" className="vii-wb-action subtle" onClick={onUndo} disabled={!canUndo}><Undo2 size={15}/><span>되돌리기</span></button>
     <button type="button" className="vii-wb-action subtle" onClick={onOpenAdmin}><Settings2 size={15}/><span>관리자</span></button>
     <button type="button" className="vii-wb-action primary" onClick={onSave} disabled={busy}><Save size={15}/><span>{busy?'저장 중':'저장 · 적용'}</span></button>
    </div>
   </header>
   <aside className={'vii-workbench-tree'+(leftOpen?' is-open':'')} aria-label="사이트 구성">
    <div className="vii-wb-pane-title"><span>SITE STRUCTURE</span><strong>{page==='portfolio'?(activeMember?.name||'Portfolio'):'VIIVII sara'}</strong><p>페이지와 항목을 선택해 편집하세요.</p></div>
    <div className="vii-wb-tree-scroll">
     <div className="vii-wb-tree-label">페이지 <span>{page==='portfolio'?'PORTFOLIO':'HOME'}</span></div>
     <div className="vii-wb-tree-groups">
     {selections.map(([id,label],i)=><div key={id} className="vii-wb-tree-group">
       <button type="button" className={'vii-wb-tree-row'+(selectedSection===id?' is-selected':'')} onClick={()=>choose(id)}>
        <span className="vii-wb-tree-no">{String(i+1).padStart(2,'0')}</span><span className="vii-wb-tree-text">{label}</span><ChevronRight size={13}/>
       </button>
       {id==='work'&&<div className="vii-wb-children">
        {works.slice(0,40).map((src,i)=>{
         const k=page==='portfolio'?'work:'+i:'work:'+config.works[i]?.id;
         const name=page==='portfolio'?(activeMember?.portfolioWorkTitles?.[i]||'작품 '+String(i+1).padStart(2,'0')):(config.works[i]?.title||'작품 '+String(i+1).padStart(2,'0'));
         return <button type="button" className={'vii-wb-child'+(selection===k?' is-selected':'')} onClick={()=>choose(k)} key={k+'-'+i}><span className="vii-wb-child-dot"/><span>{name}</span><small>{String(i+1).padStart(2,'0')}</small></button>
        })}
        <button type="button" className="vii-wb-add-child" onClick={()=>{onAddWork?.();onContent()}}><Plus size={13}/> 작품 추가</button>
       </div>}
      </div>)}
     </div>
     <div className="vii-wb-tree-label">WORKSPACE</div>
     <button type="button" className="vii-wb-tool-row" onClick={onLayers}><Layers3 size={15}/>레이어 전체 관리<ChevronRight size={13}/></button>
     <button type="button" className="vii-wb-tool-row" onClick={onSettings}><Settings2 size={15}/>사이트 공통 설정<ChevronRight size={13}/></button>
     <button type="button" className="vii-wb-tool-row" onClick={()=>{setDirect(true);setLeftOpen(false)}}><MousePointer2 size={15}/>화면에서 직접 편집<ChevronRight size={13}/></button>
    </div>
    <div className="vii-wb-pane-foot"><span className="vii-wb-online"/><span>수정 사항은 저장 전까지 공개되지 않습니다.</span></div>
   </aside>
   <div ref={stageRef} className={'vii-workbench-stage'+(direct?' is-direct':'')} aria-label="실시간 사이트 미리보기">
    {!direct&&<>
      <div className="vii-wb-stage-meta"><span>LIVE PREVIEW</span><span>{sizing.width} × {sizing.height} · {sizing.label}</span></div>
      <div className={'vii-wb-device-frame vii-wb-'+device} style={{width:sizing.width*scale,height:sizing.height*scale}}>
       <iframe ref={iframeRef} title={sizing.label+' VIIVII sara 실시간 미리보기'} src={src} onLoad={()=>{setReady(true);post({type:'sync',config})}} style={{width:sizing.width,height:sizing.height,transform:'scale('+scale+')',transformOrigin:'top left'}}/>
      </div>
      <p className="vii-wb-preview-hint">미리보기에서 항목을 선택하면 오른쪽에서 바로 편집할 수 있습니다.</p>
    </>}
    {direct&&<div className="vii-wb-direct-caption"><MousePointer2 size={15}/><span>직접 편집 모드 · 화면에서 클릭·드래그로 수정</span><button type="button" onClick={()=>setDirect(false)}>미리보기로 돌아가기</button></div>}
   </div>
   <div className="vii-wb-mobile-panels">
    <button type="button" onClick={()=>{setLeftOpen(true);setRightOpen(false)}} className={leftOpen?'is-active':''}><Layers3 size={15}/>구성</button>
    <button type="button" onClick={()=>{setLeftOpen(false);setRightOpen(true)}} className={rightOpen?'is-active':''}><Settings2 size={15}/>항목 편집</button>
    <button type="button" onClick={()=>{setLeftOpen(false);setRightOpen(false)}} className={!leftOpen&&!rightOpen?'is-active':''}><Eye size={15}/>미리보기</button>
   </div>
 </div>;
}
