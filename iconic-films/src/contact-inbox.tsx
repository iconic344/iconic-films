'use client';
import {useEffect,useMemo,useState} from 'react';
import {RefreshCw,Trash2,Mail,MailOpen,ExternalLink} from 'lucide-react';
import {api} from './site-api';

type ContactMessage={
  id:string;
  from:string;
  subject:string;
  message:string;
  createdAt:string;
  read:boolean;
  emailed?:boolean;
};

const when=(value:string)=>{
  const d=new Date(value);
  return Number.isNaN(d.getTime())?value:new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short'}).format(d);
};

export default function ContactInbox(){
  const [messages,setMessages]=useState<ContactMessage[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [openId,setOpenId]=useState<string>('');

  const unread=useMemo(()=>messages.filter(m=>!m.read).length,[messages]);

  async function load(){
    try{
      setLoading(true);setError('');
      const result=await api('/api/contact');
      setMessages(Array.isArray(result.messages)?result.messages:[]);
    }catch(e){setError((e as Error).message)}finally{setLoading(false)}
  }
  useEffect(()=>{load()},[]);

  async function toggle(message:ContactMessage){
    const next=openId===message.id?'':message.id;
    setOpenId(next);
    if(next&&!message.read){
      try{
        await api('/api/contact','PATCH',{id:message.id,read:true});
        setMessages(list=>list.map(item=>item.id===message.id?{...item,read:true}:item));
      }catch(e){setError((e as Error).message)}
    }
  }
  async function remove(message:ContactMessage){
    if(!confirm('이 문의를 삭제할까요?'))return;
    try{
      await api('/api/contact','DELETE',{id:message.id});
      setMessages(list=>list.filter(item=>item.id!==message.id));
      if(openId===message.id)setOpenId('');
    }catch(e){setError((e as Error).message)}
  }

  return <div className="contact-inbox">
    <section className="editor-card contact-inbox-head">
      <div>
        <span className="kicker">CONTACT INBOX</span>
        <h3>문의함</h3>
        <p>사이트 Contact 폼으로 들어온 문의를 여기서 바로 확인할 수 있습니다.</p>
      </div>
      <div className="contact-inbox-summary">
        <span>{unread} unread</span>
        <button type="button" onClick={load} disabled={loading}><RefreshCw size={15}/>{loading?'불러오는 중':'새로고침'}</button>
      </div>
    </section>
    {error&&<div className="editor-card contact-inbox-error">{error}</div>}
    {!loading&&!messages.length&&<section className="editor-card contact-inbox-empty">아직 접수된 문의가 없습니다.</section>}
    <div className="contact-message-list">
      {messages.map(item=><article key={item.id} className={'contact-message-card '+(!item.read?'is-unread ':'')+(openId===item.id?'is-open':'')}>
        <button type="button" className="contact-message-summary" onClick={()=>toggle(item)}>
          <span className="contact-message-state">{item.read?<MailOpen size={16}/>:<Mail size={16}/>}</span>
          <span className="contact-message-main">
            <strong>{item.subject||'Project inquiry'}</strong>
            <small>{item.from}</small>
          </span>
          <span className="contact-message-meta">
            <small>{item.emailed?'EMAIL + INBOX':'INBOX'}</small>
            <time>{when(item.createdAt)}</time>
          </span>
        </button>
        {openId===item.id&&<div className="contact-message-body">
          <p>{item.message}</p>
          <div className="contact-message-actions">
            <a href={'mailto:'+encodeURIComponent(item.from)+'?subject='+encodeURIComponent('Re: '+(item.subject||'Project inquiry'))}><ExternalLink size={14}/> 이메일로 답장</a>
            <button type="button" onClick={()=>remove(item)}><Trash2 size={14}/> 삭제</button>
          </div>
        </div>}
      </article>)}
    </div>
  </div>
}
