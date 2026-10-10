'use client';
import {Fragment,useState,useEffect,useRef,CSSProperties} from 'react';
import {Sun,Moon,Play,Pause,SkipBack,SkipForward,Shuffle,Repeat,Repeat1,Volume2,VolumeX,Music2,X,Plus,Trash2,Eye,Save,Check,ChevronUp,ChevronDown,ChevronLeft,ChevronRight,MoveUpRight,SlidersHorizontal,Disc3,Settings2} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {InputOTP,InputOTPGroup,InputOTPSlot} from '@/components/ui/input-otp';
import {Slider} from '@/components/ui/slider';
import {Switch} from '@/components/ui/switch';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {initial,normalizeConfig,Config,Work,Track,TeamMember,NavItemKey,SiteSectionKey} from './defaults';
import viiviiPublicSnapshot from './viivii-public-snapshot.json';
import ModelScene from './model-scene';
import MediaLibrary,{playlistsOf} from './media-library';
import PointerExperience from './pointer-experience';
import MainLogo from './main-logo';
import MediaGalleryDialog,{MediaGallery,type GalleryItem} from './media-gallery';
import ScrollReveal from './scroll-reveal';
import TeamSection from './team-section';
import TeamPortfolioTransition from './team-portfolio-transition';
import MemberPortfolioEditor from './member-portfolio-editor';
import ContactDialog from './contact-dialog';
import ContactInbox from './contact-inbox';
import SiteContactNotifications from './site-contact-notifications';
import VisualSiteEditor,{type VisualSelection} from './visual-site-editor';
import SiteMenu,{type SiteMenuItem} from './site-menu';
import PortfolioVisualEditor from './portfolio-visual-editor';
import {ensureFontFamilies} from './font-picker';
import PageBlockView from './page-block-view';
import {teamMediaType} from './team-media';
import {adminHeaders,rememberAdminVisit,clearAdminVisit,getAdminVisitEpoch,revokeAdminVisit,hasAdminVisit} from './admin-session';
import {memberRequest,rememberMemberVisit,clearMemberVisit,hasMemberVisit} from './member-session';
const fmt=(v:number)=>`${Math.floor((v||0)/60)}:${String(Math.floor((v||0)%60)).padStart(2,'0')}`;
const accentContrast=(hex:string)=>{
 const m=/^#?([0-9a-f]{6})$/i.exec(hex||'');
 if(!m)return '#ffffff';
 const n=parseInt(m[1],16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;
 const lum=(.2126*r+.7152*g+.0722*b)/255;
 return lum>.62?'#111111':'#ffffff';
};
import {api} from './site-api';
const SITE_CONFIG_CACHE_KEY='viivii-site-config-v1';
// The bundled ICONIC demo is NOT a published VIIVII config. Never let it
// overwrite the original site's locally cached portfolio or appear as truth.
function isRetiredIconicSnapshot(value:any){
 return !!value&&String(value.name||'').trim()==='ICONIC'
  &&Array.isArray(value.works)
  &&value.works.some((item:any)=>item?.title==='Billboard Korea Freaky Day 2');
}
function readCachedConfig(){
 try{
  if(typeof window==='undefined')return null;
  const raw=localStorage.getItem(SITE_CONFIG_CACHE_KEY);
  if(!raw)return null;
  const parsed=JSON.parse(raw);
  return isRetiredIconicSnapshot(parsed)?null:normalizeConfig(parsed);
 }catch{return null}
}
function cachedTheme(fallback:string){
 try{return typeof window!=='undefined'?(localStorage.getItem('iconic-theme')||fallback):fallback}catch{return fallback}
}
function Choice({value,options,onChange}:{value:string;options:string[];onChange:(x:string)=>void}){return <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{options.map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>}
function Btn({label,children,onClick,active=false}:{label:string;children:React.ReactNode;onClick:()=>void;active?:boolean}){return <button title={label} aria-label={label} aria-pressed={active} className={'icon '+(active?'active':'')} onClick={onClick}>{children}</button>}
export default function Home(){
 const cached=useRef<Config|null|undefined>(undefined);
 if(cached.current===undefined)cached.current=readCachedConfig();
 // A static, sanitized VIIVII editorial snapshot is always available even
 // when Supabase temporarily returns 402. Never fall back to retired ICONIC.
 const bootConfig=cached.current||normalizeConfig(viiviiPublicSnapshot);
 const workbenchPreview=typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('viivii-workbench-preview')==='1';
 const [hasBootConfig]=useState(true);
 const [heroReadySource,setHeroReadySource]=useState<string>('');
 const [saved,setSaved]=useState<Config>(bootConfig),[draft,setDraft]=useState<Config>(bootConfig),[theme,setTheme]=useState(()=>cachedTheme(bootConfig.theme)),[admin,setAdmin]=useState(false),[preview,setPreview]=useState(false),[login,setLogin]=useState(false),[loginTarget,setLoginTarget]=useState<'admin'|'visual'>('admin'),[pin,setPin]=useState(''),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[category,setCategory]=useState('All'),[work,setWork]=useState<Work|null>(null),[music,setMusic]=useState(false),[track,setTrack]=useState(0),[playing,setPlaying]=useState(false),[shuffle,setShuffle]=useState(bootConfig.musicShuffle),[repeat,setRepeat]=useState(bootConfig.musicRepeatMode==='one'?1:bootConfig.musicRepeatMode==='all'?2:0),[time,setTime]=useState(0),[duration,setDuration]=useState(0),[group,setGroup]=useState('Tracks'),[filter,setFilter]=useState('All'),[volume,setVolume]=useState(bootConfig.volume),[newPin,setNewPin]=useState(''),[loaded,setLoaded]=useState(false),[scrollTarget,setScrollTarget]=useState<'top'|'bottom'>('bottom'),[autoplayBlocked,setAutoplayBlocked]=useState(false),[editorTab,setEditorTab]=useState('music'),[contactOpen,setContactOpen]=useState(false),[teamRoute,setTeamRoute]=useState(()=>typeof window==='undefined'?'':decodeURIComponent(window.location.pathname.match(/^\/team\/([^/]+)/)?.[1]||'')),[teamPageClosing,setTeamPageClosing]=useState(false),[adminClosing,setAdminClosing]=useState(false),[ownerMode,setOwnerMode]=useState(false),[memberLogin,setMemberLogin]=useState<TeamMember|null>(null),[memberPin,setMemberPin]=useState(''),[memberEditor,setMemberEditor]=useState<TeamMember|null>(null),[memberDraft,setMemberDraft]=useState<TeamMember|null>(null),[memberBusy,setMemberBusy]=useState(false),[teamPins,setTeamPins]=useState<Record<string,string>>({});
 const [focusIndex,setFocusIndex]=useState<number|null>(null);
 const [configLoadError,setConfigLoadError]=useState('');
 const [visualEdit,setVisualEdit]=useState(false),[visualSelection,setVisualSelection]=useState<VisualSelection>('hero');
 const draftRef=useRef<Config>(bootConfig),visualUndoStack=useRef<Config[]>([]),visualLastMutationAt=useRef(0);
 const visualEntryThemeRef=useRef(theme),visualThemeEditedRef=useRef(false);
 const navDragItemRef=useRef<NavItemKey|null>(null);
 const [navDraggingItem,setNavDraggingItem]=useState<NavItemKey|null>(null),[navDropItem,setNavDropItem]=useState<NavItemKey|null>(null);
 const musicButton=useRef<HTMLButtonElement>(null),musicPanel=useRef<HTMLElement>(null);
 const startup=useRef(false),audio=useRef<HTMLAudioElement>(null),filmWasPlaying=useRef(false),teamVideoWasPlaying=useRef(false),drag=useRef<{x:number;y:number}|null>(null),frame=useRef<HTMLDivElement>(null),lastScrollY=useRef(0),videoWarm=useRef(new Map<string,HTMLVideoElement>());
 const [compactViewport,setCompactViewport]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(max-width: 1024px), (max-width: 1366px) and (any-pointer: coarse)').matches);
 const c=visualEdit?draft:(preview?draft:saved), t=c.tracks[track];
 const sectionRank=(key:SiteSectionKey)=>{const i=(c.sectionOrder||[]).indexOf(key);return (i<0?99:i)*100};
 const sectionStyle=(key:SiteSectionKey):CSSProperties=>{
  const height=Math.max(0,Number(c.sectionHeights?.[key]||0));
  if(compactViewport)return {order:sectionRank(key),height:'auto',minHeight:0};
  if(key==='footer')return {order:sectionRank(key)};
  if(key==='about'&&height>0)return {order:sectionRank(key),height:height+'px',minHeight:0};
  return {order:sectionRank(key),minHeight:height>0?height+'px':undefined};
 };
 const dividerStyle=(divider:Config['sectionDividers'][number]):CSSProperties=>({
  order:sectionRank(divider.after)+50,
  width:divider.width+'%',
  maxWidth:`calc(100% - ${divider.inset*2}px)`,
  borderTop:`${divider.thickness}px solid ${divider.color||'var(--ink)'}`,
  opacity:divider.opacity/100,
  margin:compactViewport ? `${Math.min(20,Math.max(0,divider.marginTop))}px auto ${Math.min(20,Math.max(0,divider.marginBottom))}px` : `${divider.marginTop}px auto ${divider.marginBottom}px`,
  translate:compactViewport?'0 0':`0 ${divider.offsetY||0}px`
 });
 useEffect(()=>{
  if(workbenchPreview)return;
  let cancelled=false;
  api('/api/config').then(j=>{
   if(!j.config||isRetiredIconicSnapshot(j.config)||j.source==='development-seed'){
    throw Error('현재 게시된 VIIVII 설정이 아닌 기본 설정이 반환됐습니다.');
   }
   if(cancelled)return;
   const v=normalizeConfig(j.config);
   if(isRetiredIconicSnapshot(v))throw Error('기존 ICONIC 기본 설정은 적용하지 않습니다.');
   // Only a confirmed saved config may replace the last good local snapshot.
   try{localStorage.setItem(SITE_CONFIG_CACHE_KEY,JSON.stringify(v))}catch{}
   setSaved(v);setDraft(v);setTheme(cachedTheme(v.theme));
   setVolume(v.volume);setShuffle(v.musicShuffle);
   setRepeat(v.musicRepeatMode==='one'?1:v.musicRepeatMode==='all'?2:0);
   setConfigLoadError('');setLoaded(true);
  }).catch(e=>{
   if(cancelled)return;
   const message=e instanceof Error?e.message:'사이트 설정을 확인할 수 없습니다.';
   console.warn('VIIVII: retaining last known good config',message);
   setConfigLoadError(message);setLoaded(true);
   // Do not save defaults or erase the user's older working cache.
   if(!cached.current||isRetiredIconicSnapshot(cached.current)){
    document.documentElement.dataset.siteBootReady='true';
   }
  });
  return()=>{cancelled=true};
 },[]);
 useEffect(()=>{
  if(!workbenchPreview||window.parent===window)return;
  document.documentElement.dataset.viiviiPreview='true';
  const send=(payload:Record<string,unknown>)=>window.parent.postMessage({source:'viivii-preview',...payload},window.location.origin);
  const markSelected=(el:HTMLElement)=>{
   document.querySelectorAll<HTMLElement>('[data-viivii-preview-selected]').forEach(node=>delete node.dataset.viiviiPreviewSelected);
   el.dataset.viiviiPreviewSelected='true';
  };
  const message=(event:MessageEvent)=>{
   if(event.origin!==window.location.origin||event.source!==window.parent)return;
   const data=event.data;
   if(!data||data.source!=='viivii-editor')return;
   if(data.type==='sync'&&data.config){
    const next=normalizeConfig(data.config as Config);
    setSaved(next);setDraft(next);setLoaded(true);
    setTheme(next.theme);
   }
   if(data.type==='focus'&&typeof data.selection==='string'){
    const selection=data.selection as string;
    const query=selection.startsWith('work:')
      ?'[data-visual-work-id="'+CSS.escape(selection.slice(5))+'"],[data-portfolio-work-index="'+CSS.escape(selection.slice(5))+'"]'
      :selection.startsWith('text:')
      ?'[data-visual-text="'+CSS.escape(selection.slice(5))+'"],[data-portfolio-edit="'+CSS.escape(selection.slice(5))+'"]'
      :'[data-visual-section="'+CSS.escape(selection)+'"],[data-portfolio-section="'+CSS.escape(selection)+'"]';
    const el=document.querySelector<HTMLElement>(query);
    if(el){markSelected(el);el.scrollIntoView({behavior:'smooth',block:'center'})}
   }
  };
  const select=(e:MouseEvent)=>{
   const target=e.target;
   if(!(target instanceof HTMLElement))return;
   const data=target.closest<HTMLElement>('[data-visual-text],[data-visual-work-text],[data-visual-team-text],[data-visual-divider-id],[data-visual-block-id],[data-visual-work-id],[data-visual-section],[data-portfolio-work-index],[data-portfolio-edit],[data-portfolio-section]');
   if(!data)return;
   e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
   const choice=
    data.dataset.visualText?'text:'+data.dataset.visualText:
    data.dataset.visualWorkText?'worktext:'+data.dataset.visualWorkText:
    data.dataset.visualTeamText?'teamtext:'+data.dataset.visualTeamText:
    data.dataset.visualDividerId?'divider:'+data.dataset.visualDividerId:
    data.dataset.visualBlockId?'block:'+data.dataset.visualBlockId:
    data.dataset.visualWorkId?'work:'+data.dataset.visualWorkId:
    data.dataset.portfolioWorkIndex!==undefined?'work:'+data.dataset.portfolioWorkIndex:
    data.dataset.portfolioEdit?'text:'+data.dataset.portfolioEdit:
    data.dataset.visualSection||data.dataset.portfolioSection||'hero';
   markSelected(data);
   send({type:'select',selection:choice});
  };
  window.addEventListener('message',message);
  document.addEventListener('click',select,true);
  send({type:'ready'});
  return()=>{window.removeEventListener('message',message);document.removeEventListener('click',select,true);delete document.documentElement.dataset.viiviiPreview};
 },[workbenchPreview]);
 useEffect(()=>{
  // A fixed liquid-glass header should not hide editorial text while reading.
  // On touch viewports it retracts while scrolling down and returns on scroll up.
  let last=window.scrollY,upward=0,downward=0;
  const mobile=window.matchMedia('(max-width: 1024px), (max-width: 1366px) and (any-pointer: coarse)');
  const update=()=>{
    const y=Math.max(0,window.scrollY);
    // Homepage: invisible frame on the hero; restore the original adaptive
    // liquid-glass frame after scrolling down. Same behaviour on Team pages.
    document.documentElement.classList.toggle('viivii-nav-scrolled',y>Math.max(110,window.innerHeight*.28));
    const delta=y-last;
    if(!mobile.matches||y<85){
      upward=0;downward=0;
      document.documentElement.classList.remove('mobile-nav-hidden');
    }else if(delta>1){
      upward=0;downward+=delta;
      if(y>165&&downward>=12)document.documentElement.classList.add('mobile-nav-hidden');
    }else if(delta< -1){
      downward=0;upward+=-delta;
      // Ignore tiny Safari scroll bounce; reveal only after intentional
      // upward scrolling so the header cannot cover editorial headings.
      if(upward>=72){
        document.documentElement.classList.remove('mobile-nav-hidden');
        upward=0;
      }
    }
    last=y;
  };
  update();
  window.addEventListener('scroll',update,{passive:true});
  window.addEventListener('resize',update,{passive:true});
  mobile.addEventListener?.('change',update);
  return()=>{
    window.removeEventListener('scroll',update);
    window.removeEventListener('resize',update);
    mobile.removeEventListener?.('change',update);
    document.documentElement.classList.remove('mobile-nav-hidden','viivii-nav-scrolled');
  };
 },[]);
 useEffect(()=>{document.documentElement.dataset.theme=theme;},[theme]);
 useEffect(()=>{
  const families=[c.font,...Object.values(c.textStyles||{}).map(style=>style.font),...c.teamMembers.flatMap(member=>[
   member.portfolioNameFont,member.portfolioRoleFont,member.portfolioBioFont,member.portfolioTitleFont,member.portfolioIntroFont,member.portfolioUtilityFont
  ])].filter(Boolean) as string[];
  ensureFontFamilies(families);
 },[c.font,c.textStyles,c.teamMembers]);
 useEffect(()=>{
  const ease=({smooth:'cubic-bezier(.22,1,.36,1)',soft:'cubic-bezier(.16,1,.3,1)',snappy:'cubic-bezier(.2,.82,.2,1)',linear:'linear'} as Record<string,string>)[c.sliderEasing]||'cubic-bezier(.22,1,.36,1)';
  const root=document.documentElement;
  root.style.setProperty('--gallery-transition-ms',Math.max(0,c.sliderTransitionMs||850)+'ms');
  root.style.setProperty('--gallery-autoplay-ms',String(Math.max(1200,c.sliderAutoplayMs||6500)));
  root.style.setProperty('--gallery-ease',ease);
  root.style.setProperty('--ui-transition-ms',Math.max(0,c.uiTransitionMs||350)+'ms');
  root.style.setProperty('--hover-transition-ms',Math.max(0,c.hoverTransitionMs||300)+'ms');
  root.style.setProperty('--reveal-transition-ms',Math.max(0,c.revealTransitionMs||650)+'ms');
 },[c.sliderTransitionMs,c.sliderAutoplayMs,c.sliderEasing,c.uiTransitionMs,c.hoverTransitionMs,c.revealTransitionMs]);
 useEffect(()=>{
  if(!loaded||configLoadError||isRetiredIconicSnapshot(saved))return;
  try{localStorage.setItem(SITE_CONFIG_CACHE_KEY,JSON.stringify(saved))}catch{}
 },[loaded,configLoadError,saved]);
 useEffect(()=>{draftRef.current=draft},[draft]);
 useEffect(()=>{if(!visualEdit)return;const onKey=(e:KeyboardEvent)=>{const target=e.target as HTMLElement|null;if(target?.closest('input,textarea,select,[contenteditable="true"]'))return;if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key.toLowerCase()==='z'){e.preventDefault();undoVisualEdit();return}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();void saveVisualEdit()}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[visualEdit]);
 useEffect(()=>{
  const query=window.matchMedia('(max-width: 1024px), (max-width: 1366px) and (any-pointer: coarse)');
  const sync=()=>setCompactViewport(query.matches);
  sync();
  query.addEventListener?.('change',sync);
  return()=>query.removeEventListener?.('change',sync);
 },[]);
 useEffect(()=>{
  document.title=(c.browserTitle||'VIIVIIsara®').trim()||'VIIVIIsara®';
  let link=document.head.querySelector<HTMLLinkElement>('link[data-site-favicon="true"]');
  if(c.favicon){
   if(!link){link=document.createElement('link');link.rel='icon';link.dataset.siteFavicon='true';document.head.appendChild(link)}
   link.href=c.favicon;
  }else link?.remove();
 },[c.browserTitle,c.favicon]);
 useEffect(()=>{
  if(!loaded)return;
  const id=window.setTimeout(()=>{fetch('/api/auth',{method:'GET',cache:'no-store',headers:{'X-Iconic-Prewarm':'1'}}).catch(()=>{})},450);
  return()=>window.clearTimeout(id);
 },[loaded]);
 useEffect(()=>{
  document.documentElement.style.setProperty('--film-overlay-opacity',String((c.filmBackdropOpacity??62)/100));
  document.documentElement.style.setProperty('--film-overlay-blur',(c.filmBackdropBlur??20)+'px');
  if(work)document.documentElement.dataset.filmOpen='true';
  else delete document.documentElement.dataset.filmOpen;
  return()=>{delete document.documentElement.dataset.filmOpen};
 },[work,c.filmBackdropOpacity,c.filmBackdropBlur]);
 useEffect(()=>{
  const sync=()=>setTeamRoute(decodeURIComponent(window.location.pathname.match(/^\/team\/([^/]+)/)?.[1]||''));
  window.addEventListener('popstate',sync);
  return()=>window.removeEventListener('popstate',sync);
 },[]);
 useEffect(()=>{if(login)document.documentElement.dataset.adminLogin='true';else delete document.documentElement.dataset.adminLogin;return()=>{delete document.documentElement.dataset.adminLogin}},[login]);
 useEffect(()=>{if(admin)document.documentElement.dataset.adminOpen='true';else delete document.documentElement.dataset.adminOpen;return()=>{delete document.documentElement.dataset.adminOpen}},[admin]);
 useEffect(()=>{
  lastScrollY.current=window.scrollY;
  const sync=()=>{
   const y=window.scrollY,max=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
   if(y<=8)setScrollTarget('bottom');
   else if(y>=max-8)setScrollTarget('top');
   else if(y>lastScrollY.current+3)setScrollTarget('top');
   else if(y<lastScrollY.current-3)setScrollTarget('bottom');
   lastScrollY.current=y;
  };
  sync();
  window.addEventListener('scroll',sync,{passive:true});
  window.addEventListener('resize',sync);
  return()=>{window.removeEventListener('scroll',sync);window.removeEventListener('resize',sync)};
 },[]);
 function keepMutedLoopPlaying(v:HTMLVideoElement){
  v.muted=true;
  v.defaultMuted=true;
  v.loop=true;
  v.playsInline=true;
  const play=v.play();
  if(play&&typeof play.catch==='function')play.catch(()=>{});
 }
 useEffect(()=>{
  if(!loaded)return;
  const videos=()=>Array.from(document.querySelectorAll<HTMLVideoElement>('video[data-site-autoplay="true"]'));
  let observer:IntersectionObserver|undefined;
  const resume=()=>{
   if(document.visibilityState==='hidden')return;
   observer?.disconnect();
   observer=new IntersectionObserver(entries=>{
    for(const entry of entries){
     const video=entry.target as HTMLVideoElement;
     if(entry.isIntersecting)keepMutedLoopPlaying(video);
     else video.pause();
    }
   },{rootMargin:compactViewport?'160px 0px':'320px 0px',threshold:.01});
   videos().forEach(video=>observer?.observe(video));
  };
  const timer=window.setTimeout(resume,80);
  const onVisibility=()=>{if(document.visibilityState==='hidden')videos().forEach(video=>video.pause());else resume()};
  document.addEventListener('visibilitychange',onVisibility);
  window.addEventListener('pageshow',resume);
  return()=>{window.clearTimeout(timer);observer?.disconnect();document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('pageshow',resume)};
 },[loaded,compactViewport,c.backgroundVideo,c.heroVideo,c.works]);
 function jumpScroll(){window.scrollTo({top:scrollTarget==='top'?0:document.documentElement.scrollHeight,behavior:'smooth'})}
 function openFilm(item:Work|null){if(item)setWork(item)}
 function closeFilm(){setWork(null)}
 function pauseMusicForTeamVideo(){
  const a=audio.current;
  teamVideoWasPlaying.current=!!a&&!a.paused;
  if(teamVideoWasPlaying.current)a?.pause();
 }
 function resumeMusicAfterTeamVideo(){
  const a=audio.current;
  if(teamVideoWasPlaying.current&&a)a.play().catch(()=>{});
  teamVideoWasPlaying.current=false;
 }
 function warmVideo(url:string){if(!url||videoWarm.current.has(url))return;const v=document.createElement('video');v.preload='auto';v.muted=true;v.playsInline=true;v.src=url;v.load();videoWarm.current.set(url,v);if(videoWarm.current.size>5){const first=videoWarm.current.keys().next().value;if(first){videoWarm.current.get(first)?.removeAttribute('src');videoWarm.current.delete(first)}}}
 function filmGallery(current:Work|null=work){
  const heroPrimary=c.heroVideo||c.heroPoster,heroKind=teamMediaType(heroPrimary);
  const reel:Work={id:'reel',title:'Director’s cut',category:'Showreel',year:'2026',role:'Direction / Cinematography / Edit',description:'',poster:heroKind==='image'?heroPrimary:c.heroPoster,video:heroKind==='video'?heroPrimary:'',visible:true};
  if(!current||current.id==='reel')return (reel.video||reel.poster)?[reel]:[];
  const works=c.works.filter(item=>item.visible&&(item.video||item.poster));
  const categoryKey=(value:string|undefined)=>(value||'').trim().toLocaleLowerCase();
  const selectedCategory=categoryKey(current.category);
  return works.filter(item=>categoryKey(item.category)===selectedCategory);
 }
 useEffect(()=>{
  if(!hasAdminVisit())return;
  api('/api/auth').then(result=>{
    if(result?.authenticated)setOwnerMode(true);
    else{clearAdminVisit();setOwnerMode(false)}
  }).catch(()=>{clearAdminVisit();setOwnerMode(false)});
 },[]);
 useEffect(()=>{if(!audio.current)return;audio.current.volume=volume/100;},[volume,track]);
 useEffect(()=>{setPlaying(false);setTime(0);setDuration(0)},[t?.url]);
 useEffect(()=>{if(work){filmWasPlaying.current=playing;audio.current?.pause();}else if(filmWasPlaying.current){audio.current?.play().catch(()=>{});filmWasPlaying.current=false}},[!!work]);
 useEffect(()=>{if(!loaded)return;const id=window.setTimeout(()=>saved.works.filter(w=>w.visible&&w.video).slice(0,4).forEach(w=>warmVideo(w.video)),900);return()=>window.clearTimeout(id)},[loaded,saved.works]);
 useEffect(()=>{if(focusIndex===null)return;const a=audio.current,wasPlaying=!!a&&!a.paused;a?.pause();return()=>{if(wasPlaying)a?.play().catch(()=>{})}},[focusIndex!==null]);
 useEffect(()=>{if(!note)return;const id=setTimeout(()=>setNote(''),6000);return()=>clearTimeout(id)},[note]);

 useEffect(()=>{if(workbenchPreview||!loaded||startup.current)return;startup.current=true;let timer:ReturnType<typeof setTimeout>|undefined;let waiting=false;let cancelled=false;const valid=saved.tracks.map((t,i)=>({t,i})).filter(q=>q.t.url);if(!saved.showMusic||!valid.length)return;
 let selected=valid[0].i;if(saved.musicRandomStart){const last=localStorage.getItem('iconic-last-track');const pool=valid.length>1?valid.filter(q=>q.t.id!==last):valid;selected=pool[Math.floor(Math.random()*pool.length)].i;localStorage.setItem('iconic-last-track',saved.tracks[selected].id)}setTrack(selected);
 const attempt=()=>{if(!audio.current||cancelled)return;audio.current.volume=saved.volume/100;audio.current.play().then(()=>{if(cancelled)return;waiting=false;setAutoplayBlocked(false);remove()}).catch(e=>{if(cancelled)return;if(e.name==='NotAllowedError'){waiting=true;setAutoplayBlocked(true)}else {waiting=false;remove()}})};
 const unlock=()=>{if(waiting&&!document.querySelector('.film-dialog video'))attempt()};const key=(e:KeyboardEvent)=>{if(e.key==='Enter'||e.key===' ')unlock()};function remove(){window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',key)}
 if(saved.musicAutoplay){window.addEventListener('pointerdown',unlock);window.addEventListener('keydown',key);timer=setTimeout(attempt,100)}return()=>{cancelled=true;if(timer)clearTimeout(timer);remove()};},[loaded]);
 useEffect(()=>{if(!music)return;const panel=musicPanel.current;const focus=requestAnimationFrame(()=>panel?.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true}));const close=()=>{setMusic(false);musicButton.current?.focus({preventScroll:true})};const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();close()}};const outside=(e:PointerEvent)=>{const node=e.target as Node;if(panel&&!panel.contains(node)&&!musicButton.current?.contains(node))setMusic(false)};window.addEventListener('keydown',key);window.addEventListener('pointerdown',outside);return()=>{cancelAnimationFrame(focus);window.removeEventListener('keydown',key);window.removeEventListener('pointerdown',outside)}},[music]);
 const set=(key:keyof Config,value:unknown)=>setDraft(d=>({...d,[key]:value}));
 function resetVisualHistory(base?:Config){
  visualUndoStack.current=[];
  visualLastMutationAt.current=0;
  if(base)draftRef.current=base;
 }
 function setVisualDraft(action:React.SetStateAction<Config>){
  const current=draftRef.current;
  const next=typeof action==='function'?(action as (value:Config)=>Config)(current):action;
  if(next===current)return;
  const now=Date.now();
  if(now-visualLastMutationAt.current>240){
   visualUndoStack.current=[...visualUndoStack.current.slice(-79),structuredClone(current)];
  }
  visualLastMutationAt.current=now;
  draftRef.current=next;
  if(next.theme!==current.theme){visualThemeEditedRef.current=true;setTheme(next.theme)}
  setDraft(next);
 }
 function undoVisualEdit(){
  const previous=visualUndoStack.current.pop();
  if(!previous)return;
  visualLastMutationAt.current=0;
  const restored=structuredClone(previous);
  draftRef.current=restored;
  if(restored.theme!==theme)setTheme(restored.theme);
  setDraft(restored);
 }
 function closeAdmin(){
  if(adminClosing)return;
  setAdminClosing(true);
  window.setTimeout(()=>{
    setAdmin(false);setAdminClosing(false);setPreview(false);setLogin(false);setPin('');setNewPin('');
  },380);
 }
 function enter(){
  setLoginTarget('admin');setAdminClosing(false);setPreview(false);setPin('');setNewPin('');
  if(ownerMode){setDraft(saved);setEditorTab('music');setLogin(false);setAdmin(true);return}
  setAdmin(false);setLogin(true);
 }
 function startVisualEdit(){
  setLoginTarget('visual');setPin('');setAdmin(false);setPreview(false);
  // Enter Edit Site with the mode already selected on the public site.
  visualEntryThemeRef.current=theme;visualThemeEditedRef.current=false;
  const base=structuredClone(saved);base.theme=theme;draftRef.current=base;setDraft(base);resetVisualHistory(base);
  if(ownerMode){setLogin(false);setVisualSelection('hero');setVisualEdit(true);return}
  setVisualEdit(false);setLogin(true);
 }
 function cancelVisualEdit(){const base=structuredClone(saved);draftRef.current=base;setDraft(base);resetVisualHistory(base);const before=visualEntryThemeRef.current;setTheme(before);try{localStorage.setItem('iconic-theme',before)}catch{}setVisualEdit(false);setVisualSelection('hero')}
 async function saveVisualEdit(){
  try{
   setBusy(true);
   const next=normalizeConfig(draftRef.current);
   // Editing ordinary content must not turn the visitor's chosen light/dark mode into a global default.
   if(!visualThemeEditedRef.current)next.theme=saved.theme;
   await api('/api/config','PUT',next);
   const applied=structuredClone(next);
   setSaved(applied);draftRef.current=applied;setDraft(applied);resetVisualHistory(applied);
   // Retain the user's current mode after Save & Apply, regardless of the saved default.
   try{localStorage.setItem(SITE_CONFIG_CACHE_KEY,JSON.stringify(next));localStorage.setItem('iconic-theme',theme)}catch{}
   setNote('비주얼 편집 저장 완료. 모든 기기에 적용됩니다.');
  }catch(e){setNote((e as Error).message)}
  finally{setBusy(false)}
 }
 function openAdminFromVisual(){setVisualEdit(false);setAdminClosing(false);setPreview(false);setLogin(false);setEditorTab('music');setAdmin(true)}
 function reorderVisualNav(from:NavItemKey,to:NavItemKey){
  if(!visualEdit||from===to)return;
  setVisualDraft(d=>{
   const navOrder=[...d.navOrder],fromIndex=navOrder.indexOf(from),toIndex=navOrder.indexOf(to);
   if(fromIndex<0||toIndex<0)return d;
   const [moved]=navOrder.splice(fromIndex,1);
   navOrder.splice(toIndex,0,moved);
   const sectionOrder=[...(d.sectionOrder||[])];
   const orderedSections=navOrder.filter((item):item is Exclude<NavItemKey,'contact'>=>item!=='contact');
   const movable=new Set<SiteSectionKey>(orderedSections);
   const slots=sectionOrder.map((key,index)=>movable.has(key)?index:-1).filter(index=>index>=0);
   const nextSectionOrder=[...sectionOrder];
   slots.forEach((slot,index)=>{const key=orderedSections[index];if(key)nextSectionOrder[slot]=key});
   return {...d,navOrder,sectionOrder:nextSectionOrder};
  });
 }
 function navDragProps(item:NavItemKey){
  if(!visualEdit)return {};
  return {
   draggable:true,
   onDragStart:(e:React.DragEvent<HTMLElement>)=>{
    navDragItemRef.current=item;
    setNavDraggingItem(item);
    setNavDropItem(item);
    e.dataTransfer.effectAllowed='move';
    e.dataTransfer.setData('text/plain',item);
   },
   onDragEnter:(e:React.DragEvent<HTMLElement>)=>{e.preventDefault();setNavDropItem(item)},
   onDragOver:(e:React.DragEvent<HTMLElement>)=>{e.preventDefault();e.dataTransfer.dropEffect='move';setNavDropItem(item)},
   onDrop:(e:React.DragEvent<HTMLElement>)=>{
    e.preventDefault();e.stopPropagation();
    const from=navDragItemRef.current||(e.dataTransfer.getData('text/plain') as NavItemKey);
    if(from&&from!==item)reorderVisualNav(from,item);
    navDragItemRef.current=null;setNavDraggingItem(null);setNavDropItem(null);
   },
   onDragEnd:()=>{navDragItemRef.current=null;setNavDraggingItem(null);setNavDropItem(null)}
  };
 }
 const navDragClass=(item:NavItemKey)=>visualEdit?' visual-nav-draggable'+(navDraggingItem===item?' is-nav-dragging':'')+(navDropItem===item&&navDraggingItem!==item?' is-nav-drop-target':''):'';
 const renderTopNavItem=(item:NavItemKey)=>item==='work'?
  <a key={item} href="#work" data-cursor-label="MENU" data-visual-text="navWorkLabel" data-visual-nav-key={item} className={navDragClass(item).trim()} style={textCss('navMenu')} {...navDragProps(item)}>{c.navWorkLabel}</a>
  :item==='about'?
  <a key={item} href="#about" data-cursor-label="MENU" data-visual-text="navAboutLabel" data-visual-nav-key={item} className={navDragClass(item).trim()} style={textCss('navMenu')} {...navDragProps(item)}>{c.navAboutLabel}</a>
  :item==='team'?
  (c.showTeam&&c.teamMembers.some(m=>m.visible)?
   <a key={item} href="#team" data-cursor-label="MENU" data-visual-text="navTeamLabel" data-visual-nav-key={item} className={navDragClass(item).trim()} style={textCss('navMenu')} {...navDragProps(item)}>{c.navTeamLabel}</a>
   :null)
  :<button key={item} type="button" className={'nav-contact'+navDragClass(item)} data-cursor-label="MENU" data-visual-text="navContactLabel" data-visual-nav-key={item} style={textCss('navMenu')} {...navDragProps(item)} onClick={()=>setContactOpen(true)}>{c.navContactLabel}</button>;
 function selectVisualTarget(e:React.MouseEvent<HTMLDivElement>){
  if(!visualEdit)return;
  const target=e.target as HTMLElement;
  // The M menu trigger must remain usable while previewing the navigation in Edit Site.
  if(target.closest('[data-vii-menu-toggle="true"]'))return;
  if(target.closest('[data-visual-editor="true"]')||target.closest('[contenteditable="true"]'))return;
  const globalText=target.closest<HTMLElement>('[data-visual-text]');
  const workText=target.closest<HTMLElement>('[data-visual-work-text]');
  const teamText=target.closest<HTMLElement>('[data-visual-team-text]');
  const dividerEl=target.closest<HTMLElement>('[data-visual-divider-id]');
  const blockEl=target.closest<HTMLElement>('[data-visual-block-id]');
  const workEl=target.closest<HTMLElement>('[data-visual-work-id]');
  const sectionEl=target.closest<HTMLElement>('[data-visual-section]');
  if(!globalText&&!workText&&!teamText&&!dividerEl&&!blockEl&&!workEl&&!sectionEl)return;
  e.preventDefault();e.stopPropagation();
  if(globalText?.dataset.visualText)setVisualSelection(('text:'+globalText.dataset.visualText) as VisualSelection);
  else if(workText?.dataset.visualWorkText)setVisualSelection(('worktext:'+workText.dataset.visualWorkText) as VisualSelection);
  else if(teamText?.dataset.visualTeamText)setVisualSelection(('teamtext:'+teamText.dataset.visualTeamText) as VisualSelection);
  else if(dividerEl?.dataset.visualDividerId)setVisualSelection(('divider:'+dividerEl.dataset.visualDividerId) as VisualSelection);
  else if(blockEl?.dataset.visualBlockId)setVisualSelection(('block:'+blockEl.dataset.visualBlockId) as VisualSelection);
  else if(workEl?.dataset.visualWorkId)setVisualSelection(('work:'+workEl.dataset.visualWorkId) as VisualSelection);
  else if(sectionEl?.dataset.visualSection)setVisualSelection(sectionEl.dataset.visualSection as VisualSelection);
 }
 async function logoutAdmin(){
  try{
    await revokeAdminVisit();
    setOwnerMode(false);setAdmin(false);setPreview(false);setLogin(false);setPin('');setNewPin('');
    setNote('로그아웃되었습니다.');
  }catch(e){setNote((e as Error).message)}
 }
 function openSiteInbox(){
  if(!ownerMode)return;
  setDraft(saved);setEditorTab('inbox');setPreview(false);setLogin(false);setAdminClosing(false);setAdmin(true);
 }
 async function unlock(v:string){const clean=v.replace(/\D/g,'');setPin(clean);if(clean.length===4){try{setBusy(true);const epoch=getAdminVisitEpoch();const j=await api('/api/auth','POST',{pin:clean});if(epoch!==getAdminVisitEpoch())return;rememberAdminVisit(j.visitKey);setOwnerMode(true);setLogin(false);const base=structuredClone(saved);draftRef.current=base;setDraft(base);setPin('');if(loginTarget==='visual'){resetVisualHistory(base);setVisualSelection('hero');setVisualEdit(true);setAdmin(false)}else{setVisualEdit(false);setEditorTab('music');setAdmin(true)}}catch(e){setNote((e as Error).message);setPin('')}finally{setBusy(false)}}}
 async function save(){try{setBusy(true);await api('/api/config','PUT',draft);setSaved(structuredClone(draft));setPreview(false);setAdmin(true);setVolume(draft.volume);setShuffle(draft.musicShuffle);setRepeat(draft.musicRepeatMode==='one'?1:draft.musicRepeatMode==='all'?2:0);setNote('저장 완료. 모든 기기에 적용됩니다.')}catch(e){setNote((e as Error).message)}finally{setBusy(false)}}
 function toggle(){if(!t){setMusic(true);setNote('아직 등록된 음악이 없습니다. admin에서 음악을 추가하세요.');return}if(playing)audio.current?.pause();else audio.current?.play().catch(()=>setNote('음악을 재생할 수 없습니다. 파일 주소를 확인하세요.'))}
 const list=c.tracks.map((x,i)=>({x,i})).filter(({x})=>filter==='All'||(group==='Playlists'?playlistsOf(x).includes(filter):(group==='Artists'?x.artist:x.album)===filter));
 function selectTrack(i:number){setTrack(i);setTimeout(()=>audio.current?.play().catch(()=>setNote('음악을 재생할 수 없습니다.')),80)}
 function next(direction=1,ended=false){const ids=(list.length?list:c.tracks.map((x,i)=>({x,i}))).map(q=>q.i);if(!ids.length)return;if(ended&&repeat===1){if(audio.current){audio.current.currentTime=0;audio.current.play()}return}const p=ids.indexOf(track);if(ended&&!shuffle&&p===ids.length-1&&repeat===0){setPlaying(false);return}let n=shuffle&&ids.length>1?ids.filter(i=>i!==track)[Math.floor(Math.random()*(ids.length-1))]:ids[(p+direction+ids.length)%ids.length];selectTrack(n)}
 function tilt(e:React.PointerEvent<HTMLDivElement>){if(!c.motion||!frame.current)return;const r=e.currentTarget.getBoundingClientRect();const x=Math.max(-.5,Math.min(.5,(e.clientX-r.left)/r.width-.5)),y=Math.max(-.5,Math.min(.5,(e.clientY-r.top)/r.height-.5));frame.current.style.transform=`rotateX(${-y*c.depth}deg) rotateY(${x*c.depth}deg)`;frame.current.style.setProperty('--mx',`${(x+.5)*100}%`);frame.current.style.setProperty('--my',`${(y+.5)*100}%`)}
 const range=(key:keyof Config,label:string,min:number,max:number,step=1)=><label className="field">{label}<span className="val">{String(draft[key])}</span><Slider aria-label={label} value={[Number(draft[key])]} min={min} max={max} step={step} onValueChange={v=>set(key,v[0])}/></label>;
 const sw=(key:keyof Config,label:string)=><label className="toggle">{label}<Switch checked={Boolean(draft[key])} onCheckedChange={v=>set(key,v)}/></label>;
 function openTeamPortfolio(member:TeamMember){
  const slug=member.portfolioSlug||member.id;
  setTeamPageClosing(false);
  window.history.pushState({team:slug},'', '/team/'+encodeURIComponent(slug));
  setTeamRoute(slug);
  window.scrollTo({top:0,behavior:'auto'});
 }
 function leaveTeamPortfolio(target:'top'|'work'|'about'|'team'='team'){
  if(teamPageClosing)return;
  setTeamPageClosing(true);
  window.setTimeout(()=>{
    if(window.location.pathname.startsWith('/team/'))window.history.pushState({},'', '/');
    setTeamRoute('');
    setTeamPageClosing(false);
    window.setTimeout(()=>{
      if(target==='top')window.scrollTo({top:0,behavior:'smooth'});
      else document.querySelector('#'+target)?.scrollIntoView({behavior:'smooth',block:'start'});
    },40);
  },420);
 }
 function closeTeamPortfolio(){leaveTeamPortfolio('team')}
 async function openMemberPortfolioEditor(member:TeamMember){
  setMemberPin('');
  setMemberLogin(null);
  try{
   setMemberBusy(true);
   if(hasMemberVisit(member.id)){
    const status=await memberRequest(member.id,'/api/team-auth?memberId='+encodeURIComponent(member.id));
    if(status?.authenticated){
     const result=await memberRequest(member.id,'/api/team-member?memberId='+encodeURIComponent(member.id));
     setMemberDraft(result.member);setMemberEditor(result.member);return;
    }
    clearMemberVisit(member.id);
   }
  }catch{clearMemberVisit(member.id)}
  finally{setMemberBusy(false)}
  setMemberLogin(member);
 }
 async function unlockMemberPortfolio(value:string){
  const pinValue=value.replace(/\D/g,'');
  setMemberPin(pinValue);
  if(pinValue.length!==4||!memberLogin)return;
  try{
   setMemberBusy(true);
   const response=await fetch('/api/team-auth',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({memberId:memberLogin.id,pin:pinValue})});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'로그인에 실패했습니다.');
   rememberMemberVisit(memberLogin.id,result.visitKey);
   const detail=await memberRequest(memberLogin.id,'/api/team-member?memberId='+encodeURIComponent(memberLogin.id));
   setMemberDraft(detail.member);setMemberEditor(detail.member);setMemberLogin(null);setMemberPin('');
  }catch(e){setNote((e as Error).message);setMemberPin('')}
  finally{setMemberBusy(false)}
 }
 async function saveMemberPortfolio(){
  if(!memberEditor||!memberDraft)return;
  try{
   setMemberBusy(true);
   const result=await memberRequest(memberEditor.id,'/api/team-member?memberId='+encodeURIComponent(memberEditor.id),'PUT',{member:memberDraft});
   const updated=result.member as TeamMember;
   setMemberDraft(updated);setMemberEditor(updated);
   setSaved(current=>({...current,teamMembers:(current.teamMembers||[]).map(item=>item.id===updated.id?{...item,...updated}:item)}));
   setDraft(current=>({...current,teamMembers:(current.teamMembers||[]).map(item=>item.id===updated.id?{...item,...updated}:item)}));
   setNote('포트폴리오가 저장되었습니다.');
  }catch(e){
   if((e as Error).message.includes('로그인이 필요')){clearMemberVisit(memberEditor.id);setMemberEditor(null);setMemberDraft(null);setMemberLogin(memberEditor)}
   setNote((e as Error).message);
  }finally{setMemberBusy(false)}
 }
 function closeMemberPortfolioEditor(){setMemberEditor(null);setMemberDraft(null)}
 const routedMember=teamRoute?c.teamMembers.find(member=>(member.portfolioSlug||member.id)===teamRoute&&member.visible):null;
 const teamPage=teamRoute&&routedMember?<div className={'team-page-shell '+(teamPageClosing?'is-closing':'')}><TeamPortfolioTransition config={c} member={routedMember} theme={theme} onBack={closeTeamPortfolio} onNavigate={leaveTeamPortfolio} onSelectMember={openTeamPortfolio} onToggleTheme={()=>{const v=theme==='light'?'dark':'light';setTheme(v);localStorage.setItem('iconic-theme',v)}} onContact={()=>setContactOpen(true)} onAdmin={enter} onVideoViewerOpen={pauseMusicForTeamVideo} onVideoViewerClose={resumeMusicAfterTeamVideo} onMemberEdit={openMemberPortfolioEditor} onEditSite={startVisualEdit} visualEditing={visualEdit}/></div>:null;
 const editorGroups=[
  {id:'operation',label:'운영',tabs:[['music','음악'],['inbox','문의함'],['security','보안']]}
 ] as const;
 const activeEditorGroup=editorGroups.find(group=>group.tabs.some(([value])=>value===editorTab))||editorGroups[0];

 const patternImage=(pattern:string,color:string,size:number)=>({none:'none',dots:`radial-gradient(circle, ${color} 1px, transparent 1.5px)`,grid:`linear-gradient(${color} 1px,transparent 1px),linear-gradient(90deg,${color} 1px,transparent 1px)`,diagonal:`repeating-linear-gradient(45deg,${color} 0px,${color} 1px,transparent 1px,transparent ${size}px)`,checker:`conic-gradient(${color} 25%,transparent 0 50%,${color} 0 75%,transparent 0)`,lines:`linear-gradient(${color} 1px, transparent 1px)`,rings:`repeating-radial-gradient(circle at center,transparent 0,transparent ${Math.max(1,size-1)}px,${color} ${size}px,transparent ${size+1}px)`} as Record<string,string>)[pattern]||'none';
 const patternImages:Record<string,string>={none:'none',dots:patternImage('dots',c.patternColor,c.patternSize),grid:patternImage('grid',c.patternColor,c.patternSize),diagonal:patternImage('diagonal',c.patternColor,c.patternSize),checker:patternImage('checker',c.patternColor,c.patternSize),lines:patternImage('lines',c.patternColor,c.patternSize),rings:patternImage('rings',c.patternColor,c.patternSize)};
 const heroPrimary=c.heroVideo||c.heroPoster,heroPrimaryKind=teamMediaType(heroPrimary);
 const heroRatioValue=({'16:9':16/9,'4:3':4/3,'3:2':3/2,'4:5':4/5,'1:1':1,'9:16':9/16} as Record<string,number>)[c.heroMediaRatio||'fill'];
 const heroRatioHeight=c.heroMediaRatio&&c.heroMediaRatio!=='fill'&&heroRatioValue?((100/heroRatioValue)+'vw'):'';
 // A previously cached hero may differ from the actual server-saved media.
 // Never render that stale media during bootstrap: it causes the old photo ->
 // black frame -> new video flash seen when the user refreshes the site.
 const verifiedHero=loaded||workbenchPreview;
 const heroDisplaySrc=verifiedHero?heroPrimary:'';
 const heroItems:GalleryItem[]=[{id:'reel',src:heroDisplaySrc,poster:heroPrimaryKind==='video'?c.heroPoster:undefined,title:c.heroCaption||'Director’s cut',kicker:'SHOWREEL'}].filter(item=>item.src);
 const heroDisplayReady=verifiedHero&&Boolean(heroDisplaySrc)&&heroReadySource===heroDisplaySrc;
 // The HTML bootstrap layer is mounted before React, and therefore cannot
 // flash the user's previously cached light theme or an empty hero. Release
 // it only after the server/draft configuration and CURRENT hero are ready.
 useEffect(()=>{
   const boot=document.getElementById('viivii-startup');
   if(!boot||!loaded)return;
   if(!teamRoute&&c.showHero&&heroDisplaySrc&&!heroDisplayReady)return;
   // Keep the centered ink logo visible long enough for its first real sweep,
   // without delaying the EDIT SITE iframe preview or bypassing hero readiness.
   let next=0,last=0;
   const release=()=>{next=requestAnimationFrame(()=>{last=requestAnimationFrame(()=>{
     document.documentElement.dataset.siteBootReady='true';
   })})};
   const remaining=workbenchPreview?0:Math.max(0,1750-performance.now());
   const timeout=window.setTimeout(release,remaining);
   return()=>{window.clearTimeout(timeout);cancelAnimationFrame(next);cancelAnimationFrame(last)};
 },[loaded,teamRoute,c.showHero,heroDisplaySrc,heroDisplayReady]);
 useEffect(()=>{
   // Fail open if a connection never delivers a decodable hero; don't trap
   // visitors behind a permanent overlay on slow/offline mobile networks.
   const watchdog=window.setTimeout(()=>{
     document.documentElement.dataset.siteBootReady='true';
   },11000);
   return()=>window.clearTimeout(watchdog);
 },[]);
 useEffect(()=>{
   if(!verifiedHero||!heroDisplaySrc)return;
   const still=heroPrimaryKind==='video'?c.heroPoster:heroDisplaySrc;
   if(!still)return;
   let active=true;
   const image=new Image();
   image.onload=()=>{if(active)setHeroReadySource(heroDisplaySrc)};
   image.src=still;
   return()=>{active=false;image.onload=null};
 },[verifiedHero,heroDisplaySrc,heroPrimaryKind,c.heroPoster]);
 const visibleWorks=c.works.filter(item=>item.visible&&(item.video||item.poster));
 const toGallery=(item:Work):GalleryItem=>({id:item.id,src:item.video||item.poster,poster:item.poster,title:item.title,description:item.description,category:item.category,kicker:[item.category,item.role].filter(Boolean).join(' · ')});
 const focusItems:GalleryItem[]=c.focusItems.filter(item=>item.visible&&(item.video||item.poster)).map(toGallery);
 const filmItems=filmGallery().map(toGallery);
 const textCss=(key:keyof typeof c.textStyles):CSSProperties=>{
  const s=c.textStyles[key];
  // Desktop edits remain authoritative. Smaller viewports adapt presentation
  // while using the same saved content and settings.
  const editorialLarge=['workHeadline','aboutHeadline','teamHeadline'].includes(key);
  const medium=['heroCaption','heroSubtitle','teamMemberName','workCardTitle'].includes(key);
  const mobileCap=editorialLarge?52:medium?34:key==='navBrand'?24:key==='navMenu'?16:24;
  const size=compactViewport?Math.min(s.size,mobileCap):s.size;
  const responsiveSize=compactViewport
    ?'clamp('+Math.min(11,size)+'px, '+(size/390*100).toFixed(3)+'vw, '+size+'px)'
    :size+'px';
  const x=compactViewport?0:(key==='footerCopyright'?0:s.x);
  const y=compactViewport?0:s.y;
  return {
   fontFamily:s.font||undefined,
   fontSize:responsiveSize,
   color:s.color||undefined,
   textAlign:s.align,
   translate:x+'px '+y+'px',
   letterSpacing:(s.letterSpacing??0)+'px',
   fontWeight:s.weight??undefined,
   opacity:(s.opacity??100)/100,
   textTransform:s.textTransform&&s.textTransform!=='none'?s.textTransform:undefined,
   '--edit-font-size':responsiveSize,
   '--edit-x':x+'px',
   '--edit-y':y+'px',
   '--edit-letter-spacing':(s.letterSpacing??0)+'px'
  } as CSSProperties;
 };
 const menuItems:SiteMenuItem[]=c.navOrder.flatMap<SiteMenuItem>((item:NavItemKey):SiteMenuItem[]=>{
  if(item==='work')return [{key:item,label:c.navWorkLabel,href:'#work',visualTextKey:'navWorkLabel'}];
  if(item==='about')return c.showAbout?[{key:item,label:c.navAboutLabel,href:'#about',visualTextKey:'navAboutLabel'}]:[];
  if(item==='team')return c.showTeam&&c.teamMembers.some(m=>m.visible)?[{key:item,label:c.navTeamLabel,href:'#team',visualTextKey:'navTeamLabel'}]:[];
  return [{key:item,label:c.navContactLabel,visualTextKey:'navContactLabel',onSelect:()=>setContactOpen(true)}];
 });
 const activeAccent=admin?draft.accent:c.accent;
 const sliderEase=({smooth:'cubic-bezier(.22,1,.36,1)',soft:'cubic-bezier(.16,1,.3,1)',snappy:'cubic-bezier(.2,.82,.2,1)',linear:'linear'} as Record<string,string>)[c.sliderEasing]||'cubic-bezier(.22,1,.36,1)';
 const style={'--accent-color':activeAccent,'--gallery-transition-ms':Math.max(0,c.sliderTransitionMs||850)+'ms','--gallery-autoplay-ms':String(Math.max(1200,c.sliderAutoplayMs||6500)),'--gallery-ease':sliderEase,'--ui-transition-ms':Math.max(0,c.uiTransitionMs||350)+'ms','--hover-transition-ms':Math.max(0,c.hoverTransitionMs||300)+'ms','--reveal-transition-ms':Math.max(0,c.revealTransitionMs||650)+'ms','--accent-contrast':accentContrast(activeAccent),'--nav-alpha':c.navOpacity/100,'--section-space':(compactViewport?Math.min(c.spacing,44):c.spacing)+'px','--round':c.radius+'px','--glass-blur':c.blur+'px','--glass-alpha':c.glass/100,'--motion':c.motion+'s','--hero-fade-top-size':c.heroFadeTopSize+'%','--hero-fade-bottom-size':c.heroFadeBottomSize+'%','--hero-fade-density':c.heroFadeDensity+'%','--hero-fade-opacity':String(c.heroFadeEnabled?c.heroFadeOpacity/100:0),'--hero-fade-blur':c.heroFadeBlur+'px','--hero-caption-font':c.textStyles.heroCaption.font||c.font,'--hero-caption-size':(compactViewport?'clamp(12px,5vw,'+Math.min(c.textStyles.heroCaption.size,30)+'px)':c.textStyles.heroCaption.size+'px'),'--hero-caption-color':c.textStyles.heroCaption.color||'inherit','--hero-caption-align':c.textStyles.heroCaption.align,'--hero-caption-x':(compactViewport?0:c.textStyles.heroCaption.x)+'px','--hero-caption-y':(compactViewport?0:c.textStyles.heroCaption.y)+'px','--hero-caption-letter':(c.textStyles.heroCaption.letterSpacing??0)+'px','--hero-caption-weight':String(c.textStyles.heroCaption.weight??600),'--hero-caption-opacity':String((c.textStyles.heroCaption.opacity??100)/100),'--hero-caption-transform':c.textStyles.heroCaption.textTransform||'none','--nav-offset-x':(compactViewport?0:c.navOffsetX)+'px','--nav-offset-y':(compactViewport?0:c.navOffsetY)+'px','--nav-scale':String(compactViewport?1:c.navScale),'--hero-offset-x':(compactViewport?0:c.heroOffsetX)+'px','--hero-offset-y':(compactViewport?0:c.heroOffsetY)+'px','--hero-scale':String(compactViewport?1:c.heroScale),'--logo-offset-y':(compactViewport?0:c.logoOffsetY)+'px','--work-offset-x':(compactViewport?0:c.workOffsetX)+'px','--work-offset-y':(compactViewport?0:c.workOffsetY)+'px','--work-scale':String(compactViewport?1:c.workScale),'--about-offset-x':(compactViewport?0:c.aboutOffsetX)+'px','--about-offset-y':(compactViewport?0:c.aboutOffsetY)+'px','--about-scale':String(compactViewport?1:c.aboutScale),'--team-offset-x':(compactViewport?0:c.teamOffsetX)+'px','--team-offset-y':(compactViewport?0:c.teamOffsetY)+'px','--team-scale':String(compactViewport?1:c.teamScale),'--footer-offset-x':'0px','--footer-offset-y':'0px','--footer-scale':'1','--film-overlay-opacity':String((c.filmBackdropOpacity??62)/100),'--film-overlay-blur':(c.filmBackdropBlur??20)+'px',
 '--nav-brand-font':c.textStyles.navBrand.font||c.font,'--nav-brand-size':c.textStyles.navBrand.size+'px','--nav-brand-color':c.textStyles.navBrand.color||'var(--ink)','--nav-brand-letter':(c.textStyles.navBrand.letterSpacing??0)+'px','--nav-brand-weight':String(c.textStyles.navBrand.weight??800),'--nav-brand-opacity':String((c.textStyles.navBrand.opacity??100)/100),'--nav-brand-transform':c.textStyles.navBrand.textTransform||'none',
 '--nav-menu-font':c.textStyles.navMenu.font||c.font,'--nav-menu-size':c.textStyles.navMenu.size+'px','--nav-menu-color':c.textStyles.navMenu.color||'var(--ink)','--nav-menu-letter':(c.textStyles.navMenu.letterSpacing??0)+'px','--nav-menu-weight':String(c.textStyles.navMenu.weight??500),'--nav-menu-opacity':String((c.textStyles.navMenu.opacity??100)/100),'--nav-menu-transform':c.textStyles.navMenu.textTransform||'none',
 '--footer-copy-font':c.textStyles.footerCopyright.font||c.font,'--footer-copy-size':c.textStyles.footerCopyright.size+'px','--footer-copy-color':c.textStyles.footerCopyright.color||'var(--soft)','--footer-copy-letter':(c.textStyles.footerCopyright.letterSpacing??0)+'px','--footer-copy-weight':String(c.textStyles.footerCopyright.weight??400),'--footer-copy-opacity':String((c.textStyles.footerCopyright.opacity??100)/100),
 '--footer-admin-font':c.textStyles.footerAdmin.font||c.font,'--footer-admin-size':c.textStyles.footerAdmin.size+'px','--footer-admin-color':c.textStyles.footerAdmin.color||'var(--soft)','--footer-admin-letter':(c.textStyles.footerAdmin.letterSpacing??0)+'px','--footer-admin-weight':String(c.textStyles.footerAdmin.weight??400),'--footer-admin-opacity':String((c.textStyles.footerAdmin.opacity??100)/100),
 fontFamily:c.font,fontSize:c.fontSize+'px'} as CSSProperties;
 // While the owner data is unavailable, never display the old unrelated
 // ICONIC demo as if it were the public site. No writes occur from this state.
 if(!workbenchPreview&&!hasBootConfig&&(!loaded||configLoadError)){
  return <main role="status" style={{minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:'#080808',color:'#f5f5f5',padding:'32px',textAlign:'center',fontFamily:'Arial,sans-serif'}}>
   <div style={{maxWidth:420,display:'grid',gap:20}}>
    <strong style={{fontSize:24,letterSpacing:'-.04em'}}>VIIVII sara®</strong>
    <p style={{fontSize:14,lineHeight:1.75,opacity:.7,margin:0}}>{configLoadError?'저장된 사이트 설정에 일시적으로 연결할 수 없습니다. 기존 작품과 설정을 보호하기 위해 다른 사이트로 대체하지 않습니다.':'사이트 설정을 안전하게 불러오고 있습니다.'}</p>
    {configLoadError&&<button type="button" onClick={()=>window.location.reload()} style={{padding:'13px 22px',border:'1px solid rgba(255,255,255,.35)',borderRadius:999,background:'transparent',color:'inherit',cursor:'pointer'}}>다시 연결</button>}
   </div>
  </main>;
 }
 return <div id="top" style={style} onClickCapture={selectVisualTarget} className={'site '+(!teamPage?'has-section-order ':'')+(!hasBootConfig&&!loaded?'is-config-syncing ':'')+(ownerMode&&!admin&&!login?'has-owner-notice ':'')+(visualEdit?'visual-editing':'')}>
 <ScrollReveal enabled={!admin||preview}/>
 <PointerExperience enabled={!compactViewport&&!visualEdit&&(!admin||preview)&&!login&&c.motion>0}/>
 {!teamPage&&<div className="site-backdrop" aria-hidden="true">{c.backgroundType==='image'&&c.backgroundImage&&<img src={c.backgroundImage} alt="" style={{opacity:c.backgroundOpacity/100}}/>}{c.backgroundType==='video'&&c.backgroundVideo&&<video key={c.backgroundVideo} src={c.backgroundVideo} data-site-autoplay="true" autoPlay muted loop playsInline preload="auto" onLoadedMetadata={e=>keepMutedLoopPlaying(e.currentTarget)} onCanPlay={e=>keepMutedLoopPlaying(e.currentTarget)} style={{opacity:c.backgroundOpacity/100}}/>}{c.backgroundType!=='none'&&<div className="backdrop-dim" style={{background:'var(--page)',opacity:c.backgroundDim/100}}/>}<div className="site-pattern" style={{backgroundImage:patternImages[c.pattern]||'none',backgroundSize:`${c.patternSize}px ${c.patternSize}px`,opacity:c.patternOpacity/100}}/></div>}
  {teamPage?teamPage:<>
  {c.showNav&&<header data-visual-section="nav" className="nav nav-recomposed vii-minimal-nav" style={{...sectionStyle('nav'),'--vii-menu-light-opacity':String(c.menuButtonLightOpacity/100)} as CSSProperties}>
   <a className="vii-header-home" href="#top" data-cursor-label="HOME" aria-label="VIIVII sara 홈으로 이동">{c.logo?<img src={c.logo} alt={c.name}/>:<span className="vii-header-home-name" data-visual-text="name" style={textCss('navBrand')}>{c.name}</span>}<sup aria-hidden="true">®</sup></a>
   <div className="nav-tools"><SiteMenu items={menuItems} fontFamily={c.font} onAdmin={enter} onEdit={startVisualEdit} theme={theme} onToggleTheme={()=>{const v=theme==='light'?'dark':'light';setTheme(v);try{localStorage.setItem('iconic-theme',v)}catch{}}} editing={visualEdit}/></div>
  </header>}
 <main>{c.showHero&&<section data-visual-section="hero" className="hero" style={sectionStyle('hero')}>{c.eyebrow&&<div className="hero-top"><span data-visual-text="eyebrow" style={textCss('heroEyebrow')}>{c.eyebrow}</span></div>}<div className="hero-media-shell" data-hero-has-media={heroItems.length?"true":"false"} data-cursor-label={heroPrimaryKind==='video'?'VIDEO':'IMAGE'} data-visual-media="hero" data-hero-ratio={c.heroMediaRatio||'fill'} style={{'--hero-media-ratio-height':heroRatioHeight} as CSSProperties}><div className="hero-gallery"><MediaGallery items={heroItems} cleanPreview nativeCursor={false} onReady={()=>{if(heroDisplaySrc)setHeroReadySource(heroDisplaySrc)}} autoPlay={c.autoplay} mediaFit={c.heroMediaFit} mediaPositionX={c.heroMediaPositionX} mediaPositionY={c.heroMediaPositionY} onExpand={()=>openFilm({id:'reel',title:'Director’s cut',category:'Showreel',year:'2026',role:'Direction / Cinematography / Edit',description:'',poster:heroPrimaryKind==='image'?heroPrimary:c.heroPoster,video:heroPrimaryKind==='video'?heroPrimary:'',visible:true})}/><div className={'hero-stage-loading'+(heroDisplayReady?' is-ready':'')} aria-hidden="true"><span className="hero-stage-monogram">VIIVII <em>sara</em></span></div></div>{c.heroPattern!=='none'&&<div className="hero-local-pattern" aria-hidden="true" style={{backgroundImage:patternImage(c.heroPattern,c.heroPatternColor,c.heroPatternSize),backgroundSize:`${c.heroPatternSize}px ${c.heroPatternSize}px`,opacity:c.heroPatternOpacity/100}}/>}</div><MainLogo config={c}/>{c.subtitle&&<div className="hero-bottom"><p data-visual-text="subtitle" style={textCss('heroSubtitle')}>{c.subtitle}</p></div>}</section>}
 {c.navOrder.map((item:NavItemKey)=>item==='work'?<Fragment key="work"><section id="work" data-visual-section="work" className="work-section" style={sectionStyle('work')}><div className="section-head reveal"><div><span className="kicker" data-visual-text="workKicker" style={textCss('workKicker')}>{c.workKicker}</span><h2 data-visual-text="headline" style={textCss('workHeadline')}>{c.headline.split('\n').map((s,i)=><span key={i}>{s}<br/></span>)}</h2></div><span className="small" data-visual-text="workAside" style={textCss('workAside')}>{c.workAside.split('\n').map((line,i)=><span key={i}>{line}{i<c.workAside.split('\n').length-1&&<br/>}</span>)}</span></div><div className="filters" role="group" aria-label="작품 분류">{['All',...new Set(c.works.filter(w=>w.visible).map(w=>w.category))].map(x=><button key={x} className={category===x?'selected':''} onClick={()=>setCategory(x)}>{x}{x==='All'&&<sup>{c.works.filter(w=>w.visible).length}</sup>}</button>)}</div><div className="works-grid" style={{'--cols':c.columns} as CSSProperties}>{c.works.filter(w=>w.visible&&(category==='All'||w.category===category)).map((w,i)=><article className="work-card" data-visual-work-id={w.id} key={w.id}><button className="work-image" data-cursor-label={w.video?'VIDEO':'IMAGE'} onPointerEnter={()=>warmVideo(w.video)} onFocus={()=>warmVideo(w.video)} onClick={()=>openFilm(w)}>{w.video?<video key={w.video} src={w.video} poster={w.poster||c.heroPoster} data-site-autoplay={compactViewport?undefined:"true"} autoPlay={!compactViewport} muted loop playsInline preload={compactViewport?'metadata':'none'} onLoadedMetadata={e=>{if(!compactViewport)keepMutedLoopPlaying(e.currentTarget)}} onCanPlay={e=>{if(!compactViewport)keepMutedLoopPlaying(e.currentTarget)}}/>:<img loading="lazy" src={w.poster||c.heroPoster} alt={w.title} style={{objectPosition:i%2?'60% 40%':'50% 50%',filter:i%2?'none':'grayscale(1)'}}/>}<span className="glass work-play"><Play fill="currentColor" size={22}/></span><span className="work-number">0{i+1}</span></button><div className="work-info"><div><h3 data-visual-work-text={w.id+':title'} style={textCss('workCardTitle')}>{w.title}</h3><p style={textCss('workCardMeta')}><span data-visual-work-text={w.id+':category'}>{w.category}</span> <span>/</span> <span data-visual-work-text={w.id+':role'}>{w.role}</span></p></div><span data-visual-work-text={w.id+':year'} style={textCss('workCardMeta')}>{w.year}</span></div></article>)}</div>{!c.works.some(w=>w.visible)&&<p>새로운 필름을 준비하고 있습니다.</p>}</section>
 </Fragment>:item==='about'?<Fragment key="about">{c.showAbout&&<section id="about" data-visual-section="about" className="about reveal" style={sectionStyle('about')}><span className="kicker" data-visual-text="aboutKicker" style={textCss('aboutKicker')}>{c.aboutKicker}</span><div className="about-copy"><h2 data-visual-text="aboutHeadline" style={textCss('aboutHeadline')}>{c.aboutHeadline.split('\n').map((line,i)=><span key={i}>{line}<br/></span>)}</h2><p data-visual-text="about" style={textCss('aboutBody')}>{c.about}</p><div className="disciplines" data-visual-text="aboutDisciplines" style={textCss('aboutDisciplines')}>{c.aboutDisciplines.split('\n').filter(Boolean).map((line,i)=><span key={i}>{line}</span>)}</div></div><div className={'about-visual '+(c.aboutMediaType==='3d'?'is-model':'')} data-visual-model={c.aboutMediaType==='3d'?'about':undefined}>{c.aboutMediaType==='3d'&&c.aboutModel?<ModelScene config={compactViewport?{...c,modelScale:Math.min(8,Math.max(.1,c.modelScale||1)*1.16)}:c}/>:<img src={c.aboutImage||c.heroPoster} alt="ICONIC creative direction"/>}</div></section>}</Fragment>:item==='team'?<Fragment key="team">{c.showTeam&&<TeamSection config={c} onOpen={openTeamPortfolio} order={sectionRank('team')} minHeight={c.sectionHeights?.team||0}/>}</Fragment>:null)}
 {c.sectionDividers.filter(divider=>divider.visible).map(divider=><div key={divider.id} data-visual-divider-id={divider.id} className="site-divider" style={dividerStyle(divider)} aria-hidden="true"/>)}
 {(c.pageBlocks||[]).map((block,index)=><PageBlockView key={block.id} block={block} config={c} order={sectionRank(block.after)+60+index/100} editing={visualEdit}/>)}
 </main>
 {c.showFooter&&<footer data-visual-section="footer" style={sectionStyle('footer')}><span className="footer-copy" data-visual-text="footerCopyright" style={textCss('footerCopyright')}>© {new Date().getFullYear()} {c.name}</span>{!compactViewport&&<button data-visual-text="footerAdminLabel" style={textCss('footerAdmin')} onClick={enter}>{c.footerAdminLabel}</button>}</footer>}</>}
 {visualEdit&&(teamPage&&routedMember?
  <PortfolioVisualEditor config={draft} memberId={routedMember.id} setConfig={setVisualDraft} onSave={saveVisualEdit} onCancel={cancelVisualEdit} onOpenAdmin={openAdminFromVisual} onUndo={undoVisualEdit} canUndo={visualUndoStack.current.length>0} busy={busy} setBusy={setBusy} notify={setNote} onThemeChange={value=>{visualThemeEditedRef.current=true;setTheme(value)}}/>:
  <VisualSiteEditor config={draft} setConfig={setVisualDraft} selection={visualSelection} setSelection={setVisualSelection} onSave={saveVisualEdit} onCancel={cancelVisualEdit} onOpenAdmin={openAdminFromVisual} onUndo={undoVisualEdit} canUndo={visualUndoStack.current.length>0} busy={busy} setBusy={setBusy} notify={setNote} onThemeChange={value=>{visualThemeEditedRef.current=true;setTheme(value)}}/> )}
  <button type="button" className={'scroll-toggle glass '+(c.showMusic?'':'scroll-toggle--solo')} aria-label={scrollTarget==='top'?'맨 위로 이동':'맨 아래로 이동'} title={scrollTarget==='top'?'맨 위로':'맨 아래로'} onClick={jumpScroll}><span key={scrollTarget} className={'scroll-toggle-icon '+(scrollTarget==='top'?'is-up':'is-down')} aria-hidden="true">{scrollTarget==='top'?<ChevronUp size={18} strokeWidth={1.35}/>:<ChevronDown size={18} strokeWidth={1.35}/>}</span></button>
 {!workbenchPreview&&c.showMusic&&<><button ref={musicButton} type="button" className={'sound-toggle glass '+(playing?'is-playing ':'')+(music?'is-open':'')} aria-label={music?'음악 플레이어 접기':'음악 플레이어 펼치기'} aria-expanded={music} aria-controls="iconic-music-panel" onClick={()=>setMusic(v=>!v)}><span className="sound-label" aria-hidden="true">{music?'CLOSE':'SOUND'}</span><span className="sound-wave" aria-hidden="true">{[3,7,12,5,15,8,13,5,10,6,3].map((h,i)=><i key={i} style={{'--bar-height':h+'px','--bar-delay':i*.09+'s'} as CSSProperties}/>)}</span></button>
 <aside ref={musicPanel} id="iconic-music-panel" className="music-panel glass" data-open={music} aria-hidden={!music} inert={!music} aria-label="음악 플레이어"><div className="panel-top"><span>LISTENING ROOM</span></div><div className="now-playing"><div className={'album '+(playing?'spinning':'')}>{t?.cover?<img src={t.cover} alt="앨범 커버"/>:<Disc3 size={48}/>}</div><div><h3>{t?.title||'Your soundtrack.'}</h3><p>{t?.artist||'음악을 등록해 나만의 무드를 만드세요.'}</p>{autoplayBlocked&&<small className="autoplay-hint">클릭·터치하면 음악이 시작됩니다.</small>}</div></div><Slider aria-label="재생 위치" value={[time]} max={duration||1} onValueChange={v=>{if(audio.current)audio.current.currentTime=v[0];setTime(v[0])}}/><div className="times"><span>{fmt(time)}</span><span>{fmt(duration)}</span></div><div className="transport"><Btn label="셔플" active={shuffle} onClick={()=>setShuffle(!shuffle)}><Shuffle size={18}/></Btn><Btn label="이전 곡" onClick={()=>next(-1)}><SkipBack size={20}/></Btn><Btn label={playing?'일시정지':'재생'} onClick={toggle}>{playing?<Pause size={25} fill="currentColor"/>:<Play size={25} fill="currentColor"/>}</Btn><Btn label="다음 곡" onClick={()=>next()}><SkipForward size={20}/></Btn><Btn label={repeat===0?'전체 반복 켜기':repeat===2?'한 곡 반복 켜기':'반복 끄기'} active={repeat>0} onClick={()=>setRepeat(repeat===0?2:repeat===2?1:0)}>{repeat===1?<Repeat1 size={18}/>:<Repeat size={18}/>}</Btn></div><p className="repeat-label">{shuffle?'셔플 · ':''}{repeat===1?'한 곡 반복':repeat===2?'전체 반복':'반복 없음'}</p><label className="volume"><Volume2 size={16}/><Slider aria-label="음량" value={[volume]} onValueChange={v=>setVolume(v[0])}/><span>{volume}%</span></label><Tabs value={group} onValueChange={v=>{setGroup(v);setFilter('All')}}><TabsList>{['Tracks','Artists','Albums','Playlists'].map(g=><TabsTrigger value={g} key={g}>{g}</TabsTrigger>)}</TabsList><TabsContent value={group}>{group!=='Tracks'&&<div className="group-chips">{['All',...new Set(group==='Playlists'?[...(c.musicPlaylists||[]),...c.tracks.flatMap(playlistsOf)]:c.tracks.map(t=>group==='Artists'?t.artist:t.album).filter(Boolean))].map(v=><button key={v} className={filter===v?'selected':''} onClick={()=>setFilter(v)}>{v}</button>)}</div>}<div className="track-list">{list.map(({x,i})=><button key={x.id} className={track===i?'current':''} onClick={()=>selectTrack(i)}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{x.title}</strong><small>{x.artist} / {x.album}</small></div>{track===i&&playing?<span className="equalizer">▥</span>:<Play size={14}/>}</button>)}{!c.tracks.length&&<p className="empty-music">등록된 음악이 없습니다.<br/>admin → 음악에서 파일을 추가하세요.</p>}</div></TabsContent></Tabs></aside>
 <audio ref={audio} src={t?.url} onPlay={()=>{setPlaying(true);setAutoplayBlocked(false)}} onPause={()=>setPlaying(false)} onTimeUpdate={()=>setTime(audio.current?.currentTime||0)} onLoadedMetadata={()=>setDuration(audio.current?.duration||0)} onEnded={()=>next(1,true)} onError={()=>{if(t)setNote('음악 파일을 불러올 수 없습니다.')}}/></>}
 <MediaGalleryDialog items={filmItems} index={work?Math.max(0,filmItems.findIndex(item=>item.id===work.id)):null} onClose={closeFilm} onIndexChange={i=>{const next=filmItems[i];if(!next)return;setWork({id:next.id,title:next.title,category:next.category||'',year:c.works.find(w=>w.id===next.id)?.year||'',role:c.works.find(w=>w.id===next.id)?.role||'',description:next.description||'',poster:next.poster||'',video:next.src,visible:true})}}/>
 <MediaGalleryDialog items={focusItems} index={focusIndex} onClose={()=>setFocusIndex(null)} onIndexChange={setFocusIndex}/>
 <ContactDialog open={contactOpen} onOpenChange={setContactOpen}/>
 <Dialog open={!!memberLogin} onOpenChange={v=>{if(!v){setMemberLogin(null);setMemberPin('')}}}><DialogContent className="login-dialog member-login-dialog" showCloseButton={false} onOpenAutoFocus={e=>e.preventDefault()}><button type="button" className="login-dialog-close" aria-label="팀원 포트폴리오 로그인 닫기" onClick={()=>{setMemberLogin(null);setMemberPin('')}}><X size={16}/></button><span className="kicker">VIIVII sara / Team</span><DialogTitle>Portfolio access.</DialogTitle><DialogDescription>{memberLogin?.name||'Team member'} 포트폴리오 비밀번호 숫자 4자리를 입력하세요.</DialogDescription><InputOTP maxLength={4} value={memberPin} onChange={unlockMemberPortfolio} disabled={memberBusy} autoFocus inputMode="numeric" pattern="[0-9]*"><InputOTPGroup>{[0,1,2,3].map(i=><InputOTPSlot key={i} index={i}/>)}</InputOTPGroup></InputOTP><p className="small">이 탭을 닫기 전까지 현재 팀원 페이지의 편집 권한이 유지됩니다.</p></DialogContent></Dialog>
 {memberEditor&&memberDraft&&<MemberPortfolioEditor config={c} member={memberDraft} setMember={setMemberDraft} busy={memberBusy} setBusy={setMemberBusy} notify={setNote} onSave={saveMemberPortfolio} onClose={closeMemberPortfolioEditor}/>}
 <SiteContactNotifications active={ownerMode&&!admin&&!login} onOpenInbox={openSiteInbox} onSessionExpired={()=>setOwnerMode(false)}/>
 <Dialog open={login} onOpenChange={v=>{if(v)setLogin(true);else {setLogin(false);setPin('');setLoginTarget('admin')}}}><DialogContent className="login-dialog" showCloseButton={false} onOpenAutoFocus={e=>e.preventDefault()}><button type="button" className="login-dialog-close" aria-label="관리자 로그인 닫기" onClick={()=>{setLogin(false);setPin('');setLoginTarget('admin')}}><X size={16}/></button><span className="kicker">VIIVII sara</span><DialogTitle>{loginTarget==='visual'?'Edit site.':'Welcome back.'}</DialogTitle><DialogDescription>{loginTarget==='visual'?'비주얼 편집을 시작하려면 관리자 비밀번호 숫자 4자리를 입력하세요.':'관리자 비밀번호 숫자 4자리를 입력하세요.'}</DialogDescription><InputOTP maxLength={4} value={pin} onChange={unlock} disabled={busy} autoFocus inputMode="numeric" pattern="[0-9]*"><InputOTPGroup>{[0,1,2,3].map(i=><InputOTPSlot key={i} index={i}/>)}</InputOTPGroup></InputOTP><p className="small">4자리 입력 시 자동으로 접속됩니다.</p></DialogContent></Dialog>
 {admin&&<div className={'editor admin-editor '+(preview?'editor-preview-hidden ':'')+(adminClosing?'is-closing':'')}><div className="editor-header"><div className="editor-brand-lockup" aria-label="VIIVII sara"><span className="editor-brand-mark" aria-hidden="true"/></div><div><button onClick={()=>setPreview(true)}><Eye size={16}/> 미리보기</button><button className="save" disabled={busy} onClick={save}><Save size={16}/> {busy?'처리 중…':'저장 & 적용'}</button><Btn label="편집 닫기" onClick={closeAdmin}><X size={22}/></Btn></div></div><div className="admin-editor-scroll"><Tabs value={editorTab} onValueChange={setEditorTab} className="editor-tabs"><div className="editor-nav-shell"><div className="editor-group-tabs" aria-label="관리자 메뉴 그룹">{editorGroups.map(group=><button type="button" key={group.id} className={activeEditorGroup.id===group.id?'active':''} onClick={()=>setEditorTab(group.tabs[0][0])}>{group.label}</button>)}</div><TabsList className="editor-subtabs">{activeEditorGroup.tabs.map(([v,l])=><TabsTrigger value={v} key={v}>{l}</TabsTrigger>)}</TabsList></div>
 <TabsContent value="inbox"><ContactInbox/></TabsContent>
 <TabsContent value="music"><div className="music-editor-stack"><section className="editor-card music-settings"><h3>Playback settings</h3><div className="playback-settings-grid"><div>{sw('showMusic','음악 플레이어 표시')}{sw('musicAutoplay','사이트 방문 시 자동재생')}{sw('musicShuffle','기본 셔플')}{sw('musicRandomStart','첫 곡도 랜덤으로 시작')}<label className="field">기본 반복 모드<Choice value={draft.musicRepeatMode} options={['all','one','none']} onChange={v=>set('musicRepeatMode',v)}/></label></div><div>{range('volume','기본 음량',0,100)}<p>기본값은 셔플 + 전체 반복입니다. 브라우저가 소리 자동재생을 제한하면 첫 클릭이나 터치 후 시작됩니다.</p></div></div></section><MediaLibrary kind="tracks" draft={draft} setDraft={setDraft} busy={busy} setBusy={setBusy} notify={setNote}/></div></TabsContent>
 <TabsContent value="security"><div className="security-grid"><section className="editor-card security"><h3>Admin access</h3><p>한 번 인증한 현재 탭에서는 편집창을 닫아도 사이트 문의 알림을 받을 수 있습니다. 로그아웃을 누르면 관리자 인증과 사이트 알림이 함께 종료됩니다.</p><label className="field">새 비밀번호 (숫자 4자리)<input type="password" inputMode="numeric" maxLength={4} value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,''))}/></label><button disabled={newPin.length!==4||busy} onClick={async()=>{try{await api('/api/security','PUT',{pin:newPin});clearAdminVisit();setNewPin('');closeAdmin();setNote('비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인하세요.')}catch(e){setNote((e as Error).message)}}}>비밀번호 변경</button><button onClick={async()=>{if(!confirm('관리자 비밀번호를 초기값 1211로 바꿀까요?'))return;try{await api('/api/security','PUT',{pin:'1211'});closeAdmin();setNote('비밀번호를 1211로 초기화했습니다. 다시 로그인하세요.')}catch(e){setNote((e as Error).message)}}}>비밀번호 초기화</button><button onClick={logoutAdmin}>로그아웃</button></section><section className="editor-card team-security-card"><div className="team-security-head"><div><h3>Team portfolio access</h3><p>모든 팀원의 초기 비밀번호는 1234입니다. 여기에서 팀원별 숫자 4자리 비밀번호를 개별 변경할 수 있습니다.</p></div></div><div className="team-security-list">{(draft.teamMembers||[]).map((member,index)=><div className="team-security-row" key={member.id}><div className="team-security-name"><span>{String(index+1).padStart(2,'0')}</span><strong>{member.name||'새 팀원'}</strong><small>/{member.portfolioSlug||'member'}</small></div><input aria-label={(member.name||'팀원')+' 새 비밀번호'} type="password" inputMode="numeric" maxLength={4} placeholder="새 PIN" value={teamPins[member.id]||''} onChange={e=>setTeamPins(current=>({...current,[member.id]:e.target.value.replace(/\D/g,'')}))}/><button disabled={(teamPins[member.id]||'').length!==4||busy} onClick={async()=>{try{await api('/api/team-security','PUT',{memberId:member.id,pin:teamPins[member.id]});setTeamPins(current=>({...current,[member.id]:''}));setNote((member.name||'팀원')+' 비밀번호를 변경했습니다.')}catch(e){setNote((e as Error).message)}}}>변경</button><button disabled={busy} onClick={async()=>{try{await api('/api/team-security','PUT',{memberId:member.id,pin:'1234'});setTeamPins(current=>({...current,[member.id]:''}));setNote((member.name||'팀원')+' 비밀번호를 1234로 초기화했습니다.')}catch(e){setNote((e as Error).message)}}}>1234 초기화</button></div>)}</div></section></div></TabsContent></Tabs><div className="editor-bottom">변경 사항은 미리보기 후 저장 & 적용을 눌러 공개 화면에 반영하세요.</div></div>{!preview&&<div className="editor-preview-strip editor-preview-dock"><span>{({'inbox':'문의함','music':'음악','security':'보안'} as Record<string,string>)[editorTab]||'운영'} · 운영 페이지</span><button type="button" onClick={()=>setPreview(true)}><Eye size={15}/> PREVIEW</button></div>}</div>}
 {preview&&<div className="preview-banner glass"><span><Eye size={16}/> 실제 적용 화면 미리보기 · 아직 저장되지 않음</span><button onClick={()=>setPreview(false)}>편집으로 돌아가기</button><button disabled={busy} onClick={save}>저장 & 적용</button><button onClick={()=>setPreview(false)}>미리보기 종료</button></div>}
 {note&&<div role="status" className="toast glass">{note}<button onClick={()=>setNote('')} aria-label="알림 닫기"><X size={16}/></button></div>}
 </div>
}
