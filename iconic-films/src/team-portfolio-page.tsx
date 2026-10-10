'use client';
import {useEffect,useMemo,useRef,useState,type CSSProperties,type PointerEvent as ReactPointerEvent} from 'react';
import {ChevronLeft,ChevronRight,Grid2X2,GalleryHorizontal,Moon,Sun} from 'lucide-react';
import MediaGalleryDialog,{MediaGallery,portfolioMediaFrame} from './media-gallery';
import type {Config,NavItemKey,PortfolioDivider,PortfolioMediaRatio,PortfolioSectionKey,TeamMember} from './defaults';
import TeamMedia,{teamMediaType} from './team-media';
import PortfolioHoverCredits from './portfolio-hover-credits';
import useCompactLayout from './use-compact-layout';
import SiteMenu,{type SiteMenuItem} from './site-menu';

function PortfolioGridCard({src,ratio,index,sourceIndex,name,title,kicker,info,credits,onOpen,visualEditing,viewerOpen}:{src:string;ratio:PortfolioMediaRatio;index:number;sourceIndex:number;name:string;title:string;kicker?:string;info?:string;credits?:string;onOpen:(preview?:HTMLVideoElement|null)=>void;visualEditing:boolean;viewerOpen:boolean}){
  const [frameRatio,setFrameRatio]=useState(()=>ratio==='auto'?4/5:portfolioMediaFrame(1,1,ratio).ratio);
  useEffect(()=>{
    if(ratio!=='auto'){setFrameRatio(portfolioMediaFrame(1,1,ratio).ratio);return}
    const kind=teamMediaType(src);
    if(kind==='model'){setFrameRatio(16/9);return}
    if(kind==='image'){
      let live=true;const image=new Image();
      image.onload=()=>{if(live)setFrameRatio(portfolioMediaFrame(image.naturalWidth,image.naturalHeight,'auto').ratio)};
      image.src=src;return()=>{live=false;image.onload=null};
    }
    // Touch grids already crop previews to 4:5. Avoid creating a second
    // metadata-only video decoder/network request for every visible card.
    if(window.matchMedia('(max-width: 1024px), (any-pointer: coarse)').matches){setFrameRatio(4/5);return}
    const video=document.createElement('video');
    const loaded=()=>setFrameRatio(portfolioMediaFrame(video.videoWidth,video.videoHeight,'auto').ratio);
    video.preload='metadata';video.addEventListener('loadedmetadata',loaded,{once:true});video.src=src;
    return()=>{video.removeEventListener('loadedmetadata',loaded);video.removeAttribute('src');video.load()};
  },[src,ratio]);
  return <button type="button" className="team-portfolio-grid-item has-portfolio-credits" data-portfolio-work-index={sourceIndex} aria-label={[title||name,kicker,info,credits,'작품 열기'].filter(Boolean).join(' · ')} style={{'--portfolio-item-ratio':String(frameRatio)} as CSSProperties} onClick={event=>{if(!visualEditing)onOpen(event.currentTarget.querySelector('video'))}}>
    <TeamMedia src={src} alt={name+' portfolio '+(index+1)} className="team-portfolio-work-media" autoPlay suspended={viewerOpen}/>
    <PortfolioHoverCredits title={title} kicker={kicker} info={info} credits={credits}/>
    
  </button>;
}

export default function TeamPortfolioPage({config,member,theme,onBack,onNavigate,onSelectMember,onToggleTheme,onContact,onAdmin,onVideoViewerOpen,onVideoViewerClose,onMemberEdit,onEditSite,visualEditing=false}:{config:Config;member:TeamMember;theme:string;onBack:()=>void;onNavigate:(target:'top'|'work'|'about'|'team')=>void;onSelectMember:(member:TeamMember,direction?:1|-1)=>void;onToggleTheme:()=>void;onContact:()=>void;onAdmin:()=>void;onVideoViewerOpen:()=>void;onVideoViewerClose:()=>void;onMemberEdit:(member:TeamMember)=>void;onEditSite:()=>void;visualEditing?:boolean}){
  const compact=useCompactLayout();
  const [index,setIndex]=useState(0);
  const [subcategory,setSubcategory]=useState('All');
  const [viewerIndex,setViewerIndex]=useState<number|null>(null);
  const [handoffVideo,setHandoffVideo]=useState<HTMLVideoElement|null>(null);
  const heroRef=useRef<HTMLElement>(null);
  const viewerMusicHeld=useRef(false);
  const memberSwipeStart=useRef<{x:number;y:number}|null>(null);
  const memberSwipeMoved=useRef(false);
  const subcategories=useMemo(()=>member.portfolioSubcategories||[],[member.portfolioSubcategories]);
  const galleryItems=useMemo(()=>(member.works||[]).map((src,i)=>({
    id:member.id+'-'+i,src,sourceIndex:i,title:member.portfolioWorkTitles?.[i]||member.name||'Portfolio',
    info:member.portfolioWorkInfo?.[i]||'',
    credits:member.portfolioCreditsVisible!==false?(member.portfolioWorkCredits?.[i]??member.portfolioCredits??''):'',
    category:member.portfolioWorkCategories?.[i]||subcategories[0]||'All',
    kicker:member.portfolioWorkCategories?.[i]||subcategories[0]||'All',
    ratio:member.portfolioWorkRatios?.[i]||'auto'
  })).filter(item=>!!item.src?.trim()&&(subcategory==='All'||item.category===subcategory)),[member.id,member.name,member.works,member.portfolioWorkCategories,member.portfolioWorkTitles,member.portfolioWorkInfo,member.portfolioWorkCredits,member.portfolioWorkRatios,member.portfolioCredits,member.portfolioCreditsVisible,subcategories,subcategory]);
  const works=useMemo(()=>galleryItems.map(item=>item.src),[galleryItems]);
  const teamMembers=useMemo(()=>(config.teamMembers||[]).filter(item=>item.visible),[config.teamMembers]);
  // Fashion (first visible portfolio) is the shared layout master. Content stays per-category,
  // but geometry must be identical on Fashion / Commercial / Events.
  const layoutMaster=teamMembers[0]||member;
  const memberIndex=Math.max(0,teamMembers.findIndex(item=>item.id===member.id));
  const selectMember=(target:TeamMember,direction:1|-1)=>{if(target&&target.id!==member.id)onSelectMember(target,direction)};
  const memberPrev=()=>teamMembers.length&&selectMember(teamMembers[(memberIndex-1+teamMembers.length)%teamMembers.length],-1);
  const memberNext=()=>teamMembers.length&&selectMember(teamMembers[(memberIndex+1)%teamMembers.length],1);
  const prev=()=>setIndex(i=>(i-1+works.length)%works.length);
  const next=()=>setIndex(i=>(i+1)%works.length);
  const openViewer=(i:number,preview?:HTMLVideoElement|null)=>{
    // Keep the original decoded iPhone video and its buffered timeline.
    const mobile=window.matchMedia('(max-width: 1024px), (any-pointer: coarse)').matches;
    const canReuse=mobile&&!!preview&&preview.readyState>=1&&
      teamMediaType(works[i]||'')==='video'&&preview.getAttribute('src')===works[i];
    if(canReuse&&preview){
      preview.dataset.fullscreenHandoff='true';
      // This is still inside the actual tap/click gesture: ask iOS for sound
      // without recreating, seeking or rebuffering the playing element.
      if(preview.muted){
        preview.muted=false;
        preview.defaultMuted=false;
        void preview.play().catch(()=>{
          preview.muted=true;
          preview.defaultMuted=true;
          void preview.play().catch(()=>{});
        });
      }
      setHandoffVideo(preview);
    }
    else setHandoffVideo(null);
    setViewerIndex(i);
  };
  const closeViewer=()=>{setViewerIndex(null);setHandoffVideo(null)};
  useEffect(()=>{
    setIndex(0);
    setSubcategory('All');
    setViewerIndex(null);
    setHandoffVideo(null);
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

  const globalTextStyle=(key:'navBrand'|'navMenu'):CSSProperties=>{
    const s=config.textStyles[key];
    return {
      fontFamily:s.font||undefined,
      fontSize:(compact?Math.min(s.size,key==='navBrand'?23:13):s.size)+'px',
      color:s.color||undefined,textAlign:s.align,
      translate:compact?'0px 0px':s.x+'px '+s.y+'px',
      letterSpacing:(s.letterSpacing??0)+'px',
      fontWeight:s.weight??undefined,opacity:(s.opacity??100)/100,
      textTransform:s.textTransform&&s.textTransform!=='none'?s.textTransform:undefined
    };
  };
  const renderSiteNavItem=(item:NavItemKey)=>item==='work'?
    <a key={item} href="/#work" data-portfolio-edit="navWorkLabel" style={globalTextStyle('navMenu')} onClick={e=>{e.preventDefault();if(!visualEditing)onNavigate('work')}}>{config.navWorkLabel}</a>
    :item==='about'?
    (config.showAbout?<a key={item} href="/#about" data-portfolio-edit="navAboutLabel" style={globalTextStyle('navMenu')} onClick={e=>{e.preventDefault();if(!visualEditing)onNavigate('about')}}>{config.navAboutLabel}</a>:null)
    :item==='team'?
    (config.showTeam?<a key={item} href="/#team" data-portfolio-edit="navTeamLabel" style={globalTextStyle('navMenu')} onClick={e=>{e.preventDefault();if(!visualEditing)onNavigate('team')}}>{config.navTeamLabel}</a>:null)
    :<button key={item} type="button" className="nav-contact" data-portfolio-edit="navContactLabel" style={globalTextStyle('navMenu')} onClick={()=>{if(!visualEditing)onContact()}}>{config.navContactLabel}</button>;

  const menuItems:SiteMenuItem[]=config.navOrder.flatMap<SiteMenuItem>((item:NavItemKey):SiteMenuItem[]=>{
    if(item==='work')return [{key:item,label:config.navWorkLabel,visualTextKey:'navWorkLabel',onSelect:()=>onNavigate('work')}];
    if(item==='about')return config.showAbout?[{key:item,label:config.navAboutLabel,visualTextKey:'navAboutLabel',onSelect:()=>onNavigate('about')}]:[];
    if(item==='team')return config.showTeam?[{key:item,label:config.navTeamLabel,visualTextKey:'navTeamLabel',onSelect:()=>onNavigate('team')}]:[];
    return [{key:item,label:config.navContactLabel,visualTextKey:'navContactLabel',onSelect:onContact}];
  });
  const pageStyle={
    '--portfolio-columns':String(layoutMaster.portfolioColumns||3),
    '--portfolio-gap':(layoutMaster.portfolioGap||14)+'px',
    '--portfolio-radius':(layoutMaster.portfolioRadius??18)+'px',
    '--portfolio-name-font':member.portfolioNameFont||'Arial, Helvetica, sans-serif',
    '--portfolio-name-size':(compact?Math.min(layoutMaster.portfolioNameSize||112,54):layoutMaster.portfolioNameSize||112)+'px',
    '--portfolio-name-color':member.portfolioNameColor||'var(--ink)',
    '--portfolio-name-align':member.portfolioNameAlign||'left',
    '--portfolio-name-x':(layoutMaster.portfolioNameX||0)+'px',
    '--portfolio-name-y':(layoutMaster.portfolioNameY||0)+'px',
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
    '--portfolio-title-size':(compact?Math.min(layoutMaster.portfolioTitleSize||76,48):layoutMaster.portfolioTitleSize||76)+'px',
    '--portfolio-title-color':member.portfolioTitleColor||'var(--ink)',
    '--portfolio-title-align':member.portfolioTitleAlign||'left',
    '--portfolio-title-x':(layoutMaster.portfolioTitleX||0)+'px',
    '--portfolio-title-y':(layoutMaster.portfolioTitleY||0)+'px',
    '--portfolio-intro-font':member.portfolioIntroFont||'Arial, Helvetica, sans-serif',
    '--portfolio-intro-size':(layoutMaster.portfolioIntroSize||14)+'px',
    '--portfolio-intro-color':member.portfolioIntroColor||'var(--soft)',
    '--portfolio-intro-align':member.portfolioIntroAlign||'left',
    '--portfolio-intro-x':(layoutMaster.portfolioIntroX||0)+'px',
    '--portfolio-intro-y':(layoutMaster.portfolioIntroY||0)+'px',
    '--portfolio-utility-font':member.portfolioUtilityFont||'Arial, Helvetica, sans-serif',
    '--portfolio-utility-size':(layoutMaster.portfolioUtilitySize||11)+'px',
    '--portfolio-utility-color':member.portfolioUtilityColor||'var(--soft)',
    '--portfolio-utility-align':member.portfolioUtilityAlign||'left',
    '--portfolio-utility-x':(layoutMaster.portfolioUtilityX||0)+'px',
    '--portfolio-utility-y':(layoutMaster.portfolioUtilityY||0)+'px',
    '--portfolio-return-x':(layoutMaster.portfolioReturnX||0)+'px',
    '--portfolio-return-y':(layoutMaster.portfolioReturnY||0)+'px',
    '--portfolio-slider-width':(layoutMaster.portfolioSliderWidth||100)+'%',
    '--portfolio-slider-height':(compact?Math.min(layoutMaster.portfolioSliderHeight||760,560):layoutMaster.portfolioSliderHeight||760)+'px',
    '--portfolio-slider-landscape-vw':Math.max(30,(layoutMaster.portfolioSliderWidth||100)*.665)+'vw',
    '--portfolio-slider-portrait-vw':Math.max(24,(layoutMaster.portfolioSliderWidth||100)*.42)+'vw',
    '--portfolio-slider-square-vw':Math.max(28,(layoutMaster.portfolioSliderWidth||100)*.54)+'vw',
    '--portfolio-grid-width':(layoutMaster.portfolioGridWidth||100)+'%',
    '--portfolio-work-x':(compact?0:layoutMaster.portfolioSections.work.x||0)+'px',
  } as CSSProperties;
  const effectivePortfolioOrder=(member.portfolioSectionOrder||['nav','hero','index','work','switcher','footer']).filter((key):key is PortfolioSectionKey=>['hero','index','work'].includes(key));
  const sectionStyle=(key:PortfolioSectionKey):CSSProperties=>{
    const own=member.portfolioSections[key];
    const shared=(key==='index'||key==='work')?(layoutMaster.portfolioSections[key]||own):own;
    return {
      translate:compact?'0px 0px':`${shared.x||0}px ${shared.y||0}px`,
      scale:String(compact?1:shared.scale||1),
      minHeight:compact?undefined:shared.minHeight>0?shared.minHeight+'px':undefined,
      opacity:(own.opacity??100)/100,
      order:effectivePortfolioOrder.indexOf(key)<0?0:effectivePortfolioOrder.indexOf(key)*10,
      '--portfolio-section-rank':effectivePortfolioOrder.indexOf(key)<0?0:effectivePortfolioOrder.indexOf(key)*10,
      background:own.background||undefined,
      borderRadius:own.radius?own.radius+'px':undefined
    } as CSSProperties;
  };
  const dividerStyle=(divider:PortfolioDivider):CSSProperties=>({
    width:divider.width+'%',
    maxWidth:`calc(100% - ${divider.inset*2}px)`,
    borderTop:`${divider.thickness}px solid ${divider.color||'var(--ink)'}`,
    opacity:divider.opacity/100,
    margin:`${divider.marginTop}px auto ${divider.marginBottom}px`,
    translate:`0 ${divider.offsetY||0}px`
  });
  const renderDividers=(_after:PortfolioSectionKey)=>null;

  return <div className={'team-portfolio-page'+(visualEditing?' is-visual-editing':'')} style={pageStyle}>
    <header className="nav nav-recomposed team-portfolio-site-nav vii-minimal-nav" data-portfolio-section="nav" data-portfolio-hidden={member.portfolioSections.nav.visible?'false':'true'} style={sectionStyle('nav')}>
      <div className="nav-tools"><SiteMenu items={menuItems} fontFamily={config.font} onAdmin={onAdmin} onEdit={onEditSite} theme={theme} onToggleTheme={()=>{if(!visualEditing)onToggleTheme()}} editing={visualEditing}/></div>
    </header>
    {renderDividers('nav')}

    <main className="team-portfolio-main" style={{display:'flex',flexDirection:'column'}}>
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
          {Array.from({length:visualEditing?Math.max(9,works.length):works.length},(_,i)=>{
            const item=galleryItems[i],url=item?.src,sourceIndex=item?.sourceIndex;
            return url?<PortfolioGridCard key={url+i} src={url} ratio={item.ratio||'auto'} index={i} sourceIndex={sourceIndex??i} name={member.name||'Portfolio'} title={item.title} kicker={item.kicker} info={item.info} credits={item.credits} onOpen={preview=>openViewer(i,preview)} visualEditing={visualEditing} viewerOpen={viewerIndex!==null}/>:<div className="team-portfolio-grid-item is-empty" key={'empty-'+i} aria-hidden="true"></div>
          })}
        </div>}

        {!!works.length&&member.portfolioLayout==='slider'&&<div className="team-portfolio-slider"><MediaGallery items={galleryItems} initialIndex={index} onIndexChange={setIndex} onExpand={(_,preview)=>{if(!visualEditing)openViewer(index,preview)}} balanceEdges autoPlay={member.portfolioSliderAutoplay!==false} autoplayMs={member.portfolioSliderAutoplayMs||6500} transitionMs={member.portfolioSliderTransitionMs||820} easing={member.portfolioSliderEasing||'smooth'} maxCardHeight={compact?Math.min(member.portfolioSliderHeight||760,560):member.portfolioSliderHeight||760}/></div>}
      </section>
      {renderDividers('work')}
    </main>

    {teamMembers.length>1&&<nav className="team-portfolio-member-switch" data-portfolio-section="switcher" data-portfolio-hidden={member.portfolioSections.switcher.visible?'false':'true'} style={sectionStyle('switcher')} aria-label="Previous and next portfolio category">
      <button type="button" onClick={()=>{if(!visualEditing)memberPrev()}}><ChevronLeft size={17}/><span><small>PREVIOUS</small>{teamMembers[(memberIndex-1+teamMembers.length)%teamMembers.length]?.name}</span></button>
      <button type="button" onClick={()=>{if(!visualEditing)memberNext()}}><span><small>NEXT</small>{teamMembers[(memberIndex+1)%teamMembers.length]?.name}</span><ChevronRight size={17}/></button>
    </nav>}
    {renderDividers('switcher')}

    <footer className="team-portfolio-footer" data-portfolio-section="footer" data-portfolio-hidden={member.portfolioSections.footer.visible?'false':'true'} style={sectionStyle('footer')}><span>© 2026 {config.name}</span><button type="button" data-portfolio-edit="footerReturn" onClick={()=>{if(!visualEditing)onBack()}}>{compact?'Back to team':member.portfolioReturnLabel||'Back to team'}</button></footer>
    {renderDividers('footer')}

    <MediaGalleryDialog items={galleryItems} index={viewerIndex} borrowedVideo={handoffVideo} onClose={closeViewer} onIndexChange={setViewerIndex} autoPlay={!!handoffVideo||member.portfolioSliderAutoplay!==false} autoplayMs={member.portfolioSliderAutoplayMs||6500} transitionMs={member.portfolioSliderTransitionMs||820} easing={member.portfolioSliderEasing||'smooth'}/>
  </div>
}
