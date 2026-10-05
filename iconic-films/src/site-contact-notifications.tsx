'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Bell,Inbox} from 'lucide-react';
import {api} from './site-api';

type ContactMessage={
  id:string;
  from:string;
  subject:string;
  createdAt:string;
  read:boolean;
};

const timeLabel=(value:string)=>{
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return '';
  return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(d);
};

export default function SiteContactNotifications({active,onOpenInbox,onSessionExpired}:{active:boolean;onOpenInbox:()=>void;onSessionExpired:()=>void}){
  const [messages,setMessages]=useState<ContactMessage[]>([]);
  const [open,setOpen]=useState(false);
  const [flash,setFlash]=useState(false);
  const lastUnread=useRef(0);
  const flashTimer=useRef<number|null>(null);
  const unread=useMemo(()=>messages.filter(item=>!item.read),[messages]);

  async function load(announce=true){
    if(!active)return;
    try{
      const result=await api('/api/contact');
      const next=(Array.isArray(result.messages)?result.messages:[]) as ContactMessage[];
      const nextUnread=next.filter(item=>!item.read).length;
      if(announce&&nextUnread>lastUnread.current){
        setFlash(true);
        if(flashTimer.current!==null)window.clearTimeout(flashTimer.current);
        flashTimer.current=window.setTimeout(()=>{setFlash(false);flashTimer.current=null},6500);
      }
      lastUnread.current=nextUnread;
      setMessages(next);
    }catch(e){
      if((e as Error).message.includes('관리자 로그인이 필요'))onSessionExpired();
    }
  }

  useEffect(()=>{
    if(!active){
      setMessages([]);setOpen(false);setFlash(false);lastUnread.current=0;
      return;
    }
    void load(false);
    const id=window.setInterval(()=>{if(document.visibilityState==='visible')void load(true)},15000);
    const refresh=()=>void load(true);
    const visible=()=>{if(document.visibilityState==='visible')void load(true)};
    window.addEventListener('viivii:contact-sent',refresh as EventListener);
    document.addEventListener('visibilitychange',visible);
    return()=>{
      window.clearInterval(id);
      window.removeEventListener('viivii:contact-sent',refresh as EventListener);
      document.removeEventListener('visibilitychange',visible);
      if(flashTimer.current!==null){window.clearTimeout(flashTimer.current);flashTimer.current=null}
    };
  },[active]);

  if(!active)return null;
  const latest=unread[0];

  return <div className={'site-contact-notice '+(open?'is-open ':'')+(flash?'is-flashing':'')}>
    <button type="button" className="site-contact-notice-trigger" aria-label={'문의 알림 '+unread.length+'개'} onClick={()=>setOpen(v=>!v)}>
      <Bell size={17}/>
      {unread.length>0&&<span>{unread.length>99?'99+':unread.length}</span>}
    </button>
    {(open||flash)&&<div className="site-contact-notice-panel" role="status">
      <div className="site-contact-notice-head">
        <span>CONTACT NOTICE</span>
        <strong>{unread.length?unread.length+' NEW':'NO NEW'}</strong>
      </div>
      {latest?<button type="button" className="site-contact-notice-message" onClick={onOpenInbox}>
        <span>새 문의 · New inquiry · 新しいお問い合わせ</span>
        <strong>{latest.subject||'Project inquiry'}</strong>
        <small>{latest.from} · {timeLabel(latest.createdAt)}</small>
      </button>:<div className="site-contact-notice-empty">새 문의가 없습니다.<br/>No new inquiries. · 新しいお問い合わせはありません。</div>}
      <button type="button" className="site-contact-notice-inbox" onClick={onOpenInbox}><Inbox size={14}/> 문의함 열기 · Open inbox</button>
    </div>}
  </div>;
}
