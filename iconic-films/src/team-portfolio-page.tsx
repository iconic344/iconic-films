'use client';
import {useEffect,useMemo,useRef,useState,type CSSProperties,type PointerEvent as ReactPointerEvent} from 'react';
import {ChevronLeft,ChevronRight,Grid2X2,GalleryHorizontal,Moon,Sun} from 'lucide-react';
import MediaGalleryDialog,{MediaGallery} from './media-gallery';
import type {Config,NavItemKey,PortfolioDivider,PortfolioSectionKey,TeamMember} from './defaults';
import TeamMedia,{teamMediaType} from './team-media';


export default function TeamPortfolioPage({config,member,theme,onBack,onNavigate,onSelectMember,onToggleTheme,onContact,onAdmin,onVideoViewerOpen,onVideoViewerClose,onMemberEdit,onEditSite,visualEditing=false}:{config:Config;member:TeamMember;theme:string;onBack:()=>void;onNavigate:(target:'top'|'work'|'about'|'team')=>void;onSelectMember:(member:TeamMember,direction?:1|-1)=>void;onToggleTheme:()=>void;onContact:()=>void;onAdmin:()=>void;onVideoViewerOpen:()=>void;onVideoViewerClose:()=>void;onMemberEdit:(member:TeamMember)=>void;onEditSite:()=>void;visualEditing?:boolean}){
  const [index,setIndex]=useState(0);
  const [subcategory,setSubcategory]=useState('All');
  const [viewerIndex,setViewerIndex]=useState<number|null>(null);
  const heroRef=useRef<HTMLElement>(null);
  const viewerMusicHeld=useRef(false);
  const memberSwipeStart=useRef<{x:number;y:number}|null>(null);
  const memberSwipeMoved=useRef(false);
  const subcategories=useMemo(()=>member.portfolioSubcategories||[],[member.portfolioSubcategories]);
  const galleryItems=useMemo(()=>(member.works||[]).map((src,i)=>({
    id:member.id+'-'+i,src,sourceIndex:i,title:member.name||'Portfolio',
    description:member.portfolioCreditsVisible!==false?(member.portfolioCredits||''): '',
    category:member.portfolioWorkCategories?.[i]||subcategories[0]||'All',
    kicker:member.portfolioWorkCategories?.[i]||subcategories[0]||'All'
  })).filter(item=>subcategory==='All'||item.category===subcategory),[member.id,member.name,member.works,member.portfolioWorkCategories,member.portfolioCredits,member.portfolioCreditsVisible,subcategories,subcategory]);
  const works=useMemo(()=>galleryItems.map(item=>item.src),[galleryItems]);
  const teamMembers=useMemo(()=>(config.teamMembers||[]).filter(item=>item.visible),[config.teamMembers]);
  const memberIndex=Math.max(0,teamMembers.findIndex(item=>item.id===member.id));
  const selectMember=(target:TeamMember,direction:1|-1)=>{if(target&&target.id!==member.id)onSelectMember(target,direction)};
  const memberPrev=()=>teamMembers.length&&selectMember(teamMembers[(memberIndex-1+teamMembers.length)%teamMembers.length],-1);
  const memberNext=()=>teamMembers.length&&selectMember(teamMembers[(memberIndex+1)%teamMembers.length],1);
  const prev=()=>setIndex(i=>(i-1+works.length)%works.length);
  const next=()=>setIndex(i=>(i+1)%works.length);
  const openViewer=(i:number)=>setViewerIndex(i);
  const closeViewer=()=>setViewerIndex(null);
  useEffect(()=>{
    setIndex(0);
    setSubcategory('All');
    setViewerIndex(null);
  },[member.id]);
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
    const key=(e:KeyboardEvent)=>{
      if(e.key!=='Escape')return;
      if(e.defaultPrevented||viewerIndex!==null||document.querySelector('.unified-media-dialog,.media-gallery.is-fullscreen'))return;
      e.preventDefault();
      onBack();
    };
    window.addEventListener('keydown',key);
    return()=>window.removeEventListener('keydown',key);
  },[viewerIndex,member.portfolioLayout,works.length,onBack]);

  useEffect(()=>{
    const hero=heroRef.current,index=hero?.parentElement?.querySelector('.team-portfolio-member-index');
    if(!hero)return;
    const measure=()=>{const extent=index?Math.max(180,index.getBoundingClientRect().bottom-hero.getBoundingClientRect().bottom+48):220;hero.style.setProperty('--hero-fade-extension',extent.toFixed(1)+'px')};
    const observer=new ResizeObserver(measure);observer.observe(hero);if(index)observer.observe(index);measure();
    return()=>observer.disconnect();
  },[member.id]);

  useEffect(()=>{
    const hero=heroRef.current;
    if(!hero||!member.photo)return;
    const fine=window.matchMedia('(any-hover: hover) and (any-pointer: fine)');
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0,x=0,y=0;
    const reset=()=>{
      if(frame)window.cancelAnimationFrame(frame);
      frame=0;
      hero.dataset.pointerActive='false';
      hero.style.removeProperty('--hero-shift-x');
      hero.style.removeProperty('--hero-shift-y');
    };
    const update=()=>{
      frame=0;
      const rect=hero.getBoundingClientRect();
      const extension=parseFloat(hero.style.getPropertyValue('--hero-fade-extension'))||240;
      const height=rect.height+extension;
      if(x<rect.left||x>rect.right||y<rect.top||y>rect.bottom+extension){reset();return}
      const px=(x-rect.left)/Math.max(rect.width,1);
      const py=(y-rect.top)/Math.max(height,1);
      hero.style.setProperty('--hero-light-x',((x-rect.left)/rect.width*100).toFixed(2)+'%');
      hero.style.setProperty('--hero-light-y',((y-rect.top)/height*100).toFixed(2)+'%');
      hero.style.setProperty('--hero-shift-x',((px-.5)*20).toFixed(2)+'px');
      hero.style.setProperty('--hero-shift-y',((py-.5)*14).toFixed(2)+'px');
      hero.dataset.pointerActive='true';
    };
    const move=(event:PointerEvent)=>{
      if(event.pointerType!=='mouse'||!fine.matches||reduced.matches){reset();return}
      x=event.clientX;y=event.clientY;
      if(!frame)frame=window.requestAnimationFrame(update);
    };
    window.addEventListener('pointermove',move,{passive:true});
    window.addEventListener('blur',reset);
    window.addEventListener('scroll',reset,{passive:true});
    document.documentElement.addEventListener('pointerleave',reset);
    fine.addEventListener('change',reset);reduced.addEventListener('change',reset);
    return()=>{
      reset();
      window.removeEventListener('pointermove',move);
      window.removeEventListener('blur',reset);
      window.removeEventListener('scroll',reset);
      document.documentElement.removeEventListener('pointerleave',reset);
      fine.removeEventListener('change',reset);reduced.removeEventListener('change',reset);
    };
  },[member.id,member.photo]);

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

  const globalTextStyle=(key:'navBrand'|'navMenu'):CSSProperties=>{const s=config.textStyles[key];return {fontFamily:s.font||undefined,fontSize:s.size+'px',color:s.color||undefined,textAlign:s.align,translate:s.x+'px '+s.y+'px',letterSpacing:(s.letterSpacing??0)+'px',fontWeight:s.weight??undefined,opacity:(s.opacity??100)/100,textTransform:s.textTransform&&s.textTransform!=='none'?s.textTransform:undefined}};
  const renderSiteNavItem=(item:NavItemKey)=>item==='work'?
    <a key={item} href="/#work" data-portfolio-edit="navWorkLabel" style={globalTextStyle('navMenu')} onClick={e=>{e.preventDefault();if(!visualEditing)onNavigate('work')}}>{config.navWorkLabel}</a>
    :item==='about'?
    (config.showAbout?<a key={item} href="/#about" data-portfolio-edit="navAboutLabel" style={globalTextStyle('navMenu')} onClick={e=>{e.preventDefault();if(!visualEditing)onNavigate('about')}}>{config.navAboutLabel}</a>:null)
    :item==='team'?
    (config.showTeam?<a key={item} href="/#team" data-portfolio-edit="navTeamLabel" style={globalTextStyle('navMenu')} onClick={e=>{e.preventDefault();if(!visualEditing)onNavigate('team')}}>{config.navTeamLabel}</a>:null)
    :<button key={item} type="button" className="nav-contact" data-portfolio-edit="navContactLabel" style={globalTextStyle('navMenu')} onClick={()=>{if(!visualEditing)onContact()}}>{config.navContactLabel}</button>;

  const pageStyle={
    '--portfolio-columns':String(member.portfolioColumns||3),
    '--portfolio-gap':(member.portfolioGap||14)+'px',
    '--portfolio-radius':(member.portfolioRadius??18)+'px',
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
    '--portfolio-slider-card-width':Math.max(39.6,Math.min(88,(member.portfolioSliderWidth||100)*.88))+'vw',
    '--portfolio-slider-height':(member.portfolioSliderHeight||760)+'px',
    '--portfolio-slider-aspect':member.portfolioSliderAspect==='standard'?'4 / 5':member.portfolioSliderAspect==='square'?'1 / 1':member.portfolioSliderAspect==='photo'?'3 / 2':'16 / 9',
    '--portfolio-grid-width':(member.portfolioGridWidth||100)+'%',
    '--portfolio-work-x':(member.portfolioSections.work.x||0)+'px',
  } as CSSProperties;
  const sectionStyle=(key:PortfolioSectionKey):CSSProperties=>{
    const section=member.portfolioSections[key];
    return {
      translate:`${section.x||0}px ${section.y||0}px`,
      scale:String(section.scale||1),
      minHeight:section.minHeight>0?section.minHeight+'px':undefined,
      opacity:(section.opacity??100)/100,
      background:section.background||undefined,
      borderRadius:section.radius?section.radius+'px':undefined
    };
  };
  const dividerStyle=(divider:PortfolioDivider):CSSProperties=>({
    width:divider.width+'%',
    maxWidth:`calc(100% - ${divider.inset*2}px)`,
    borderTop:`${divider.thickness}px solid ${divider.color||'var(--ink)'}`,
    opacity:divider.opacity/100,
    margin:`${divider.marginTop}px auto ${divider.marginBottom}px`,
    translate:`0 ${divider.offsetY||0}px`
  });
  const renderDividers=(after:PortfolioSectionKey)=>(member.portfolioDividers||[]).filter(divider=>divider.after===after&&divider.visible).map(divider=><div key={divider.id} className="portfolio-section-divider" data-portfolio-divider-id={divider.id} style={dividerStyle(divider)} aria-hidden="true"/>);

  return <div className={'team-portfolio-page'+(visualEditing?' is-visual-editing':'')} style={pageStyle}>
    <header className="nav nav-recomposed team-portfolio-site-nav" data-portfolio-section="nav" data-portfolio-hidden={member.portfolioSections.nav.visible?'false':'true'} style={sectionStyle('nav')}>
      <div className="nav-left-tools"><button type="button" className="icon" aria-label={theme==='light'?'다크 모드':'라이트 모드'} title={theme==='light'?'다크 모드':'라이트 모드'} onClick={()=>{if(!visualEditing)onToggleTheme()}}>{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}</button></div>
      <nav className="nav-menu nav-menu-left">{config.navOrder.slice(0,2).map(renderSiteNavItem)}</nav>
      <a href="/" className="brand nav-centered-brand" onClick={e=>{e.preventDefault();if(!visualEditing)onNavigate('top')}}>{config.logo?<img src={config.logo} alt={config.name}/>:<span className="brand-editable-text" data-portfolio-edit="siteName" style={globalTextStyle('navBrand')}>{config.name}</span>}<span>®</span></a>
      <nav className="nav-menu nav-menu-right">{config.navOrder.slice(2).map(renderSiteNavItem)}</nav>
      <div className="nav-tools">
        <button type="button" className="admin-link" onClick={()=>{if(!visualEditing)onAdmin()}}>Admin</button>
        <button type="button" className="nav-edit-link" disabled={visualEditing} onClick={onEditSite}>{visualEditing?'Editing':'Edit Site'}</button>
      </div>
    </header>
    {renderDividers('nav')}

    <main className="team-portfolio-main">
      <section ref={heroRef} data-portfolio-section="hero" data-portfolio-hidden={member.portfolioSections.hero.visible?'false':'true'} style={sectionStyle('hero')} className={'team-portfolio-hero'+(member.photo?' has-hero-media':'')}>
        {member.photo&&<div className="team-portfolio-hero-media" aria-hidden="true">
          <TeamMedia src={member.photo} alt="" className="team-portfolio-hero-media-element" autoPlay/>
        </div>}
        {member.photo&&<div className="team-portfolio-hero-light" aria-hidden="true"/>}
      </section>
      {renderDividers('hero')}

      {teamMembers.length>1&&<section className="team-portfolio-member-index" data-portfolio-section="index" data-portfolio-hidden={member.portfolioSections.index.visible?'false':'true'} style={sectionStyle('index')} aria-label="Portfolio category navigation">
        <div className="team-member-index-head">
          <span><span data-portfolio-edit="indexLabel">{member.portfolioTeamIndexLabel||'CATEGORY INDEX'}</span> <span className="team-member-index-static">/ {String(memberIndex+1).padStart(2,'0')} — {String(teamMembers.length).padStart(2,'0')}</span></span>
          <div className="team-member-index-arrows">
            <button type="button" aria-label="이전 카테고리" onClick={memberPrev}><ChevronLeft size={17}/></button>
            <button type="button" aria-label="다음 카테고리" onClick={memberNext}><ChevronRight size={17}/></button>
          </div>
        </div>
        <div className="team-member-index-list">
          {teamMembers.map((item,i)=>{
            const active=item.id===member.id;
            const direction:1|-1=i>memberIndex?1:-1;
            return <button type="button" key={item.id} className={(active?'active ':'')+'member-reactive'} aria-current={active?'page':undefined} onPointerMove={reactPointer} onPointerLeave={resetPointer} onClick={()=>{if(visualEditing)return;if(memberSwipeMoved.current){memberSwipeMoved.current=false;return}if(!active)selectMember(item,direction)}}>
              <span className="team-member-index-name" data-portfolio-edit={active?'name':undefined}>{item.name||'Portfolio'}</span>
              <span className="team-member-index-number">{String(i+1).padStart(2,'0')}</span>
            </button>;
          })}
        </div>
      </section>}
      {renderDividers('index')}

      <section className="team-portfolio-work" data-portfolio-section="work" data-portfolio-hidden={member.portfolioSections.work.visible?'false':'true'} style={sectionStyle('work')}>
        <div className="team-portfolio-work-head">
          <div>
            <h2 data-portfolio-edit="title">{member.portfolioTitle||'Selected works'}</h2>
            {member.portfolioIntro&&<p data-portfolio-edit="intro">{member.portfolioIntro}</p>}
          </div>
          <span className="team-portfolio-layout-label">{member.portfolioLayout==='slider'?<GalleryHorizontal size={15}/>:<Grid2X2 size={15}/>} {member.portfolioLayout}</span>
        </div>
        {!!subcategories.length&&<div className="team-portfolio-subfilters" role="group" aria-label={(member.name||'Portfolio')+' 세부 카테고리'}>
          {['All',...subcategories].map(label=><button type="button" key={label} className={subcategory===label?'active':''} onClick={()=>{setSubcategory(label);setIndex(0);setViewerIndex(null)}}>{label}</button>)}
        </div>}

        {member.portfolioLayout==='grid'&&<div className="team-portfolio-grid">
          {Array.from({length:Math.max(9,works.length)},(_,i)=>{
            const item=galleryItems[i],url=item?.src,sourceIndex=item?.sourceIndex;
            return url?<button type="button" className="team-portfolio-grid-item" data-portfolio-work-index={sourceIndex} key={url+i} onClick={()=>{if(!visualEditing)openViewer(i)}}>
              <TeamMedia src={url} alt={(member.name||'Portfolio')+' portfolio '+(i+1)} className="team-portfolio-work-media" autoPlay/>
              <span className="team-portfolio-grid-index">{String(i+1).padStart(2,'0')}</span>
            </button>:<div className="team-portfolio-grid-item is-empty" key={'empty-'+i} aria-hidden="true"><span className="team-portfolio-grid-index">{String(i+1).padStart(2,'0')}</span></div>
          })}
        </div>}

        {!!works.length&&member.portfolioLayout==='slider'&&<div className="team-portfolio-slider" data-portfolio-edit="layout"><MediaGallery items={galleryItems} initialIndex={index} onIndexChange={setIndex} onExpand={()=>{if(!visualEditing)openViewer(index)}} balanceEdges/></div>}
      </section>
      {renderDividers('work')}
    </main>

    {teamMembers.length>1&&<nav className="team-portfolio-member-switch" data-portfolio-section="switcher" data-portfolio-hidden={member.portfolioSections.switcher.visible?'false':'true'} style={sectionStyle('switcher')} aria-label="Previous and next portfolio category">
      <button type="button" onClick={()=>{if(!visualEditing)memberPrev()}}><ChevronLeft size={17}/><span><small>PREVIOUS</small>{teamMembers[(memberIndex-1+teamMembers.length)%teamMembers.length]?.name}</span></button>
      <button type="button" onClick={()=>{if(!visualEditing)memberNext()}}><span><small>NEXT</small>{teamMembers[(memberIndex+1)%teamMembers.length]?.name}</span><ChevronRight size={17}/></button>
    </nav>}
    {renderDividers('switcher')}

    <footer className="team-portfolio-footer" data-portfolio-section="footer" data-portfolio-hidden={member.portfolioSections.footer.visible?'false':'true'} style={sectionStyle('footer')}><span>© 2026 {config.name}</span><button type="button" data-portfolio-edit="footerReturn" onClick={()=>{if(!visualEditing)onBack()}}>{member.portfolioReturnLabel||'Back to team'}</button></footer>
    {renderDividers('footer')}

    <MediaGalleryDialog items={galleryItems} index={viewerIndex} onClose={closeViewer} onIndexChange={setViewerIndex}/>
  </div>
}
