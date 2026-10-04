'use client';
import {useEffect,useState} from 'react';
import {X,Send} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {api} from './site-api';

export default function ContactDialog({open,onOpenChange,recipient}:{open:boolean;onOpenChange:(v:boolean)=>void;recipient:string}){
  const [from,setFrom]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
  useEffect(()=>{if(open)setStatus('')},[open]);
  async function submit(e:React.FormEvent){
    e.preventDefault();
    if(!from.trim()||!/^\S+@\S+\.\S+$/.test(from.trim())){setStatus('보내는 이메일 주소를 확인해 주세요.');return}
    if(!message.trim()){setStatus('메시지를 입력해 주세요.');return}
    try{
      setBusy(true);setStatus('');
      const result=await api('/api/contact','POST',{from:from.trim(),message:message.trim()});
      if(result.mailto){
        window.location.href=result.mailto;
        setStatus('메일 앱을 열었습니다.');
      }else{
        setStatus('메시지를 보냈습니다.');
        setFrom('');setMessage('');
        setTimeout(()=>onOpenChange(false),650);
      }
    }catch(e){setStatus((e as Error).message)}finally{setBusy(false)}
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="contact-dialog" showCloseButton={false} onOpenAutoFocus={e=>e.preventDefault()}>
    <div className="contact-dialog-head"><div><span>VIIVII sara</span><DialogTitle>Contact</DialogTitle></div><button type="button" onClick={()=>onOpenChange(false)} aria-label="Contact 닫기"><X size={18}/></button></div>
    <DialogDescription className="contact-dialog-description">프로젝트 문의를 바로 보낼 수 있습니다.</DialogDescription>
    <form className="contact-form" onSubmit={submit}>
      <label><span>FROM</span><input type="email" autoComplete="email" placeholder="your@email.com" value={from} onChange={e=>setFrom(e.target.value)}/></label>
      <label className="contact-message"><span>MESSAGE</span><textarea placeholder="Write your message..." value={message} onChange={e=>setMessage(e.target.value)} maxLength={5000}/></label>
      <div className="contact-form-foot"><span className="contact-status">{status||(!recipient?'관리자에서 수신 이메일을 등록하면 바로 전송할 수 있습니다.':'')}</span><div><button type="button" onClick={()=>onOpenChange(false)}>Cancel</button><button type="submit" className="contact-send" disabled={busy||!recipient}><Send size={15}/>{busy?'Sending…':'Send'}</button></div></div>
    </form>
  </DialogContent></Dialog>
}
