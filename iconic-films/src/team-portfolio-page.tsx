'use client';
import {useEffect,useMemo,useState,type CSSProperties} from 'react';
import {ArrowLeft,ArrowUpRight,ChevronLeft,ChevronRight,Grid2X2,GalleryHorizontal} from 'lucide-react';
import type {Config,TeamMember} from './defaults';
import TeamMedia from './team-media';

export default function TeamPortfolioPage({
  config,
  member,
  onBack
}:{config:Config;member:TeamMember;onBack:()=>void}){
  const [index,setIndex]=useState(0);
  const works=useMemo(()=>member.works||[],[member.works]);
  useEffect(()=>{setIndex(0);window.scrollTo({top:0,behavior:'auto'})},[member.id]);
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape')onBack();
      if(member.portfolioLayout==='slider'&&works.length){
        if(e.key==='ArrowLeft')setIndex(i=>(i-1+works.length)%works.length);
        if(e.key==='ArrowRight')setIndex(i=>(i+1)%works.length);
      }
    };
    window.addEventListener('keydown',key);
    return()=>window.removeEventListener('keydown',key);
  },[member.portfolioLayout,works.length,onBack]);

  const pageStyle={
    '--portfolio-columns':String(member.portfolioColumns||3),
    '--portfolio-gap':(member.portfolioGap||14)+'px',
    '--portfolio-radius':(member.portfolioRadius??18)+'px',
    '--member-radius':(member.photoRadius??config.teamMediaRadius)+'%'
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
            <span className="kicker">{member.role||'CREATIVE'}</span>
            <h1>{member.name||'Unnamed'}</h1>
            {member.bio&&<p>{member.bio}</p>}
            <div className="team-portfolio-links">
              {member.instagram&&<a href={member.instagram} target="_blank" rel="noreferrer">Instagram <ArrowUpRight size={14}/></a>}
              <button type="button" onClick={onBack}>VIIVII sara / Team</button>
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
          {works.map((url,i)=><figure className="team-portfolio-grid-item" key={url+i}>
            <TeamMedia src={url} alt={(member.name||'Team member')+' portfolio '+(i+1)} className="team-portfolio-work-media" interactive/>
            <figcaption>{String(i+1).padStart(2,'0')}</figcaption>
          </figure>)}
        </div>}

        {!!works.length&&member.portfolioLayout==='slider'&&<div className="team-portfolio-slider">
          <div className="team-portfolio-slide-stage">
            <TeamMedia key={works[index]} src={works[index]} alt={(member.name||'Team member')+' portfolio '+(index+1)} className="team-portfolio-slide-media" interactive/>
            <span className="team-portfolio-slide-count">{String(index+1).padStart(2,'0')} / {String(works.length).padStart(2,'0')}</span>
          </div>
          <div className="team-portfolio-slider-controls">
            <button type="button" aria-label="이전 작품" onClick={()=>setIndex(i=>(i-1+works.length)%works.length)}><ChevronLeft size={18}/></button>
            <div className="team-portfolio-dots">{works.map((_,i)=><button key={i} type="button" aria-label={(i+1)+'번 작품'} className={i===index?'active':''} onClick={()=>setIndex(i)}/>)}</div>
            <button type="button" aria-label="다음 작품" onClick={()=>setIndex(i=>(i+1)%works.length)}><ChevronRight size={18}/></button>
          </div>
        </div>}
      </section>
    </main>

    <footer className="team-portfolio-footer">
      <span>© 2026 VIIVII sara</span>
      <button type="button" onClick={onBack}>Back to team</button>
    </footer>
  </div>
}
