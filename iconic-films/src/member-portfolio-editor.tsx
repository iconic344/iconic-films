'use client';
import {useState,type Dispatch,type SetStateAction} from 'react';
import {Save,Trash2,X} from 'lucide-react';
import {Slider} from '@/components/ui/slider';
import type {Config,TeamMember,TextStyle} from './defaults';
import TextStyleEditor from './text-style-editor';
import TeamMedia from './team-media';
import {uploadMemberFile} from './member-media-upload';
import {memberRequest} from './member-session';

type Props={
  config:Config;
  member:TeamMember;
  setMember:Dispatch<SetStateAction<TeamMember|null>>;
  busy:boolean;
  setBusy:(value:boolean)=>void;
  notify:(message:string)=>void;
  onSave:()=>void;
  onClose:()=>void;
};

export default function MemberPortfolioEditor({config,member,setMember,busy,setBusy,notify,onSave,onClose}:Props){
  const [uploading,setUploading]=useState('');
  const [newPin,setNewPin]=useState('');
  const [confirmPin,setConfirmPin]=useState('');
  const [pinBusy,setPinBusy]=useState(false);
  const patch=(key:keyof TeamMember,value:any)=>setMember(current=>current?{...current,[key]:value} as TeamMember:current);
  const setSubcategories=(raw:string)=>setMember(current=>{
    if(!current)return current;
    const values=Array.from(new Set(raw.split(/[\n,]/).map(v=>v.trim()).filter(Boolean))).slice(0,16);
    const fallback=values[0]||'All';
    return {...current,portfolioSubcategories:values,portfolioWorkCategories:(current.portfolioWorkCategories||[]).map(v=>values.includes(v)?v:fallback)} as TeamMember;
  });
  const setWorkCategory=(index:number,value:string)=>setMember(current=>{
    if(!current)return current;
    const labels=[...(current.portfolioWorkCategories||[])];
    while(labels.length<(current.works||[]).length)labels.push((current.portfolioSubcategories||[])[0]||'All');
    labels[index]=value;
    return {...current,portfolioWorkCategories:labels} as TeamMember;
  });
  const removeWork=(index:number)=>setMember(current=>current?{
    ...current,
    works:(current.works||[]).filter((_,i)=>i!==index),
    portfolioWorkCategories:(current.portfolioWorkCategories||[]).filter((_,i)=>i!==index)
  } as TeamMember:current);
  const miniRange=(key:keyof TeamMember,label:string,min:number,max:number,step=1,suffix='px')=><label className="field layout-range">{label}<span className="val">{Number(member[key])}{suffix}</span><Slider value={[Number(member[key])]} min={min} max={max} step={step} onValueChange={v=>patch(key,v[0])}/></label>;

  const portfolioStyle=(prefix:'Name'|'Role'|'Bio'|'Title'|'Intro'|'Utility'):TextStyle=>({
    font:String(member[('portfolio'+prefix+'Font') as keyof TeamMember]||'Arial, Helvetica, sans-serif'),
    size:Number(member[('portfolio'+prefix+'Size') as keyof TeamMember]||12),
    color:String(member[('portfolio'+prefix+'Color') as keyof TeamMember]||''),
    align:(member[('portfolio'+prefix+'Align') as keyof TeamMember]||'left') as TextStyle['align'],
    x:Number(member[('portfolio'+prefix+'X') as keyof TeamMember]||0),
    y:Number(member[('portfolio'+prefix+'Y') as keyof TeamMember]||0)
  });
  const patchPortfolioStyle=(prefix:'Name'|'Role'|'Bio'|'Title'|'Intro'|'Utility',value:TextStyle)=>{
    setMember(current=>current?{
      ...current,
      [('portfolio'+prefix+'Font') as keyof TeamMember]:value.font,
      [('portfolio'+prefix+'Size') as keyof TeamMember]:value.size,
      [('portfolio'+prefix+'Color') as keyof TeamMember]:value.color,
      [('portfolio'+prefix+'Align') as keyof TeamMember]:value.align,
      [('portfolio'+prefix+'X') as keyof TeamMember]:value.x,
      [('portfolio'+prefix+'Y') as keyof TeamMember]:value.y
    } as TeamMember:current);
  };

  async function uploadOne(file:File|undefined,key:'photo'){
    if(!file)return;
    try{
      setBusy(true);setUploading('프로필 업로드 중…');
      const url=await uploadMemberFile(member.id,file);
      patch(key,url);
      notify('업로드 완료. 저장 & 적용을 눌러 반영하세요.');
    }catch(e){notify((e as Error).message)}
    finally{setUploading('');setBusy(false)}
  }
  async function uploadWorks(files:FileList|null){
    if(!files?.length)return;
    try{
      setBusy(true);
      const urls:string[]=[];
      let count=0;
      for(const file of Array.from(files)){
        setUploading(`작품 업로드 중… ${++count} / ${files.length}`);
        urls.push(await uploadMemberFile(member.id,file));
      }
      const fallback=(member.portfolioSubcategories||[])[0]||'All';
      setMember(current=>current?{...current,works:[...(current.works||[]),...urls],portfolioWorkCategories:[...(current.portfolioWorkCategories||[]),...urls.map(()=>fallback)]} as TeamMember:current);
      notify('포트폴리오 미디어 업로드 완료. 세부 카테고리를 지정한 뒤 저장 & 적용을 눌러 반영하세요.');
    }catch(e){notify((e as Error).message)}
    finally{setUploading('');setBusy(false)}
  }

  async function changeOwnPin(){
    if(pinBusy)return;
    if(newPin.length!==4){notify('새 비밀번호는 숫자 4자리로 입력해 주세요.');return}
    if(newPin!==confirmPin){notify('새 비밀번호 확인이 일치하지 않습니다.');return}
    try{
      setPinBusy(true);
      await memberRequest(member.id,'/api/team-self-security','PUT',{pin:newPin});
      setNewPin('');setConfirmPin('');
      notify('포트폴리오 비밀번호가 변경되었습니다. 다음 접속부터 새 비밀번호를 사용하세요.');
    }catch(e){notify((e as Error).message)}
    finally{setPinBusy(false)}
  }

  return <div className="editor member-self-editor">
    <div className="editor-header">
      <div><span className="kicker">VIIVII sara / {member.name||'Portfolio'}</span><h2>Edit team portfolio.</h2></div>
      <div>
        <button className="save" disabled={busy} onClick={onSave}><Save size={16}/>{busy?(uploading||'처리 중…'):'저장 & 적용'}</button>
        <button type="button" className="icon" aria-label="편집 닫기" onClick={onClose}><X size={22}/></button>
      </div>
    </div>

    <div className="member-self-topbar">
      <section className="member-self-security-quick" aria-label="Portfolio password">
        <div className="member-self-security-quick-copy">
          <span className="kicker">SECURITY</span>
          <strong>Portfolio password</strong>
          <small>현재 포트폴리오 카테고리 EDIT 비밀번호만 변경됩니다.</small>
        </div>
        <div className="member-self-security-quick-fields">
          <label>새 비밀번호<input type="password" inputMode="numeric" maxLength={4} placeholder="4자리" value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,'').slice(0,4))}/></label>
          <label>비밀번호 확인<input type="password" inputMode="numeric" maxLength={4} placeholder="다시 입력" value={confirmPin} onChange={e=>setConfirmPin(e.target.value.replace(/\D/g,'').slice(0,4))}/></label>
          <button type="button" className="member-security-confirm" disabled={pinBusy||newPin.length!==4||confirmPin.length!==4||newPin!==confirmPin} onClick={changeOwnPin}><span>{pinBusy?'APPLYING…':'CONFIRM'}</span><small>{pinBusy?'변경 중':'확인'}</small></button>
        </div>
      </section>
      <aside className="member-self-editor-note">
        <strong>{member.name||'Portfolio category'}</strong>
        <span>이 편집 권한은 현재 팀 포트폴리오 카테고리에만 적용됩니다. 다른 카테고리와 사이트 전체 설정은 변경할 수 없습니다.</span>
      </aside>
    </div>

    <div className="team-editor-dashboard member-self-editor-dashboard">
      <div className="team-editor-left-rail">
        <section className="editor-card team-editor-card">
          <div className="team-editor-card-head"><div><span className="kicker">CATEGORY</span><h3>Portfolio category</h3></div></div>
          <div className="team-member-fields">
            <label className="field">대분류 이름<input placeholder="Fashion / Commercial / Events" value={member.name} onChange={e=>patch('name',e.target.value)}/></label>
            <label className="field">INDEX 문구<input maxLength={40} placeholder="CATEGORY INDEX" value={member.portfolioTeamIndexLabel||'CATEGORY INDEX'} onChange={e=>patch('portfolioTeamIndexLabel',e.target.value.slice(0,40))}/></label>
            <label className="field">세부 카테고리<textarea placeholder={"Fashion Show\nLookbook\nCampaign\nEditorial"} value={(member.portfolioSubcategories||[]).join('\n')} onChange={e=>setSubcategories(e.target.value)}/></label>
            <label className="field">참여자 / 제작 크레딧<textarea placeholder={"DIRECTOR / xnives\nDOP / name\nSTYLING / name"} value={member.portfolioCredits||''} onChange={e=>patch('portfolioCredits',e.target.value)}/></label>
            
            
            

          </div>
        </section>

        <section className="editor-card team-editor-card">
          <div className="team-editor-card-head"><div><span className="kicker">TYPOGRAPHY</span><h3>Portfolio typography / position</h3></div></div>
          <div className="team-portfolio-type-editor">
            <TextStyleEditor label="카테고리 이름" value={portfolioStyle('Name')} onChange={v=>patchPortfolioStyle('Name',v)}/>
            <TextStyleEditor label="크레딧" value={portfolioStyle('Role')} onChange={v=>patchPortfolioStyle('Role',v)}/>
            <TextStyleEditor label="카테고리 보조문구" value={portfolioStyle('Bio')} onChange={v=>patchPortfolioStyle('Bio',v)}/>
            <TextStyleEditor label="아카이브 제목" value={portfolioStyle('Title')} onChange={v=>patchPortfolioStyle('Title',v)}/>
            <TextStyleEditor label="아카이브 설명" value={portfolioStyle('Intro')} onChange={v=>patchPortfolioStyle('Intro',v)}/>
            <TextStyleEditor label="기타 문구 / 헤더 / 카운트" value={portfolioStyle('Utility')} onChange={v=>patchPortfolioStyle('Utility',v)}/>
          </div>
        </section>
      </div>

      <div className="team-editor-right-rail">
        <section className="editor-card team-editor-card">
          <div className="team-editor-card-head"><div><span className="kicker">MEDIA</span><h3>Cover / portfolio</h3></div></div>
          <label className="field file-upload member-profile-upload">히어로 배경 미디어<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,.jpg,.jpeg,.png,.webp,.mp4,.webm,.glb,.gltf" disabled={busy} onChange={e=>uploadOne(e.target.files?.[0],'photo')}/><span className="uploaded-file">{member.photo?'히어로 배경 등록됨':'이미지 / 영상 / GLB·glTF'}</span>{member.photo&&<button type="button" className="file-clear" onClick={()=>patch('photo','')}>배경 제거</button>}</label>
          {member.photo&&<div className="team-editor-hero-preview"><TeamMedia src={member.photo} alt="히어로 배경 미리보기" className="team-editor-hero-preview-media" interactive/></div>}
          <label className="field file-upload member-work-upload">포트폴리오 미디어 업로드<input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,.jpg,.jpeg,.png,.webp,.mp4,.webm,.glb,.gltf" disabled={busy} onChange={e=>uploadWorks(e.target.files)}/><span className="uploaded-file">이미지 / 영상 / 3D 여러 개 선택 가능</span></label>
          {!!member.works?.length&&<div className="team-editor-works team-editor-works--categorized">{member.works.map((url,i)=><div key={url+i} className="team-editor-work-card"><TeamMedia src={url} alt={'작품 '+(i+1)} className="team-editor-work-media" interactive/><div className="team-editor-work-meta"><span>{String(i+1).padStart(2,'0')}</span><select aria-label="세부 카테고리" value={(member.portfolioWorkCategories||[])[i]||(member.portfolioSubcategories||[])[0]||'All'} onChange={e=>setWorkCategory(i,e.target.value)}>{(member.portfolioSubcategories||[]).map(label=><option key={label} value={label}>{label}</option>)}{!(member.portfolioSubcategories||[]).length&&<option value="All">All</option>}</select></div><button type="button" aria-label="작품 삭제" onClick={()=>removeWork(i)}><Trash2 size={14}/></button></div>)}</div>}
        </section>

        <section className="editor-card team-editor-card">
          <div className="team-editor-card-head"><div><span className="kicker">LAYOUT</span><h3>Media / grid</h3></div></div>
          <div className="team-portfolio-size-editor">
            {miniRange('portfolioSliderWidth','슬라이드 폭',45,100,1,'%')}
            {miniRange('portfolioSliderHeight','슬라이드 높이',320,1100)}
            {miniRange('portfolioGridWidth','그리드 전체 폭',45,100,1,'%')}
          </div>
          <label className="field">포트폴리오 보기 방식<div className="team-layout-choice"><button type="button" className={member.portfolioLayout!=='slider'?'active':''} onClick={()=>patch('portfolioLayout','grid')}>GRID</button><button type="button" className={member.portfolioLayout==='slider'?'active':''} onClick={()=>patch('portfolioLayout','slider')}>SLIDER</button></div></label>
          {member.portfolioLayout!=='slider'&&miniRange('portfolioColumns','포트폴리오 열 수',1,4,1,'')}
          {miniRange('portfolioGap','포트폴리오 간격',4,48)}
          {miniRange('portfolioRadius','포트폴리오 모서리',0,48)}

        </section>
      </div>
    </div>
    <div className="editor-bottom">현재 팀 포트폴리오 카테고리에만 저장됩니다. 공개 여부와 전체 사이트 설정은 관리자만 변경할 수 있습니다.</div>
  </div>;
}
