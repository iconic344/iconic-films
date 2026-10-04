'use client';
import type {Dispatch,SetStateAction} from 'react';
import {Plus,Trash2,ChevronUp,ChevronDown} from 'lucide-react';
import {Switch} from '@/components/ui/switch';
import {Slider} from '@/components/ui/slider';
import type {Config,TeamMember,TextStyle} from './defaults';
import TextStyleEditor from './text-style-editor';
import {uploadFile} from './media-upload';
import TeamMedia from './team-media';

const blankMember=(draft:Config):TeamMember=>({id:crypto.randomUUID(),name:'',role:'',bio:'',instagram:'',photo:'',works:[],visible:true,photoRadius:draft.teamMediaRadius,photoSize:draft.teamMediaSize,portfolioSlug:'member-'+Date.now().toString(36),portfolioTitle:'Selected works',portfolioIntro:'',portfolioLayout:'grid',portfolioColumns:3,portfolioGap:14,portfolioRadius:18,portfolioReturnLabel:'VIIVII sara / Team',portfolioProfileSize:430,portfolioNameFont:'Arial, Helvetica, sans-serif',portfolioNameSize:112,portfolioNameColor:'',portfolioNameAlign:'left',portfolioNameX:0,portfolioNameY:0,portfolioRoleFont:'Arial, Helvetica, sans-serif',portfolioRoleSize:10,portfolioRoleColor:'',portfolioRoleAlign:'left',portfolioRoleX:0,portfolioRoleY:0,portfolioBioFont:'Arial, Helvetica, sans-serif',portfolioBioSize:15,portfolioBioColor:'',portfolioBioAlign:'left',portfolioBioX:0,portfolioBioY:0,portfolioTitleFont:'Arial, Helvetica, sans-serif',portfolioTitleSize:76,portfolioTitleColor:'',portfolioTitleAlign:'left',portfolioTitleX:0,portfolioTitleY:0,portfolioIntroFont:'Arial, Helvetica, sans-serif',portfolioIntroSize:14,portfolioIntroColor:'',portfolioIntroAlign:'left',portfolioIntroX:0,portfolioIntroY:0,portfolioUtilityFont:'Arial, Helvetica, sans-serif',portfolioUtilitySize:11,portfolioUtilityColor:'',portfolioUtilityAlign:'left',portfolioUtilityX:0,portfolioUtilityY:0,portfolioReturnX:0,portfolioReturnY:0,portfolioSliderWidth:100,portfolioSliderHeight:760,portfolioGridWidth:100});

export default function TeamEditor({draft,setDraft,busy,setBusy,notify}:{draft:Config;setDraft:Dispatch<SetStateAction<Config>>;busy:boolean;setBusy:(v:boolean)=>void;notify:(v:string)=>void}){
  const members=draft.teamMembers||[];
  const patch=(id:string,key:keyof TeamMember,value:unknown)=>setDraft(d=>({...d,teamMembers:(d.teamMembers||[]).map(m=>m.id===id?{...m,[key]:value}:m)}));
  const setConfig=<K extends keyof Config>(key:K,value:Config[K])=>setDraft(d=>({...d,[key]:value}));
  const miniRange=(member:TeamMember,key:keyof TeamMember,label:string,min:number,max:number,step=1,suffix='px')=><label className="field layout-range">{label}<span className="val">{Number(member[key])}{suffix}</span><Slider value={[Number(member[key])]} min={min} max={max} step={step} onValueChange={v=>patch(member.id,key,v[0])}/></label>;
  const portfolioStyle=(member:TeamMember,prefix:'Name'|'Role'|'Bio'|'Title'|'Intro'|'Utility'):TextStyle=>({
    font:String(member[('portfolio'+prefix+'Font') as keyof TeamMember]||'Arial, Helvetica, sans-serif'),
    size:Number(member[('portfolio'+prefix+'Size') as keyof TeamMember]||12),
    color:String(member[('portfolio'+prefix+'Color') as keyof TeamMember]||''),
    align:(member[('portfolio'+prefix+'Align') as keyof TeamMember]||'left') as TextStyle['align'],
    x:Number(member[('portfolio'+prefix+'X') as keyof TeamMember]||0),
    y:Number(member[('portfolio'+prefix+'Y') as keyof TeamMember]||0)
  });
  const patchPortfolioStyle=(member:TeamMember,prefix:'Name'|'Role'|'Bio'|'Title'|'Intro'|'Utility',value:TextStyle)=>{
    const keys:{[K in keyof TextStyle]:keyof TeamMember}={
      font:('portfolio'+prefix+'Font') as keyof TeamMember,
      size:('portfolio'+prefix+'Size') as keyof TeamMember,
      color:('portfolio'+prefix+'Color') as keyof TeamMember,
      align:('portfolio'+prefix+'Align') as keyof TeamMember,
      x:('portfolio'+prefix+'X') as keyof TeamMember,
      y:('portfolio'+prefix+'Y') as keyof TeamMember
    };
    setDraft(d=>({...d,teamMembers:(d.teamMembers||[]).map(m=>m.id===member.id?{...m,[keys.font]:value.font,[keys.size]:value.size,[keys.color]:value.color,[keys.align]:value.align,[keys.x]:value.x,[keys.y]:value.y}:m)}));
  };
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
      <div><h3>Team / collaborators</h3><p>대표·사진·영상·메이크업·헤어·세트 스타일링 등 역할을 자유롭게 입력하고, 프로필과 작품에 이미지·영상·GLB/glTF 3D를 올릴 수 있습니다.</p></div>
      <button type="button" className="add" onClick={()=>setDraft(d=>({...d,teamMembers:[...(d.teamMembers||[]),blankMember(d)]}))}><Plus size={16}/> 팀원 추가</button>
    </section>
    <section className="editor-card">
      <h3>Team headline</h3>
      <label className="field">큰 제목 글씨체<input value={draft.teamHeadlineFont||''} onChange={e=>setConfig('teamHeadlineFont',e.target.value)}/></label>
      <label className="field layout-range">큰 제목 크기 <span className="val">{draft.teamHeadlineSize}px</span><Slider value={[draft.teamHeadlineSize]} min={44} max={150} step={1} onValueChange={v=>setConfig('teamHeadlineSize',v[0])}/></label>
      <label className="field">큰 제목 정렬<div className="team-layout-choice">{(['left','center','right'] as const).map(v=><button type="button" key={v} className={draft.teamHeadlineAlign===v?'active':''} onClick={()=>setConfig('teamHeadlineAlign',v)}>{v.toUpperCase()}</button>)}</div></label>
      <label className="field layout-range">큰 제목 가로 위치 <span className="val">{draft.teamHeadlineX}px</span><Slider value={[draft.teamHeadlineX]} min={-320} max={320} step={1} onValueChange={v=>setConfig('teamHeadlineX',v[0])}/></label>
      <label className="field layout-range">큰 제목 세로 위치 <span className="val">{draft.teamHeadlineY}px</span><Slider value={[draft.teamHeadlineY]} min={-220} max={220} step={1} onValueChange={v=>setConfig('teamHeadlineY',v[0])}/></label>
    </section>
    <section className="editor-card team-brand-editor">
      <h3>Shared header brand</h3>
      <p>메인 사이트와 팀원 전용 페이지가 같은 이름/로고를 사용합니다.</p>
      <label className="field">공통 헤더 이름<input value={draft.name} onChange={e=>setConfig('name',e.target.value)}/></label>
      <label className="field file-upload">공통 헤더 로고 업로드<input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" disabled={busy} onChange={e=>uploadOne(e.target.files?.[0],url=>setConfig('logo',url))}/><span className="uploaded-file">{draft.logo?'로고 이미지 등록됨':'이미지가 없으면 위 이름 텍스트를 사용합니다.'}</span>{draft.logo&&<button type="button" className="file-clear" onClick={()=>setConfig('logo','')}>로고 이미지 제거</button>}</label>
      <div className="team-brand-preview brand">{draft.logo?<img src={draft.logo} alt={draft.name}/>:draft.name}<span>®</span></div>
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
          <label className="field">소개<textarea placeholder="간단한 소개, 전문 분야, 크레딧 등을 적어주세요." value={member.bio||''} onChange={e=>patch(member.id,'bio',e.target.value)}/></label>
          <label className="field">Instagram 주소<div className="team-instagram-input"><span className="team-ig-mark" aria-hidden="true">IG</span><input placeholder="https://instagram.com/..." value={member.instagram} onChange={e=>patch(member.id,'instagram',e.target.value)}/></div></label>
          <label className="field">포트폴리오 페이지 주소<input placeholder="xnives" value={member.portfolioSlug||''} onChange={e=>patch(member.id,'portfolioSlug',e.target.value.toLowerCase().replace(/[^a-z0-9가-힣-]/g,'-').replace(/-+/g,'-'))}/><span className="uploaded-file">/team/{member.portfolioSlug||'member'}</span></label>
          <label className="field">포트폴리오 제목<input value={member.portfolioTitle||'Selected works'} onChange={e=>patch(member.id,'portfolioTitle',e.target.value)}/></label>
          <label className="field">포트폴리오 소개<textarea placeholder="팀원 전용 포트폴리오 페이지 소개 문구" value={member.portfolioIntro||''} onChange={e=>patch(member.id,'portfolioIntro',e.target.value)}/></label>
          <label className="field">팀으로 돌아가기 문구<input value={member.portfolioReturnLabel||'VIIVII sara / Team'} onChange={e=>patch(member.id,'portfolioReturnLabel',e.target.value)}/></label>
          <div className="team-portfolio-type-editor">
            <h4>Portfolio typography / position</h4>
            <TextStyleEditor label="이름" value={portfolioStyle(member,'Name')} onChange={v=>patchPortfolioStyle(member,'Name',v)}/>
            <TextStyleEditor label="역할" value={portfolioStyle(member,'Role')} onChange={v=>patchPortfolioStyle(member,'Role',v)}/>
            <TextStyleEditor label="소개" value={portfolioStyle(member,'Bio')} onChange={v=>patchPortfolioStyle(member,'Bio',v)}/>
            <TextStyleEditor label="작품 제목" value={portfolioStyle(member,'Title')} onChange={v=>patchPortfolioStyle(member,'Title',v)}/>
            <TextStyleEditor label="작품 소개" value={portfolioStyle(member,'Intro')} onChange={v=>patchPortfolioStyle(member,'Intro',v)}/>
            <TextStyleEditor label="기타 문구 / 헤더 / 카운트" value={portfolioStyle(member,'Utility')} onChange={v=>patchPortfolioStyle(member,'Utility',v)}/>
            {miniRange(member,'portfolioReturnX','돌아가기 문구 가로 위치',-300,300)}
            {miniRange(member,'portfolioReturnY','돌아가기 문구 세로 위치',-240,240)}
          </div>
          <div className="team-portfolio-size-editor">
            <h4>Portfolio media size</h4>
            {miniRange(member,'portfolioProfileSize','프로필 미디어 크기',180,560)}
            {miniRange(member,'portfolioSliderWidth','슬라이드 폭',45,100,1,'%')}
            {miniRange(member,'portfolioSliderHeight','슬라이드 높이',320,1100)}
            {miniRange(member,'portfolioGridWidth','그리드 전체 폭',45,100,1,'%')}
          </div>
          <label className="field">포트폴리오 보기 방식<div className="team-layout-choice"><button type="button" className={member.portfolioLayout!=='slider'?'active':''} onClick={()=>patch(member.id,'portfolioLayout','grid')}>GRID</button><button type="button" className={member.portfolioLayout==='slider'?'active':''} onClick={()=>patch(member.id,'portfolioLayout','slider')}>SLIDER</button></div></label>
          {member.portfolioLayout!=='slider'&&<label className="field layout-range">포트폴리오 열 수 <span className="val">{member.portfolioColumns||3}</span><Slider value={[member.portfolioColumns||3]} min={1} max={4} step={1} onValueChange={v=>patch(member.id,'portfolioColumns',v[0])}/></label>}
          <label className="field layout-range">포트폴리오 간격 <span className="val">{member.portfolioGap||14}px</span><Slider value={[member.portfolioGap||14]} min={4} max={48} step={1} onValueChange={v=>patch(member.id,'portfolioGap',v[0])}/></label>
          <label className="field layout-range">포트폴리오 모서리 <span className="val">{member.portfolioRadius??18}px</span><Slider value={[member.portfolioRadius??18]} min={0} max={48} step={1} onValueChange={v=>patch(member.id,'portfolioRadius',v[0])}/></label>
          <label className="toggle">사이트에 표시<Switch checked={member.visible} onCheckedChange={v=>patch(member.id,'visible',v)}/></label>
          <label className="field layout-range">프로필 미디어 크기 <span className="val">{member.photoSize||draft.teamMediaSize}px</span><Slider value={[member.photoSize||draft.teamMediaSize]} min={150} max={420} step={1} onValueChange={v=>patch(member.id,'photoSize',v[0])}/></label>
          <label className="field layout-range">프로필 모서리 <span className="val">{member.photoRadius??draft.teamMediaRadius}%</span><Slider value={[member.photoRadius??draft.teamMediaRadius]} min={0} max={50} step={1} onValueChange={v=>patch(member.id,'photoRadius',v[0])}/></label>
        </div>
        <div>
          <label className="field file-upload">프로필 미디어 업로드<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,.jpg,.jpeg,.png,.webp,.mp4,.webm,.glb,.gltf" disabled={busy} onChange={e=>uploadOne(e.target.files?.[0],url=>patch(member.id,'photo',url))}/><span className="uploaded-file">{member.photo?'프로필 미디어 등록됨':'이미지 / 영상 / GLB·glTF'}</span>{member.photo&&<button type="button" className="file-clear" onClick={()=>patch(member.id,'photo','')}>미디어 제거</button>}</label>
          {member.photo&&<div className="team-editor-photo"><TeamMedia src={member.photo} alt="프로필 미리보기" className="team-editor-photo-media" interactive/></div>}
          <label className="field file-upload">작품 미디어 업로드<input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,.jpg,.jpeg,.png,.webp,.mp4,.webm,.glb,.gltf" disabled={busy} onChange={e=>uploadWorks(member.id,e.target.files)}/><span className="uploaded-file">이미지 / 영상 / 3D 여러 개 선택 가능</span></label>
        </div>
      </div>
      {!!member.works?.length&&<div className="team-editor-works">{member.works.map((url,i)=><div key={url+i}><TeamMedia src={url} alt="작품 미리보기" className="team-editor-work-media" interactive/><button type="button" aria-label="작품 삭제" onClick={()=>patch(member.id,'works',member.works.filter((_,j)=>j!==i))}><Trash2 size={14}/></button></div>)}</div>}
    </section>)}
    {!members.length&&<section className="editor-card team-editor-empty">아직 등록된 팀원이 없습니다. ‘팀원 추가’로 시작하세요.</section>}
  </div>
}
