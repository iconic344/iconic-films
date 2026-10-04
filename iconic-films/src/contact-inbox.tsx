'use client';
import {useEffect,useMemo,useState} from 'react';
import {RefreshCw,Trash2,Mail,MailOpen,Send,ExternalLink,Link2,Unlink,CheckCircle2} from 'lucide-react';
import {api} from './site-api';

type ContactMessage={
  id:string;
  from:string;
  subject:string;
  message:string;
  createdAt:string;
  read:boolean;
  emailed?:boolean;
  repliedAt?:string;
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
  const [replySubject,setReplySubject]=useState('');
  const [replyBody,setReplyBody]=useState('');
  const [replyBusy,setReplyBusy]=useState(false);
  const [replyStatus,setReplyStatus]=useState('');
  const [fallback,setFallback]=useState<{gmailUrl:string;naverUrl:string}|null>(null);
  const [mailOpen,setMailOpen]=useState(false);
  const [mailLoading,setMailLoading]=useState(false);
  const [mailConnected,setMailConnected]=useState(false);
  const [mailProvider,setMailProvider]=useState<'gmail'|'naver'>('gmail');
  const [mailEmail,setMailEmail]=useState('');
  const [mailPassword,setMailPassword]=useState('');
  const [mailStatus,setMailStatus]=useState('');

  const unread=useMemo(()=>messages.filter(m=>!m.read).length,[messages]);

  async function load(){
    try{
      setLoading(true);setError('');
      const result=await api('/api/contact');
      setMessages(Array.isArray(result.messages)?result.messages:[]);
    }catch(e){setError((e as Error).message)}finally{setLoading(false)}
  }
  async function loadMail(){
    try{
      const result=await api('/api/mail');
      setMailConnected(!!result.connected);
      if(result.provider==='gmail'||result.provider==='naver')setMailProvider(result.provider);
      setMailEmail(result.email||'');
    }catch{}
  }
  async function connectMail(){
    if(!mailEmail.trim()||!mailPassword.trim()){setMailStatus('메일 주소와 앱 비밀번호를 입력해 주세요.');return}
    try{
      setMailLoading(true);setMailStatus('');
      const result=await api('/api/mail','PUT',{provider:mailProvider,email:mailEmail.trim(),appPassword:mailPassword});
      setMailConnected(!!result.connected);setMailPassword('');
      setMailStatus((mailProvider==='gmail'?'Gmail':'Naver Mail')+' 연결이 완료되었습니다.');
    }catch(e){setMailStatus((e as Error).message)}finally{setMailLoading(false)}
  }
  async function disconnectMail(){
    try{
      setMailLoading(true);setMailStatus('');
      await api('/api/mail','DELETE');
      setMailConnected(false);setMailPassword('');
      setMailStatus('메일 연결을 해제했습니다.');
    }catch(e){setMailStatus((e as Error).message)}finally{setMailLoading(false)}
  }
  useEffect(()=>{load();loadMail()},[]);

  async function toggle(message:ContactMessage){
    const next=openId===message.id?'':message.id;
    setOpenId(next);
    setReplyStatus('');
    setFallback(null);
    if(next){
      setReplySubject('Re: '+(message.subject||'Project inquiry'));
      setReplyBody('');
    }
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

  async function sendReply(item:ContactMessage){
    if(!replySubject.trim()||!replyBody.trim()){
      setReplyStatus('제목과 답장 내용을 입력해 주세요.');
      return;
    }
    try{
      setReplyBusy(true);setReplyStatus('');setFallback(null);
      const result=await api('/api/contact/reply','POST',{id:item.id,to:item.from,subject:replySubject.trim(),message:replyBody.trim()});
      if(result.delivered){
        setReplyStatus((result.provider==='gmail'?'Gmail':result.provider==='naver'?'Naver Mail':'사이트 메일')+' 계정으로 답장을 전송했습니다.');
        setMessages(list=>list.map(message=>message.id===item.id?{...message,read:true,repliedAt:new Date().toISOString()}:message));
        setReplyBody('');
      }else if(result.providerRequired){
        setFallback({gmailUrl:result.gmailUrl,naverUrl:result.naverUrl});
        setReplyStatus('사이트 메일 발송 연결이 없어 Gmail 또는 Naver Mail로 이어서 답장할 수 있습니다.');
      }
    }catch(e){
      setReplyStatus((e as Error).message);
      setFallback({
        gmailUrl:'https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(item.from)+'&su='+encodeURIComponent(replySubject)+'&body='+encodeURIComponent(replyBody),
        naverUrl:'https://mail.naver.com/v2/new'
      });
    }finally{setReplyBusy(false)}
  }

  async function openNaver(item:ContactMessage){
    const copy='받는 사람: '+item.from+'\n제목: '+replySubject+'\n\n'+replyBody;
    try{await navigator.clipboard.writeText(copy);setReplyStatus('받는 사람·제목·본문을 복사했습니다. Naver Mail에서 붙여넣어 보내세요.')}catch{}
    window.open(fallback?.naverUrl||'https://mail.naver.com/v2/new','_blank','noopener,noreferrer');
  }

  return <div className="contact-inbox">
    <section className="editor-card contact-inbox-head">
      <div>
        <span className="kicker">CONTACT INBOX</span>
        <h3>문의함</h3>
        <p>사이트 Contact 폼으로 들어온 문의를 확인하고, 같은 화면에서 바로 이메일 답장할 수 있습니다.</p>
      </div>
      <div className="contact-inbox-summary">
        <span>{unread} unread</span>
        <button type="button" onClick={load} disabled={loading}><RefreshCw size={15}/>{loading?'불러오는 중':'새로고침'}</button>
      </div>
    </section>

    <section className={'editor-card contact-mail-connection '+(mailConnected?'is-connected':'')}>
      <button type="button" className="contact-mail-connection-head" onClick={()=>setMailOpen(v=>!v)}>
        <span className="contact-mail-connection-icon">{mailConnected?<CheckCircle2 size={16}/>:<Link2 size={16}/>}</span>
        <span><strong>{mailConnected?'사이트 메일 연결됨':'사이트 메일 연결'}</strong><small>{mailConnected?((mailProvider==='gmail'?'Gmail · ':'Naver Mail · ')+mailEmail):'관리자 문의함에서 Gmail 또는 Naver Mail 계정으로 바로 답장합니다.'}</small></span>
        <span>{mailOpen?'닫기':'설정'}</span>
      </button>
      {mailOpen&&<div className="contact-mail-settings">
        <div className="contact-mail-provider">
          <button type="button" className={mailProvider==='gmail'?'active':''} onClick={()=>setMailProvider('gmail')}>Gmail</button>
          <button type="button" className={mailProvider==='naver'?'active':''} onClick={()=>setMailProvider('naver')}>Naver Mail</button>
        </div>
        <label><span>EMAIL</span><input type="email" value={mailEmail} onChange={e=>setMailEmail(e.target.value)} placeholder={mailProvider==='gmail'?'your@gmail.com':'your@naver.com'}/></label>
        <label><span>APP PASSWORD</span><input type="password" value={mailPassword} onChange={e=>setMailPassword(e.target.value)} placeholder={mailConnected?'변경할 때만 새 앱 비밀번호 입력':'앱 비밀번호 입력'} autoComplete="new-password"/></label>
        <p className="contact-mail-help">{mailProvider==='gmail'?'Google 계정의 2단계 인증에서 발급한 앱 비밀번호를 사용합니다.':'Naver 메일에서 IMAP/SMTP를 사용함으로 켜고 2단계 인증용 앱 비밀번호를 사용합니다.'} 비밀번호는 공개 사이트 설정에는 포함되지 않고 서버 설정에만 저장됩니다.</p>
        {mailStatus&&<p className="contact-mail-status">{mailStatus}</p>}
        <div className="contact-mail-actions">
          <button type="button" className="contact-mail-connect" disabled={mailLoading} onClick={connectMail}><Link2 size={14}/>{mailLoading?'연결 확인 중…':mailConnected?'연결 정보 업데이트':'계정 연결'}</button>
          {mailConnected&&<button type="button" disabled={mailLoading} onClick={disconnectMail}><Unlink size={14}/>연결 해제</button>}
        </div>
      </div>}
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
            <small>{item.repliedAt?'REPLIED':item.emailed?'EMAIL + INBOX':'INBOX'}</small>
            <time>{when(item.createdAt)}</time>
          </span>
        </button>

        {openId===item.id&&<div className="contact-message-body">
          <div className="contact-original-message"><p>{item.message}</p></div>

          <div className="contact-reply-compose">
            <div className="contact-reply-head">
              <div><span>REPLY TO</span><strong>{item.from}</strong></div>
              {item.repliedAt&&<small>최근 답장 {when(item.repliedAt)}</small>}
            </div>
            <label><span>SUBJECT</span><input value={replySubject} onChange={e=>setReplySubject(e.target.value)} maxLength={180}/></label>
            <label><span>MESSAGE</span><textarea value={replyBody} onChange={e=>setReplyBody(e.target.value)} placeholder="Write your reply..." maxLength={8000}/></label>
            {replyStatus&&<p className="contact-reply-status">{replyStatus}</p>}
            <div className="contact-reply-actions">
              <button type="button" className="contact-direct-send" disabled={replyBusy} onClick={()=>sendReply(item)}><Send size={14}/>{replyBusy?'Sending…':mailConnected?(mailProvider==='gmail'?'Gmail로 전송':'Naver로 전송'):'사이트에서 전송'}</button>
              <a href={fallback?.gmailUrl||('https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(item.from)+'&su='+encodeURIComponent(replySubject)+'&body='+encodeURIComponent(replyBody))} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Gmail</a>
              <button type="button" onClick={()=>openNaver(item)}><ExternalLink size={14}/> Naver Mail</button>
              <button type="button" className="contact-delete" onClick={()=>remove(item)}><Trash2 size={14}/> 삭제</button>
            </div>
          </div>
        </div>}
      </article>)}
    </div>
  </div>
}
