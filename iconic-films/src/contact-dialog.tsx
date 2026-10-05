'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {X,Send} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {api} from './site-api';

export default function ContactDialog({open,onOpenChange}:{open:boolean;onOpenChange:(v:boolean)=>void}){
  const [from,setFrom]=useState(''),[subject,setSubject]=useState(''),[message,setMessage]=useState(''),[website,setWebsite]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[sentOpen,setSentOpen]=useState(false);
  useEffect(()=>{if(open)setStatus('')},[open]);
  useEffect(()=>{if(!sentOpen)return;const id=window.setTimeout(()=>setSentOpen(false),4200);return()=>window.clearTimeout(id)},[sentOpen]);
  async function submit(e:FormEvent){
    e.preventDefault();
    if(!from.trim()||!/^\S+@\S+\.\S+$/.test(from.trim())){setStatus('보내는 이메일 주소를 확인해 주세요.');return}
    if(!message.trim()){setStatus('메시지를 입력해 주세요.');return}
    try{
      setBusy(true);setStatus('');
      const result=await api('/api/contact','POST',{from:from.trim(),subject:subject.trim(),message:message.trim(),website});
      setStatus('');
      setFrom('');setSubject('');setMessage('');setWebsite('');
      onOpenChange(false);
      window.dispatchEvent(new Event('viivii:contact-sent'));
      window.setTimeout(()=>setSentOpen(true),180);
    }catch(e){setStatus((e as Error).message)}finally{setBusy(false)}
  }
  return <><Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="contact-dialog" showCloseButton={false} onOpenAutoFocus={e=>e.preventDefault()}>
    <div className="contact-dialog-head"><div><span>VIIVII sara</span><DialogTitle>Contact</DialogTitle></div><button type="button" onClick={()=>onOpenChange(false)} aria-label="Contact 닫기"><X size={18}/></button></div>
    <DialogDescription className="contact-dialog-description">프로젝트 문의를 바로 보낼 수 있습니다.</DialogDescription>
    <form className="contact-form" onSubmit={submit}>
      <label className="contact-honeypot" aria-hidden="true"><span>WEBSITE</span><input tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></label>
      <label><span>FROM</span><input type="email" autoComplete="email" placeholder="your@email.com" value={from} onChange={e=>setFrom(e.target.value)}/></label>
      <label><span>SUBJECT</span><input type="text" placeholder="Project inquiry" maxLength={160} value={subject} onChange={e=>setSubject(e.target.value)}/></label>
      <label className="contact-message"><span>MESSAGE</span><textarea placeholder="Write your message..." value={message} onChange={e=>setMessage(e.target.value)} maxLength={5000}/></label>
      <div className="contact-form-foot"><span className="contact-status">{status||'보낸 문의는 관리자 문의함에 바로 저장됩니다.'}</span><div><button type="button" onClick={()=>onOpenChange(false)}>Cancel</button><button type="submit" className="contact-send" disabled={busy}><Send size={15}/>{busy?'Sending…':'Send'}</button></div></div>
    </form>
  </DialogContent></Dialog>
  <Dialog open={sentOpen} onOpenChange={setSentOpen}><DialogContent className="contact-sent-dialog" showCloseButton={false} onOpenAutoFocus={e=>e.preventDefault()}>
    <button type="button" className="contact-sent-card" onClick={()=>setSentOpen(false)}>
      <span className="contact-sent-mark">✓</span>
      <DialogTitle>전송되었습니다.</DialogTitle>
      <strong>Message sent successfully.</strong>
      <strong>メッセージが送信されました。</strong>
      <DialogDescription>문의가 정상적으로 접수되었습니다.<br/>Your inquiry has been received.<br/>お問い合わせを受け付けました。</DialogDescription>
      <small>화면을 눌러 닫기 · Tap to close · タップして閉じる</small>
    </button>
  </DialogContent></Dialog></>
}
