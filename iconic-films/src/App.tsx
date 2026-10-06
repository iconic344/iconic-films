'use client';
import {useState,useEffect,useRef,CSSProperties} from 'react';
import {Sun,Moon,Play,Pause,SkipBack,SkipForward,Shuffle,Repeat,Repeat1,Volume2,VolumeX,Music2,X,Plus,Trash2,Eye,Save,Check,ChevronUp,ChevronDown,ChevronLeft,ChevronRight,MoveUpRight,SlidersHorizontal,Disc3} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {InputOTP,InputOTPGroup,InputOTPSlot} from '@/components/ui/input-otp';
import {Slider} from '@/components/ui/slider';
import {Switch} from '@/components/ui/switch';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {initial,normalizeConfig,Config,Work,Track,TeamMember} from './defaults';
import ModelScene from './model-scene';
import MediaLibrary,{playlistsOf} from './media-library';
import PointerExperience from './pointer-experience';
import MainLogo from './main-logo';
import LogoEditor from './logo-editor';
import TeamSection from './team-section';
import TeamPortfolioPage from './team-portfolio-page';
import TeamEditor from './team-editor';
import MemberPortfolioEditor from './member-portfolio-editor';
import ContactDialog from './contact-dialog';
import ContactInbox from './contact-inbox';
import SiteContactNotifications from './site-contact-notifications';
import LayoutEditor from './layout-editor';
import {defaultLogo} from './logo-settings';
import {adminHeaders,rememberAdminVisit,clearAdminVisit,getAdminVisitEpoch,revokeAdminVisit,hasAdminVisit} from './admin-session';
import {memberRequest,rememberMemberVisit,clearMemberVisit,hasMemberVisit} from './member-session';
import {uploadFile} from './media-upload';
const fmt=(v:number)=>`${Math.floor((v||0)/60)}:${String(Math.floor((v||0)%60)).padStart(2,'0')}`;
import {api} from './site-api';
function Choice({value,options,onChange}:{value:string;options:string[];onChange:(x:string)=>void}){return <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{options.map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>}
function Btn({label,children,onClick,active=false}:{label:string;children:React.ReactNode;onClick:()=>void;active?:boolean}){return <button title={label} aria-label={label} aria-pressed={active} className={'icon '+(active?'active':'')} onClick={onClick}>{children}</button>}
export default function Home(){
 const [saved,setSaved]=useState<Config>(initial),[draft,setDraft]=useState<Config>(initial),[theme,setTheme]=useState('light'),[admin,setAdmin]=useState(false),[preview,setPreview]=useState(false),[login,setLogin]=useState(false),[pin,setPin]=useState(''),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[category,setCategory]=useState('All'),[work,setWork]=useState<Work|null>(null),[music,setMusic]=useState(false),[track,setTrack]=useState(0),[playing,setPlaying]=useState(false),[shuffle,setShuffle]=useState(initial.musicShuffle),[repeat,setRepeat]=useState(initial.musicRepeatMode==='one'?1:initial.musicRepeatMode==='all'?2:0),[time,setTime]=useState(0),[duration,setDuration]=useState(0),[group,setGroup]=useState('Tracks'),[filter,setFilter]=useState('All'),[volume,setVolume]=useState(60),[newPin,setNewPin]=useState(''),[loaded,setLoaded]=useState(false),[heroReady,setHeroReady]=useState(false),[scrollTarget,setScrollTarget]=useState<'top'|'bottom'>('bottom'),[filmPlaying,setFilmPlaying]=useState(false),[filmClosing,setFilmClosing]=useState(false),[filmTime,setFilmTime]=useState(0),[filmDuration,setFilmDuration]=useState(0),[filmMuted,setFilmMuted]=useState(false),[autoplayBlocked,setAutoplayBlocked]=useState(false),[animations,setAnimations]=useState<string[]>([]),[editorTab,setEditorTab]=useState('content'),[contactOpen,setContactOpen]=useState(false),[teamRoute,setTeamRoute]=useState(()=>typeof window==='undefined'?'':decodeURIComponent(window.location.pathname.match(/^\/team\/([^/]+)/)?.[1]||'')),[teamPageClosing,setTeamPageClosing]=useState(false),[adminClosing,setAdminClosing]=useState(false),[ownerMode,setOwnerMode]=useState(false),[memberLogin,setMemberLogin]=useState<TeamMember|null>(null),[memberPin,setMemberPin]=useState(''),[memberEditor,setMemberEditor]=useState<TeamMember|null>(null),[memberDraft,setMemberDraft]=useState<TeamMember|null>(null),[memberBusy,setMemberBusy]=useState(false),[teamPins,setTeamPins]=useState<Record<string,string>>({});
 const musicButton=useRef<HTMLButtonElement>(null),musicPanel=useRef<HTMLElement>(null);
 const startup=useRef(false),audio=useRef<HTMLAudioElement>(null),filmVideo=useRef<HTMLVideoElement>(null),filmAutoStarted=useRef(''),filmWasPlaying=useRef(false),teamVideoWasPlaying=useRef(false),filmDragX=useRef<number|null>(null),filmSwiped=useRef(false),drag=useRef<{x:number;y:number}|null>(null),frame=useRef<HTMLDivElement>(null),lastScrollY=useRef(0),videoWarm=useRef(new Map<string,HTMLVideoElement>());
 const [compactViewport,setCompactViewport]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(max-width: 820px), (max-width: 1180px) and (any-pointer: coarse)').matches);
 const c=preview?draft:saved, t=c.tracks[track];
 useEffect(()=>{api('/api/config').then(j=>{const v=normalizeConfig(j.config||{});setSaved(v);setDraft(v);setTheme(localStorage.getItem('iconic-theme')||v.theme);setVolume(v.volume);setShuffle(v.musicShuffle);setRepeat(v.musicRepeatMode==='one'?1:v.musicRepeatMode==='all'?2:0);setLoaded(true)}).catch(e=>setNote(e.message));},[]);
 useEffect(()=>{document.documentElement.dataset.theme=theme;},[theme]);
 useEffect(()=>{
  const query=window.matchMedia('(max-width: 820px), (max-width: 1180px) and (any-pointer: coarse)');
  const sync=()=>setCompactViewport(query.matches);
  sync();
  query.addEventListener?.('change',sync);
  return()=>query.removeEventListener?.('change',sync);
 },[]);
 useEffect(()=>{
  const mobileQuery=window.matchMedia('(max-width: 1180px) and (any-pointer: coarse)');
  const ua=navigator.userAgent||'';
  const platform=(navigator as Navigator&{platform?:string}).platform||'';
  const isIPad=/iPad/i.test(ua)||(platform==='MacIntel'&&navigator.maxTouchPoints>1&&Math.min(screen.width,screen.height)>=700);
  if(!mobileQuery.matches||isIPad){
   delete document.documentElement.dataset.immersive;
   return;
  }
  const root=document.documentElement as any;
  const doc=document as any;
  const canFullscreen=()=>Boolean(root.requestFullscreen||root.webkitRequestFullscreen);
  const isFullscreen=()=>Boolean(document.fullscreenElement||doc.webkitFullscreenElement);
  const isStandalone=()=>window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches||Boolean((navigator as any).standalone);
  let autoArmed=true;
  const syncImmersiveState=()=>{
   document.documentElement.dataset.immersive=(isFullscreen()||isStandalone())?'true':'false';
  };
  const requestImmersive=async()=>{
   if(isFullscreen()||isStandalone()){syncImmersiveState();return true}
   if(!canFullscreen())return false;
   try{
    if(root.requestFullscreen)await root.requestFullscreen({navigationUI:'hide'});
    else await root.webkitRequestFullscreen();
    syncImmersiveState();
    return isFullscreen();
   }catch{return false}
  };
  const disarmAuto=()=>{autoArmed=false;window.removeEventListener('pointerup',onFirstGesture)};
  const onFirstGesture=()=>{
   if(!autoArmed)return;
   void requestImmersive().then(ok=>{if(ok)disarmAuto()});
  };
  const onFullscreenChange=()=>{
   syncImmersiveState();
   if(isFullscreen())disarmAuto();
  };
  syncImmersiveState();
  void requestImmersive().then(ok=>{if(ok)disarmAuto()});
  window.addEventListener('pointerup',onFirstGesture,{passive:true});
  document.addEventListener('fullscreenchange',onFullscreenChange);
  document.addEventListener('webkitfullscreenchange',onFullscreenChange as EventListener);
  return()=>{
   window.removeEventListener('pointerup',onFirstGesture);
   document.removeEventListener('fullscreenchange',onFullscreenChange);
   document.removeEventListener('webkitfullscreenchange',onFullscreenChange as EventListener);
   delete document.documentElement.dataset.immersive;
  };
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
 useEffect(()=>{setHeroReady(!saved.heroVideo)},[saved.heroVideo]);
 useEffect(()=>{
  if(!loaded||!compactViewport||!c.heroVideo)return;
  const mobileHeroEscape=window.setTimeout(()=>setHeroReady(true),2400);
  return()=>window.clearTimeout(mobileHeroEscape);
 },[loaded,compactViewport,c.heroVideo]);
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
   if(compactViewport){
    observer?.disconnect();
    observer=new IntersectionObserver(entries=>{
     for(const entry of entries){
      const video=entry.target as HTMLVideoElement;
      if(entry.isIntersecting)keepMutedLoopPlaying(video);
      else video.pause();
     }
    },{rootMargin:'160px 0px',threshold:.01});
    videos().forEach(video=>observer?.observe(video));
   }else videos().forEach(keepMutedLoopPlaying);
  };
  const timer=window.setTimeout(resume,80);
  const onVisibility=()=>{if(document.visibilityState==='hidden')videos().forEach(video=>video.pause());else resume()};
  document.addEventListener('visibilitychange',onVisibility);
  window.addEventListener('pageshow',resume);
  return()=>{window.clearTimeout(timer);observer?.disconnect();document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('pageshow',resume)};
 },[loaded,compactViewport,c.backgroundVideo,c.heroVideo,c.works]);
 function jumpScroll(){window.scrollTo({top:scrollTarget==='top'?0:document.documentElement.scrollHeight,behavior:'smooth'})}
 function toggleFilm(){const v=filmVideo.current;if(!v)return;if(v.paused)v.play().catch(()=>{});else v.pause()}
 function autoStartFilm(v:HTMLVideoElement){
  if(!work||filmAutoStarted.current===work.id)return;
  filmAutoStarted.current=work.id;
  const attempt=v.play();
  if(attempt&&typeof attempt.catch==='function')attempt.catch(()=>{
   if(!v.muted){v.muted=true;setFilmMuted(true);v.play().catch(()=>{})}
  });
 }
 function openFilm(item:Work|null){if(!item)return;filmAutoStarted.current='';setFilmClosing(false);setWork(item)}
 function closeFilm(){
  if(!work||filmClosing)return;
  setFilmClosing(true);
  window.setTimeout(()=>{setWork(null);setFilmClosing(false)},360);
 }
 function seekFilm(value:number){const v=filmVideo.current;if(!v)return;v.currentTime=value;setFilmTime(value)}
 function toggleFilmMute(){const v=filmVideo.current;if(!v)return;v.muted=!v.muted;setFilmMuted(v.muted)}
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
  const reel:Work={id:'reel',title:'Director’s cut',category:'Showreel',year:'2026',role:'Direction / Cinematography / Edit',description:'',poster:c.heroPoster,video:c.heroVideo,visible:true};
  if(!current||current.id==='reel')return (reel.video||reel.poster)?[reel]:[];
  const works=c.works.filter(item=>item.visible&&(item.video||item.poster));
  const scoped=category==='All'?works:works.filter(item=>item.category===category);
  return scoped.some(item=>item.id===current.id)?scoped:works.filter(item=>item.category===current.category);
 }
 function navigateFilm(direction:number){
  if(!work)return;
  const items=filmGallery();
  if(items.length<2)return;
  const current=Math.max(0,items.findIndex(item=>item.id===work.id));
  filmAutoStarted.current='';setWork(items[(current+direction+items.length)%items.length]);
 }
 function beginFilmSwipe(x:number){filmDragX.current=x;filmSwiped.current=false}
 function endFilmSwipe(x:number){
  if(filmDragX.current===null)return;
  const delta=x-filmDragX.current;filmDragX.current=null;
  if(Math.abs(delta)>58){filmSwiped.current=true;navigateFilm(delta<0?1:-1)}
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
 useEffect(()=>{if(work){filmWasPlaying.current=playing;audio.current?.pause();}else if(filmWasPlaying.current){audio.current?.play().catch(()=>{});filmWasPlaying.current=false}},[work]);
 useEffect(()=>{setFilmPlaying(false);setFilmTime(0);setFilmDuration(0);setFilmMuted(false)},[work?.id]);
 useEffect(()=>{if(!loaded)return;const id=window.setTimeout(()=>saved.works.filter(w=>w.visible&&w.video).slice(0,4).forEach(w=>warmVideo(w.video)),900);return()=>window.clearTimeout(id)},[loaded,saved.works]);
 useEffect(()=>{const sync=()=>{const v=filmVideo.current;if(!v)return;setFilmPlaying(!v.paused);setFilmTime(v.currentTime||0);setFilmDuration(Number.isFinite(v.duration)?v.duration:0)};document.addEventListener('fullscreenchange',sync);return()=>document.removeEventListener('fullscreenchange',sync)},[]);
 useEffect(()=>{
  if(!work)return;
  const key=(e:KeyboardEvent)=>{
   if(e.key==='ArrowLeft'){e.preventDefault();navigateFilm(-1)}
   if(e.key==='ArrowRight'){e.preventDefault();navigateFilm(1)}
  };
  window.addEventListener('keydown',key);
  return()=>window.removeEventListener('keydown',key);
 },[work,c.heroVideo,c.heroPoster,c.works]);
 useEffect(()=>{if(!note)return;const id=setTimeout(()=>setNote(''),6000);return()=>clearTimeout(id)},[note]);
 useEffect(()=>{const nodes=document.querySelectorAll('.reveal');const o=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in')}),{threshold:.12});nodes.forEach(n=>o.observe(n));return()=>o.disconnect()},[c.works,c.showAbout,c.showTeam,c.teamMembers,category]);
 useEffect(()=>{if(!loaded||startup.current)return;startup.current=true;let timer:ReturnType<typeof setTimeout>|undefined;let waiting=false;let cancelled=false;const valid=saved.tracks.map((t,i)=>({t,i})).filter(q=>q.t.url);if(!saved.showMusic||!valid.length)return;
 let selected=valid[0].i;if(saved.musicRandomStart){const last=localStorage.getItem('iconic-last-track');const pool=valid.length>1?valid.filter(q=>q.t.id!==last):valid;selected=pool[Math.floor(Math.random()*pool.length)].i;localStorage.setItem('iconic-last-track',saved.tracks[selected].id)}setTrack(selected);
 const attempt=()=>{if(!audio.current||cancelled)return;audio.current.volume=saved.volume/100;audio.current.play().then(()=>{if(cancelled)return;waiting=false;setAutoplayBlocked(false);remove()}).catch(e=>{if(cancelled)return;if(e.name==='NotAllowedError'){waiting=true;setAutoplayBlocked(true)}else {waiting=false;remove()}})};
 const unlock=()=>{if(waiting&&!document.querySelector('.film-dialog video'))attempt()};const key=(e:KeyboardEvent)=>{if(e.key==='Enter'||e.key===' ')unlock()};function remove(){window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',key)}
 if(saved.musicAutoplay){window.addEventListener('pointerdown',unlock);window.addEventListener('keydown',key);timer=setTimeout(attempt,100)}return()=>{cancelled=true;if(timer)clearTimeout(timer);remove()};},[loaded]);
 useEffect(()=>{if(!music)return;const panel=musicPanel.current;const focus=requestAnimationFrame(()=>panel?.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true}));const close=()=>{setMusic(false);musicButton.current?.focus({preventScroll:true})};const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();close()}};const outside=(e:PointerEvent)=>{const node=e.target as Node;if(panel&&!panel.contains(node)&&!musicButton.current?.contains(node))setMusic(false)};window.addEventListener('keydown',key);window.addEventListener('pointerdown',outside);return()=>{cancelAnimationFrame(focus);window.removeEventListener('keydown',key);window.removeEventListener('pointerdown',outside)}},[music]);
 const set=(key:keyof Config,value:unknown)=>setDraft(d=>({...d,[key]:value}));
 function closeAdmin(){
  if(adminClosing)return;
  setAdminClosing(true);
  window.setTimeout(()=>{
    setAdmin(false);setAdminClosing(false);setPreview(false);setLogin(false);setPin('');setNewPin('');
  },380);
 }
 function enter(){
  setAdminClosing(false);setPreview(false);setPin('');setNewPin('');
  if(ownerMode){setDraft(saved);setLogin(false);setAdmin(true);return}
  setAdmin(false);setLogin(true);
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
 async function unlock(v:string){setPin(v.replace(/\D/g,''));if(v.length===4){try{setBusy(true);const epoch=getAdminVisitEpoch();if(epoch!==getAdminVisitEpoch())return;const j=await api('/api/auth','POST',{pin:v});if(epoch!==getAdminVisitEpoch())return;rememberAdminVisit(j.visitKey);setOwnerMode(true);setLogin(false);setDraft(saved);setAdmin(true);setPin('')}catch(e){setNote((e as Error).message);setPin('')}finally{setBusy(false)}}}
 async function save(){try{setBusy(true);await api('/api/config','PUT',draft);setSaved(structuredClone(draft));setPreview(false);setAdmin(true);setVolume(draft.volume);setShuffle(draft.musicShuffle);setRepeat(draft.musicRepeatMode==='one'?1:draft.musicRepeatMode==='all'?2:0);setNote('저장 완료. 모든 기기에 적용됩니다.')}catch(e){setNote((e as Error).message)}finally{setBusy(false)}}
 async function upload(f:File|undefined,done:(url:string)=>void){if(!f)return;try{setBusy(true);const url=await uploadFile(f);done(url);setNote('업로드 완료. 변경 사항을 저장하세요.')}catch(e){setNote((e as Error).message)}finally{setBusy(false)}}
 function toggle(){if(!t){setMusic(true);setNote('아직 등록된 음악이 없습니다. admin에서 음악을 추가하세요.');return}if(playing)audio.current?.pause();else audio.current?.play().catch(()=>setNote('음악을 재생할 수 없습니다. 파일 주소를 확인하세요.'))}
 const list=c.tracks.map((x,i)=>({x,i})).filter(({x})=>filter==='All'||(group==='Playlists'?playlistsOf(x).includes(filter):(group==='Artists'?x.artist:x.album)===filter));
 function selectTrack(i:number){setTrack(i);setTimeout(()=>audio.current?.play().catch(()=>setNote('음악을 재생할 수 없습니다.')),80)}
 function next(direction=1,ended=false){const ids=(list.length?list:c.tracks.map((x,i)=>({x,i}))).map(q=>q.i);if(!ids.length)return;if(ended&&repeat===1){if(audio.current){audio.current.currentTime=0;audio.current.play()}return}const p=ids.indexOf(track);if(ended&&!shuffle&&p===ids.length-1&&repeat===0){setPlaying(false);return}let n=shuffle&&ids.length>1?ids.filter(i=>i!==track)[Math.floor(Math.random()*(ids.length-1))]:ids[(p+direction+ids.length)%ids.length];selectTrack(n)}
 function tilt(e:React.PointerEvent<HTMLDivElement>){if(!c.motion||!frame.current)return;const r=e.currentTarget.getBoundingClientRect();const x=Math.max(-.5,Math.min(.5,(e.clientX-r.left)/r.width-.5)),y=Math.max(-.5,Math.min(.5,(e.clientY-r.top)/r.height-.5));frame.current.style.transform=`rotateX(${-y*c.depth}deg) rotateY(${x*c.depth}deg)`;frame.current.style.setProperty('--mx',`${(x+.5)*100}%`);frame.current.style.setProperty('--my',`${(y+.5)*100}%`)}
 const text=(key:keyof Config,label:string,multi=false)=> <label className="field">{label}{multi?<textarea value={String(draft[key])} onChange={e=>set(key,e.target.value)}/>:<input value={String(draft[key])} onChange={e=>set(key,e.target.value)}/>}</label>;
 const range=(key:keyof Config,label:string,min:number,max:number,step=1)=><label className="field">{label}<span className="val">{String(draft[key])}</span><Slider aria-label={label} value={[Number(draft[key])]} min={min} max={max} step={step} onValueChange={v=>set(key,v[0])}/></label>;
 const sw=(key:keyof Config,label:string)=><label className="toggle">{label}<Switch checked={Boolean(draft[key])} onCheckedChange={v=>set(key,v)}/></label>;
 const asset=(label:string,val:string,accept:string,done:(s:string)=>void)=><label className="field file-upload">{label}<input type="file" accept={accept} disabled={busy} onChange={e=>upload(e.target.files?.[0],done)}/><span className="uploaded-file">{val?'파일 등록됨':'파일을 선택하세요 · 최대 100MB'}</span>{val&&<button type="button" className="file-clear" onClick={()=>done('')}>파일 제거</button>}</label>;
 const patchWork=(id:string,key:string,v:unknown)=>setDraft(d=>({...d,works:d.works.map(w=>w.id===id?{...w,[key]:v}:w)}));
 const patchTrack=(id:string,key:string,v:unknown)=>setDraft(d=>({...d,tracks:d.tracks.map(t=>t.id===id?{...t,[key]:v}:t)}));
 function reorder(kind:'works'|'tracks',i:number,dir:number){setDraft(d=>{const arr=[...d[kind]];if(i+dir<0||i+dir>=arr.length)return d;[arr[i],arr[i+dir]]=[arr[i+dir],arr[i]];return {...d,[kind]:arr}})}
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
 if(!loaded)return <div className="site-boot" role="status" aria-label="Loading"><span className="site-boot-progress" aria-hidden="true"><i/></span></div>;
 const routedMember=teamRoute?c.teamMembers.find(member=>(member.portfolioSlug||member.id)===teamRoute&&member.visible):null;
 const teamPage=teamRoute&&routedMember?<div className={'team-page-shell '+(teamPageClosing?'is-closing':'')}><TeamPortfolioPage key={routedMember.id} config={c} member={routedMember} theme={theme} onBack={closeTeamPortfolio} onNavigate={leaveTeamPortfolio} onSelectMember={openTeamPortfolio} onToggleTheme={()=>{const v=theme==='light'?'dark':'light';setTheme(v);localStorage.setItem('iconic-theme',v)}} onContact={()=>setContactOpen(true)} onAdmin={enter} onVideoViewerOpen={pauseMusicForTeamVideo} onVideoViewerClose={resumeMusicAfterTeamVideo} onMemberEdit={openMemberPortfolioEditor}/></div>:null;
 const editorGroups=[
  {id:'site',label:'사이트',tabs:[['content','콘텐츠'],['layout','레이아웃'],['design','디자인'],['logo','메인 로고']]},
  {id:'visual',label:'비주얼',tabs:[['scene','이미지 & 3D'],['background','배경 & 패턴'],['motion','모션']]},
  {id:'portfolio',label:'포트폴리오',tabs:[['works','작품'],['team','팀']]},
  {id:'operation',label:'운영',tabs:[['music','음악'],['inbox','문의함'],['security','보안']]}
 ] as const;
 const activeEditorGroup=editorGroups.find(group=>group.tabs.some(([value])=>value===editorTab))||editorGroups[0];

 const patternImages:Record<string,string>={none:'none',dots:`radial-gradient(circle, ${c.patternColor} 1px, transparent 1.5px)`,grid:`linear-gradient(${c.patternColor} 1px,transparent 1px),linear-gradient(90deg,${c.patternColor} 1px,transparent 1px)`,diagonal:`repeating-linear-gradient(45deg,${c.patternColor} 0px,${c.patternColor} 1px,transparent 1px,transparent ${c.patternSize}px)`,checker:`conic-gradient(${c.patternColor} 25%,transparent 0 50%,${c.patternColor} 0 75%,transparent 0)`,lines:`linear-gradient(${c.patternColor} 1px, transparent 1px)`,rings:`repeating-radial-gradient(circle at center,transparent 0,transparent ${c.patternSize-1}px,${c.patternColor} ${c.patternSize}px,transparent ${c.patternSize+1}px)`};
 const textCss=(key:keyof typeof c.textStyles):CSSProperties=>{
  const s=c.textStyles[key];
  return {fontFamily:s.font||undefined,fontSize:s.size+'px',color:s.color||undefined,textAlign:s.align,translate:s.x+'px '+s.y+'px'};
 };
 const style={'--accent-color':c.accent,'--nav-alpha':c.navOpacity/100,'--section-space':c.spacing+'px','--round':c.radius+'px','--glass-blur':c.blur+'px','--glass-alpha':c.glass/100,'--motion':c.motion+'s','--hero-offset-y':c.heroOffsetY+'px','--logo-offset-y':c.logoOffsetY+'px','--work-offset-x':c.workOffsetX+'px','--work-offset-y':c.workOffsetY+'px','--about-offset-x':c.aboutOffsetX+'px','--about-offset-y':c.aboutOffsetY+'px','--team-offset-x':c.teamOffsetX+'px','--team-offset-y':c.teamOffsetY+'px','--film-overlay-opacity':String((c.filmBackdropOpacity??62)/100),'--film-overlay-blur':(c.filmBackdropBlur??20)+'px',fontFamily:c.font,fontSize:c.fontSize+'px'} as CSSProperties;
 return <div id="top" style={style} className={'site '+(ownerMode&&!admin&&!login?'has-owner-notice':'')}>
 {c.heroVideo&&!heroReady&&!admin&&!preview&&<div className="site-boot" role="status" aria-label="Loading"><span className="site-boot-progress" aria-hidden="true"><i/></span></div>}
 <PointerExperience enabled={(!admin||preview)&&!login&&!work&&c.motion>0}/>
 {!teamPage&&<div className="site-backdrop" aria-hidden="true">{c.backgroundType==='image'&&c.backgroundImage&&<img src={c.backgroundImage} alt="" style={{opacity:c.backgroundOpacity/100}}/>}{c.backgroundType==='video'&&c.backgroundVideo&&<video key={c.backgroundVideo} src={c.backgroundVideo} data-site-autoplay="true" autoPlay muted loop playsInline preload="auto" onLoadedMetadata={e=>keepMutedLoopPlaying(e.currentTarget)} onCanPlay={e=>keepMutedLoopPlaying(e.currentTarget)} style={{opacity:c.backgroundOpacity/100}}/>}{c.backgroundType!=='none'&&<div className="backdrop-dim" style={{background:'var(--page)',opacity:c.backgroundDim/100}}/>}<div className="site-pattern" style={{backgroundImage:patternImages[c.pattern]||'none',backgroundSize:`${c.patternSize}px ${c.patternSize}px`,opacity:c.patternOpacity/100}}/></div>}
 {teamPage?teamPage:<> <header className="nav"><a href="#" className="brand">{c.logo?<img src={c.logo} alt={c.name}/>:c.name}<span>®</span></a><nav><a href="#work">{c.navWorkLabel}</a><a href="#about">{c.navAboutLabel}</a>{c.showTeam&&c.teamMembers.some(m=>m.visible)&&<a href="#team">{c.navTeamLabel}</a>}<button type="button" className="nav-contact" onClick={()=>setContactOpen(true)}>{c.navContactLabel}</button></nav><div className="nav-tools"><Btn label={theme==='light'?'다크 모드':'라이트 모드'} onClick={()=>{const v=theme==='light'?'dark':'light';setTheme(v);localStorage.setItem('iconic-theme',v)}}>{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}</Btn><button className="admin-link" onPointerEnter={()=>fetch('/api/auth',{method:'GET',cache:'no-store'}).catch(()=>{})} onFocus={()=>fetch('/api/auth',{method:'GET',cache:'no-store'}).catch(()=>{})} onClick={enter}>admin</button></div></header>
 <main><section className="hero">{c.eyebrow&&<div className="hero-top"><span>{c.eyebrow}</span></div>}<div className="stage" onPointerMove={tilt} onPointerLeave={()=>{if(frame.current)frame.current.style.transform='rotateX(0deg) rotateY(0deg)'}} onPointerDown={e=>drag.current={x:e.clientX,y:e.clientY}} onPointerUp={()=>drag.current=null}><div className="film-frame"><div className="film-surface" ref={frame}>{c.heroVideo?<video key={c.heroVideo} src={c.heroVideo} poster={compactViewport?(c.heroPoster||undefined):undefined} data-site-autoplay="true" autoPlay muted loop playsInline preload={compactViewport?'metadata':'auto'} onLoadedData={e=>{setHeroReady(true);keepMutedLoopPlaying(e.currentTarget)}} onCanPlay={e=>{setHeroReady(true);keepMutedLoopPlaying(e.currentTarget)}} onError={()=>setHeroReady(true)}/>:<img src={c.heroPoster} alt="ICONIC editorial visual"/>}<div className="shine"/></div><div className="frame-caption"><span>{c.heroCaption}</span><button className="glass play-reel" onClick={()=>c.heroVideo?openFilm({id:'reel',title:'Director’s cut',category:'Showreel',year:'2026',role:'Direction / Cinematography / Edit',description:'',poster:c.heroPoster,video:c.heroVideo,visible:true}):openFilm(c.works.find(w=>w.visible)||null)}><Play size={15} fill="currentColor"/> {c.heroButtonLabel||'Watch film'}</button></div></div></div><MainLogo config={c}/>{c.subtitle&&<div className="hero-bottom"><p>{c.subtitle}</p></div>}</section>
 <section id="work" className="work-section"><div className="section-head reveal"><div><span className="kicker" style={textCss('workKicker')}>{c.workKicker}</span><h2 style={textCss('workHeadline')}>{c.headline.split('\n').map((s,i)=><span key={i}>{s}<br/></span>)}</h2></div><span className="small" style={textCss('workAside')}>{c.workAside.split('\n').map((line,i)=><span key={i}>{line}{i<c.workAside.split('\n').length-1&&<br/>}</span>)}</span></div><div className="filters" role="group" aria-label="작품 분류">{['All',...new Set(c.works.filter(w=>w.visible).map(w=>w.category))].map(x=><button key={x} className={category===x?'selected':''} onClick={()=>setCategory(x)}>{x}{x==='All'&&<sup>{c.works.filter(w=>w.visible).length}</sup>}</button>)}</div><div className="works-grid" style={{'--cols':c.columns} as CSSProperties}>{c.works.filter(w=>w.visible&&(category==='All'||w.category===category)).map((w,i)=><article className="work-card" key={w.id}><button className="work-image" onPointerEnter={()=>warmVideo(w.video)} onFocus={()=>warmVideo(w.video)} onClick={()=>openFilm(w)}>{w.video?<video key={w.video} src={w.video} poster={w.poster||c.heroPoster} data-site-autoplay="true" autoPlay muted loop playsInline preload="metadata" onLoadedMetadata={e=>keepMutedLoopPlaying(e.currentTarget)} onCanPlay={e=>keepMutedLoopPlaying(e.currentTarget)}/>:<img loading="lazy" src={w.poster||c.heroPoster} alt={w.title} style={{objectPosition:i%2?'60% 40%':'50% 50%',filter:i%2?'none':'grayscale(1)'}}/>}<span className="glass work-play"><Play fill="currentColor" size={22}/></span><span className="work-number">0{i+1}</span></button><div className="work-info"><div><h3 style={textCss('workCardTitle')}>{w.title}</h3><p style={textCss('workCardMeta')}>{w.category} <span>/</span> {w.role}</p></div><span style={textCss('workCardMeta')}>{w.year}</span></div></article>)}</div>{!c.works.some(w=>w.visible)&&<p>새로운 필름을 준비하고 있습니다.</p>}</section>
 {c.showAbout&&<section id="about" className="about reveal"><span className="kicker" style={textCss('aboutKicker')}>{c.aboutKicker}</span><div className="about-copy"><h2 style={textCss('aboutHeadline')}>{c.aboutHeadline.split('\n').map((line,i)=><span key={i}>{line}<br/></span>)}</h2><p style={textCss('aboutBody')}>{c.about}</p><div className="disciplines" style={textCss('aboutDisciplines')}>{c.aboutDisciplines.split('\n').filter(Boolean).map((line,i)=><span key={i}>{line}</span>)}</div></div><div className={'about-visual '+(c.aboutMediaType==='3d'?'is-model':'')}>{c.aboutMediaType==='3d'&&c.aboutModel?<ModelScene config={c}/>:<img src={c.aboutImage||c.heroPoster} alt="ICONIC creative direction"/>}</div></section>}
 {c.showTeam&&<TeamSection config={c} onOpen={openTeamPortfolio}/>}</main>
 <footer><span className="footer-copy">© {new Date().getFullYear()} {c.name}</span><button onClick={enter}>{c.footerAdminLabel}</button></footer></>}
 <button type="button" className={'scroll-toggle glass '+(c.showMusic?'':'scroll-toggle--solo')} aria-label={scrollTarget==='top'?'맨 위로 이동':'맨 아래로 이동'} title={scrollTarget==='top'?'맨 위로':'맨 아래로'} onClick={jumpScroll}><span key={scrollTarget} className={'scroll-toggle-icon '+(scrollTarget==='top'?'is-up':'is-down')} aria-hidden="true">{scrollTarget==='top'?<ChevronUp size={18} strokeWidth={1.35}/>:<ChevronDown size={18} strokeWidth={1.35}/>}</span></button>
 {c.showMusic&&<><button ref={musicButton} type="button" className={'sound-toggle glass '+(playing?'is-playing ':'')+(music?'is-open':'')} aria-label={music?'음악 플레이어 접기':'음악 플레이어 펼치기'} aria-expanded={music} aria-controls="iconic-music-panel" onClick={()=>setMusic(v=>!v)}><span className="sound-label" aria-hidden="true">{music?'CLOSE':'SOUND'}</span><span className="sound-wave" aria-hidden="true">{[3,7,12,5,15,8,13,5,10,6,3].map((h,i)=><i key={i} style={{'--bar-height':h+'px','--bar-delay':i*.09+'s'} as CSSProperties}/>)}</span></button>
 <aside ref={musicPanel} id="iconic-music-panel" className="music-panel glass" data-open={music} aria-hidden={!music} inert={!music} aria-label="음악 플레이어"><div className="panel-top"><span>LISTENING ROOM</span></div><div className="now-playing"><div className={'album '+(playing?'spinning':'')}>{t?.cover?<img src={t.cover} alt="앨범 커버"/>:<Disc3 size={48}/>}</div><div><h3>{t?.title||'Your soundtrack.'}</h3><p>{t?.artist||'음악을 등록해 나만의 무드를 만드세요.'}</p>{autoplayBlocked&&<small className="autoplay-hint">클릭·터치하면 음악이 시작됩니다.</small>}</div></div><Slider aria-label="재생 위치" value={[time]} max={duration||1} onValueChange={v=>{if(audio.current)audio.current.currentTime=v[0];setTime(v[0])}}/><div className="times"><span>{fmt(time)}</span><span>{fmt(duration)}</span></div><div className="transport"><Btn label="셔플" active={shuffle} onClick={()=>setShuffle(!shuffle)}><Shuffle size={18}/></Btn><Btn label="이전 곡" onClick={()=>next(-1)}><SkipBack size={20}/></Btn><Btn label={playing?'일시정지':'재생'} onClick={toggle}>{playing?<Pause size={25} fill="currentColor"/>:<Play size={25} fill="currentColor"/>}</Btn><Btn label="다음 곡" onClick={()=>next()}><SkipForward size={20}/></Btn><Btn label={repeat===0?'전체 반복 켜기':repeat===2?'한 곡 반복 켜기':'반복 끄기'} active={repeat>0} onClick={()=>setRepeat(repeat===0?2:repeat===2?1:0)}>{repeat===1?<Repeat1 size={18}/>:<Repeat size={18}/>}</Btn></div><p className="repeat-label">{shuffle?'셔플 · ':''}{repeat===1?'한 곡 반복':repeat===2?'전체 반복':'반복 없음'}</p><label className="volume"><Volume2 size={16}/><Slider aria-label="음량" value={[volume]} onValueChange={v=>setVolume(v[0])}/><span>{volume}%</span></label><Tabs value={group} onValueChange={v=>{setGroup(v);setFilter('All')}}><TabsList>{['Tracks','Artists','Albums','Playlists'].map(g=><TabsTrigger value={g} key={g}>{g}</TabsTrigger>)}</TabsList><TabsContent value={group}>{group!=='Tracks'&&<div className="group-chips">{['All',...new Set(group==='Playlists'?[...(c.musicPlaylists||[]),...c.tracks.flatMap(playlistsOf)]:c.tracks.map(t=>group==='Artists'?t.artist:t.album).filter(Boolean))].map(v=><button key={v} className={filter===v?'selected':''} onClick={()=>setFilter(v)}>{v}</button>)}</div>}<div className="track-list">{list.map(({x,i})=><button key={x.id} className={track===i?'current':''} onClick={()=>selectTrack(i)}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{x.title}</strong><small>{x.artist} / {x.album}</small></div>{track===i&&playing?<span className="equalizer">▥</span>:<Play size={14}/>}</button>)}{!c.tracks.length&&<p className="empty-music">등록된 음악이 없습니다.<br/>admin → 음악에서 파일을 추가하세요.</p>}</div></TabsContent></Tabs></aside>
 <audio ref={audio} src={t?.url} onPlay={()=>{setPlaying(true);setAutoplayBlocked(false)}} onPause={()=>setPlaying(false)} onTimeUpdate={()=>setTime(audio.current?.currentTime||0)} onLoadedMetadata={()=>setDuration(audio.current?.duration||0)} onEnded={()=>next(1,true)} onError={()=>{if(t)setNote('음악 파일을 불러올 수 없습니다.')}}/></>}
 <Dialog open={!!work&&!filmClosing} onOpenChange={v=>!v&&closeFilm()}><DialogContent className="film-dialog film-dialog--immersive" showCloseButton={false} onOpenAutoFocus={e=>e.preventDefault()}>{work?.video?<div className="film-player-media film-player-media--immersive" onPointerDown={e=>beginFilmSwipe(e.clientX)} onPointerUp={e=>endFilmSwipe(e.clientX)}><video key={work.id} ref={filmVideo} src={work.video} poster={compactViewport?(work.poster||c.heroPoster||undefined):undefined} playsInline preload="auto" autoPlay loop muted={filmMuted} onCanPlay={e=>autoStartFilm(e.currentTarget)} onPlay={()=>setFilmPlaying(true)} onPause={()=>setFilmPlaying(false)} onTimeUpdate={()=>setFilmTime(filmVideo.current?.currentTime||0)} onLoadedMetadata={()=>setFilmDuration(filmVideo.current?.duration||0)} onEnded={()=>setFilmPlaying(false)} onClick={()=>{if(filmSwiped.current){filmSwiped.current=false;return}toggleFilm()}} onError={()=>setNote('영상 주소를 확인하세요. 재생 가능한 MP4 / WebM 파일이 필요합니다.')}/><div className="film-player-overlay-head"><div className="film-player-head-copy"><span className="film-player-kicker">FILM / {work?.year||'2026'}</span><DialogTitle className="film-player-title">{work?.title}</DialogTitle><DialogDescription className="film-player-meta">{[work?.category,work?.role].filter(Boolean).join(' · ')}</DialogDescription></div><span className="film-gesture-hint" aria-hidden="true">DRAG / SWIPE</span></div>{filmGallery().length>1&&<><button type="button" className="film-gallery-nav is-prev" aria-label="이전 작품" onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();navigateFilm(-1)}}><ChevronLeft size={22}/></button><button type="button" className="film-gallery-nav is-next" aria-label="다음 작품" onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();navigateFilm(1)}}><ChevronRight size={22}/></button></>}{!filmPlaying&&<button className="film-player-center" type="button" aria-label="영상 재생" onClick={toggleFilm}><Play size={22} fill="currentColor"/></button>}{work?.description&&<p className="film-player-description film-player-description--overlay">{work.description}</p>}<div className="film-player-controls" onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()}><button type="button" className="film-control film-control-play" aria-label={filmPlaying?'일시정지':'재생'} onClick={toggleFilm}>{filmPlaying?<Pause size={17} fill="currentColor"/>:<Play size={17} fill="currentColor"/>}</button><span className="film-time">{fmt(filmTime)}</span><Slider className="film-seek" aria-label="영상 위치" value={[Math.min(filmTime,filmDuration||0)]} min={0} max={Math.max(filmDuration,1)} step={.1} onValueChange={v=>seekFilm(v[0])}/><span className="film-time film-time-end">{fmt(filmDuration)}</span><button type="button" className="film-control" aria-label={filmMuted?'소리 켜기':'음소거'} onClick={toggleFilmMute}>{filmMuted?<VolumeX size={17}/>:<Volume2 size={17}/>}</button></div></div>:<div className="film-player-empty">아직 영상이 등록되지 않았습니다.</div>}</DialogContent></Dialog>
 <ContactDialog open={contactOpen} onOpenChange={setContactOpen}/>
 <Dialog open={!!memberLogin} onOpenChange={v=>{if(!v){setMemberLogin(null);setMemberPin('')}}}><DialogContent className="login-dialog member-login-dialog" showCloseButton={false} onOpenAutoFocus={e=>e.preventDefault()}><button type="button" className="login-dialog-close" aria-label="팀원 포트폴리오 로그인 닫기" onClick={()=>{setMemberLogin(null);setMemberPin('')}}><X size={16}/></button><span className="kicker">VIIVII sara / Team</span><DialogTitle>Portfolio access.</DialogTitle><DialogDescription>{memberLogin?.name||'Team member'} 포트폴리오 비밀번호 숫자 4자리를 입력하세요.</DialogDescription><InputOTP maxLength={4} value={memberPin} onChange={unlockMemberPortfolio} disabled={memberBusy} autoFocus inputMode="numeric" pattern="[0-9]*"><InputOTPGroup>{[0,1,2,3].map(i=><InputOTPSlot key={i} index={i}/>)}</InputOTPGroup></InputOTP><p className="small">이 탭을 닫기 전까지 현재 팀원 페이지의 편집 권한이 유지됩니다.</p></DialogContent></Dialog>
 {memberEditor&&memberDraft&&<MemberPortfolioEditor config={c} member={memberDraft} setMember={setMemberDraft} busy={memberBusy} setBusy={setMemberBusy} notify={setNote} onSave={saveMemberPortfolio} onClose={closeMemberPortfolioEditor}/>}
 <SiteContactNotifications active={ownerMode&&!admin&&!login} onOpenInbox={openSiteInbox} onSessionExpired={()=>setOwnerMode(false)}/>
 <Dialog open={login} onOpenChange={v=>{if(v)setLogin(true);else {setLogin(false);setPin('')}}}><DialogContent className="login-dialog" showCloseButton={false} onOpenAutoFocus={e=>e.preventDefault()}><button type="button" className="login-dialog-close" aria-label="관리자 로그인 닫기" onClick={()=>{setLogin(false);setPin('')}}><X size={16}/></button><span className="kicker">VIIVII sara</span><DialogTitle>Welcome back.</DialogTitle><DialogDescription>관리자 비밀번호 숫자 4자리를 입력하세요.</DialogDescription><InputOTP maxLength={4} value={pin} onChange={unlock} disabled={busy} autoFocus inputMode="numeric" pattern="[0-9]*"><InputOTPGroup>{[0,1,2,3].map(i=><InputOTPSlot key={i} index={i}/>)}</InputOTPGroup></InputOTP><p className="small">4자리 입력 시 자동으로 접속됩니다.</p></DialogContent></Dialog>
 {admin&&<div className={'editor admin-editor '+(preview?'editor-preview-hidden ':'')+(adminClosing?'is-closing':'')}><div className="editor-header"><div><span className="kicker">VIIVII sara</span><h2>Make it yours.</h2></div><div><button onClick={()=>setPreview(true)}><Eye size={16}/> 미리보기</button><button className="save" disabled={busy} onClick={save}><Save size={16}/> {busy?'처리 중…':'저장 & 적용'}</button><Btn label="편집 닫기" onClick={closeAdmin}><X size={22}/></Btn></div></div><div className="admin-editor-scroll"><Tabs value={editorTab} onValueChange={setEditorTab} className="editor-tabs"><div className="editor-nav-shell"><div className="editor-group-tabs" aria-label="관리자 메뉴 그룹">{editorGroups.map(group=><button type="button" key={group.id} className={activeEditorGroup.id===group.id?'active':''} onClick={()=>setEditorTab(group.tabs[0][0])}>{group.label}</button>)}</div><TabsList className="editor-subtabs">{activeEditorGroup.tabs.map(([v,l])=><TabsTrigger value={v} key={v}>{l}</TabsTrigger>)}</TabsList></div>
 <TabsContent value="content"><div className="editor-grid"><section className="editor-card"><h3>Identity & copy</h3>{text('name','사이트 이름')}{text('eyebrow','첫 화면 상단 문구')}{text('subtitle','첫 화면 하단 문구')}{text('headline','작품 섹션 제목 (줄바꿈 가능)',true)}{text('aboutHeadline','소개 섹션 제목',true)}{text('about','소개',true)}{text('email','Contact 수신 이메일')}{text('instagram','Instagram 주소')}{sw('showAbout','소개 섹션 표시')}{sw('showTeam','Team 섹션 표시')}{text('teamHeadline','Team 섹션 제목',true)}</section><section className="editor-card"><h3>Browser identity</h3>{text('browserTitle','브라우저 탭 제목')}{asset('사이트 파비콘',draft.favicon,'image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon,.ico,.png,.jpg,.jpeg,.webp',v=>set('favicon',v))}<p>브라우저 탭과 즐겨찾기에 표시되는 아이콘입니다. 정사각형 PNG 또는 ICO를 권장합니다. 새 파일을 올리면 교체되고, 파일 제거를 누르면 파비콘이 삭제됩니다.</p>{draft.favicon&&<img src={draft.favicon} alt="파비콘 미리보기" style={{width:56,height:56,objectFit:'contain',borderRadius:12,border:'1px solid var(--line)',padding:8}}/>}</section><section className="editor-card"><h3>Main visual</h3>{asset('상단 메뉴 로고',draft.logo,'image/*',v=>set('logo',v))}{asset('메인 이미지',draft.heroPoster,'image/*',v=>set('heroPoster',v))}{asset('메인 영상 파일 (MP4 / WebM)',draft.heroVideo,'video/mp4,video/webm,.mp4,.webm',v=>set('heroVideo',v))}{sw('autoplay','메인 / 작품 미리보기 자동재생')}<p>이미지·음악·영상·3D 파일을 직접 업로드합니다. 파일당 최대 100MB입니다.</p><img className="editor-preview" src={draft.heroPoster} alt="메인 이미지 미리보기"/></section></div></TabsContent>
 <TabsContent value="design"><div className="editor-grid"><section className="editor-card"><h3>Appearance</h3><label className="field">기본 모드<Choice value={draft.theme} options={['light','dark']} onChange={v=>{set('theme',v);setTheme(v)}}/></label><label className="field editor-color-field">강조 색상<div className="editor-color-control"><input aria-label="강조 색상 선택" type="color" value={draft.accent} onChange={e=>set('accent',e.target.value)}/><span>{draft.accent.toUpperCase()}</span></div></label><label className="field">폰트<Choice value={draft.font} options={['Arial, Helvetica, sans-serif','Helvetica Neue, Arial, sans-serif','Georgia, serif','Times New Roman, serif','Verdana, sans-serif','Trebuchet MS, sans-serif','Courier New, monospace','system-ui, sans-serif']} onChange={v=>set('font',v)}/></label>{range('fontSize','본문 크기',16,22)}{range('spacing','섹션 간격',40,160)}{range('columns','작품 열 수',1,3)}</section><section className="editor-card"><h3>Liquid glass</h3>{range('radius','프레임 곡률',0,50)}{range('blur','글래스 블러',0,50)}{range('glass','글래스 불투명도',20,100)}{range('navOpacity','상단 메뉴바 불투명도',20,85)}<div className="glass-sample" style={{borderRadius:draft.radius,backdropFilter:`blur(${draft.blur}px)`}}>ICONIC / LIQUID GLASS</div><p>미리보기에서 실제 화면의 조명과 배경에 맞춰 확인하세요.</p></section></div></TabsContent>
 <TabsContent value="layout"><LayoutEditor draft={draft} setDraft={setDraft}/></TabsContent>
 <TabsContent value="logo"><LogoEditor draft={draft} setDraft={setDraft} busy={busy} setBusy={setBusy} notify={setNote}/></TabsContent>
 <TabsContent value="scene"><div className="editor-grid"><section className="editor-card"><h3>About visual</h3><label className="field">오른쪽 영역 콘텐츠<Choice value={draft.aboutMediaType} options={['image','3d']} onChange={v=>set('aboutMediaType',v)}/></label>{asset('JPG / PNG 이미지',draft.aboutImage,'image/jpeg,image/png,.jpg,.jpeg,.png',v=>{set('aboutImage',v);if(v)set('aboutMediaType','image')})}{asset('3D 모델 파일 또는 ZIP 하나',draft.aboutModel,'.glb,.gltf,.fbx,.obj,.stl,.ply,.zip',v=>{set('aboutModel',v);setAnimations([]);if(v){set('aboutMediaType','3d');set('modelOffsetX',0);set('modelOffsetY',0);set('modelScale',1)}})}<p>GLB·glTF·FBX·OBJ·STL·PLY·ZIP 파일 하나를 올리면 자동 변환하고 중앙에 배치합니다. 최대 100MB입니다. 외부 텍스처와 데이터는 모델과 함께 ZIP으로 묶어 주세요.</p>{draft.aboutMediaType==='3d'&&draft.aboutModel?<div className="model-editor-preview"><ModelScene config={draft} onAnimations={setAnimations}/></div>:<img className="editor-preview" src={draft.aboutImage||draft.heroPoster} alt="소개 이미지 미리보기"/>}</section><section className="editor-card"><h3>3D interaction</h3>{sw('modelDrag','마우스 / 터치 드래그 회전')}{sw('modelReturnToCenter','놓으면 원위치로 탄력 있게 복귀')}{range('modelReturnBounce','복귀 탄력',0,1,.05)}{sw('modelReact','마우스 위치에 따라 반응')}{sw('modelZoom','휠 / 핀치로 확대·축소')}{sw('modelAutoRotate','자동회전')}{range('modelSpeed','자동회전 속도 (°/초)',-90,90)}{range('modelSensitivity','마우스 반응 강도',0,60)}{range('modelScale','모델 화면 크기',.4,2.5,.05)}{range('modelOffsetX','가로 위치 (%)',-40,40)}{range('modelOffsetY','세로 위치 (%)',-40,40)}{range('modelRotateX','X축 기본 회전',-180,180)}{range('modelRotateY','Y축 기본 회전',-180,180)}{range('modelRotateZ','Z축 기본 회전',-180,180)}{range('modelExposure','조명 밝기',.2,2,.1)}{sw('modelAnimate','모델 애니메이션 재생')}<label className="field">애니메이션 선택<Choice value={draft.modelAnimation} options={[...new Set(['auto',draft.modelAnimation,...animations])]} onChange={v=>set('modelAnimation',v)}/></label>{draft.aboutModel&&!animations.length&&<p>내장 애니메이션이 없는 모델은 회전·마우스 반응으로 움직임을 만들 수 있습니다.</p>}</section></div></TabsContent>
 <TabsContent value="background"><div className="editor-grid"><section className="editor-card"><h3>Site background</h3><label className="field">전체 배경 종류<Choice value={draft.backgroundType} options={['none','image','video']} onChange={v=>set('backgroundType',v)}/></label>{asset('전체 배경 이미지 파일',draft.backgroundImage,'image/jpeg,image/png,image/webp,.jpg,.png,.webp',v=>{set('backgroundImage',v);if(v)set('backgroundType','image')})}{asset('전체 배경 영상 파일 (무음 반복)',draft.backgroundVideo,'video/mp4,video/webm,.mp4,.webm',v=>{set('backgroundVideo',v);if(v)set('backgroundType','video')})}{range('backgroundOpacity','배경 이미지 / 영상 불투명도',0,100)}{range('backgroundDim','가독성 보정 덮개',0,100)}<p>가독성 보정 덮개는 현재 모드의 배경색을 얹습니다. 라이트 / 다크 모드를 바꿔 글자와 배경의 대비를 확인하세요.</p>{draft.backgroundType==='image'&&draft.backgroundImage&&<img className="editor-preview" src={draft.backgroundImage} alt="전체 배경 미리보기"/>}{draft.backgroundType==='video'&&draft.backgroundVideo&&<video className="editor-preview" src={draft.backgroundVideo} controls muted playsInline/>}</section><section className="editor-card"><h3>Pattern overlay</h3><label className="field">패턴<Choice value={draft.pattern} options={['none','dots','grid','diagonal','checker','lines','rings']} onChange={v=>set('pattern',v)}/></label>{range('patternSize','패턴 크기',8,160)}<label className="field editor-color-field">패턴 색상<div className="editor-color-control"><input aria-label="패턴 색상 선택" type="color" value={draft.patternColor} onChange={e=>set('patternColor',e.target.value)}/><span>{draft.patternColor.toUpperCase()}</span></div></label>{range('patternOpacity','패턴 불투명도',0,100)}<div className="pattern-preview" style={{backgroundImage:({none:'none',dots:`radial-gradient(circle,${draft.patternColor} 1px,transparent 1.5px)`,grid:`linear-gradient(${draft.patternColor} 1px,transparent 1px),linear-gradient(90deg,${draft.patternColor} 1px,transparent 1px)`,diagonal:`repeating-linear-gradient(45deg,${draft.patternColor} 0 1px,transparent 1px ${draft.patternSize}px)`,checker:`conic-gradient(${draft.patternColor} 25%,transparent 0 50%,${draft.patternColor} 0 75%,transparent 0)`,lines:`linear-gradient(${draft.patternColor} 1px,transparent 1px)`,rings:`repeating-radial-gradient(circle,transparent 0 ${draft.patternSize-1}px,${draft.patternColor} ${draft.patternSize}px,transparent ${draft.patternSize+1}px)`} as Record<string,string>)[draft.pattern],backgroundSize:`${draft.patternSize}px ${draft.patternSize}px`,opacity:draft.patternOpacity/100}}/><p>미리보기에서 전체 배경과 패턴을 함께 확인할 수 있습니다.</p></section></div></TabsContent>
 <TabsContent value="motion"><section className="editor-card"><h3>Movement & depth</h3>{range('motion','애니메이션 강도 (0 = 끄기)',0,2,.1)}{range('depth','포인터 / 터치 3D 회전 강도',0,30)}<p>메인 프레임은 포인터 위치에 따라 X·Y축으로 회전하고 빛 반사가 이동합니다. 동작 줄이기 설정을 켠 기기에서는 애니메이션이 축소됩니다.</p></section></TabsContent>
 <TabsContent value="works"><div className="works-editor-stack"><section className="editor-card"><h3>Film viewer</h3><p>메인 영상과 작품을 눌렀을 때 뒤 배경의 어둡기와 블러를 조절합니다.</p>{range('filmBackdropOpacity','플레이어 뒤 배경 어둡기',0,90)}{range('filmBackdropBlur','플레이어 뒤 배경 블러',0,40)}</section><MediaLibrary kind="works" draft={draft} setDraft={setDraft} busy={busy} setBusy={setBusy} notify={setNote}/></div></TabsContent>
 <TabsContent value="team"><TeamEditor draft={draft} setDraft={setDraft} busy={busy} setBusy={setBusy} notify={setNote}/></TabsContent>
 <TabsContent value="inbox"><ContactInbox/></TabsContent>
 <TabsContent value="music"><div className="music-editor-stack"><section className="editor-card music-settings"><h3>Playback settings</h3><div className="playback-settings-grid"><div>{sw('showMusic','음악 플레이어 표시')}{sw('musicAutoplay','사이트 방문 시 자동재생')}{sw('musicShuffle','기본 셔플')}{sw('musicRandomStart','첫 곡도 랜덤으로 시작')}<label className="field">기본 반복 모드<Choice value={draft.musicRepeatMode} options={['all','one','none']} onChange={v=>set('musicRepeatMode',v)}/></label></div><div>{range('volume','기본 음량',0,100)}<p>기본값은 셔플 + 전체 반복입니다. 브라우저가 소리 자동재생을 제한하면 첫 클릭이나 터치 후 시작됩니다.</p></div></div></section><MediaLibrary kind="tracks" draft={draft} setDraft={setDraft} busy={busy} setBusy={setBusy} notify={setNote}/></div></TabsContent>
 <TabsContent value="security"><div className="security-grid"><section className="editor-card security"><h3>Admin access</h3><p>한 번 인증한 현재 탭에서는 편집창을 닫아도 사이트 문의 알림을 받을 수 있습니다. 로그아웃을 누르면 관리자 인증과 사이트 알림이 함께 종료됩니다.</p><label className="field">새 비밀번호 (숫자 4자리)<input type="password" inputMode="numeric" maxLength={4} value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,''))}/></label><button disabled={newPin.length!==4||busy} onClick={async()=>{try{await api('/api/security','PUT',{pin:newPin});clearAdminVisit();setNewPin('');closeAdmin();setNote('비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인하세요.')}catch(e){setNote((e as Error).message)}}}>비밀번호 변경</button><button onClick={async()=>{if(!confirm('관리자 비밀번호를 초기값 1211로 바꿀까요?'))return;try{await api('/api/security','PUT',{pin:'1211'});closeAdmin();setNote('비밀번호를 1211로 초기화했습니다. 다시 로그인하세요.')}catch(e){setNote((e as Error).message)}}}>비밀번호 초기화</button><button onClick={logoutAdmin}>로그아웃</button></section><section className="editor-card team-security-card"><div className="team-security-head"><div><h3>Team portfolio access</h3><p>모든 팀원의 초기 비밀번호는 1234입니다. 여기에서 팀원별 숫자 4자리 비밀번호를 개별 변경할 수 있습니다.</p></div></div><div className="team-security-list">{(draft.teamMembers||[]).map((member,index)=><div className="team-security-row" key={member.id}><div className="team-security-name"><span>{String(index+1).padStart(2,'0')}</span><strong>{member.name||'새 팀원'}</strong><small>/{member.portfolioSlug||'member'}</small></div><input aria-label={(member.name||'팀원')+' 새 비밀번호'} type="password" inputMode="numeric" maxLength={4} placeholder="새 PIN" value={teamPins[member.id]||''} onChange={e=>setTeamPins(current=>({...current,[member.id]:e.target.value.replace(/\D/g,'')}))}/><button disabled={(teamPins[member.id]||'').length!==4||busy} onClick={async()=>{try{await api('/api/team-security','PUT',{memberId:member.id,pin:teamPins[member.id]});setTeamPins(current=>({...current,[member.id]:''}));setNote((member.name||'팀원')+' 비밀번호를 변경했습니다.')}catch(e){setNote((e as Error).message)}}}>변경</button><button disabled={busy} onClick={async()=>{try{await api('/api/team-security','PUT',{memberId:member.id,pin:'1234'});setTeamPins(current=>({...current,[member.id]:''}));setNote((member.name||'팀원')+' 비밀번호를 1234로 초기화했습니다.')}catch(e){setNote((e as Error).message)}}}>1234 초기화</button></div>)}</div></section></div></TabsContent></Tabs><div className="editor-bottom">변경 사항은 미리보기 후 저장 & 적용을 눌러 공개 화면에 반영하세요.</div></div>{!preview&&<div className="editor-preview-strip editor-preview-dock"><span>{({'content':'콘텐츠','design':'디자인','layout':'레이아웃','logo':'메인 로고','scene':'이미지 & 3D','background':'배경 & 패턴','motion':'모션','works':'작품','team':'팀','inbox':'문의함','music':'음악','security':'보안'} as Record<string,string>)[editorTab]||'현재 항목'} · 실제 화면 미리보기</span><button type="button" onClick={()=>setPreview(true)}><Eye size={15}/> PREVIEW</button></div>}</div>}
 {preview&&<div className="preview-banner glass"><span><Eye size={16}/> 실제 적용 화면 미리보기 · 아직 저장되지 않음</span><button onClick={()=>setPreview(false)}>편집으로 돌아가기</button><button disabled={busy} onClick={save}>저장 & 적용</button><button onClick={()=>setPreview(false)}>미리보기 종료</button></div>}
 {note&&<div role="status" className="toast glass">{note}<button onClick={()=>setNote('')} aria-label="알림 닫기"><X size={16}/></button></div>}
 </div>
}
