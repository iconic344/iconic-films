'use client';
import type {Dispatch,SetStateAction} from 'react';
import {Plus,Trash2,ChevronUp,ChevronDown} from 'lucide-react';
import {Switch} from '@/components/ui/switch';
import type {Config,TeamMember} from './defaults';
import {uploadFile} from './media-upload';

const isVideo=(url:string)=>/\.(mp4|webm|mov)(?:$|\?)/i.test(url);
const blankMember=():TeamMember=>({id:crypto.randomUUID(),name:'',role:'',instagram:'',photo:'',works:[],visible:true});

export default function TeamEditor({draft,setDraft,busy,setBusy,notify}:{draft:Config;setDraft:Dispatch<SetStateAction<Config>>;busy:boolean;setBusy:(v:boolean)=>void;notify:(v:string)=>void}){
  const members=draft.teamMembers||[];
  const patch=(id:string,key:keyof TeamMember,value:unknown)=>setDraft(d=>({...d,teamMembers:(d.teamMembers||[]).map(m=>m.id===id?{...m,[key]:value}:m)}));
  const remove=(id:string)=>setDraft(d=>({...d,teamMembers:(d.teamMembers||[]).filter(m=>m.id!==id)}));
  const move=(index:number,dir:number)=>setDraft(d=>{const list=[...(d.teamMembers||[])],next=index+dir;if(next<0||next>=list.length)return d;[list[index],list[next]]=[list[next],list[index]];return {...d,teamMembers:list}});
  async function uploadOne(file:File|undefined,done:(url:string)=>void){
    if(!file)return;
    try{setBusy(true);const url=await uploadFile(file);done(url);notify('업로드 완료. 미리보기 후 저장 & 적용을 눌러 주세요.')}catch(e){notify((e as Error).message)}finally{setBusy(false)}
  }
  async function uploadWorks(id:string,files:FileList|null){
    if(!files?.length)return;
    try{
      setBusy(true);
      const urls:string[]=[];
      for(const file of Array.from(files))urls.push(await uploadFile(file));
      setDraft(d=>({...d,teamMembers:(d.teamMembers||[]).map(m=>m.id===id?{...m,works:[...(m.works||[]),...urls]}:m)}));
      notify('팀원 작품 업로드 완료. 미리보기 후 저장 & 적용을 눌러 주세요.');
    }catch(e){notify((e as Error).message)}finally{setBusy(false)}
  }
  return <div className="team-editor-stack">
    <section className="editor-card team-editor-intro">
      <div><h3>Team / collaborators</h3><p>대표·사진·영상·메이크업·헤어·세트 스타일링 등 역할을 자유롭게 입력하고 얼굴, 작품, Instagram을 연결할 수 있습니다.</p></div>
      <button type="button" className="add" onClick={()=>setDraft(d=>({...d,teamMembers:[...(d.teamMembers||[]),blankMember()]}))}><Plus size={16}/> 팀원 추가</button>
    </section>
    {members.map((member,index)=><section className="editor-card team-editor-card" key={member.id}>
      <div className="team-editor-card-head">
        <div><span className="kicker">{String(index+1).padStart(2,'0')} / MEMBER</span><h3>{member.name||'새 팀원'}</h3></div>
        <div className="team-editor-actions">
          <button type="button" className="icon" aria-label="위로" disabled={index===0} onClick={()=>move(index,-1)}><ChevronUp size={17}/></button>
          <button type="button" className="icon" aria-label="아래로" disabled={index===members.length-1} onClick={()=>move(index,1)}><ChevronDown size={17}/></button>
          <button type="button" className="icon" aria-label="삭제" onClick={()=>remove(member.id)}><Trash2 size={16}/></button>
        </div>
      </div>
      <div className="team-editor-grid">
        <div>
          <label className="field">이름<input value={member.name} onChange={e=>patch(member.id,'name',e.target.value)}/></label>
          <label className="field">역할<input placeholder="Director / Photographer / Make-up / Hair..." value={member.role} onChange={e=>patch(member.id,'role',e.target.value)}/></label>
          <label className="field">Instagram 주소<div className="team-instagram-input"><span className="team-ig-mark" aria-hidden="true">IG</span><input placeholder="https://instagram.com/..." value={member.instagram} onChange={e=>patch(member.id,'instagram',e.target.value)}/></div></label>
          <label className="toggle">사이트에 표시<Switch checked={member.visible} onCheckedChange={v=>patch(member.id,'visible',v)}/></label>
        </div>
        <div>
          <label className="field file-upload">얼굴 / 프로필 이미지<input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" disabled={busy} onChange={e=>uploadOne(e.target.files?.[0],url=>patch(member.id,'photo',url))}/><span className="uploaded-file">{member.photo?'프로필 이미지 등록됨':'이미지 선택'}</span>{member.photo&&<button type="button" className="file-clear" onClick={()=>patch(member.id,'photo','')}>이미지 제거</button>}</label>
          {member.photo&&<img className="team-editor-photo" src={member.photo} alt="프로필 미리보기"/>}
          <label className="field file-upload">작품 이미지 / 영상 업로드<input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,.jpg,.jpeg,.png,.webp,.mp4,.webm" disabled={busy} onChange={e=>uploadWorks(member.id,e.target.files)}/><span className="uploaded-file">여러 개 선택 가능</span></label>
        </div>
      </div>
      {!!member.works?.length&&<div className="team-editor-works">{member.works.map((url,i)=><div key={url+i}>{isVideo(url)?<video src={url} muted playsInline preload="metadata"/>:<img src={url} alt="작품 미리보기"/>}<button type="button" aria-label="작품 삭제" onClick={()=>patch(member.id,'works',member.works.filter((_,j)=>j!==i))}><Trash2 size={14}/></button></div>)}</div>}
    </section>)}
    {!members.length&&<section className="editor-card team-editor-empty">아직 등록된 팀원이 없습니다. ‘팀원 추가’로 시작하세요.</section>}
  </div>
}
