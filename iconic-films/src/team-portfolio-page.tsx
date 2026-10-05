'use client';
import {useEffect,useMemo,useRef,useState,type CSSProperties,type PointerEvent as ReactPointerEvent} from 'react';
import {ArrowUpRight,ChevronLeft,ChevronRight,Grid2X2,GalleryHorizontal,Moon,Sun,X} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle} from '@/components/ui/dialog';
import type {Config,TeamMember} from './defaults';
import TeamMedia from './team-media';

export default function TeamPortfolioPage({config,member,theme,onBack,onNavigate,onSelectMember,onToggleTheme,onContact,onAdmin}:{config:Config;member:TeamMember;theme:string;onBack:()=>void;onNavigate:(target:'top'|'work'|'about'|'team')=>void;onSelectMember:(member:TeamMember)=>void;onToggleTheme:()=>void;onContact:()=>void;onAdmin:()=>void}){
  const [index,setIndex]=useState(0);
  const [viewerIndex,setViewerIndex]=useState<number|null>(null);
  const [viewerClosing,setViewerClosing]=useState(false);
  const [memberMotion,setMemberMotion]=useState<'idle'|'leaving'|'entering'>('idle');
  const [memberDirection,setMemberDirection]=useState<1|-1>(1);
  const dragStart=useRef<number|null>(null);
  const swiped=useRef(false);
  const memberSwitchTimer=useRef<number|null>(null);
  const previousMemberId=useRef(member.id);
  const memberSwipeStart=useRef<{x:number;y:number}|null>(null);
  const memberSwipeMoved=useRef(false);
  const works=useMemo(()=>member.works||[],[member.works]);
  const teamMembers=useMemo(()=>(config.teamMembers||[]).filter(item=>item.visible),[config.teamMembers]);
  const memberIndex=Math.max(0,teamMembers.findIndex(item=>item.id===member.id));
  const selectMember=(target:TeamMember,direction:1|-1)=>{
    if(!target||target.id===member.id||memberMotion==='leaving')return;
    if(memberSwitchTimer.current!==null)window.clearTimeout(memberSwitchTimer.current);
    setMemberDirection(direction);
    setMemberMotion('leaving');
    memberSwitchTimer.current=window.setTimeout(()=>{
      onSelectMember(target);
      memberSwitchTimer.current=null;
    },190);
  };
  const memberPrev=()=>teamMembers.length&&selectMember(teamMembers[(memberIndex-1+teamMembers.length)%teamMembers.length],-1);
  const memberNext=()=>teamMembers.length&&selectMember(teamMembers[(memberIndex+1)%teamMembers.length],1);
  const prev=()=>setIndex(i=>(i-1+works.length)%works.length);
  const next=()=>setIndex(i=>(i+1)%works.length);
  const viewerPrev=()=>setViewerIndex(i=>i===null?null:(i-1+works.length)%works.length);
  const viewerNext=()=>setViewerIndex(i=>i===null?null:(i+1)%works.length);
  const openViewer=(i:number)=>{setViewerClosing(false);setViewerIndex(i)};
  const closeViewer=()=>{
    if(viewerIndex===null||viewerClosing)return;
    setViewerClosing(true);
    window.setTimeout(()=>{setViewerIndex(null);setViewerClosing(false)},260);
  };

  useEffect(()=>{
    const changed=previousMemberId.current!==member.id;
    previousMemberId.current=member.id;
    setIndex(0);
    setViewerClosing(false);
    setViewerIndex(null);
    window.scrollTo({top:0,behavior:'auto'});
    if(changed){
      setMemberMotion('entering');
      if(memberSwitchTimer.current!==null)window.clearTimeout(memberSwitchTimer.current);
      memberSwitchTimer.current=window.setTimeout(()=>{setMemberMotion('idle');memberSwitchTimer.current=null},620);
    }
  },[member.id]);
  useEffect(()=>()=>{if(memberSwitchTimer.current!==null)window.clearTimeout(memberSwitchTimer.current)},[]);
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(viewerIndex!==null){
        if(e.key==='Escape')closeViewer();
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

  const reactPointer=(e:ReactPointerEvent<HTMLElement>)=>{
    const el=e.currentTarget;
    const rect=el.getBoundingClientRect();
    const px=Math.max(0,Math.min(1,(e.clientX-rect.left)/Math.max(rect.width,1)));
    const py=Math.max(0,Math.min(1,(e.clientY-rect.top)/Math.max(rect.height,1)));
    el.style.setProperty('--member-px',(px*100).toFixed(1)+'%');
    el.style.setProperty('--member-py',(py*100).toFixed(1)+'%');
    el.style.setProperty('--member-rx',((.5-py)*5).toFixed(2)+'deg');
    el.style.setProperty('--member-ry',((px-.5)*7).toFixed(2)+'deg');
  };
  const resetPointer=(e:ReactPointerEvent<HTMLElement>)=>{
    const el=e.currentTarget;
    el.style.removeProperty('--member-px');
    el.style.removeProperty('--member-py');
    el.style.removeProperty('--member-rx');
    el.style.removeProperty('--member-ry');
    el.style.removeProperty('--member-drag-x');
  };
  const beginMemberSwipe=(e:ReactPointerEvent<HTMLElement>)=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    memberSwipeStart.current={x:e.clientX,y:e.clientY};
    memberSwipeMoved.current=false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const moveMemberSwipe=(e:ReactPointerEvent<HTMLElement>)=>{
    reactPointer(e);
    const start=memberSwipeStart.current;
    if(!start)return;
    const dx=e.clientX-start.x,dy=e.clientY-start.y;
    if(Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)){
      memberSwipeMoved.current=true;
      e.currentTarget.style.setProperty('--member-drag-x',Math.max(-34,Math.min(34,dx*.16)).toFixed(1)+'px');
    }
  };
  const endMemberSwipe=(e:ReactPointerEvent<HTMLElement>)=>{
    const start=memberSwipeStart.current;
    memberSwipeStart.current=null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    e.currentTarget.style.removeProperty('--member-drag-x');
    if(!start)return;
    const dx=e.clientX-start.x,dy=e.clientY-start.y;
    if(Math.abs(dx)>72&&Math.abs(dx)>Math.abs(dy)*1.2){
      memberSwipeMoved.current=true;
      dx<0?memberNext():memberPrev();
      window.setTimeout(()=>{memberSwipeMoved.current=false},80);
    }else{
      window.setTimeout(()=>{memberSwipeMoved.current=false},0);
    }
  };

  const pageStyle={
    '--portfolio-columns':String(member.portfolioColumns||3),
    '--portfolio-gap':(member.portfolioGap||14)+'px',
    '--portfolio-radius':(member.portfolioRadius??18)+'px',
    '--member-radius':(member.photoRadius??config.teamMediaRadius)+'%',
    '--portfolio-profile-size':(member.portfolioProfileSize||430)+'px',
    '--portfolio-name-font':member.portfolioNameFont||'Arial, Helvetica, sans-serif',
    '--portfolio-name-size':(member.portfolioNameSize||112)+'px',
    '--portfolio-name-color':member.portfolioNameColor||'var(--ink)',
    '--portfolio-name-align':member.portfolioNameAlign||'left',
    '--portfolio-name-x':(member.portfolioNameX||0)+'px',
    '--portfolio-name-y':(member.portfolioNameY||0)+'px',
    '--portfolio-role-font':member.portfolioRoleFont||'Arial, Helvetica, sans-serif',
    '--portfolio-role-size':(member.portfolioRoleSize||10)+'px',
    '--portfolio-role-color':member.portfolioRoleColor||'var(--soft)',
    '--portfolio-role-align':member.portfolioRoleAlign||'left',
    '--portfolio-role-x':(member.portfolioRoleX||0)+'px',
    '--portfolio-role-y':(member.portfolioRoleY||0)+'px',
    '--portfolio-bio-font':member.portfolioBioFont||'Arial, Helvetica, sans-serif',
    '--portfolio-bio-size':(member.portfolioBioSize||15)+'px',
    '--portfolio-bio-color':member.portfolioBioColor||'var(--soft)',
    '--portfolio-bio-align':member.portfolioBioAlign||'left',
    '--portfolio-bio-x':(member.portfolioBioX||0)+'px',
    '--portfolio-bio-y':(member.portfolioBioY||0)+'px',
    '--portfolio-title-font':member.portfolioTitleFont||'Arial, Helvetica, sans-serif',
    '--portfolio-title-size':(member.portfolioTitleSize||76)+'px',
    '--portfolio-title-color':member.portfolioTitleColor||'var(--ink)',
    '--portfolio-title-align':member.portfolioTitleAlign||'left',
    '--portfolio-title-x':(member.portfolioTitleX||0)+'px',
    '--portfolio-title-y':(member.portfolioTitleY||0)+'px',
    '--portfolio-intro-font':member.portfolioIntroFont||'Arial, Helvetica, sans-serif',
    '--portfolio-intro-size':(member.portfolioIntroSize||14)+'px',
    '--portfolio-intro-color':member.portfolioIntroColor||'var(--soft)',
    '--portfolio-intro-align':member.portfolioIntroAlign||'left',
    '--portfolio-intro-x':(member.portfolioIntroX||0)+'px',
    '--portfolio-intro-y':(member.portfolioIntroY||0)+'px',
    '--portfolio-utility-font':member.portfolioUtilityFont||'Arial, Helvetica, sans-serif',
    '--portfolio-utility-size':(member.portfolioUtilitySize||11)+'px',
    '--portfolio-utility-color':member.portfolioUtilityColor||'var(--soft)',
    '--portfolio-utility-align':member.portfolioUtilityAlign||'left',
    '--portfolio-utility-x':(member.portfolioUtilityX||0)+'px',
    '--portfolio-utility-y':(member.portfolioUtilityY||0)+'px',
    '--portfolio-return-x':(member.portfolioReturnX||0)+'px',
    '--portfolio-return-y':(member.portfolioReturnY||0)+'px',
    '--portfolio-slider-width':(member.portfolioSliderWidth||100)+'%',
    '--portfolio-slider-height':(member.portfolioSliderHeight||760)+'px',
    '--portfolio-grid-width':(member.portfolioGridWidth||100)+'%',
  } as CSSProperties;

  return <div className={'team-portfolio-page member-motion-'+memberMotion+' member-direction-'+(memberDirection>0?'next':'prev')} style={pageStyle}>
    <header className="nav team-portfolio-site-nav">
      <a href="/" className="brand" onClick={e=>{e.preventDefault();onNavigate('top')}}>{config.logo?<img src={config.logo} alt={config.name}/>:config.name}<span>®</span></a>
      <nav>
        <a href="/#work" onClick={e=>{e.preventDefault();onNavigate('work')}}>{config.navWorkLabel}</a>
        {config.showAbout&&<a href="/#about" onClick={e=>{e.preventDefault();onNavigate('about')}}>{config.navAboutLabel}</a>}
        {config.showTeam&&<a href="/#team" onClick={e=>{e.preventDefault();onNavigate('team')}}>{config.navTeamLabel}</a>}
        <button type="button" className="nav-contact" onClick={onContact}>{config.navContactLabel}</button>
      </nav>
      <div className="nav-tools">
        <button type="button" className="icon" aria-label={theme==='light'?'다크 모드':'라이트 모드'} title={theme==='light'?'다크 모드':'라이트 모드'} onClick={onToggleTheme}>{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}</button>
        <button type="button" className="admin-link" onClick={onAdmin}>{config.footerAdminLabel||'admin'}</button>
      </div>
    </header>

    <main className="team-portfolio-main">
      <section className="team-portfolio-hero">
        <div className="team-portfolio-profile">
          <div className="team-portfolio-avatar member-reactive" onPointerDown={beginMemberSwipe} onPointerMove={moveMemberSwipe} onPointerUp={endMemberSwipe} onPointerCancel={endMemberSwipe} onPointerLeave={resetPointer} title="드래그해서 다른 팀원 보기">
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

      {teamMembers.length>1&&<section className="team-portfolio-member-index" aria-label="Team member navigation">
        <div className="team-member-index-head">
          <span>TEAM INDEX / {String(memberIndex+1).padStart(2,'0')} — {String(teamMembers.length).padStart(2,'0')}</span>
          <div className="team-member-index-arrows">
            <button type="button" aria-label="이전 팀원" onClick={memberPrev}><ChevronLeft size={17}/></button>
            <button type="button" aria-label="다음 팀원" onClick={memberNext}><ChevronRight size={17}/></button>
          </div>
        </div>
        <div className="team-member-index-list">
          {teamMembers.map((item,i)=>{
            const active=item.id===member.id;
            const code=(item.codeName||item.name?.slice(0,1)||String(i+1)).toUpperCase();
            const direction:i extends never?never:1|-1=i===memberIndex?1:(i>memberIndex?1:-1);
            return <button type="button" key={item.id} className={(active?'active ':'')+'member-reactive'} aria-current={active?'page':undefined} onPointerMove={reactPointer} onPointerLeave={resetPointer} onClick={()=>{if(memberSwipeMoved.current){memberSwipeMoved.current=false;return}if(!active)selectMember(item,direction)}}>
              <span className="team-member-code">{code}</span>
              <span className="team-member-index-name">{item.name||'Unnamed'}</span>
              <span className="team-member-index-number">{String(i+1).padStart(2,'0')}</span>
            </button>;
          })}
        </div>
      </section>}

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
          {works.map((url,i)=><button type="button" className="team-portfolio-grid-item" key={url+i} onClick={()=>openViewer(i)}>
            <TeamMedia src={url} alt={(member.name||'Team member')+' portfolio '+(i+1)} className="team-portfolio-work-media"/>
            <span className="team-portfolio-grid-index">{String(i+1).padStart(2,'0')}</span>
          </button>)}
        </div>}

        {!!works.length&&member.portfolioLayout==='slider'&&<div className="team-portfolio-slider">
          <button type="button" className="team-portfolio-slide-stage" onPointerDown={e=>begin(e.clientX)} onPointerUp={e=>end(e.clientX,d=>d>0?next():prev())} onClick={()=>{if(swiped.current){swiped.current=false;return}openViewer(index)}}>
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

    {teamMembers.length>1&&<nav className="team-portfolio-member-switch" aria-label="Previous and next team member">
      <button type="button" onClick={memberPrev}><ChevronLeft size={17}/><span><small>PREVIOUS</small>{teamMembers[(memberIndex-1+teamMembers.length)%teamMembers.length]?.name}</span></button>
      <button type="button" onClick={memberNext}><span><small>NEXT</small>{teamMembers[(memberIndex+1)%teamMembers.length]?.name}</span><ChevronRight size={17}/></button>
    </nav>}

        <footer className="team-portfolio-footer"><span>© 2026 {config.name}</span><button type="button" onClick={onBack}>Back to team</button></footer>

    <Dialog open={viewerIndex!==null&&!viewerClosing} onOpenChange={open=>!open&&closeViewer()}>
      <DialogContent className="team-media-dialog" showCloseButton={false} onOpenAutoFocus={e=>e.preventDefault()}>
        {viewerIndex!==null&&works[viewerIndex]&&<div className="team-media-viewer" onPointerDown={e=>begin(e.clientX)} onPointerUp={e=>end(e.clientX,d=>d>0?viewerNext():viewerPrev())}>
          <TeamMedia key={works[viewerIndex]} src={works[viewerIndex]} alt={(member.name||'Team member')+' portfolio '+(viewerIndex+1)} className="team-media-viewer-media" interactive autoPlay/>
          <button type="button" className="team-media-close" aria-label="닫기" onClick={closeViewer}><X size={18}/></button>
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
