'use client';
import {useEffect,useMemo,useRef,useState,type CSSProperties,type PointerEvent as ReactPointerEvent} from 'react';
import {ArrowUpRight,ChevronLeft,ChevronRight,Grid2X2,GalleryHorizontal,Moon,Sun,Play,Pause,Volume2,VolumeX} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle} from '@/components/ui/dialog';
import {Slider} from '@/components/ui/slider';
import type {Config,TeamMember} from './defaults';
import TeamMedia,{teamMediaType} from './team-media';

const fmtMediaTime=(v:number)=>`${Math.floor((v||0)/60)}:${String(Math.floor((v||0)%60)).padStart(2,'0')}`;

export default function TeamPortfolioPage({config,member,theme,onBack,onNavigate,onSelectMember,onToggleTheme,onContact,onAdmin,onVideoViewerOpen,onVideoViewerClose,onMemberEdit}:{config:Config;member:TeamMember;theme:string;onBack:()=>void;onNavigate:(target:'top'|'work'|'about'|'team')=>void;onSelectMember:(member:TeamMember)=>void;onToggleTheme:()=>void;onContact:()=>void;onAdmin:()=>void;onVideoViewerOpen:()=>void;onVideoViewerClose:()=>void;onMemberEdit:(member:TeamMember)=>void}){
  const [index,setIndex]=useState(0);
  const [viewerIndex,setViewerIndex]=useState<number|null>(null);
  const [viewerClosing,setViewerClosing]=useState(false);
  const [viewerPlaying,setViewerPlaying]=useState(false);
  const [viewerMuted,setViewerMuted]=useState(false);
  const [viewerTime,setViewerTime]=useState(0);
  const [viewerDuration,setViewerDuration]=useState(0);
  const [viewerMotion,setViewerMotion]=useState<'idle'|'out'|'in'>('idle');
  const [viewerDirection,setViewerDirection]=useState<1|-1>(1);
  const [memberMotion,setMemberMotion]=useState<'idle'|'leaving'|'entering'>('entering');
  const [memberDirection,setMemberDirection]=useState<1|-1>(1);
  const dragStart=useRef<number|null>(null);
  const swiped=useRef(false);
  const viewerVideoRef=useRef<HTMLVideoElement>(null);
  const viewerVideoAutoStarted=useRef('');
  const viewerMusicHeld=useRef(false);
  const viewerTransitioning=useRef(false);
  const viewerMotionTimer=useRef<number|null>(null);
  const viewerPreloadCache=useRef(new Map<string,Promise<void>>());
  const memberSwitchTimer=useRef<number|null>(null);
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
    },170);
  };
  const memberPrev=()=>teamMembers.length&&selectMember(teamMembers[(memberIndex-1+teamMembers.length)%teamMembers.length],-1);
  const memberNext=()=>teamMembers.length&&selectMember(teamMembers[(memberIndex+1)%teamMembers.length],1);
  const prev=()=>setIndex(i=>(i-1+works.length)%works.length);
  const next=()=>setIndex(i=>(i+1)%works.length);
  const preloadViewerMedia=(src:string)=>{
    if(!src)return Promise.resolve();
    const cached=viewerPreloadCache.current.get(src);
    if(cached)return cached;
    const type=teamMediaType(src);
    const task=new Promise<void>(resolve=>{
      if(type==='image'){
        const image=new Image();
        const done=()=>resolve();
        image.onload=done;
        image.onerror=done;
        image.src=src;
        if(image.complete)resolve();
      }else if(type==='video'){
        const video=document.createElement('video');
        let settled=false;
        const done=()=>{if(settled)return;settled=true;video.removeAttribute('src');video.load();resolve()};
        video.preload='auto';
        video.muted=true;
        video.playsInline=true;
        video.addEventListener('loadeddata',done,{once:true});
        video.addEventListener('canplay',done,{once:true});
        video.addEventListener('error',done,{once:true});
        video.src=src;
        video.load();
        window.setTimeout(done,1200);
      }else resolve();
    });
    viewerPreloadCache.current.set(src,task);
    return task;
  };
  const navigateViewer=(direction:1|-1)=>{
    if(viewerIndex===null||works.length<2||viewerTransitioning.current)return;
    const target=(viewerIndex+direction+works.length)%works.length;
    const targetSrc=works[target];
    viewerTransitioning.current=true;
    setViewerDirection(direction);
    void preloadViewerMedia(targetSrc).finally(()=>{
      setViewerMotion('out');
      if(viewerMotionTimer.current!==null)window.clearTimeout(viewerMotionTimer.current);
      viewerMotionTimer.current=window.setTimeout(()=>{
        viewerVideoAutoStarted.current='';
        setViewerPlaying(false);
        setViewerTime(0);
        setViewerDuration(0);
        setViewerIndex(target);
        setViewerMotion('in');
        viewerMotionTimer.current=window.setTimeout(()=>{
          setViewerMotion('idle');
          viewerTransitioning.current=false;
          viewerMotionTimer.current=null;
        },460);
      },150);
    });
  };
  const viewerPrev=()=>navigateViewer(-1);
  const viewerNext=()=>navigateViewer(1);
  const openViewer=(i:number)=>{
    viewerVideoAutoStarted.current='';
    setViewerClosing(false);
    setViewerMotion('idle');
    setViewerPlaying(false);
    setViewerTime(0);
    setViewerDuration(0);
    setViewerIndex(i);
    viewerTransitioning.current=false;
    void preloadViewerMedia(works[i]||'');
    if(works.length>1){
      void preloadViewerMedia(works[(i-1+works.length)%works.length]||'');
      void preloadViewerMedia(works[(i+1)%works.length]||'');
    }
  };
  const closeViewer=()=>{
    if(viewerIndex===null||viewerClosing)return;
    setViewerClosing(true);
    viewerTransitioning.current=false;
    if(viewerMotionTimer.current!==null){window.clearTimeout(viewerMotionTimer.current);viewerMotionTimer.current=null}
    window.setTimeout(()=>{setViewerIndex(null);setViewerClosing(false);setViewerMotion('idle')},420);
  };

  const autoStartViewerVideo=(video:HTMLVideoElement,src:string)=>{
    if(!video||viewerVideoAutoStarted.current===src&&!video.paused)return;
    viewerVideoAutoStarted.current=src;
    video.playsInline=true;
    video.loop=true;
    const tryPlay=()=>{
      const attempt=video.play();
      if(attempt&&typeof attempt.catch==='function'){
        attempt.catch(()=>{
          // iOS/Safari can reject audible autoplay after a swipe/navigation.
          // Fall back to muted autoplay so the frame never sits black.
          if(!video.muted){
            video.muted=true;
            setViewerMuted(true);
          }
          video.play().catch(()=>{});
        });
      }
    };
    tryPlay();
  };
  const toggleViewerVideo=()=>{
    const video=viewerVideoRef.current;
    if(!video)return;
    if(video.paused)video.play().catch(()=>{
      if(!video.muted){video.muted=true;setViewerMuted(true);video.play().catch(()=>{})}
    });
    else video.pause();
  };
  const seekViewerVideo=(value:number)=>{
    const video=viewerVideoRef.current;
    if(!video)return;
    video.currentTime=Math.max(0,Math.min(value,viewerDuration||video.duration||0));
    setViewerTime(video.currentTime||0);
  };

  useEffect(()=>{
    setIndex(0);
    setViewerClosing(false);
    setViewerIndex(null);
    setViewerPlaying(false);
    setViewerTime(0);
    setViewerDuration(0);
    setViewerMotion('idle');
    viewerTransitioning.current=false;
    if(viewerMotionTimer.current!==null){window.clearTimeout(viewerMotionTimer.current);viewerMotionTimer.current=null}
    window.scrollTo({top:0,behavior:'auto'});
    setMemberMotion('entering');
    if(memberSwitchTimer.current!==null)window.clearTimeout(memberSwitchTimer.current);
    memberSwitchTimer.current=window.setTimeout(()=>{setMemberMotion('idle');memberSwitchTimer.current=null},420);
  },[member.id]);
  useEffect(()=>()=>{if(memberSwitchTimer.current!==null)window.clearTimeout(memberSwitchTimer.current);if(viewerMotionTimer.current!==null)window.clearTimeout(viewerMotionTimer.current)},[]);
  useEffect(()=>{
    const warmed:HTMLImageElement[]=[];
    for(const item of teamMembers){
      if(!item.photo||teamMediaType(item.photo)!=='image')continue;
      const image=new Image();
      image.decoding='async';
      image.src=item.photo;
      warmed.push(image);
    }
    return()=>{for(const image of warmed)image.src=''};
  },[teamMembers]);
  useEffect(()=>{
    if(viewerIndex!==null&&works.length){
      void preloadViewerMedia(works[viewerIndex]||'');
      if(works.length>1){
        void preloadViewerMedia(works[(viewerIndex-1+works.length)%works.length]||'');
        void preloadViewerMedia(works[(viewerIndex+1)%works.length]||'');
      }
    }
  },[viewerIndex,works]);
  useEffect(()=>{
    const current=viewerIndex===null?'':works[viewerIndex]||'';
    const isVideo=!!current&&teamMediaType(current)==='video';
    if(isVideo&&!viewerMusicHeld.current){
      viewerMusicHeld.current=true;
      onVideoViewerOpen();
    }else if(!isVideo&&viewerMusicHeld.current){
      viewerMusicHeld.current=false;
      onVideoViewerClose();
    }
  },[viewerIndex,works]);
  useEffect(()=>()=>{if(viewerMusicHeld.current){viewerMusicHeld.current=false;onVideoViewerClose()}},[]);
  useEffect(()=>{
    if(viewerIndex===null||!works[viewerIndex]||teamMediaType(works[viewerIndex])!=='video')return;
    const src=works[viewerIndex];
    let cancelled=false;
    const attempt=()=>{
      if(cancelled)return;
      const video=viewerVideoRef.current;
      if(video)autoStartViewerVideo(video,src);
    };
    const a=window.setTimeout(attempt,0);
    const b=window.setTimeout(attempt,120);
    const c=window.setTimeout(attempt,360);
    return()=>{cancelled=true;window.clearTimeout(a);window.clearTimeout(b);window.clearTimeout(c)};
  },[viewerIndex,works]);
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

  const beginViewerSwipe=(e:ReactPointerEvent<HTMLElement>)=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    if((e.target as HTMLElement).closest('.team-media-video-controls,.team-media-center-play,.team-media-control,[data-slot="slider"]'))return;
    if(viewerTransitioning.current)return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    begin(e.clientX);
  };
  const moveViewerSwipe=(e:ReactPointerEvent<HTMLElement>)=>{
    if(dragStart.current===null||viewerTransitioning.current)return;
    const dx=e.clientX-dragStart.current;
    const card=e.currentTarget.closest('.team-media-card') as HTMLElement|null;
    if(card){
      card.style.setProperty('--viewer-drag-x',Math.max(-46,Math.min(46,dx*.24)).toFixed(1)+'px');
      card.style.setProperty('--viewer-drag-tilt',(Math.max(-1,Math.min(1,dx/180))*1.15).toFixed(2)+'deg');
    }
  };
  const endViewerSwipe=(e:ReactPointerEvent<HTMLElement>)=>{
    e.stopPropagation();
    const card=e.currentTarget.closest('.team-media-card') as HTMLElement|null;
    card?.style.removeProperty('--viewer-drag-x');
    card?.style.removeProperty('--viewer-drag-tilt');
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    end(e.clientX,d=>d>0?viewerNext():viewerPrev());
  };
  const cancelViewerSwipe=(e:ReactPointerEvent<HTMLElement>)=>{
    dragStart.current=null;
    const card=e.currentTarget.closest('.team-media-card') as HTMLElement|null;
    card?.style.removeProperty('--viewer-drag-x');
    card?.style.removeProperty('--viewer-drag-tilt');
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const reactPointer=(e:ReactPointerEvent<HTMLElement>)=>{
    const el=e.currentTarget;
    const rect=el.getBoundingClientRect();
    const px=Math.max(0,Math.min(1,(e.clientX-rect.left)/Math.max(rect.width,1)));
    const py=Math.max(0,Math.min(1,(e.clientY-rect.top)/Math.max(rect.height,1)));
    el.style.setProperty('--member-px',(px*100).toFixed(1)+'%');
    el.style.setProperty('--member-py',(py*100).toFixed(1)+'%');
    el.style.setProperty('--member-rx',((.5-py)*2.2).toFixed(2)+'deg');
    el.style.setProperty('--member-ry',((px-.5)*2.8).toFixed(2)+'deg');
    el.style.setProperty('--member-tx',((px-.5)*10).toFixed(2)+'px');
    el.style.setProperty('--member-ty',((py-.5)*10).toFixed(2)+'px');
  };
  const resetPointer=(e:ReactPointerEvent<HTMLElement>)=>{
    const el=e.currentTarget;
    el.style.removeProperty('--member-px');
    el.style.removeProperty('--member-py');
    el.style.removeProperty('--member-rx');
    el.style.removeProperty('--member-ry');
    el.style.removeProperty('--member-tx');
    el.style.removeProperty('--member-ty');
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
              <button type="button" className="team-portfolio-inline-edit" onClick={()=>onMemberEdit(member)}>EDIT</button>
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
            const direction:1|-1=i>memberIndex?1:-1;
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
            <TeamMedia src={url} alt={(member.name||'Team member')+' portfolio '+(i+1)} className="team-portfolio-work-media" autoPlay/>
            <span className="team-portfolio-grid-index">{String(i+1).padStart(2,'0')}</span>
          </button>)}
        </div>}

        {!!works.length&&member.portfolioLayout==='slider'&&<div className="team-portfolio-slider">
          <button type="button" className="team-portfolio-slide-stage" onPointerDown={e=>begin(e.clientX)} onPointerUp={e=>end(e.clientX,d=>d>0?next():prev())} onClick={()=>{if(swiped.current){swiped.current=false;return}openViewer(index)}}>
            <TeamMedia key={works[index]} src={works[index]} alt={(member.name||'Team member')+' portfolio '+(index+1)} className="team-portfolio-slide-media" autoPlay/>
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
        {viewerIndex!==null&&works[viewerIndex]&&(()=>{
          const src=works[viewerIndex];
          const type=teamMediaType(src);
          const label=type==='video'?'FILM':type==='image'?'IMAGE':'3D';
          return <div className={'team-media-viewer team-media-type-'+type+' viewer-motion-'+viewerMotion+' viewer-direction-'+(viewerDirection>0?'next':'prev')} onClick={e=>{if(swiped.current){swiped.current=false;return}if(!(e.target as HTMLElement).closest('.team-media-card'))closeViewer()}}>
            <div className="team-media-backdrop" aria-hidden="true">
              {type==='image'&&<TeamMedia key={src+'-backdrop'} src={src} alt="" className="team-media-backdrop-media" autoPlay/>}
              {type==='video'&&<span className="team-media-video-ambient"/>}
            </div>
            <div className={'team-media-card '+(type==='video'?'team-media-card--video':'team-media-card--still')}>
              <div className="team-media-card-head">
                <div className="team-media-card-copy">
                  <span className="team-media-card-kicker">{label} / {String(viewerIndex+1).padStart(2,'0')}</span>
                  <strong className="team-media-card-title">{member.name||'Team member'}</strong>
                  <span className="team-media-card-meta">{String(viewerIndex+1).padStart(2,'0')} / {String(works.length).padStart(2,'0')}</span>
                </div>
                <span className="team-media-card-gesture-hint" aria-hidden="true">DRAG / SWIPE</span>
              </div>
              <div className="team-media-foreground" onPointerDown={beginViewerSwipe} onPointerMove={moveViewerSwipe} onPointerUp={endViewerSwipe} onPointerCancel={cancelViewerSwipe}>
                {type==='video'?<>
                  <video ref={viewerVideoRef} key={src} className="team-media-viewer-media team-media-video" src={src} playsInline preload="auto" autoPlay loop muted={viewerMuted} onLoadedMetadata={e=>{setViewerDuration(e.currentTarget.duration||0);autoStartViewerVideo(e.currentTarget,src)}} onLoadedData={e=>autoStartViewerVideo(e.currentTarget,src)} onCanPlay={e=>autoStartViewerVideo(e.currentTarget,src)} onTimeUpdate={e=>setViewerTime(e.currentTarget.currentTime||0)} onPlay={()=>setViewerPlaying(true)} onPause={()=>setViewerPlaying(false)} onEnded={()=>setViewerPlaying(false)} onClick={e=>{e.stopPropagation();if(swiped.current){swiped.current=false;return}toggleViewerVideo()}}/>
                  {!viewerPlaying&&<button type="button" className="team-media-center-play" aria-label="영상 재생" onClick={e=>{e.stopPropagation();toggleViewerVideo()}}><Play size={22} fill="currentColor"/></button>}
                  <div className="team-media-video-controls" onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()}>
                    <button type="button" className="team-media-control" aria-label={viewerPlaying?'일시정지':'재생'} onClick={toggleViewerVideo}>{viewerPlaying?<Pause size={17} fill="currentColor"/>:<Play size={17} fill="currentColor"/>}</button>
                    <span className="team-media-time">{fmtMediaTime(viewerTime)}</span>
                    <Slider className="team-media-seek" aria-label="영상 위치" value={[Math.min(viewerTime,viewerDuration||0)]} min={0} max={Math.max(viewerDuration,1)} step={.1} onValueChange={v=>seekViewerVideo(v[0])}/>
                    <span className="team-media-time team-media-time-end">{fmtMediaTime(viewerDuration)}</span>
                    <button type="button" className="team-media-control" aria-label={viewerMuted?'소리 켜기':'음소거'} onClick={()=>setViewerMuted(v=>!v)}>{viewerMuted?<VolumeX size={17}/>:<Volume2 size={17}/>}</button>
                    
                  </div>
                </>:<TeamMedia key={src} src={src} alt={(member.name||'Team member')+' portfolio '+(viewerIndex+1)} className="team-media-viewer-media" interactive autoPlay/>}
              </div>
            </div>
            {works.length>1&&<>
              <button type="button" className="team-media-nav is-prev" aria-label="이전 미디어" onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();viewerPrev()}}><ChevronLeft size={22}/></button>
              <button type="button" className="team-media-nav is-next" aria-label="다음 미디어" onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();viewerNext()}}><ChevronRight size={22}/></button>
            </>}
            <span className="team-media-count">{String(viewerIndex+1).padStart(2,'0')} / {String(works.length).padStart(2,'0')}</span>
          </div>;
        })()}
        <DialogTitle className="sr-only">{member.name||'Team member'} portfolio</DialogTitle>
      </DialogContent>
    </Dialog>
  </div>
}
