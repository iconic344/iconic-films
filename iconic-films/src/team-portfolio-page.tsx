'use client';
import {useEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import {ArrowLeft,ArrowUpRight,ChevronLeft,ChevronRight,Grid2X2,GalleryHorizontal,X} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle} from '@/components/ui/dialog';
import type {Config,TeamMember} from './defaults';
import TeamMedia from './team-media';

export default function TeamPortfolioPage({config,member,onBack}:{config:Config;member:TeamMember;onBack:()=>void}){
  const [index,setIndex]=useState(0);
  const [viewerIndex,setViewerIndex]=useState<number|null>(null);
  const dragStart=useRef<number|null>(null);
  const swiped=useRef(false);
  const works=useMemo(()=>member.works||[],[member.works]);
  const prev=()=>setIndex(i=>(i-1+works.length)%works.length);
  const next=()=>setIndex(i=>(i+1)%works.length);
  const viewerPrev=()=>setViewerIndex(i=>i===null?null:(i-1+works.length)%works.length);
  const viewerNext=()=>setViewerIndex(i=>i===null?null:(i+1)%works.length);

  useEffect(()=>{setIndex(0);setViewerIndex(null);window.scrollTo({top:0,behavior:'auto'})},[member.id]);
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(viewerIndex!==null){
        if(e.key==='Escape')setViewerIndex(null);
        if(e.key==='ArrowLeft')viewerPrev();
        if(e.key==='ArrowRight')viewerNext();
        return;
      }
      if(e.key==='Escape')onBack();
      if(member.portfolioLayout==='slider'&&works.length){
        if(e.key==='ArrowLeft')prev();
        if(e.key==='ArrowRight')next();
      }
    };
    window.addEventListener('keydown',key);
    return()=>window.removeEventListener('keydown',key);
  },[viewerIndex,member.portfolioLayout,works.length,onBack]);

  const begin=(x:number)=>{dragStart.current=x;swiped.current=false};
  const end=(x:number,move:(dir:number)=>void)=>{
    if(dragStart.current===null)return;
    const delta=x-dragStart.current;
    dragStart.current=null;
    if(Math.abs(delta)>48){swiped.current=true;move(delta<0?1:-1)}
  };

  const pageStyle={
    '--portfolio-columns':String(member.portfolioColumns||3),
    '--portfolio-gap':(member.portfolioGap||14)+'px',
    '--portfolio-radius':(member.portfolioRadius??18)+'px',
    '--member-radius':(member.photoRadius??config.teamMediaRadius)+'%',
    '--portfolio-profile-size':(member.portfolioProfileSize||430)+'px',
    '--portfolio-name-font':member.portfolioNameFont||'Arial, Helvetica, sans-serif',
    '--portfolio-name-size':(member.portfolioNameSize||112)+'px',
    '--portfolio-name-x':(member.portfolioNameX||0)+'px',
    '--portfolio-name-y':(member.portfolioNameY||0)+'px',
    '--portfolio-role-font':member.portfolioRoleFont||'Arial, Helvetica, sans-serif',
    '--portfolio-role-size':(member.portfolioRoleSize||10)+'px',
    '--portfolio-role-x':(member.portfolioRoleX||0)+'px',
    '--portfolio-role-y':(member.portfolioRoleY||0)+'px',
    '--portfolio-bio-font':member.portfolioBioFont||'Arial, Helvetica, sans-serif',
    '--portfolio-bio-size':(member.portfolioBioSize||15)+'px',
    '--portfolio-bio-x':(member.portfolioBioX||0)+'px',
    '--portfolio-bio-y':(member.portfolioBioY||0)+'px',
    '--portfolio-title-font':member.portfolioTitleFont||'Arial, Helvetica, sans-serif',
    '--portfolio-title-size':(member.portfolioTitleSize||76)+'px',
    '--portfolio-title-x':(member.portfolioTitleX||0)+'px',
    '--portfolio-title-y':(member.portfolioTitleY||0)+'px',
    '--portfolio-intro-font':member.portfolioIntroFont||'Arial, Helvetica, sans-serif',
    '--portfolio-intro-size':(member.portfolioIntroSize||14)+'px',
    '--portfolio-intro-x':(member.portfolioIntroX||0)+'px',
    '--portfolio-intro-y':(member.portfolioIntroY||0)+'px',
    '--portfolio-utility-font':member.portfolioUtilityFont||'Arial, Helvetica, sans-serif',
    '--portfolio-utility-size':(member.portfolioUtilitySize||11)+'px',
    '--portfolio-return-x':(member.portfolioReturnX||0)+'px',
    '--portfolio-return-y':(member.portfolioReturnY||0)+'px',
    '--portfolio-slider-width':(member.portfolioSliderWidth||100)+'%',
    '--portfolio-slider-height':(member.portfolioSliderHeight||760)+'px',
    '--portfolio-grid-width':(member.portfolioGridWidth||100)+'%',
  } as CSSProperties;

  return <div className="team-portfolio-page" style={pageStyle}>
    <header className="team-portfolio-nav">
      <button type="button" onClick={onBack} className="team-portfolio-back"><ArrowLeft size={15}/><span>Back</span></button>
      <a href="/" className="team-portfolio-brand">{config.logo?<img src={config.logo} alt={config.name}/>:config.name}<sup>®</sup></a>
      <div className="team-portfolio-nav-right">
        <span>{member.role||'CREATIVE'}</span>
        {member.instagram&&<a href={member.instagram} target="_blank" rel="noreferrer">Instagram <ArrowUpRight size={13}/></a>}
      </div>
    </header>

    <main className="team-portfolio-main">
      <section className="team-portfolio-hero">
        <div className="team-portfolio-profile">
          <div className="team-portfolio-avatar">
            {member.photo?<TeamMedia src={member.photo} alt={member.name||member.role} className="team-portfolio-avatar-media" interactive/>:<span>{(member.name||'V').slice(0,1)}</span>}
          </div>
          <div className="team-portfolio-copy">
            <span className="kicker team-portfolio-role">{member.role||'CREATIVE'}</span>
            <h1>{member.name||'Unnamed'}</h1>
            {member.bio&&<p>{member.bio}</p>}
            <div className="team-portfolio-links">
              {member.instagram&&<a href={member.instagram} target="_blank" rel="noreferrer">Instagram <ArrowUpRight size={14}/></a>}
              <button type="button" onClick={onBack}>{member.portfolioReturnLabel||'VIIVII sara / Team'}</button>
            </div>
          </div>
        </div>
      </section>

      <section className="team-portfolio-work">
        <div className="team-portfolio-work-head">
          <div>
            <span className="kicker">PORTFOLIO / {String(works.length).padStart(2,'0')}</span>
            <h2>{member.portfolioTitle||'Selected works'}</h2>
            {member.portfolioIntro&&<p>{member.portfolioIntro}</p>}
          </div>
          <span className="team-portfolio-layout-label">{member.portfolioLayout==='slider'?<GalleryHorizontal size={15}/>:<Grid2X2 size={15}/>} {member.portfolioLayout}</span>
        </div>

        {!works.length&&<div className="team-portfolio-empty">Portfolio coming soon.</div>}

        {!!works.length&&member.portfolioLayout==='grid'&&<div className="team-portfolio-grid">
          {works.map((url,i)=><button type="button" className="team-portfolio-grid-item" key={url+i} onClick={()=>setViewerIndex(i)}>
            <TeamMedia src={url} alt={(member.name||'Team member')+' portfolio '+(i+1)} className="team-portfolio-work-media"/>
            <span className="team-portfolio-grid-index">{String(i+1).padStart(2,'0')}</span>
          </button>)}
        </div>}

        {!!works.length&&member.portfolioLayout==='slider'&&<div className="team-portfolio-slider">
          <button type="button" className="team-portfolio-slide-stage" onPointerDown={e=>begin(e.clientX)} onPointerUp={e=>end(e.clientX,d=>d>0?next():prev())} onClick={()=>{if(swiped.current){swiped.current=false;return}setViewerIndex(index)}}>
            <TeamMedia key={works[index]} src={works[index]} alt={(member.name||'Team member')+' portfolio '+(index+1)} className="team-portfolio-slide-media"/>
            <span className="team-portfolio-slide-count">{String(index+1).padStart(2,'0')} / {String(works.length).padStart(2,'0')}</span>
          </button>
          <div className="team-portfolio-slider-controls">
            <button type="button" aria-label="이전 작품" onClick={prev}><ChevronLeft size={18}/></button>
            <div className="team-portfolio-dots">{works.map((_,i)=><button key={i} type="button" aria-label={(i+1)+'번 작품'} className={i===index?'active':''} onClick={()=>setIndex(i)}/>)}</div>
            <button type="button" aria-label="다음 작품" onClick={next}><ChevronRight size={18}/></button>
          </div>
        </div>}
      </section>
    </main>

    <footer className="team-portfolio-footer"><span>© 2026 VIIVII sara</span><button type="button" onClick={onBack}>Back to team</button></footer>

    <Dialog open={viewerIndex!==null} onOpenChange={open=>!open&&setViewerIndex(null)}>
      <DialogContent className="team-media-dialog" showCloseButton={false} onOpenAutoFocus={e=>e.preventDefault()}>
        {viewerIndex!==null&&works[viewerIndex]&&<div className="team-media-viewer" onPointerDown={e=>begin(e.clientX)} onPointerUp={e=>end(e.clientX,d=>d>0?viewerNext():viewerPrev())}>
          <TeamMedia key={works[viewerIndex]} src={works[viewerIndex]} alt={(member.name||'Team member')+' portfolio '+(viewerIndex+1)} className="team-media-viewer-media" interactive/>
          <button type="button" className="team-media-close" aria-label="닫기" onClick={()=>setViewerIndex(null)}><X size={18}/></button>
          {works.length>1&&<>
            <button type="button" className="team-media-nav is-prev" aria-label="이전" onClick={viewerPrev}><ChevronLeft size={22}/></button>
            <button type="button" className="team-media-nav is-next" aria-label="다음" onClick={viewerNext}><ChevronRight size={22}/></button>
          </>}
          <span className="team-media-count">{String(viewerIndex+1).padStart(2,'0')} / {String(works.length).padStart(2,'0')}</span>
        </div>}
        <DialogTitle className="sr-only">{member.name||'Team member'} portfolio</DialogTitle>
      </DialogContent>
    </Dialog>
  </div>
}
