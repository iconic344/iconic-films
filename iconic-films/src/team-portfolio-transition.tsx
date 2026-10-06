import {useEffect,useRef,useState,type ComponentProps,type CSSProperties} from 'react';
import TeamPortfolioPage from './team-portfolio-page';
import type {TeamMember} from './defaults';
import {teamMediaType} from './team-media';

type Props=ComponentProps<typeof TeamPortfolioPage>;
type Transition={id:number;from:TeamMember;to:TeamMember;direction:1|-1;scrollY:number;moving:boolean};
const SLIDE_MS=900;

// Keep both live pages mounted for the entire move. The incoming page becomes
// the settled page with the same React key, so completion never remounts media.
export default function TeamPortfolioTransition(props:Props){
 const [displayed,setDisplayed]=useState(props.member),[transition,setTransition]=useState<Transition|null>(null);
 const decoded=useRef(new Map<string,Promise<void>>());
 const active=useRef<Transition|null>(null),settled=useRef(displayed),sequence=useRef(0),frame=useRef(0),timer=useRef(0),queued=useRef<{member:TeamMember;direction:1|-1}|null>(null),completed=useRef(0);
 active.current=transition;settled.current=displayed;
 const prepare=(member:TeamMember)=>{
  if(!member.photo||teamMediaType(member.photo)!=='image')return Promise.resolve();
  const cached=decoded.current.get(member.photo);if(cached)return cached;
  const image=new Image();image.src=member.photo;
  // Decode before starting the compositor animation, with a bounded network wait.
  const ready=new Promise<void>(resolve=>{
   const timeout=window.setTimeout(resolve,1400);
   image.decode().catch(()=>{}).finally(()=>{window.clearTimeout(timeout);resolve()});
  });
  decoded.current.set(member.photo,ready);return ready;
 };
 useEffect(()=>{props.config.teamMembers.filter(m=>m.visible).forEach(m=>{void prepare(m)})},[props.config.teamMembers]);
 const start=(from:TeamMember,to:TeamMember,direction:1|-1,notify=true)=>{
  if(from.id===to.id)return;
  const id=++sequence.current;
  setTransition({id,from,to,direction,scrollY:window.scrollY,moving:false});
  if(notify)props.onSelectMember(to,direction);
  window.scrollTo({top:0,behavior:'instant'});
  void prepare(to).finally(()=>{
   if(sequence.current!==id)return;
   frame.current=requestAnimationFrame(()=>{frame.current=requestAnimationFrame(()=>{
    if(sequence.current!==id)return;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setDisplayed(to);setTransition(null);return}
    setTransition(current=>current?.id===id?{...current,moving:true}:current);
   })});
  });
 };
 const request=(member:TeamMember,direction:1|-1=1)=>{
  const current=active.current;
  if(current){if(member.id!==current.to.id)queued.current={member,direction};else queued.current=null;return}
  start(settled.current,member,direction);
 };
 const finish=()=>{
  const current=active.current;if(!current||!current.moving||completed.current===current.id)return;
  completed.current=current.id;window.clearTimeout(timer.current);
  setDisplayed(current.to);setTransition(null);
  const next=queued.current;queued.current=null;
  if(next&&next.member.id!==current.to.id)frame.current=requestAnimationFrame(()=>start(current.to,next.member,next.direction));
 };
 useEffect(()=>{
  if(transition?.moving)timer.current=window.setTimeout(finish,SLIDE_MS+100);
  return()=>window.clearTimeout(timer.current);
 },[transition?.id,transition?.moving]);
 useEffect(()=>{
  if(props.member.id===settled.current.id||active.current?.to.id===props.member.id)return;
  const members=props.config.teamMembers;
  const direction=members.findIndex(m=>m.id===props.member.id)>members.findIndex(m=>m.id===settled.current.id)?1:-1;
  start(settled.current,props.member,direction,false);
 },[props.member.id]);
 useEffect(()=>()=>{sequence.current++;cancelAnimationFrame(frame.current);window.clearTimeout(timer.current)},[]);
 const pages=transition?[transition.from,transition.to]:[displayed];
 return <div className={'team-slide-viewport '+(transition?'is-transitioning':'')+(transition?.moving?' is-moving':'')} style={{'--team-slide-direction':transition?.direction||1,'--team-slide-ms':SLIDE_MS+'ms'} as CSSProperties}>
  {pages.map((member,i)=>{
   const incoming=!!transition&&i===1,outgoing=!!transition&&i===0;
   const latest=props.config.teamMembers.find(m=>m.id===member.id)||member;
   return <div key={member.id} className={'team-slide-page '+(incoming?'is-incoming':outgoing?'is-outgoing':'is-settled')} inert={outgoing} aria-hidden={outgoing} style={outgoing?{top:-transition!.scrollY}:undefined} onTransitionEnd={e=>{if(incoming&&e.target===e.currentTarget&&e.propertyName==='transform')finish()}}>
    <TeamPortfolioPage {...props} member={latest} onSelectMember={request}/>
   </div>;
  })}
 </div>;
}
